import { API_BASE_URL, FeedbackApiError, normalizeFeedback } from '../feedback/feedbackApi.js'

async function getFeedback(path, signal) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/feedback${path}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new FeedbackApiError('피드백 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok)
    throw new FeedbackApiError(
      response.status === 401
        ? '로그인이 만료되었어요. 다시 로그인해 주세요.'
        : typeof data?.detail === 'string'
          ? data.detail
          : '저장된 피드백을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      response.status,
    )
  return data
}

function historyItem(data) {
  if (
    !Number.isSafeInteger(data?.saved_result_id) ||
    data.saved_result_id <= 0 ||
    typeof data.title !== 'string' ||
    typeof data.created_at !== 'string' ||
    !Number.isFinite(Date.parse(data.created_at)) ||
    typeof data.score !== 'number' ||
    !Number.isFinite(data.score) ||
    data.score < 0 ||
    data.score > 100
  )
    throw new FeedbackApiError('저장된 피드백의 응답 형식을 확인할 수 없어요.')
  return {
    id: data.saved_result_id,
    title: data.title || '제목 없는 발표',
    createdAt: data.created_at,
    score: data.score,
    // 현재 저장 API는 발표자료·대본 분석만 저장합니다. 음성 분석 기록은 지원하지 않습니다.
    type: 'material',
  }
}

export async function loadFeedbackHistory({ signal } = {}) {
  const items = new Map()
  const pageSize = 100
  for (let page = 1; ; page++) {
    signal?.throwIfAborted()
    const data = await getFeedback(`?page=${page}&page_size=${pageSize}`, signal)
    if (
      !Array.isArray(data?.items) ||
      !Number.isSafeInteger(data.total) ||
      data.total < 0 ||
      data.page !== page ||
      data.page_size !== pageSize ||
      data.items.length > pageSize
    )
      throw new FeedbackApiError('피드백 목록의 응답 형식을 확인할 수 없어요.')
    for (const value of data.items) {
      const item = historyItem(value)
      items.set(item.id, item)
    }
    if (page * pageSize >= data.total) return [...items.values()]
    if (!data.items.length)
      throw new FeedbackApiError('피드백 목록을 모두 불러오지 못했어요. 다시 시도해 주세요.')
  }
}

export async function loadSavedFeedback(id, { signal } = {}) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
    throw new FeedbackApiError('저장된 결과를 찾을 수 없습니다.', 404)
  const data = await getFeedback(`/${id}`, signal)
  if (data?.saved_result_id !== Number(id))
    throw new FeedbackApiError('피드백 번호가 요청한 기록과 일치하지 않아요.')
  if (['pending', 'processing', 'failed'].includes(data.status)) return data
  if (data.status !== 'completed')
    throw new FeedbackApiError('저장된 피드백의 상태를 확인할 수 없어요.')
  return { ...historyItem(data), status: data.status, result: normalizeFeedback(data) }
}
