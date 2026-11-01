import { useEffect, useState } from 'react'
import { AboutModal } from './components/AboutModal'
import { CrisisBanner } from './components/CrisisBanner'
import { FreeformEditor } from './components/FreeformEditor'
import { GuidedJournal } from './components/GuidedJournal'
import { Header } from './components/Header'
import { MultiResultView } from './components/MultiResultView'
import { ResultView } from './components/ResultView'
import { analyzeText, ApiError, checkBackendHealth } from './services/api'
import type { AnalysisResponse, MultiAnswerAnalysisResult } from './types'

export function App() {
  const [activeTab, setActiveTab] = useState<'freeform' | 'guided'>('freeform')
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)

  // Crisis state: non-negotiable rule 2, persists across views if triggered
  const [crisisFlag, setCrisisFlag] = useState(false)
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null)

  // Analysis state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Results
  const [freeformResult, setFreeformResult] = useState<AnalysisResponse | null>(null)
  const [lastSubmittedText, setLastSubmittedText] = useState<string>('')
  const [guidedResult, setGuidedResult] = useState<MultiAnswerAnalysisResult | null>(null)

  // Initial backend health check
  useEffect(() => {
    let mounted = true
    checkBackendHealth()
      .then(res => {
        if (mounted && res.status === 'ok') {
          setBackendConnected(true)
        }
      })
      .catch(() => {
        if (mounted) {
          setBackendConnected(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleFreeformAnalyze = async (text: string) => {
    setIsLoading(true)
    setError(null)
    setLastSubmittedText(text)

    try {
      const response = await analyzeText({ text })
      setFreeformResult(response)

      if (response.crisis_flag && response.crisis_message) {
        setCrisisFlag(true)
        setCrisisMessage(response.crisis_message)
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.crisis_flag && err.crisis_message) {
          setCrisisFlag(true)
          setCrisisMessage(err.crisis_message)
        }
        setError(err.message)
      } else {
        setError(err.message || 'An unexpected error occurred while analyzing the text.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFreeformResult(null)
    setGuidedResult(null)
    setError(null)
    setLastSubmittedText('')
  }

  return (
    <div className="app-layout">
      {/* Non-negotiable Crisis Banner (top of viewport, verbatim message) */}
      {crisisFlag && crisisMessage && (
        <CrisisBanner message={crisisMessage} />
      )}

      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab)
          handleReset()
        }}
        onOpenAbout={() => setAboutOpen(true)}
        backendConnected={backendConnected}
      />

      <main className="main-content">
        <div className="content-container">
          {activeTab === 'freeform' && (
            <>
              {!freeformResult ? (
                <FreeformEditor
                  onAnalyze={handleFreeformAnalyze}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                <ResultView
                  result={freeformResult}
                  entryText={lastSubmittedText}
                  onReset={handleReset}
                />
              )}
            </>
          )}

          {activeTab === 'guided' && (
            <>
              {!guidedResult ? (
                <GuidedJournal
                  onComplete={(multiRes) => setGuidedResult(multiRes)}
                  onError={(msg) => setError(msg)}
                  onCrisisTrigger={(msg) => {
                    setCrisisFlag(true)
                    setCrisisMessage(msg)
                  }}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              ) : (
                <MultiResultView
                  result={guidedResult}
                  onReset={handleReset}
                />
              )}
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <p className="footer-disclaimer">
            <strong>Mandatory Notice:</strong> This is not a diagnosis or a substitute for professional care.
          </p>
          <p className="footer-meta">
            Specula Project · Interpretable Psycholinguistic Modeling · Non-commercial student wellness research
          </p>
        </div>
      </footer>

      <AboutModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
    </div>
  )
}

export default App
