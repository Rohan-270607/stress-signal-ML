import React, { useState } from 'react'
import { GUIDED_PROMPTS_CONFIG } from '../data/prompts'
import { toAppError } from '../services/api'
import type { AppError } from '../services/api'
import { scoreItems } from '../services/scoring'
import type { MultiAnswerAnalysisResult } from '../types'
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
    const answered = prompts
      .filter(p => (answers[p.id] || '').trim().length > 0)
      .map(p => ({ id: p.id, label: p.text, text: (answers[p.id] || '').trim() }))

    if (answered.length === 0) return

    setIsLoading(true)
    onError(null)
    // Each answer is scored on its own and then averaged (DECISIONS D-15); every one reaches the safety layer.
    const outcome = await scoreItems(answered)
    if (outcome.crisisMessage) onCrisisTrigger(outcome.crisisMessage)
    setIsLoading(false)

    if (outcome.result) onComplete(outcome.result)
    else onError(toAppError(outcome.error))
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
