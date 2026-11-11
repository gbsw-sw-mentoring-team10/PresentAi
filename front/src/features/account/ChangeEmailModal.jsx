import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Logo from '../../components/ui/Logo.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { changeEmail } from './accountApi.js'
import { validateEmailChange } from './accountValidation.js'
import useAccountAction from './useAccountAction.js'

export default function ChangeEmailModal({ currentEmail, onClose, onChanged }) {
  const { busy, message, setMessage, run } = useAccountAction()

  async function submit(e) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')
    const problem = validateEmailChange(currentEmail, email, password)
    if (problem) {
      setMessage(problem)
      return
    }
    const result = await run((signal) => changeEmail({ email, password }, { signal }))
    if (result) {
      onChanged(result.value)
      onClose()
    }
  }

  return (
    <Modal onClose={onClose} title="이메일 변경" className="auth-modal account-modal">
      <Logo />
      <span className="auth-symbol">
        <Icon name="edit" size={24} />
      </span>
      <h2>새 이메일로 바꿀까요?</h2>
      <p>바꾼 이메일은 다음 로그인부터 이름처럼 쓰여요.</p>
      <form onSubmit={submit} noValidate>
        <div className="account-current">
          <small>현재 이메일</small>
          <strong>{currentEmail}</strong>
        </div>
        <div className="field">
          <label htmlFor="account-new-email">새 이메일</label>
          <input
            name="email"
            type="email"
            id="account-new-email"
            autoComplete="email"
            maxLength={254}
            required
            placeholder="새 이메일을 입력해 주세요"
          />
        </div>
        <div className="field">
          <label htmlFor="account-email-password">현재 비밀번호</label>
          <input
            name="password"
            type="password"
            id="account-email-password"
            autoComplete="current-password"
            maxLength={128}
            required
            placeholder="본인 확인을 위해 입력해 주세요"
          />
        </div>
        {message && (
          <div className="auth-message" role="alert">
            {message}
          </div>
        )}
        <Button variant="yellow" type="submit" icon={null} disabled={busy}>
          {busy ? '처리 중…' : '이메일 변경'}
        </Button>
      </form>
      <Button variant="outline" icon={null} className="account-cancel" onClick={onClose}>
        취소
      </Button>
    </Modal>
  )
}
