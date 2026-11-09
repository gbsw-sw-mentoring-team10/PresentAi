import Icon from '../../components/ui/Icon.jsx'

export default function AnalysisProgressCard({
  speech,
  form,
  request,
  waiting,
  percent,
  step,
  labels,
}) {
  return (
    <div className="analysis-card">
      <div className="analysis-file">
        <Icon name={speech ? 'mic' : 'file'} size={24} />
        <div>
          <b>{(speech ? form.audio : form.file)?.name || '직접 입력한 대본'}</b>
          <small>
            {speech
              ? '음성 피드백 · 기능 미리보기'
              : request.mock
                ? '예시 자료 · 서버 샘플 분석'
                : '발표자료 · 서버 분석'}
          </small>
        </div>
      </div>
      <div
        className={`progress-track ${waiting ? 'loading' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={step === 3 ? 100 : undefined}
        aria-label="분석 진행 상태"
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <ol className="analysis-steps">
        {labels.map((label, i) => (
          <li key={label} className={step > i ? 'done' : step === i ? 'running' : ''}>
            <span>
              {step > i ? <Icon name="check" size={15} /> : String(i + 1).padStart(2, '0')}
            </span>
            {label}
            <small>{step > i ? '완료' : step === i ? '진행 중' : '대기'}</small>
          </li>
        ))}
      </ol>
    </div>
  )
}
