import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import MyPage from '../../src/pages/MyPage.jsx'
import { feedbackHistory } from '../../src/data/sampleHistory.js'
import { summarizeFeedbackHistory } from '../../src/features/account/accountRecord.js'

const user = { user_id: 7, email: 'synthetic-mypage@example.com' }

function renderPage(props = {}) {
  const fetch = vi.fn()
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
  const summary = summarizeFeedbackHistory(feedbackHistory)
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
  expect(fetch).not.toHaveBeenCalled()
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

test('the grade gauge follows the preview number and clamps it', async () => {
  const { events } = renderPage()
  await events.click(screen.getByRole('tab', { name: '기록' }))
  const meter = screen.getByRole('meter', { name: '전체 발표 점수' })
  const average = summarizeFeedbackHistory(feedbackHistory).average
  expect(meter.getAttribute('aria-valuenow')).toBe(String(average))

  const input = screen.getByLabelText('점수 미리보기')
  await events.clear(input)
  await events.type(input, '30')
  expect(meter.getAttribute('aria-valuenow')).toBe('30')
  expect(meter.firstElementChild.style.width).toBe('30%')

  await events.clear(input)
  await events.type(input, '140')
  expect(meter.getAttribute('aria-valuenow')).toBe('100')
  expect(input.getAttribute('aria-invalid')).toBe('true')

  await events.click(screen.getByRole('button', { name: '평균으로 되돌리기' }))
  expect(meter.getAttribute('aria-valuenow')).toBe(String(average))
})
