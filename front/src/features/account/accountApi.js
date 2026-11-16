import { API_BASE_URL } from '../feedback/feedbackApi.js'
import { accountRequest } from '../auth/authApi.js'

// 계정 조회는 실제 로그인 세션을 사용합니다.
// 이메일·비밀번호 변경과 탈퇴도 백엔드 /auth API를 호출합니다.

function buildAccountRequest(path, method = 'GET', body) {
  return {
    url: `${API_BASE_URL}/auth/${path}`,
    init: {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    },
  }
}

export async function readAccountResponse(response) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof data?.detail === 'string' ? data.detail : '계정 요청을 처리하지 못했어요.'
    throw new Error(message)
  }
  return data
}

// 서버의 UTC 시각을 화면에서 쓰는 사용자 시간대의 'YYYY-MM-DD'로 바꿉니다.
// 가입 후 정보를 바꾼 적이 없으면 updated_at이 created_at과 같아서 infoUpdatedAt은 null 입니다.
function normalizeAccountProfile(data) {
  const createdAt = data?.created_at || null
  const updatedAt = data?.updated_at || null
  return {
    email: data?.email || null,
    createdAt: toLocalDate(createdAt),
    infoUpdatedAt: updatedAt && updatedAt !== createdAt ? toLocalDate(updatedAt) : null,
  }
}

export async function getAccountProfile({ signal } = {}) {
  const data = await accountRequest('me', { signal })
  if (!data) throw new Error('로그인이 만료되었어요. 다시 로그인해 주세요.')
  return normalizeAccountProfile(data)
}

export async function changeEmail({ email, password }, { signal } = {}) {
  const data = await send(
    buildAccountRequest('email', 'PATCH', { new_email: email, password }),
    signal,
  )
  return { email: data?.email || null, infoUpdatedAt: toLocalDate(new Date()) }
}

export async function changePassword({ currentPassword, newPassword }, { signal } = {}) {
  await send(
    buildAccountRequest('password', 'PATCH', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
    signal,
  )
  return { infoUpdatedAt: toLocalDate(new Date()) }
}

export async function deleteAccount({ signal } = {}) {
  await send(buildAccountRequest('account', 'DELETE'), signal)
  return { deleted: true }
}

async function send(request, signal) {
  let response
  try {
    response = await fetch(request.url, { ...request.init, signal: withTimeout(signal) })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', { cause: error })
  }
  return readAccountResponse(response)
}

function withTimeout(signal) {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
}

function toLocalDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (!value || Number.isNaN(date.getTime())) return null
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
