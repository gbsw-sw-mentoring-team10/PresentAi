import test from 'node:test'
import assert from 'node:assert/strict'
import { proxyApi } from '../worker/proxy.js'
import { getOriginalDownload } from '../src/features/feedback/fileApi.js'

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

test('original downloads request a fresh owner-authorized URL without caching', async (t) => {
  const payload = {
    file_id: 37,
    file_name: '원본.pdf',
    download_url: 'https://synthetic.example/original?signature=temporary',
    expires_in: 300,
  }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/presentation/files/37/download')
    assert.equal(options.credentials, 'include')
    assert.equal(options.cache, 'no-store')
    return Response.json(payload)
  })
  assert.deepEqual(await getOriginalDownload(37), payload)
})

test('download failures and unsafe URL responses never become download links', async (t) => {
  for (const body of [
    { file_id: 37, file_name: 'original.pdf', download_url: 'javascript:alert(1)' },
    { file_id: 999, file_name: 'wrong-owner.pdf', download_url: 'https://synthetic.example/file' },
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(body))
    await assert.rejects(getOriginalDownload(37), /주소를 확인/)
    mock.mock.restore()
  }
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: 'private detail' }, { status: 401 }),
  )
  await assert.rejects(getOriginalDownload(37), /다시 로그인/)
})
