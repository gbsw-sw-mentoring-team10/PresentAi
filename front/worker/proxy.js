const UPSTREAM = 'https://presentation-api-edwk.onrender.com'
const ROUTES = new Map([
  ['/api/presentation/upload/', ['/upload/', 'POST']],
  ['/api/presentation/mock/upload/', ['/mock/upload/', 'POST']],
  ['/api/presentation/auth/register', ['/auth/register', 'POST']],
  ['/api/presentation/auth/login', ['/auth/login', 'POST']],
  ['/api/presentation/auth/logout', ['/auth/logout', 'POST']],
  ['/api/presentation/auth/me', ['/auth/me', 'GET']],
  ['/api/presentation/feedback', ['/feedback', 'GET']],
  ['/api/presentation/feedback/', ['/feedback/', 'GET']],
])

export function getSessionCookie(value = '') {
  return (
    value
      .split(';')
      .map((part) => part.trim())
      .find((part) => /^presentai_session=[A-Za-z0-9_-]{1,128}$/.test(part)) || ''
  )
}

export async function proxyApi(request, upstreamOrigin = UPSTREAM) {
  const url = new URL(request.url)
  const route =
    ROUTES.get(url.pathname) ||
    (/^\/api\/presentation\/feedback\/\d+$/.test(url.pathname)
      ? [url.pathname.replace('/api/presentation', ''), 'GET']
      : /^\/api\/presentation\/files\/\d+\/download$/.test(url.pathname)
        ? [url.pathname.replace('/api/presentation', ''), 'GET']
        : null)
  if (!route) return Response.json({ detail: 'API 경로를 찾을 수 없습니다.' }, { status: 404 })
  const [path, method] = route
  if (request.method !== method)
    return Response.json(
      { detail: `${method} 요청만 지원합니다.` },
      { status: 405, headers: { Allow: method } },
    )
  const origin = request.headers.get('origin')
  if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site')
    return Response.json({ detail: '요청 출처를 확인해 주세요.' }, { status: 403 })
  if (Number(request.headers.get('content-length')) > 32 * 1024 * 1024)
    return Response.json({ detail: '요청 크기가 너무 큽니다.' }, { status: 413 })
  const target = new URL(path, upstreamOrigin)
  for (const key of ['title', 'perpose']) {
    const value = url.searchParams.get(key)
    if (value !== null && path === '/upload/') target.searchParams.set(key, value)
    if (value !== null && path === '/mock/upload/') target.searchParams.set(key, value)
  }
  if (path === '/feedback' || path === '/feedback/') {
    for (const key of ['page', 'page_size']) {
      const value = url.searchParams.get(key)
      if (value !== null) target.searchParams.set(key, value)
    }
  }
  // 서비스 세션만 전달한다. 다른 사이트 쿠키와 Authorization은 전달하지 않는다.
  const headers = new Headers({ Accept: 'application/json' })
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)
  const session = getSessionCookie(request.headers.get('cookie') || '')
  if (session && path !== '/mock/upload/') headers.set('Cookie', session)
  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body: method === 'POST' ? request.body : undefined,
      duplex: 'half',
      redirect: 'manual',
      signal: AbortSignal.timeout(180000),
    })
    if (upstream.status >= 300 && upstream.status < 400)
      return Response.json({ detail: '분석 서버 응답 경로가 변경되었습니다.' }, { status: 502 })
    const responseHeaders = new Headers({
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    })
    const cookie = upstream.headers.get('set-cookie')
    if (['/auth/login', '/auth/logout'].includes(path) && cookie?.startsWith('presentai_session='))
      responseHeaders.set('Set-Cookie', cookie.replace(/;\s*Domain=[^;]*/gi, ''))
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError'
    return Response.json(
      {
        detail: timedOut
          ? '분석 서버의 응답 시간이 초과되었습니다.'
          : '분석 서버에 연결하지 못했습니다.',
      },
      { status: timedOut ? 504 : 502 },
    )
  }
}
