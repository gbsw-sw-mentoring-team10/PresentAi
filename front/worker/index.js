import { proxyApi } from './proxy.js'

export function createWorker(assets) {
  const decodedAssets = new Map()

  return {
    async fetch(request, env) {
      const pathname = new URL(request.url).pathname
      if (pathname.startsWith('/api/')) return proxyApi(request, env?.PRESENTATION_API_ORIGIN)
      if (!['GET', 'HEAD'].includes(request.method))
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
      const asset = assets[pathname === '/' ? '/index.html' : pathname]
      if (!asset) return new Response('Not found', { status: 404 })
      let bytes = null
      if (request.method !== 'HEAD') {
        if (!decodedAssets.has(asset)) {
          decodedAssets.set(
            asset,
            Uint8Array.from(atob(asset[1]), (character) => character.charCodeAt(0)),
          )
        }
        bytes = decodedAssets.get(asset)
      }
      return new Response(bytes, {
        headers: {
          'Content-Type': asset[0],
          'Cache-Control': pathname.startsWith('/assets/')
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
        },
      })
    },
  }
}
