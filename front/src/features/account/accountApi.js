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

// 서버는 snake_case로 응답한다고 가정하고 화면에서 쓰는 모양으로 바꿉니다.
function normalizeAccountProfile(data) {
  return {
    email: data?.email || null,
    createdAt: data?.created_at || null,
    emailUpdatedAt: data?.email_updated_at || null,
    passwordUpdatedAt: data?.password_updated_at || null,
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
  return { ...normalizeAccountProfile(data), emailUpdatedAt: today() }
}

export async function changePassword({ currentPassword, newPassword }, { signal } = {}) {
  await send(
    buildAccountRequest('password', 'PATCH', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
    signal,
  )
  return { passwordUpdatedAt: today() }
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

function today() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
