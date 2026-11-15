import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import '../../styles/login-required.css'

const MESSAGE = '로그인 이후 사용 가능한 기능입니다.'
const DESCRIPTION = '로그인하면 내 피드백과 계정 정보를 한곳에서 확인할 수 있어요.'

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
