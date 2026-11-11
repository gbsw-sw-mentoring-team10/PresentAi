import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackSteps from '../features/feedback/FeedbackSteps.jsx'
import {
  DeliveryPanel,
  PronunciationPanel,
  TranscriptPanel,
} from '../features/speech/SpeechResult.jsx'
import '../styles/speech-results.css'

export default function SpeechResultsPage({ speech, navigate, onRetryPronunciation }) {
  const { stt, mock, audioName, script, pronunciation } = speech
  if (!stt) {
    return (
      <div className="state-page">
        <h1>아직 분석 결과가 없어요.</h1>
        <p>리허설 음성을 올리고 분석을 시작해 주세요.</p>
        <Button onClick={() => navigate('/speech')}>음성 입력하기</Button>
      </div>
    )
  }
  return (
    <div className="results-page speech-results-page section-wrap">
      <div className="result-topline">
        <button className="back-link" onClick={() => navigate('/speech')}>
          <Icon name="back" size={16} />
          입력 화면으로
        </button>
        <FeedbackSteps current={3} />
      </div>
      <div className="page-heading">
        <div>
          <span className="section-kicker">A CLEARER STORY. A STRONGER YOU.</span>
          <h1>말을 돌아보면, 전달이 달라져요.</h1>
          <p>음성 인식 결과를 먼저 보여 드리고, 발음 평가는 준비되는 대로 채워 드려요.</p>
        </div>
      </div>
      {mock && (
        <div className="example-banner">
          <span className="tag tag-yellow">예시 결과</span>
          <p>예시 음성에 대한 서버 샘플 응답입니다. 실제로 올린 음성의 분석 결과가 아닙니다.</p>
        </div>
      )}
      <div className="result-meta">
        <div>
          <small>분석한 음성</small>
          <span>
            <Icon name="mic" size={16} />
            {audioName || '리허설 음성'}
          </span>
        </div>
      </div>
      <div className="speech-results">
        <TranscriptPanel stt={stt} pronunciation={pronunciation} />
        {script.trim() && (
          <details className="speech-panel script-details">
            <summary>
              <Icon name="file" size={18} />
              준비한 대본과 비교해 보기
            </summary>
            <p className="transcript-text">{script}</p>
          </details>
        )}
        <DeliveryPanel stt={stt} />
        <PronunciationPanel pronunciation={pronunciation} onRetry={onRetryPronunciation} />
      </div>
      <div className="result-bottom-cta">
        <div>
          <span>한 번의 점검, 더 나은 한 번의 발표.</span>
          <h3>다시 녹음해서 변화를 확인해 볼까요?</h3>
        </div>
        <Button variant="yellow" onClick={() => navigate('/speech')}>
          다시 연습하기
        </Button>
      </div>
    </div>
  )
}
