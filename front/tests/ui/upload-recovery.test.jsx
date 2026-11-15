import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import FileUpload from '../../src/features/feedback/FileUpload.jsx'

function Harness({ initial, onChange }) {
  const [file, setFile] = useState(initial)
  const [error, setError] = useState('')
  return (
    <FileUpload
      file={file}
      error={error}
      setError={setError}
      onFile={(next) => {
        setFile(next)
        onChange(next)
      }}
    />
  )
}

test('removing an attachment can be undone with the same file bytes', async () => {
  const user = userEvent.setup()
  const original = new File(['original slides'], '발표자료.pptx')
  const onChange = vi.fn()
  render(<Harness initial={original} onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: '첨부 파일 빼기' }))
  expect(onChange).toHaveBeenLastCalledWith(null)
  expect(screen.getByRole('status').textContent).toContain('첨부를 해제')
  await user.click(screen.getByRole('button', { name: '실행 취소' }))
  expect(onChange).toHaveBeenLastCalledWith(original)
  expect(screen.getByText('발표자료.pptx')).toBeTruthy()
  expect(screen.queryByRole('button', { name: '실행 취소' })).toBeNull()
})

test('invalid replacement shows its error immediately and the removed file remains recoverable', async () => {
  const user = userEvent.setup({ applyAccept: false })
  const original = new File(['original slides'], '발표자료.pptx')
  const onChange = vi.fn()
  render(<Harness initial={original} onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: '첨부 파일 빼기' }))
  await user.upload(
    screen.getByLabelText('발표자료 파일 선택'),
    new File(['wrong type'], 'image.png'),
  )
  expect(screen.getByRole('alert').textContent).toContain('파일을 선택해 주세요')
  await user.click(screen.getByRole('button', { name: '실행 취소' }))
  expect(onChange).toHaveBeenLastCalledWith(original)
  expect(screen.queryByRole('alert')).toBeNull()
})
