import Icon from '../../components/ui/Icon.jsx'

export default function PresentationStrengths({ strengths }) {
  return (
    <section className="priority-section">
      <div className="subheading">
        <h2>이런 점이 좋았어요.</h2>
        <span>{strengths.length}개 장점</span>
      </div>
      <div className="priority-list">
        {strengths.map((item, index) => (
          <article key={index}>
            <span className="file-ok">
              <Icon name="check" size={18} />
            </span>
            <div>
              <span className="priority-label">장점 {index + 1}</span>
              <p className="api-feedback-text">{item}</p>
            </div>
          </article>
        ))}
        {!strengths.length && <p>서버가 별도의 장점을 반환하지 않았습니다.</p>}
      </div>
    </section>
  )
}
