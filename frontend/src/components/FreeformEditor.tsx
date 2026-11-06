import React from 'react'
import type { AppError } from '../services/api'
import { Disclaimer } from './Disclaimer'
import { ErrorNotice } from './ErrorNotice'

interface FreeformEditorProps {
  text: string
  onTextChange: (text: string) => void
  onAnalyze: (text: string) => Promise<void>
  isLoading: boolean
  error: AppError | null
}

const MAX_CHARS = 5000
const STEADY_WORDS = 30
// Dreaddit texts top out around 310 words (ml/REPORT.md), so longer entries are outside the training range
const LONG_WORDS = 300

// Development only: a crisis phrase must never be one click away for a real student
const SAMPLE_ENTRIES = import.meta.env.DEV ? [
  {
    title: 'High burden',
    text: "I am completely overwhelmed by these finals. I never seem to catch up, no matter how hard I try. I feel like I'm failing everyone and everything is falling apart right now."
  },
  {
    title: 'Balanced week',
    text: "This week had some challenges with our group project deadlines, but we met yesterday and divided up the sections fairly. Took a walk in the park today and felt rested."
  },
  {
    title: 'Safety check',
    text: "I feel so hopeless and I can't go on anymore. I just want to end my life."
  }
] : []

const HOW_IT_WORKS = [
  { title: 'It counts word patterns', text: 'Seven simple patterns, such as first-person words and negation.' },
  { title: 'It shows its reasons', text: 'Every score comes with the patterns that moved it up or down.' },
  { title: 'It stays a signal', text: 'It describes the writing, not you, and it can be wrong.' }
]

export const FreeformEditor: React.FC<FreeformEditorProps> = ({
  text,
  onTextChange,
  onAnalyze,
  isLoading,
  error
}) => {
  const charCount = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const isTooLong = charCount > MAX_CHARS
  const isBlank = text.trim().length === 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isBlank || isTooLong || isLoading) return
    onAnalyze(text)
  }

  let hint = `About ${STEADY_WORDS} words or more gives a steadier reading`
  if (words >= STEADY_WORDS) hint = 'Enough for a steadier reading'
  if (words > LONG_WORDS) hint = 'Much longer than the texts the model learned from'

  return (
    <div className="animate-fade-in">
      <div className="sheet">
        <h2 className="page-title">What's on your mind?</h2>
        <p className="page-subtitle">
          Write about your week, your workload, or anything else. Your text is processed in memory and isn't stored or logged.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Start anywhere..."
            rows={9}
            className={`journal-textarea ${isTooLong ? 'textarea-error' : ''}`}
            disabled={isLoading}
            maxLength={MAX_CHARS + 200}
            aria-label="Journal entry"
          />

          <div className="word-progress" aria-hidden="true">
            <span style={{ width: `${Math.min(words / STEADY_WORDS, 1) * 100}%` }} />
          </div>

          <div className="textarea-footer">
            <span>{hint}</span>
            <span className={isTooLong ? 'counter-danger' : ''}>
              {words} {words === 1 ? 'word' : 'words'} · {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>

          {isTooLong && (
            <p className="field-error">This entry is over the {MAX_CHARS.toLocaleString()} character limit.</p>
          )}

          {error && <ErrorNotice error={error} />}

          <div className="action-bar">
            <Disclaimer compact />
            <div className="action-buttons">
              {text && (
                <button type="button" className="btn btn-ghost" onClick={() => onTextChange('')} disabled={isLoading}>
                  Clear
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={isBlank || isTooLong || isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    <span>Reading your entry...</span>
                  </>
                ) : 'Analyse entry'}
              </button>
            </div>
          </div>
        </form>

        {SAMPLE_ENTRIES.length > 0 && (
          <div className="sample-row">
            <span className="sample-label">Dev samples</span>
            {SAMPLE_ENTRIES.map(sample => (
              <button
                key={sample.title}
                type="button"
                className="btn-sample"
                onClick={() => onTextChange(sample.text)}
                disabled={isLoading}
              >
                {sample.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="how-strip">
        {HOW_IT_WORKS.map(item => (
          <div key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
