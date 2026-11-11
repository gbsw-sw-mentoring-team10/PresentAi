import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Logo from '../../components/ui/Logo.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { changePassword } from './accountApi.js'
import { PASSWORD_MAX, PASSWORD_MIN, validatePasswordChange } from './accountValidation.js'
import useAccountAction from './useAccountAction.js'

export default function ChangePasswordModal({ onClose, onChanged }) {
  const { busy, message, setMessage, run } = useAccountAction()

  async function submit(e) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const currentPassword = String(data.get('currentPassword') || '')
    const newPassword = String(data.get('newPassword') || '')
    const problem = validatePasswordChange(currentPassword, newPassword)
    if (problem) {
      setMessage(problem)
      return
    }
    const result = await run((signal) =>
      changePassword({ currentPassword, newPassword }, { signal }),
    )
    if (result) {
      onChanged(result.value)
      onClose()
    }
  }

  return (
    <Modal onClose={onClose} title="비밀번호 변경" className="auth-modal account-modal">
      <Logo />
      <span className="auth-symbol">
        <Icon name="shield" size={24} />
      </span>
      <h2>비밀번호를 새로 정해요.</h2>
      <p>기존 비밀번호를 확인한 뒤 새 비밀번호로 바꿔 드릴게요.</p>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="account-current-password">기존 비밀번호</label>
          <input
            name="currentPassword"
            id="account-current-password"
            type="password"
            maxLength={PASSWORD_MAX}
            required
            autoComplete="current-password"
            placeholder="지금 쓰는 비밀번호를 입력해 주세요"
          />
        </div>
        <div className="field">
          <label htmlFor="account-new-password">새 비밀번호</label>
          <input
            name="newPassword"
            id="account-new-password"
            type="password"
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
            required
            autoComplete="new-password"
            placeholder={`${PASSWORD_MIN}자 이상 입력해 주세요`}
          />
        </div>
        {message && (
          <div className="auth-message" role="alert">
            {message}
          </div>
        )}
        <Button variant="yellow" type="submit" icon={null} disabled={busy}>
          {busy ? '처리 중…' : '비밀번호 변경'}
        </Button>
      </form>
      <Button variant="outline" icon={null} className="account-cancel" onClick={onClose}>
        취소
      </Button>
    </Modal>
  )
}
