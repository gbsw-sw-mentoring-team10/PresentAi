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

test('the example form is cleared after visiting another page and coming back', async () => {
  stubServer()
  const user = await renderApp('/materials', { strict: true })
  await user.click(screen.getByRole('button', { name: '예시 자료로 채우기', exact: true }))
  expect(purpose().value).toBe(example.purpose)

  await user.click(screen.getByRole('button', { name: '홈으로' }))
  await waitFor(() => expect(window.location.hash).toBe('#/'))
  await goTo('/materials')
  expect((await screen.findByRole('textbox', { name: /발표 목적/ })).value).toBe('')
  expect(screen.queryByText('2026_서비스_로드맵.pdf')).toBeNull()
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
  expect(screen.getByText('직접 입력한 대본')).toBeTruthy()
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
