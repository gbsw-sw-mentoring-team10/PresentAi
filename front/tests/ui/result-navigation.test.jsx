import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { example } from '../../src/data/examplePresentation.js'
import App from '../../src/App.jsx'

test.each([
  ['/materials', '예시 분석 시작', '/results', '입력 수정하기'],
  ['/materials', '예시 분석 시작', '/results', '다른 자료 점검하기'],
  ['/speech', '음성 분석 시작', '/speech-results', '입력 수정하기'],
  ['/speech', '음성 분석 시작', '/speech-results', '다시 녹음하기'],
])('%s: %s → %s → %s', async (input, start, result, back) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (url.endsWith('/auth/me')) return Response.json({ detail: '로그인 필요' }, { status: 401 })
      if (url.includes('/mock/upload/'))
        return Response.json({ score: 80, feedback: '검증 결과', strengths: [], improvements: [] })
      if (url.endsWith('/mock/speech/'))
        return Response.json({
          text: '검증 발화입니다.',
          pronunciation: {
            scores: { accuracy: 80, fluency: 80, completeness: 80, pronunciation: 80 },
          },
        })
      if (url.endsWith('/mock/speech-review/'))
        return Response.json({ summary: '검증 리뷰입니다.', strengths: [], improvements: [] })
      throw new Error(`Unexpected test request: ${url}`)
    }),
  )
  window.history.replaceState(null, '', `/#${input}`)
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '예시 자료로 채우기', exact: true }))
  if (input === '/speech') {
    await user.click(screen.getByText('제목·설명·분석 설정 (선택)'))
    await user.click(screen.getByRole('radio', { name: /빠른 분석/ }))
  }
  await user.click(screen.getByRole('button', { name: start, exact: true }))
  await waitFor(() => expect(window.location.hash).toBe(`#${result}`))
  await user.click(await screen.findByRole('button', { name: back, exact: true }))
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(
    back === '다른 자료 점검하기' ? '' : example.purpose,
  )
  expect(window.location.hash).toBe(`#${input}`)
  if (back === '다른 자료 점검하기') {
    await user.type(screen.getByRole('textbox', { name: /발표 목적/ }), '새 자료 작성 중')
    await act(async () => window.history.back())
    await user.click(await screen.findByRole('button', { name: '입력 수정하기' }))
    expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(example.purpose)
    expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe(example.script)

    // 같은 자료를 고치는 도중에는 제출 당시 값으로 덮어쓰지 않습니다.
    await user.type(screen.getByRole('textbox', { name: /발표 목적/ }), ' 수정 중')
    await act(async () => window.history.back())
    await user.click(await screen.findByRole('button', { name: '입력 수정하기' }))
    expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(
      `${example.purpose} 수정 중`,
    )
  }
  if (back === '다시 녹음하기') {
    expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe(example.script)
    expect(screen.queryByText('리허설_1차.m4a')).toBeNull()
    expect(screen.getByLabelText('음성 파일 선택')).toBeTruthy()
    await user.click(screen.getByText('제목·설명·분석 설정 (선택)'))
    expect(screen.getByRole('radio', { name: /빠른 분석/ }).checked).toBe(true)
  }
})

test('speech result survives editing, browser Back and leaving for another feedback type', async () => {
  const fetch = vi.fn(async (url) => {
    if (url.endsWith('/auth/me'))
      return Response.json({ user_id: 7, email: 'route-check@example.com' })
    if (url.endsWith('/auth/logout')) return Response.json({ message: '로그아웃' })
    if (url.includes('/mock/upload/'))
      return Response.json({
        score: 80,
        feedback: '자료 결과 유지',
        strengths: [],
        improvements: [],
      })
    if (url.endsWith('/mock/speech/'))
      return Response.json({
        text: '음성 결과 유지',
        pronunciation: {
          scores: { accuracy: 80, fluency: 80, completeness: 80, pronunciation: 80 },
        },
      })
    if (url.endsWith('/mock/speech-review/'))
      return Response.json({ summary: '완료한 음성 리뷰', strengths: [], improvements: [] })
    throw new Error(`Unexpected request: ${url}`)
  })
  vi.stubGlobal('fetch', fetch)
  window.history.replaceState(null, '', '/#/speech')
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '예시 자료로 채우기' }))
  await user.click(screen.getByRole('button', { name: '음성 분석 시작' }))
  await screen.findByText('완료한 음성 리뷰')
  await user.click(screen.getByRole('button', { name: '입력 수정하기' }))
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(example.purpose)
  await act(async () => window.history.back())
  expect(await screen.findByText('완료한 음성 리뷰')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '발표자료 피드백' }))
  await user.click(await screen.findByRole('button', { name: '예시 자료로 채우기' }))
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect(await screen.findByText('자료 결과 유지')).toBeTruthy()
  await act(async () => {
    window.location.hash = '/speech-results'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(await screen.findByText('완료한 음성 리뷰')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '다시 녹음하기' }))
  await screen.findByRole('textbox', { name: /발표 목적/ })
  expect(screen.queryByText('리허설_1차.m4a')).toBeNull()
  await user.click(screen.getByRole('button', { name: '예시 자료로 채우기' }))
  await user.click(screen.getByRole('button', { name: '음성 분석 시작' }))
  await screen.findByText('완료한 음성 리뷰')
  await act(async () => {
    window.location.hash = '/results'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(await screen.findByText('자료 결과 유지')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '로그아웃' }))
  await waitFor(() => expect(window.location.hash).toBe('#/'))
  await act(async () => {
    window.location.hash = '/speech-results'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(await screen.findByText('아직 분석 결과가 없어요.')).toBeTruthy()
  expect(fetch.mock.calls.filter(([url]) => url.endsWith('/mock/speech/'))).toHaveLength(2)
})
