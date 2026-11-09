import { useLayoutEffect, useRef } from 'react'
import SlideIssueCard from './SlideIssueCard.jsx'

import Icon from '../../components/ui/Icon.jsx'

export default function SlideFeedbackPanel({
  slide,
  currentIssueId,
  reviewed,
  onToggle,
  onIssueSelect,
  onShowOverview,
  copySuggestion,
}) {
  const feedbackRef = useRef(null)
  useLayoutEffect(() => {
    if (feedbackRef.current) feedbackRef.current.scrollTop = 0
  }, [slide?.id])

  return (
    <section className="deck-feedback" aria-label={`${slide.id}번 슬라이드 피드백`}>
      <div className="deck-feedback-heading">
        <div>
          <Icon name="edit" size={18} />
          <h3>이 장의 피드백</h3>
          <span>{slide.issues.length}</span>
        </div>
        <p>
          {slide.issues.length
            ? '중요한 항목부터 하나씩 확인해 보세요.'
            : slide.analyzed
              ? '잘한 점을 유지하며 다음 장으로 넘어가세요.'
              : '슬라이드별 분석이 제공되지 않았어요.'}
        </p>
      </div>
      <div ref={feedbackRef} className="deck-feedback-scroll">
        {slide.issues.map((issue, number) => {
          const open = currentIssueId === issue.id
          const checked = reviewed.includes(issue.id)
          return (
            <SlideIssueCard
              key={issue.id}
              issue={issue}
              number={number}
              open={open}
              checked={checked}
              onIssueSelect={onIssueSelect}
              onToggle={onToggle}
              copySuggestion={copySuggestion}
            />
          )
        })}
        {!slide.analyzed && (
          <div className="deck-feedback-empty">
            <Icon name="info" size={24} />
            <h4>전체 피드백을 먼저 확인해 주세요.</h4>
            <p>이번 분석에는 이 페이지의 개별 평가가 포함되지 않았어요.</p>
            <button className="text-button" onClick={onShowOverview}>
              전체 피드백 보기
              <Icon name="arrow" size={15} />
            </button>
          </div>
        )}
        {slide.analyzed && !slide.issues.length && (
          <div className="deck-feedback-empty">
            <Icon name="check" size={25} />
            <h4>별도의 수정 제안이 없어요.</h4>
          </div>
        )}
        {!!slide.strengths.length && (
          <div className="deck-strengths">
            <span>
              <Icon name="check" size={16} />
              이런 점은 좋아요
            </span>
            {slide.strengths.map((strength, i) => (
              <p key={i}>{strength}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
