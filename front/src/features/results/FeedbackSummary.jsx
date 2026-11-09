import Icon from '../../components/ui/Icon.jsx'

export default function FeedbackSummary({ feedback }) {
  return (
    <section className="summary-card">
      <div className="card-label">
        <Icon name="sparkle" size={18} />
        전체 피드백
      </div>
      <h2>
        발표를 돌아보고,
        <br />
        <mark>다음 방향을 찾아보세요.</mark>
      </h2>
      <p className="api-feedback-text">{feedback}</p>
    </section>
  )
}
