import { useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Logo from '../../components/ui/Logo.jsx'
import Modal from '../../components/ui/Modal.jsx'

export default function AuthModal({ onClose, onAuthenticate }) {
  const [signup, setSignup] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (signup && data.get('password') !== data.get('confirm')) {
      setMessage('비밀번호가 서로 달라요. 다시 확인해 주세요.')
      return
    }
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await onAuthenticate(data.get('email'), data.get('password'), signup)
      onClose()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} title={signup ? '회원가입' : '로그인'} className="auth-modal">
      <Logo />
      <span className="auth-symbol">
        <Icon name="sparkle" size={26} />
      </span>
      <h2>{signup ? '당신의 다음 발표를 함께.' : '다시 만나 반가워요.'}</h2>
      <p>{signup ? '더 좋은 발표를 향한 작은 시작.' : '다음 발표를 준비할 시간이에요.'}</p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="account-id">이메일</label>
          <input
            name="email"
            type="email"
            id="account-id"
            autoComplete="username"
            required
            placeholder="이메일을 입력해 주세요"
          />
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            name="password"
            id="password"
            type="password"
            minLength={8}
            maxLength={128}
            required
            autoComplete={signup ? 'new-password' : 'current-password'}
            placeholder="8자 이상 입력해 주세요"
          />
        </div>
        {signup && (
          <div className="field">
            <label htmlFor="confirm">비밀번호 확인</label>
            <input
              name="confirm"
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="비밀번호를 한 번 더 입력해 주세요"
            />
          </div>
        )}
        {message && (
          <div className="auth-message" role="alert">
            {message}
          </div>
        )}
        <Button variant="yellow" type="submit" icon={null} disabled={busy}>
          {busy ? '처리 중…' : signup ? '회원가입' : '로그인'}
        </Button>
      </form>
      <div className="auth-toggle">
        {signup ? '이미 계정이 있나요?' : '처음 오셨나요?'}
        <button
          disabled={busy}
          onClick={() => {
            setSignup((v) => !v)
            setMessage('')
          }}
        >
          {signup ? '로그인' : '회원가입'}
        </button>
      </div>
      <div className="auth-divider">
        <span>또는</span>
      </div>
      <Button variant="outline" onClick={onClose}>
        로그인 없이 둘러보기
      </Button>
      <small className="auth-footnote">
        로그인하면 실제 발표자료 분석 결과가 내 계정에 자동 저장돼요.
        <br />
        비회원 분석과 예시 결과는 저장되지 않아요.
      </small>
    </Modal>
  )
}
