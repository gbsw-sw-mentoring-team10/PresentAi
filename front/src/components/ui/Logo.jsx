import { WORDMARK_PATH } from './logoPaths.js'

// 검은 부분은 글자색(currentColor)을 따르고, 마이크 몸통만 브랜드 노란색입니다.
function MicMark() {
  return (
    <>
      <rect
        x="35"
        y="6"
        width="30"
        height="50"
        rx="15"
        fill="#FFE500"
        stroke="currentColor"
        strokeWidth="6"
      />
      <path d="M43 24h14M43 35h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M23 40v4a27 27 0 0 0 54 0v-4"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M50 71v13" stroke="currentColor" strokeWidth="6" />
      <rect x="32" y="84" width="36" height="8" rx="4" fill="currentColor" />
      <path
        d="M84 18a28 28 0 0 1 0 30M93 10a40 40 0 0 1 0 46"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </>
  )
}

export default function Logo({ compact = false, responsive = false, className = '' }) {
  return (
    <span
      role="img"
      aria-label="PresentAi"
      className={`brand-logo ${compact ? 'is-compact' : ''} ${responsive ? 'is-responsive' : ''} ${className}`}
    >
      {!compact && (
        <svg className="brand-full" viewBox="0 0 430 100" fill="none" aria-hidden="true">
          <MicMark />
          <path d={WORDMARK_PATH} fill="currentColor" />
        </svg>
      )}
      {(compact || responsive) && (
        <svg className="brand-compact" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <MicMark />
        </svg>
      )}
    </span>
  )
}
