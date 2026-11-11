import { API_BASE_URL, FeedbackApiError } from './feedbackApi.js'

export async function getOriginalDownload(fileId, { signal } = {}) {
  if (!Number.isSafeInteger(fileId) || fileId <= 0)
    throw new FeedbackApiError('저장된 원본 자료를 찾을 수 없어요.', 404)
  let response
  try {
    response = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
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
    throw new FeedbackApiError('원본 자료에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok)
    throw new FeedbackApiError(
      response.status === 401
        ? '로그인이 만료되었어요. 다시 로그인해 주세요.'
        : typeof data?.detail === 'string'
          ? data.detail
          : '원본 자료를 내려받지 못했어요. 다시 시도해 주세요.',
      response.status,
    )
  let url
  try {
    url = new URL(data?.download_url)
  } catch {
    /* malformed response */
  }
  if (data?.file_id !== fileId || typeof data.file_name !== 'string' || url?.protocol !== 'https:')
    throw new FeedbackApiError('원본 자료의 다운로드 주소를 확인할 수 없어요.')
  return data
}
