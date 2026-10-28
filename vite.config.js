import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/presentation': {
        target: 'https://presentation-api-edwk.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/presentation/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyRequest) => {
            for (const header of ['cookie', 'authorization', 'origin', 'referer'])
              proxyRequest.removeHeader(header)
          })
        },
      },
    },
  },
})
