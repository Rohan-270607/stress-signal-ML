import React from 'react'

interface HeaderProps {
  activeTab: 'freeform' | 'guided'
  onSelectTab: (tab: 'freeform' | 'guided') => void
  onOpenAbout: () => void
}

const TABS = [
  { id: 'freeform', label: 'Free writing' },
  { id: 'guided', label: 'Guided prompts' }
] as const

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAbout
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-group">
          <div className="brand-logo" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 5a7 7 0 0 0 0 14z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="brand-title">Specula</h1>
            <p className="brand-description">Reflective journaling, with reasons you can read</p>
          </div>
        </div>

        <nav className="mode-nav" aria-label="Journaling mode">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => onSelectTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <button type="button" className="nav-tab" onClick={onOpenAbout}>
            About
          </button>
        </nav>
      </div>
    </header>
  )
}
