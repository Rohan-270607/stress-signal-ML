import React from 'react'
import type { AnalysisResponse, FeatureExplanation } from '../types'
import { Disclaimer } from './Disclaimer'

interface ResultViewProps {
  result: AnalysisResponse
  entryText?: string
  onReset: () => void
  title?: string
  subtitle?: string
}

// Friendly titles and descriptions for features
const FEATURE_META: Record<string, { label: string; icon: string }> = {
  first_person_rate: {
    label: 'First-Person Pronouns',
    icon: '👤'
  },
  absolutist_rate: {
    label: 'Absolutist Phrasing',
    icon: '⚡'
  },
  negative_emotion_rate: {
    label: 'Negative Emotion Lexicon',
    icon: '🌧️'
  },
  negation_rate: {
    label: 'Negation Words',
    icon: '⛔'
  },
  word_count: {
    label: 'Entry Length (Word Count)',
    icon: '📏'
  },
  question_rate: {
    label: 'Question Markers',
    icon: '❓'
  },
  exclamation_rate: {
    label: 'Exclamation Markers',
    icon: '❗'
  }
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  entryText,
  onReset,
  title = 'Linguistic Signal Analysis',
  subtitle = 'Transparent breakdown of psycholinguistic patterns and SHAP feature attributions'
}) => {
  const isHigherSignal = result.label === 'higher_signal'
  const scorePercent = Math.round(result.stress_score * 100)

  // Max absolute contribution for proportional bar scaling (typical SHAP max is ~3.0)
  const maxAbsContrib = Math.max(
    ...result.explanation.map(e => Math.abs(e.contribution)),
    1.5
  )

  const wordCount = entryText ? (entryText.trim().match(/\S+/g) || []).length : null

  return (
    <div className="result-view-container animate-fade-in">
      <div className="result-header">
        <div>
          <h2 className="result-title">{title}</h2>
          <p className="result-subtitle">{subtitle}</p>
        </div>
        <button
          onClick={onReset}
          className="btn btn-secondary btn-sm"
          type="button"
        >
          New Reflection
        </button>
      </div>

      {/* Main Signal Gauge Card */}
      <div className={`signal-summary-card ${isHigherSignal ? 'signal-higher' : 'signal-lower'}`}>
        <div className="signal-gauge-section">
          <div className="signal-meter-wrap">
            <svg className="gauge-svg" viewBox="0 0 200 110">
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                className="gauge-bg-arc"
              />
              {/* Value Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (result.stress_score * 251.2)}
                className="gauge-val-arc"
              />
            </svg>
            <div className="gauge-center-text">
              <span className="gauge-score-num">{result.stress_score.toFixed(3)}</span>
              <span className="gauge-score-sub">{scorePercent}% probability</span>
            </div>
          </div>

          <div className="signal-status-meta">
            <div className="badge-row">
              <span className={`signal-badge ${isHigherSignal ? 'badge-elevated' : 'badge-baseline'}`}>
                {isHigherSignal ? 'Higher Stress Signal (≥ 0.5)' : 'Lower Stress Signal (< 0.5)'}
              </span>
              <span className="signal-type-tag">Transparent Soft Indication</span>
            </div>

            <p className="signal-desc-text">
              {isHigherSignal
                ? 'The linguistic markers in this entry show stylistic similarity to writings in research data produced during heightened academic stress.'
                : 'The linguistic markers in this entry align with calmer, baseline reflection benchmarks.'}
            </p>

            {wordCount !== null && wordCount < 30 && (
              <div className="word-count-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Short entry ({wordCount} words): rates have higher variance; longer texts yield steadier signals.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transparent Feature Explanation Section */}
      <div className="explanations-card">
        <div className="explanations-header">
          <div>
            <h3 className="section-title">Transparent Feature Explanations</h3>
            <p className="section-subtitle">
              Exact SHAP attributions explaining how specific linguistic features influenced the score relative to an average text.
            </p>
          </div>
          <span className="unit-pill">Units: Log-Odds (SHAP)</span>
        </div>

        {result.explanation.length === 0 ? (
          <div className="empty-explanation">
            <p>All feature contributions were close to neutral (&lt; 0.02 log-odds) for this text.</p>
          </div>
        ) : (
          <div className="explanation-list">
            {result.explanation.map((item: FeatureExplanation, idx: number) => {
              const meta = FEATURE_META[item.feature] || {
                label: item.feature.replace(/_/g, ' '),
                icon: '📊'
              }
              const isIncrease = item.direction === 'increases'
              const absVal = Math.abs(item.contribution)
              const barPercent = Math.min(Math.max((absVal / maxAbsContrib) * 100, 8), 100)

              return (
                <div key={idx} className={`explanation-row ${isIncrease ? 'row-increase' : 'row-decrease'}`}>
                  <div className="feature-info-col">
                    <span className="feature-icon" aria-hidden="true">{meta.icon}</span>
                    <div>
                      <span className="feature-name">{meta.label}</span>
                      <span className={`direction-tag ${isIncrease ? 'tag-increase' : 'tag-decrease'}`}>
                        {isIncrease ? '↑ Increases signal' : '↓ Decreases signal'}
                      </span>
                    </div>
                  </div>

                  <div className="bar-and-reason-col">
                    <div className="bar-wrapper">
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${isIncrease ? 'bar-increase' : 'bar-decrease'}`}
                          style={{ width: `${barPercent}%` }}
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
        )}
      </div>

      {/* Mandatory Disclaimer */}
      <Disclaimer customText={result.disclaimer} />
    </div>
  )
}
