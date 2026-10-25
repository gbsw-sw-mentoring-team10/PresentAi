const UPSTREAM = 'https://presentation-api-edwk.onrender.com'
const ROUTES = new Map([
  ['/api/presentation/upload/', '/upload/'],
  ['/api/presentation/mock/upload/', '/mock/upload/'],
])

export async function proxyApi(request) {
  const url = new URL(request.url)
  const route = ROUTES.get(url.pathname)
  if (!route) return Response.json({ detail: 'API 경로를 찾을 수 없습니다.' }, { status: 404 })
  if (request.method !== 'POST') return Response.json({ detail: 'POST 요청만 지원합니다.' }, { status: 405, headers: { Allow: 'POST' } })
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) return Response.json({ detail: '요청 출처를 확인해 주세요.' }, { status: 403 })
  if (Number(request.headers.get('content-length')) > 32 * 1024 * 1024) return Response.json({ detail: '요청 크기가 너무 큽니다.' }, { status: 413 })
  const target = new URL(route, UPSTREAM)
  for (const key of ['title', 'perpose']) {
    const value = url.searchParams.get(key)
    if (value !== null) target.searchParams.set(key, value)
  }
  // Forward only the form encoding. Site cookies and authorization stay on this origin.
  const headers = new Headers({ Accept: 'application/json' })
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)
  try {
    const upstream = await fetch(target, {
      method: 'POST', headers, body: request.body, duplex: 'half',
      redirect: 'manual', signal: AbortSignal.timeout(180000),
    })
    if (upstream.status >= 300 && upstream.status < 400) return Response.json({ detail: '분석 서버 응답 경로가 변경되었습니다.' }, { status: 502 })
    return new Response(upstream.body, { status: upstream.status, headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    } })
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError'
    return Response.json({ detail: timedOut ? '분석 서버의 응답 시간이 초과되었습니다.' : '분석 서버에 연결하지 못했습니다.' }, { status: timedOut ? 504 : 502 })
  }
}
