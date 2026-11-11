import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'

const account = {
  user_id: 7,
  email: 'saved-feedback@example.com',
  created_at: '2026-11-01T12:00:00Z',
}
const saved = {
  saved_result_id: 321,
  title: 'DB에 저장된 실제 피드백',
  created_at: '2026-11-11T06:00:00Z',
  score: 73,
}
const detail = {
  ...saved,
  status: 'completed',
  feedback: 'DB의 JSON에서 읽은 총평입니다.',
  strengths: ['저장된 장점'],
  improvements: [{ issue: '저장된 개선점', deduction: 27, solution: '저장된 해결 방법' }],
  revised_script: '저장된 수정 대본',
  slides: [
    {
      slide_number: 1,
      summary: '저장된 슬라이드 요약',
      good_points: ['저장된 슬라이드 장점'],
      issues: [{ problem: '저장된 슬라이드 문제', solution: '저장된 슬라이드 해결책' }],
      script_connection: '',
    },
  ],
}

function server(value = detail) {
  const fetch = vi.fn(async (input) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname.endsWith('/auth/me')) return Response.json(account)
    if (url.pathname.endsWith('/feedback/321')) return Response.json(value)
    if (url.pathname.endsWith('/feedback'))
      return Response.json({ items: [saved], total: 1, page: 1, page_size: 100 })
    return Response.json({ detail: '없는 요청' }, { status: 404 })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

test('logged-in history reads the saved list and JSON detail through the real API paths', async () => {
  const fetch = server()
  window.history.replaceState(null, '', '/#/history')
  const events = userEvent.setup()
  render(<App />)
  const link = await screen.findByRole('link', { name: new RegExp(saved.title) })
  expect(within(link).getByText('73')).toBeTruthy()
  expect(within(link).getByText('2026.11.11')).toBeTruthy()
  await events.click(link)
  expect(await screen.findByRole('heading', { level: 1, name: saved.title })).toBeTruthy()
  expect(screen.getByText(detail.feedback)).toBeTruthy()
  expect(screen.getByText(detail.strengths[0])).toBeTruthy()
  expect(screen.getByText(detail.revised_script)).toBeTruthy()
  await events.click(screen.getByRole('tab', { name: '슬라이드별 피드백' }))
  expect(
    within(screen.getByRole('tabpanel', { name: '슬라이드별 피드백' })).getByText(
      '저장된 슬라이드 문제',
    ),
  ).toBeTruthy()
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/feedback/321'))).toBe(true)
  for (const [url, options] of fetch.mock.calls.filter(([url]) => url.includes('/feedback')))
    expect(options.credentials, url).toBe('include')
})

test('saved S3 originals expose a download button and the actual file name in history', async () => {
  server({
    ...detail,
    saved_file_id: 37,
    file_name: '저장한 발표.pdf',
    file_storage_status: 'saved',
  })
  window.history.replaceState(null, '', '/#/history/321')
  const events = userEvent.setup()
  render(<App />)
  expect(await screen.findByRole('button', { name: '원본 자료 받기' })).toBeTruthy()
  expect(screen.getByText('저장한 발표.pdf')).toBeTruthy()
  await events.click(screen.getByRole('tab', { name: '슬라이드별 피드백' }))
  expect(screen.queryByText(/원본 슬라이드가 저장되지 않아/)).toBeNull()
  expect(screen.getByText(/원본은 위의/)).toBeTruthy()
})

test('my page uses saved feedback counts and average instead of sample records', async () => {
  const fetch = server()
  window.history.replaceState(null, '', '/#/mypage')
  const events = userEvent.setup()
  render(<App />)
  await screen.findByRole('heading', { level: 1, name: account.email })
  await events.click(screen.getByRole('tab', { name: '기록' }))
  await waitFor(() =>
    expect(
      screen.getByRole('meter', { name: '전체 발표 점수' }).getAttribute('aria-valuenow'),
    ).toBe('73'),
  )
  expect(screen.getByText('지금까지 받은 피드백 1개의 평균 점수는 73점이에요.')).toBeTruthy()
  expect(screen.queryByLabelText('점수 미리보기')).toBeNull()
  expect(fetch.mock.calls.some(([url]) => url.includes('/feedback?'))).toBe(true)
})
