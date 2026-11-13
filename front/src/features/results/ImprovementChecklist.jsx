import Icon from '../../components/ui/Icon.jsx'

export default function ImprovementChecklist({ improvements, resolved, toggle }) {
  const resolvedItems = new Set(resolved)
  return (
    <section className="priority-section">
      <div className="subheading">
        <h2>하나씩 다듬어 보세요.</h2>
        <span>
          {resolved.length} / {improvements.length} 확인 완료
        </span>
      </div>
      <div className="priority-list">
        {improvements.map((item, index) => {
          const checked = resolvedItems.has(index)
          return (
            <article className={checked ? 'resolved' : ''} key={index}>
              <button
                className="resolve-check"
                aria-label={`개선사항 ${index + 1} 확인 완료 표시`}
                aria-pressed={checked}
                onClick={() => toggle(index)}
              >
                {checked ? <Icon name="check" size={16} /> : String(index + 1).padStart(2, '0')}
              </button>
              <div>
                <div className="priority-meta">
                  <span className="priority-label">수정 제안 {index + 1}</span>
                  {item.deduction != null && (
                    <strong className="penalty-score">감점 {item.deduction}점</strong>
                  )}
                </div>
                <p className="api-feedback-text">{item.issue}</p>
                {item.solution && (
                  <div className="api-solution">
                    <small>해결 방법</small>
                    <p className="api-feedback-text">{item.solution}</p>
                  </div>
                )}
              </div>
            </article>
          )
        })}
        {!improvements.length && <p>서버가 별도의 개선사항을 반환하지 않았습니다.</p>}
      </div>
    </section>
  )
}
