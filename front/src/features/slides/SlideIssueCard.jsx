import Icon from '../../components/ui/Icon.jsx'

const priorityNames = { high: '우선 수정', medium: '개선 제안', low: '더 좋아지는 팁' }

export default function SlideIssueCard({
  issue,
  number,
  open,
  checked,
  onIssueSelect,
  onToggle,
  copySuggestion,
}) {
  const pad = (value) => String(value).padStart(2, '0')
  return (
    <article className={`deck-issue ${open ? 'open' : ''} ${checked ? 'checked' : ''}`}>
      <button
        id={`issue-${issue.id}`}
        className="deck-issue-toggle"
        aria-expanded={open}
        aria-controls={`issue-body-${issue.id}`}
        onClick={() => onIssueSelect(open ? '__none__' : issue.id)}
      >
        <span className="deck-issue-number">{pad(number + 1)}</span>
        <span>
          <span className={`deck-issue-category ${issue.priority}`}>
            {priorityNames[issue.priority]} <i>·</i> {issue.category}
          </span>
          <strong>{issue.title}</strong>
        </span>
        <Icon name={checked ? 'check' : 'down'} size={16} />
      </button>
      {open && (
        <div id={`issue-body-${issue.id}`} className="deck-issue-body">
          {issue.target && (
            <div className="deck-target">
              <span>살펴볼 부분</span>
              <p>{issue.target}</p>
            </div>
          )}
          {issue.reason && <p className="deck-reason">{issue.reason}</p>}
          {issue.suggestion && (
            <div className="deck-suggestion">
              <span>
                <Icon name="sparkle" size={14} />
                이렇게 바꿔 보세요
              </span>
              <p>{issue.suggestion}</p>
            </div>
          )}
          {issue.replacement && (
            <div className="deck-rewrite">
              {issue.original && (
                <div>
                  <span>기존 문장</span>
                  <p>{issue.original}</p>
                </div>
              )}
              <div className="deck-rewrite-after">
                <span>
                  추천 문장
                  <button
                    onClick={() => copySuggestion(issue.replacement)}
                    aria-label={`${issue.title} 추천 문장 복사`}
                  >
                    <Icon name="copy" size={13} />
                    복사
                  </button>
                </span>
                <p>{issue.replacement}</p>
              </div>
            </div>
          )}
          <button
            className="deck-review-toggle"
            aria-pressed={checked}
            onClick={() => onToggle(issue.id)}
          >
            <span>{checked && <Icon name="check" size={13} />}</span>
            {checked ? '확인 완료' : '확인 완료로 표시'}
          </button>
        </div>
      )}
    </article>
  )
}
