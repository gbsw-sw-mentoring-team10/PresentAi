import { normalizeSlides } from '../slides/slideFeedback.js'

export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api/presentation').replace(
  /\/$/,
  '',
)

export class FeedbackApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'FeedbackApiError'
    this.status = status
  }
}

export const OVERLOADED_MESSAGE =
  '현재 AI 모델 사용량이 많아 분석하지 못했어요. 잠시 후 다시 시도해 주세요.'

// The backend forwards Gemini's "503 UNAVAILABLE ... high demand" error, sometimes wrapped in a 500.
export function isModelOverloaded(status, body = '') {
  return status >= 500 && /503\s+UNAVAILABLE|\bUNAVAILABLE\b|high demand|모델 사용량/i.test(body)
}

// Older servers returned improvements as "1. [감점 N점] 내용" strings; keep accepting them.
const LEGACY_IMPROVEMENT = /^\s*(?:\d+\.\s*)?\[\s*감점\s*(\d+)\s*점\s*\]\s*([\s\S]*)$/

function normalizeImprovement(item) {
  if (typeof item === 'string') {
    const match = item.match(LEGACY_IMPROVEMENT)
    return match
      ? { issue: match[2], deduction: Number(match[1]), solution: '' }
      : { issue: item.replace(/^\s*\d+\.\s*/, ''), deduction: null, solution: '' }
  }
  if (
    item &&
    typeof item.issue === 'string' &&
    typeof item.solution === 'string' &&
    typeof item.deduction === 'number' &&
    Number.isFinite(item.deduction)
  ) {
    return { issue: item.issue, deduction: item.deduction, solution: item.solution }
  }
  return null
}

export function normalizeFeedback(data) {
  const improvements = Array.isArray(data?.improvements)
    ? data.improvements.map(normalizeImprovement)
    : null
  if (
    !data ||
    typeof data.feedback !== 'string' ||
    !data.feedback.trim() ||
    typeof data.score !== 'number' ||
    !Number.isFinite(data.score) ||
    data.score < 0 ||
    data.score > 100 ||
    !Array.isArray(data.strengths) ||
    !improvements ||
    data.strengths.some((item) => typeof item !== 'string') ||
    improvements.includes(null) ||
    (data.revised_script != null && typeof data.revised_script !== 'string')
  ) {
    throw new FeedbackApiError('분석 서버의 응답 형식을 확인할 수 없어요. 다시 시도해 주세요.')
  }
  const result = {
    score: data.score,
    feedback: data.feedback,
    strengths: data.strengths,
    improvements,
  }
  // Only the script-only feedback returns a revised script.
  if (data.revised_script?.trim()) result.revised_script = data.revised_script
  if (Array.isArray(data.slides)) result.slides = normalizeSlides(data.slides)
  if (Number.isInteger(data.saved_result_id) && data.saved_result_id > 0)
    result.saved_result_id = data.saved_result_id
  Object.assign(result, feedbackFileMetadata(data))
  return result
}

export function feedbackFileMetadata(data) {
  const metadata = {}
  if (Number.isSafeInteger(data?.saved_file_id) && data.saved_file_id > 0)
    metadata.saved_file_id = data.saved_file_id
  for (const key of [
    'file_name',
    'file_content_type',
    'file_storage_status',
    'file_storage_message',
  ])
    if (typeof data?.[key] === 'string') metadata[key] = data[key]
  if (Number.isSafeInteger(data?.file_size) && data.file_size >= 0)
    metadata.file_size = data.file_size
  return metadata
}

export function getPresentationTitle(form) {
  return form.title.trim() || form.file?.name?.replace(/\.[^.]+$/, '') || '제목 없는 발표'
}

function waitForNextPoll(interval, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(signal?.reason || new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, interval)
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
  })
}

