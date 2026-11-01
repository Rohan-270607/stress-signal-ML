import React, { useState } from 'react'
import { Disclaimer } from './Disclaimer'

interface FreeformEditorProps {
  onAnalyze: (text: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

const SAMPLE_ENTRIES = [
  {
    title: 'High Academic Burden',
    text: "I am completely overwhelmed by these finals. I never seem to catch up, no matter how hard I try. I feel like I'm failing everyone and everything is falling apart right now."
  },
  {
    title: 'Balanced Week Reflection',
    text: "This week had some challenges with our group project deadlines, but we met yesterday and divided up the sections fairly. Took a walk in the park today and felt rested."
  },
  {
    title: 'Safety Check (Crisis Keyword)',
    text: "I feel so hopeless and I can't go on anymore. I just want to end my life."
  }
]

export const FreeformEditor: React.FC<FreeformEditorProps> = ({
  onAnalyze,
  isLoading,
  error
}) => {
  const [text, setText] = useState('')

  const charCount = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const isTooLong = charCount > 5000
  const isTooShort = charCount === 0
  const isShortWordAdvisory = words > 0 && words < 30

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isTooShort || isTooLong || isLoading) return
    onAnalyze(text)
  }

  const handleClear = () => {
    setText('')
  }

  const loadSample = (sampleText: string) => {
    setText(sampleText)
  }

  return (
    <div className="editor-card animate-fade-in">
      <div className="editor-header">
        <div>
          <h2 className="editor-title">Journal Reflection</h2>
          <p className="editor-subtitle">
            Write freely about your thoughts, academic workload, or feelings. Analysis runs locally in memory and is never logged.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="textarea-container">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What has been on your mind lately? How are your courses and daily routine feeling? (Take your time...)"
            rows={8}
            className={`journal-textarea ${isTooLong ? 'textarea-error' : ''}`}
            disabled={isLoading}
            maxLength={5200}
            aria-label="Student journal reflection text"
          />

          <div className="textarea-footer">
            <div className="counter-group">
              <span className={`char-counter ${charCount > 5000 ? 'counter-danger' : ''}`}>
                {charCount.toLocaleString()} / 5,000 characters
              </span>
              <span className="word-counter">
                {words} {words === 1 ? 'word' : 'words'}
              </span>
            </div>

            {isShortWordAdvisory && (
              <span className="advisory-pill">
                ℹ️ Longer entries (&gt;30 words) give steadier signal results
              </span>
            )}

            {isTooLong && (
              <span className="error-pill">
                ⚠️ Entry exceeds the 5,000 character limit
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="error-alert" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="editor-action-bar">
          <div className="sample-buttons">
            <span className="sample-label">Try sample:</span>
            {SAMPLE_ENTRIES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                className="btn-pill"
                onClick={() => loadSample(sample.text)}
                disabled={isLoading}
              >
                {sample.title}
              </button>
            ))}
          </div>

          <div className="submit-buttons">
            {text && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClear}
                disabled={isLoading}
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isTooShort || isTooLong || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Extracting Features...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Analyse Stress Signal</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="editor-bottom-note">
        <Disclaimer compact />
      </div>
    </div>
  )
}
