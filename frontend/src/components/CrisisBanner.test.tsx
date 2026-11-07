import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CrisisBanner } from './CrisisBanner'

// The message as the backend sends it (ml/src/safety.py), including its numbers and its link
const MESSAGE =
  "It sounds like you may be going through something very painful. You don't have to face it alone. " +
  'You can also reach a free, confidential crisis line: in the US call or text 988; in the UK call Samaritans on ' +
  '116 123; in India call Tele-MANAS on 14416; elsewhere, find a local line at https://findahelpline.com. ' +
  'Talking to a trusted friend can help too.'

beforeEach(() => {
  // jsdom has no IntersectionObserver
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CrisisBanner', () => {
  it('shows the backend message word for word', () => {
    const { container } = render(<CrisisBanner message={MESSAGE} />)
    expect(container.querySelector('.crisis-message')?.textContent).toBe(MESSAGE)
  })

  it('makes the phone numbers and the link tappable without changing any wording', () => {
    render(<CrisisBanner message={MESSAGE} />)
    const links = screen.getAllByRole('link').map(a => [a.textContent, a.getAttribute('href')])
    expect(links).toEqual([
      ['988', 'tel:988'],
      ['116 123', 'tel:116123'],
      ['14416', 'tel:14416'],
      ['https://findahelpline.com', 'https://findahelpline.com']
    ])
  })

  it('is announced as an alert and cannot be dismissed', () => {
    render(<CrisisBanner message={MESSAGE} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /close|dismiss/i })).toBeNull()
  })

  it('shows no helpline numbers of its own: only what the message contains', () => {
    const { container } = render(<CrisisBanner message="A different fixed message with no numbers." />)
    expect(container.textContent).not.toMatch(/988|116 123|14416|findahelpline/)
  })
})
