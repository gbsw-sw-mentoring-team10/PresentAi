import Icon from '../../components/ui/Icon.jsx'
import SampleSlideArtwork from '../slides/SampleSlideArtwork.jsx'
import { slides } from '../../data/examplePresentation.js'

export default function FeedbackShowcase() {
  return (
    <div className="showcase" aria-label="발표 피드백 결과 예시">
      <div className="showcase-label">
        <span className="hand-arrow">↘</span>작은 수정이 만드는 큰 차이
      </div>
      <div className="showcase-left">
        <div className="mini-page-title">
          <span className="tiny-dot" />
          나의 발표자료<span>06 slides</span>
        </div>
        <div className="mini-slide-row active">
          <b>01</b>
          <SampleSlideArtwork slide={slides[0]} small decorative />
        </div>
        <div className="mini-slide-row">
          <b>02</b>
          <SampleSlideArtwork slide={slides[1]} small decorative />
        </div>
        <div className="mini-slide-row">
          <b>03</b>
          <SampleSlideArtwork slide={slides[2]} small decorative />
        </div>
      </div>
      <div className="showcase-main">
        <div className="preview-toolbar">
          <span>
            <Icon name="slides" size={14} />
            그린 호라이즌 투자 제안서
          </span>
          <span className="example-label">예시 자료</span>
        </div>
        <SampleSlideArtwork slide={slides[0]} />
        <div className="preview-bottom">
          <span>
            <i className="status-dot" />
            발표 목적과 흐름을 함께 점검해요
          </span>
          <span>01 / 06</span>
        </div>
      </div>
      <div className="feedback-float">
        <div className="feedback-float-heading">
          <span className="sparkle-box">
            <Icon name="sparkle" size={19} />
          </span>
          <strong>더 좋아질 수 있어요</strong>
          <span className="float-number">01</span>
        </div>
        <p>
          이 제안의 가치를
          <br />
          <b>한 줄로 먼저 알려 주세요.</b>
        </p>
        <div className="suggestion-mini">
          <span>이렇게 바꿔 보세요</span>“ESG로 높이는
          <br />
          부동산의 장기 가치”
        </div>
      </div>
      <div className="time-float">
        <span>
          <Icon name="clock" size={19} />
        </span>
        <div>
          <small>발표 시간도 균형 있게</small>
          <b>슬라이드별 권장 시간</b>
        </div>
        <strong>00:30</strong>
      </div>
      <div className="showcase-sticker" aria-hidden="true">
        GOOD
        <br />
        TO BETTER<span>↗</span>
      </div>
    </div>
  )
}
