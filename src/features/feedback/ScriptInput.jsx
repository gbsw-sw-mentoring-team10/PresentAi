import Icon from '../../components/ui/Icon.jsx'

import FileUpload from './FileUpload.jsx'

import { MAX_SCRIPT_LENGTH } from './uploadRules.js'

export default function ScriptInput({
  stepNumber,
  scriptMode,
  onModeChange,
  script,
  onScriptChange,
  scriptFile,
  onScriptFileChange,
  error,
  onError,
}) {
  return (
    <section className="form-section">
      <div className="form-section-title">
        <span>{stepNumber}</span>
        <h2>발표 대본</h2>
        <small>선택</small>
      </div>
      <p className="section-description">준비한 대본이 있다면 함께 넣어 주세요.</p>
      <div className="segmented" role="group" aria-label="대본 입력 방식">
        <button
          type="button"
          aria-pressed={scriptMode === 'text'}
          className={scriptMode === 'text' ? 'active' : ''}
          onClick={() => onModeChange('text')}
        >
          <Icon name="edit" size={15} />
          직접 입력
        </button>
        <button
          type="button"
          aria-pressed={scriptMode === 'file'}
          className={scriptMode === 'file' ? 'active' : ''}
          onClick={() => onModeChange('file')}
        >
          <Icon name="upload" size={15} />
          TXT 업로드
        </button>
      </div>
      {scriptMode === 'text' ? (
        <div className="script-input">
          <textarea
            aria-label="발표 대본"
            aria-invalid={!!error}
            aria-describedby={error ? 'script-error' : undefined}
            maxLength={MAX_SCRIPT_LENGTH}
            rows={6}
            value={script}
            onChange={(e) => onScriptChange(e.target.value)}
            placeholder="안녕하세요. 오늘은…"
          />
          <span>{script.length.toLocaleString()} / 50,000자</span>
          {error && (
            <p id="script-error" role="alert" className="field-error">
              <Icon name="alert" size={14} />
              {error}
            </p>
          )}
        </div>
      ) : (
        <FileUpload
          kind="script"
          file={scriptFile}
          onFile={onScriptFileChange}
          error={error}
          setError={onError}
        />
      )}
    </section>
  )
}
