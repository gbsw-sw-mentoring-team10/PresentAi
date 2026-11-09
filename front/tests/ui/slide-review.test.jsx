import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import ExampleResultsPage from '../../src/pages/ExampleResultsPage.jsx'
import FeedbackResultsPage from '../../src/pages/FeedbackResultsPage.jsx'
import { normalizeFeedback } from '../../src/features/feedback/feedbackApi.js'

const request = {
  mock: false,
  submission: { title: '테스트 발표', purpose: '서비스 소개', file: null },
  result: normalizeFeedback({
    score: 80,
    feedback: '자료의 흐름을 보완해 보세요.',
    strengths: [],
    improvements: [],
    slides: [
      { page: 2, title: '소개', issues: [{ title: '소개 보완', priority: 'low' }] },
      { page: 5, title: '근거', issues: [{ title: '근거 추가', priority: 'high' }] },
      { page: 9, title: '결론', issues: [{ title: '문장 정리', priority: 'medium' }] },
    ],
  }),
}

function selectedSlide() {
  return within(screen.getByRole('complementary', { name: '슬라이드 탐색' })).getByRole('button', {
    current: true,
  })
}

test('example overview and slide detail share review checks in both directions', async () => {
  const user = userEvent.setup()
  render(<ExampleResultsPage navigate={() => {}} />)
  await user.click(
    screen.getByRole('button', { name: '시장 수치에 근거를 더해 주세요 확인 완료 표시' }),
  )
  await user.click(screen.getByRole('button', { name: '3번 슬라이드 피드백 보기' }))
  expect(selectedSlide().getAttribute('aria-label')).toMatch(/^3번/)
  expect(
    screen.getByRole('button', { name: '확인 완료', exact: true }).getAttribute('aria-pressed'),
  ).toBe('true')
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1')

  await user.click(screen.getByRole('button', { name: '확인 완료', exact: true }))
  await user.click(screen.getByRole('tab', { name: '전체 요약' }))
  expect(
    screen
      .getByRole('button', { name: '시장 수치에 근거를 더해 주세요 확인 완료 표시' })
      .getAttribute('aria-pressed'),
  ).toBe('false')
})

test('real results use filtered order for buttons and keyboard, and overview links clear the filter', async () => {
  const user = userEvent.setup()
  render(<FeedbackResultsPage request={request} navigate={() => {}} />)
  await user.click(screen.getByRole('tab', { name: '슬라이드별 피드백' }))
  expect(selectedSlide().getAttribute('aria-label')).toMatch(/^5번/)
  await user.selectOptions(screen.getByRole('combobox', { name: '슬라이드 필터' }), 'review')
  const viewer = within(screen.getByRole('region', { name: '선택한 슬라이드' }))
  await user.click(viewer.getByRole('button', { name: '다음' }))
  expect(selectedSlide().getAttribute('aria-label')).toMatch(/^9번/)
  expect(viewer.getByRole('button', { name: '다음' }).disabled).toBe(true)
  await user.click(viewer.getByRole('button', { name: '이전' }))
  expect(selectedSlide().getAttribute('aria-label')).toMatch(/^5번/)
  await user.click(selectedSlide())
  await user.keyboard('{ArrowRight}')
  expect(selectedSlide().getAttribute('aria-label')).toMatch(/^9번/)
  expect(document.activeElement).toBe(selectedSlide())

  await user.click(screen.getByRole('tab', { name: '전체 요약' }))
  await user.click(screen.getByRole('button', { name: '2번 슬라이드 소개 보완 보기' }))
  expect(screen.getByRole('combobox', { name: '슬라이드 필터' }).value).toBe('all')
  expect(selectedSlide().getAttribute('aria-label')).toMatch(/^2번/)
  await user.click(screen.getByRole('button', { name: '확인 완료로 표시' }))
  await user.click(screen.getByRole('tab', { name: '전체 요약' }))
  expect(
    screen.getByRole('button', { name: '소개 보완 확인 완료 표시' }).getAttribute('aria-pressed'),
  ).toBe('true')
})

test('reviewing the last unread issues shows the empty state and can return to all slides', async () => {
  const user = userEvent.setup()
  render(<FeedbackResultsPage request={request} navigate={() => {}} />)
  await user.click(screen.getByRole('tab', { name: '슬라이드별 피드백' }))
  await user.selectOptions(screen.getByRole('combobox', { name: '슬라이드 필터' }), 'unread')
  await user.click(screen.getByRole('button', { name: '확인 완료로 표시' }))
  expect(selectedSlide().getAttribute('aria-label')).toMatch(/^2번/)
  await user.click(screen.getByRole('button', { name: '확인 완료로 표시' }))
  expect(selectedSlide().getAttribute('aria-label')).toMatch(/^9번/)
  await user.click(screen.getByRole('button', { name: '확인 완료로 표시' }))
  expect(screen.getByRole('heading', { name: '모든 피드백을 확인했어요.' })).toBeTruthy()
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('3')
  await user.click(screen.getByRole('button', { name: '전체 슬라이드 보기' }))
  expect(screen.getByRole('combobox', { name: '슬라이드 필터' }).value).toBe('all')
  expect(selectedSlide().getAttribute('aria-label')).toContain('확인 완료')
})

test('fact checks are preserved separately from slide issue progress', async () => {
  const user = userEvent.setup()
  render(<ExampleResultsPage navigate={() => {}} />)
  await user.click(screen.getByRole('tab', { name: /정보 확인/ }))
  await user.click(screen.getByRole('checkbox', { name: '원문 보고서 또는 공식 자료 확인' }))
  await user.click(screen.getByRole('button', { name: '해당 슬라이드 보기' }))
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
  await user.click(screen.getByRole('button', { name: '확인 완료로 표시' }))
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1')
  await user.click(screen.getByRole('tab', { name: /정보 확인/ }))
  expect(screen.getByRole('checkbox', { name: '원문 보고서 또는 공식 자료 확인' }).checked).toBe(
    true,
  )
})

test('keyboard tab selection follows the same detail-scroll path as a click', async () => {
  const user = userEvent.setup()
  render(<ExampleResultsPage navigate={() => {}} />)
  await user.click(screen.getByRole('tab', { name: '전체 요약' }))
  vi.clearAllMocks()
  await user.keyboard('{ArrowRight}')
  const slideTab = screen.getByRole('tab', { name: '슬라이드별 피드백' })
  expect(slideTab.getAttribute('aria-selected')).toBe('true')
  expect(document.activeElement).toBe(slideTab)
  expect(window.scrollTo).toHaveBeenCalledOnce()
})
