import React, { useState } from 'react'
import { GUIDED_PROMPTS_CONFIG, MANDATORY_DISCLAIMER } from '../data/prompts'
import { analyzeText, ApiError, toAppError } from '../services/api'
import type { AppError } from '../services/api'
import type { FeatureExplanation, MultiAnswerAnalysisResult } from '../types'
import { Disclaimer } from './Disclaimer'
import { ErrorNotice } from './ErrorNotice'

interface GuidedJournalProps {
  answers: Record<string, string>
  onAnswersChange: (answers: Record<string, string>) => void
  onComplete: (multiResult: MultiAnswerAnalysisResult) => void
  onError: (error: AppError | null) => void
  onCrisisTrigger: (crisisMessage: string) => void
  isLoading: boolean
  setIsLoading: (val: boolean) => void
  error: AppError | null
}

type AnswerResult = MultiAnswerAnalysisResult['per_answer_results'][number]

// Same cut-off the backend uses for its own explanations (MIN_ABS in ml/src/explain.py)
const MIN_CONTRIBUTION = 0.02

/**
 * Mean contribution per feature across all answers. Each response only reports its top features, so
 * a feature an answer didn't report counts as zero, which makes this an approximation. The sentence
 * comes from an answer that moved in the same direction as the mean, so it can't contradict the bar.
 */
function aggregateExplanations(results: AnswerResult[]): FeatureExplanation[] {
  const totals = new Map<string, { sum: number; increases?: string; decreases?: string }>()
  for (const { response } of results) {
    for (const item of response.explanation) {
      const total = totals.get(item.feature) ?? { sum: 0 }
      total.sum += item.contribution
      total[item.direction] ??= item.plain_text
      totals.set(item.feature, total)
    }
  }

  return [...totals.entries()]
    .map(([feature, total]) => {
      const contribution = total.sum / results.length
      const direction = contribution >= 0 ? ('increases' as const) : ('decreases' as const)
      return { feature, direction, contribution, plain_text: total[direction] ?? '' }
    })
    .filter(item => Math.abs(item.contribution) >= MIN_CONTRIBUTION)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 4)
}

export const GuidedJournal: React.FC<GuidedJournalProps> = ({
  answers,
  onAnswersChange,
  onComplete,
  onError,
  onCrisisTrigger,
  isLoading,
  setIsLoading,
  error
}) => {
  const prompts = GUIDED_PROMPTS_CONFIG.prompts
  const [activeStep, setActiveStep] = useState(0)

  const currentPrompt = prompts[activeStep]
  const currentAnswer = answers[currentPrompt.id] || ''
  const words = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0
  const isLastStep = activeStep === prompts.length - 1

  const answeredCount = prompts.filter(p => (answers[p.id] || '').trim()).length

  const handleSubmitAll = async () => {
    const answeredEntries = prompts
      .filter(p => (answers[p.id] || '').trim().length > 0)
      .map(p => ({
        id: p.id,
        prompt: p.text,
        text: (answers[p.id] || '').trim()
      }))

    if (answeredEntries.length === 0) return

    setIsLoading(true)
    onError(null)

    // Analyze each answer independently according to DECISIONS D-15
    // (Do NOT join answers together: measured to bias calm entries to 99% higher signal).
    // allSettled, not a loop that stops at the first failure: every answer must reach the safety layer.
    const settled = await Promise.allSettled(answeredEntries.map(entry => analyzeText({ text: entry.text })))

    const results: AnswerResult[] = []
    let anyCrisis = false
    let crisisMsg: string | null = null
    let firstError: unknown = null

    settled.forEach((outcome, idx) => {
      const entry = answeredEntries[idx]
      if (outcome.status === 'fulfilled') {
        results.push({
          prompt_id: entry.id,
          prompt_text: entry.prompt,
          answer_text: entry.text,
          response: outcome.value
        })
        if (outcome.value.crisis_flag) {
          anyCrisis = true
          crisisMsg = outcome.value.crisis_message
        }
      } else {
        firstError ??= outcome.reason
        if (outcome.reason instanceof ApiError && outcome.reason.crisis_flag) {
          anyCrisis = true
          crisisMsg = outcome.reason.crisis_message
        }
      }
    })

    if (crisisMsg) onCrisisTrigger(crisisMsg)
    setIsLoading(false)

    if (firstError) {
      onError(toAppError(firstError))
      return
    }

    // Compute mean score across answered prompts
    const meanScore = +(
      results.reduce((acc, r) => acc + r.response.stress_score, 0) / results.length
    ).toFixed(4)

    onComplete({
      mean_score: meanScore,
      overall_label: meanScore >= 0.5 ? 'higher_signal' : 'lower_signal',
      crisis_flag: anyCrisis,
      crisis_message: crisisMsg,
      disclaimer: results[0]?.response.disclaimer || MANDATORY_DISCLAIMER,
      per_answer_results: results,
      aggregated_explanations: aggregateExplanations(results)
    })
  }

  return (
    <div className="sheet animate-fade-in">
      <div className="guided-heading">
        <h2 className="page-title">One question at a time</h2>
        <span className="draft-tag">Draft prompts, pending review</span>
      </div>
      <p className="page-subtitle">
        Answer as many as you like and skip the rest. Each answer is scored on its own, then averaged.
      </p>

      <div className="step-bar" role="group" aria-label="Prompts">
        {prompts.map((p, idx) => {
          const isFilled = Boolean((answers[p.id] || '').trim())
          return (
            <button
              key={p.id}
              type="button"
              className={`step ${idx === activeStep ? 'active' : ''} ${isFilled ? 'filled' : ''}`}
              onClick={() => setActiveStep(idx)}
              aria-current={idx === activeStep ? 'step' : undefined}
              aria-label={`Prompt ${idx + 1}${isFilled ? ', answered' : ''}`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>

      <h3 className="prompt-question" id="guided-prompt">{currentPrompt.text}</h3>

      <textarea
        value={currentAnswer}
        onChange={(e) => onAnswersChange({ ...answers, [currentPrompt.id]: e.target.value })}
        placeholder="Start anywhere..."
        rows={7}
        className="journal-textarea"
        disabled={isLoading}
        maxLength={3000}
        aria-labelledby="guided-prompt"
      />

      <div className="word-progress" aria-hidden="true">
        <span style={{ width: `${Math.min(words / GUIDED_PROMPTS_CONFIG.min_words_hint, 1) * 100}%` }} />
      </div>

      <div className="textarea-footer">
        <span>
          {words >= GUIDED_PROMPTS_CONFIG.min_words_hint
            ? 'Enough for a steadier reading'
            : `About ${GUIDED_PROMPTS_CONFIG.min_words_hint} words or more gives a steadier reading`}
        </span>
        <span>{words} {words === 1 ? 'word' : 'words'} · {currentAnswer.length.toLocaleString()} / 3,000</span>
      </div>

      {error && <ErrorNotice error={error} />}

      <div className="guided-nav">
        <div className="action-buttons">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveStep(prev => Math.max(prev - 1, 0))}
            disabled={activeStep === 0 || isLoading}
          >
            Previous
          </button>
          {!isLastStep && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveStep(prev => prev + 1)}
              disabled={isLoading}
            >
              {currentAnswer.trim() ? 'Next' : 'Skip'}
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmitAll}
          disabled={answeredCount === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Reading your answers...</span>
            </>
          ) : `Analyse ${answeredCount} of ${prompts.length} answered`}
        </button>
      </div>

      <Disclaimer compact />
    </div>
  )
}
