import { useEffect, useState } from 'react'
import { createSpeechRequest, EMPTY_SPEECH } from './speechRequest.js'

export default function useSpeechRequest() {
  const [speech, setSpeech] = useState(EMPTY_SPEECH)
  const [manager] = useState(() => createSpeechRequest(setSpeech))
  useEffect(
    () => () => {
      manager.dispose()
    },
    [manager],
  )
  return {
    speech,
    run: manager.run,
    cancel: manager.cancel,
    retryReview: manager.retryReview,
  }
}
