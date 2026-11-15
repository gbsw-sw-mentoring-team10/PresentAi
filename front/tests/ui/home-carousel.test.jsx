import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import FeedbackShowcase from '../../src/features/home/FeedbackShowcase.jsx'

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(window.matchMedia).mockImplementation(() => ({ matches: false }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const advance = (milliseconds) => act(() => vi.advanceTimersByTime(milliseconds))
const selected = () =>
  screen.getByRole('group', { name: '소개 슬라이드 선택' }).querySelector('[aria-current="true"]')

test('one message is exposed at a time, advances every three seconds and loops forward', () => {
  const { container } = render(<FeedbackShowcase />)
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
  expect(selected().getAttribute('aria-label')).toMatch(/^1번/)
  advance(2999)
  expect(selected().getAttribute('aria-label')).toMatch(/^1번/)
  advance(1)
  expect(selected().getAttribute('aria-label')).toMatch(/^2번/)
  advance(3000)
  expect(selected().getAttribute('aria-label')).toMatch(/^3번/)
  advance(3000)
  expect(selected().getAttribute('aria-label')).toMatch(/^4번/)
  advance(3000)
  expect(selected().getAttribute('aria-label')).toMatch(/^1번/)
  const track = container.querySelector('.hero-deck-track')
  expect(track.style.transform).toBe('translateX(-400%)')
  fireEvent(
    track,
    Object.assign(new Event('transitionend', { bubbles: true }), { propertyName: 'transform' }),
  )
  expect(track.style.transform).toBe('translateX(-0%)')
  expect(track.style.transition).toBe('none')
  advance(3000)
  expect(selected().getAttribute('aria-label')).toMatch(/^2번/)
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
})

test('pause, resume, manual selection and the direct start action work', () => {
  const onStart = vi.fn()
  render(<FeedbackShowcase onStart={onStart} />)
  fireEvent.click(screen.getByRole('button', { name: '슬라이드 자동 재생 멈추기' }))
  advance(6000)
  expect(selected().getAttribute('aria-label')).toMatch(/^1번/)
  fireEvent.click(screen.getByRole('button', { name: '슬라이드 자동 재생 시작' }))
  advance(3000)
  expect(selected().getAttribute('aria-label')).toMatch(/^2번/)
  fireEvent.click(screen.getByRole('button', { name: /^4번 슬라이드/ }))
  advance(6000)
  expect(selected().getAttribute('aria-label')).toMatch(/^4번/)
  fireEvent.click(screen.getByRole('button', { name: '자료 점검하기' }))
  expect(onStart).toHaveBeenCalledOnce()
})

test('hidden tabs stop advancing and unmount clears the timer', () => {
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const { unmount } = render(<FeedbackShowcase />)
  visibility.mockReturnValue('hidden')
  fireEvent(document, new Event('visibilitychange'))
  advance(9000)
  expect(selected().getAttribute('aria-label')).toMatch(/^1번/)
  visibility.mockReturnValue('visible')
  fireEvent(document, new Event('visibilitychange'))
  advance(3000)
  expect(selected().getAttribute('aria-label')).toMatch(/^2번/)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

test('reduced motion uses manual slide selection without animation or autoplay', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true })
  const { container } = render(<FeedbackShowcase />)
  advance(9000)
  expect(selected().getAttribute('aria-label')).toMatch(/^1번/)
  expect(screen.queryByRole('button', { name: /자동 재생/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /^2번 슬라이드/ }))
  expect(selected().getAttribute('aria-label')).toMatch(/^2번/)
  expect(container.querySelector('.hero-deck-track').style.transition).toBe('none')
})

test('custom PPT images use the same frame and timing, and a single image stays still', () => {
  const slides = [
    { id: 'custom-1', title: '직접 만든 표지', image: '/home-slides/01.png' },
    { id: 'custom-2', title: '직접 만든 소개', image: '/home-slides/02.png' },
  ]
  const { unmount } = render(<FeedbackShowcase slides={slides} />)
  expect(screen.getByRole('img', { name: '직접 만든 표지' }).getAttribute('src')).toBe(
    '/home-slides/01.png',
  )
  expect(screen.queryByRole('img', { name: '직접 만든 소개' })).toBeNull()
  advance(3000)
  expect(screen.getByRole('img', { name: '직접 만든 소개' })).toBeTruthy()
  unmount()
  render(<FeedbackShowcase slides={[slides[0]]} />)
  advance(9000)
  expect(screen.getByRole('img', { name: '직접 만든 표지' })).toBeTruthy()
  expect(screen.queryByRole('group', { name: '소개 슬라이드 선택' })).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
})
