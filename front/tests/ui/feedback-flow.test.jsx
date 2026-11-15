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

test('a draft survives reading the guide and returning with browser Back', async () => {
  stubServer()
  const user = await renderApp('/materials', { strict: true })
  await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
  expect(purpose().value).toBe(example.purpose)

  await user.click(
    within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', {
      name: '이용 방법',
    }),
  )
  await waitFor(() => expect(window.location.hash).toBe('#/'))
  await act(async () => window.history.back())
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(example.purpose)
  expect(screen.getByText(example.file.name)).toBeTruthy()
  expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe(example.script)
})

test('material and speech drafts stay separate when switching between them', async () => {
  stubServer()
  const user = await renderApp('/materials')
  await user.type(purpose(), '직접 입력한 목적')
  await goTo('/speech')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('')
  await user.type(purpose(), '음성 연습')
  await goTo('/materials')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('직접 입력한 목적')
  await goTo('/speech')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('음성 연습')
})

test('returning from the analysis screen of the same flow keeps the input', async () => {
  stubServer(() => new Promise(() => {}))
  const user = await renderApp('/materials')
  await user.type(purpose(), '교육{Enter}')
  await user.click(screen.getByText('파일 없이 대본으로 입력하기'))
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  // 로그인하지 않았으므로 저장되지 않는다는 안내를 확인하고 진행합니다.
  await user.click(
    within(await screen.findByRole('dialog', { name: '피드백 저장 안내' })).getByRole('button', {
      name: /그대로 진행/,
    }),
  )
  await user.click(await screen.findByRole('button', { name: '입력 화면으로 돌아가기' }))
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('교육')
  expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe('합성 대본입니다.')
})

test.each(['/materials', '/speech'])(
  'returning to a cancelled analysis from %s offers recovery instead of waiting forever',
  async (path) => {
    const analysisFetch = stubServer(() => new Promise(() => {}))
    const user = await renderApp(path)
    await user.type(purpose(), '교육{Enter}')
    if (path === '/speech') {
      await user.upload(
        screen.getByLabelText('음성 파일 선택'),
        new File(['synthetic audio'], 'rehearsal.wav', { type: 'audio/wav' }),
      )
      await user.click(screen.getByRole('button', { name: '음성 분석 시작', exact: true }))
    } else {
      await user.click(screen.getByText('파일 없이 대본으로 입력하기'))
      await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 대본입니다.')
      await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
      await user.click(
        within(await screen.findByRole('dialog', { name: '피드백 저장 안내' })).getByRole(
          'button',
          {
            name: /그대로 진행/,
          },
        ),
      )
    }
    await user.click(await screen.findByRole('button', { name: '입력 화면으로 돌아가기' }))
    expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('교육')
    expect(analysisFetch.mock.calls[0][1].signal.aborted).toBe(true)
    await goTo('/analysis')
    expect((await screen.findByRole('alert')).textContent).toContain('중단')
    expect(analysisFetch).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(analysisFetch).toHaveBeenCalledTimes(2))
    await user.click(screen.getByRole('button', { name: '입력 화면으로 돌아가기' }))
    expect(window.location.hash).toBe(`#${path}`)
  },
)

test('a finished analysis automatically opens its result without adding a history step', async () => {
  const analysisFetch = stubServer()
  const user = await renderApp('/materials')
  await user.type(purpose(), '교육{Enter}')
  await user.click(screen.getByText('파일 없이 대본으로 입력하기'))
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  // 로그인하지 않았으므로 저장되지 않는다는 안내를 확인하고 진행합니다.
  await user.click(
    within(await screen.findByRole('dialog', { name: '피드백 저장 안내' })).getByRole('button', {
      name: /그대로 진행/,
    }),
  )
  expect(await screen.findByText(feedback.feedback)).toBeTruthy()
  expect(window.location.hash).toBe('#/results')

  expect(analysisFetch).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: '피드백 결과 보기' })).toBeNull()
  // 브라우저 뒤로 가기도 완료한 분석을 거치지 않고 기존 입력으로 돌아갑니다.
  await act(async () => window.history.back())
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('교육')
  expect(analysisFetch).toHaveBeenCalledOnce()
})

test('logged-out material analysis warns that the feedback will not be saved', async () => {
  const analysisFetch = stubServer(() => new Promise(() => {}))
  const user = await renderApp('/materials')
  await user.type(purpose(), '교육{Enter}')
  await user.click(screen.getByText('파일 없이 대본으로 입력하기'))
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

test('the guide example button starts the unchanged example without the storage warning', async () => {
  const analysisFetch = stubServer(() => new Promise(() => {}))
  const user = await renderApp('/materials')
  await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
  expect(purpose().value).toBe(example.purpose)
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect(await screen.findByText('예시 자료 · 예시 결과 미리보기')).toBeTruthy()
  expect(analysisFetch).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog', { name: '피드백 저장 안내' })).toBeNull()
})

test('the prepared example result shows the original example slides', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  try {
    stubServer()
    const user = await renderApp('/materials')
    await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
    await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
    await act(() => vi.advanceTimersByTimeAsync(3000))
    await user.click(await screen.findByRole('tab', { name: /슬라이드별 피드백/ }))
    expect(screen.queryByText('슬라이드별 결과가 아직 없어요.')).toBeNull()
    expect(
      (await screen.findAllByAltText(/번 예시 슬라이드: ESG 기반 부동산 투자 및 운영 전략/)).length,
    ).toBeGreaterThan(0)
  } finally {
    vi.useRealTimers()
  }
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
    // 넓은 화면의 안내 버튼과 좁은 화면의 상단 버튼은 같은 예시를 채웁니다.
    await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
    await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
    expect(await screen.findByText('예시 자료 · 예시 결과 미리보기')).toBeTruthy()
    await act(() => vi.advanceTimersByTimeAsync(3000))
    await screen.findByRole('button', { name: '입력 수정하기' })
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
    await screen.findByRole('button', { name: '입력 수정하기' })
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
