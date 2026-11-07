import type { SafetyResponse } from '../types'
import { checkSafety } from './api'
import type { DiaryStore } from './diaryStore'

export interface SaveOutcome {
  /** False only if the day is outside the 7-day window. */
  saved: boolean
  /** The backend's fixed crisis message, to be shown verbatim, when the entry was flagged. */
  crisisMessage: string | null
  /** True when the safety check could not run (the entry is still saved). */
  safetyMissed: boolean
}

/**
 * Saves a diary entry, then runs the safety check on the whole entry (Phase 1, DECISIONS D-19).
 * The entry is written first: a failing check must never cost the student what they wrote.
 */
export async function saveEntryWithSafety(
  store: DiaryStore,
  key: string,
  text: string,
  check: (text: string) => Promise<SafetyResponse> = checkSafety
): Promise<SaveOutcome> {
  const saved = store.save(key, text)
  if (!saved || text.trim() === '') return { saved, crisisMessage: null, safetyMissed: false }

  try {
    const result = await check(text)
    return { saved, crisisMessage: result.crisis_flag ? result.crisis_message : null, safetyMissed: false }
  } catch {
    return { saved, crisisMessage: null, safetyMissed: true }
  }
}
