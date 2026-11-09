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
      <p>서버에서 반환한 발표 점수입니다.</p>
    </section>
  )
}
