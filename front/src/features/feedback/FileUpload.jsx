import { useRef, useState } from 'react'
import Icon from '../../components/ui/Icon.jsx'
import { UPLOAD_TYPES, validateUpload } from './uploadRules.js'

export default function FileUpload({ file, onFile, kind = 'material', error, setError }) {
  const input = useRef(null)
  const [drag, setDrag] = useState(false)
  const config = UPLOAD_TYPES[kind] || UPLOAD_TYPES.material
  function choose(file) {
    if (!file) return
    const message = validateUpload(file, kind)
    setError(message)
    if (!message) onFile(file)
  }
  return (
    <div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        aria-label={`${config.label} 파일 선택`}
        accept={config.extensions.map((x) => `.${x}`).join(',')}
        onChange={(e) => {
          choose(e.target.files[0])
          e.target.value = ''
        }}
      />
      {file ? (
        <div className="selected-file">
          <span className="file-icon">
            <Icon name={kind === 'audio' ? 'mic' : 'file'} size={24} />
          </span>
          <div>
            <strong>{file.name}</strong>
            <small>
              {(file.size / 1024 / 1024).toFixed(1)} MB ·{' '}
              {file.sample ? '예시 파일' : '파일 선택 완료'}
            </small>
          </div>
          <span className="file-ok">
            <Icon name="check" size={16} />
          </span>
          <button
            className="icon-button"
            type="button"
            aria-label="선택한 파일 삭제"
            onClick={() => onFile(null)}
          >
            <Icon name="close" size={17} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`upload-zone ${drag ? 'dragging' : ''} ${error ? 'invalid' : ''}`}
          onClick={() => input.current.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            if (e.dataTransfer.files.length > 1) setError('파일은 한 번에 하나씩 선택해 주세요.')
            else choose(e.dataTransfer.files[0])
          }}
        >
          <span className="upload-icon">
            <Icon name="upload" size={26} />
          </span>
          <strong>{config.title}</strong>
          <span className="upload-desktop">
            파일을 끌어다 놓거나 <b>컴퓨터에서 선택</b>
          </span>
          <span className="upload-mobile">
            <b>기기에서 파일 선택</b>
          </span>
          <small>{config.formats} · 최대 30MB</small>
        </button>
      )}
      {error && (
        <p role="alert" className="field-error">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
