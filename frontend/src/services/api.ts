import type { AnalysisRequest, AnalysisResponse, ApiErrorResponse } from '../types'
import { MANDATORY_DISCLAIMER } from '../data/prompts'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  crisis_flag: boolean
  crisis_message: string | null
  disclaimer: string

  constructor(
    message: string,
    status: number,
    crisis_flag = false,
    crisis_message: string | null = null,
    disclaimer = MANDATORY_DISCLAIMER
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.crisis_flag = crisis_flag
    this.crisis_message = crisis_message
    this.disclaimer = disclaimer
  }
}

/**
 * Health check endpoint: GET /health
 */
export async function checkBackendHealth(): Promise<{ status: string; model_loaded: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    if (!res.ok) {
      throw new Error(`Health check failed with HTTP ${res.status}`)
    }
    return await res.json()
  } catch (err: any) {
    throw new Error(err.message || 'Cannot connect to backend ML service at http://localhost:8000')
  }
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
  } catch (networkErr: any) {
    throw new ApiError(
      'Unable to connect to the analysis backend. Please make sure the service is running at http://localhost:8000.',
      0,
      false,
      null,
      MANDATORY_DISCLAIMER
    )
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

  if (res.status === 422) {
    let msg = 'The input text must be between 1 and 5,000 characters and cannot be blank.'
    if (Array.isArray(errorBody.detail) && errorBody.detail.length > 0) {
      msg = errorBody.detail.map((d: any) => d.msg).join('; ')
    } else if (typeof errorBody.detail === 'string') {
      msg = errorBody.detail
    }
    throw new ApiError(msg, 422, crisisFlag, crisisMessage, disclaimer)
  }

  if (res.status === 503) {
    const msg = typeof errorBody.detail === 'string'
      ? errorBody.detail
      : 'Analysis service is temporarily unavailable.'
    // On 503, safety layer still ran, so crisis_flag & crisis_message must be preserved!
    throw new ApiError(msg, 503, crisisFlag, crisisMessage, disclaimer)
  }

  throw new ApiError(
    `Server returned HTTP error ${res.status}`,
    res.status,
    crisisFlag,
    crisisMessage,
    disclaimer
  )
}
