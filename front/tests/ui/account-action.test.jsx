import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import useAccountAction from '../../src/features/account/useAccountAction.js'

test('closing an account dialog ignores a late response even if the request ignores abort', async () => {
  let resolve
  const response = new Promise((done) => {
    resolve = done
  })
  const action = vi.fn(() => response)
  const { result, unmount } = renderHook(() => useAccountAction())
  let pending
  act(() => {
    pending = result.current.run(action)
  })
  expect(result.current.busy).toBe(true)
  expect(await result.current.run(action)).toBeNull()
  expect(action).toHaveBeenCalledOnce()
  const signal = action.mock.calls[0][0]
  unmount()
  expect(signal.aborted).toBe(true)
  resolve({ email: 'late-response@example.com' })
  await expect(pending).resolves.toBeNull()
})
