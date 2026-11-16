import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'
import { RESULT_REVEAL_DELAY } from '../../src/features/analysis/analysisTiming.js'

vi.unmock('../../src/features/analysis/analysisTiming.js')

const feedback = {
  score: 82,
  feedback: '직접 입력한 자료의 피드백입니다.',
  strengths: ['발표 목적이 명확합니다.'],
  improvements: [],
}

async function finishAnalysis() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url.endsWith('/auth/me')
        ? Response.json({ detail: '로그인 필요' }, { status: 401 })
        : Response.json(feedback),
    ),
  )
  window.history.replaceState(null, '', '/#/materials')
  const user = userEvent.setup()
  render(<App />)
  await user.type(await screen.findByRole('textbox', { name: /발표 목적/ }), '교육{Enter}')
  await user.click(screen.getByText('파일 없이 대본으로 입력하기'))
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  await user.click(
    within(await screen.findByRole('dialog', { name: '피드백 저장 안내' })).getByRole('button', {
      name: /그대로 진행/,
    }),
  )
  expect(
    await screen.findByText('거의 다 됐어요. 피드백을 보기 좋게 정리하고 있어요.'),
  ).toBeTruthy()
  return user
}

test('a finished analysis keeps loading at 100% until the result button appears', async () => {
  const user = await finishAnalysis()
  // 결과를 받은 직후에는 아직 로딩 화면이고 버튼도 없어요.
  expect(screen.getByRole('heading', { name: '더 나은 발표를 위한 준비 중.' })).toBeTruthy()
  expect(screen.getByRole('progressbar').querySelector('i').style.width).toBe('100%')
  expect(screen.queryByRole('button', { name: '피드백 결과 보기' })).toBeNull()

  const resultButton = await screen.findByRole(
    'button',
    { name: '피드백 결과 보기' },
    { timeout: RESULT_REVEAL_DELAY + 1500 },
  )
  // 버튼이 뜨는 순간 완료 화면으로 바뀌지만, 결과 화면으로는 눌러야 넘어가요.
  expect(screen.getByRole('heading', { name: '피드백을 만날 준비가 됐어요.' })).toBeTruthy()
  expect(screen.getByText('분석이 끝났어요! 이제 맞춤 피드백을 확인해 보세요.')).toBeTruthy()
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  expect(window.location.hash).toBe('#/analysis')
  await user.click(resultButton)
  expect(await screen.findByText(feedback.feedback)).toBeTruthy()
  expect(window.location.hash).toBe('#/results')
}, 10000)
