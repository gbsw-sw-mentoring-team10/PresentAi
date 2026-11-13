import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import MyPage from '../../src/pages/MyPage.jsx'
import { feedbackHistory } from '../../src/data/sampleHistory.js'
import { summarizeFeedbackHistory } from '../../src/features/account/accountRecord.js'

const user = { user_id: 7, email: 'synthetic-mypage@example.com' }
const savedRecords = feedbackHistory.map((item) => ({ ...item, type: 'material' }))

function renderPage(props = {}, respond) {
  const fetch = vi.fn(async (input, init) => {
    const url = new URL(input, 'http://localhost')
    if (init?.method === 'PATCH' || init?.method === 'DELETE') {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return Response.json({ ...user, message: 'ok' })
    }
    if (url.pathname.endsWith('/auth/me'))
      return Response.json({ ...user, created_at: '2026-03-02T00:00:00Z' })
    if (url.pathname.endsWith('/feedback'))
      return Response.json({
        items: savedRecords.map((item) => ({
          saved_result_id: item.id,
          title: item.title,
          score: item.score,
          created_at: `${item.createdAt}T00:00:00Z`,
        })),
        total: savedRecords.length,
        page: 1,
        page_size: 100,
      })
    return Response.json({ detail: '없는 요청' }, { status: 404 })
  })
  if (respond) fetch.mockImplementation(respond)
  vi.stubGlobal('fetch', fetch)
  const onAccountDeleted = vi.fn()
  render(<MyPage user={user} navigate={vi.fn()} onAccountDeleted={onAccountDeleted} {...props} />)
  return { fetch, onAccountDeleted, events: userEvent.setup() }
}

test('shows the email as the name and switches between profile and record tabs', async () => {
  const { events, fetch } = renderPage()
  expect(screen.getByRole('heading', { level: 1, name: user.email })).toBeTruthy()
  expect(screen.queryByRole('img', { name: /프로필/ })).toBeNull()
  const profileTab = screen.getByRole('tab', { name: '프로필' })
  expect(profileTab.getAttribute('aria-selected')).toBe('true')
  expect(screen.getByRole('tabpanel').textContent).toContain('계정 정보')
  expect(await screen.findByText('2026년 3월 2일')).toBeTruthy()

  await events.click(screen.getByRole('tab', { name: '기록' }))
  const panel = screen.getByRole('tabpanel', { name: '기록' })
  const counts = within(panel).getByRole('list')
  const summary = summarizeFeedbackHistory(savedRecords)
  expect(within(counts).getByText('발표자료 피드백').parentElement.textContent).toContain(
    `${summary.material}개`,
  )
  expect(within(counts).getByText('발표 피드백').parentElement.textContent).toContain(
    `${summary.speech}개`,
  )
  expect(within(panel).getByText('최초 가입일').nextElementSibling.textContent).toBe(
    '2026년 3월 2일',
  )

  await events.keyboard('{ArrowLeft}')
  expect(screen.getByRole('tab', { name: '프로필' }).getAttribute('aria-selected')).toBe('true')
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/auth/me'))).toBe(true)
  expect(fetch.mock.calls.some(([url]) => url.includes('/feedback?'))).toBe(true)
})

test('account deletion needs an explicit confirmation', async () => {
  const { events, onAccountDeleted } = renderPage()
  await events.click(screen.getByRole('button', { name: '계정 탈퇴' }))
  const modal = await screen.findByRole('dialog', { name: '계정 탈퇴' })
  expect(modal.textContent).toContain('되돌릴 수 없어요')
  const confirm = within(modal).getByRole('button', { name: '계정 탈퇴하기' })
  expect(confirm.disabled).toBe(true)
  await events.click(confirm)
  expect(onAccountDeleted).not.toHaveBeenCalled()

  await events.click(within(modal).getByRole('button', { name: '계속 이용하기' }))
  expect(screen.queryByRole('dialog', { name: '계정 탈퇴' })).toBeNull()
  expect(onAccountDeleted).not.toHaveBeenCalled()

  await events.click(screen.getByRole('button', { name: '계정 탈퇴' }))
  const again = await screen.findByRole('dialog', { name: '계정 탈퇴' })
  await events.click(within(again).getByRole('checkbox'))
  await events.click(within(again).getByRole('button', { name: '계정 탈퇴하기' }))
  expect(within(again).getByRole('button', { name: '탈퇴 처리 중…' }).disabled).toBe(true)
  await waitFor(() => expect(onAccountDeleted).toHaveBeenCalledTimes(1))
})

