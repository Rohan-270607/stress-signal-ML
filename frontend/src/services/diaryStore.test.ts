import { describe, expect, it } from 'vitest'
import {
  createDiaryStore,
  DIARY_KEY,
  dayKey,
  lastSevenDays,
  MAX_ENTRY_CHARS
} from './diaryStore'
import type { DiaryStorage } from './diaryStore'

// 2026-11-07 is a Saturday, so the window is Sun 1 Nov to Sat 7 Nov
const NOW = new Date(2026, 10, 7, 15, 30)

function memoryStorage(initial: Record<string, string> = {}, failWrites = false): DiaryStorage & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => {
      if (failWrites) throw new Error('quota')
      data[key] = value
    },
    removeItem: key => {
      delete data[key]
    }
  }
}

const storeFor = (storage: DiaryStorage | null, now = NOW) => createDiaryStore(storage, () => now)

describe('lastSevenDays', () => {
  it('is 7 consecutive local days, oldest first, ending today', () => {
    expect(lastSevenDays(NOW)).toEqual([
      '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'
    ])
  })

  it('crosses a month and a year boundary', () => {
    expect(lastSevenDays(new Date(2027, 0, 2))[0]).toBe('2026-12-27')
    expect(lastSevenDays(new Date(2026, 2, 2))[0]).toBe('2026-02-24')
  })

  it('never skips or repeats a day around a daylight-saving change', () => {
    for (const now of [new Date(2026, 2, 9), new Date(2026, 2, 29), new Date(2026, 9, 26), new Date(2026, 10, 2)]) {
      const days = lastSevenDays(now)
      expect(new Set(days).size).toBe(7)
      expect(days[6]).toBe(dayKey(now))
    }
  })
})

describe('saving and loading', () => {
  it('round-trips an entry', () => {
    const store = storeFor(memoryStorage())
    expect(store.save('2026-11-07', 'A quiet day.')).toBe(true)
    expect(store.load()['2026-11-07'].text).toBe('A quiet day.')
  })

  it('removes the entry when the text is blank', () => {
    const store = storeFor(memoryStorage())
    store.save('2026-11-07', 'Something.')
    store.save('2026-11-07', '   \n ')
    expect(store.load()).toEqual({})
  })

  it('drops trailing whitespace and caps the length at the API limit', () => {
    const store = storeFor(memoryStorage())
    store.save('2026-11-06', 'hello   \n')
    store.save('2026-11-07', 'x'.repeat(MAX_ENTRY_CHARS + 500))
    const entries = store.load()
    expect(entries['2026-11-06'].text).toBe('hello')
    expect(entries['2026-11-07'].text).toHaveLength(MAX_ENTRY_CHARS)
  })

  it('refuses days outside the 7-day window and stores nothing for them', () => {
    const storage = memoryStorage()
    const store = storeFor(storage)
    expect(store.save('2026-10-31', 'too old')).toBe(false)
    expect(store.save('2026-11-08', 'in the future')).toBe(false)
    expect(storage.data[DIARY_KEY]).toBeUndefined()
  })

  it('removes one entry, or all of them', () => {
    const storage = memoryStorage()
    const store = storeFor(storage)
    store.save('2026-11-06', 'a')
    store.save('2026-11-07', 'b')
    store.remove('2026-11-06')
    expect(Object.keys(store.load())).toEqual(['2026-11-07'])
    store.clearAll()
    expect(store.load()).toEqual({})
    expect(storage.data[DIARY_KEY]).toBeUndefined()
  })
})

describe('expiry', () => {
  it('deletes entries older than the window for good, and keeps the oldest day inside it', () => {
    const entry = (text: string) => ({ text, savedAt: '2026-11-01T10:00:00.000Z' })
    const storage = memoryStorage({
      [DIARY_KEY]: JSON.stringify({ '2026-10-31': entry('expired'), '2026-11-01': entry('oldest kept'), '2026-11-07': entry('today') })
    })
    const entries = storeFor(storage).load()
    expect(Object.keys(entries)).toEqual(['2026-11-01', '2026-11-07'])
    // gone from the storage itself, not just hidden
    expect(Object.keys(JSON.parse(storage.data[DIARY_KEY]))).toEqual(['2026-11-01', '2026-11-07'])
  })

  it('expires an entry as the days roll over', () => {
    const storage = memoryStorage()
    storeFor(storage).save('2026-11-01', 'first day')
    // Nov 1 is the 7th day back on Nov 7, so it is still there; on Nov 8 it is deleted
    expect(storeFor(storage, new Date(2026, 10, 7, 23, 59)).load()['2026-11-01']).toBeDefined()
    expect(storeFor(storage, new Date(2026, 10, 8, 0, 1)).load()).toEqual({})
    expect(storage.data[DIARY_KEY]).toBeUndefined()
  })
})

describe('bad or unavailable storage', () => {
  it('treats corrupt or wrongly shaped data as empty and does not throw', () => {
    for (const raw of ['{not json', '[]', '"text"', 'null', '42']) {
      expect(storeFor(memoryStorage({ [DIARY_KEY]: raw })).load()).toEqual({})
    }
  })

  it('drops entries that are not shaped like entries', () => {
    const raw = JSON.stringify({
      '2026-11-07': { text: 'fine', savedAt: 'x' },
      '2026-11-06': { text: 123, savedAt: 'x' },
      '2026-11-05': 'a string',
      'not-a-date': { text: 'bad key', savedAt: 'x' }
    })
    expect(Object.keys(storeFor(memoryStorage({ [DIARY_KEY]: raw })).load())).toEqual(['2026-11-07'])
  })

  it('works in memory, and says so, when there is no storage', () => {
    const store = storeFor(null)
    expect(store.persistent).toBe(false)
    store.save('2026-11-07', 'kept until the page closes')
    expect(store.load()['2026-11-07'].text).toBe('kept until the page closes')
  })

  it('keeps the entry in memory, and says so, when the storage is full', () => {
    const store = storeFor(memoryStorage({}, true))
    expect(store.persistent).toBe(true)
    expect(store.save('2026-11-07', 'still saved for now')).toBe(true)
    expect(store.persistent).toBe(false)
    expect(store.load()['2026-11-07'].text).toBe('still saved for now')
  })
})
