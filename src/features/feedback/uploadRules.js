export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024
export const MAX_SCRIPT_LENGTH = 50000
// A UTF-8 character needs at most four bytes, plus an optional three-byte BOM.
export const MAX_SCRIPT_BYTES = MAX_SCRIPT_LENGTH * 4 + 3

export function validateScriptText(script) {
  return script.length > MAX_SCRIPT_LENGTH ? '대본은 50,000자 이내로 입력해 주세요.' : ''
}

export const UPLOAD_TYPES = {
  material: {
    extensions: ['pdf', 'ppt', 'pptx', 'html', 'htm'],
    formats: 'PPT, PPTX, PDF, HTML',
    label: '발표자료',
    title: '발표자료를 여기로 가져오세요',
  },
  audio: {
    extensions: ['mp3', 'wav', 'm4a', 'ogg', 'webm'],
    formats: 'MP3, WAV, M4A, OGG, WEBM',
    label: '음성',
    title: '리허설 음성을 올려 주세요',
  },
  script: {
    extensions: ['txt'],
    formats: 'TXT',
    label: '대본',
    title: '대본 파일을 올려 주세요',
  },
}

export function validateUpload(file, kind = 'material') {
  if (!file) return ''
  const config = UPLOAD_TYPES[kind] || UPLOAD_TYPES.material
  const extension = file.name.split('.').pop().toLowerCase()
  if (!config.extensions.includes(extension)) return `${config.formats} 파일을 선택해 주세요.`
  if (!file.size) return '비어 있는 파일입니다. 다른 파일을 선택해 주세요.'
  if (file.size > MAX_UPLOAD_BYTES) return '체험 버전에서는 30MB 이하의 파일을 선택할 수 있어요.'
  return ''
}
