import { MANDATORY_DISCLAIMER } from '../data/prompts'
import type { AnalysisResponse, FeatureExplanation, MultiAnswerAnalysisResult } from '../types'
import { analyzeText, ApiError } from './api'

export type ScoredItem = MultiAnswerAnalysisResult['per_answer_results'][number]

/** Something to score on its own: a guided answer or a diary day. */
export interface ScoreInput {
  id: string
  label: string
  text: string
}

export interface ScoreOutcome {
  /** Null when any item failed: a partial average would quietly leave answers out. */
  result: MultiAnswerAnalysisResult | null
  /** Set when ANY item, including one that failed, carried a crisis message. */
  crisisMessage: string | null
  /** The first failure, if any. */
  error: unknown
}

// Same cut-off the backend uses for its own explanations (MIN_ABS in ml/src/explain.py)
const MIN_CONTRIBUTION = 0.02

/**
 * Mean contribution per feature across all items. Each response only reports its top features, so
 * a feature an item didn't report counts as zero, which makes this an approximation. The sentence
 * comes from an item that moved in the same direction as the mean, so it can't contradict the bar.
 */
export function aggregateExplanations(results: ScoredItem[]): FeatureExplanation[] {
  if (results.length === 0) return []
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

/**
 * Scores every item on its own (DECISIONS D-15: never join them into one text) and averages the scores.
 * allSettled, not a loop that stops at the first failure: every item must reach the safety layer.
 */
export async function scoreItems(
  items: ScoreInput[],
  analyze: (req: { text: string }) => Promise<AnalysisResponse> = analyzeText
): Promise<ScoreOutcome> {
  const settled = await Promise.allSettled(items.map(item => analyze({ text: item.text })))

  const results: ScoredItem[] = []
  let crisisMessage: string | null = null
  let error: unknown = null

  settled.forEach((outcome, idx) => {
    const item = items[idx]
    if (outcome.status === 'fulfilled') {
      results.push({
        prompt_id: item.id,
        prompt_text: item.label,
        answer_text: item.text,
        response: outcome.value
      })
      if (outcome.value.crisis_flag && outcome.value.crisis_message) crisisMessage = outcome.value.crisis_message
    } else {
      error ??= outcome.reason
      if (outcome.reason instanceof ApiError && outcome.reason.crisis_flag && outcome.reason.crisis_message) {
        crisisMessage = outcome.reason.crisis_message
      }
    }
  })

  if (error || results.length === 0) return { result: null, crisisMessage, error }

  const meanScore = +(results.reduce((sum, r) => sum + r.response.stress_score, 0) / results.length).toFixed(4)
  return {
    result: {
      mean_score: meanScore,
      overall_label: meanScore >= 0.5 ? 'higher_signal' : 'lower_signal',
      crisis_flag: crisisMessage !== null,
      crisis_message: crisisMessage,
      disclaimer: results[0].response.disclaimer || MANDATORY_DISCLAIMER,
      per_answer_results: results,
      aggregated_explanations: aggregateExplanations(results)
    },
    crisisMessage,
    error: null
  }
}
