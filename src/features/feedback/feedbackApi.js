import { normalizeSlides } from '../slides/slideFeedback.js'

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api/presentation').replace(/\/$/, '')

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
  return status === 503 || /503\s+UNAVAILABLE|\bUNAVAILABLE\b|high demand/i.test(body)
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
  return result
}

export function getPresentationTitle(form) {
  return form.title.trim() || form.file?.name?.replace(/\.[^.]+$/, '') || '제목 없는 발표'
}

export async function createFeedback(form, { signal, mock = false } = {}) {
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
  const raw = await response.text().catch(() => '')
  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    /* plain-text error body */
  }
  if (!response.ok) {
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
  return normalizeFeedback(data)
}
