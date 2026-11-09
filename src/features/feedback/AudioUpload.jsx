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
      <p className="section-description">음성 피드백의 입력 화면을 미리 체험해 보세요.</p>
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
