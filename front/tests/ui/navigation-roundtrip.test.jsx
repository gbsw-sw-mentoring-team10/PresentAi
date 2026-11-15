import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'
import { example } from '../../src/data/examplePresentation.js'

const flows = [
  { path: '/materials', result: '/results', start: '예시 분석 시작', other: '발표 피드백' },
  { path: '/speech', result: '/speech-results', start: '음성 분석 시작', other: '발표자료 피드백' },
]
const destinations = [
  { button: 'PresentAi 홈', path: '/' },
  { button: '이용 방법', path: '/' },
  { button: '내 피드백', path: '/history' },
  { button: '마이페이지', path: '/mypage' },
  { button: 'other' },
]
const feedback = { score: 80, feedback: '왕복 검증 결과', strengths: [], improvements: [] }
const saved = {
  ...feedback,
  saved_result_id: 6,
  title: '이전 자료 기록',
  created_at: '2026-11-08T00:00:00Z',
  status: 'completed',
}

function stubServer() {
  const fetch = vi.fn(async (url) => {
    if (url.endsWith('/auth/me'))
      return Response.json({ user_id: 7, email: 'roundtrip@example.com' })
    if (url.includes('/feedback?'))
      return Response.json({ items: [saved], total: 1, page: 1, page_size: 100 })
    if (url.endsWith('/feedback/6')) return Response.json(saved)
    if (url.includes('/upload/')) return Response.json(feedback)
    if (url.endsWith('/mock/speech/'))
      return Response.json({
        text: '왕복 검증 음성',
        pronunciation: {
          scores: { accuracy: 80, fluency: 80, completeness: 80, pronunciation: 80 },
        },
      })
    if (url.endsWith('/mock/speech-review/'))
      return Response.json({ summary: '왕복 검증 리뷰', strengths: [], improvements: [] })
    throw new Error(`Unexpected request: ${url}`)
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

async function renderResult(flow) {
  window.history.replaceState(null, '', `/#${flow.path}`)
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '예시 자료로 채우기' }))
  await user.click(screen.getByRole('button', { name: flow.start }))
  await screen.findByRole('button', { name: '입력 수정하기' })
  await waitFor(() => expect(window.location.hash).toBe(`#${flow.result}`))
  return user
}

function headerButton(name) {
  return within(screen.getByRole('banner'))
    .getAllByRole('button', { name, exact: true })
    .find((button) => !button.classList.contains('nav-mobile-only'))
}

test.each(flows.flatMap((flow) => destinations.map((destination) => ({ ...flow, destination }))))(
  '$path result → $destination.button → browser Back → edit keeps the correct input',
  async (flow) => {
    const fetch = stubServer()
    const user = await renderResult(flow)
    const button = flow.destination.button === 'other' ? flow.other : flow.destination.button
    const destination =
      flow.destination.path || (flow.path === '/speech' ? '/materials' : '/speech')
    await user.click(headerButton(button))
    await waitFor(() => expect(window.location.hash).toBe(`#${destination}`))
    await act(async () => window.history.back())
    await user.click(await screen.findByRole('button', { name: '입력 수정하기' }))
    expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(example.purpose)
    expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe(example.script)
    expect(window.location.hash).toBe(`#${flow.path}`)
    expect(
      screen.getByText(flow.path === '/speech' ? '리허설_1차.m4a' : '2026_서비스_로드맵.pdf'),
    ).toBeTruthy()
    expect(
      fetch.mock.calls.filter(([url]) => url.includes('/upload/') || url.endsWith('/mock/speech/')),
    ).toHaveLength(1)
  },
)

test('starting new material twice through results and saved history still edits the original result', async () => {
  stubServer()
  const user = await renderResult(flows[0])
  await user.click(screen.getByRole('button', { name: '다른 자료 점검하기' }))
  await user.type(await screen.findByRole('textbox', { name: /발표 목적/ }), '두 번째 자료')
  await user.click(headerButton('내 피드백'))
  await user.click(await screen.findByRole('link', { name: /이전 자료 기록/ }))
  await user.click(await screen.findByRole('button', { name: '새 자료 점검하기' }))
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('')
  await user.type(screen.getByRole('textbox', { name: /발표 목적/ }), '세 번째 자료')
  for (const path of ['/history/6', '/history', '/materials', '/results']) {
    await act(async () => window.history.back())
    await waitFor(() => expect(window.location.hash).toBe(`#${path}`))
  }
  await user.click(await screen.findByRole('button', { name: '입력 수정하기' }))
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(example.purpose)
  expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe(example.script)
})

test('analysing a new material replaces the old result input before another new draft', async () => {
  stubServer()
  const user = await renderResult(flows[0])
  await user.click(screen.getByRole('button', { name: '다른 자료 점검하기' }))
  await user.type(await screen.findByRole('textbox', { name: /발표 목적/ }), '새 자료 발표{Enter}')
  await user.click(screen.getByText('파일 없이 대본으로 입력하기'))
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '새 자료 전용 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  await user.click(await screen.findByRole('button', { name: '다른 자료 점검하기' }))
  await screen.findByRole('textbox', { name: /발표 목적/ })
  await act(async () => window.history.back())
  await user.click(await screen.findByRole('button', { name: '입력 수정하기' }))
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('새 자료 발표')
  expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe('새 자료 전용 대본입니다.')
  expect(screen.queryByText('2026_서비스_로드맵.pdf')).toBeNull()
})
