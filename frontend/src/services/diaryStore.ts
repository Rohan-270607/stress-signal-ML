/**
 * Diary storage: entries live in this browser on this device only (localStorage), for 7 days.
 * Nothing here talks to a server. See HANDOFF.md section 10 for the decisions behind this.
 */

export const DIARY_KEY = 'specula.diary.v1'
export const DIARY_DAYS = 7
/** Same limit as the API (docs/api_contract.md), so a saved entry can always be checked and scored. */
export const MAX_ENTRY_CHARS = 5000

export interface DiaryEntry {
  text: string
  savedAt: string
}

/** Keyed by local calendar day, "YYYY-MM-DD". */
export type DiaryEntries = Record<string, DiaryEntry>

export interface DiaryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const pad = (n: number) => String(n).padStart(2, '0')

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** The 7 days a diary covers, oldest first, ending today. Built from calendar fields so DST can't skip or repeat a day. */
export function lastSevenDays(now: Date): string[] {
  const days: string[] = []
  for (let back = DIARY_DAYS - 1; back >= 0; back--) {
    days.push(dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)))
  }
  return days
}

/** The browser's localStorage if it works (it can be blocked or full), otherwise null. */
export function browserStorage(): DiaryStorage | null {
  try {
    const probe = 'specula.probe'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

export interface DiaryStore {
  /** False when the browser won't keep entries: they then last only until the page is closed. */
  readonly persistent: boolean
  load(): DiaryEntries
  /** Saves (or, for blank text, removes) the entry for a day in the 7-day window. False if the day is outside it. */
  save(key: string, text: string): boolean
  remove(key: string): void
  clearAll(): void
}

export function createDiaryStore(storage: DiaryStorage | null, now: () => Date = () => new Date()): DiaryStore {
  let backing = storage
  let memory: DiaryEntries = {}

  const inWindow = () => new Set(lastSevenDays(now()))

  function readRaw(): DiaryEntries {
    if (!backing) return memory
    try {
      const raw = backing.getItem(DIARY_KEY)
      if (!raw) return {}
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
      const entries: DiaryEntries = {}
      for (const [key, value] of Object.entries(parsed)) {
        const entry = value as Partial<DiaryEntry> | null
        // Anything that doesn't look exactly like an entry is dropped, never trusted
        if (KEY_PATTERN.test(key) && entry && typeof entry.text === 'string' && typeof entry.savedAt === 'string') {
          entries[key] = { text: entry.text.slice(0, MAX_ENTRY_CHARS), savedAt: entry.savedAt }
        }
      }
      return entries
    } catch {
      return {}
    }
  }

  function write(entries: DiaryEntries) {
    if (backing) {
      try {
        if (Object.keys(entries).length === 0) backing.removeItem(DIARY_KEY)
        else backing.setItem(DIARY_KEY, JSON.stringify(entries))
        return
      } catch {
        // Full or blocked: keep working in memory for this page rather than losing the entry
        backing = null
      }
    }
    memory = entries
  }

  function load(): DiaryEntries {
    const all = readRaw()
    const days = inWindow()
    const kept: DiaryEntries = {}
    for (const [key, entry] of Object.entries(all)) if (days.has(key)) kept[key] = entry
    // Entries older than 7 days are deleted for good, not just hidden
    if (Object.keys(kept).length !== Object.keys(all).length) write(kept)
    return kept
  }

  return {
    get persistent() {
      return backing !== null
    },
    load,
    save(key, text) {
      if (!inWindow().has(key)) return false
      const entries = load()
      const cleaned = text.replace(/\s+$/, '')
      if (cleaned.trim() === '') delete entries[key]
      else entries[key] = { text: cleaned.slice(0, MAX_ENTRY_CHARS), savedAt: now().toISOString() }
      write(entries)
      return true
    },
    remove(key) {
      const entries = load()
      delete entries[key]
      write(entries)
    },
    clearAll() {
      memory = {}
      if (backing) {
        try {
          backing.removeItem(DIARY_KEY)
        } catch {
          backing = null
        }
      }
    }
  }
}