test('password change validates the two fields before sending', async () => {
  const { events } = renderPage()
  await screen.findByText('2026년 3월 2일')
  await events.click(screen.getByRole('button', { name: '비밀번호 변경' }))
  const modal = await screen.findByRole('dialog', { name: '비밀번호 변경' })
  const current = within(modal).getByLabelText('기존 비밀번호')
  const next = within(modal).getByLabelText('새 비밀번호')
  const submit = within(modal).getByRole('button', { name: '비밀번호 변경' })

  await events.type(current, 'synthetic-old-pass')
  await events.type(next, 'short')
  await events.click(submit)
  expect(within(modal).getByRole('alert').textContent).toContain('8자 이상')

  await events.clear(next)
  await events.type(next, 'synthetic-old-pass')
  await events.click(submit)
  expect(within(modal).getByRole('alert').textContent).toContain('기존 비밀번호와 같아요')

  await events.clear(next)
  await events.type(next, 'synthetic-new-pass')
  await events.click(submit)
  expect(within(modal).getByRole('button', { name: '처리 중…' }).disabled).toBe(true)
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '비밀번호 변경' })).toBeNull())
  expect((await screen.findByRole('status')).textContent).toContain('비밀번호를 바꿨어요.')
})

test('the grade gauge displays the saved average with a link to the feedback list', async () => {
  const navigate = vi.fn()
  const { events } = renderPage({ navigate })
  await events.click(screen.getByRole('tab', { name: '기록' }))
  const meter = await screen.findByRole('meter', { name: '전체 발표 점수' })
  const average = summarizeFeedbackHistory(savedRecords).average
  expect(meter.getAttribute('aria-valuenow')).toBe(String(average))

  expect(meter.firstElementChild.style.width).toBe(`${average}%`)
  expect(screen.queryByLabelText('점수 미리보기')).toBeNull()
  expect(screen.queryByRole('spinbutton')).toBeNull()
  await events.click(screen.getByRole('button', { name: '내 피드백 보기' }))
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/history')
})

test('empty saved records show zero counts and no sample average', async () => {
  const { events } = renderPage({}, async (url) =>
    url.endsWith('/auth/me')
      ? Response.json(user)
      : Response.json({ items: [], total: 0, page: 1, page_size: 100 }),
  )
  await events.click(screen.getByRole('tab', { name: '기록' }))
  const meter = await screen.findByRole('meter', { name: '전체 발표 점수' })
  expect(meter.getAttribute('aria-valuenow')).toBe('0')
  expect(
    screen.getByText('아직 받은 피드백이 없어요. 피드백을 받으면 평균 점수가 여기에 쌓여요.'),
  ).toBeTruthy()
  const counts = screen.getByRole('list')
  expect(within(counts).getByText('전체').parentElement.textContent).toContain('0개')
  expect(screen.getByText('최초 가입일').nextElementSibling.textContent).toBe('정보 없음')
})

test('a failed history query does not show zero or sample statistics and can be retried', async () => {
  const { events, fetch } = renderPage({}, async (url) =>
    url.endsWith('/auth/me')
      ? Response.json(user)
      : Response.json({ detail: 'DB 조회 실패' }, { status: 503 }),
  )
  await events.click(screen.getByRole('tab', { name: '기록' }))
  expect((await screen.findByRole('alert')).textContent).toContain('DB 조회 실패')
  expect(screen.queryByRole('meter')).toBeNull()
  fetch.mockImplementation(async () =>
    Response.json({ items: [], total: 0, page: 1, page_size: 100 }),
  )
  await events.click(screen.getByRole('button', { name: '다시 불러오기' }))
  await screen.findByRole('meter', { name: '전체 발표 점수' })
})
