import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

export default function AnalysisError({ message, onRetry, onBack }) {
  return (
    <div className="state-page">
      <div className="state-icon">
        <Icon name="alert" size={32} />
      </div>
      <h1>분석을 완료하지 못했어요.</h1>
      <p role="alert">{message}</p>
      <div className="hero-actions">
        <Button onClick={onRetry}>다시 시도</Button>
        <Button variant="outline" onClick={onBack}>
          입력 화면으로
        </Button>
      </div>
    </div>
  )
}
