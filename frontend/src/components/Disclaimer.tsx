import React from 'react'

interface DisclaimerProps {
  customText?: string
  compact?: boolean
}

export const Disclaimer: React.FC<DisclaimerProps> = ({
  customText = 'This is not a diagnosis or a substitute for professional care.',
  compact = false
}) => {
  if (compact) {
    return (
      <div className="disclaimer-compact" role="note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>{customText}</span>
      </div>
    )
  }

  return (
    <div className="disclaimer-card" role="note">
      <div className="disclaimer-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div className="disclaimer-content">
        <h4 className="disclaimer-heading">Important Non-Clinical Notice</h4>
        <p className="disclaimer-main-text">
          <strong>{customText}</strong>
        </p>
        <p className="disclaimer-sub-text">
          This system provides an interpretable <em>linguistic signal</em> reflecting word patterns in academic and student
          writing. It never diagnoses, evaluates medical conditions, or provides clinical advice. If you are experiencing
          sustained distress, please reach out to your campus health counselor, a physician, or a trusted advisor.
        </p>
      </div>
    </div>
  )
}
