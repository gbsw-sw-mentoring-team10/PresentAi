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

// 저장된 PDF 원본을 서버를 거쳐 내려받아 File로 돌려줍니다. 기록 화면의 슬라이드 미리보기에 씁니다.
export async function getOriginalPdf(fileId, fileName, { signal } = {}) {
  if (!Number.isSafeInteger(fileId) || fileId <= 0)
    throw new FeedbackApiError('저장된 원본 자료를 찾을 수 없어요.', 404)
  let response
  try {
    response = await fetch(`${API_BASE_URL}/files/${fileId}/content`, {
      credentials: 'include',
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
        : AbortSignal.timeout(60000),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new FeedbackApiError('원본 슬라이드를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new FeedbackApiError(
      typeof data?.detail === 'string' ? data.detail : '원본 슬라이드를 불러오지 못했어요.',
      response.status,
    )
  }
  const blob = await response.blob()
  const name = /\.pdf$/i.test(fileName || '') ? fileName : `${fileName || 'presentation'}.pdf`
  return new File([blob], name, { type: 'application/pdf' })
}
