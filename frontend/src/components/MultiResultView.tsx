import React from 'react'
import { featureMeta } from '../data/features'
import type { MultiAnswerAnalysisResult } from '../types'
import { Disclaimer } from './Disclaimer'
import { FeatureBars } from './FeatureBars'
import { SignalScale } from './SignalScale'

interface MultiResultViewProps {
  result: MultiAnswerAnalysisResult
  onEdit: () => void
  onReset: () => void
}

export const MultiResultView: React.FC<MultiResultViewProps> = ({ result, onEdit, onReset }) => {
  const isHigher = result.overall_label === 'higher_signal'
  const answers = result.per_answer_results
  const answerNoun = answers.length === 1 ? 'answer' : 'answers'

  return (
    <div className="sheet animate-fade-in">
      <section className={`summary ${isHigher ? 'summary-higher' : 'summary-lower'}`}>
        <div className="summary-head">
          <div className="summary-score">
            <span className="summary-number">{result.mean_score.toFixed(2)}</span>
            <span className="summary-caption">average of {answers.length} {answerNoun}</span>
          </div>
          <div>
            <p className="summary-label">{isHigher ? 'Higher signal' : 'Lower signal'}</p>
            <p className="summary-text">
              {isHigher
                ? 'On average, the word patterns in your answers resemble texts that annotators labelled as expressing stress.'
                : 'On average, the word patterns in your answers resemble texts that annotators did not label as expressing stress.'}
            </p>
          </div>
        </div>

        <SignalScale
          score={result.mean_score}
          isHigher={isHigher}
          points={answers.map(item => item.response.stress_score)}
        />
        <p className="summary-note">The small ticks are your individual answers. Each was scored on its own.</p>
      </section>

      {result.aggregated_explanations.length > 0 && (
        <section className="section">
          <h3 className="section-title">What moved the score</h3>
          <p className="section-subtitle">
            Averaged across your answers. This is approximate, because each answer only reports its strongest patterns.
          </p>
          <FeatureBars items={result.aggregated_explanations} />
        </section>
      )}

      <section className="section">
        <h3 className="section-title">Answer by answer</h3>
        <div className="answer-list">
          {answers.map((item) => (
            <details key={item.prompt_id} className="answer">
              <summary>
                <span className="answer-prompt">{item.prompt_text}</span>
                <span className={`answer-score ${item.response.label === 'higher_signal' ? 'value-raises' : 'value-lowers'}`}>
                  {item.response.stress_score.toFixed(2)}
                </span>
              </summary>
              <div className="answer-body">
                <p className="answer-text">{item.answer_text}</p>
                {item.response.explanation.length === 0 ? (
                  <p className="section-subtitle">Nothing moved this answer's score much.</p>
                ) : (
                  <ul className="answer-reasons">
                    {item.response.explanation.map((exp) => (
                      <li key={exp.feature}>
                        <strong>{featureMeta(exp.feature).label}:</strong> {exp.plain_text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      <Disclaimer customText={result.disclaimer} />

      <div className="result-actions">
        <button type="button" className="btn btn-ghost" onClick={onEdit}>Edit my answers</button>
        <button type="button" className="btn btn-secondary" onClick={onReset}>Start again</button>
      </div>
    </div>
  )
}
