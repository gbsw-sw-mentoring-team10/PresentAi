import { StrictMode } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'
import { example } from '../../src/data/examplePresentation.js'

const feedback = {
  score: 82,
  feedback: '직접 입력한 자료의 피드백입니다.',
  strengths: ['발표 목적이 명확합니다.'],
  improvements: [],
}

// 네트워크만 바꾸고 라우팅·입력·요청 흐름은 실제 앱 그대로 실행합니다.
function stubServer(analysis = async () => Response.json(feedback)) {
  const analysisFetch = vi.fn(analysis)
  vi.stubGlobal(
    'fetch',
    vi.fn((url, options) =>
      url.endsWith('/auth/me')
        ? Promise.resolve(Response.json({ detail: '로그인 필요' }, { status: 401 }))
        : analysisFetch(url, options),
    ),
  )
  return analysisFetch
}

async function goTo(path) {
  await act(async () => {
    window.location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

async function renderApp(path = '/materials', { strict = false } = {}) {
  window.history.replaceState(null, '', `/#${path}`)
  const user = userEvent.setup()
  render(
    strict ? (
      <StrictMode>
        <App />
      </StrictMode>
    ) : (
      <App />
    ),
  )
  await screen.findByRole('button', { name: /예시 자료로 시작하기/ })
  return user
}

const purpose = () => screen.getByRole('textbox', { name: /발표 목적/ })

test('the example form is cleared after visiting another page and coming back', async () => {
  stubServer()
  const user = await renderApp('/materials', { strict: true })
  await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
  expect(purpose().value).toBe(example.purpose)

  await user.click(screen.getByRole('button', { name: '홈으로' }))
  await waitFor(() => expect(window.location.hash).toBe('#/'))
  await goTo('/materials')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('')
  expect(screen.queryByText('그린_호라이즌_투자제안서.pdf')).toBeNull()
  expect(screen.getByRole('button', { name: '분석 시작', exact: true })).toBeTruthy()
})

test('typed input is cleared when switching between material and speech pages', async () => {
  stubServer()
  const user = await renderApp('/materials')
  await user.type(purpose(), '직접 입력한 목적')
  await goTo('/speech')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('')
  await user.type(purpose(), '음성 연습')
  await goTo('/materials')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('')
})

test('returning from the analysis screen of the same flow keeps the input', async () => {
  stubServer(() => new Promise(() => {}))
  const user = await renderApp('/materials')
  await user.type(purpose(), '교육')
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  await user.click(
    within(await screen.findByRole('dialog', { name: '피드백 저장 안내' })).getByRole('button', {
      name: /그대로 진행/,
    }),
  )
  await user.click(await screen.findByRole('button', { name: '입력 화면으로 돌아가기' }))
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('교육')
  expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe('합성 대본입니다.')
})

test('a finished analysis waits on the analysis page until the result button is pressed', async () => {
  const analysisFetch = stubServer()
  const user = await renderApp('/materials')
  await user.type(purpose(), '교육')
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  await user.click(
    within(await screen.findByRole('dialog', { name: '피드백 저장 안내' })).getByRole('button', {
      name: /그대로 진행/,
    }),
  )
  const resultButton = await screen.findByRole('button', { name: '피드백 결과 보기' })
  expect(window.location.hash).toBe('#/analysis')
  expect(screen.getByText('피드백을 만날 준비가 됐어요.')).toBeTruthy()
  expect(analysisFetch).toHaveBeenCalledOnce()

  await user.click(resultButton)
  expect(await screen.findByText(feedback.feedback)).toBeTruthy()
  expect(window.location.hash).toBe('#/results')

  // 결과 화면을 거쳐 돌아오면 입력은 비워집니다.
  await goTo('/materials')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('')
})

test('logged-out material analysis warns that the feedback will not be saved', async () => {
  const analysisFetch = stubServer(() => new Promise(() => {}))
  const user = await renderApp('/materials')
  await user.type(purpose(), '교육')
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  const dialog = await screen.findByRole('dialog', { name: '피드백 저장 안내' })
  expect(within(dialog).getByText('이 피드백은 저장되지 않아요.')).toBeTruthy()
  expect(analysisFetch).not.toHaveBeenCalled()

  // 로그인하기를 누르면 분석하지 않고 로그인 창을 열어요. 입력은 그대로 남아요.
  await user.click(within(dialog).getByRole('button', { name: '로그인하기' }))
  expect(await screen.findByRole('dialog', { name: '로그인' })).toBeTruthy()
  expect(screen.queryByRole('dialog', { name: '피드백 저장 안내' })).toBeNull()
  expect(analysisFetch).not.toHaveBeenCalled()
  expect(window.location.hash).toBe('#/materials')
  expect(purpose().value).toBe('교육')
})

test('the unchanged example starts without the storage warning', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  try {
    stubServer(() => new Promise(() => {}))
    const user = await renderApp('/materials')
    await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
    await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
    expect(await screen.findByText('예시 자료 · 예시 결과 미리보기')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: '피드백 저장 안내' })).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('edited example data skips the sample PDF and uses the real endpoint after confirming', async () => {
  const analysisFetch = stubServer(() => new Promise(() => {}))
  const user = await renderApp('/materials')
  await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
  await user.type(purpose(), ' (수정)')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  const dialog = screen.getByRole('dialog', { name: '예시 파일 안내' })
  await user.click(within(dialog).getByRole('button', { name: '그대로 진행' }))

  await waitFor(() => expect(analysisFetch).toHaveBeenCalledOnce())
  const [url, options] = analysisFetch.mock.calls[0]
  expect(url).toContain('/upload/')
  expect(url).not.toContain('/mock/')
  expect(options.body.has('file')).toBe(false)
  expect(options.body.get('prompt')).toBe(example.script)
  // 예시 파일 안내와 겹치지 않도록 저장 안내는 띄우지 않아요.
  expect(screen.queryByRole('dialog', { name: '피드백 저장 안내' })).toBeNull()
  expect(await screen.findByText('직접 입력한 대본')).toBeTruthy()
  expect(screen.getByText('발표자료 · 서버 분석')).toBeTruthy()

  // 같은 흐름으로 돌아오면 예시 파일 없이 수정한 입력이 남아 있습니다.
  await user.click(screen.getByRole('button', { name: '입력 화면으로 돌아가기' }))
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(
    `${example.purpose} (수정)`,
  )
  expect(screen.queryByText('그린_호라이즌_투자제안서.pdf')).toBeNull()
})

test('an unchanged example shows the prepared Green Horizon result without calling the server', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  try {
    const analysisFetch = stubServer(() => new Promise(() => {}))
    const user = await renderApp('/materials')
    // 상단의 중복 버튼은 없애고, 안내 영역의 버튼 하나만 둡니다.
    expect(screen.queryByRole('button', { name: '예시 자료로 채우기', exact: true })).toBeNull()
    await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
    await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
    expect(await screen.findByText('예시 자료 · 예시 결과 미리보기')).toBeTruthy()
    await act(() => vi.advanceTimersByTimeAsync(3000))
    await user.click(await screen.findByRole('button', { name: '피드백 결과 보기' }))
    expect(analysisFetch).not.toHaveBeenCalled()

    expect(await screen.findByText(`‘${example.title}’`)).toBeTruthy()
    expect(screen.queryByText('모델 응답 원문 보기')).toBeNull()
    await user.click(screen.getByRole('tab', { name: '슬라이드별 피드백' }))
    const viewer = within(screen.getByRole('region', { name: '선택한 슬라이드' }))
    // 가장 급한 피드백이 있는 4번 슬라이드가 원본 이미지와 번호 표시로 열립니다.
    expect(
      viewer.getByRole('img', { name: '4번 예시 슬라이드: ESG 기반 부동산 투자 및 운영 전략' }),
    ).toBeTruthy()
    expect(
      viewer.getByRole('button', { name: '피드백 1: 성장률 11.3%의 출처가 빠져 있어요' }),
    ).toBeTruthy()
    expect(
      viewer.getByRole('button', { name: '피드백 2: 목표 시점이 발표일과 같은 달이에요' }),
    ).toBeTruthy()
  } finally {
    vi.useRealTimers()
  }
})

test('the example rehearsal shows the prepared speech result and AI review', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  try {
    const analysisFetch = stubServer(() => new Promise(() => {}))
    window.history.replaceState(null, '', '/#/speech')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /예시 자료로 시작하기/ }))
    expect(screen.getByText('투자제안_리허설_1차.m4a')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '음성 분석 시작' }))
    expect(await screen.findByText('예시 음성 · 예시 결과 미리보기')).toBeTruthy()
    await act(() => vi.advanceTimersByTimeAsync(2500))
    await user.click(await screen.findByRole('button', { name: '피드백 결과 보기' }))
    expect(await screen.findByText('분당 346자')).toBeTruthy()
    await act(() => vi.advanceTimersByTimeAsync(2500))
    expect(
      await screen.findByText(/목차를 소개할 때 ‘예상 성과와 기대 수익’을 빠뜨렸고/),
    ).toBeTruthy()
    expect(analysisFetch).not.toHaveBeenCalled()
  } finally {
    vi.useRealTimers()
  }
})
