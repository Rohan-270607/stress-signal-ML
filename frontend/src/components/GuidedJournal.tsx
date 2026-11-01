import React, { useState } from 'react'
import { GUIDED_PROMPTS_CONFIG } from '../data/prompts'
import { analyzeText } from '../services/api'
import type { AnalysisResponse, FeatureExplanation, MultiAnswerAnalysisResult } from '../types'
import { Disclaimer } from './Disclaimer'

interface GuidedJournalProps {
  onComplete: (multiResult: MultiAnswerAnalysisResult) => void
  onError: (errMessage: string) => void
  onCrisisTrigger: (crisisMessage: string) => void
  isLoading: boolean
  setIsLoading: (val: boolean) => void
}

export const GuidedJournal: React.FC<GuidedJournalProps> = ({
  onComplete,
  onError,
  onCrisisTrigger,
  isLoading,
  setIsLoading
}) => {
  const prompts = GUIDED_PROMPTS_CONFIG.prompts
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [activeStep, setActiveStep] = useState(0)

  const currentPrompt = prompts[activeStep]
  const currentAnswer = answers[currentPrompt.id] || ''
  const words = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0

  const handleTextChange = (text: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentPrompt.id]: text
    }))
  }

  const answeredCount = Object.values(answers).filter(a => a.trim().length > 0).length

  const handleSubmitAll = async () => {
    const answeredEntries = prompts
      .filter(p => (answers[p.id] || '').trim().length > 0)
      .map(p => ({
        id: p.id,
        prompt: p.text,
        text: (answers[p.id] || '').trim()
      }))

    if (answeredEntries.length === 0) {
      onError('Please write a response to at least one prompt before analyzing.')
      return
    }

    setIsLoading(true)

    try {
      // Analyze each answer independently according to DECISIONS D-15
      // (Do NOT join answers together: measured to bias calm entries to 99% higher signal)
      const results: Array<{
        prompt_id: string
        prompt_text: string
        answer_text: string
        response: AnalysisResponse
      }> = []

      let anyCrisis = false
      let crisisMsg: string | null = null

      for (const entry of answeredEntries) {
        const resp = await analyzeText({ text: entry.text })
        results.push({
          prompt_id: entry.id,
          prompt_text: entry.prompt,
          answer_text: entry.text,
          response: resp
        })

        if (resp.crisis_flag) {
          anyCrisis = true
          crisisMsg = resp.crisis_message
          if (resp.crisis_message) {
            onCrisisTrigger(resp.crisis_message)
          }
        }
      }

      // Compute mean score across answered prompts
      const meanScore = +(
        results.reduce((acc, r) => acc + r.response.stress_score, 0) / results.length
      ).toFixed(4)

      // Aggregate top features by summing or averaging contributions
      const featureSums: Record<string, { totalContrib: number; count: number; plain_text: string; direction: 'increases' | 'decreases' }> = {}
      for (const r of results) {
        for (const exp of r.response.explanation) {
          if (!featureSums[exp.feature]) {
            featureSums[exp.feature] = {
              totalContrib: exp.contribution,
              count: 1,
              plain_text: exp.plain_text,
              direction: exp.direction
            }
          } else {
            featureSums[exp.feature].totalContrib += exp.contribution
            featureSums[exp.feature].count += 1
          }
        }
      }

      const aggregatedExplanations: FeatureExplanation[] = Object.entries(featureSums)
        .map(([feature, val]) => {
          const avgContrib = +(val.totalContrib / val.count).toFixed(3)
          return {
            feature,
            direction: avgContrib >= 0 ? ('increases' as const) : ('decreases' as const),
            contribution: avgContrib,
            plain_text: val.plain_text
          }
        })
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, 4)

      const multiResult: MultiAnswerAnalysisResult = {
        mean_score: meanScore,
        overall_label: meanScore >= 0.5 ? 'higher_signal' : 'lower_signal',
        crisis_flag: anyCrisis,
        crisis_message: crisisMsg,
        disclaimer: results[0]?.response.disclaimer || 'This is not a diagnosis or a substitute for professional care.',
        per_answer_results: results,
        aggregated_explanations: aggregatedExplanations
      }

      onComplete(multiResult)
    } catch (err: any) {
      if (err.crisis_flag && err.crisis_message) {
        onCrisisTrigger(err.crisis_message)
      }
      onError(err.message || 'An error occurred during guided prompt analysis.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="guided-journal-card animate-fade-in">
      <div className="guided-header">
        <div>
          <span className="badge-pill">Fixed, Human-Reviewed Inquiries</span>
          <h2 className="guided-title">Guided Reflection Inquiries</h2>
          <p className="guided-subtitle">
            Reflect on structured inquiries one by one. Answers are scored individually and averaged (never concatenated) to maintain calibration.
          </p>
        </div>

        <div className="step-tracker">
          <span>Inquiry {activeStep + 1} of {prompts.length}</span>
          <div className="step-dots">
            {prompts.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className={`step-dot ${idx === activeStep ? 'active' : ''} ${(answers[p.id] || '').trim() ? 'filled' : ''}`}
                onClick={() => setActiveStep(idx)}
                title={`Go to inquiry ${idx + 1}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="prompt-display-box">
        <span className="prompt-index-tag">Prompt {activeStep + 1}</span>
        <h3 className="prompt-question-text">{currentPrompt.text}</h3>
      </div>

      <div className="textarea-container">
        <textarea
          value={currentAnswer}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Take your time to write a few sentences about this inquiry..."
          rows={6}
          className="journal-textarea"
          disabled={isLoading}
          maxLength={3000}
        />

        <div className="textarea-footer">
          <div className="counter-group">
            <span className="word-counter">
              {words} {words === 1 ? 'word' : 'words'}
            </span>
            <span className="char-counter">
              {currentAnswer.length} / 3,000 chars
            </span>
          </div>

          {words > 0 && words < 30 && (
            <span className="advisory-pill">
              ℹ️ ~30+ words per inquiry provides the most balanced linguistic signal
            </span>
          )}
        </div>
      </div>

      <div className="guided-nav-bar">
        <div className="guided-nav-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveStep(prev => Math.max(prev - 1, 0))}
            disabled={activeStep === 0 || isLoading}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveStep(prev => Math.min(prev + 1, prompts.length - 1))}
            disabled={activeStep === prompts.length - 1 || isLoading}
          >
            Next Inquiry →
          </button>
        </div>

        <div className="guided-nav-right">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmitAll}
            disabled={answeredCount === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span>Evaluating Inquiries...</span>
              </>
            ) : (
              <>
                <span>Analyze Reflections ({answeredCount} answered)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <Disclaimer compact />
    </div>
  )
}
