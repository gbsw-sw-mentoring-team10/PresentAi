import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../../src/App.jsx'
import { StorageNotice } from '../../src/features/results/ModelResponse.jsx'

const account = { user_id: 7, email: 'synthetic-auth@example.com', role: 'user' }

test('original file storage failure remains visible beside a saved analysis', () => {
  render(
    <StorageNotice
      result={{
        saved_result_id: 42,
        storage_status: 'saved',
        file_storage_status: 'failed',
        file_storage_message: '분석 결과는 저장했지만 원본 파일을 저장하지 못했습니다.',
      }}
    />,
  )
  expect(screen.getByRole('status').textContent).toContain('분석 결과를 내 계정에 저장했어요.')
  expect(screen.getByRole('status').textContent).toContain('원본 파일을 저장하지 못했습니다.')
})

test('login, real analysis storage confirmation and logout work together', async () => {
  let loggedIn = false
  const fetch = vi.fn(async (url, options) => {
    expect(options.credentials).toBe('include')
    if (url.endsWith('/auth/me')) return Response.json({ detail: '로그인 필요' }, { status: 401 })
    if (url.endsWith('/auth/login')) {
      expect(JSON.parse(options.body).email).toBe(account.email)
      loggedIn = true
      return Response.json(account)
    }
    if (url.endsWith('/auth/logout')) {
      loggedIn = false
      return Response.json({ message: '로그아웃' })
    }
    expect(loggedIn).toBe(true)
    return Response.json({
      score: 90,
      feedback: '저장된 합성 평가입니다.',
      strengths: [],
      improvements: [],
      saved_result_id: 42,
    })
  })
  vi.stubGlobal('fetch', fetch)
  window.history.replaceState(null, '', '/#/materials')
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '로그인', exact: true }))
  const modal = await screen.findByRole('dialog', { name: '로그인' })
  await user.type(within(modal).getByLabelText('이메일'), account.email)
  await user.type(within(modal).getByLabelText('비밀번호', { exact: true }), 'synthetic-password')
  await user.click(within(modal).getByRole('button', { name: '로그인', exact: true }))
  expect(await screen.findByRole('button', { name: '로그아웃' })).toBeTruthy()
  await user.type(screen.getByRole('textbox', { name: /발표 목적/ }), '서비스 소개')
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '합성 테스트 대본입니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  expect(await screen.findByText('분석 결과를 내 계정에 저장했어요.')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '로그아웃' }))
  expect(await screen.findByRole('button', { name: '로그인', exact: true })).toBeTruthy()
  expect(loggedIn).toBe(false)
})

test('restores the server session and keeps the account on failed logout', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url.endsWith('/auth/me')
        ? Response.json(account)
        : Response.json({ detail: '잠시 후 다시 시도해 주세요.' }, { status: 503 }),
    ),
  )
  window.history.replaceState(null, '', '/#/')
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '로그아웃' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('잠시 후'))
  expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy()
})
