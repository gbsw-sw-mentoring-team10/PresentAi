import { proxyApi } from './proxy.js'

export function createWorker(assets) {
  return {
    async fetch(request) {
      const pathname = new URL(request.url).pathname
      if (pathname.startsWith('/api/')) return proxyApi(request)
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
      const asset = assets[pathname === '/' ? '/index.html' : pathname]
      if (!asset) return new Response('Not found', { status: 404 })
      const bytes = request.method === 'HEAD' ? null : Uint8Array.from(atob(asset[1]), character => character.charCodeAt(0))
      return new Response(bytes, { headers: {
        'Content-Type': asset[0],
        'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      } })
    },
  }
}
