import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'

let buttonWidth
const ids = ['materials', 'speech', 'how', 'history', 'mypage']

function bounds(x, width) {
  return { x, y: 16, left: x, right: x + width, top: 16, bottom: 60, width, height: 44 }
}

beforeEach(() => {
  buttonWidth = 100
  const original = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.id === 'main-navigation') return bounds(200, 600)
    const index = ids.indexOf(this.dataset.navId)
    return index < 0 ? original.call(this) : bounds(200 + index * (buttonWidth + 8), buttonWidth)
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ detail: '로그인 필요' }, { status: 401 })),
  )
})

afterEach(() => vi.restoreAllMocks())

async function open(path) {
  window.history.replaceState(null, '', `/#${path}`)
  render(<App />)
  await waitFor(() => expect(screen.getByRole('banner').getAttribute('aria-busy')).toBe('false'))
  return userEvent.setup()
}

const menu = () => screen.getByRole('navigation', { name: '주 메뉴' })
const button = (name) => within(menu()).getByRole('button', { name, exact: true })
const line = () => menu().querySelector('.nav-indicator')
const position = (x) => `translate3d(${x}px, 41px, 0)`

test('one underline previews hover, restores the current page on exit and selects the clicked page', async () => {
  const user = await open('/materials')
  expect(button('발표자료 피드백').getAttribute('aria-current')).toBe('page')
  expect(line().style.transform).toBe(position(0))
  expect(line().style.opacity).toBe('1')

  await user.hover(button('발표 피드백'))
  expect(line().style.transform).toBe(position(108))
  expect(button('발표자료 피드백').getAttribute('aria-current')).toBe('page')
  await user.unhover(button('발표 피드백'))
  expect(line().style.transform).toBe(position(0))

  await user.hover(button('이용 방법'))
  expect(line().style.transform).toBe(position(216))
  await user.click(button('발표 피드백'))
  await waitFor(() => expect(button('발표 피드백').getAttribute('aria-current')).toBe('page'))
  expect(line().style.transform).toBe(position(108))
  await user.hover(button('발표자료 피드백'))
  expect(line().style.transform).toBe(position(0))
  await user.unhover(button('발표자료 피드백'))
  expect(line().style.transform).toBe(position(108))
  expect(menu().querySelectorAll('.nav-indicator')).toHaveLength(1)
})

test('usage navigation remains accessible while the home underline disappears on pointer exit', async () => {
  const user = await open('/speech')
  await user.click(button('이용 방법'))
  await waitFor(() => expect(button('이용 방법').getAttribute('aria-current')).toBe('location'))
  expect(window.location.hash).toBe('#/')
  expect(screen.getByRole('region', { name: '이용 방법' }).scrollIntoView).toHaveBeenCalled()
  await user.unhover(button('이용 방법'))
  expect(line().style.opacity).toBe('0')

  await user.click(screen.getByRole('button', { name: 'PresentAi 홈', exact: true }))
  expect(button('이용 방법').getAttribute('aria-current')).toBeNull()
  expect(line().style.opacity).toBe('0')
})

test('the hero guide button selects usage and actual route changes replace its selection', async () => {
  const user = await open('/')
  expect(line().style.opacity).toBe('0')
  await user.click(
    within(screen.getByRole('main')).getByRole('button', { name: '이용 방법', exact: true }),
  )
  expect(button('이용 방법').getAttribute('aria-current')).toBe('location')
  expect(line().style.opacity).toBe('0')

  await act(async () => {
    window.location.hash = '/materials'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(button('이용 방법').getAttribute('aria-current')).toBeNull()
  expect(button('발표자료 피드백').getAttribute('aria-current')).toBe('page')
  expect(line().style.transform).toBe(position(0))
})

test('home shows the underline only during interaction and clicking usage does not pin it', async () => {
  const user = await open('/')
  await user.hover(button('발표자료 피드백'))
  expect(line().style.opacity).toBe('1')
  await user.unhover(button('발표자료 피드백'))
  expect(line().style.opacity).toBe('0')

  await user.click(button('이용 방법'))
  expect(button('이용 방법').getAttribute('aria-current')).toBe('location')
  expect(line().style.opacity).toBe('1')
  await user.unhover(button('이용 방법'))
  expect(line().style.opacity).toBe('0')
})

test('the underline follows keyboard focus and remeasures after resizing', async () => {
  await open('/materials')
  act(() => button('발표 피드백').focus())
  expect(line().style.transform).toBe(position(108))
  buttonWidth = 140
  act(() => window.dispatchEvent(new Event('resize')))
  expect(line().style.width).toBe('140px')
  expect(line().style.transform).toBe(position(148))
})
