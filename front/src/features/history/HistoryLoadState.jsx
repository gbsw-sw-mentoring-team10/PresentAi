import Button from '../../components/ui/Button.jsx'

export default function HistoryLoadState({ request, onLogin, onBack }) {
  if (request.status === 'loading')
    return (
      <div className="history-empty" role="status">
        <p>저장된 피드백을 불러오고 있어요.</p>
      </div>
    )
  const expired = request.error?.status === 401
  const missing = request.error?.status === 404
  return (
    <div className="history-empty" role="alert">
      <h2>
        {expired
          ? '다시 로그인해 주세요.'
          : missing
            ? '피드백 기록을 찾을 수 없어요.'
            : '피드백을 불러오지 못했어요.'}
      </h2>
      <p>{request.error?.message}</p>
      {expired && onLogin ? (
        <Button onClick={onLogin}>로그인하기</Button>
      ) : (
        !missing && <Button onClick={request.retry}>다시 불러오기</Button>
      )}
      {onBack && (
        <Button variant="outline" icon="back" onClick={onBack}>
          목록으로
        </Button>
      )}
    </div>
  )
}
