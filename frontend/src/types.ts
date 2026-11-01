/**
 * API Contract types for the Student Stress-Signal Analysis Service
 * Source of truth: docs/api_contract.md
 */

export interface AnalysisRequest {
  text: string
}

export type FeatureKey =
  | 'first_person_rate'
  | 'absolutist_rate'
  | 'negative_emotion_rate'
  | 'negation_rate'
  | 'question_rate'
  | 'exclamation_rate'
  | 'word_count'
  | string

export interface FeatureExplanation {
  feature: FeatureKey
  direction: 'increases' | 'decreases'
  contribution: number // SHAP log-odds contribution
  plain_text: string
}

export interface AnalysisResponse {
  stress_score: number // float, 0-1
  label: 'higher_signal' | 'lower_signal'
  explanation: FeatureExplanation[]
  crisis_flag: boolean
  crisis_message: string | null
  disclaimer: string
}

export interface ApiErrorResponse {
  detail?: string | Array<{ type: string; loc: string[]; msg: string }>
  crisis_flag?: boolean
  crisis_message?: string | null
  disclaimer?: string
}

export interface GuidedPrompt {
  id: string
  text: string
}

export interface GuidedJournalingConfig {
  version: number
  status: string
  note: string
  scoring: 'per_answer_mean'
  min_words_hint: number
  skippable: boolean
  prompts: GuidedPrompt[]
}

export interface MultiAnswerAnalysisResult {
  mean_score: number
  overall_label: 'higher_signal' | 'lower_signal'
  crisis_flag: boolean
  crisis_message: string | null
  disclaimer: string
  per_answer_results: Array<{
    prompt_id: string
    prompt_text: string
    answer_text: string
    response: AnalysisResponse
  }>
  aggregated_explanations: FeatureExplanation[]
}
