import { example } from '../../data/examplePresentation.js'

const EXAMPLE_AUDIO = { name: '리허설_1차.m4a', size: 4823449, sample: true }

const TEXT_FIELDS = ['title', 'purpose', 'description', 'script']

export function createExampleForm(mode) {
  return { ...example, audio: mode === 'speech' ? EXAMPLE_AUDIO : null }
}

// 예시 채우기로 들어간 가상 파일입니다. 실제 바이트가 없어 서버로 보낼 수 없어요.
export function isSampleFile(file) {
  return !!file?.sample && !(file instanceof Blob)
}

// 내용이 예시와 한 글자라도 다르면 사용자 자료로 봅니다.
export function isExampleForm(form, mode = 'material') {
  if (!form || TEXT_FIELDS.some((field) => form[field] !== example[field])) return false
  if (mode === 'speech') return isSampleFile(form.audio)
  return isSampleFile(form.file) && form.audio == null
}

// 사용자 자료에 남은 예시 파일은 전송·표시하지 않도록 빼 둡니다.
export function withoutSampleFiles(form) {
  const file = isSampleFile(form.file)
  const audio = isSampleFile(form.audio)
  if (!file && !audio) return form
  return { ...form, ...(file ? { file: null } : {}), ...(audio ? { audio: null } : {}) }
}

export function prepareSubmission(form, mode) {
  return isExampleForm(form, mode) ? form : withoutSampleFiles(form)
}

const INPUT_ROUTES = { '/materials': 'material', '/speech': 'speech' }

// 같은 흐름의 분석 화면에서 입력 화면으로 돌아올 때만 입력을 유지합니다.
// leftFlow는 입력·분석 화면 밖으로 한 번이라도 나갔는지예요. 뒤로 가기로 돌아와도 비웁니다.
export function shouldResetForm(previousRoute, nextRoute, mode, leftFlow = false) {
  const nextMode = INPUT_ROUTES[nextRoute]
  if (!nextMode || previousRoute === nextRoute) return false
  return leftFlow || !(previousRoute === '/analysis' && mode === nextMode)
}

// 입력 화면에 들어오면 새로 시작하고, 분석 화면은 이전 상태를 이어받아요.
export function hasLeftFormFlow(route, leftFlow) {
  if (INPUT_ROUTES[route]) return false
  return route === '/analysis' ? leftFlow : true
}
