import { useState } from 'react'
import Icon from '../../components/ui/Icon.jsx'

export default function SpeechComparison() {
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
          <mark>숫자는 또박또박 전달하게.</mark>
        </h2>
        <p>
          예시 리허설에서는 발표의 전체 흐름이 유지되었지만, 목차를 소개하는 문장이 짧아지고 수치를
          말하는 부분에서 머뭇거림이 있었어요. 의도한 변화인지 확인하고 다음 연습의 기준을 맞춰
          보세요.
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
            '안녕하세요. 그린 호라이즌 투자 파트너스입니다.',
            '안녕하세요. 그린 호라이즌 투자 파트너스입니다.',
          ],
          [
            '발표는 투자 전략 개요, ESG 기반 투자 및 운영 전략, 예상 성과와 기대 수익, 그리고 단계별 실행 로드맵 순서로 진행하겠습니다.',
            '발표는 투자 전략 개요, 운영 전략, 그리고 실행 로드맵 순서로 진행하겠습니다.',
          ],
          [
            '글로벌 ESG 투자 시장은 2033년까지 연평균 11.3% 성장할 것으로 예상되며',
            '글로벌 ESG 투자 시장은 어… 2033년까지 연평균 11.3% 성장할 것으로 예상되고요',
          ],
        ].map(([a, b], i) => (
          <div className={`comparison-row ${i > 0 && showDiff ? 'difference' : ''}`} key={a}>
            <p>
              <span className="comparison-label">준비한 대본</span>
              {a}
            </p>
            <p>
              <span className="comparison-label">음성 전사 예시</span>
              {b}
              {i > 0 && <small>{i === 1 ? '내용 생략' : '머뭇거림'}</small>}
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
          '줄여 말한 목차 소개를 대본에도 반영할지 정해 보세요.',
          '11.3%처럼 숫자가 나오는 문장은 끊어 읽을 곳을 표시해 보세요.',
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
