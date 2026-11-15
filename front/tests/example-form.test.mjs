import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createExampleForm,
  isExampleForm,
  prepareSubmission,
  withoutSampleFiles,
} from '../src/features/feedback/exampleForm.js'
import { createFeedbackRequest } from '../src/features/feedback/feedbackRequest.js'

const result = { score: 90, feedback: '명확해요.', strengths: [], improvements: [] }

test('only an untouched example form counts as the example', () => {
  const material = createExampleForm('material')
  const speech = createExampleForm('speech')
  assert.equal(isExampleForm(material, 'material'), true)
  assert.equal(isExampleForm(speech, 'speech'), true)
  for (const field of ['title', 'purpose', 'description', 'script']) {
    assert.equal(isExampleForm({ ...material, [field]: `${material[field]} ` }), false, field)
    assert.equal(isExampleForm({ ...speech, [field]: '' }, 'speech'), false, field)
  }
  // 수정 후 원래 내용으로 되돌리면 다시 예시로 봅니다.
  assert.equal(isExampleForm({ ...material, title: material.title }), true)
})

test('replacing or removing the sample attachment makes the form user data', () => {
  const material = createExampleForm('material')
  const real = new File(['bytes'], material.file.name, { type: 'application/pdf' })
  assert.equal(isExampleForm({ ...material, file: null }), false)
  assert.equal(isExampleForm({ ...material, file: real }), false)
  // Blob에 sample 속성이 붙어도 실제 파일입니다.
  assert.equal(isExampleForm({ ...material, file: Object.assign(real, { sample: true }) }), false)
  assert.equal(isExampleForm({ ...material, audio: new File(['a'], 'a.m4a') }), false)

  const speech = createExampleForm('speech')
  assert.equal(isExampleForm({ ...speech, audio: null }, 'speech'), false)
  assert.equal(isExampleForm({ ...speech, audio: new File(['a'], 'a.m4a') }, 'speech'), false)
  assert.equal(isExampleForm(speech, 'material'), false)
  assert.equal(isExampleForm(null), false)
})

test('user submissions drop only virtual sample files', () => {
  const material = createExampleForm('material')
  assert.equal(prepareSubmission(material, 'material'), material)
  const edited = { ...createExampleForm('speech'), title: '수정' }
  assert.deepEqual(prepareSubmission(edited, 'speech'), { ...edited, file: null, audio: null })
  const real = { ...edited, file: new File(['x'], 'x.pdf'), audio: null }
  assert.equal(withoutSampleFiles(real), real)
})

test('the request uses the sample API only for an untouched example', async () => {
  const sent = []
  const states = []
  const manager = createFeedbackRequest((state) => states.push(state), {
    send: async (form, options) => {
      sent.push({ form, mock: options.mock })
      return result
    },
    schedule: () => 0,
    unschedule: () => {},
  })
  await manager.run(createExampleForm('material'))
  assert.equal(sent[0].mock, true)
  assert.equal(states.at(-1).mock, true)
  assert.equal(states.at(-1).submission.file.sample, true)

  await manager.run({ ...createExampleForm('material'), script: '내가 쓴 대본', title: '' })
  assert.equal(sent[1].mock, false)
  assert.equal(sent[1].form.file, null)
  assert.equal(states.at(-1).mock, false)
  assert.equal(states.at(-1).submission.file, null)
  // 예시 파일 이름을 제목으로 빌려 쓰지 않습니다.
  assert.equal(states.at(-1).submission.title, sent[1].form.purpose)
})
