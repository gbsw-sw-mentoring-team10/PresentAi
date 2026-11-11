import { feedbackTypeLabel } from './historyFormat.js'

// 발표자료: 화면 속 슬라이드와 막대 그래프 / 발표: 마이크 옆의 음성 파형
function MaterialGlyph() {
  return (
    <>
      <rect x="3.5" y="4" width="17" height="12" rx="1.6" />
      <path d="M12 16v3.5m-3.5 0h7" />
      <path className="feedback-type-accent" d="M7.5 12.5v-2m3-.5v2.5m3-4.5v4.5m3-1.5v1.5" />
    </>
  )
}

function SpeechGlyph() {
  return (
    <>
      <rect x="7" y="3" width="5.5" height="10" rx="2.75" />
      <path d="M4.5 10.5a5.25 5.25 0 0 0 10.5 0M9.75 16v4m-2.5 0h5" />
      <path className="feedback-type-accent" d="M18 8.5v5m2.5-3.5v2" />
    </>
  )
}

export default function FeedbackTypeIcon({ type, size = 22, className = '' }) {
  return (
    <span
      className={`feedback-type-icon ${type === 'speech' ? 'is-speech' : 'is-material'} ${className}`}
      role="img"
      aria-label={feedbackTypeLabel(type)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {type === 'speech' ? <SpeechGlyph /> : <MaterialGlyph />}
      </svg>
    </span>
  )
}
