import { useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { deleteAccount } from './accountApi.js'
import useAccountAction from './useAccountAction.js'

export default function DeleteAccountModal({ email, onClose, onDeleted }) {
  const [agreed, setAgreed] = useState(false)
  const { busy, message, run } = useAccountAction()

  async function confirm() {
    if (!agreed) return
    const result = await run((signal) => deleteAccount({ signal }))
    if (result) onDeleted(result.value)
  }

  return (
    <Modal
      onClose={onClose}
      title="계정 탈퇴"
      className="auth-modal account-modal account-delete-modal"
    >
      <span className="auth-symbol account-danger-symbol">
        <Icon name="alert" size={24} />
      </span>
      <h2>정말 계정을 탈퇴할까요?</h2>
      <p>탈퇴는 되돌릴 수 없어요. 아래 내용을 꼭 확인해 주세요.</p>
      <ul className="account-warning-list">
        <li>지금까지 받은 발표자료 피드백과 발표 피드백 기록이 모두 삭제돼요.</li>
        <li>
          <strong>{email}</strong> 계정으로 더 이상 로그인할 수 없어요.
        </li>
        <li>삭제된 기록과 계정 정보는 다시 복구할 수 없어요.</li>
      </ul>
      <label className="account-agree">
        <input
          type="checkbox"
          checked={agreed}
          disabled={busy}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        위 내용을 모두 확인했고, 계정을 탈퇴할게요.
      </label>
      {message && (
        <div className="auth-message" role="alert">
          {message}
        </div>
      )}
      <div className="account-delete-actions">
        <Button variant="outline" icon={null} onClick={onClose}>
          계속 이용하기
        </Button>
        <Button variant="danger" icon={null} disabled={!agreed || busy} onClick={confirm}>
          {busy ? '탈퇴 처리 중…' : '계정 탈퇴하기'}
        </Button>
      </div>
    </Modal>
  )
}
