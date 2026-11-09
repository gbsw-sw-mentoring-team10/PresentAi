import { useEffect, useState } from 'react'
import { createFeedbackRequest, EMPTY_REQUEST } from './feedbackRequest.js'

export default function useFeedbackRequest() {
  const [request, setRequest] = useState(EMPTY_REQUEST)
  const [manager] = useState(() => createFeedbackRequest(setRequest))

  useEffect(
    () => () => {
      manager.dispose()
    },
    [manager],
  )

  return { request, run: manager.run, cancel: manager.cancel }
}
