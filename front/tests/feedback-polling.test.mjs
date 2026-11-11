import test from 'node:test'
import assert from 'node:assert/strict'
import { createFeedback, FeedbackApiError } from '../src/features/feedback/feedbackApi.js'

const form = { title: '테스트', purpose: '교육', description: '', script: '대본' }
const completed = {
  score: 85,
  feedback: '핵심이 명확해요.',
  strengths: ['좋은 구성'],
  improvements: [],
  saved_result_id: 42,
  title: '테스트',
  created_at: '2026-01-01T00:00:00',
  status: 'completed',
}

test('pending jobs are submitted once and polled until the original feedback is available', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(options.method)
    assert.equal(options.credentials, 'include')
    if (options.method === 'POST') return Response.json({ result_id: 42, status: 'pending' })
    assert.equal(url, '/api/presentation/feedback/42')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.body, undefined)
    return Response.json(
      calls.length === 2 ? { saved_result_id: 42, status: 'processing' } : completed,
    )
  })
  const result = await createFeedback(form, { pollIntervalMs: 0 })
  assert.deepEqual(calls, ['POST', 'GET', 'GET'])
  assert.equal(result.score, completed.score)
  assert.equal(result.feedback, completed.feedback)
  assert.equal(result.saved_result_id, 42)
  assert.deepEqual(result.raw_response, completed)
  assert.equal(result.raw_only, undefined)
})

test('failed jobs show the server message instead of rendering the pending response', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) =>
    Response.json(
      options.method === 'POST'
        ? { result_id: 42, status: 'pending' }
        : { saved_result_id: 42, status: 'failed', error_message: '모델 사용량 한도입니다.' },
    ),
  )
  await assert.rejects(createFeedback(form), /모델 사용량 한도/)
})

test('file storage metadata survives asynchronous polling and saved feedback normalization', async (t) => {
  const stored = {
    ...completed,
    saved_file_id: 37,
    file_name: '원본.pdf',
    file_size: 1234,
    file_content_type: 'application/pdf',
    file_storage_status: 'saved',
  }
  t.mock.method(globalThis, 'fetch', async (url, options) =>
    Response.json(options.method === 'POST' ? { result_id: 42, status: 'pending' } : stored),
  )
  const result = await createFeedback(form, { pollIntervalMs: 0 })
  assert.equal(result.saved_file_id, 37)
  assert.equal(result.file_storage_status, 'saved')
  assert.equal(result.file_name, stored.file_name)
  assert.equal(result.file_size, 1234)
})

test('failed original storage still returns completed feedback with an accurate warning', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) =>
    Response.json(
      options.method === 'POST'
        ? { result_id: 42, status: 'pending' }
        : {
            ...completed,
            file_storage_status: 'failed',
            file_storage_message: '원본 저장 실패',
          },
    ),
  )
  const result = await createFeedback(form)
  assert.equal(result.score, completed.score)
  assert.equal(result.saved_file_id, undefined)
  assert.equal(result.file_storage_status, 'failed')
  assert.equal(result.file_storage_message, '원본 저장 실패')
})

test('polling respects expired sessions without resubmitting analysis', async (t) => {
  let posts = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'POST') {
      posts++
      return Response.json({ result_id: 42, status: 'pending' })
    }
    return Response.json({ detail: '로그인이 필요합니다.' }, { status: 401 })
  })
  await assert.rejects(
    createFeedback(form),
    (error) => error instanceof FeedbackApiError && error.status === 401,
  )
  assert.equal(posts, 1)
})

test('cancelling a processing job stops polling', async (t) => {
  const controller = new AbortController()
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    if (options.method === 'POST') return Response.json({ result_id: 42, status: 'pending' })
    controller.abort()
    return Response.json({ saved_result_id: 42, status: 'processing' })
  })
  await assert.rejects(createFeedback(form, { signal: controller.signal }), { name: 'AbortError' })
  assert.equal(calls, 2)
})
