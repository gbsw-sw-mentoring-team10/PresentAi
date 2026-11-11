import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { TranscriptPanel } from '../../src/features/speech/SpeechResult.jsx'

const stt = {
  text: '안녕하세요 오늘',
  chunks: [{ start: 0, end: 2, text: ' 안녕하세요 오늘' }],
  pauses: [],
}
const pronunciation = {
  status: 'success',
  error: '',
  data: {
    words: [
      { word: '안녕하세요', start: 0, accuracy: 92, errorType: 'None' },
      { word: '오늘', start: 1, accuracy: 55, errorType: 'Mispronunciation' },
    ],
  },
}

test('scored words are colored and show their score on hover', () => {
  render(<TranscriptPanel stt={stt} pronunciation={pronunciation} />)
  expect(document.querySelector('[data-tip="발음 92점"]').className).toContain('lv-good')
  expect(document.querySelector('[data-tip="발음 55점 · 발음 확인"]').className).toContain(
    'lv-weak',
  )
})

test('words stay plain while pronunciation is still loading', () => {
  render(<TranscriptPanel stt={stt} pronunciation={{ status: 'loading', data: null, error: '' }} />)
  expect(document.querySelector('[data-tip]')).toBeNull()
  expect(screen.getByText(/끝나면 단어마다 색으로 표시/)).toBeTruthy()
})
