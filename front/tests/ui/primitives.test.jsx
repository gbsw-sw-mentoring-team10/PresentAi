import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import Button from '../../src/components/ui/Button.jsx'
import Modal from '../../src/components/ui/Modal.jsx'

test('an ordinary button inside a form does not submit; an explicit submit button does', async () => {
  const submit = vi.fn((event) => event.preventDefault())
  const click = vi.fn()
  render(
    <form onSubmit={submit}>
      <Button onClick={click}>다음 항목</Button>
      <Button type="submit">분석 시작</Button>
    </form>,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: '다음 항목' }))
  expect(click).toHaveBeenCalledOnce()
  expect(submit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '분석 시작' }))
  expect(submit).toHaveBeenCalledOnce()
})

test('updating a modal callback keeps it open and focused, and Escape uses the latest callback', () => {
  const firstClose = vi.fn()
  const nextClose = vi.fn()
  const open = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
  const nativeClose = HTMLDialogElement.prototype.close
  const close = vi.spyOn(HTMLDialogElement.prototype, 'close')
  const originalOverflow = document.body.style.overflow
  const content = <input aria-label="작성 중인 내용" defaultValue="그대로 유지" />
  const { rerender, unmount } = render(
    <Modal title="편집" onClose={firstClose}>
      {content}
    </Modal>,
  )
  const input = screen.getByRole('textbox', { name: '작성 중인 내용' })
  input.focus()
  rerender(
    <Modal title="편집" onClose={nextClose}>
      {content}
    </Modal>,
  )
  expect(open).toHaveBeenCalledOnce()
  expect(close).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(input)
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
  expect(firstClose).not.toHaveBeenCalled()
  expect(nextClose).toHaveBeenCalledOnce()
  const dialog = screen.getByRole('dialog')
  let connectedWhenClosing = false
  close.mockImplementation(function () {
    connectedWhenClosing = this.isConnected
    return nativeClose.call(this)
  })
  unmount()
  expect(close).toHaveBeenCalledOnce()
  expect(connectedWhenClosing).toBe(true)
  expect(dialog.isConnected).toBe(false)
  expect(document.body.style.overflow).toBe(originalOverflow)
  open.mockRestore()
  close.mockRestore()
})
