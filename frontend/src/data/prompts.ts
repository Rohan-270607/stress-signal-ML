import promptsConfig from '../../../docs/journaling_prompts.json'
import type { GuidedJournalingConfig } from '../types'

/**
 * Guided journaling prompts. docs/journaling_prompts.json is the single source: never copy,
 * generate or change them at runtime. They are still drafts pending human review (DECISIONS D-16).
 */
export const GUIDED_PROMPTS_CONFIG = promptsConfig as GuidedJournalingConfig

export const MANDATORY_DISCLAIMER = 'This is not a diagnosis or a substitute for professional care.'
