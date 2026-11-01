import React from 'react'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">About the Stress-Signal Navigator</h2>
            <p className="modal-subtitle">System design, psycholinguistic foundations, and limitations</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <section className="modal-section">
            <h3>1. What This System Is & Isn't</h3>
            <p>
              This is a <strong>transparent psycholinguistic signal extractor</strong>. It uses seven interpretable
              linguistic features and an explainable logistic regression model to evaluate similarities between journal
              writing and research texts produced during periods of heightened stress.
            </p>
            <div className="callout-box">
              <strong>Non-Negotiable Ethics:</strong> This system <em>never diagnoses</em> mental health disorders,
              never assigns medical labels, and never generates AI advice or counseling.
            </div>
          </section>

          <section className="modal-section">
            <h3>2. The Seven Interpretable Linguistic Features</h3>
            <ul>
              <li><strong>First-person singular pronouns</strong> (<em>I, me, my, myself</em>) — self-referential focus.</li>
              <li><strong>Absolutist phrasing</strong> (<em>always, never, completely, nothing</em>) — binary/dichotomous thinking markers (Al-Mosaiwi & Johnstone 2018).</li>
              <li><strong>Negative emotion lexicon</strong> — NRC Emotion Lexicon words flagged for negative sentiment, anger, fear, or sadness.</li>
              <li><strong>Negation terms</strong> (<em>no, not, never, n't</em>).</li>
              <li><strong>Punctuation markers</strong> — question marks and exclamation marks.</li>
              <li><strong>Word count</strong> — text length normalization.</li>
            </ul>
          </section>

          <section className="modal-section">
            <h3>3. Independent Rule-Based Crisis Safety Layer</h3>
            <p>
              Crisis detection does <strong>not</strong> rely on the statistical ML model. An independent, rule-based
              safety filter scans for immediate distress or crisis patterns. When triggered, it displays a verbatim,
              human-written helpline notice that cannot be dismissed or overridden.
            </p>
          </section>

          <section className="modal-section">
            <h3>4. Known Limitations</h3>
            <ul>
              <li><strong>Weak model by design:</strong> F1 score is ~0.73 on held-out test data. Scores are intended solely as soft indications, not definitive statements.</li>
              <li><strong>Short entry sensitivity:</strong> Entries under 30 words exhibit higher statistical variance. Longer entries yield more reliable signals.</li>
              <li><strong>Zero data persistence:</strong> Your reflection text stays in your browser memory while you view it and is never stored on a server or recorded to a database.</li>
            </ul>
          </section>
        </div>

        <div className="modal-footer">
          <p className="modal-disclaimer">"This is not a diagnosis or a substitute for professional care."</p>
          <button className="btn btn-primary" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}
