import Icon from '../../components/ui/Icon.jsx'
import FeedbackTypeIcon from './FeedbackTypeIcon.jsx'
import { FEEDBACK_TYPES, formatHistoryDate } from './historyFormat.js'

export default function HistoryListItem({ item, onOpen }) {
  const href = `#/history/${item.id}`
  return (
    <li>
      <a
        className="history-item"
        href={href}
        onClick={(event) => {
          // 새 탭 열기 등 기본 동작은 그대로 둡니다.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          onOpen(item.id)
        }}
      >
        <FeedbackTypeIcon type={item.type} />
        <div className="history-item-body">
          <div className="history-item-meta">
            <span className={`history-type ${item.type}`}>{FEEDBACK_TYPES[item.type]?.short}</span>
            <time dateTime={item.createdAt}>{formatHistoryDate(item.createdAt)}</time>
          </div>
          <h2>{item.title}</h2>
          {item.fileName && (
            <span className="history-file">
              <Icon name={item.type === 'speech' ? 'mic' : 'file'} size={14} />
              <span>{item.fileName}</span>
            </span>
          )}
          {item.summary && (
            <p className="history-summary" title={item.summary}>
              {item.summary}
            </p>
          )}
        </div>
        <div className="history-item-side">
          <span className="history-score">
            <strong>{item.score}</strong>
            <small>점</small>
          </span>
          <Icon name="chevron" size={18} />
        </div>
      </a>
    </li>
  )
}
