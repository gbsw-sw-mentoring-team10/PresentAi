import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 대부분의 흐름 테스트는 완료 화면의 대기 없이 바로 결과로 넘어갑니다. 대기는 analysis-reveal 테스트에서 확인합니다.
vi.mock('../../src/features/analysis/analysisTiming.js', () => ({ RESULT_REVEAL_DELAY: 0 }))

// jsdom does not implement layout or scrolling; interaction assertions use the DOM.
window.scrollTo = vi.fn()
HTMLElement.prototype.scrollIntoView = vi.fn()
window.matchMedia = vi.fn((query) => ({ matches: false, media: query }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// The dialog lifecycle is exercised without browser layout in jsdom.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
HTMLDialogElement.prototype.close = function () {
  this.open = false
}
