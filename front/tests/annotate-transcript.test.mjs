import test from 'node:test'
import assert from 'node:assert/strict'
import { annotateTranscript, levelOf } from '../src/features/speech/annotateTranscript.js'

const stt = {
  text: '안녕하세요 오늘 발표를 시작합니다.',
  chunks: [
    { start: 0, end: 2, text: ' 안녕하세요 오늘' },
    { start: 3, end: 6, text: ' 발표를 시작합니다.' },
  ],
  pauses: [{ start: 2.2, end: 3, duration: 0.8 }],
}
const pronunciation = {
  words: [
    { word: '안녕하세요', start: 0, accuracy: 92, errorType: 'None' },
    { word: '오늘', start: 1, accuracy: 55, errorType: 'Mispronunciation' },
    { word: '발표를', start: 3, accuracy: 30, errorType: 'None' },
    { word: '시작합니다', start: 4, accuracy: null, errorType: 'Omission' },
  ],
}

test('levels split by score and omissions are always the lowest', () => {
  assert.equal(levelOf(90), 'good')
  assert.equal(levelOf(70), 'fair')
  assert.equal(levelOf(50), 'weak')
  assert.equal(levelOf(10), 'poor')
  assert.equal(levelOf(95, 'Omission'), 'poor')
  assert.equal(levelOf(null), null)
})

test('word scores are matched in order and pauses become rows between lines', () => {
  const rows = annotateTranscript(stt, pronunciation)
  assert.deepEqual(
    rows.map((row) => row.type),
    ['line', 'pause', 'line'],
  )
  assert.deepEqual(
    rows[0].items.map((i) => [i.text, i.level]),
    [
      ['안녕하세요', 'good'],
      ['오늘', 'weak'],
    ],
  )
  assert.equal(rows[1].duration, 0.8)
  assert.equal(rows[2].items[0].level, 'poor')
  assert.equal(rows[2].items[1].level, 'poor') // 빠진 단어
})

test('without pronunciation results words stay uncolored but pauses still show', () => {
  const rows = annotateTranscript(stt, null)
  const words = rows.filter((r) => r.type === 'line').flatMap((r) => r.items)
  assert.ok(words.every((i) => i.level === null))
  assert.equal(rows.filter((r) => r.type === 'pause').length, 1)
})

test('a trailing pause is appended after the last line', () => {
  const rows = annotateTranscript({ ...stt, pauses: [{ start: 9, end: 10, duration: 1 }] }, null)
  assert.equal(rows.at(-1).type, 'pause')
})

test('lines recover on their own time window and pair by position when text differs', () => {
  const korean = {
    text: 'baby you 안녕',
    chunks: [
      { start: 0, end: 2, text: ' baby you' },
      { start: 5, end: 8, text: ' 안녕 하세요' },
    ],
    pauses: [],
  }
  const words = [
    { word: '베이비', start: 0, accuracy: 85, errorType: 'None' },
    { word: '유', start: 1, accuracy: 45, errorType: 'None' },
    { word: '안녕', start: 5, accuracy: 90, errorType: 'None' },
    { word: '하세요', start: 6, accuracy: 20, errorType: 'None' },
  ]
  const rows = annotateTranscript(korean, { words })
  assert.deepEqual(
    rows.flatMap((r) => r.items.map((i) => i.level)),
    ['good', 'weak', 'good', 'poor'],
  )
})
