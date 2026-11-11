import { useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import HistoryListItem from '../features/history/HistoryListItem.jsx'
import HistoryLoadState from '../features/history/HistoryLoadState.jsx'
import { deleteSavedFeedback, loadFeedbackHistory } from '../features/history/historyApi.js'
import useHistoryRequest from '../features/history/useHistoryRequest.js'
import '../styles/history.css'

const FILTERS = [
  { id: 'all', name: '전체' },
  { id: 'material', name: '발표자료' },
  { id: 'speech', name: '발표' },
]

export default function HistoryPage({ navigate, user, onLogin }) {
  const request = useHistoryRequest(loadFeedbackHistory, user)
  const [removed, setRemoved] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const items = (request.data || []).filter((item) => !removed.includes(item.id))
  const [filter, setFilter] = useState('all')
  const visible = filter === 'all' ? items : items.filter((item) => item.type === filter)
  const count = (id) => (id === 'all' ? items.length : items.filter((i) => i.type === id).length)

  async function handleDelete(item) {
    if (
      !window.confirm(
        `"${item.title}" 기록과 저장된 원본 파일을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`,
      )
    )
      return
    setDeletingId(item.id)
    setDeleteError('')
    try {
      await deleteSavedFeedback(item.id)
      setRemoved((ids) => [...ids, item.id])
    } catch (error) {
      if (error.status === 404) setRemoved((ids) => [...ids, item.id])
      else setDeleteError(error.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="history-page section-wrap">
      <div className="page-heading">
        <div>
          <span className="section-kicker">MY FEEDBACK</span>
          <h1>내 피드백을 다시 살펴봐요.</h1>
          <p>내 계정에 저장된 발표자료와 대본 피드백을 다시 확인할 수 있어요.</p>
        </div>
      </div>
      {request.status !== 'success' ? (
        <HistoryLoadState request={request} onLogin={onLogin} />
      ) : (
        <>
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
          {deleteError && (
            <p className="history-delete-error" role="alert">
              {deleteError}
            </p>
          )}
          {visible.length > 0 ? (
            <ol className="history-list" aria-label="피드백 기록">
              {visible.map((item) => (
                <HistoryListItem
                  key={item.id}
                  item={item}
                  onOpen={(id) => navigate(`/history/${id}`)}
                  onDelete={handleDelete}
                  deleting={deletingId === item.id}
                />
              ))}
            </ol>
          ) : (
            <div className="history-empty">
              <Icon name="list" size={30} />
              <h2>
                {items.length
                  ? '이 종류의 피드백 기록이 아직 없어요.'
                  : '아직 받은 피드백이 없어요.'}
              </h2>
              <p>
                로그인한 뒤 발표자료나 대본을 분석하면
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
        </>
      )}
    </div>
  )
}
