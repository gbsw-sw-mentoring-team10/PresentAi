import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import FeedbackPage from '../../src/pages/FeedbackPage.jsx'

const EMPTY_FORM = { purpose: '', title: '', description: '', script: '', file: null, audio: null }

function Harness({ mode }) {
  const [form, setForm] = useState(EMPTY_FORM)
  return (
    <>
      <FeedbackPage
        mode={mode}
        form={form}
        setForm={setForm}
        navigate={() => {}}
        start={() => {}}
      />
      <output data-testid="engine">{form.engine ?? 'unset'}</output>
    </>
  )
}

test('speech form explains both modes, preselects the accurate one and lets users switch', async () => {
  const user = userEvent.setup()
  render(<Harness mode="speech" />)
  const group = screen.getByRole('radiogroup', { name: '분석 방식' })
  const accurate = screen.getByRole('radio', { name: /정확한 분석/ })
  const fast = screen.getByRole('radio', { name: /빠른 분석/ })
  expect(accurate.checked).toBe(true)
  expect(group.textContent).toContain('오래 걸려요')
  expect(group.textContent).toContain('부정확할 수 있어요')
  await user.click(fast)
  expect(screen.getByTestId('engine').textContent).toBe('fast')
  expect(fast.checked).toBe(true)
})

test('the material form has no analysis mode picker', () => {
  render(<Harness mode="material" />)
  expect(screen.queryByRole('radiogroup', { name: '분석 방식' })).toBeNull()
})
