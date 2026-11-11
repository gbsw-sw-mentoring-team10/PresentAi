import test from 'node:test'
import assert from 'node:assert/strict'
import { createSpeechRequest } from '../src/features/speech/speechRequest.js'
import { analyzeSpeech, reviewSpeech } from '../src/features/speech/speechApi.js'

const audio = new File(['voice'], 'rehearsal.wav', { type: 'audio/wav' })
const stt = {
  raw: { text: '안녕하세요' },
  text: '안녕하세요',
  chunks: [],
  duration: 5,
  pauses: [],
  speechRate: 300,
  speechRateScore: 90,
}
const pron = { raw: { scores: { pronunciation: 88 } }, scores: { pronunciation: 88 }, words: [] }
const analysis = { stt, pronunciation: pron }
const review = { summary: '좋아요', strengths: [], improvements: [] }

function collect() {
  const states = []
  return { states, onChange: (state) => states.push(state) }
}

test('one analysis call fills the results, then the AI review loads afterwards', async () => {
  const { states, onChange } = collect()
  const order = []
  const manager = createSpeechRequest(onChange, {
    analyze: async (file) => (order.push(`analyze:${file.name}`), analysis),
    review: async (speech, pronunciation) => {
      order.push('review')
      assert.equal(speech, stt)
      assert.equal(pronunciation, pron)
      return review
    },
  })
  await manager.run({ audio, script: '' })
  assert.deepEqual(order, ['analyze:rehearsal.wav', 'review'])
  assert.deepEqual(
    states.map((s) => `${s.status}/${s.pronunciation.status}/${s.review.status}`),
    [
      'transcribing/idle/idle',
      'ready/success/idle',
      'ready/success/loading',
      'ready/success/success',
    ],
  )
  assert.equal(states.at(-1).stt.text, '안녕하세요')
  assert.equal(states.at(-1).review.data.summary, '좋아요')
})

test('an analysis failure shows an error and never asks for a review', async () => {
  const { states, onChange } = collect()
  let reviewed = false
  const manager = createSpeechRequest(onChange, {
    analyze: async () => {
      throw new Error('음성 파일을 읽을 수 없습니다.')
    },
    review: async () => {
      reviewed = true
    },
  })
  await manager.run({ audio, script: '' })
  assert.equal(states.at(-1).status, 'error')
  assert.equal(states.at(-1).error, '음성 파일을 읽을 수 없습니다.')
  assert.equal(reviewed, false)
})

test('a review failure keeps the results and can be retried', async () => {
  const { states, onChange } = collect()
  let attempts = 0
  const manager = createSpeechRequest(onChange, {
    analyze: async () => analysis,
    review: async () => {
      if (++attempts === 1) throw new Error('모델 사용량이 많습니다.')
      return review
    },
  })
  await manager.run({ audio, script: '' })
  let last = states.at(-1)
  assert.equal(last.status, 'ready')
  assert.equal(last.pronunciation.status, 'success')
  assert.equal(last.review.error, '모델 사용량이 많습니다.')
  await manager.retryReview()
  last = states.at(-1)
  assert.equal(last.review.status, 'success')
})

test('sample audio uses the mock endpoints with a placeholder file', async () => {
  const seen = []
  const manager = createSpeechRequest(() => {}, {
    analyze: async (file, options) => (
      seen.push(['analyze', options.mock, file.size > 0]),
      analysis
    ),
    review: async (speech, pronunciation, options) => (seen.push(['review', options.mock]), review),
  })
  await manager.run({ audio: { name: '리허설_1차.m4a', sample: true }, script: '' })
  assert.deepEqual(seen, [
    ['analyze', true, true],
    ['review', true],
  ])
})

test('cancel aborts the work and ignores late results', async () => {
  const { states, onChange } = collect()
  let release
  const manager = createSpeechRequest(onChange, {
    analyze: () => new Promise((resolve) => (release = () => resolve(analysis))),
    review: async () => review,
  })
  const running = manager.run({ audio, script: '' })
  manager.cancel()
  release()
  await running
  assert.equal(states.at(-1).status, 'idle')
})

const speechResponse = {
  text: ' 안녕하세요 ',
  chunks: [{ timestamp: [0, 2.5], text: ' 안녕하세요 ' }],
  silence: { duration: 5, pauses: [{ start: 1, end: 2, duration: 1 }] },
  speech_rate: 300,
  speech_rate_score: 91,
  pronunciation: {
    mode: 'free',
    scores: { accuracy: 90, fluency: 80, completeness: null, pronunciation: 88 },
    segments: [],
    words: [{ word: '안녕', start: 0, end: 1, accuracy: 40, error_type: 'Mispronunciation' }],
  },
}

test('analysis posts the audio once and normalizes speech and pronunciation', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, body: options.body })
    return Response.json(speechResponse)
  })
  const { stt, pronunciation } = await analyzeSpeech(audio)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/api/presentation/speech/')
  assert.ok(calls[0].body.get('file'))
  assert.equal(calls[0].body.get('reference_text'), null) // 기준 문장은 보내지 않는다
  assert.equal(stt.text, '안녕하세요')
  assert.equal(stt.chunks[0].end, 2.5)
  assert.equal(stt.pauses.length, 1)
  assert.equal(stt.raw.pronunciation, undefined) // 리뷰에 같은 내용을 두 번 보내지 않는다
  assert.equal(pronunciation.scores.completeness, null)
  assert.equal(pronunciation.words[0].errorType, 'Mispronunciation')
})

test('silent audio is reported instead of showing an empty result', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ ...speechResponse, text: '  ', chunks: [] }),
  )
  await assert.rejects(analyzeSpeech(audio), /말소리를 찾지 못했어요/)
})

test('review posts the raw speech and pronunciation JSON and normalizes the answer', async (t) => {
  let sent
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    sent = { url, headers: options.headers, body: JSON.parse(options.body) }
    return Response.json({
      summary: ' 또렷해요. ',
      strengths: ['속도가 좋아요'],
      improvements: [
        { issue: '안녕 발음', solution: '천천히 읽어 보세요' },
        { solution: '이슈 없음' },
      ],
    })
  })
  const speech = { raw: { text: '안녕' } }
  const pronunciation = { raw: { scores: { pronunciation: 80 } } }
  const result = await reviewSpeech(speech, pronunciation)
  assert.equal(sent.url, '/api/presentation/speech-review/')
  assert.equal(sent.headers['Content-Type'], 'application/json')
  assert.deepEqual(sent.body, { speech: speech.raw, pronunciation: pronunciation.raw })
  assert.equal(result.summary, '또렷해요.')
  assert.equal(result.improvements.length, 1)
  await reviewSpeech(speech, pronunciation, { mock: true })
  assert.equal(sent.url, '/api/presentation/mock/speech-review/')
})

test('API errors surface the server message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: '음성 파일을 읽을 수 없습니다.' }, { status: 400 }),
  )
  await assert.rejects(analyzeSpeech(audio), /음성 파일을 읽을 수 없습니다/)
})
