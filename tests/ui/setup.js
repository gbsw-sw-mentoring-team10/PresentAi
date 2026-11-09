import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom does not implement layout or scrolling; interaction assertions use the DOM.
window.scrollTo = vi.fn()
window.matchMedia = vi.fn((query) => ({ matches: false, media: query }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
