import { useEffect, useState } from 'react'

export default function usePdfDocument(file) {
  const isPdf = file instanceof Blob && /\.pdf$/i.test(file.name || '')
  const [state, setState] = useState({ file: null, document: null, status: 'idle', error: '' })
  useEffect(() => {
    if (!isPdf) return
    let cancelled = false
    let task
    // 파일을 바꾸면 이전 PDF를 지우고 새 문서를 읽는 상태로 전환합니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ file, document: null, status: 'loading', error: '' })
    async function load() {
      try {
        const [pdfjs, worker, bytes] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
          file.arrayBuffer(),
        ])
        if (cancelled) return
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        task = pdfjs.getDocument({
          data: bytes,
          isEvalSupported: false,
          useSystemFonts: true,
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/pdfjs/standard_fonts/',
          wasmUrl: '/pdfjs/wasm/',
        })
        const document = await task.promise
        if (!cancelled) setState({ file, document, status: 'ready', error: '' })
      } catch (error) {
        if (!cancelled)
          setState({
            file,
            document: null,
            status: 'error',
            error:
              error.name === 'PasswordException'
                ? '암호로 보호된 PDF는 미리 볼 수 없어요. 암호를 해제한 PDF를 사용해 주세요.'
                : 'PDF 미리보기를 불러오지 못했어요. 분석 결과는 계속 확인할 수 있어요.',
          })
      }
    }
    load()
    return () => {
      cancelled = true
      task?.destroy().catch(() => {})
    }
  }, [file, isPdf])
  if (!isPdf) return { document: null, status: 'idle', error: '' }
  if (state.file !== file) return { document: null, status: 'loading', error: '' }
  return state
}
