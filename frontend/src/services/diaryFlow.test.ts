import { describe, expect, it, vi } from 'vitest'
import type { SafetyResponse } from '../types'
import { createDiaryStore } from './diaryStore'
import type { DiaryStorage } from './diaryStore'
import { saveEntryWithSafety } from './diaryFlow'

const NOW = new Date(2026, 10, 7, 12, 0)
const TODAY = '2026-11-07'
const MESSAGE = 'FIXED MESSAGE from the safety layer. Call 988.'

function newStore() {
  const data: Record<string, string> = {}
  const storage: DiaryStorage = {
    getItem: k => data[k] ?? null,
    setItem: (k, v) => { data[k] = v },
    removeItem: k => { delete data[k] }
  }
  return createDiaryStore(storage, () => NOW)
}

const answer = (flag: boolean): SafetyResponse => ({
  crisis_flag: flag,
  crisis_message: flag ? MESSAGE : null,
  disclaimer: 'd'
})

describe('saveEntryWithSafety', () => {
  it('returns the fixed crisis message, unchanged, for a flagged entry', async () => {
    const outcome = await saveEntryWithSafety(newStore(), TODAY, 'a worrying entry', async () => answer(true))
    expect(outcome).toEqual({ saved: true, crisisMessage: MESSAGE, safetyMissed: false })
  })

  it('returns no message for an ordinary entry', async () => {
    const outcome = await saveEntryWithSafety(newStore(), TODAY, 'a calm entry', async () => answer(false))
    expect(outcome).toEqual({ saved: true, crisisMessage: null, safetyMissed: false })
  })

  it('checks the whole entry as written', async () => {
    const check = vi.fn(async (text: string) => {
      void text
      return answer(false)
    })
    const text = 'First paragraph.\n\nSecond paragraph, much later.'
    await saveEntryWithSafety(newStore(), TODAY, text, check)
    expect(check).toHaveBeenCalledTimes(1)
    expect(check.mock.calls[0][0]).toBe(text)
  })

  it('keeps the entry, and reports the missed check, when the safety service cannot be reached', async () => {
    const store = newStore()
    const outcome = await saveEntryWithSafety(store, TODAY, 'what I wrote', async () => { throw new Error('offline') })
    expect(outcome).toEqual({ saved: true, crisisMessage: null, safetyMissed: true })
    expect(store.load()[TODAY].text).toBe('what I wrote') // writing is never lost to a failed check
  })

  it('saves before it checks', async () => {
    const store = newStore()
    let storedWhenChecked = false
    await saveEntryWithSafety(store, TODAY, 'entry', async () => {
      storedWhenChecked = Boolean(store.load()[TODAY])
      return answer(false)
    })
    expect(storedWhenChecked).toBe(true)
  })

  it('does not call the service for a blank entry or a day outside the window', async () => {
    const check = vi.fn(async () => answer(false))
    expect(await saveEntryWithSafety(newStore(), TODAY, '   ', check)).toEqual({ saved: true, crisisMessage: null, safetyMissed: false })
    expect((await saveEntryWithSafety(newStore(), '2026-10-01', 'old', check)).saved).toBe(false)
    expect(check).not.toHaveBeenCalled()
  })
})
