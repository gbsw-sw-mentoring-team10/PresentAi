import Icon from '../../components/ui/Icon.jsx'

export default function PrioritySlideIssues({
  slidePriorities,
  reviewed,
  toggleSlideIssue,
  openSlide,
  setTab,
}) {
  return (
    <section className="priority-section">
      <div className="subheading">
        <h2>슬라이드에서 먼저 확인해 보세요.</h2>
        <button className="text-button" onClick={() => setTab('slides')}>
          모두 보기
          <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="priority-list">
        {slidePriorities.map((issue) => (
          <article key={issue.id} className={reviewed.includes(issue.id) ? 'resolved' : ''}>
            <button
              className="resolve-check"
              aria-label={`${issue.title} 확인 완료 표시`}
              aria-pressed={reviewed.includes(issue.id)}
              onClick={() => toggleSlideIssue(issue.id)}
            >
              {reviewed.includes(issue.id) ? (
                <Icon name="check" size={16} />
              ) : (
                String(issue.page).padStart(2, '0')
              )}
            </button>
            <div>
              <span className="priority-label">
                SLIDE {String(issue.page).padStart(2, '0')} · {issue.category}
              </span>
              <h3>{issue.title}</h3>
              {issue.target && <p>{issue.target}</p>}
            </div>
            <button
              className="icon-button"
              aria-label={`${issue.page}번 슬라이드 ${issue.title} 보기`}
              onClick={() => openSlide(issue.page, issue.id)}
            >
              <Icon name="arrow" />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
