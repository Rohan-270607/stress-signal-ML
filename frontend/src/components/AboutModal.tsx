import React, { useEffect, useRef } from 'react'
import { MANDATORY_DISCLAIMER } from '../data/prompts'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    closeRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title" id="about-title">About Specula</h2>
          <button ref={closeRef} type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <section className="modal-section">
            <h3>What it is</h3>
            <p>
              Specula looks at the word patterns in what you write and shows how closely they resemble Reddit posts
              that human annotators labelled as expressing stress. It shows a score and the reasons behind it.
            </p>
            <p className="callout-box">
              It never diagnoses, never assigns a medical label, and never generates advice or counselling.
            </p>
          </section>

          <section className="modal-section">
            <h3>The seven word patterns</h3>
            <ul>
              <li><strong>First-person words</strong>, such as <em>I, me, my</em></li>
              <li><strong>Absolutist words</strong>, such as <em>always, never, completely</em></li>
              <li><strong>Negative-emotion words</strong>, from the NRC Emotion Lexicon</li>
              <li><strong>Negation</strong>, such as <em>no, not, n't</em></li>
              <li><strong>Question marks</strong> and <strong>exclamation marks</strong></li>
              <li><strong>Entry length</strong></li>
            </ul>
          </section>

          <section className="modal-section">
            <h3>The safety layer</h3>
            <p>
              A separate rule-based check looks for phrases about suicide and self-harm, and it doesn't use the score.
              When it matches, a fixed, human-written helpline message appears and can't be dismissed. It only knows
              the phrases on its list, so it will miss things and it will sometimes raise false alarms. A flag doesn't
              mean someone is in danger, and no flag doesn't mean they're safe.
            </p>
          </section>

          <section className="modal-section">
            <h3>Limits</h3>
            <ul>
              <li>The model was trained on Reddit posts. How well it works on student journals hasn't been measured.</li>
              <li>On held-out Reddit test data it scored an F1 of about 0.73 and got 29% of texts wrong.</li>
              <li>Longer text pushes the score up, and entries under 30 words give less stable scores.</li>
              <li>It hasn't been checked against clinical measures, and it must not be used to screen or rank anyone.</li>
            </ul>
          </section>

          <section className="modal-section">
            <h3>Your text</h3>
            <p>
              The analysis service processes your text in memory and doesn't store or log it. Free writing and guided
              answers are kept in the browser only while this page is open.
            </p>
            <p>
              The diary is the exception: its entries are saved in this browser, on this device only, and are deleted
              after 7 days. Anyone who can use this browser profile can read them, and you can delete them all at any time.
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <p className="modal-disclaimer">{MANDATORY_DISCLAIMER}</p>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
