import Icon from '../../components/ui/Icon.jsx'

import FileUpload from './FileUpload.jsx'

export default function MaterialUpload({ file, error, onFile, onError }) {
  return (
    <section className="form-section">
      <div className="form-section-title">
        <span>02</span>
        <h2>발표자료</h2>
      </div>
      <FileUpload file={file} onFile={onFile} error={error} setError={onError} />
      <p className="privacy-note">
        <Icon name="shield" size={13} />
        분석 시작 시 선택한 발표자료가 분석 서버로 전송됩니다.
      </p>
    </section>
  )
}
