import { useCallback, useEffect, useRef, useState } from 'react'
import { createExampleForm, isExampleForm, isSampleFile } from './exampleForm.js'
import { MAX_SCRIPT_BYTES, validateScriptText } from './uploadRules.js'

export const SAMPLE_FILE_ONLY_ERROR =
  '예시 파일은 실제 파일이 아니라 분석에 쓸 수 없어요. 발표자료를 선택하거나 대본을 입력해 주세요.'
export const SAMPLE_AUDIO_ONLY_ERROR =
  '예시 음성은 실제 파일이 아니라 미리보기에 쓸 수 없어요. 음성을 선택하거나 대본을 입력해 주세요.'

// 입력 검증, TXT 읽기, 예시 채우기를 한곳에서 관리합니다.
export default function useFeedbackForm({ mode, form, setForm, start }) {
  const speech = mode === 'speech'
  const [scriptMode, setScriptMode] = useState('text')
  const [scriptFile, setScriptFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [readingScript, setReadingScript] = useState(false)
  const [sampleWarning, setSampleWarning] = useState(false)
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
      ...(field === 'script'
        ? {
            file: '',
            audio: current.audio === SAMPLE_AUDIO_ONLY_ERROR ? '' : current.audio,
          }
        : {}),
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
    if (speech && !form.audio) {
      setFieldError('audio', '분석할 리허설 음성을 선택해 주세요.')
      return
    }
    const example = isExampleForm(form, mode)
    // 사용자 자료라면 예시 파일은 첨부되지 않은 것으로 봅니다.
    const sampleField = example ? null : speech ? 'audio' : 'file'
    const hasSample = !!sampleField && isSampleFile(form[sampleField])
    const hasScript = !!form.script.trim()
    if (!speech && !hasScript && (!form.file || hasSample)) {
      setFieldError(
        'file',
        hasSample ? SAMPLE_FILE_ONLY_ERROR : '발표자료를 선택하거나 대본을 입력해 주세요.',
      )
      return
    }
    if (speech && hasSample && !hasScript) {
      setFieldError('audio', SAMPLE_AUDIO_ONLY_ERROR)
      return
    }
    const scriptError = (scriptMode === 'file' && errors.script) || validateScriptText(form.script)
    if (scriptError) {
      setFieldError('script', scriptError)
      return
    }
    if (errors.audio) return
    if (errors.file && form.file) return
    if (hasSample) {
      setSampleWarning(true)
      return
    }
    start(mode)
  }
  const closeSampleWarning = useCallback(() => setSampleWarning(false), [])
  function continueWithoutSample() {
    setSampleWarning(false)
    start(mode)
  }
  function reselectFile() {
    const field = speech ? 'audio' : 'file'
    setSampleWarning(false)
    updateField(field, null)
    // 대화상자가 닫힌 뒤 비워진 업로드 영역으로 초점을 옮깁니다.
    requestAnimationFrame(() => {
      document.querySelector(`#${field}-upload .upload-zone`)?.focus()
    })
  }
  function fillExample() {
    scriptReadVersion.current += 1
    setReadingScript(false)
    setForm(createExampleForm(mode))
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
    sampleWarning,
    closeSampleWarning,
    continueWithoutSample,
    reselectFile,
  }
}
