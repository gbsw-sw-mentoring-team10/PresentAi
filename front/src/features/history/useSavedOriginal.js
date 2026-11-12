import { useEffect, useState } from 'react'
import { getOriginalPdf } from '../feedback/fileApi.js'
import usePdfDocument from '../slides/usePdfDocument.js'

const NO_PREVIEW = { document: null, status: 'idle', error: '' }

// 저장된 PDF 원본을 불러와 슬라이드 미리보기로 만듭니다.
// enabled일 때만(슬라이드 탭을 열었을 때) 내려받고, 한 번 받은 파일은 다시 받지 않아요.
export default function useSavedOriginal({ fileId, fileName, contentType, enabled }) {
  const previewable =
    !!fileId && (contentType === 'application/pdf' || /\.pdf$/i.test(fileName || ''))
  const [download, setDownload] = useState({ fileId: null, file: null, error: '' })
  const needsDownload = enabled && previewable && download.fileId !== fileId

  useEffect(() => {
    if (!needsDownload) return
    const controller = new AbortController()
    getOriginalPdf(fileId, fileName, { signal: controller.signal })
      .then((file) => setDownload({ fileId, file, error: '' }))
      .catch((error) => {
        if (!controller.signal.aborted) setDownload({ fileId, file: null, error: error.message })
      })
    return () => controller.abort()
  }, [needsDownload, fileId, fileName])

  const pdf = usePdfDocument(download.fileId === fileId ? download.file : null)
  if (!previewable) return NO_PREVIEW
  if (needsDownload) return { document: null, status: 'loading', error: '' }
  if (download.fileId === fileId && download.error)
    return { document: null, status: 'error', error: download.error }
  return pdf
}
