import { useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import { feedbackHistory } from '../data/sampleHistory.js'
import HistoryListItem from '../features/history/HistoryListItem.jsx'
import '../styles/history.css'

const FILTERS = [
  { id: 'all', name: '전체' },
  { id: 'material', name: '발표자료' },
  { id: 'speech', name: '발표' },
]

// 내 피드백 조회 API가 생기면 items를 서버 응답으로 바꿔 넘겨 주세요.
export default function HistoryPage({ navigate, items = feedbackHistory }) {
  const [filter, setFilter] = useState('all')
  const visible = filter === 'all' ? items : items.filter((item) => item.type === filter)
  const count = (id) => (id === 'all' ? items.length : items.filter((i) => i.type === id).length)

  return (
    <div className="history-page section-wrap">
      <div className="page-heading">
        <div>
          <span className="section-kicker">MY FEEDBACK</span>
          <h1>내 피드백을 다시 살펴봐요.</h1>
          <p>발표자료 피드백과 발표 피드백 기록을 한곳에서 확인할 수 있어요.</p>
        </div>
      </div>
      {items.length > 0 && (
        <div className="history-toolbar">
          <div className="history-filters" role="group" aria-label="피드백 종류 필터">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                className={filter === item.id ? 'active' : ''}
                onClick={() => setFilter(item.id)}
              >
                {item.name}
                <span>{count(item.id)}</span>
              </button>
            ))}
          </div>
          <p className="history-count" aria-live="polite">
            {visible.length}개의 기록
          </p>
        </div>
      )}
      {visible.length > 0 ? (
        <ol className="history-list" aria-label="피드백 기록">
          {visible.map((item) => (
            <HistoryListItem
              key={item.id}
              item={item}
              onOpen={(id) => navigate(`/history/${id}`)}
            />
          ))}
        </ol>
      ) : (
        <div className="history-empty">
          <Icon name="list" size={30} />
          <h2>
            {items.length ? '이 종류의 피드백 기록이 아직 없어요.' : '아직 받은 피드백이 없어요.'}
          </h2>
          <p>
            발표자료나 리허설 음성을 올리면
            <br />
            받은 피드백이 이곳에 차곡차곡 쌓여요.
          </p>
          {items.length ? (
            <Button variant="outline" icon={null} onClick={() => setFilter('all')}>
              전체 기록 보기
            </Button>
          ) : (
            <Button onClick={() => navigate('/materials')}>첫 피드백 받기</Button>
          )}
        </div>
      )}
    </div>
  )
}
