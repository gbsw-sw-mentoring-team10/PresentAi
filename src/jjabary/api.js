const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api/presentation').replace(/\/$/, '')

export class FeedbackApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'FeedbackApiError'
    this.status = status
  }
}

export function normalizeFeedback(data) {
  if (!data || typeof data.feedback !== 'string' || !data.feedback.trim()
    || typeof data.score !== 'number' || !Number.isFinite(data.score) || data.score < 0 || data.score > 100
    || !Array.isArray(data.strengths) || !Array.isArray(data.improvements)
    || [...data.strengths, ...data.improvements].some(item => typeof item !== 'string')) {
    throw new FeedbackApiError('분석 서버의 응답 형식을 확인할 수 없어요. 다시 시도해 주세요.')
  }
  return { score: data.score, feedback: data.feedback, strengths: data.strengths, improvements: data.improvements }
}

export async function createFeedback(form, { signal, mock = false } = {}) {
  const title = form.title.trim() || form.file?.name?.replace(/\.[^.]+$/, '') || '제목 없는 발표'
  // The published API spells the required query parameter "perpose".
  const query = new URLSearchParams({ title, perpose: form.purpose.trim() })
  const body = new FormData()
  if (form.description.trim()) body.append('detail', form.description.trim())
  if (form.script.trim()) body.append('prompt', form.script.trim())
  if (form.file instanceof Blob) body.append('file', form.file, form.file.name || 'presentation')
  let response
  try {
    response = await fetch(`${API_BASE_URL}${mock ? '/mock/upload/' : '/upload/'}?${query}`, {
      method: 'POST', body, signal, headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) throw error
    throw new FeedbackApiError('분석 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status >= 500) throw new FeedbackApiError(`분석 서버에서 오류가 발생했어요. 잠시 후 다시 시도해 주세요. (${response.status})`, response.status)
    const detail = Array.isArray(data?.detail) ? data.detail.map(item => item.msg).filter(Boolean).join(' · ') : data?.detail
    throw new FeedbackApiError(typeof detail === 'string' ? detail : `분석 요청을 처리하지 못했어요. 입력한 자료를 확인해 주세요. (${response.status})`, response.status)
  }
  return normalizeFeedback(data)
}
