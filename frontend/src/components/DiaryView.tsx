import React, { useMemo, useState } from 'react'
import { toAppError } from '../services/api'
import type { AppError } from '../services/api'
import { saveEntryWithSafety } from '../services/diaryFlow'
import {
  browserStorage,
  createDiaryStore,
  DIARY_DAYS,
  lastSevenDays,
  MAX_ENTRY_CHARS,
  parseDayKey
} from '../services/diaryStore'
import type { DiaryEntries } from '../services/diaryStore'
import { scoreItems } from '../services/scoring'
import type { MultiAnswerAnalysisResult } from '../types'
import { Disclaimer } from './Disclaimer'
import { ErrorNotice } from './ErrorNotice'
import { MultiResultView } from './MultiResultView'

interface DiaryViewProps {
  /** Unsaved text per day. Lives in App so switching tabs never loses what was typed. */
  drafts: Record<string, string>
  onDraftsChange: (drafts: Record<string, string>) => void
  result: MultiAnswerAnalysisResult | null
  onResult: (result: MultiAnswerAnalysisResult | null) => void
  onCrisis: (message: string) => void
}

const STEADY_WORDS = 30
const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)

type Status = { kind: 'saved' | 'removed' | 'missed' } | null

export const DiaryView: React.FC<DiaryViewProps> = ({ drafts, onDraftsChange, result, onResult, onCrisis }) => {
  const store = useMemo(() => createDiaryStore(browserStorage()), [])
  const [days] = useState(() => lastSevenDays(new Date()))
  const today = days[days.length - 1]

  const [entries, setEntries] = useState<DiaryEntries>(() => store.load())
  const [selected, setSelected] = useState(today)
  const [busy, setBusy] = useState<'save' | 'check' | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [checkError, setCheckError] = useState<AppError | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const dayName = (key: string, style: 'short' | 'long') => {
    if (style === 'short') return parseDayKey(key).toLocaleDateString(undefined, { weekday: 'short' })
    return parseDayKey(key).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const dayLabel = (key: string) =>
    key === today ? 'Today' : parseDayKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

  const savedText = entries[selected]?.text ?? ''
  const text = drafts[selected] ?? savedText
  const isDirty = selected in drafts && drafts[selected].trimEnd() !== savedText
  const words = countWords(text)
  const isTooLong = text.length > MAX_ENTRY_CHARS
  const savedDays = days.filter(day => entries[day])
  const unsavedDays = days.filter(day => day in drafts && drafts[day].trimEnd() !== (entries[day]?.text ?? ''))
  const shortEntries = savedDays.filter(day => countWords(entries[day].text) < STEADY_WORDS).length

  const withoutDraft = (key: string) => Object.fromEntries(Object.entries(drafts).filter(([k]) => k !== key))

  const selectDay = (key: string) => {
    setSelected(key)
    setStatus(null)
    setConfirmingDelete(false)
  }

  const handleSave = async () => {
    if (busy || isTooLong || text.trim() === '') return
    setBusy('save')
    setStatus(null)
    // The entry is saved first; then the whole entry goes through the safety check (D-19)
    const outcome = await saveEntryWithSafety(store, selected, text)
    setEntries(store.load())
    onDraftsChange(withoutDraft(selected))
    onResult(null) // a saved change makes any earlier signal check out of date
    if (outcome.crisisMessage) onCrisis(outcome.crisisMessage)
    setStatus({ kind: outcome.safetyMissed ? 'missed' : 'saved' })
    setBusy(null)
  }

  const handleRemove = () => {
    store.remove(selected)
    setEntries(store.load())
    onDraftsChange(withoutDraft(selected))
    onResult(null)
    setStatus({ kind: 'removed' })
  }

  const handleDeleteAll = () => {
    store.clearAll()
    setEntries({})
    onDraftsChange({})
    onResult(null)
    setConfirmingDelete(false)
    setStatus({ kind: 'removed' })
  }

  const handleCheck = async () => {
    if (busy || savedDays.length === 0) return
    setBusy('check')
    setCheckError(null)
    // Every saved day is scored on its own and then averaged (D-15)
    const outcome = await scoreItems(savedDays.map(day => ({ id: day, label: dayLabel(day), text: entries[day].text })))
    if (outcome.crisisMessage) onCrisis(outcome.crisisMessage)
    if (outcome.result) onResult(outcome.result)
    else setCheckError(toAppError(outcome.error))
    setBusy(null)
  }

  if (result) {
    return <MultiResultView result={result} variant="days" onEdit={() => onResult(null)} />
  }

  return (
    <div className="sheet animate-fade-in">
      <h2 className="page-title">Your week</h2>
      <p className="page-subtitle">
        Write when you like, one entry a day. Entries are saved in this browser on this device only, and are deleted
        after {DIARY_DAYS} days.
      </p>

      {!store.persistent && (
        <div className="error-notice" role="status">
          <p>This browser isn't keeping saved entries, so what you write here will be lost when you close the page.</p>
        </div>
      )}

      <div className="week-bar" role="group" aria-label="Days of this week">
        {days.map(day => {
          const hasEntry = Boolean(entries[day])
          const unsaved = unsavedDays.includes(day)
          return (
            <button
              key={day}
              type="button"
              className={`day ${day === selected ? 'active' : ''} ${hasEntry ? 'has-entry' : ''} ${unsaved ? 'unsaved' : ''}`}
              onClick={() => selectDay(day)}
              aria-current={day === selected ? 'date' : undefined}
              aria-label={`${dayName(day, 'long')}${hasEntry ? ', entry saved' : ''}${unsaved ? ', unsaved changes' : ''}`}
            >
              <span className="day-name">{day === today ? 'Today' : dayName(day, 'short')}</span>
              <span className="day-number">{parseDayKey(day).getDate()}</span>
              <span className="day-mark" aria-hidden="true">{unsaved ? 'unsaved' : hasEntry ? 'saved' : ''}</span>
            </button>
          )
        })}
      </div>

      <h3 className="prompt-question">{dayName(selected, 'long')}</h3>

      <textarea
        value={text}
        onChange={(e) => onDraftsChange({ ...drafts, [selected]: e.target.value })}
        placeholder="Start anywhere..."
        rows={8}
        className={`journal-textarea ${isTooLong ? 'textarea-error' : ''}`}
        disabled={busy === 'save'}
        maxLength={MAX_ENTRY_CHARS + 200}
        aria-label={`Diary entry for ${dayName(selected, 'long')}`}
      />

      <div className="word-progress" aria-hidden="true">
        <span style={{ width: `${Math.min(words / STEADY_WORDS, 1) * 100}%` }} />
      </div>
      <div className="textarea-footer">
        <span>{words >= STEADY_WORDS ? 'Enough for a steadier reading' : `About ${STEADY_WORDS} words or more gives a steadier reading`}</span>
        <span className={isTooLong ? 'counter-danger' : ''}>
          {words} {words === 1 ? 'word' : 'words'} · {text.length.toLocaleString()} / {MAX_ENTRY_CHARS.toLocaleString()}
        </span>
      </div>
      {isTooLong && <p className="field-error">This entry is over the {MAX_ENTRY_CHARS.toLocaleString()} character limit.</p>}

      {status?.kind === 'missed' && (
        <div className="error-notice" role="alert">
          <p>Saved on this device, but we couldn't reach the service that runs the safety check.</p>
          <p className="error-notice-safety">
            If you need support right now, you can find a local line at{' '}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">findahelpline.com</a>.
          </p>
        </div>
      )}

      <div className="diary-actions">
        <div className="action-buttons">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={busy !== null || !isDirty || text.trim() === '' || isTooLong}
          >
            {busy === 'save' ? (<><span className="spinner" aria-hidden="true" /><span>Saving...</span></>) : 'Save entry'}
          </button>
          {savedText && (
            <button type="button" className="btn btn-ghost" onClick={handleRemove} disabled={busy !== null}>
              Delete this entry
            </button>
          )}
        </div>
        <p className="diary-status" role="status">
          {status?.kind === 'saved' && 'Saved on this device.'}
          {status?.kind === 'removed' && 'Deleted from this device.'}
          {!status && isDirty && 'Unsaved changes'}
        </p>
      </div>

      <section className="check-panel">
        <h3 className="section-title">Signal check</h3>
        <p className="section-subtitle">
          Scores each saved entry on its own and averages them. It's a soft signal, and day-to-day differences are mostly
          noise, so please don't read it as a trend. Unsaved changes aren't included.
        </p>
        {unsavedDays.length > 0 && (
          <p className="summary-note">
            {unsavedDays.length === 1 ? '1 day has' : `${unsavedDays.length} days have`} unsaved changes that won't be included.
          </p>
        )}
        {shortEntries > 0 && (
          <p className="summary-note">
            {shortEntries === 1 ? '1 saved entry is' : `${shortEntries} saved entries are`} under {STEADY_WORDS} words, so
            {shortEntries === 1 ? ' its score is' : ' their scores are'} less stable.
          </p>
        )}
        {checkError && <ErrorNotice error={checkError} />}
        <div className="check-actions">
          <button type="button" className="btn btn-secondary" onClick={handleCheck} disabled={busy !== null || savedDays.length === 0}>
            {busy === 'check'
              ? (<><span className="spinner" aria-hidden="true" /><span>Reading your entries...</span></>)
              : `Run signal check on ${savedDays.length} ${savedDays.length === 1 ? 'entry' : 'entries'}`}
          </button>
        </div>
      </section>

      <details className="privacy-details">
        <summary>Where your entries go</summary>
        <p>
          Entries are stored in this browser on this device. Anyone who can use this browser profile can read them. They
          are sent only to the analysis service, once when you save (for the safety check) and again for a signal check,
          and the service doesn't store or log them. Entries older than {DIARY_DAYS} days are deleted automatically.
        </p>
        {savedDays.length > 0 && (
          confirmingDelete ? (
            <div className="delete-confirm">
              <p>Delete all {savedDays.length} {savedDays.length === 1 ? 'entry' : 'entries'} from this device? This can't be undone.</p>
              <div className="action-buttons">
                <button type="button" className="btn btn-primary" onClick={handleDeleteAll}>Delete everything</button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>Keep them</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmingDelete(true)}>
              Delete all diary entries
            </button>
          )
        )}
      </details>

      <Disclaimer compact />
    </div>
  )
}
