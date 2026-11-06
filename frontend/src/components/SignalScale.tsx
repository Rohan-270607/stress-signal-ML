import React from 'react'

interface SignalScaleProps {
  score: number
  isHigher: boolean
  /** Optional per-answer scores, drawn as small ticks so the spread behind a mean stays visible. */
  points?: number[]
}

const toPercent = (value: number) => `${Math.min(Math.max(value, 0), 1) * 100}%`

export const SignalScale: React.FC<SignalScaleProps> = ({ score, isHigher, points = [] }) => (
  <div
    className={`scale ${isHigher ? 'scale-higher' : 'scale-lower'}`}
    role="img"
    aria-label={`Signal score ${score.toFixed(2)} on a scale from 0 to 1. Scores of 0.5 or more are labelled higher.`}
  >
    <div className="scale-track">
      <span className="scale-threshold" />
      {points.map((point, idx) => (
        <span key={idx} className="scale-point" style={{ left: toPercent(point) }} />
      ))}
      <span className="scale-marker" style={{ left: toPercent(score) }} />
    </div>
    <div className="scale-labels" aria-hidden="true">
      <span>0 lower</span>
      <span>0.5</span>
      <span>1 higher</span>
    </div>
  </div>
)
