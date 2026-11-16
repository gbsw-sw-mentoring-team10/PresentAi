import { useEffect, useState } from 'react'
import AnalysisError from '../features/analysis/AnalysisError.jsx'
import MissingMaterials from '../features/analysis/MissingMaterials.jsx'
import AnalysisProgressCard from '../features/analysis/AnalysisProgressCard.jsx'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackSteps from '../features/feedback/FeedbackSteps.jsx'
import useAnalysisProgress from '../features/analysis/useAnalysisProgress.js'
import { RESULT_REVEAL_DELAY } from '../features/analysis/analysisTiming.js'
import useAudioDuration from '../features/analysis/useAudioDuration.js'

const WAIT_MESSAGES = [
  '발표자료를 한 장씩 꼼꼼히 읽고 있어요.',
  '청중에게 꼭 전하고 싶은 핵심이 잘 보이는지 살펴보고 있어요.',
  '발표 목적에 맞게 이야기가 자연스럽게 이어지는지 확인하고 있어요.',
  '발표의 흐름과 전달력을 높일 수 있는 개선점을 찾고 있어요.',
  '바로 볼 수 있는 피드백을 골라 정리하고 있어요.',
  '조금만 기다려 주세요. 더 나은 발표가 가까워지고 있어요.',
]

const REQUEST_STEPS = { success: 3, loading: 1 }

// 인식과 발음 평가를 한 번에 처리해 원본 길이의 약 0.13배가 걸려서, 그보다 조금 여유 있게 막대가 차오르게 합니다.
// 정확한 분석은 Whisper가 더해져 약 0.4배, 빠른 분석은 약 0.13배가 걸려요.
const SPEECH_TIME_RATIO = { accurate: 0.5, fast: 0.18 }
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
  const received = step === 3
  const [resultReady, setResultReady] = useState(false)
  // 결과를 받아도 100%에서 잠시 로딩을 이어 가다가, 버튼과 함께 완료 화면으로 바꿔요.
  useEffect(() => {
    if (!received) return
    const timer = setTimeout(() => setResultReady(true), RESULT_REVEAL_DELAY)
    return () => clearTimeout(timer)
  }, [received])
  const finished = received && resultReady
  const shownStep = finished ? 3 : received ? 2 : step
  const interrupted = request.status === 'idle'
  const failed = request.status === 'error' || interrupted
  const audioSeconds = useAudioDuration(speech ? form.audio : null)
  const expectedSeconds =
    audioSeconds == null
      ? UNKNOWN_SPEECH_SECONDS
      : SPEECH_BASE_SECONDS +
        audioSeconds * SPEECH_TIME_RATIO[form.engine === 'fast' ? 'fast' : 'accurate']
  // 예상 시간쯤에 약 90%가 되고, 그 뒤로는 멈추지 않고 아주 천천히 100%에 다가갑니다.
  const rise = speech ? expectedSeconds / 2.3 : 8
  const percent =
    step === 3 ? 100 : waiting ? 7 + 88 * (1 - Math.exp(-elapsed / rise)) : step * 33 + 7
  const messageIndex = Math.floor(elapsed / 3.5) % WAIT_MESSAGES.length
  const waitMessage = WAIT_MESSAGES[messageIndex]
  const labels = speech
    ? ['음성 전송 준비', '음성 인식 · 발음 평가', '음성 분석 완료']
    : ['자료 전송 준비', '자료 전송 및 AI 피드백 생성', '피드백 수신 완료']
  if (empty) return <MissingMaterials speech={speech} navigate={navigate} />
  if (failed)
    return (
      <AnalysisError
        message={
          interrupted
            ? '화면을 이동하면서 분석이 중단됐어요. 다시 시도하거나 입력을 확인해 주세요.'
            : request.error
        }
        onRetry={onRetry}
        onBack={() => navigate(speech ? '/speech' : '/materials')}
      />
    )
  return (
    <div className="analysis-page section-wrap">
      <FeedbackSteps current={finished ? 3 : 2} />
      <div className={`analysis-symbol ${finished ? 'finished' : ''}`}>
        <Icon name={finished ? 'check' : 'sparkle'} size={45} />
        <i />
        <i />
      </div>
      <span className="section-kicker">
        {finished ? 'READY FOR YOUR NEXT STEP.' : 'A LITTLE CLARITY IS ON THE WAY.'}
      </span>
      <h1>{finished ? '피드백을 만날 준비가 됐어요.' : '더 나은 발표를 위한 준비 중.'}</h1>
      <p key={finished ? 'done' : received ? 'received' : messageIndex} className="fade-text">
        {finished
          ? speech
            ? '분석이 끝났어요! 이제 말한 내용과 발음 평가를 확인해 보세요. AI 리뷰는 결과 화면에서 이어서 채워져요.'
            : '분석이 끝났어요! 이제 맞춤 피드백을 확인해 보세요.'
          : received
            ? '거의 다 됐어요. 피드백을 보기 좋게 정리하고 있어요.'
            : speech
              ? '음성을 텍스트로 바꾸고 발음을 평가하고 있어요. 길이에 따라 몇십 초 걸릴 수 있어요.'
              : waitMessage}
      </p>
      <AnalysisProgressCard
        speech={speech}
        form={form}
        request={request}
        waiting={waiting || (received && !finished)}
        percent={percent}
        step={shownStep}
        labels={labels}
      />
      <div aria-live="polite" className="sr-only">
        {finished ? '피드백 준비가 완료되었습니다.' : labels[shownStep]}
      </div>
      {received ? (
        finished && (
          <Button
            variant="yellow"
            className="fade-text"
            onClick={() => navigate(speech ? '/speech-results' : '/results', { replace: true })}
          >
            피드백 결과 보기
          </Button>
        )
      ) : (
        <button className="text-button" onClick={() => navigate(speech ? '/speech' : '/materials')}>
          입력 화면으로 돌아가기
        </button>
      )}
    </div>
  )
}
