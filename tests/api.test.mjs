import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createFeedback,
  FeedbackApiError,
  normalizeFeedback,
  OVERLOADED_MESSAGE,
} from '../src/features/feedback/feedbackApi.js'
import { proxyApi } from '../worker/proxy.js'
import { readFile, readdir } from 'node:fs/promises'

const form = {
  title: '발표 제목',
  purpose: '신입 교육',
  description: '추가 설명',
  script: '발표 대본',
  file: null,
}
const feedback = {
  score: 84,
  feedback: '핵심 메시지가 명확합니다.',
  strengths: ['명확한 주제'],
  improvements: [
    {
      issue: '출처 추가',
      deduction: 16,
      solution: '마지막 슬라이드에 인용한 자료의 출처를 정리하세요.',
    },
  ],
}

test('API request uses documented query names, multipart fields and real file bytes', async (t) => {
  const file = new File(['actual-file-content'], 'slides.pdf', { type: 'application/pdf' })
  const controller = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const parsed = new URL(url, 'https://site.example')
    assert.equal(parsed.pathname, '/api/presentation/upload/')
    assert.equal(parsed.searchParams.get('title'), form.title)
    assert.equal(parsed.searchParams.get('perpose'), form.purpose)
    assert.equal(parsed.searchParams.has('purpose'), false)
    assert.equal(options.method, 'POST')
    assert.equal(options.signal, controller.signal)
    assert.equal(options.headers['Content-Type'], undefined)
    assert.equal(options.body.get('detail'), form.description)
    assert.equal(options.body.get('prompt'), form.script)
    assert.equal(options.body.get('file').name, 'slides.pdf')
    assert.equal(await options.body.get('file').text(), 'actual-file-content')
    return Response.json(feedback)
  })
  assert.deepEqual(await createFeedback({ ...form, file }, { signal: controller.signal }), feedback)
})

test('sample API omits virtual files and derives an optional title', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const parsed = new URL(url, 'https://site.example')
    assert.equal(parsed.pathname, '/api/presentation/mock/upload/')
    assert.equal(parsed.searchParams.get('title'), 'example')
    assert.equal(options.body.has('file'), false)
    return Response.json(feedback)
  })
  await createFeedback(
    { ...form, title: '', file: { name: 'example.pdf', sample: true } },
    { mock: true },
  )
})

test('real server failures remain failures without a mock fallback', async (t) => {
  let count = 0
  t.mock.method(globalThis, 'fetch', async () => {
    count++
    return new Response('Internal Server Error', { status: 500 })
  })
  await assert.rejects(
    createFeedback(form),
    (error) =>
      error instanceof FeedbackApiError && error.status === 500 && error.message.includes('500'),
  )
  assert.equal(count, 1)
})

test('validation, malformed responses, connection failures and cancellation are distinct', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: [{ msg: 'Field required' }] }, { status: 422 }),
  )
  await assert.rejects(createFeedback(form), /Field required/)
  fetchMock.mock.mockImplementation(async () => Response.json({ result: 'this is overall page' }))
  await assert.rejects(createFeedback(form), /응답 형식/)
  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError('Failed to fetch')
  })
  await assert.rejects(createFeedback(form), /서버에 연결/)
  fetchMock.mock.mockImplementation(async () => {
    throw new DOMException('cancelled', 'AbortError')
  })
  await assert.rejects(createFeedback(form), (error) => error.name === 'AbortError')
  assert.throws(() => normalizeFeedback({ ...feedback, score: null }), /응답 형식/)
  assert.throws(() => normalizeFeedback({ ...feedback, improvements: [null] }), /응답 형식/)
  assert.equal(normalizeFeedback({ ...feedback, score: 0 }).score, 0)
  assert.throws(
    () => normalizeFeedback({ ...feedback, improvements: [{ issue: '문제', deduction: 5 }] }),
    /응답 형식/,
  )
  assert.throws(
    () =>
      normalizeFeedback({
        ...feedback,
        improvements: [{ issue: '문제', deduction: '5', solution: '해결' }],
      }),
    /응답 형식/,
  )
  assert.throws(() => normalizeFeedback({ ...feedback, revised_script: 123 }), /응답 형식/)
})

