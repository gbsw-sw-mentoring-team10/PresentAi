import { API_BASE_URL, FeedbackApiError } from '../feedback/feedbackApi.js'

const REQUEST_TIMEOUT_MS = 180000

async function send(path, body, signal, fallback, headers = {}) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json', ...headers },
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new FeedbackApiError(
      timeout.aborted
        ? '응답이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.'
        : '음성 분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
    )
  }
  const data = await response.json().catch(() => null)
  if (!response.ok)
    throw new FeedbackApiError(
      typeof data?.detail === 'string' ? data.detail : fallback,
      response.status,
    )
  return data
}

function postAudio(path, fields, file, signal, fallback) {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  body.append('file', file, file.name || 'speech.wav')
  return send(path, body, signal, fallback)
}

const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function normalizeSpeech(data) {
  return {
    raw: data,
    text: data.text.trim(),
    chunks: (Array.isArray(data.chunks) ? data.chunks : [])
      .filter((chunk) => typeof chunk?.text === 'string' && Array.isArray(chunk.timestamp))
      .map((chunk) => ({
        start: number(chunk.timestamp[0]),
        end: number(chunk.timestamp[1]),
        text: chunk.text.trim(),
      })),
    duration: number(data.silence?.duration),
    pauses: (Array.isArray(data.silence?.pauses) ? data.silence.pauses : []).filter(
      (pause) => number(pause?.start) !== null && number(pause?.duration) !== null,
    ),
    speechRate: number(data.speech_rate),
    speechRateScore: number(data.speech_rate_score),
  }
}

function normalizePronunciation(data) {
  const scores = data?.scores
  if (!scores || typeof scores !== 'object')
    throw new FeedbackApiError('발음 평가 결과의 형식을 확인할 수 없어요.')
  return {
    raw: data,
    scores: {
      accuracy: number(scores.accuracy),
      fluency: number(scores.fluency),
      completeness: number(scores.completeness),
      pronunciation: number(scores.pronunciation),
    },
    segments: Array.isArray(data.segments) ? data.segments : [],
    words: (Array.isArray(data.words) ? data.words : [])
      .filter((word) => typeof word?.word === 'string')
      .map((word) => ({
        word: word.word,
        start: number(word.start),
        accuracy: number(word.accuracy),
        errorType: typeof word.error_type === 'string' ? word.error_type : 'None',
      })),
  }
}

// 서버가 음성을 텍스트로 인식하고 발음까지 평가해 한 번에 돌려줍니다.
export async function analyzeSpeech(file, { signal, mock = false } = {}) {
  const data = await postAudio(
    mock ? '/mock/speech/' : '/speech/',
    {},
    file,
    signal,
    '음성을 분석하지 못했어요. 다시 시도해 주세요.',
  )
  if (typeof data?.text !== 'string')
    throw new FeedbackApiError('음성 분석 결과의 형식을 확인할 수 없어요.')
  if (!data.text.trim())
    throw new FeedbackApiError('음성에서 말소리를 찾지 못했어요. 음성을 다시 확인해 주세요.')
  const { pronunciation, ...speech } = data
  return { stt: normalizeSpeech(speech), pronunciation: normalizePronunciation(pronunciation) }
}

// 음성·발음 분석 결과 JSON을 AI가 읽고 코칭 리뷰를 만듭니다.
export async function reviewSpeech(speech, pronunciation, { signal, mock = false } = {}) {
  const data = await send(
    mock ? '/mock/speech-review/' : '/speech-review/',
    JSON.stringify({ speech: speech.raw, pronunciation: pronunciation.raw }),
    signal,
    'AI 리뷰를 만들지 못했어요. 다시 시도해 주세요.',
    { 'Content-Type': 'application/json' },
  )
  const text = (value) => (typeof value === 'string' ? value.trim() : '')
  const list = (value) => (Array.isArray(value) ? value : [])
  const review = {
    summary: text(data?.summary),
    strengths: list(data?.strengths).map(text).filter(Boolean),
    improvements: list(data?.improvements)
      .map((item) => ({ issue: text(item?.issue), solution: text(item?.solution) }))
      .filter((item) => item.issue),
  }
  if (!review.summary) throw new FeedbackApiError('AI 리뷰의 형식을 확인할 수 없어요.')
  return review
}
