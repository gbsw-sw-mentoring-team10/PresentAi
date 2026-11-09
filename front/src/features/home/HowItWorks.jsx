import Icon from '../../components/ui/Icon.jsx'

export default function HowItWorks() {
  return (
    <section className="how-section" id="how">
      <div className="section-wrap">
        <div className="section-heading">
          <div>
            <span className="section-kicker">LESS GUESSWORK. MORE CONFIDENCE.</span>
            <h2>
              복잡한 준비는 덜고,
              <br />
              중요한 것에 집중하세요.
            </h2>
          </div>
        </div>
        <div className="how-grid">
          {[
            {
              n: '01',
              icon: 'upload',
              title: '목적과 자료를 알려 주세요',
              text: '누구에게, 어떤 이야기를 전하나요? 발표 목적을 적고 준비한 자료를 올려 주세요.',
            },
            {
              n: '02',
              icon: 'sparkle',
              title: '발표를 함께 들여다봐요',
              text: '자료의 흐름과 내용, 전달력을 점검하고 필요한 피드백을 정리합니다.',
            },
            {
              n: '03',
              icon: 'check',
              title: '한 단계 더 나은 발표로',
              text: '우선 수정사항부터 하나씩. 슬라이드별 제안으로 발표의 완성도를 높이세요.',
            },
          ].map((item) => (
            <article key={item.n}>
              <div>
                <span>{item.n}</span>
                <Icon name={item.icon} size={25} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
