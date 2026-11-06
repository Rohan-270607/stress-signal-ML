import React, { useEffect, useRef, useState } from 'react'

interface CrisisBannerProps {
  message: string
}

// URLs (without trailing punctuation) and phone numbers such as 988 or 116 123
const LINK_PATTERN = /(https?:\/\/[^\s]+?)(?=[.,;:)]?(?:\s|$))|(\b\d[\d -]{1,13}\d\b)/g

/**
 * Makes the numbers and links in the backend message tappable. Only wraps text in links, so the
 * wording stays verbatim (Rule 2) and any helpline edit in ml/src/safety.py appears here unchanged.
 */
function linkify(message: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let cursor = 0
  for (const match of message.matchAll(LINK_PATTERN)) {
    nodes.push(message.slice(cursor, match.index))
    const [text, url] = match
    nodes.push(
      url
        ? <a key={match.index} href={url} target="_blank" rel="noopener noreferrer">{text}</a>
        : <a key={match.index} href={`tel:${text.replace(/\D/g, '')}`}>{text}</a>
    )
    cursor = match.index + text.length
  }
  nodes.push(message.slice(cursor))
  return nodes
}

export const CrisisBanner: React.FC<CrisisBannerProps> = ({ message }) => {
  const panelRef = useRef<HTMLElement>(null)
  const [panelInView, setPanelInView] = useState(true)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    panel.focus({ preventScroll: true })
    const observer = new IntersectionObserver(
      ([entry]) => setPanelInView(entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] }
    )
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-label="Support and helplines"
        role="alert"
        className="crisis-panel"
      >
        <div className="crisis-inner">
          <h2 className="crisis-title">Support is available</h2>
          {/* Verbatim message required by Rule 2 */}
          <p className="crisis-message">{linkify(message)}</p>
        </div>
      </aside>

      {/* Never dismissible: when the panel scrolls away, this strip keeps the way back on screen */}
      {!panelInView && (
        <div className="crisis-strip">
          <span>Support is available</span>
          <button
            type="button"
            onClick={() => panelRef.current?.scrollIntoView({ block: 'start' })}
          >
            See helplines
          </button>
        </div>
      )}
    </>
  )
}
