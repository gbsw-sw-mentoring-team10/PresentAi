import Icon from '../../components/ui/Icon.jsx'
import { SPEECH_MODES } from './speechModes.js'

export default function SpeechModeSelect({ stepNumber, value, onChange }) {
  return (
    <section className="form-section">
      <div className="form-section-title">
        <span>{stepNumber}</span>
        <h2>분석 방식</h2>
      </div>
      <p className="section-description">
        음성을 어떻게 분석할지 골라 주세요. 언제든 다시 분석할 수 있어요.
      </p>
      <div className="mode-options" role="radiogroup" aria-label="분석 방식">
        {SPEECH_MODES.map((mode) => (
          <label key={mode.id} className={`mode-option${value === mode.id ? ' selected' : ''}`}>
            <input
              type="radio"
              name="speech-mode"
              value={mode.id}
              checked={value === mode.id}
              onChange={() => onChange(mode.id)}
            />
            <span className="mode-head">
              <strong>{mode.title}</strong>
              {mode.badge && <em>{mode.badge}</em>}
              <small>
                <Icon name="clock" size={13} />
                {mode.time}
              </small>
            </span>
            <span className="mode-line good">
              <Icon name="check" size={14} />
              {mode.pros}
            </span>
            <span className="mode-line warn">
              <Icon name="alert" size={14} />
              {mode.cons}
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
