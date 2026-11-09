import AnalysisError from '../features/analysis/AnalysisError.jsx'
import MissingMaterials from '../features/analysis/MissingMaterials.jsx'
import AnalysisProgressCard from '../features/analysis/AnalysisProgressCard.jsx'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackSteps from '../features/feedback/FeedbackSteps.jsx'
import useAnalysisProgress from '../features/analysis/useAnalysisProgress.js'

const WAIT_MESSAGES = [
  '분석 서버의 응답을 기다리고 있어요. 잠시만 기다려 주세요.',
  '발표자료를 꼼꼼히 읽고 있어요.',
  '슬라이드별 핵심 내용을 살펴보고 있어요.',
  '발표 흐름이 자연스러운지 확인하고 있어요.',
  '고칠 부분과 잘한 부분을 정리하고 있어요.',
  '피드백을 읽기 쉽게 다듬는 중이에요. 거의 다 왔어요.',
  '서버가 깨어나는 중이라 시간이 조금 걸릴 수 있어요.',
]

const REQUEST_STEPS = { success: 3, loading: 1 }

export default function AnalysisPage({ form, mode, navigate, request, onRetry }) {
  const speech = mode === 'speech'
  const empty = speech ? !form.audio && !form.script.trim() : !form.file && !form.script.trim()
  const waiting = !speech && request.status === 'loading'
  const { previewStep, readFailed, elapsed, retryPreview } = useAnalysisProgress({
    speech,
    audio: form.audio,
    waiting,
    submission: request.submission,
    enabled: !empty,
  })
  const step = speech ? previewStep : REQUEST_STEPS[request.status] || 0
  const failed = speech ? readFailed : request.status === 'error'
  const percent = step === 3 ? 100 : waiting ? 7 + 85 * (1 - Math.exp(-elapsed / 8)) : step * 33 + 7
  const messageIndex = Math.floor(elapsed / 3.5) % WAIT_MESSAGES.length
  const waitMessage = WAIT_MESSAGES[messageIndex]
  const labels = speech
    ? ['음성 자료 확인', '대본·음성 비교 화면 준비', '예시 피드백 구성']
    : ['분석 요청 준비', '자료 전송 및 서버 분석', '피드백 수신 완료']
  if (empty) return <MissingMaterials speech={speech} navigate={navigate} />
  if (failed)
    return (
      <AnalysisError
        message={speech ? '파일을 읽지 못했어요. 파일을 다시 선택해 주세요.' : request.error}
        onRetry={speech ? retryPreview : onRetry}
        onBack={() => navigate(speech ? '/speech' : '/materials')}
      />
    )
  return (
    <div className="analysis-page section-wrap">
      <FeedbackSteps current={step === 3 ? 3 : 2} />
      <div className={`analysis-symbol ${step === 3 ? 'finished' : ''}`}>
        <Icon name={step === 3 ? 'check' : 'sparkle'} size={45} />
        <i />
        <i />
      </div>
      <span className="section-kicker">
        {step === 3 ? 'READY FOR YOUR NEXT STEP.' : 'A LITTLE CLARITY IS ON THE WAY.'}
      </span>
      <h1>{step === 3 ? '피드백을 만날 준비가 됐어요.' : '더 나은 발표를 위한 준비 중.'}</h1>
      <p key={step === 3 ? 'done' : messageIndex} className="fade-text">
        {step === 3
          ? '어디부터 다듬으면 좋을지, 함께 확인해 보세요.'
          : speech
            ? '잠시만 기다려 주세요. 예시 분석 과정을 체험하고 있어요.'
            : waitMessage}
      </p>
      <AnalysisProgressCard
        speech={speech}
        form={form}
        request={request}
        waiting={waiting}
        percent={percent}
        step={step}
        labels={labels}
      />
      <div aria-live="polite" className="sr-only">
        {step === 3 ? '피드백 준비가 완료되었습니다.' : labels[step]}
      </div>
      {step === 3 ? (
        <Button variant="yellow" onClick={() => navigate(speech ? '/speech-results' : '/results')}>
          피드백 결과 보기
        </Button>
      ) : (
        <button className="text-button" onClick={() => navigate(speech ? '/speech' : '/materials')}>
          입력 화면으로 돌아가기
        </button>
      )}
    </div>
  )
}
