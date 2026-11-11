import { useState } from 'react'
import Icon from '../../components/ui/Icon.jsx'
import FeedbackSummary from '../results/FeedbackSummary.jsx'
import ImprovementChecklist from '../results/ImprovementChecklist.jsx'
import PresentationScore from '../results/PresentationScore.jsx'
import PresentationStrengths from '../results/PresentationStrengths.jsx'

// 발표(음성) 피드백 기록: 요약·점수 → 대본 비교 → 연습 제안 → 장점·개선사항 순서로 보여 줍니다.
export default function HistorySpeechDetail({ result, comparisons = [], suggestions = [] }) {
  const [showDiff, setShowDiff] = useState(true)
  const [resolved, setResolved] = useState([])
  function toggle(index) {
    setResolved((items) =>
      items.includes(index) ? items.filter((item) => item !== index) : [...items, index],
    )
  }

  return (
    <div className="speech-results history-panel">
      <div className="overview-grid">
        <FeedbackSummary feedback={result.feedback} />
        <PresentationScore score={result.score} />
      </div>
      {comparisons.length > 0 && (
        <>
          <div className="subheading">
            <h2>대본과 실제 발화, 나란히 보기</h2>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={showDiff}
                onChange={(event) => setShowDiff(event.target.checked)}
              />
              차이 강조
            </label>
          </div>
          <div className="comparison">
            <div className="comparison-header">
              <span>
                <Icon name="file" size={17} />
                준비한 대본
              </span>
              <span>
                <Icon name="mic" size={17} />
                실제 발화
              </span>
            </div>
            {comparisons.map((row) => (
              <div
                className={`comparison-row ${row.note && showDiff ? 'difference' : ''}`}
                key={row.script}
              >
                <p>
                  <span className="comparison-label">준비한 대본</span>
                  {row.script}
                </p>
                <p>
                  <span className="comparison-label">실제 발화</span>
                  {row.spoken}
                  {row.note && <small>{row.note}</small>}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
      {suggestions.length > 0 && (
        <>
          <div className="subheading">
            <h2>다음 연습에서는 이렇게 해 보세요.</h2>
          </div>
          <div className="speech-suggestions">
            {suggestions.map((text, index) => (
              <article key={text}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{text}</h3>
              </article>
            ))}
          </div>
        </>
      )}
      <PresentationStrengths strengths={result.strengths} />
      <ImprovementChecklist
        improvements={result.improvements}
        resolved={resolved}
        toggle={toggle}
      />
    </div>
  )
}
