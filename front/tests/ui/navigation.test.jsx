import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'
import { feedbackHistory } from '../../src/data/sampleHistory.js'
import { example } from '../../src/data/examplePresentation.js'

const account = { user_id: 7, email: 'synthetic-nav@example.com', role: 'user' }
const NOTICE = '로그인 이후 사용 가능한 기능입니다.'

// 로그인 상태만 바꾸고 라우팅·팝업 흐름은 실제 앱 그대로 실행합니다.
function stubServer({ loggedIn = false } = {}) {
  let session = loggedIn
  const fetch = vi.fn(async (url) => {
    if (url.endsWith('/auth/me'))
      return session
        ? Response.json(account)
        : Response.json({ detail: '로그인 필요' }, { status: 401 })
    if (url.endsWith('/auth/login')) {
      session = true
      return Response.json(account)
    }
    if (url.endsWith('/auth/logout')) {
      session = false
      return Response.json({ message: '로그아웃' })
    }
    return Response.json({ detail: '예상하지 못한 요청' }, { status: 500 })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

async function renderApp(path) {
  window.history.replaceState(null, '', `/#${path}`)
  const user = userEvent.setup()
  render(<App />)
  await screen.findAllByRole('button', { name: /^(로그인|로그아웃)$/ })
  return user
}

async function goTo(path) {
  await act(async () => {
    window.location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

const nav = () => screen.getByRole('navigation', { name: '주 메뉴' })
const myPageAction = () =>
  screen.getAllByRole('button', { name: '마이페이지' }).find((b) => !nav().contains(b))

test('logged-out header entries show the login notice instead of navigating', async () => {
  stubServer()
  const user = await renderApp('/')

  await user.click(within(nav()).getByRole('button', { name: '내 피드백' }))
  const notice = await screen.findByRole('dialog', { name: '로그인 안내' })
  expect(within(notice).getByText(NOTICE)).toBeTruthy()
  expect(window.location.hash).toBe('#/')
  await user.click(within(notice).getByText('닫기', { selector: '.button' }))
  expect(screen.queryByRole('dialog', { name: '로그인 안내' })).toBeNull()

  await user.click(myPageAction())
  const again = await screen.findByRole('dialog', { name: '로그인 안내' })
  await user.click(within(again).getByRole('button', { name: '로그인', exact: true }))
  expect(screen.queryByRole('dialog', { name: '로그인 안내' })).toBeNull()
  const login = await screen.findByRole('dialog', { name: '로그인' })
  await user.type(within(login).getByLabelText('이메일'), account.email)
  await user.type(within(login).getByLabelText('비밀번호', { exact: true }), 'synthetic-password')
  await user.click(within(login).getByRole('button', { name: '로그인', exact: true }))

  // 로그인하면 원래 가려던 마이페이지로 이어서 이동합니다.
  await waitFor(() => expect(window.location.hash).toBe('#/mypage'))
  expect(await screen.findByRole('heading', { level: 1, name: account.email })).toBeTruthy()
  expect(myPageAction().className).toContain('active')
})

test('opening gated routes directly while logged out shows the gate page', async () => {
  stubServer()
  const user = await renderApp('/history/4')
  expect(await screen.findByRole('heading', { level: 1, name: NOTICE })).toBeTruthy()
  expect(screen.queryByText(feedbackHistory[0].title)).toBeNull()

  await goTo('/mypage')
  expect(await screen.findByRole('heading', { level: 1, name: NOTICE })).toBeTruthy()
  expect(document.title).toBe('마이페이지 | PresentAi')

  await user.click(within(screen.getByRole('main')).getByRole('button', { name: '로그인' }))
  const login = await screen.findByRole('dialog', { name: '로그인' })
  await user.type(within(login).getByLabelText('이메일'), account.email)
  await user.type(within(login).getByLabelText('비밀번호', { exact: true }), 'synthetic-password')
  await user.click(within(login).getByRole('button', { name: '로그인', exact: true }))
  expect(await screen.findByRole('heading', { level: 1, name: account.email })).toBeTruthy()
  expect(window.location.hash).toBe('#/mypage')
})

test('logged-in users browse history list and detail from the header tab', async () => {
  stubServer({ loggedIn: true })
  const user = await renderApp('/')
  await user.click(within(nav()).getByRole('button', { name: '내 피드백' }))
  await waitFor(() => expect(window.location.hash).toBe('#/history'))
  expect(await screen.findByRole('heading', { level: 1, name: /내 피드백/ })).toBeTruthy()
  expect(document.title).toBe('내 피드백 | PresentAi')
  expect(within(nav()).getByRole('button', { name: '내 피드백' }).className).toBe('active')

  const first = feedbackHistory[0]
  await user.click(screen.getByText(first.title))
  await waitFor(() => expect(window.location.hash).toBe(`#/history/${first.id}`))
  expect(await screen.findByRole('heading', { level: 1, name: first.title })).toBeTruthy()
  expect(document.title).toBe('피드백 상세 | PresentAi')
  expect(within(nav()).getByRole('button', { name: '내 피드백' }).className).toBe('active')
})

test('the example form is cleared after visiting history and coming back', async () => {
  stubServer({ loggedIn: true })
  const user = await renderApp('/materials')
  await user.click(await screen.findByRole('button', { name: '예시 자료로 채우기', exact: true }))
  expect(screen.getByRole('textbox', { name: /발표 목적/ }).value).toBe(example.purpose)

  await user.click(within(nav()).getByRole('button', { name: '내 피드백' }))
  await screen.findByRole('heading', { level: 1, name: /내 피드백/ })
  await goTo('/materials')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('')
})

test('deleting the account clears the user locally even if logout fails', async () => {
  const fetch = stubServer({ loggedIn: true })
  fetch.mockImplementation(async (url) =>
    url.endsWith('/auth/me')
      ? Response.json(account)
      : Response.json({ detail: '잠시 후 다시 시도해 주세요.' }, { status: 503 }),
  )
  const user = await renderApp('/mypage')
  await user.click(await screen.findByRole('button', { name: '계정 탈퇴' }))
  const dialog = await screen.findByRole('dialog', { name: '계정 탈퇴' })
  await user.click(within(dialog).getByRole('checkbox'))
  await user.click(within(dialog).getByRole('button', { name: '계정 탈퇴하기' }))

  await waitFor(() => expect(window.location.hash).toBe('#/'))
  expect(await screen.findByRole('button', { name: '로그인', exact: true })).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
  await goTo('/mypage')
  expect(await screen.findByRole('heading', { level: 1, name: NOTICE })).toBeTruthy()
})
