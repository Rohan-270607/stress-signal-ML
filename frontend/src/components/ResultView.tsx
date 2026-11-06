import React from 'react'
import type { AnalysisResponse } from '../types'
import { Disclaimer } from './Disclaimer'
import { FeatureBars } from './FeatureBars'
import { SignalScale } from './SignalScale'

interface ResultViewProps {
  result: AnalysisResponse
  entryText: string
  onEdit: () => void
  onReset: () => void
}

export const ResultView: React.FC<ResultViewProps> = ({ result, entryText, onEdit, onReset }) => {
  const isHigher = result.label === 'higher_signal'
  const wordCount = (entryText.trim().match(/\S+/g) || []).length

  return (
    <div className="sheet animate-fade-in">
      <section className={`summary ${isHigher ? 'summary-higher' : 'summary-lower'}`}>
        <div className="summary-head">
          <div className="summary-score">
            <span className="summary-number">{result.stress_score.toFixed(2)}</span>
            <span className="summary-caption">signal score</span>
          </div>
          <div>
            <p className="summary-label">{isHigher ? 'Higher signal' : 'Lower signal'}</p>
            <p className="summary-text">
              {isHigher
                ? "This entry's word patterns resemble texts that annotators labelled as expressing stress."
                : "This entry's word patterns resemble texts that annotators did not label as expressing stress."}
            </p>
          </div>
        </div>

        <SignalScale score={result.stress_score} isHigher={isHigher} />

        {(result.pieces ?? 1) > 1 && (
          <p className="summary-note">
            This entry is long, so it was scored in {result.pieces} parts and the scores were averaged.
          </p>
        )}

        {wordCount < 30 && (
          <p className="summary-note">
            This entry is short ({wordCount} {wordCount === 1 ? 'word' : 'words'}), so the score is less stable than usual.
          </p>
        )}
      </section>

      <section className="section">
        <h3 className="section-title">What moved the score</h3>
        {result.explanation.length === 0 ? (
          <p className="section-subtitle">Nothing moved it much: every pattern was close to an average text.</p>
        ) : (
          <FeatureBars items={result.explanation} />
        )}
      </section>

      <details className="entry-details">
        <summary>Your entry</summary>
        <p>{entryText}</p>
      </details>

      <Disclaimer customText={result.disclaimer} />

      <div className="result-actions">
        <button type="button" className="btn btn-ghost" onClick={onEdit}>Edit this entry</button>
        <button type="button" className="btn btn-secondary" onClick={onReset}>New reflection</button>
      </div>
    </div>
  )
}
