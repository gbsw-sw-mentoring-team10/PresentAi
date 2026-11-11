import { useCallback, useEffect, useRef, useState } from 'react'

export const MAX_RECORDING_SECONDS = 600

const FORMATS = [
  ['audio/webm;codecs=opus', 'webm'],
  ['audio/webm', 'webm'],
  ['audio/mp4', 'm4a'],
  ['audio/ogg;codecs=opus', 'ogg'],
]

export function supportsRecording() {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder === 'function' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

function pickFormat() {
  return FORMATS.find(([type]) => MediaRecorder.isTypeSupported?.(type)) || [null, 'webm']
}

function recordingName(extension) {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
  return `녹음_${stamp}.${extension}`
}

function errorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError')
    return '마이크 사용이 허용되지 않았어요. 브라우저 주소창에서 마이크 권한을 허용해 주세요.'
  if (error?.name === 'NotFoundError') return '사용할 수 있는 마이크를 찾지 못했어요.'
  return '녹음을 시작하지 못했어요. 마이크 연결을 확인해 주세요.'
}

// 마이크 녹음을 시작·종료하고, 끝나면 File로 만들어 onRecorded에 넘겨 줍니다.
export default function useAudioRecorder({ onRecorded }) {
  const [state, setState] = useState({ status: 'idle', seconds: 0, error: '' })
  const session = useRef(null)
  const onRecordedRef = useRef(onRecorded)
  useEffect(() => {
    onRecordedRef.current = onRecorded
  })

  const release = useCallback(() => {
    const current = session.current
    session.current = null
    if (!current) return null
    clearInterval(current.timer)
    current.stream.getTracks().forEach((track) => track.stop())
    return current
  }, [])

  // 화면을 떠날 때는 녹음을 버리고 마이크를 놓습니다.
  useEffect(
    () => () => {
      const current = release()
      if (current) {
        current.discard = true
        if (current.recorder.state !== 'inactive') current.recorder.stop()
      }
    },
    [release],
  )

  const stop = useCallback(() => {
    const current = session.current
    if (current?.recorder.state === 'recording') current.recorder.stop()
  }, [])

  const start = useCallback(async () => {
    if (session.current) return
    if (!supportsRecording()) {
      setState({
        status: 'idle',
        seconds: 0,
        error: '이 브라우저에서는 녹음을 지원하지 않아요. 파일을 올려 주세요.',
      })
      return
    }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      setState({ status: 'idle', seconds: 0, error: errorMessage(error) })
      return
    }
    const [mimeType, extension] = pickFormat()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks = []
    const current = { recorder, stream, timer: null, discard: false }
    session.current = current
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data)
    }
    recorder.onerror = () => {
      release()
      setState({
        status: 'idle',
        seconds: 0,
        error: '녹음 중 문제가 생겼어요. 다시 시도해 주세요.',
      })
    }
    recorder.onstop = () => {
      release()
      if (current.discard) return
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
      setState({ status: 'idle', seconds: 0, error: '' })
      if (blob.size)
        onRecordedRef.current(new File([blob], recordingName(extension), { type: blob.type }))
      else
        setState({ status: 'idle', seconds: 0, error: '녹음된 소리가 없어요. 다시 녹음해 주세요.' })
    }
    const startedAt = Date.now()
    current.timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000)
      setState((value) => (value.status === 'recording' ? { ...value, seconds } : value))
      if (seconds >= MAX_RECORDING_SECONDS) stop()
    }, 250)
    recorder.start()
    setState({ status: 'recording', seconds: 0, error: '' })
  }, [release, stop])

  return { ...state, start, stop }
}
