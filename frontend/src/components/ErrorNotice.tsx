import React from 'react'
import type { AppError } from '../services/api'

export const ErrorNotice: React.FC<{ error: AppError }> = ({ error }) => (
  <div className="error-notice" role="alert">
    <p>{error.message}</p>
    {/* The rule-based safety layer lives in the backend, so a failed request may mean it never ran. */}
    {error.safetyCheckMissed && (
      <p className="error-notice-safety">
        The safety check couldn't run either. If you need support right now, you can find a local line at{' '}
        <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">findahelpline.com</a>.
      </p>
    )}
  </div>
)
