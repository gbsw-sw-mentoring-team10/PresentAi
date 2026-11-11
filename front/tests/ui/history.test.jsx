import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import HistoryPage from '../../src/pages/HistoryPage.jsx'
import HistoryDetailPage from '../../src/pages/HistoryDetailPage.jsx'
import { feedbackHistory } from '../../src/data/sampleHistory.js'
import { normalizeFeedback } from '../../src/features/feedback/feedbackApi.js'

const listItems = () =>
  within(screen.getByRole('list', { name: '피드백 기록' })).getAllByRole('link')

test('sample history matches the shared contract and the API result shape', () => {
  expect(feedbackHistory).toHaveLength(6)
  expect(feedbackHistory.filter((item) => item.type === 'speech').length).toBeGreaterThanOrEqual(2)
  expect(feedbackHistory.filter((item) => item.type === 'material').length).toBeGreaterThanOrEqual(
    3,
  )
  const dates = feedbackHistory.map((item) => item.createdAt)
  expect([...dates].sort().reverse()).toEqual(dates)
  for (const item of feedbackHistory) {
    expect(item.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(() => normalizeFeedback(item.result)).not.toThrow()
    expect(item.result.score).toBe(item.score)
  }
})

test('list shows title, file and one-line summary with type icons', () => {
  render(<HistoryPage navigate={() => {}} />)
  expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
  expect(listItems()).toHaveLength(6)
  const first = listItems()[0]
  const item = feedbackHistory[0]
  expect(within(first).getByRole('heading', { name: item.title })).toBeTruthy()
  expect(within(first).getByText(item.fileName)).toBeTruthy()
  expect(within(first).getByText(item.summary)).toBeTruthy()
  expect(screen.getAllByRole('img', { name: '발표 피드백' }).length).toBeGreaterThanOrEqual(2)
  expect(screen.getAllByRole('img', { name: '발표자료 피드백' }).length).toBeGreaterThanOrEqual(3)
})

test('filter narrows the list by feedback type', async () => {
  const user = userEvent.setup()
  render(<HistoryPage navigate={() => {}} />)
  const speechCount = feedbackHistory.filter((item) => item.type === 'speech').length

  await user.click(screen.getByRole('button', { name: /^발표\s*\d+$/ }))
  expect(listItems()).toHaveLength(speechCount)
  expect(screen.queryAllByRole('img', { name: '발표자료 피드백' })).toHaveLength(0)
  expect(screen.getByRole('button', { name: /^발표\s*\d+$/ }).getAttribute('aria-pressed')).toBe(
    'true',
  )

  await user.click(screen.getByRole('button', { name: /^발표자료/ }))
  expect(listItems()).toHaveLength(6 - speechCount)

  await user.click(screen.getByRole('button', { name: /^전체/ }))
  expect(listItems()).toHaveLength(6)
})

test('empty history shows a friendly empty state', async () => {
  const user = userEvent.setup()
  const navigate = vi.fn()
  render(<HistoryPage navigate={navigate} items={[]} />)
  expect(screen.queryByRole('list')).toBeNull()
  expect(screen.getByRole('heading', { name: '아직 받은 피드백이 없어요.' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /첫 피드백 받기/ }))
  expect(navigate).toHaveBeenCalledWith('/materials')
})

test('clicking an entry navigates to its detail route', async () => {
  const user = userEvent.setup()
  const navigate = vi.fn()
  render(<HistoryPage navigate={navigate} />)
  const target = feedbackHistory[2]
  await user.click(screen.getByRole('link', { name: new RegExp(target.title) }))
  expect(navigate).toHaveBeenCalledWith(`/history/${target.id}`)
})

test('material detail reuses the result view and opens slide feedback without a PDF', async () => {
  const user = userEvent.setup()
  const navigate = vi.fn()
  const item = feedbackHistory.find((entry) => entry.type === 'material' && entry.result.slides)
  render(<HistoryDetailPage id={String(item.id)} navigate={navigate} />)
  expect(screen.getByRole('heading', { level: 1, name: item.title })).toBeTruthy()
  expect(screen.getByText(item.fileName)).toBeTruthy()
  expect(screen.getByRole('heading', { name: '하나씩 다듬어 보세요.' })).toBeTruthy()

  await user.click(screen.getByRole('tab', { name: '슬라이드별 피드백' }))
  expect(screen.getByText(/원본 슬라이드가 저장되지 않아/)).toBeTruthy()
  expect(screen.getByRole('region', { name: '선택한 슬라이드' })).toBeTruthy()

  await user.click(screen.getByRole('button', { name: '목록으로' }))
  expect(navigate).toHaveBeenCalledWith('/history')
})

test('speech detail shows the script comparison', () => {
  const item = feedbackHistory.find((entry) => entry.type === 'speech')
  render(<HistoryDetailPage id={String(item.id)} navigate={() => {}} />)
  expect(screen.getByRole('heading', { name: '대본과 실제 발화, 나란히 보기' })).toBeTruthy()
  expect(screen.queryByRole('tab')).toBeNull()
})

test('unknown id shows a not-found state with a way back', async () => {
  const user = userEvent.setup()
  const navigate = vi.fn()
  render(<HistoryDetailPage id="999" navigate={navigate} />)
  expect(screen.getByRole('heading', { name: '피드백 기록을 찾을 수 없어요.' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /목록으로/ }))
  expect(navigate).toHaveBeenCalledWith('/history')
})
