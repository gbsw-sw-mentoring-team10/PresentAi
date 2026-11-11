import Icon from '../../components/ui/Icon.jsx'
import useAudioRecorder, { MAX_RECORDING_SECONDS, supportsRecording } from './useAudioRecorder.js'

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export default function AudioRecorder({ onRecorded, onStart }) {
  const { status, seconds, error, start, stop } = useAudioRecorder({ onRecorded })
  if (!supportsRecording()) return null
  const recording = status === 'recording'
  return (
    <div className={`audio-recorder${recording ? ' recording' : ''}`}>
      {recording ? (
        <>
          <span className="rec-dot" aria-hidden="true" />
          <span role="timer" aria-label="녹음 시간">
            녹음 중 {clock(seconds)} / {clock(MAX_RECORDING_SECONDS)}
          </span>
          <button type="button" className="rec-button stop" onClick={stop}>
            <Icon name="check" size={16} />
            녹음 끝내기
          </button>
        </>
      ) : (
        <>
          <span className="recorder-or">또는</span>
          <button
            type="button"
            className="rec-button"
            onClick={() => {
              onStart?.()
              start()
            }}
          >
            <Icon name="mic" size={16} />
            지금 바로 녹음하기
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="field-error recorder-error">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
