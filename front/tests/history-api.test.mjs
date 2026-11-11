import test from 'node:test'
import assert from 'node:assert/strict'
import { loadFeedbackHistory, loadSavedFeedback } from '../src/features/history/historyApi.js'

const summary = (id) => ({
  saved_result_id: id,
  title: `저장된 피드백 ${id}`,
  score: id % 101,
  created_at: '2026-11-11T06:00:00Z',
})
const payload = {
  ...summary(1),
  status: 'completed',
  feedback: '저장된 총평',
  strengths: ['장점'],
  improvements: [{ issue: '개선점', deduction: 10, solution: '해결책' }],
  revised_script: '수정 대본',
  slides: [],
}

test('history reads every page so lists and account statistics include more than 100 records', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input, 'http://localhost')
    const page = Number(url.searchParams.get('page'))
    calls.push(page)
    assert.equal(url.pathname, '/api/presentation/feedback')
    assert.equal(url.searchParams.get('page_size'), '100')
    assert.equal(url.searchParams.has('user_id'), false)
    assert.equal(options.credentials, 'include')
    assert.equal(options.cache, 'no-store')
    return Response.json({
      items: page === 1 ? Array.from({ length: 100 }, (_, i) => summary(i + 1)) : [summary(101)],
      total: 101,
      page,
      page_size: 100,
    })
  })
  const records = await loadFeedbackHistory()
  assert.equal(records.length, 101)
  assert.equal(records[100].id, 101)
  assert.deepEqual(calls, [1, 2])
  assert.equal(
    records.every((item) => item.type === 'material'),
    true,
  )
})

test('a successful empty history stays empty', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ items: [], total: 0, page: 1, page_size: 100 }),
  )
  assert.deepEqual(await loadFeedbackHistory(), [])
})

test('detail normalizes the saved JSON using the same contract as the first result screen', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/presentation/feedback/1')
    assert.equal(options.credentials, 'include')
    return Response.json(payload)
  })
  const item = await loadSavedFeedback('1')
  assert.equal(item.id, 1)
  assert.equal(item.result.feedback, payload.feedback)
  assert.deepEqual(item.result.improvements, payload.improvements)
  assert.equal(item.result.revised_script, payload.revised_script)
  assert.equal(item.fileName, undefined)
})

test('401, 404 and DB failures remain actionable API errors', async (t) => {
  for (const status of [401, 404, 503]) {
    const mock = t.mock.method(globalThis, 'fetch', async () =>
      Response.json({ detail: '테스트 오류' }, { status }),
    )
    await assert.rejects(loadFeedbackHistory(), (error) => error.status === status)
    mock.mock.restore()
  }
})

test('invalid result ids do not send a request', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('unexpected')
  })
  for (const id of ['sample-id', '0', '-1', '1/2', '9007199254740993'])
    await assert.rejects(loadSavedFeedback(id), (error) => error.status === 404)
  assert.equal(fetch.mock.callCount(), 0)
})

test('mismatched ids and malformed JSON responses cannot render as another saved record', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(payload))
  await assert.rejects(loadSavedFeedback('2'), /일치하지/)
  fetch.mock.mockImplementation(async () => Response.json({ ...payload, score: '90' }))
  await assert.rejects(loadSavedFeedback('1'), /응답 형식/)
})

test('failed or unfinished jobs preserve their status and do not become fake completed results', async (t) => {
  for (const status of ['pending', 'processing', 'failed']) {
    const value = { saved_result_id: 1, status, error_message: status === 'failed' ? '실패' : null }
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(value))
    assert.deepEqual(await loadSavedFeedback('1'), value)
    mock.mock.restore()
  }
})

test('aborted page requests stop and never return partially loaded account statistics', async (t) => {
  const controller = new AbortController()
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    controller.abort()
    return Response.json({ items: [summary(1)], total: 101, page: 1, page_size: 100 })
  })
  await assert.rejects(loadFeedbackHistory({ signal: controller.signal }), { name: 'AbortError' })
  assert.equal(fetch.mock.callCount(), 1)
})
