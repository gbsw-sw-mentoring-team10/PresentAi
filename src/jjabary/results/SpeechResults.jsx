import { useState } from 'react'
import { Icon } from '../components.jsx'

export default function SpeechResults() {
  const [showDiff, setShowDiff] = useState(true)
  return (
    <div className="speech-results">
      <div className="summary-card">
        <div className="card-label">
          <Icon name="mic" size={18} />
          발표 피드백 · 기능 미리보기
        </div>
        <h2>
          큰 흐름은 유지하고,
          <br />
          <mark>연결 문장은 더 자연스럽게.</mark>
        </h2>
        <p>
          예시 리허설에서는 대본의 전체 흐름이 유지되었지만, 일부 연결 문장이 달라졌어요. 의도한
          변화인지 확인하고 다음 연습의 기준을 맞춰 보세요.
        </p>
      </div>
      <div className="subheading">
        <h2>대본과 실제 발화, 나란히 보기</h2>
        <label className="switch-label">
          <input
            type="checkbox"
            checked={showDiff}
            onChange={(e) => setShowDiff(e.target.checked)}
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
            음성 전사 예시
          </span>
        </div>
        {[
          [
            '저희 서비스는 발표 준비 시간을 줄이는 것을 목표로 합니다.',
            '저희 서비스는 발표 준비 시간을 줄이는 것을 목표로 합니다.',
          ],
          ['먼저 시장 현황을 살펴보겠습니다.', '시장 현황을 살펴보겠습니다.'],
          ['분기별 계획은 다음과 같습니다.', '분기별 계획은 다음 슬라이드에서 말씀드리겠습니다.'],
        ].map(([a, b], i) => (
          <div className={`comparison-row ${i > 0 && showDiff ? 'difference' : ''}`} key={a}>
            <p>
              <span className="comparison-label">준비한 대본</span>
              {a}
            </p>
            <p>
              <span className="comparison-label">음성 전사 예시</span>
              {b}
              {i > 0 && <small>{i === 1 ? '연결어 생략' : '표현 변경'}</small>}
            </p>
          </div>
        ))}
      </div>
      <div className="subheading">
        <h2>다음 연습에서는 이렇게 해 보세요.</h2>
        <span className="tag tag-muted">예시 제안</span>
      </div>
      <div className="speech-suggestions">
        {[
          '달라진 연결 문장을 대본에도 반영해 보세요.',
          '긴 문장은 의미 단위로 나누어 말해 보세요.',
          '같은 구간을 다시 녹음해 변화를 확인해 보세요.',
        ].map((t, i) => (
          <article key={t}>
            <span>0{i + 1}</span>
            <h3>{t}</h3>
          </article>
        ))}
      </div>
      <div className="demo-notice">
        <Icon name="info" size={20} />
        <p>
          <strong>발음·전달 방식 분석은 준비 중이에요.</strong>
          <br />
          음성 인식 오류만으로 발음 문제를 판단하지 않으며, 분석 기준을 검토하고 있습니다. 현재
          내용은 기능 설명을 위한 예시입니다.
        </p>
      </div>
    </div>
  )
}
