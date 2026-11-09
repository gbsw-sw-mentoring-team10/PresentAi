import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'

test('a server error can be retried from the UI without losing input, then opens the result', async () => {
  // Only the network is replaced. Routing, form, request manager and result UI run together.
  const analysisFetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('Temporary failure', { status: 500 }))
    .mockResolvedValueOnce(
      Response.json({
        score: 82,
        feedback: '재시도에 성공한 피드백입니다.',
        strengths: ['발표 목적이 명확합니다.'],
        improvements: [],
      }),
    )
  const fetch = vi.fn((url, options) =>
    url.endsWith('/auth/me')
      ? Promise.resolve(Response.json({ detail: '로그인 필요' }, { status: 401 }))
      : analysisFetch(url, options),
  )
  vi.stubGlobal('fetch', fetch)
  window.history.replaceState(null, '', '/#/materials')
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '예시 자료로 채우기', exact: true }))
  const originalScript = screen.getByRole('textbox', { name: '발표 대본' }).value
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect((await screen.findByRole('alert')).textContent).toContain('(500)')
  await user.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(await screen.findByText('재시도에 성공한 피드백입니다.')).toBeTruthy()
  expect(window.location.hash).toBe('#/results')
  expect(analysisFetch).toHaveBeenCalledTimes(2)
  expect(analysisFetch.mock.calls[1][0]).toBe(analysisFetch.mock.calls[0][0])
  expect(analysisFetch.mock.calls[1][1].body.get('prompt')).toBe(originalScript)
})

test('unexpected model output opens immediately as raw text even when storage fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url.endsWith('/auth/me')
        ? Response.json({ detail: '로그인 필요' }, { status: 401 })
        : Response.json({
            raw_result: '모델이 생성한 원문 피드백입니다.',
            saved_result_id: null,
            storage_status: 'failed',
            storage_message: 'DB 저장 실패, 결과는 표시합니다.',
          }),
    ),
  )
  window.history.replaceState(null, '', '/#/materials')
  const user = userEvent.setup()
  render(<App />)
  await user.type(await screen.findByRole('textbox', { name: /발표 목적/ }), '교육')
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  expect(await screen.findByText('모델이 생성한 원문 피드백입니다.')).toBeTruthy()
  expect(window.location.hash).toBe('#/results')
  expect(screen.getByRole('status').textContent).toContain('DB 저장 실패')
})
