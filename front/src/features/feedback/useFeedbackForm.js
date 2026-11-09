import { useEffect, useRef, useState } from 'react'
import { example } from '../../data/examplePresentation.js'
import { MAX_SCRIPT_BYTES, validateScriptText } from './uploadRules.js'

// 입력 검증, TXT 읽기, 예시 채우기를 한곳에서 관리합니다.
export default function useFeedbackForm({ mode, form, setForm, start }) {
  const speech = mode === 'speech'
  const [scriptMode, setScriptMode] = useState('text')
  const [scriptFile, setScriptFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [readingScript, setReadingScript] = useState(false)
  const scriptReadVersion = useRef(0)
  const purposeRef = useRef(null)
  useEffect(
    () => () => {
      scriptReadVersion.current += 1
    },
    [],
  )
  const updateField = (field, value) => {
    if (field === 'script') {
      scriptReadVersion.current += 1
      setReadingScript(false)
      setScriptFile(null)
    }
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({
      ...current,
      [field]: '',
      ...(field === 'script' ? { file: '' } : {}),
    }))
  }
  function setFieldError(field, message) {
    setErrors((current) => ({ ...current, [field]: message }))
  }
  function changeScriptMode(nextMode) {
    if (nextMode === scriptMode) return
    setScriptMode(nextMode)
    if (nextMode === 'text') {
      // 직접 입력으로 돌아오면 TXT 오류 대신 현재 대본을 검증합니다.
      // 진행 중이던 파일 읽기도 무효화해 늦게 온 결과가 대본을 덮어쓰지 않게 합니다.
      scriptReadVersion.current += 1
      setReadingScript(false)
      setScriptFile(null)
      setFieldError('script', validateScriptText(form.script))
    }
  }
  async function readScript(file) {
    updateField('script', '')
    const version = ++scriptReadVersion.current
    setScriptFile(file)
    setReadingScript(!!file)
    if (!file) return
    try {
      if (file.size > MAX_SCRIPT_BYTES) {
        setFieldError('script', '대본은 50,000자 이내로 입력해 주세요.')
        setScriptFile(null)
        return
      }
      const text = await file.text()
      if (version !== scriptReadVersion.current) return
      const scriptError = validateScriptText(text)
      if (scriptError) {
        setFieldError('script', scriptError)
        setScriptFile(null)
        return
      }
      setForm((current) => ({ ...current, script: text }))
      setErrors((current) => ({ ...current, script: '', file: '' }))
    } catch {
      if (version !== scriptReadVersion.current) return
      setFieldError('script', '파일을 읽지 못했어요. 다시 선택하거나 직접 입력해 주세요.')
      setScriptFile(null)
    } finally {
      // 새 파일을 선택하거나 직접 입력했다면 이전 파일의 읽기 결과를 무시합니다.
      if (version === scriptReadVersion.current) {
        setReadingScript(false)
      }
    }
  }
  function handleSubmit(event) {
    event.preventDefault()
    if (readingScript) return
    if (!form.purpose.trim()) {
      setFieldError('purpose', '발표 목적을 입력해 주세요.')
      purposeRef.current.focus()
      return
    }
    if (!speech && !form.file && !form.script.trim()) {
      setFieldError('file', '발표자료를 선택하거나 대본을 입력해 주세요.')
      return
    }
    const scriptError = (scriptMode === 'file' && errors.script) || validateScriptText(form.script)
    if (scriptError) {
      setFieldError('script', scriptError)
      return
    }
    if (errors.audio) return
    if (errors.file && form.file) return
    start(mode)
  }
  function fillExample() {
    scriptReadVersion.current += 1
    setReadingScript(false)
    setForm({
      ...example,
      audio: speech ? { name: '리허설_1차.m4a', size: 4823449, sample: true } : null,
    })
    setErrors({})
    setScriptMode('text')
    setScriptFile(null)
  }

  return {
    errors,
    scriptMode,
    changeScriptMode,
    readingScript,
    scriptFile,
    purposeRef,
    updateField,
    setFieldError,
    readScript,
    handleSubmit,
    fillExample,
  }
}
