import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'

test('a server error can be retried from the UI without losing input, then opens the result', async () => {
  // Only the network is replaced. Routing, form, request manager and result UI run together.
  const fetch = vi
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
  vi.stubGlobal('fetch', fetch)
  window.history.replaceState(null, '', '/#/materials')
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '예시 자료로 채우기', exact: true }))
  const originalScript = screen.getByRole('textbox', { name: '발표 대본' }).value
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect((await screen.findByRole('alert')).textContent).toContain('(500)')
  await user.click(screen.getByRole('button', { name: '다시 시도' }))
  await user.click(await screen.findByRole('button', { name: '피드백 결과 보기' }))
  expect(await screen.findByText('재시도에 성공한 피드백입니다.')).toBeTruthy()
  expect(window.location.hash).toBe('#/results')
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(fetch.mock.calls[1][0]).toBe(fetch.mock.calls[0][0])
  expect(fetch.mock.calls[1][1].body.get('prompt')).toBe(originalScript)
})
