import { sampleAccount } from '../../data/sampleAccount.js'
import { API_BASE_URL } from '../feedback/feedbackApi.js'
import { accountRequest } from '../auth/authApi.js'

// 계정 조회는 실제 로그인 세션을 사용합니다.
// 이메일·비밀번호 변경·탈퇴 API는 아직 없어 기존 샘플 동작을 유지합니다.
const SIMULATED_DELAY = 500

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

export function changeEmail({ email, password }, { signal } = {}) {
  const request = buildAccountRequest('email', 'PATCH', { new_email: email, password })
  return send(
    request,
    () => {
      simulated = { ...simulated, email, email_updated_at: today() }
      return normalizeAccountProfile(simulated)
    },
    signal,
  )
}

export function changePassword({ currentPassword, newPassword }, { signal } = {}) {
  const request = buildAccountRequest('password', 'PATCH', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return send(
    request,
    () => {
      simulated = { ...simulated, password_updated_at: today() }
      return normalizeAccountProfile(simulated)
    },
    signal,
  )
}

export function deleteAccount({ signal } = {}) {
  const request = buildAccountRequest('account', 'DELETE')
  return send(
    request,
    () => {
      resetSampleAccount()
      return { deleted: true }
    },
    signal,
  )
}

async function send(request, simulate, signal) {
  // TODO: 백엔드 엔드포인트가 생기면 아래 두 줄을 지우고 이 한 줄로 바꿔 주세요.
  // return readAccountResponse(await fetch(request.url, { ...request.init, signal: withTimeout(signal) }))
  await wait(SIMULATED_DELAY, withTimeout(signal))
  return simulate()
}

function withTimeout(signal) {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

// 샘플 서버 상태입니다. email은 바꾸기 전까지 비워 두어 로그인한 이메일이 그대로 보이게 해요.
function initialAccount(owner = null) {
  return {
    owner,
    email: null,
    created_at: sampleAccount.createdAt,
    email_updated_at: sampleAccount.emailUpdatedAt,
    password_updated_at: sampleAccount.passwordUpdatedAt,
  }
}

let simulated = initialAccount()

// 로그아웃·탈퇴 때 바꾼 이메일이나 수정일이 다음 로그인으로 넘어가지 않게 비웁니다.
export function resetSampleAccount() {
  simulated = initialAccount()
}

function today() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
