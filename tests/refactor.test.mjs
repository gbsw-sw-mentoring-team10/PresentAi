import test from 'node:test'
import assert from 'node:assert/strict'
import { createFeedbackRequest } from '../src/jjabary/feedbackRequest.js'
import { buildApiReport, buildExampleReport } from '../src/jjabary/reports.js'
import { MAX_UPLOAD_BYTES, validateUpload } from '../src/jjabary/uploadConfig.js'
import { createWorker } from '../worker/index.js'

const form = { title: '', purpose: '교육', description: '', script: '합성 대본', file: null }
const result = { score: 90, feedback: '명확해요.', strengths: ['논리적 흐름'], improvements: [] }

function deferred() {
  let resolve
  let reject
  const promise = new Promise((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

function requestFixture(send) {
  const states = []
  const timers = new Map()
  const cleared = []
  let timerId = 0
  const manager = createFeedbackRequest((state) => states.push(state), {
    send,
    schedule(callback) {
      timers.set(++timerId, callback)
      return timerId
    },
    unschedule(id) {
      cleared.push(id)
      timers.delete(id)
    },
  })
  return { manager, states, timers, cleared }
}

test('concurrent submissions share one request and can start again after completion', async () => {
  const pending = deferred()
  let calls = 0
  const { manager, states, timers } = requestFixture(() => {
    calls++
    return pending.promise
  })
  const first = manager.run(form)
  assert.equal(manager.run(form), first)
  assert.equal(calls, 1)
  pending.resolve(result)
  await first
  assert.deepEqual(
    states.map((state) => state.status),
    ['loading', 'success'],
  )
  assert.equal(timers.size, 0)
  await manager.run(form)
  assert.equal(calls, 2)
})

test('cancel clears the deadline and stale responses cannot replace a newer result', async () => {
  const previous = deferred()
  const current = deferred()
  let firstSignal
  let calls = 0
  const { manager, states, timers } = requestFixture((_, { signal }) => {
    if (!calls++) {
      firstSignal = signal
      return previous.promise
    }
    return current.promise
  })
  const oldRequest = manager.run(form)
  manager.cancel()
  assert.equal(firstSignal.aborted, true)
  assert.equal(timers.size, 0)
  const newRequest = manager.run({ ...form, title: '새 발표' })
  current.resolve(result)
  await newRequest
  previous.resolve({ ...result, score: 0 })
  await oldRequest
  assert.equal(states.at(-1).submission.title, '새 발표')
  assert.equal(states.at(-1).result.score, 90)
})

test('timeout reports an error even when an upstream promise ignores abort', async () => {
  const pending = deferred()
  let signal
  const { manager, states, timers } = requestFixture((_, options) => {
    signal = options.signal
    return pending.promise
  })
  const request = manager.run(form)
  timers.values().next().value()
  assert.equal(signal.aborted, true)
  assert.equal(states.at(-1).status, 'error')
  assert.match(states.at(-1).error, /응답이 오래/)
  assert.equal(timers.size, 0)
  pending.resolve(result)
  await request
  assert.equal(states.at(-1).status, 'error')
})

test('disposing requests clears timers without notifying an unmounted view', async () => {
  const pending = deferred()
  const { manager, states, timers } = requestFixture(() => pending.promise)
  const request = manager.run(form)
  manager.dispose()
  pending.resolve(result)
  await request
  assert.equal(states.length, 1)
  assert.equal(timers.size, 0)
})

test('a failed request can be retried without changing the submitted values', async () => {
  let calls = 0
  const { manager, states } = requestFixture(async (submission) => {
    assert.equal(submission.script, form.script)
    if (!calls++) throw new Error('서버 오류')
    return result
  })
  await manager.run(form)
  assert.equal(states.at(-1).error, '서버 오류')
  await manager.run(form)
  assert.equal(states.at(-1).status, 'success')
})

test('reports retain structured penalties, solutions, revised scripts and sample labels', () => {
  const report = buildApiReport({
    submission: { title: '발표', purpose: '교육' },
    mock: true,
    result: {
      ...result,
      improvements: [{ issue: '근거 보완', deduction: 0, solution: '출처 추가' }],
      revised_script: '수정 대본',
    },
  })
  for (const text of [
    '서버 샘플',
    '90 / 100',
    '[감점 0점]',
    '근거 보완',
    '해결 방법: 출처 추가',
    '수정된 대본\n수정 대본',
  ])
    assert.ok(report.includes(text))
  const live = buildApiReport({
    submission: { title: '발표', purpose: '교육' },
    mock: false,
    result,
  })
  assert.equal(live.includes('샘플'), false)
  const example = buildExampleReport(
    { title: '예시', purpose: '교육' },
    [{ id: 1, title: '표지', time: '30초', issue: '설명', suggestion: '개선' }],
    false,
  )
  assert.match(example, /슬라이드 1: 표지\n권장 시간: 30초/)
  assert.match(
    buildExampleReport({ title: '예시', purpose: '교육' }, [], true),
    /음성 비교는 준비 중/,
  )
})

test('shared upload validation accepts supported formats and rejects empty or oversized files', () => {
  assert.equal(validateUpload({ name: 'SLIDES.PDF', size: MAX_UPLOAD_BYTES }), '')
  assert.equal(validateUpload({ name: 'script.txt', size: 10 }, 'script'), '')
  assert.equal(validateUpload({ name: 'practice.m4a', size: 10 }, 'audio'), '')
  assert.match(validateUpload({ name: 'script.pdf', size: 10 }, 'script'), /TXT/)
  assert.match(validateUpload({ name: 'empty.pdf', size: 0 }), /비어/)
  assert.match(validateUpload({ name: 'large.pdf', size: MAX_UPLOAD_BYTES + 1 }), /30MB/)
})

test('Worker reuses decoded assets while HEAD and unknown paths do not decode anything', async (t) => {
  const decode = globalThis.atob
  let calls = 0
  t.mock.method(globalThis, 'atob', (value) => {
    calls++
    return decode(value)
  })
  const worker = createWorker({ '/index.html': ['text/html', btoa('hello')] })
  await worker.fetch(new Request('https://site.example/', { method: 'HEAD' }))
  await worker.fetch(new Request('https://site.example/missing'))
  assert.equal(calls, 0)
  assert.equal(await (await worker.fetch(new Request('https://site.example/'))).text(), 'hello')
  assert.equal(await (await worker.fetch(new Request('https://site.example/'))).text(), 'hello')
  assert.equal(calls, 1)
})
