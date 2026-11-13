import { useMemo, useState } from 'react'

export function StorageNotice({ result }) {
  const message =
    result.storage_status === 'failed'
      ? result.storage_message || '분석 결과는 받았지만 DB에 저장하지 못했어요.'
      : result.saved_result_id
        ? '분석 결과를 내 계정에 저장했어요.'
        : '이 결과는 저장되지 않았어요. 로그인한 뒤 분석하면 내 계정에 자동 저장돼요.'
  return (
    <div className="demo-notice" role="status">
      <p>{message}</p>
      {result.file_storage_status === 'failed' && (
        <p>{result.file_storage_message || '발표자료 원본을 저장하지 못했어요.'}</p>
      )}
      {result.file_storage_status === 'saved' && <p>발표자료 원본도 내 계정에 저장했어요.</p>}
    </div>
  )
}

export function ModelResponse({ value, expanded = false }) {
  const [hasOpened, setHasOpened] = useState(expanded)
  const showContent = expanded || hasOpened
  const content = useMemo(
    () => (showContent ? (typeof value === 'string' ? value : JSON.stringify(value, null, 2)) : ''),
    [showContent, value],
  )
  return (
    <details
      open={expanded}
      className="model-response"
      onToggle={(event) => {
        if (event.currentTarget.open) setHasOpened(true)
      }}
    >
      <summary>모델 응답 원문 보기</summary>
      {showContent && (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            maxHeight: '60vh',
            overflow: 'auto',
          }}
        >
          {content}
        </pre>
      )}
    </details>
  )
}
