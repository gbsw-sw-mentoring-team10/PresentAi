import { useEffect, useRef, useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import { getOriginalDownload } from '../feedback/fileApi.js'

export default function OriginalFileDownload({ fileId }) {
  const request = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => () => request.current?.abort(), [])

  if (!fileId) return null

  async function download() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    try {
      // 저장된 링크를 재사용하지 않고 누를 때마다 유효한 주소를 발급받습니다.
      const file = await getOriginalDownload(fileId, { signal: controller.signal })
      if (controller.signal.aborted) return
      const link = document.createElement('a')
      link.href = file.download_url
      link.download = file.file_name
      link.rel = 'noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <div className="original-download">
      <Button
        variant="outline"
        icon="download"
        onClick={download}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? '원본 준비 중…' : '원본 자료 받기'}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
