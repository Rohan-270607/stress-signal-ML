import { describe, expect, it, vi } from 'vitest'
import type { AnalysisResponse, FeatureExplanation } from '../types'
import { ApiError } from './api'
import { aggregateExplanations, scoreItems } from './scoring'
import type { ScoredItem } from './scoring'

const reason = (feature: string, contribution: number): FeatureExplanation => ({
  feature,
  direction: contribution > 0 ? 'increases' : 'decreases',
  contribution,
  plain_text: `${feature} ${contribution > 0 ? 'raised' : 'lowered'} the signal`
})

const response = (score: number, explanation: FeatureExplanation[] = [], crisis = false): AnalysisResponse => ({
  stress_score: score,
  label: score >= 0.5 ? 'higher_signal' : 'lower_signal',
  explanation,
  crisis_flag: crisis,
  crisis_message: crisis ? 'FIXED MESSAGE' : null,
  disclaimer: 'disclaimer'
})

const item = (id: string, r: AnalysisResponse): ScoredItem => ({ prompt_id: id, prompt_text: id, answer_text: id, response: r })

describe('aggregateExplanations', () => {
  it('averages over all items, counting an item that did not report a feature as zero', () => {
    const out = aggregateExplanations([
      item('a', response(0.5, [reason('first_person_rate', 1.0)])),
      item('b', response(0.5, []))
    ])
    expect(out).toHaveLength(1)
    expect(out[0].contribution).toBeCloseTo(0.5)
  })

  it('takes the direction from the sign of the mean and a sentence that agrees with it', () => {
    const up = aggregateExplanations([
      item('a', response(0.5, [reason('negation_rate', 0.9)])),
      item('b', response(0.5, [reason('negation_rate', -0.2)])),
      item('c', response(0.5, [reason('negation_rate', 0.4)]))
    ])
    expect(up[0].direction).toBe('increases')
    expect(up[0].plain_text).toContain('raised')

    const down = aggregateExplanations([
      item('a', response(0.5, [reason('negation_rate', 0.1)])),
      item('b', response(0.5, [reason('negation_rate', -0.9)]))
    ])
    expect(down[0].direction).toBe('decreases')
    expect(down[0].plain_text).toContain('lowered')
  })

  it('drops tiny contributions, keeps at most 4, and sorts by size', () => {
    const features = ['f1', 'f2', 'f3', 'f4', 'f5', 'tiny']
    const out = aggregateExplanations([
      item('a', response(0.5, features.map((f, i) => reason(f, f === 'tiny' ? 0.01 : 0.2 + i / 10))))
    ])
    expect(out.map(o => o.feature)).toEqual(['f5', 'f4', 'f3', 'f2'])
  })

  it('handles no items', () => {
    expect(aggregateExplanations([])).toEqual([])
  })
})

describe('scoreItems', () => {
  const inputs = [
    { id: 'a', label: 'Monday', text: 'first text' },
    { id: 'b', label: 'Tuesday', text: 'second text' },
    { id: 'c', label: 'Wednesday', text: 'third text' }
  ]

  it('scores every item on its own, never joined, and averages', async () => {
    const analyze = vi.fn(async ({ text }: { text: string }) =>
      response(text === 'first text' ? 0.2 : text === 'second text' ? 0.4 : 0.9))
    const { result, error } = await scoreItems(inputs, analyze)
    expect(error).toBeNull()
    expect(analyze.mock.calls.map(c => c[0].text)).toEqual(['first text', 'second text', 'third text'])
    expect(result?.mean_score).toBeCloseTo(0.5, 4)
    expect(result?.overall_label).toBe('higher_signal')
    expect(result?.per_answer_results.map(r => r.prompt_text)).toEqual(['Monday', 'Tuesday', 'Wednesday'])
  })

  it('flags the crisis if any one item is flagged, and uses the message verbatim', async () => {
    const analyze = vi.fn(async ({ text }: { text: string }) => response(0.3, [], text === 'second text'))
    const { result, crisisMessage } = await scoreItems(inputs, analyze)
    expect(crisisMessage).toBe('FIXED MESSAGE')
    expect(result?.crisis_flag).toBe(true)
    expect(result?.crisis_message).toBe('FIXED MESSAGE')
  })

  it('still surfaces a crisis from a later item when an earlier one failed, and returns no partial average', async () => {
    const analyze = vi.fn(async ({ text }: { text: string }) => {
      if (text === 'first text') throw new ApiError('unavailable', 503, false, null)
      return response(0.4, [], text === 'third text')
    })
    const { result, crisisMessage, error } = await scoreItems(inputs, analyze)
    expect(analyze).toHaveBeenCalledTimes(3) // a failure never stops the others reaching the safety layer
    expect(crisisMessage).toBe('FIXED MESSAGE')
    expect(result).toBeNull() // a partial average would quietly leave an entry out
    expect(error).toBeInstanceOf(ApiError)
  })

  it('uses the crisis message carried by a failed response (a 503 still ran the safety layer)', async () => {
    const analyze = vi.fn(async ({ text }: { text: string }) => {
      if (text === 'second text') throw new ApiError('unavailable', 503, true, 'FIXED MESSAGE FROM 503')
      return response(0.4)
    })
    const { crisisMessage, result } = await scoreItems(inputs, analyze)
    expect(crisisMessage).toBe('FIXED MESSAGE FROM 503')
    expect(result).toBeNull()
  })

  it('returns no result for no items', async () => {
    const { result } = await scoreItems([], vi.fn())
    expect(result).toBeNull()
  })
})
