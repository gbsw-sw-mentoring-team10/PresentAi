import test from 'node:test'
import assert from 'node:assert/strict'
import { getAccountProfile } from '../src/features/account/accountApi.js'
import { accountRequest } from '../src/features/auth/authApi.js'
import { normalizeFeedback, createFeedback } from '../src/features/feedback/feedbackApi.js'
import { normalizeSlides } from '../src/features/slides/slideFeedback.js'
import { proxyApi, getSessionCookie } from '../worker/proxy.js'

const user = { user_id: 12, email: 'auth-test@example.com', role: 'user' }

test('account requests use server sessions and handle missing or invalid logins', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.credentials, 'include')
    assert.equal(options.cache, 'no-store')
    if (url.endsWith('/me')) return Response.json({ detail: '로그인 필요' }, { status: 401 })
    assert.equal(options.method, 'POST')
    if (url.endsWith('/logout')) return Response.json({ message: '로그아웃' })
    assert.deepEqual(JSON.parse(options.body), {
      email: user.email,
      password: 'synthetic-password',
    })
    return Response.json(user)
  })
  assert.equal(await accountRequest('me'), null)
  for (const path of ['register', 'login'])
    assert.deepEqual(
      await accountRequest(path, {
        credentials: { email: user.email, password: 'synthetic-password' },
      }),
      user,
    )
  await accountRequest('logout')
})

test('account profile shows signup and last info update as dates only', async (t) => {
  // 정오(UTC)로 두어 어느 시간대에서 실행해도 같은 날짜가 나오게 합니다.
  const signup = { ...user, created_at: '2026-03-02T12:00:00Z', updated_at: '2026-03-02T12:00:00Z' }
  const changed = { ...signup, updated_at: '2026-08-19T12:30:00Z' }
  let response = signup
  t.mock.method(globalThis, 'fetch', async () => Response.json(response))

  assert.deepEqual(await getAccountProfile(), {
    email: user.email,
    createdAt: '2026-03-02',
    infoUpdatedAt: null,
  })
  response = changed
  assert.deepEqual(await getAccountProfile(), {
    email: user.email,
    createdAt: '2026-03-02',
    infoUpdatedAt: '2026-08-19',
  })
})

test('session proxy forwards only the service cookie and preserves login/logout Set-Cookie', async (t) => {
  assert.equal(
    getSessionCookie('site=secret; presentai_session=real_token; other=hidden'),
    'presentai_session=real_token',
  )
  assert.equal(getSessionCookie('presentai_session=invalid value'), '')
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.origin, 'https://current-backend.example')
    assert.equal(options.headers.get('cookie'), 'presentai_session=real_token')
    assert.equal(options.headers.has('authorization'), false)
    assert.equal(options.headers.has('origin'), false)
    return Response.json(user, {
      headers: {
        'Set-Cookie': 'presentai_session=next_token; Path=/; HttpOnly; Secure; SameSite=Lax',
      },
    })
  })
  for (const path of ['login', 'logout']) {
    const response = await proxyApi(
      new Request(`https://site.example/api/presentation/auth/${path}`, {
        method: 'POST',
        headers: {
          Cookie: 'site=secret; presentai_session=real_token',
          Origin: 'https://site.example',
          Authorization: 'Bearer hidden',
        },
      }),
      'https://current-backend.example',
    )
    assert.match(response.headers.get('set-cookie'), /^presentai_session=next_token/)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('session proxy supports session reads and refuses cross-site credential requests', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    assert.equal(options.method, 'GET')
    assert.equal(options.body, undefined)
    return Response.json(user)
  })
  assert.equal(
    (await proxyApi(new Request('https://site.example/api/presentation/auth/me'))).status,
    200,
  )
  assert.equal(
    (
      await proxyApi(
        new Request('https://site.example/api/presentation/auth/me', {
          headers: { 'sec-fetch-site': 'cross-site' },
        }),
      )
    ).status,
    403,
  )
  assert.equal(calls, 1)
})

test('analysis carries the service session and retains server-confirmed saved result IDs', async (t) => {
  const result = {
    score: 80,
    feedback: '평가',
    strengths: [],
    improvements: [],
    saved_result_id: 42,
    saved_file_id: 37,
    file_storage_status: 'saved',
  }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.credentials, 'include')
    return Response.json(result)
  })
  const saved = await createFeedback({
    title: '',
    purpose: '교육',
    description: '',
    script: '대본',
  })
  assert.equal(saved.saved_result_id, 42)
  assert.equal(saved.saved_file_id, 37)
  assert.equal(saved.file_storage_status, 'saved')
  assert.equal(normalizeFeedback({ ...result, saved_result_id: null }).saved_result_id, undefined)
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: 'DB에 연결할 수 없습니다.' }, { status: 503 }),
  )
  await assert.rejects(
    createFeedback({ title: '', purpose: '', description: '', script: '대본' }),
    /저장하지 못했어요/,
  )
})

test('current backend slide fields retain each issue and its matching solution', () => {
  const slides = normalizeSlides([
    {
      slide_number: 1,
      summary: '표지',
      good_points: ['명확함'],
      issues: [
        { problem: '작은 글씨', solution: '글자 확대' },
        { problem: '누락', solution: '추가' },
      ],
    },
  ])
  assert.equal(slides[0].id, 1)
  assert.deepEqual(slides[0].strengths, ['명확함'])
  assert.deepEqual(
    slides[0].issues.map((issue) => [issue.title, issue.suggestion]),
    [
      ['작은 글씨', '글자 확대'],
      ['누락', '추가'],
    ],
  )
})
