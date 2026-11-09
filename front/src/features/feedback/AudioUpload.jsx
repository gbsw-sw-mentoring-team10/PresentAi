import { useEffect, useRef } from 'react'
import FileUpload from './FileUpload.jsx'

export default function AudioUpload({ stepNumber, file, error, onFile, onError }) {
  const audioRef = useRef(null)
  const hasAudio = file instanceof Blob
  useEffect(() => {
    if (!hasAudio || !audioRef.current) return
    const audio = audioRef.current
    const url = URL.createObjectURL(file)
    audio.src = url
    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      URL.revokeObjectURL(url)
    }
  }, [file, hasAudio])

  return (
    <section className="form-section">
      <div className="form-section-title">
        <span>{stepNumber}</span>
        <h2>리허설 음성</h2>
        <span className="tag tag-muted">준비 중</span>
      </div>
      <p className="section-description">
        선택한 음성은 이 브라우저에서 미리 듣기만 할 수 있어요. 서버로 전송하거나 저장하지 않아요.
      </p>
      <FileUpload kind="audio" file={file} onFile={onFile} error={error} setError={onError} />
      {hasAudio && (
        <audio
          controls
          ref={audioRef}
          className="audio-player"
          aria-label="선택한 리허설 음성 재생"
        />
      )}
    </section>
  )
}
