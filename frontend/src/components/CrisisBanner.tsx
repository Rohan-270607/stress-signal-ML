import React from 'react'

interface CrisisBannerProps {
  message: string
}

export const CrisisBanner: React.FC<CrisisBannerProps> = ({ message }) => {
  return (
    <aside
      aria-label="Crisis Helpline and Support Notification"
      role="alert"
      className="crisis-override-banner"
    >
      <div className="crisis-container">
        <div className="crisis-header">
          <div className="crisis-icon-pulse" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h2 className="crisis-title">Immediate Support & Confidential Care Available</h2>
            <p className="crisis-notice-tag">Independent Safety Layer Triggered — Non-Dismissible</p>
          </div>
        </div>

        {/* Verbatim message required by Rule 2 */}
        <div className="crisis-verbatim-message">
          <p>{message}</p>
        </div>

        <div className="crisis-helpline-grid">
          <a
            href="tel:14416"
            className="helpline-card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="helpline-region">India (Toll-Free 24/7)</span>
            <span className="helpline-name">Tele-MANAS</span>
            <span className="helpline-number">14416 / 1800-891-4416</span>
          </a>

          <a
            href="tel:988"
            className="helpline-card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="helpline-region">US & Canada (24/7)</span>
            <span className="helpline-name">Suicide & Crisis Lifeline</span>
            <span className="helpline-number">Call or Text 988</span>
          </a>

          <a
            href="tel:116123"
            className="helpline-card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="helpline-region">United Kingdom (24/7)</span>
            <span className="helpline-name">Samaritans</span>
            <span className="helpline-number">116 123</span>
          </a>

          <a
            href="https://findahelpline.com"
            className="helpline-card highlight"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="helpline-region">International</span>
            <span className="helpline-name">Find a Helpline Directory</span>
            <span className="helpline-number">findahelpline.com ↗</span>
          </a>
        </div>
      </div>
    </aside>
  )
}
