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
  await screen.findByRole('button', { name: '예시 자료로 채우기', exact: true })
  return user
}

const purpose = () => screen.getByRole('textbox', { name: /발표 목적/ })

test('a draft survives reading the guide and returning with browser Back', async () => {
  stubServer()
  const user = await renderApp('/materials', { strict: true })
  await user.click(screen.getByRole('button', { name: '예시 자료로 채우기', exact: true }))
  expect(purpose().value).toBe(example.purpose)

  await user.click(
    within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', {
      name: '이용 방법',
    }),
  )
  await waitFor(() => expect(window.location.hash).toBe('#/'))
  await act(async () => window.history.back())
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(example.purpose)
  expect(screen.getByText('2026_서비스_로드맵.pdf')).toBeTruthy()
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
    await user.click(screen.getByRole('button', { name: '예시 자료로 채우기', exact: true }))
    await user.click(
      screen.getByRole('button', {
        name: path === '/speech' ? '음성 분석 시작' : '예시 분석 시작',
        exact: true,
      }),
    )
    await user.click(await screen.findByRole('button', { name: '입력 화면으로 돌아가기' }))
    expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe(example.purpose)
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

test('a finished analysis opens its result from the result button without adding a history step', async () => {
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
  await user.click(await screen.findByRole('button', { name: '피드백 결과 보기' }))
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
  await waitFor(() => expect(analysisFetch).toHaveBeenCalledOnce())
  expect(screen.queryByRole('dialog', { name: '피드백 저장 안내' })).toBeNull()
})

test('the example result shows the example slides when the server sample has none', async () => {
  stubServer()
  const user = await renderApp('/materials')
  await user.click(screen.getByRole('button', { name: /예시 자료로 시작하기/ }))
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  await user.click(await screen.findByRole('button', { name: '피드백 결과 보기' }))
  await user.click(await screen.findByRole('tab', { name: /슬라이드별 피드백/ }))
  expect(screen.queryByText('슬라이드별 결과가 아직 없어요.')).toBeNull()
  expect(
    (await screen.findAllByLabelText(/번 예시 슬라이드: 우리의 다음 챕터/)).length,
  ).toBeGreaterThan(0)
})

test('edited example data skips the sample PDF and uses the real endpoint after confirming', async () => {
  const analysisFetch = stubServer(() => new Promise(() => {}))
  const user = await renderApp('/materials')
  await user.click(screen.getByRole('button', { name: '예시 자료로 채우기', exact: true }))
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
  expect(screen.queryByText('2026_서비스_로드맵.pdf')).toBeNull()
})

test('an unchanged example still uses the sample endpoint', async () => {
  const analysisFetch = stubServer(() => new Promise(() => {}))
  const user = await renderApp('/materials')
  await user.click(screen.getByRole('button', { name: '예시 자료로 채우기', exact: true }))
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  await waitFor(() => expect(analysisFetch).toHaveBeenCalledOnce())
  expect(analysisFetch.mock.calls[0][0]).toContain('/mock/upload/')
  expect(screen.getByText('예시 자료 · 서버 샘플 분석')).toBeTruthy()
})
