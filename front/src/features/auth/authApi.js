import { API_BASE_URL } from '../feedback/feedbackApi.js'

export async function accountRequest(path, { credentials, signal } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/auth/${path}`, {
      method: credentials || path === 'logout' ? 'POST' : 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: credentials ? { 'Content-Type': 'application/json' } : {},
      body: credentials ? JSON.stringify(credentials) : undefined,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('계정 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', { cause: error })
  }
  const data = await response.json().catch(() => null)
  if (path === 'me' && response.status === 401) return null
  if (!response.ok) {
    const message =
      typeof data?.detail === 'string' ? data.detail : '계정 요청을 처리하지 못했어요.'
    throw new Error(message)
  }
  if (path !== 'logout' && (!Number.isInteger(data?.user_id) || typeof data.email !== 'string'))
    throw new Error('계정 서버의 응답을 확인할 수 없어요.')
  return data
}
