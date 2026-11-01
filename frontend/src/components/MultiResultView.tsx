import React, { useState } from 'react'
import type { MultiAnswerAnalysisResult } from '../types'
import { Disclaimer } from './Disclaimer'

interface MultiResultViewProps {
  result: MultiAnswerAnalysisResult
  onReset: () => void
}

export const MultiResultView: React.FC<MultiResultViewProps> = ({ result, onReset }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const isHigher = result.overall_label === 'higher_signal'

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="result-view-container animate-fade-in">
      <div className="result-header">
        <div>
          <h2 className="result-title">Guided Reflection Synthesis</h2>
          <p className="result-subtitle">
            Averaged signal across {result.per_answer_results.length} answered inquiries (evaluated independently).
          </p>
        </div>
        <button
          onClick={onReset}
          className="btn btn-secondary btn-sm"
          type="button"
        >
          New Inquiries
        </button>
      </div>

      {/* Aggregate Score Card */}
      <div className={`signal-summary-card ${isHigher ? 'signal-higher' : 'signal-lower'}`}>
        <div className="signal-gauge-section">
          <div className="signal-meter-wrap">
            <svg className="gauge-svg" viewBox="0 0 200 110">
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                className="gauge-bg-arc"
              />
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (result.mean_score * 251.2)}
                className="gauge-val-arc"
              />
            </svg>
            <div className="gauge-center-text">
              <span className="gauge-score-num">{result.mean_score.toFixed(3)}</span>
              <span className="gauge-score-sub">Mean Score</span>
            </div>
          </div>

          <div className="signal-status-meta">
            <div className="badge-row">
              <span className={`signal-badge ${isHigher ? 'badge-elevated' : 'badge-baseline'}`}>
                {isHigher ? 'Higher Stress Signal (Mean ≥ 0.5)' : 'Lower Stress Signal (Mean < 0.5)'}
              </span>
              <span className="signal-type-tag">Per-Answer Calibration</span>
            </div>
            <p className="signal-desc-text">
              {isHigher
                ? 'On average across your reflections, the psycholinguistic word choices exhibit higher stylistic affinity with elevated academic stress markers.'
                : 'Across your reflections, your linguistic markers average within lower baseline patterns.'}
            </p>
          </div>
        </div>
      </div>

      {/* Aggregated Features */}
      {result.aggregated_explanations.length > 0 && (
        <div className="explanations-card">
          <div className="explanations-header">
            <div>
              <h3 className="section-title">Dominant Feature Attributions</h3>
              <p className="section-subtitle">
                Averaged SHAP feature contributions across all submitted prompt responses.
              </p>
            </div>
          </div>

          <div className="explanation-list">
            {result.aggregated_explanations.map((item, idx) => {
              const isIncrease = item.direction === 'increases'
              return (
                <div key={idx} className={`explanation-row ${isIncrease ? 'row-increase' : 'row-decrease'}`}>
                  <div className="feature-info-col">
                    <span className="feature-name">{item.feature.replace(/_/g, ' ')}</span>
                    <span className={`direction-tag ${isIncrease ? 'tag-increase' : 'tag-decrease'}`}>
                      {isIncrease ? '↑ Increases signal' : '↓ Decreases signal'}
                    </span>
                  </div>
                  <div className="bar-and-reason-col">
                    <div className="bar-wrapper">
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${isIncrease ? 'bar-increase' : 'bar-decrease'}`}
                          style={{ width: `${Math.min(Math.abs(item.contribution) * 40, 100)}%` }}
                        />
                      </div>
                      <span className="bar-value">
                        {item.contribution > 0 ? `+${item.contribution.toFixed(3)}` : item.contribution.toFixed(3)}
                      </span>
                    </div>
                    <p className="plain-reason-text">{item.plain_text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Breakdown per Inquiry Accordion */}
      <div className="per-inquiry-section">
        <h3 className="section-title">Individual Inquiry Breakdown</h3>
        <p className="section-subtitle">Inspect the specific score and feature drivers for each reflection.</p>

        <div className="accordion-list">
          {result.per_answer_results.map((item, idx) => {
            const isItemHigher = item.response.label === 'higher_signal'
            const isExpanded = expandedId === item.prompt_id

            return (
              <div key={idx} className="accordion-item">
                <button
                  type="button"
                  className="accordion-trigger"
                  onClick={() => toggleExpand(item.prompt_id)}
                >
                  <div className="accordion-trigger-left">
                    <span className="inquiry-badge">Inquiry {idx + 1}</span>
                    <span className="accordion-prompt-text">{item.prompt_text}</span>
                  </div>
                  <div className="accordion-trigger-right">
                    <span className={`mini-badge ${isItemHigher ? 'badge-elevated' : 'badge-baseline'}`}>
                      {item.response.stress_score.toFixed(3)}
                    </span>
                    <span className="accordion-arrow">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="accordion-content animate-fade-in">
                    <div className="inquiry-quote-box">
                      <p>"{item.answer_text}"</p>
                    </div>

                    <div className="inquiry-features">
                      <h4 className="inquiry-features-title">Features for this inquiry:</h4>
                      {item.response.explanation.length === 0 ? (
                        <p className="sub-text">No significant feature movements.</p>
                      ) : (
                        <ul className="inquiry-feature-bullets">
                          {item.response.explanation.map((exp, eIdx) => (
                            <li key={eIdx}>
                              <strong>{exp.feature.replace(/_/g, ' ')}</strong> ({exp.contribution > 0 ? `+${exp.contribution.toFixed(2)}` : exp.contribution.toFixed(2)}): {exp.plain_text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Disclaimer customText={result.disclaimer} />
    </div>
  )
}
