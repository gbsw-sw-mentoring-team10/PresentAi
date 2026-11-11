import test from 'node:test'
import assert from 'node:assert/strict'
import { proxyApi } from '../worker/proxy.js'

test('feedback list proxy carries pagination and the service session to the backend', async (t) => {
  const page = { items: [], total: 0, page: 2, page_size: 10 }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.origin, 'https://backend.example')
    assert.ok(['/feedback', '/feedback/'].includes(url.pathname))
    assert.deepEqual(
      [...url.searchParams],
      [
        ['page', '2'],
        ['page_size', '10'],
      ],
    )
    assert.equal(options.method, 'GET')
    assert.equal(options.body, undefined)
    assert.equal(options.headers.get('cookie'), 'presentai_session=synthetic_session')
    assert.equal(options.headers.has('authorization'), false)
    return Response.json(page)
  })
  for (const path of ['/feedback', '/feedback/']) {
    const response = await proxyApi(
      new Request(`https://site.example/api/presentation${path}?page=2&page_size=10&user_id=999`, {
        headers: {
          Cookie: 'site=private; presentai_session=synthetic_session',
          Authorization: 'Bearer private',
        },
      }),
      'https://backend.example',
    )
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), page)
  }
})

test('feedback detail proxy preserves the saved result and backend access errors', async (t) => {
  const detail = {
    saved_result_id: 42,
    storage_status: 'saved',
    storage_message: '분석 결과를 내 계정에 저장했어요.',
    score: 85,
    feedback: '평가',
    strengths: ['명확한 주제'],
    improvements: [],
    revised_script: '',
    slides: [],
  }
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.pathname, '/feedback/42')
    assert.equal(url.search, '')
    assert.equal(options.method, 'GET')
    return Response.json(detail)
  })
  const request = () => new Request('https://site.example/api/presentation/feedback/42')
  assert.deepEqual(await (await proxyApi(request())).json(), detail)
  for (const status of [401, 404, 503]) {
    fetchMock.mock.mockImplementation(async () =>
      Response.json({ detail: '조회 실패' }, { status }),
    )
    const response = await proxyApi(request())
    assert.equal(response.status, status)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { detail: '조회 실패' })
  }
})
