import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import { DIARY_KEY, dayKey } from '../services/diaryStore'
import type { AnalysisResponse, MultiAnswerAnalysisResult, SafetyResponse } from '../types'
import { DiaryView } from './DiaryView'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  checkSafety: vi.fn(),
  analyzeText: vi.fn()
}))

const MESSAGE = 'FIXED MESSAGE from the safety layer. Call 988.'
const TODAY = dayKey(new Date())

const safety = (flag: boolean): SafetyResponse => ({ crisis_flag: flag, crisis_message: flag ? MESSAGE : null, disclaimer: 'd' })
const analysis = (score: number): AnalysisResponse => ({
  stress_score: score, label: score >= 0.5 ? 'higher_signal' : 'lower_signal', explanation: [],
  crisis_flag: false, crisis_message: null, disclaimer: 'd'
})

/** App keeps the drafts and the result; this stands in for it. */
function Harness({ onCrisis }: { onCrisis: (message: string) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [result, setResult] = useState<MultiAnswerAnalysisResult | null>(null)
  return <DiaryView drafts={drafts} onDraftsChange={setDrafts} result={result} onResult={setResult} onCrisis={onCrisis} />
}

const write = (text: string) =>
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } })
const saved = () => JSON.parse(localStorage.getItem(DIARY_KEY) ?? '{}') as Record<string, { text: string }>

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('DiaryView', () => {
  it('saves the entry on this device and runs the safety check on it', async () => {
    vi.mocked(api.checkSafety).mockResolvedValue(safety(false))
    const onCrisis = vi.fn()
    render(<Harness onCrisis={onCrisis} />)

    write('A calm day.')
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }))

    await waitFor(() => expect(screen.getByText('Saved on this device.')).toBeTruthy())
    expect(api.checkSafety).toHaveBeenCalledWith('A calm day.')
    expect(saved()[TODAY].text).toBe('A calm day.')
    expect(onCrisis).not.toHaveBeenCalled()
  })

  it('shows the fixed crisis message, unchanged, when a saved entry is flagged', async () => {
    vi.mocked(api.checkSafety).mockResolvedValue(safety(true))
    const onCrisis = vi.fn()
    render(<Harness onCrisis={onCrisis} />)

    write('something worrying')
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }))

    await waitFor(() => expect(onCrisis).toHaveBeenCalledWith(MESSAGE))
    expect(api.analyzeText).not.toHaveBeenCalled() // noticed at save time, with no signal check run
  })

  it('keeps the entry and says the safety check could not run when the service is down', async () => {
    vi.mocked(api.checkSafety).mockRejectedValue(new Error('offline'))
    render(<Harness onCrisis={vi.fn()} />)

    write('what I wrote today')
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }))

    await waitFor(() => expect(screen.getByText(/couldn't reach the service that runs the safety check/)).toBeTruthy())
    expect(saved()[TODAY].text).toBe('what I wrote today')
    expect(screen.getByRole('link', { name: 'findahelpline.com' })).toBeTruthy()
  })

  it('does not offer to save a blank entry or run a signal check with no entries', () => {
    render(<Harness onCrisis={vi.fn()} />)
    expect((screen.getByRole('button', { name: 'Save entry' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Run signal check on 0 entries/ }) as HTMLButtonElement).disabled).toBe(true)
    write('   ')
    expect((screen.getByRole('button', { name: 'Save entry' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('runs the signal check on each saved entry separately and shows the average by day', async () => {
    vi.mocked(api.checkSafety).mockResolvedValue(safety(false))
    vi.mocked(api.analyzeText).mockImplementation(async ({ text }) => analysis(text === 'first' ? 0.2 : 0.8))
    render(<Harness onCrisis={vi.fn()} />)

    write('first')
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }))
    await waitFor(() => expect(Object.keys(saved())).toHaveLength(1))

    // a second saved day, reached by clicking an earlier day in the week bar
    fireEvent.click(screen.getAllByRole('button', { name: /Wednesday|Tuesday|Monday|Thursday|Friday|Saturday|Sunday/ })[0])
    write('second')
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }))
    await waitFor(() => expect(Object.keys(saved())).toHaveLength(2))

    fireEvent.click(screen.getByRole('button', { name: /Run signal check on 2 entries/ }))
    await waitFor(() => expect(screen.getByText('average of 2 days')).toBeTruthy())
    expect(api.analyzeText).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.analyzeText).mock.calls.map(c => c[0].text).sort()).toEqual(['first', 'second'])
    expect(screen.getByText('0.50')).toBeTruthy()
  })

  it('deletes everything from the device only after a confirmation', async () => {
    vi.mocked(api.checkSafety).mockResolvedValue(safety(false))
    render(<Harness onCrisis={vi.fn()} />)

    write('to be deleted')
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }))
    await waitFor(() => expect(Object.keys(saved())).toHaveLength(1))

    fireEvent.click(screen.getByText('Where your entries go'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete all diary entries' }))
    expect(Object.keys(saved())).toHaveLength(1) // asking is not deleting
    fireEvent.click(screen.getByRole('button', { name: 'Keep them' }))
    expect(Object.keys(saved())).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete all diary entries' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }))
    expect(localStorage.getItem(DIARY_KEY)).toBeNull()
  })

  it('keeps unsaved text out of the signal check and says so', async () => {
    vi.mocked(api.checkSafety).mockResolvedValue(safety(false))
    render(<Harness onCrisis={vi.fn()} />)

    write('saved text')
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }))
    await waitFor(() => expect(Object.keys(saved())).toHaveLength(1))
    write('saved text, then edited without saving')

    expect(screen.getByText(/1 day has unsaved changes that won't be included/)).toBeTruthy()
    expect(saved()[TODAY].text).toBe('saved text')
  })
})