test('revised script is kept only when the server returns one', () => {
  assert.equal('revised_script' in normalizeFeedback(feedback), false)
  assert.equal(
    normalizeFeedback({ ...feedback, revised_script: '수정된 대본' }).revised_script,
    '수정된 대본',
  )
})

test('legacy string improvements are converted to the structured shape', () => {
  const result = normalizeFeedback({
    ...feedback,
    improvements: ['1. [감점 6점] 근거가 부족함', '결론 보강'],
  })
  assert.deepEqual(result.improvements, [
    { issue: '근거가 부족함', deduction: 6, solution: '' },
    { issue: '결론 보강', deduction: null, solution: '' },
  ])
})

test('production proxy preserves multipart bytes and errors without forwarding site credentials', async (t) => {
  const body = new FormData()
  body.append('prompt', '합성 대본')
  body.append('file', new File(['file bytes'], 'presentation.pdf'))
  const request = new Request(
    'https://site.example/api/presentation/upload/?title=title&perpose=purpose&token=secret',
    {
      method: 'POST',
      body,
      headers: {
        Origin: 'https://site.example',
        Cookie: 'site=session',
        Authorization: 'Bearer site-token',
      },
    },
  )
  const expected = await request.clone().arrayBuffer()
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.origin, 'https://presentation-api-edwk.onrender.com')
    assert.equal(url.pathname, '/upload/')
    assert.equal(url.searchParams.get('token'), null)
    assert.equal(options.headers.has('cookie'), false)
    assert.equal(options.headers.has('authorization'), false)
    assert.equal(options.headers.has('origin'), false)
    assert.match(options.headers.get('content-type'), /multipart\/form-data; boundary=/)
    assert.deepEqual(await new Response(options.body).arrayBuffer(), expected)
    return new Response('Internal Server Error', { status: 500 })
  })
  const response = await proxyApi(request)
  assert.equal(response.status, 500)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('production proxy rejects unrelated paths, methods and cross-origin requests', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('must not call upstream')
  })
  assert.equal(
    (await proxyApi(new Request('https://site.example/api/presentation/unknown'))).status,
    404,
  )
  assert.equal(
    (await proxyApi(new Request('https://site.example/api/presentation/upload/'))).status,
    405,
  )
  assert.equal(
    (
      await proxyApi(
        new Request('https://site.example/api/presentation/upload/', {
          method: 'POST',
          headers: { Origin: 'https://other.example' },
        }),
      )
    ).status,
    403,
  )
})

test('built Worker serves the exact Vite HTML, stylesheet, script and transparent logo bytes', async () => {
  const source = await readFile('dist/server/index.js', 'utf8')
  const worker = (
    await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  ).default
  const html = await worker.fetch(new Request('https://site.example/'))
  assert.equal(await html.text(), await readFile('dist/index.html', 'utf8'))
  const markup = await readFile('dist/index.html', 'utf8')
  const entryAssets = [...markup.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
    (match) => match[1],
  )
  const chunkAssets = (await readdir('dist/assets')).map((name) => `/assets/${name}`)
  for (const url of new Set([...entryAssets, ...chunkAssets, '/brand/presentai-compact.png'])) {
    const response = await worker.fetch(new Request(`https://site.example${url}`))
    assert.equal(response.status, 200)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(`dist${url}`))
  }
  assert.equal((await worker.fetch(new Request('https://site.example/no-such-file'))).status, 404)
})

test('model overload errors show a retry-later message', async (t) => {
  const body =
    "google.genai.errors.ServerError: 503 UNAVAILABLE. {'error': {'code': 503, 'message': 'This model is currently experiencing high demand.', 'status': 'UNAVAILABLE'}}"
  for (const status of [500, 503]) {
    t.mock.method(globalThis, 'fetch', async () => new Response(body, { status }))
    await assert.rejects(
      createFeedback(form),
      (error) => error.message === OVERLOADED_MESSAGE && error.status === 503,
    )
  }
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'boom' }, { status: 500 }))
  await assert.rejects(createFeedback(form), (error) => error.message !== OVERLOADED_MESSAGE)
})
