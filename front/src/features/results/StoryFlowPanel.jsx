import Icon from '../../components/ui/Icon.jsx'

export default function StoryFlowPanel() {
  return (
    <div className="flow-panel">
      <div className="section-intro">
        <span className="section-kicker">CONNECT THE DOTS.</span>
        <h2>각 장이, 하나의 이야기로.</h2>
        <p>
          전체 흐름은 자연스러워요. 목차와 본문 구성을 맞추고, 장과 장 사이에 연결 문장을 더해
          보세요.
        </p>
      </div>
      <div className="flow-diagram">
        {['제안 소개', '투자 전략', '기대 성과', '실행 계획'].map((x, i) => (
          <div key={x}>
            <span>0{i + 1}</span>
            <b>{x}</b>
            <small>{['SLIDE 01–02', 'SLIDE 03–04', 'SLIDE 05', 'SLIDE 06'][i]}</small>
            {i < 3 && <Icon name="arrow" size={17} />}
          </div>
        ))}
      </div>
      <div className="flow-cards">
        <article>
          <Icon name="check" />
          <h3>목적과의 연관성</h3>
          <p>
            기관 투자자에게 ESG 기반 투자 전략을 제안한다는 목적에 잘 맞아요. 전략과 기대 수익, 실행
            계획을 차례로 설명하는 구성이 투자 판단에 도움이 됩니다.
          </p>
        </article>
        <article>
          <Icon name="plus" />
          <h3>더하면 좋은 내용</h3>
          <p>
            목차의 02장인 시장 배경 슬라이드를, 마지막에는 투자 조건 요약과 문의 창구를 추가해
            보세요.
          </p>
        </article>
      </div>
      <div className="recommendation">
        <span className="card-label">SLIDE 05 → 06 · 연결 문장 제안</span>
        <p>“이 성과를 실제로 만들어 내기 위해, 네 단계의 실행 로드맵을 준비했습니다.”</p>
      </div>
    </div>
  )
}
