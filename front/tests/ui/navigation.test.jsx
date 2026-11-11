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
    if (url.includes('/feedback?'))
      return Response.json({
        items: feedbackHistory.map((item) => ({
          saved_result_id: item.id,
          title: item.title,
          score: item.score,
          created_at: `${item.createdAt}T00:00:00Z`,
        })),
        total: feedbackHistory.length,
        page: 1,
        page_size: 100,
      })
    const id = url.match(/\/feedback\/(\d+)$/)?.[1]
    const item = feedbackHistory.find((entry) => String(entry.id) === id)
    if (item)
      return Response.json({
        ...item.result,
        saved_result_id: item.id,
        title: item.title,
        created_at: `${item.createdAt}T00:00:00Z`,
        status: 'completed',
      })
    return Response.json({ detail: '예상하지 못한 요청' }, { status: 500 })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

async function renderApp(path) {
  window.history.replaceState(null, '', `/#${path}`)
  const user = userEvent.setup()
  render(<App />)
  await waitFor(() => expect(screen.getByRole('banner').getAttribute('aria-busy')).toBe('false'))
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
  const user = await renderApp('/materials')
  expect(
    within(screen.getByRole('banner')).queryAllByRole('button', { name: '마이페이지' }),
  ).toHaveLength(0)

  await user.click(within(nav()).getByRole('button', { name: '내 피드백' }))
  const notice = await screen.findByRole('dialog', { name: '로그인 안내' })
  expect(within(notice).getByText(NOTICE)).toBeTruthy()
  expect(window.location.hash).toBe('#/materials')
  await user.click(within(notice).getByText('닫기', { selector: '.button' }))
  expect(screen.queryByRole('dialog', { name: '로그인 안내' })).toBeNull()

  await user.click(
    within(screen.getByRole('banner')).getByRole('button', { name: '로그인', exact: true }),
  )
  const login = await screen.findByRole('dialog', { name: '로그인' })
  await user.type(within(login).getByLabelText('이메일'), account.email)
  await user.type(within(login).getByLabelText('비밀번호', { exact: true }), 'synthetic-password')
  await user.click(within(login).getByRole('button', { name: '로그인', exact: true }))

  // 로그인하면 데스크톱·모바일 마이페이지 진입점이 모두 생깁니다.
  expect(
    within(screen.getByRole('banner')).getAllByRole('button', { name: '마이페이지' }),
  ).toHaveLength(2)
  await user.click(myPageAction())
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
  const user = await renderApp('/materials')
  await user.click(within(nav()).getByRole('button', { name: '내 피드백' }))
  await waitFor(() => expect(window.location.hash).toBe('#/history'))
  expect(await screen.findByRole('heading', { level: 1, name: /내 피드백/ })).toBeTruthy()
  expect(document.title).toBe('내 피드백 | PresentAi')
  expect(within(nav()).getByRole('button', { name: '내 피드백' }).className).toBe('active')

  const first = feedbackHistory[0]
  await user.click(await screen.findByText(first.title))
  await waitFor(() => expect(window.location.hash).toBe(`#/history/${first.id}`))
  expect(await screen.findByRole('heading', { level: 1, name: first.title })).toBeTruthy()
  expect(document.title).toBe('피드백 상세 | PresentAi')
  expect(within(nav()).getByRole('button', { name: '내 피드백' }).className).toBe('active')
})

test.each([false, true])(
  'home shows three public menus and usage opens its guide (loggedIn=%s)',
  async (loggedIn) => {
    stubServer({ loggedIn })
    const user = await renderApp('/')
    const header = screen.getByRole('banner')
    expect(within(header).getByRole('button', { name: 'PresentAi 홈' })).toBeTruthy()
    const menu = within(header).getByRole('navigation', { name: '주 메뉴' })
    expect(
      within(menu)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['발표자료 피드백', '발표 피드백', '이용 방법'])
    // 홈 헤더에도 로그인 상태에 맞는 계정 버튼이 보입니다.
    expect(!!within(header).queryByRole('button', { name: '마이페이지' })).toBe(loggedIn)
    expect(!!within(header).queryByRole('button', { name: '로그아웃' })).toBe(loggedIn)
    expect(!!within(header).queryByRole('button', { name: '로그인', exact: true })).toBe(!loggedIn)
    expect(screen.queryByRole('button', { name: '예시 결과 둘러보기' })).toBeNull()
    expect(screen.queryByRole('button', { name: '전체 피드백 보기' })).toBeNull()
    const guide = screen.getByRole('region', { name: '이용 방법' })
    guide.scrollIntoView = vi.fn()
    await user.click(within(menu).getByRole('button', { name: '이용 방법' }))
    expect(guide.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' })
    await user.click(
      within(screen.getByRole('main')).getByRole('button', { name: '이용 방법', exact: true }),
    )
    expect(guide.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' })
    expect(window.location.hash).toBe('#/')
    await user.click(within(header).getByRole('button', { name: '시작하기' }))
    await screen.findByRole('textbox', { name: /발표 목적/ })
    expect(window.location.hash).toBe('#/materials')
    expect(
      within(screen.getByRole('banner')).getByRole('navigation', { name: '주 메뉴' }),
    ).toBeTruthy()
  },
)

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
  fetch.mockImplementation(async (url, init) =>
    url.endsWith('/auth/me') || init?.method === 'DELETE'
      ? Response.json(account)
      : Response.json({ detail: '잠시 후 다시 시도해 주세요.' }, { status: 503 }),
  )
  const user = await renderApp('/mypage')
  await user.click(await screen.findByRole('button', { name: '계정 탈퇴' }))
  const dialog = await screen.findByRole('dialog', { name: '계정 탈퇴' })
  await user.click(within(dialog).getByRole('checkbox'))
  await user.click(within(dialog).getByRole('button', { name: '계정 탈퇴하기' }))

  await waitFor(() => expect(window.location.hash).toBe('#/'))
  expect(screen.getByRole('button', { name: '로그인', exact: true })).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
  await goTo('/mypage')
  expect(await screen.findByRole('heading', { level: 1, name: NOTICE })).toBeTruthy()
})
