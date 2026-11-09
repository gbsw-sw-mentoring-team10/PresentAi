import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

export default function HeroSection({ navigate, startExample }) {
  return (
    <section className="hero section-wrap">
      <div className="eyebrow">
        <span className="status-dot" />
        YOUR NEXT PRESENTATION, BETTER.
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
        좋은 피드백으로, 당신의 다음 발표를 완성하세요.
      </p>
      <div className="hero-actions">
        <Button variant="yellow" onClick={() => navigate('/materials')}>
          내 발표자료 점검하기
        </Button>
        <button className="text-button" onClick={startExample}>
          <span className="play-circle">
            <Icon name="play" size={11} />
          </span>
          예시 결과 둘러보기
        </button>
      </div>
      <div className="hero-small">
        <span>
          <Icon name="check" size={14} />
          발표 목적에 맞춘 피드백
        </span>
        <span>
          <Icon name="check" size={14} />
          슬라이드별 구체적인 제안
        </span>
      </div>
    </section>
  )
}
