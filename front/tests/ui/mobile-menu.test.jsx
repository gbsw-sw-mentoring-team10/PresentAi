import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import useMobileMenu from '../../src/components/layout/useMobileMenu.js'

test('the mobile menu closes on Escape, outside clicks, navigation and desktop resize', () => {
  const media = new EventTarget()
  const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue(media)
  const { result, unmount } = renderHook(() => useMobileMenu())
  const button = document.createElement('button')
  const focus = vi.spyOn(button, 'focus')
  result.current.buttonRef.current = button

  for (const event of ['Escape', 'pointerdown', 'hashchange', 'desktop']) {
    act(() => result.current.toggle())
    expect(result.current.isOpen).toBe(true)
    act(() => {
      if (event === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: event }))
      else if (event === 'pointerdown') document.dispatchEvent(new Event(event))
      else if (event === 'hashchange') window.dispatchEvent(new HashChangeEvent(event))
      else media.dispatchEvent(Object.assign(new Event('change'), { matches: true }))
    })
    expect(result.current.isOpen).toBe(false)
  }
  expect(focus).toHaveBeenCalledOnce()
  act(() => result.current.toggle())
  unmount()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(focus).toHaveBeenCalledOnce()
  matchMedia.mockRestore()
})
