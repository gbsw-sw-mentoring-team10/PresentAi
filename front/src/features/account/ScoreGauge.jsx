import { useId, useLayoutEffect, useRef } from 'react'
import { clampScore } from './accountRecord.js'
import '../../styles/mypage.css'

const DURATION = 800

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
}

export default function ScoreGauge({ value, label = '전체 발표 등급', description }) {
  const score = clampScore(value)
  const labelId = useId()
  const numberRef = useRef(null)
  const shown = useRef(0)

  // 숫자는 이전 값에서 새 값까지 세어 올라가거나 내려가요. 게이지 채움은 CSS 전환이 맡아요.
  useLayoutEffect(() => {
    const node = numberRef.current
    const from = shown.current
    if (
      from === score ||
      prefersReducedMotion() ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      shown.current = score
      node.textContent = String(Math.round(score))
      return
    }
    node.textContent = String(Math.round(from))
    let frame = 0
    let start = null
    function step(now) {
      if (start === null) start = now
      const progress = Math.min(1, (now - start) / DURATION)
      const eased = 1 - (1 - progress) ** 3
      shown.current = from + (score - from) * eased
      node.textContent = String(Math.round(shown.current))
      if (progress < 1) frame = window.requestAnimationFrame(step)
    }
    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
  }, [score])

  return (
    <div className="score-gauge">
      <div className="score-gauge-head">
        <span id={labelId} className="score-gauge-label">
          {label}
        </span>
        <strong className="score-gauge-value" aria-hidden="true">
          <span ref={numberRef} />
          <small> / 100</small>
        </strong>
      </div>
      <div
        className="score-gauge-track"
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`100점 만점에 ${Math.round(score)}점`}
      >
        <span className="score-gauge-fill" style={{ width: `${score}%` }} />
      </div>
      <div className="score-gauge-scale" aria-hidden="true">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      {description && <p className="score-gauge-description">{description}</p>}
    </div>
  )
}
