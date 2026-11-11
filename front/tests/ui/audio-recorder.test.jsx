import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import AudioUpload from '../../src/features/feedback/AudioUpload.jsx'

class FakeRecorder {
  static isTypeSupported = (type) => type === 'audio/webm;codecs=opus'
  constructor() {
    this.state = 'inactive'
    this.mimeType = 'audio/webm;codecs=opus'
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) })
    this.onstop?.()
  }
}

function Harness() {
  const [file, setFile] = useState(null)
  return <AudioUpload stepNumber="03" file={file} error="" onFile={setFile} onError={() => {}} />
}

function stubMicrophone(getUserMedia) {
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
}

afterEach(() => vi.unstubAllGlobals())

test('recording from the microphone fills the audio input with a file', async () => {
  const stop = vi.fn()
  stubMicrophone(vi.fn(async () => ({ getTracks: () => [{ stop }] })))
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: /지금 바로 녹음하기/ }))
  expect(await screen.findByRole('timer')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /녹음 끝내기/ }))
  expect(await screen.findByText(/^녹음_\d{8}_\d{4}\.webm$/)).toBeTruthy()
  expect(stop).toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: /지금 바로 녹음하기/ })).toBeNull()
})

test('a denied microphone shows a permission message', async () => {
  stubMicrophone(
    vi.fn(async () => {
      throw Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    }),
  )
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: /지금 바로 녹음하기/ }))
  expect((await screen.findByRole('alert')).textContent).toContain(
    '마이크 사용이 허용되지 않았어요',
  )
})
