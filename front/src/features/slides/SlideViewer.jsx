import Icon from '../../components/ui/Icon.jsx'

import { slideStatus } from './slideFeedback.js'
import SlidePreview from './SlidePreview.jsx'

export default function SlideViewer({
  slide,
  pdf,
  currentIssueId,
  onIssueSelect,
  onOpenPreview,
  children,
}) {
  const status = slideStatus(slide)
  const pad = (value) => String(value).padStart(2, '0')
  return (
    <section className="deck-viewer" aria-label="선택한 슬라이드">
      <div className="deck-viewer-heading">
        <div>
          <span>SLIDE {pad(slide.id)}</span>
          <h3>{slide.title}</h3>
        </div>
        <span className={`deck-status ${status.tone}`}>
          <i />
          {status.label}
        </span>
      </div>
      <div className="deck-stage">
        <div className="deck-canvas">
          <SlidePreview key={slide.id} slide={slide} pdf={pdf} />
          {slide.example &&
            slide.issues
              .filter((issue) => issue.region)
              .map((issue, number) => (
                <button
                  className={`deck-marker ${currentIssueId === issue.id ? 'active' : ''}`}
                  key={issue.id}
                  style={{ left: `${issue.region.x}%`, top: `${issue.region.y}%` }}
                  onClick={() => {
                    onIssueSelect(issue.id)
                    document.getElementById(`issue-${issue.id}`)?.focus({ preventScroll: true })
                  }}
                  aria-label={`피드백 ${number + 1}: ${issue.title}`}
                  aria-pressed={currentIssueId === issue.id}
                >
                  {number + 1}
                </button>
              ))}
        </div>
      </div>
      <div className="deck-viewer-tools">
        <span>
          <Icon name="file" size={14} />
          {slide.example ? '예시 슬라이드' : '원본 슬라이드'}
          {slide.example && <small>· 수치는 설명용 예시</small>}
        </span>
        <button onClick={onOpenPreview} disabled={!slide.example && !pdf && !slide.imageUrl}>
          <Icon name="expand" size={16} />
          크게 보기
        </button>
      </div>
      {slide.summary && (
        <div className="deck-message">
          <span>
            <Icon name="sparkle" size={16} />이 장의 핵심
          </span>
          <p>{slide.summary}</p>
        </div>
      )}
      {slide.time && (
        <p className="deck-timing">
          <Icon name="clock" size={15} />
          권장 발표 시간 <b>{slide.time}</b>
        </p>
      )}
      {children}
    </section>
  )
}
