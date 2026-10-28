import { Icon } from '../components.jsx'

export default function FlowPanel() {
  return (
    <div className="flow-panel">
      <div className="section-intro">
        <span className="section-kicker">CONNECT THE DOTS.</span>
        <h2>각 장이, 하나의 이야기로.</h2>
        <p>
          전체 흐름은 자연스러워요. 청중이 다음 이야기를 예상할 수 있도록 연결 문장을 더해 보세요.
        </p>
      </div>
      <div className="flow-diagram">
        {['주제 소개', '현황과 기회', '실행 계획', '역할과 다음 단계'].map((x, i) => (
          <div key={x}>
            <span>0{i + 1}</span>
            <b>{x}</b>
            <small>{['SLIDE 01', 'SLIDE 02–03', 'SLIDE 04', 'SLIDE 05–06'][i]}</small>
            {i < 3 && <Icon name="arrow" size={17} />}
          </div>
        ))}
      </div>
      <div className="flow-cards">
        <article>
          <Icon name="check" />
          <h3>목적과의 연관성</h3>
          <p>
            신입 사원에게 서비스의 방향을 소개한다는 목적에 잘 맞아요. 현황과 계획, 역할을 차례로
            설명하는 구성이 도움이 됩니다.
          </p>
        </article>
        <article>
          <Icon name="plus" />
          <h3>더하면 좋은 내용</h3>
          <p>시장 분석 앞에 용어 설명을, 마지막에는 로드맵 문서와 질문 채널을 추가해 보세요.</p>
        </article>
      </div>
      <div className="recommendation">
        <span className="card-label">SLIDE 03 → 04 · 연결 문장 제안</span>
        <p>“이 기회를 실제 변화로 만들기 위해, 하반기에는 세 단계로 움직이겠습니다.”</p>
      </div>
    </div>
  )
}
