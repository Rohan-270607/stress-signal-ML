/**
 * Display names for the model's seven features (ids from docs/api_contract.md).
 * `specimen` is a short sample of what each feature counts, checked against ml/lexicons/.
 */
export const FEATURE_META: Record<string, { label: string; specimen: string }> = {
  first_person_rate: { label: 'First-person words', specimen: 'I · me · my' },
  absolutist_rate: { label: 'Absolutist words', specimen: 'always · never' },
  negative_emotion_rate: { label: 'Negative-emotion words', specimen: 'afraid · angry' },
  negation_rate: { label: 'Negation', specimen: 'no · not · n’t' },
  word_count: { label: 'Entry length', specimen: 'word count' },
  question_rate: { label: 'Question marks', specimen: '?' },
  exclamation_rate: { label: 'Exclamation marks', specimen: '!' }
}

export function featureMeta(feature: string) {
  return FEATURE_META[feature] ?? { label: feature.replace(/_/g, ' '), specimen: '' }
}
