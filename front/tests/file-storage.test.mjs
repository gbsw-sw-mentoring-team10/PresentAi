import test from 'node:test'
import assert from 'node:assert/strict'
import { proxyApi } from '../worker/proxy.js'

test('original download proxy carries only the account session and refuses unrecognized paths', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    assert.equal(url.pathname, '/files/37/download')
    assert.equal(options.method, 'GET')
    assert.equal(options.headers.get('cookie'), 'presentai_session=synthetic')
    assert.equal(options.headers.has('authorization'), false)
    return Response.json({
      file_id: 37,
      download_url: 'https://synthetic.example/file',
      expires_in: 300,
    })
  })
  const response = await proxyApi(
    new Request('https://site.example/api/presentation/files/37/download', {
      headers: {
        Cookie: 'other=private; presentai_session=synthetic',
        Authorization: 'Bearer private',
      },
    }),
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal((await response.json()).file_id, 37)
  assert.equal(
    (await proxyApi(new Request('https://site.example/api/presentation/files/../private/download')))
      .status,
    404,
  )
  assert.equal(calls, 1)
})
