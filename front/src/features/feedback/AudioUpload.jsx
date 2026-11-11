import { useEffect, useRef } from 'react'
import AudioRecorder from './AudioRecorder.jsx'
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
    <section className="form-section" id="audio-upload">
      <div className="form-section-title">
        <span>{stepNumber}</span>
        <h2>리허설 음성</h2>
      </div>
      <p className="section-description">
        파일을 올리거나 바로 녹음할 수 있어요. 분석 시작 시 음성이 분석 서버로 전송돼 텍스트 변환과
        발음 평가에 쓰여요. 음성은 저장하지 않아요.
      </p>
      <FileUpload kind="audio" file={file} onFile={onFile} error={error} setError={onError} />
      {!file && <AudioRecorder onRecorded={onFile} onStart={() => onError('')} />}
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
