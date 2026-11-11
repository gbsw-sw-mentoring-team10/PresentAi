import { useCallback, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackTypeIcon from '../features/history/FeedbackTypeIcon.jsx'
import HistoryMaterialDetail from '../features/history/HistoryMaterialDetail.jsx'
import HistorySpeechDetail from '../features/history/HistorySpeechDetail.jsx'
import HistoryLoadState from '../features/history/HistoryLoadState.jsx'
import { loadSavedFeedback } from '../features/history/historyApi.js'
import useHistoryRequest from '../features/history/useHistoryRequest.js'
import { feedbackTypeLabel, formatHistoryDate } from '../features/history/historyFormat.js'
import { buildApiReport, downloadTextFile } from '../features/results/feedbackReport.js'
import useToastMessage from '../hooks/useToastMessage.js'
import '../styles/history.css'

export default function HistoryDetailPage({ id, navigate, user, onLogin }) {
  const load = useCallback((options) => loadSavedFeedback(id, options), [id])
  const request = useHistoryRequest(load, user)
  if (request.status !== 'success')
    return (
      <div className="history-page section-wrap">
        <span className="section-kicker">MY FEEDBACK</span>
        <HistoryLoadState request={request} onLogin={onLogin} onBack={() => navigate('/history')} />
      </div>
    )
  const item = request.data
  if (item.status !== 'completed')
    return (
      <div className="state-page" role="status">
        <h1>
          {item.status === 'failed' ? '분석을 완료하지 못했어요.' : '아직 분석 중인 기록이에요.'}
        </h1>
        <p>{item.error_message || '잠시 후 다시 확인해 주세요.'}</p>
        <Button onClick={request.retry}>다시 불러오기</Button>
        <Button variant="outline" icon="back" onClick={() => navigate('/history')}>
          목록으로
        </Button>
      </div>
    )
  return <SavedDetail key={item.id} item={item} navigate={navigate} />
}

function SavedDetail({ item, navigate }) {
  const result = item.result
  const [tab, setTab] = useState('overview')
  const { message: toast, show: showToast } = useToastMessage()

  const speech = item.type === 'speech'
  const deck = !speech && tab === 'slides'
  function exportReport() {
    const submission = { title: item.title, purpose: item.purpose || '저장된 정보 없음' }
    downloadTextFile(buildApiReport({ result, submission }), `presentai-history-${item.id}.txt`)
    showToast('피드백 보고서를 내려받았어요.')
  }

  return (
    <div className={`results-page history-detail section-wrap ${deck ? 'deck-results-page' : ''}`}>
      <div className="result-topline">
        <button className="back-link" onClick={() => navigate('/history')}>
          <Icon name="back" size={16} />
          목록으로
        </button>
        <span className="history-detail-type">
          <FeedbackTypeIcon type={item.type} size={16} />
          {feedbackTypeLabel(item.type)}
        </span>
      </div>
      <div className="page-heading">
        <div>
          <span className="section-kicker">MY FEEDBACK · {formatHistoryDate(item.createdAt)}</span>
          <h1>{item.title}</h1>
          {item.summary && <p>{item.summary}</p>}
        </div>
        <Button variant="outline" icon="download" onClick={exportReport}>
          보고서 받기
        </Button>
      </div>
      <div className="result-meta">
        <div>
          <small>피드백 날짜</small>
          <strong>
            <time dateTime={item.createdAt}>{formatHistoryDate(item.createdAt)}</time>
          </strong>
        </div>
        {item.purpose && (
          <div>
            <small>발표 목적</small>
            <span>{item.purpose}</span>
          </div>
        )}
        {item.fileName && (
          <div>
            <small>{speech ? '분석 음성' : '분석 자료'}</small>
            <span>
              <Icon name={speech ? 'mic' : 'file'} size={16} />
              {item.fileName}
            </span>
          </div>
        )}
      </div>
      {speech ? (
        <HistorySpeechDetail
          result={result}
          comparisons={item.comparisons}
          suggestions={item.suggestions}
        />
      ) : (
        <HistoryMaterialDetail result={result} tab={tab} setTab={setTab} onNotify={showToast} />
      )}
      <div className="result-bottom-cta">
        <div>
          <span>지난 피드백을 돌아보면, 다음 발표가 보여요.</span>
          <h3>{speech ? '다시 연습해 볼까요?' : '고친 자료를 다시 점검해 볼까요?'}</h3>
        </div>
        <Button variant="yellow" onClick={() => navigate(speech ? '/speech' : '/materials')}>
          {speech ? '다시 연습하기' : '다시 점검하기'}
        </Button>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}
