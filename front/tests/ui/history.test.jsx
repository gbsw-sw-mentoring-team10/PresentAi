import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import HistoryPage from '../../src/pages/HistoryPage.jsx'
import HistoryDetailPage from '../../src/pages/HistoryDetailPage.jsx'
import { feedbackHistory } from '../../src/data/sampleHistory.js'

const records = feedbackHistory.filter((item) => item.type === 'material')
const summaries = records.map((item) => ({
  saved_result_id: item.id,
  title: item.title,
  score: item.score,
  created_at: `${item.createdAt}T12:00:00Z`,
}))
const listItems = () =>
  within(screen.getByRole('list', { name: '피드백 기록' })).getAllByRole('link')
const listResponse = (items = summaries) =>
  Response.json({ items, total: items.length, page: 1, page_size: 100 })
const savedResponse = (item = records[0]) =>
  Response.json({
    ...item.result,
    saved_result_id: item.id,
    title: item.title,
    created_at: `${item.createdAt}T12:00:00Z`,
    status: 'completed',
  })

function stubServer(response = () => listResponse()) {
  const fetch = vi.fn(response)
  vi.stubGlobal('fetch', fetch)
  return fetch
}

test('list loads server titles, scores and dates without invented file metadata', async () => {
  const fetch = stubServer()
  render(<HistoryPage navigate={() => {}} />)
  expect(screen.getByRole('status').textContent).toContain('불러오고 있어요')
  expect(screen.queryByText('아직 받은 피드백이 없어요.')).toBeNull()
  await screen.findByRole('list', { name: '피드백 기록' })
  expect(listItems()).toHaveLength(records.length)
  const first = listItems()[0]
  expect(within(first).getByRole('heading', { name: records[0].title })).toBeTruthy()
  expect(within(first).getByText(String(records[0].score))).toBeTruthy()
  expect(within(first).getByText(records[0].createdAt.replaceAll('-', '.'))).toBeTruthy()
  expect(screen.queryByText(records[0].fileName)).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('filter handles types with no saved records and restores the full list', async () => {
  stubServer()
  const user = userEvent.setup()
  render(<HistoryPage navigate={() => {}} />)
  await screen.findByRole('list', { name: '피드백 기록' })
  await user.click(screen.getByRole('button', { name: /^발표\s*0$/ }))
  expect(screen.getByText('이 종류의 피드백 기록이 아직 없어요.')).toBeTruthy()
  expect(screen.queryByRole('list')).toBeNull()
  await user.click(screen.getByRole('button', { name: '전체 기록 보기' }))
  expect(listItems()).toHaveLength(records.length)
})

test('an empty response shows the first-feedback action without sample records', async () => {
  stubServer(() => listResponse([]))
  const user = userEvent.setup()
  const navigate = vi.fn()
  render(<HistoryPage navigate={navigate} />)
  await screen.findByRole('heading', { name: '아직 받은 피드백이 없어요.' })
  expect(screen.queryByRole('list')).toBeNull()
  await user.click(screen.getByRole('button', { name: /첫 피드백 받기/ }))
  expect(navigate).toHaveBeenCalledWith('/materials')
})

test('clicking a server entry navigates with its saved_result_id', async () => {
  stubServer()
  const user = userEvent.setup()
  const navigate = vi.fn()
  render(<HistoryPage navigate={navigate} />)
  await user.click(await screen.findByRole('link', { name: new RegExp(records[0].title) }))
  expect(navigate).toHaveBeenCalledWith(`/history/${records[0].id}`)
})

test('saved JSON reuses the initial result view and slide feedback without a PDF', async () => {
  const item = records.find((entry) => entry.result.slides?.length)
  stubServer(() => savedResponse(item))
  const user = userEvent.setup()
  const navigate = vi.fn()
  render(<HistoryDetailPage id={String(item.id)} navigate={navigate} />)
  await screen.findByRole('heading', { level: 1, name: item.title })
  expect(screen.getByText(item.result.feedback.replace(/\s+/g, ' ').trim())).toBeTruthy()
  expect(screen.getByRole('heading', { name: '하나씩 다듬어 보세요.' })).toBeTruthy()
  await user.click(screen.getByRole('tab', { name: '슬라이드별 피드백' }))
  expect(screen.getByText(/원본 슬라이드가 저장되지 않아/)).toBeTruthy()
  expect(screen.getByRole('region', { name: '선택한 슬라이드' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '목록으로' }))
  expect(navigate).toHaveBeenCalledWith('/history')
})

test('unknown or another owner’s id shows the server not-found state', async () => {
  stubServer(() => Response.json({ detail: '저장된 결과를 찾을 수 없습니다.' }, { status: 404 }))
  const user = userEvent.setup()
  const navigate = vi.fn()
  render(<HistoryDetailPage id="999" navigate={navigate} />)
  await screen.findByRole('heading', { name: '피드백 기록을 찾을 수 없어요.' })
  expect(screen.queryByText(records[0].title)).toBeNull()
  await user.click(screen.getByRole('button', { name: /목록으로/ }))
  expect(navigate).toHaveBeenCalledWith('/history')
})

test('server failures stay distinct from an empty history and can be retried', async () => {
  const fetch = stubServer(() => Response.json({ detail: 'DB 조회 실패' }, { status: 503 }))
  const user = userEvent.setup()
  render(<HistoryPage navigate={() => {}} />)
  expect((await screen.findByRole('alert')).textContent).toContain('DB 조회 실패')
  expect(screen.queryByText('아직 받은 피드백이 없어요.')).toBeNull()
  fetch.mockImplementation(() => listResponse())
  await user.click(screen.getByRole('button', { name: '다시 불러오기' }))
  await screen.findByRole('list', { name: '피드백 기록' })
  expect(listItems()).toHaveLength(records.length)
})

test('expired sessions show a login action instead of sample records', async () => {
  stubServer(() => Response.json({ detail: '로그인 필요' }, { status: 401 }))
  const onLogin = vi.fn()
  const user = userEvent.setup()
  render(<HistoryPage navigate={() => {}} onLogin={onLogin} />)
  await screen.findByRole('alert')
  await user.click(screen.getByRole('button', { name: '로그인하기' }))
  expect(onLogin).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('list')).toBeNull()
})

test('switching accounts hides the previous history and ignores its unfinished request', async () => {
  let completeOldRequest
  const fetch = stubServer(
    () =>
      new Promise((resolve) => {
        completeOldRequest = resolve
      }),
  )
  const ownerA = { user_id: 1 }
  const ownerB = { user_id: 2 }
  const view = render(<HistoryPage user={ownerA} navigate={() => {}} />)
  const oldSignal = fetch.mock.calls[0][1].signal
  fetch.mockImplementation(() => listResponse([]))
  view.rerender(<HistoryPage user={ownerB} navigate={() => {}} />)
  expect(oldSignal.aborted).toBe(true)
  await screen.findByText('아직 받은 피드백이 없어요.')
  await act(async () => completeOldRequest(listResponse()))
  expect(screen.queryByText(records[0].title)).toBeNull()
})

test('unfinished jobs show their status and retry can load the completed JSON', async () => {
  const item = records[0]
  const fetch = stubServer(() => Response.json({ saved_result_id: item.id, status: 'processing' }))
  const user = userEvent.setup()
  render(<HistoryDetailPage id={String(item.id)} navigate={() => {}} />)
  await screen.findByText('아직 분석 중인 기록이에요.')
  fetch.mockImplementation(() => savedResponse(item))
  await user.click(screen.getByRole('button', { name: '다시 불러오기' }))
  await waitFor(() => expect(screen.getByRole('heading', { name: item.title })).toBeTruthy())
})
