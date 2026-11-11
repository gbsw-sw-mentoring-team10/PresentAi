import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    maxWorkers: 2,
    include: ['tests/ui/**/*.test.jsx'],
    setupFiles: ['tests/ui/setup.js'],
  },
})
