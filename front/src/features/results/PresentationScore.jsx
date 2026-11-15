import Icon from '../../components/ui/Icon.jsx'

export default function PresentationScore({ score }) {
  return (
    <section className="time-card">
      <div className="card-label">
        <Icon name="check" size={18} />
        발표 평가
      </div>
      <h2>
        {score}
        <span> / 100</span>
      </h2>
      <p>발표자료를 종합적으로 평가한 점수입니다.</p>
    </section>
  )
}
