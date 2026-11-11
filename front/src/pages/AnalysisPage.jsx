import AnalysisError from '../features/analysis/AnalysisError.jsx'
import MissingMaterials from '../features/analysis/MissingMaterials.jsx'
import AnalysisProgressCard from '../features/analysis/AnalysisProgressCard.jsx'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackSteps from '../features/feedback/FeedbackSteps.jsx'
import useAnalysisProgress from '../features/analysis/useAnalysisProgress.js'
import useAudioDuration from '../features/analysis/useAudioDuration.js'

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

// 인식과 발음 평가를 한 번에 처리해 원본 길이의 약 0.13배가 걸려서, 그보다 조금 여유 있게 막대가 차오르게 합니다.
const SPEECH_TIME_RATIO = 0.18
const SPEECH_BASE_SECONDS = 4
const UNKNOWN_SPEECH_SECONDS = 30

export default function AnalysisPage({
  form,
  mode,
  navigate,
  request: feedbackRequest,
  speechRequest,
  onRetry,
}) {
  const speech = mode === 'speech'
  // 음성은 텍스트 변환과 발음 평가가 모두 끝나면 결과로 넘어가고, AI 리뷰는 결과 화면에서 이어집니다.
  const request = speech
    ? {
        status:
          { transcribing: 'loading', idle: 'idle', error: 'error' }[speechRequest.status] ||
          'success',
        error: speechRequest.error,
        submission: speechRequest,
        mock: speechRequest.mock,
      }
    : feedbackRequest
  const empty = speech ? !form.audio : !form.file && !form.script.trim()
  const waiting = request.status === 'loading'
  const { elapsed } = useAnalysisProgress({
    speech: false,
    audio: form.audio,
    waiting,
    submission: request.submission,
    enabled: !empty,
  })
  const step = REQUEST_STEPS[request.status] || 0
  const failed = request.status === 'error'
  const audioSeconds = useAudioDuration(speech ? form.audio : null)
  const expectedSeconds =
    audioSeconds == null
      ? UNKNOWN_SPEECH_SECONDS
      : SPEECH_BASE_SECONDS + audioSeconds * SPEECH_TIME_RATIO
  // 예상 시간쯤에 약 90%가 되고, 그 뒤로는 멈추지 않고 아주 천천히 100%에 다가갑니다.
  const rise = speech ? expectedSeconds / 2.3 : 8
  const percent =
    step === 3 ? 100 : waiting ? 7 + 88 * (1 - Math.exp(-elapsed / rise)) : step * 33 + 7
  const messageIndex = Math.floor(elapsed / 3.5) % WAIT_MESSAGES.length
  const waitMessage = WAIT_MESSAGES[messageIndex]
  const labels = speech
    ? ['음성 전송 준비', '음성 인식 · 발음 평가', '분석 완료']
    : ['분석 요청 준비', '자료 전송 및 서버 분석', '피드백 수신 완료']
  if (empty) return <MissingMaterials speech={speech} navigate={navigate} />
  if (failed)
    return (
      <AnalysisError
        message={request.error}
        onRetry={onRetry}
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
          ? speech
            ? '말한 내용과 발음 평가를 함께 보여 드릴게요. AI 리뷰는 결과 화면에서 이어서 채워져요.'
            : '어디부터 다듬으면 좋을지, 함께 확인해 보세요.'
          : speech
            ? '음성을 텍스트로 바꾸고 발음을 평가하고 있어요. 길이에 따라 몇십 초 걸릴 수 있어요.'
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
