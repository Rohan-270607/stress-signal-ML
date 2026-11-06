import React from 'react'
import { featureMeta } from '../data/features'
import type { FeatureExplanation } from '../types'

// Keeps a tiny contribution visible without exaggerating it.
const MIN_BAR_PERCENT = 1.5
// Floor for the scale, so one small contribution doesn't fill the whole bar.
const MIN_SCALE = 1.5

export const FeatureBars: React.FC<{ items: FeatureExplanation[] }> = ({ items }) => {
  const scale = Math.max(...items.map(item => Math.abs(item.contribution)), MIN_SCALE)

  return (
    <div className="feature-list">
      <div className="feature-axis" aria-hidden="true">
        <span />
        <div className="feature-axis-labels">
          <span>lowers</span>
          <span>raises</span>
        </div>
        <span />
      </div>

      {items.map((item) => {
        const meta = featureMeta(item.feature)
        const isIncrease = item.direction === 'increases'
        // Half of the track each way, because the bars grow out from a centre line
        const width = Math.max((Math.abs(item.contribution) / scale) * 50, MIN_BAR_PERCENT)

        return (
          <div key={item.feature} className="feature-row">
            <div className="feature-name-col">
              <span className="feature-name">{meta.label}</span>
              {meta.specimen && <span className="feature-specimen">{meta.specimen}</span>}
            </div>
            <div className="feature-bar" aria-hidden="true">
              <span
                className={`feature-bar-fill ${isIncrease ? 'fill-raises' : 'fill-lowers'}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className={`feature-value ${isIncrease ? 'value-raises' : 'value-lowers'}`}>
              {item.contribution > 0 ? '+' : ''}{item.contribution.toFixed(2)}
            </span>
            <p className="feature-reason">{item.plain_text}</p>
          </div>
        )
      })}

      <p className="feature-note">
        Values are SHAP contributions in log-odds, compared with an average text. They are not percentages.
      </p>
    </div>
  )
}
