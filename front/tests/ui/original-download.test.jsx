import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import OriginalFileDownload from '../../src/features/results/OriginalFileDownload.jsx'
import { StorageNotice } from '../../src/features/results/ModelResponse.jsx'

afterEach(() => vi.restoreAllMocks())

test('original download gets a new URL on every click and does not expose the session to S3', async () => {
  const links = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    links.push({ href: this.href, download: this.download, rel: this.rel })
  })
  let calls = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options) => {
      expect(url).toBe('/api/presentation/files/37/download')
      expect(options.credentials).toBe('include')
      return Response.json({
        file_id: 37,
        file_name: '원본.pdf',
        download_url: `https://synthetic.example/file?attempt=${++calls}`,
      })
    }),
  )
  const events = userEvent.setup()
  render(<OriginalFileDownload fileId={37} />)
  await events.click(screen.getByRole('button', { name: '원본 자료 받기' }))
  await waitFor(() => expect(links).toHaveLength(1))
  await events.click(screen.getByRole('button', { name: '원본 자료 받기' }))
  await waitFor(() => expect(links).toHaveLength(2))
  expect(links[0]).toEqual({
    href: 'https://synthetic.example/file?attempt=1',
    download: '원본.pdf',
    rel: 'noreferrer',
  })
  expect(links[1].href).toContain('attempt=2')
})

test('expired sessions show a retryable message without starting a download', async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({}, { status: 401 })),
  )
  const events = userEvent.setup()
  render(<OriginalFileDownload fileId={37} />)
  await events.click(screen.getByRole('button', { name: '원본 자료 받기' }))
  expect((await screen.findByRole('alert')).textContent).toContain('다시 로그인')
  expect(click).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '원본 자료 받기' }).disabled).toBe(false)
})

test('failed original storage is distinguished from successfully saved analysis', () => {
  render(
    <StorageNotice
      result={{
        saved_result_id: 42,
        file_storage_status: 'failed',
        file_storage_message: '원본 저장 실패',
      }}
    />,
  )
  expect(screen.getByText('분석 결과를 내 계정에 저장했어요.')).toBeTruthy()
  expect(screen.getByText('원본 저장 실패')).toBeTruthy()
  expect(screen.queryByText('발표자료 원본도 내 계정에 저장했어요.')).toBeNull()
})
