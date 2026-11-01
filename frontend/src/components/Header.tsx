import React from 'react'

interface HeaderProps {
  activeTab: 'freeform' | 'guided'
  onSelectTab: (tab: 'freeform' | 'guided') => void
  onOpenAbout: () => void
  backendConnected: boolean | null
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAbout,
  backendConnected
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-group">
          <div className="brand-logo" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 12l5-5" />
              <path d="M12 6v6h6" />
            </svg>
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">Specula</h1>
              <span className="brand-subtag">Student Stress-Signal Navigator</span>
            </div>
            <p className="brand-description">
              Transparent, explainable psycholinguistic signal exploration for student journaling
            </p>
          </div>
        </div>

        <div className="header-controls">
          <nav className="mode-nav" aria-label="Journaling mode">
            <button
              type="button"
              className={`nav-tab ${activeTab === 'freeform' ? 'active' : ''}`}
              onClick={() => onSelectTab('freeform')}
            >
              Freeform Reflection
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'guided' ? 'active' : ''}`}
              onClick={() => onSelectTab('guided')}
            >
              Guided Inquiries
            </button>
          </nav>

          <div className="header-right-group">
            <button
              type="button"
              className="btn-icon"
              onClick={onOpenAbout}
              title="About the science, safety & limitations"
              aria-label="About system and safety"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>About</span>
            </button>

            <div
              className={`backend-status-dot ${backendConnected === true ? 'status-online' : backendConnected === false ? 'status-offline' : 'status-checking'}`}
              title={
                backendConnected === true
                  ? 'ML Backend connected (http://localhost:8000)'
                  : backendConnected === false
                  ? 'Backend unavailable. Ensure FastAPI is running on port 8000.'
                  : 'Checking backend status...'
              }
            >
              <span className="dot-pulse" />
              <span className="status-label">
                {backendConnected === true ? 'ML Live' : backendConnected === false ? 'Backend Offline' : 'Connecting'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
