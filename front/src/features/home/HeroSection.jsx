import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

export default function HeroSection({ onShowHow }) {
  return (
    <section className="hero section-wrap">
      <div className="eyebrow">
        <span className="status-dot" />
        MAKE YOUR NEXT PRESENTATION BETTER.
      </div>
      <h1>
        전하고 싶은 생각,
        <br />
        <span className="highlight-text">확신 있는 발표로.</span>
        <span className="hero-star" aria-hidden="true">
          ✳
        </span>
      </h1>
      <p className="hero-description">
        자료의 첫 장부터 발표의 마지막 한마디까지.
        <br />
        좋은 피드백으로, 당신의 완벽한 발표를 완성하세요.
      </p>
      <div className="hero-actions">
        <Button variant="yellow" onClick={onShowHow}>
          이용 방법
        </Button>
      </div>
      <div className="hero-small">
        <span>
          <Icon name="check" size={14} />
          발표 목적에 맞춘 자료 피드백
        </span>
        <span>
          <Icon name="check" size={14} />
          음성 분석을 통한 발표 전달력 피드백
        </span>
      </div>
    </section>
  )
}
