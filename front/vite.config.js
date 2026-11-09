import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import { getSessionCookie } from './worker/proxy.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      {
        name: 'same-origin-api',
        configureServer(server) {
          server.middlewares.use('/api/presentation', (request, response, next) => {
            const scheme = request.socket.encrypted ? 'https' : 'http'
            const origin = request.headers.origin
            if (
              (origin && origin !== `${scheme}://${request.headers.host}`) ||
              request.headers['sec-fetch-site'] === 'cross-site'
            ) {
              response.writeHead(403, { 'Content-Type': 'application/json' })
              response.end(JSON.stringify({ detail: '요청 출처를 확인해 주세요.' }))
              return
            }
            next()
          })
        },
      },
    ],
    server: {
      proxy: {
        '/api/presentation': {
          target: env.PRESENTATION_API_ORIGIN || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/presentation/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest, request) => {
              for (const header of ['cookie', 'authorization', 'origin', 'referer'])
                proxyRequest.removeHeader(header)
              const session = getSessionCookie(request.headers.cookie || '')
              if (session && !request.url.startsWith('/mock/'))
                proxyRequest.setHeader('Cookie', session)
            })
          },
        },
      },
    },
  }
})
