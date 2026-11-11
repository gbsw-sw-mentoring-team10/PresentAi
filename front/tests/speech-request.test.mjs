import test from 'node:test'
import assert from 'node:assert/strict'
import { createSpeechRequest } from '../src/features/speech/speechRequest.js'
import {
  assessPronunciation,
  reviewSpeech,
  transcribeSpeech,
} from '../src/features/speech/speechApi.js'

const audio = new File(['voice'], 'rehearsal.wav', { type: 'audio/wav' })
const stt = {
  text: '안녕하세요',
  chunks: [],
  duration: 5,
  pauses: [],
  speechRate: 300,
  speechRateScore: 90,
}
const pron = { scores: { pronunciation: 88 }, segments: [], words: [] }

function collect() {
  const states = []
  return { states, onChange: (state) => states.push(state) }
}

const review = { summary: '좋아요', strengths: [], improvements: [] }

test('results appear only after transcription and pronunciation, the review follows', async () => {
  const { states, onChange } = collect()
  const order = []
  const manager = createSpeechRequest(onChange, {
    transcribe: async () => (order.push('stt'), stt),
    assess: async (file, text) => {
      order.push(`assess:${text}`)
      return pron
    },
    review: async (speech, pronunciation) => {
      order.push('review')
      assert.equal(speech, stt)
      assert.equal(pronunciation, pron)
      return review
    },
  })
  await manager.run({ audio, script: '' })
  assert.deepEqual(order, ['stt', 'assess:안녕하세요', 'review'])
  const shown = states.map((s) => `${s.status}/${s.pronunciation.status}/${s.review.status}`)
  assert.deepEqual(shown, [
    'transcribing/idle/idle',
    'assessing/loading/idle',
    'ready/success/idle',
    'ready/success/loading',
    'ready/success/success',
  ])
  assert.equal(states.at(-1).review.data.summary, '좋아요')
})

test('a pronunciation failure still shows the transcript, skips the review and can be retried', async () => {
  const { states, onChange } = collect()
  let attempts = 0
  let reviews = 0
  const manager = createSpeechRequest(onChange, {
    transcribe: async () => stt,
    assess: async () => {
      if (++attempts === 1) throw new Error('Azure 오류')
      return pron
    },
    review: async () => (reviews++, review),
  })
  await manager.run({ audio, script: '' })
  let last = states.at(-1)
  assert.equal(last.status, 'ready')
  assert.equal(last.pronunciation.error, 'Azure 오류')
  assert.equal(reviews, 0)
  await manager.retryPronunciation()
  last = states.at(-1)
  assert.equal(last.pronunciation.status, 'success')
  assert.equal(last.review.status, 'success')
  assert.equal(last.stt.text, '안녕하세요')
})

test('a review failure keeps the results and can be retried', async () => {
  const { states, onChange } = collect()
  let attempts = 0
  const manager = createSpeechRequest(onChange, {
    transcribe: async () => stt,
    assess: async () => pron,
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

test('a transcription failure stops before pronunciation', async () => {
  const { states, onChange } = collect()
  let assessed = false
  const manager = createSpeechRequest(onChange, {
    transcribe: async () => {
      throw new Error('음성 파일을 읽을 수 없습니다.')
    },
    assess: async () => {
      assessed = true
    },
  })
  await manager.run({ audio, script: '' })
  assert.equal(states.at(-1).status, 'error')
  assert.equal(states.at(-1).error, '음성 파일을 읽을 수 없습니다.')
  assert.equal(assessed, false)
})

test('sample audio uses the mock endpoints with a placeholder file', async () => {
  const seen = []
  const manager = createSpeechRequest(() => {}, {
    transcribe: async (file, options) => (seen.push(['stt', options.mock, file.size > 0]), stt),
    assess: async (file, text, options) => (seen.push(['pron', options.mock]), pron),
    review: async (speech, pronunciation, options) => (seen.push(['review', options.mock]), review),
  })
  await manager.run({ audio: { name: '리허설_1차.m4a', sample: true }, script: '' })
  assert.deepEqual(seen, [
    ['stt', true, true],
    ['pron', true],
    ['review', true],
  ])
})

test('cancel aborts the work and ignores late results', async () => {
  const { states, onChange } = collect()
  let release
  const manager = createSpeechRequest(onChange, {
    transcribe: () => new Promise((resolve) => (release = () => resolve(stt))),
    assess: async () => pron,
  })
  const running = manager.run({ audio, script: '' })
  manager.cancel()
  release()
  await running
  assert.equal(states.at(-1).status, 'idle')
})

test('API layer posts multipart audio and normalizes both responses', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, body: options.body })
    if (url.endsWith('/speech/'))
      return Response.json({
        text: ' 안녕하세요 ',
        chunks: [{ timestamp: [0, 2.5], text: ' 안녕하세요 ' }],
        silence: { duration: 5, pauses: [{ start: 1, end: 2, duration: 1 }] },
        speech_rate: 300,
        speech_rate_score: 91,
      })
    return Response.json({
      scores: { accuracy: 90, fluency: 80, completeness: 100, pronunciation: 88 },
      segments: [],
      words: [{ word: '안녕', start: 0, end: 1, accuracy: 40, error_type: 'Mispronunciation' }],
    })
  })
  const speech = await transcribeSpeech(audio)
  assert.equal(speech.text, '안녕하세요')
  assert.equal(speech.chunks[0].end, 2.5)
  assert.equal(speech.pauses.length, 1)
  const result = await assessPronunciation(audio, speech.text)
  assert.equal(result.words[0].errorType, 'Mispronunciation')
  assert.equal(calls[0].url, '/api/presentation/speech/')
  assert.equal(calls[1].url, '/api/presentation/pronunciation/')
  assert.equal(calls[1].body.get('reference_text'), '안녕하세요')
  assert.ok(calls[1].body.get('file'))
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
  const review = await reviewSpeech(speech, pronunciation)
  assert.equal(sent.url, '/api/presentation/speech-review/')
  assert.equal(sent.headers['Content-Type'], 'application/json')
  assert.deepEqual(sent.body, { speech: speech.raw, pronunciation: pronunciation.raw })
  assert.equal(review.summary, '또렷해요.')
  assert.equal(review.improvements.length, 1)
  const mocked = await reviewSpeech(speech, pronunciation, { mock: true })
  assert.equal(mocked.summary, '또렷해요.')
  assert.equal(sent.url, '/api/presentation/mock/speech-review/')
})

test('API errors surface the server message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: '음성 파일을 읽을 수 없습니다.' }, { status: 400 }),
  )
  await assert.rejects(transcribeSpeech(audio), /음성 파일을 읽을 수 없습니다/)
})
