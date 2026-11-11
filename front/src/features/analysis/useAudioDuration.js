import { useEffect, useState } from 'react'

// 브라우저가 읽을 수 있으면 음성 길이(초)를 알려 줍니다. 읽지 못하면 null이에요.
export default function useAudioDuration(file) {
  const [result, setResult] = useState({ file: null, seconds: null })
  useEffect(() => {
    if (!(file instanceof Blob)) return
    let cancelled = false
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const finish = (seconds) => {
      if (!cancelled) setResult({ file, seconds })
    }
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? audio.duration : null)
    audio.onerror = () => finish(null)
    audio.src = url
    return () => {
      cancelled = true
      audio.onloadedmetadata = null
      audio.onerror = null
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [file])
  return result.file === file ? result.seconds : null
}
