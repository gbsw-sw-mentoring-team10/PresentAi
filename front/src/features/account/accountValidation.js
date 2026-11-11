// 회원가입과 같은 비밀번호 길이 규칙을 써요.
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmailChange(currentEmail, email, password) {
  if (!EMAIL_PATTERN.test(email)) return '이메일 형식을 다시 확인해 주세요.'
  if (email.toLowerCase() === currentEmail?.toLowerCase())
    return '지금 쓰고 있는 이메일과 같아요. 새 이메일을 입력해 주세요.'
  if (!password) return '본인 확인을 위해 현재 비밀번호를 입력해 주세요.'
  return ''
}

export function validatePasswordChange(currentPassword, newPassword) {
  if (!currentPassword) return '기존 비밀번호를 입력해 주세요.'
  if (newPassword.length < PASSWORD_MIN)
    return `새 비밀번호는 ${PASSWORD_MIN}자 이상 입력해 주세요.`
  if (newPassword.length > PASSWORD_MAX)
    return `새 비밀번호는 ${PASSWORD_MAX}자까지 입력할 수 있어요.`
  if (newPassword === currentPassword)
    return '새 비밀번호가 기존 비밀번호와 같아요. 다른 비밀번호를 입력해 주세요.'
  return ''
}
