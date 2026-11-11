import { useState } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import FeedbackPage from '../../src/pages/FeedbackPage.jsx'

const EMPTY_FORM = { purpose: '', title: '', description: '', script: '', file: null, audio: null }

function FeedbackFormHarness({ onStart, mode = 'material' }) {
  const [form, setForm] = useState(EMPTY_FORM)
  return (
    <FeedbackPage
      mode={mode}
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

// 수정한 자료에 예시 파일이 남아 있으면 경고를 거쳐 진행합니다.
async function startWithSampleFile(user) {
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  const dialog = screen.getByRole('dialog', { name: '예시 파일 안내' })
  await user.click(within(dialog).getByRole('button', { name: '그대로 진행' }))
}

async function openExampleForm(mode) {
  const user = userEvent.setup()
  const onStart = vi.fn()
  render(<FeedbackFormHarness onStart={onStart} mode={mode} />)
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
  await startWithSampleFile(user)
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
  await startWithSampleFile(user)
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
  expect(screen.getByRole('button', { name: '분석 시작', exact: true }).disabled).toBe(true)

  await user.click(screen.getByRole('button', { name: '직접 입력' }))
  expect(screen.getByRole('button', { name: '분석 시작', exact: true }).disabled).toBe(false)
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '새 대본')
  await act(async () => finishReading('늦게 도착한 이전 파일 내용'))
  expect(screen.getByRole('textbox', { name: '발표 대본' }).value).toBe('새 대본')
  await startWithSampleFile(user)
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

test('any edit turns the example into user data, and reverting restores the example', async () => {
  const { user } = await openExampleForm()
  expect(screen.getByRole('button', { name: '예시 분석 시작' })).toBeTruthy()
  expect(screen.getByText('예시 자료로 분석 흐름을 체험합니다.')).toBeTruthy()

  const title = screen.getByRole('textbox', { name: /발표 제목/ })
  await user.type(title, '!')
  expect(screen.queryByRole('button', { name: '예시 분석 시작' })).toBeNull()
  expect(screen.getByRole('button', { name: '분석 시작', exact: true })).toBeTruthy()
  expect(screen.getByText('입력한 자료로 분석을 요청합니다.')).toBeTruthy()

  await user.type(title, '{Backspace}')
  expect(screen.getByRole('button', { name: '예시 분석 시작' })).toBeTruthy()
})

test('an unchanged example starts right away without a sample-file warning', async () => {
  const { user, onStart } = await openExampleForm()
  await user.click(screen.getByRole('button', { name: '예시 분석 시작' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(onStart).toHaveBeenCalledOnce()
})

test('edited data with the sample PDF warns first and can go back to choose a file', async () => {
  const { user, onStart } = await openExampleForm()
  await user.type(screen.getByRole('textbox', { name: /발표 목적/ }), ' 수정')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  const dialog = screen.getByRole('dialog', { name: '예시 파일 안내' })
  expect(dialog.textContent).toContain('2026_서비스_로드맵.pdf')
  expect(dialog.textContent).toContain('분석에 포함되지 않아요')
  expect(onStart).not.toHaveBeenCalled()

  await user.click(within(dialog).getByRole('button', { name: /파일 다시 선택/ }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(onStart).not.toHaveBeenCalled()
  expect(screen.queryByText('2026_서비스_로드맵.pdf')).toBeNull()
  expect(screen.getByLabelText('발표자료 파일 선택')).toBeTruthy()
})

test('closing the warning keeps the form and continuing submits it as user data', async () => {
  const { user, onStart } = await openExampleForm()
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), ' 추가 문장')
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  await user.click(screen.getByRole('button', { name: '닫기' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(onStart).not.toHaveBeenCalled()
  expect(screen.getByText('2026_서비스_로드맵.pdf')).toBeTruthy()

  await startWithSampleFile(user)
  expect(onStart).toHaveBeenCalledExactlyOnceWith({
    mode: 'material',
    form: expect.objectContaining({ script: expect.stringContaining('추가 문장') }),
  })
})

test('the sample PDF does not count as a file for edited data without a script', async () => {
  const { user, onStart } = await openExampleForm()
  await user.clear(screen.getByRole('textbox', { name: '발표 대본' }))
  await user.click(screen.getByRole('button', { name: '분석 시작', exact: true }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('alert').textContent).toContain('예시 파일은 실제 파일이 아니라')
  expect(onStart).not.toHaveBeenCalled()

  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '새 대본')
  expect(screen.queryByRole('alert')).toBeNull()
  await startWithSampleFile(user)
  expect(onStart).toHaveBeenCalledOnce()
})

test('speech mode warns about the sample audio before continuing to the preview', async () => {
  const { user, onStart } = await openExampleForm('speech')
  await user.click(screen.getByRole('button', { name: '음성 분석 시작' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(onStart).toHaveBeenCalledOnce()

  await user.type(screen.getByRole('textbox', { name: /발표 제목/ }), ' 2차')
  await user.click(screen.getByRole('button', { name: '음성 분석 시작' }))
  const dialog = screen.getByRole('dialog', { name: '예시 음성 안내' })
  expect(dialog.textContent).toContain('리허설_1차.m4a')
  await user.click(within(dialog).getByRole('button', { name: '그대로 진행' }))
  expect(onStart).toHaveBeenCalledTimes(2)
  expect(onStart.mock.calls[1][0].mode).toBe('speech')
})

test('speech mode asks for real audio or a script when only the sample audio remains', async () => {
  const { user, onStart } = await openExampleForm('speech')
  await user.clear(screen.getByRole('textbox', { name: '발표 대본' }))
  await user.click(screen.getByRole('button', { name: '음성 분석 시작' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('alert').textContent).toContain('예시 음성은 실제 파일이 아니라')
  await user.type(screen.getByRole('textbox', { name: '발표 대본' }), '대본')
  expect(screen.queryByRole('alert')).toBeNull()
  await user.click(screen.getByRole('button', { name: '음성 분석 시작' }))
  expect(screen.getByRole('dialog', { name: '예시 음성 안내' })).toBeTruthy()
  expect(onStart).not.toHaveBeenCalled()
})
