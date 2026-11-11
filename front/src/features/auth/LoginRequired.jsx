import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Modal from '../../components/ui/Modal.jsx'
import '../../styles/login-required.css'

const MESSAGE = '로그인 이후 사용 가능한 기능입니다.'
const DESCRIPTION = '로그인하면 내 피드백과 계정 정보를 한곳에서 확인할 수 있어요.'

export function LoginRequiredModal({ onClose, onLogin }) {
  return (
    <Modal onClose={onClose} title="로그인 안내" className="login-required-modal">
      <span className="login-required-symbol">
        <Icon name="shield" size={26} />
      </span>
      <h2>{MESSAGE}</h2>
      <p>{DESCRIPTION}</p>
      <div className="login-required-actions">
        <Button variant="outline" icon={null} onClick={onClose}>
          닫기
        </Button>
        <Button variant="yellow" icon={null} onClick={onLogin}>
          로그인
        </Button>
      </div>
    </Modal>
  )
}

export function LoginRequiredPage({ onLogin }) {
  return (
    <div className="state-page login-required-page">
      <div className="state-icon">
        <Icon name="shield" size={30} />
      </div>
      <h1>{MESSAGE}</h1>
      <p>{DESCRIPTION}</p>
      <Button onClick={onLogin}>로그인</Button>
    </div>
  )
}
