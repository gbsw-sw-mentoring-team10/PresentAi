import Icon from '../../components/ui/Icon.jsx'

export default function FactCheckPanel({ resolved, toggle, openSlide }) {
  return (
    <section className="facts-panel">
      <div className="section-intro">
        <span className="section-kicker">BUILD TRUST, ONE DETAIL AT A TIME.</span>
        <h2>좋은 주장에는, 분명한 근거가.</h2>
        <p>아래 항목은 사실 오류의 확정이 아니라, 발표 전에 확인하면 좋은 정보예요.</p>
      </div>
      <article className="fact-item">
        <div>
          <span className="tag tag-yellow">
            <Icon name="alert" size={14} />
            출처 확인 필요
          </span>
          <span>SLIDE 04</span>
        </div>
        <h3>연평균 성장률 11.3%의 출처를 확인해 주세요.</h3>
        <p>
          예시 슬라이드의 ‘2033년까지 연평균 11.3% 성장’ 전망에는 출처와 조사 시점이 표시되어 있지
          않아요. 같은 수치가 슬라이드 4와 5에 반복되니, 원문 자료에서 수치의 정의와 대상 시장, 기준
          연도를 확인한 뒤 각주를 추가해 보세요.
        </p>
        <div className="fact-checklist">
          {[
            '원문 보고서 또는 공식 자료 확인',
            '대상 시장과 기준 연도 확인',
            '슬라이드 4·5에 출처·기준 연도 표시',
          ].map((t, i) => (
            <label key={t}>
              <input
                type="checkbox"
                checked={resolved.includes(`fact-${i}`)}
                onChange={() => toggle(`fact-${i}`)}
              />
              {t}
            </label>
          ))}
        </div>
        <button className="text-button" onClick={() => openSlide(4, 'source')}>
          해당 슬라이드 보기
          <Icon name="arrow" size={16} />
        </button>
      </article>
    </section>
  )
}