async function pollFeedback(resultId, signal, interval) {
  if (!Number.isSafeInteger(resultId) || resultId <= 0)
    throw new FeedbackApiError('분석 서버의 작업 번호를 확인할 수 없어요.')
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    signal?.throwIfAborted()
    let response
    try {
      response = await fetch(`${API_BASE_URL}/feedback/${resultId}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal,
      })
    } catch (error) {
      if (error.name === 'AbortError' || signal?.aborted) throw error
      throw new FeedbackApiError('분석 결과를 조회하지 못했어요. 인터넷 연결을 확인해 주세요.')
    }
    const data = await response.json().catch(() => null)
    if (!response.ok)
      throw new FeedbackApiError(
        typeof data?.detail === 'string' ? data.detail : '분석 결과를 조회하지 못했어요.',
        response.status,
      )
    if (data?.status === 'completed' && data.saved_result_id === resultId) return data
    if (data?.status === 'failed')
      throw new FeedbackApiError(data.error_message || '분석 중 오류가 발생했어요.', 502)
    if (!['pending', 'processing'].includes(data?.status))
      throw new FeedbackApiError('분석 서버의 작업 상태를 확인할 수 없어요.')
    await waitForNextPoll(interval, signal)
  }
  throw new FeedbackApiError('분석 응답이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.', 504)
}

export async function createFeedback(form, { signal, mock = false, pollIntervalMs = 1000 } = {}) {
  const title = getPresentationTitle(form)
  // The published API spells the required query parameter "perpose".
  const query = new URLSearchParams({ title, perpose: form.purpose.trim() })
  const body = new FormData()
  if (form.description.trim()) body.append('detail', form.description.trim())
  if (form.script.trim()) body.append('prompt', form.script.trim())
  if (form.file instanceof Blob) body.append('file', form.file, form.file.name || 'presentation')
  let response
  try {
    response = await fetch(`${API_BASE_URL}${mock ? '/mock/upload/' : '/upload/'}?${query}`, {
      method: 'POST',
      credentials: 'include',
      body,
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) throw error
    throw new FeedbackApiError(
      '분석 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
    )
  }
  let raw = await response.text().catch(() => '')
  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    /* plain-text error body */
  }
  if (!response.ok) {
    if (response.status === 503 && typeof data?.detail === 'string' && data.detail.includes('DB'))
      throw new FeedbackApiError('분석 결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', 503)
    if (isModelOverloaded(response.status, raw)) throw new FeedbackApiError(OVERLOADED_MESSAGE, 503)
    if (response.status >= 500)
      throw new FeedbackApiError(
        `분석 서버에서 오류가 발생했어요. 잠시 후 다시 시도해 주세요. (${response.status})`,
        response.status,
      )
    const detail = Array.isArray(data?.detail)
      ? data.detail
          .map((item) => item.msg)
          .filter(Boolean)
          .join(' · ')
      : data?.detail
    throw new FeedbackApiError(
      typeof detail === 'string'
        ? detail
        : `분석 요청을 처리하지 못했어요. 입력한 자료를 확인해 주세요. (${response.status})`,
      response.status,
    )
  }
  if (!mock && ['pending', 'processing'].includes(data?.status)) {
    data = await pollFeedback(data.result_id ?? data.saved_result_id, signal, pollIntervalMs)
    raw = JSON.stringify(data)
  }
  let result
  try {
    result = normalizeFeedback(data)
  } catch (error) {
    if (!(error instanceof FeedbackApiError)) throw error
    result = { raw_only: true }
  }
  // 화면 형식과 달라도 성공한 모델 응답을 버리지 않는다.
  result.raw_response = data?.raw_result ?? data ?? raw
  if (Number.isInteger(data?.saved_result_id) && data.saved_result_id > 0)
    result.saved_result_id = data.saved_result_id
  if (typeof data?.storage_status === 'string') result.storage_status = data.storage_status
  if (typeof data?.storage_message === 'string') result.storage_message = data.storage_message
  Object.assign(result, feedbackFileMetadata(data))
  return result
}
