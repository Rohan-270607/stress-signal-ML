import type { AnalysisRequest, AnalysisResponse, ApiErrorResponse } from '../types'
import { MANDATORY_DISCLAIMER } from '../data/prompts'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  crisis_flag: boolean
  crisis_message: string | null
  disclaimer: string
  safetyRan: boolean

  constructor(
    message: string,
    status: number,
    crisis_flag = false,
    crisis_message: string | null = null,
    disclaimer = MANDATORY_DISCLAIMER,
    safetyRan = false
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.crisis_flag = crisis_flag
    this.crisis_message = crisis_message
    this.disclaimer = disclaimer
    this.safetyRan = safetyRan
  }
}

/** What the UI needs to show about a failed request. */
export interface AppError {
  message: string
  safetyCheckMissed: boolean
}

export function toAppError(err: unknown): AppError {
  if (err instanceof ApiError) {
    // A 422 means the input was rejected, not that the service failed; the editors block those inputs anyway.
    return { message: err.message, safetyCheckMissed: err.status !== 422 && !err.safetyRan }
  }
  return { message: 'Something went wrong while reading your entry.', safetyCheckMissed: true }
}

/**
 * Analyze text endpoint: POST /analyze
 * Strictly adheres to docs/api_contract.md
 */
export async function analyzeText(req: AnalysisRequest): Promise<AnalysisResponse> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req)
    })
  } catch {
    throw new ApiError("We couldn't reach the analysis service. Your text is still here, and nothing was saved.", 0)
  }

  // Handle 200 OK
  if (res.ok) {
    const data: AnalysisResponse = await res.json()
    return data
  }

  // Handle 422 or 503 errors
  let errorBody: ApiErrorResponse = {}
  try {
    errorBody = await res.json()
  } catch {
    // Body not JSON
  }

  const crisisFlag = Boolean(errorBody.crisis_flag)
  const crisisMessage = errorBody.crisis_message ?? null
  const disclaimer = errorBody.disclaimer ?? MANDATORY_DISCLAIMER
  // The contract's 503 body carries crisis_flag because the safety layer still ran. No field means it may not have.
  const safetyRan = typeof errorBody.crisis_flag === 'boolean'

  if (res.status === 422) {
    let msg = 'The input text must be between 1 and 5,000 characters and cannot be blank.'
    if (Array.isArray(errorBody.detail) && errorBody.detail.length > 0) {
      msg = errorBody.detail.map((d) => d.msg).join('; ')
    } else if (typeof errorBody.detail === 'string') {
      msg = errorBody.detail
    }
    throw new ApiError(msg, 422, crisisFlag, crisisMessage, disclaimer, safetyRan)
  }

  if (res.status === 503) {
    const msg = typeof errorBody.detail === 'string'
      ? errorBody.detail
      : 'Analysis service is temporarily unavailable.'
    // On 503, safety layer still ran, so crisis_flag & crisis_message must be preserved!
    throw new ApiError(msg, 503, crisisFlag, crisisMessage, disclaimer, safetyRan)
  }

  throw new ApiError(
    `Server returned HTTP error ${res.status}`,
    res.status,
    crisisFlag,
    crisisMessage,
    disclaimer,
    safetyRan
  )
}
