import React from 'react'
import { MANDATORY_DISCLAIMER } from '../data/prompts'

interface DisclaimerProps {
  customText?: string
  compact?: boolean
}

export const Disclaimer: React.FC<DisclaimerProps> = ({
  customText = MANDATORY_DISCLAIMER,
  compact = false
}) => {
  if (compact) {
    return <p className="disclaimer-compact" role="note">{customText}</p>
  }

  return (
    <div className="disclaimer-card" role="note">
      <h3 className="disclaimer-heading">How to read this</h3>
      <p className="disclaimer-main-text">{customText}</p>
      <p className="disclaimer-sub-text">
        The score describes word patterns learned from Reddit posts, not from student journals, and it can be wrong.
        It says how a piece of writing reads, not how you are. If distress is lasting, consider talking to your campus
        counselling service, a doctor, or someone you trust.
      </p>
    </div>
  )
}
