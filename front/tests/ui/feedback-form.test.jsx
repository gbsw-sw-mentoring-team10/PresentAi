import { useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import FeedbackPage from '../../src/pages/FeedbackPage.jsx'

const EMPTY_FORM = { purpose: '', title: '', description: '', script: '', file: null, audio: null }

function FeedbackFormHarness({ onStart }) {
  const [form, setForm] = useState(EMPTY_FORM)
  return (
    <FeedbackPage
      mode="material"
      form={form}
      setForm={setForm}
      navigate={() => {}}
      start={(mode) => onStart({ mode, form })}
    />
  )
}

// File.text is the browser boundary: supply its result (or failure) in jsdom.
function scriptFile(content, readText = async () => content) {
  const file = new File([content], 'script.txt', { type: 'text/plain' })
  Object.defineProperty(file, 'text', { value: readText })
  return file
}

async function openExampleForm() {
  const user = userEvent.setup()
  const onStart = vi.fn()
  render(<FeedbackFormHarness onStart={onStart} />)
  await user.click(screen.getByRole('button', { name: '예시 자료로 채우기', exact: true }))
  return { user, onStart }
}

test('an invalid TXT cannot silently block submission after returning to direct input', async () => {
  const { user, onStart } = await openExampleForm()
  const originalScript = screen.getByRole('textbox', { name: '발표 대본' }).value
  await user.click(screen.getByRole('button', { name: 'TXT 업로드' }))
  await user.upload(screen.getByLabelText('대본 파일 선택'), scriptFile(''))
  expect(screen.getByRole('alert').textContent).toContain('비어 있는 파일')

  await user.click(screen.getByRole('button', { name: '직접 입력' }))
  expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe(originalScript)
  expect(screen.queryByRole('alert')).toBeNull()
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect(onStart).toHaveBeenCalledExactlyOnceWith({
    mode: 'material',
    form: expect.objectContaining({ script: originalScript }),
  })
})

test('an invalid upload blocks file mode, and choosing a valid TXT allows retry', async () => {
  const { user, onStart } = await openExampleForm()
  await user.click(screen.getByRole('button', { name: 'TXT 업로드' }))
  await user.upload(screen.getByLabelText('대본 파일 선택'), scriptFile(''))
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect(onStart).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toContain('비어 있는 파일')

  await user.upload(screen.getByLabelText('대본 파일 선택'), scriptFile('수정한 발표 대본입니다.'))
  expect(screen.queryByRole('alert')).toBeNull()
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect(onStart.mock.calls[0][0].form.script).toBe('수정한 발표 대본입니다.')
})

test('a TXT read failure can be recovered by typing a script', async () => {
  const { user, onStart } = await openExampleForm()
  await user.click(screen.getByRole('button', { name: 'TXT 업로드' }))
  await user.upload(
    screen.getByLabelText('대본 파일 선택'),
    scriptFile('읽기 실패', async () => {
      throw new Error('File unavailable')
    }),
  )
  expect((await screen.findByRole('alert')).textContent).toContain('파일을 읽지 못했어요')
  await user.click(screen.getByRole('button', { name: '직접 입력' }))
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '직접 작성한 대본')
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect(onStart.mock.calls[0][0].form.script).toBe('직접 작성한 대본')
})

test('switching to direct input cancels a pending TXT read and ignores its late result', async () => {
  const { user, onStart } = await openExampleForm()
  let finishReading
  const pendingText = new Promise((resolve) => {
    finishReading = resolve
  })
  await user.click(screen.getByRole('button', { name: 'TXT 업로드' }))
  await user.upload(
    screen.getByLabelText('대본 파일 선택'),
    scriptFile('이전 파일', () => pendingText),
  )
  expect(screen.getByRole('button', { name: '예시 분석 시작' }).disabled).toBe(true)

  await user.click(screen.getByRole('button', { name: '직접 입력' }))
  expect(screen.getByRole('button', { name: '예시 분석 시작' }).disabled).toBe(false)
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '새 대본')
  await act(async () => finishReading('늦게 도착한 이전 파일 내용'))
  expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe('새 대본')
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect(onStart.mock.calls[0][0].form.script).toBe('새 대본')
})

test('required field errors allow a successful retry after entering purpose and script', async () => {
  const user = userEvent.setup()
  const onStart = vi.fn()
  render(<FeedbackFormHarness onStart={onStart} />)
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /발표 목적/ }))
  expect(onStart).not.toHaveBeenCalled()
  await user.type(screen.getByRole('textbox', { name: /발표 목적/ }), '서비스 소개')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  expect(screen.getByRole('alert').textContent).toContain('발표자료를 선택하거나 대본을 입력')
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '서비스를 소개합니다.')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  expect(onStart).toHaveBeenCalledOnce()
  expect(screen.queryByRole('alert')).toBeNull()
})
