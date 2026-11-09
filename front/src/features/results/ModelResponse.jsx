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
    </div>
  )
}

export function ModelResponse({ value, expanded = false }) {
  return (
    <details open={expanded} className="model-response">
      <summary>모델 응답 원문 보기</summary>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          maxHeight: '60vh',
          overflow: 'auto',
        }}
      >
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    </details>
  )
}
