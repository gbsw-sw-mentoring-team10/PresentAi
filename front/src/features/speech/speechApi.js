import { API_BASE_URL, FeedbackApiError } from '../feedback/feedbackApi.js'

const REQUEST_TIMEOUT_MS = 180000

async function postAudio(path, fields, file, signal, fallback) {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  body.append('file', file, file.name || 'speech.wav')
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
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

const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

// 음성을 텍스트로 바꾸고 말하기 속도·쉬는 구간을 받아 옵니다.
export async function transcribeSpeech(file, { signal, mock = false } = {}) {
  const data = await postAudio(
    mock ? '/mock/speech/' : '/speech/',
    {},
    file,
    signal,
    '음성을 텍스트로 바꾸지 못했어요. 다시 시도해 주세요.',
  )
  if (typeof data?.text !== 'string')
    throw new FeedbackApiError('음성 분석 결과의 형식을 확인할 수 없어요.')
  return {
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

// 인식된 텍스트를 기준 문장으로 보내 발음을 평가합니다.
export async function assessPronunciation(file, referenceText, { signal, mock = false } = {}) {
  const data = await postAudio(
    mock ? '/mock/pronunciation/' : '/pronunciation/',
    { reference_text: referenceText },
    file,
    signal,
    '발음을 평가하지 못했어요. 다시 시도해 주세요.',
  )
  const scores = data?.scores
  if (!scores || typeof scores !== 'object')
    throw new FeedbackApiError('발음 평가 결과의 형식을 확인할 수 없어요.')
  return {
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
