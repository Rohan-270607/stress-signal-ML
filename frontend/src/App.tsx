import { useEffect, useState } from 'react'
import { AboutModal } from './components/AboutModal'
import { CrisisBanner } from './components/CrisisBanner'
import { FreeformEditor } from './components/FreeformEditor'
import { GuidedJournal } from './components/GuidedJournal'
import { DiaryView } from './components/DiaryView'
import { Header } from './components/Header'
import type { Tab } from './components/Header'
import { MultiResultView } from './components/MultiResultView'
import { ResultView } from './components/ResultView'
import { MANDATORY_DISCLAIMER } from './data/prompts'
import { analyzeText, ApiError, toAppError } from './services/api'
import type { AppError } from './services/api'
import type { AnalysisResponse, MultiAnswerAnalysisResult } from './types'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('freeform')
  const [aboutOpen, setAboutOpen] = useState(false)

  // Crisis state: non-negotiable rule 2, persists across views if triggered
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null)

  // Analysis state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  // What the student has written lives here, in memory only, so switching tabs or viewing a result never loses it
  const [draft, setDraft] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // Results
  const [freeformResult, setFreeformResult] = useState<AnalysisResponse | null>(null)
  const [guidedResult, setGuidedResult] = useState<MultiAnswerAnalysisResult | null>(null)
  const [diaryDrafts, setDiaryDrafts] = useState<Record<string, string>>({})
  const [diaryResult, setDiaryResult] = useState<MultiAnswerAnalysisResult | null>(null)

  // The crisis panel sits at the top of the page, and the browser's scroll anchoring would otherwise
  // keep the view on the content below it. A new result should also start from the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [crisisMessage, freeformResult, guidedResult, diaryResult])

  const handleFreeformAnalyze = async (text: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await analyzeText({ text })
      setFreeformResult(response)

      if (response.crisis_flag && response.crisis_message) {
        setCrisisMessage(response.crisis_message)
      }
    } catch (err) {
      if (err instanceof ApiError && err.crisis_flag && err.crisis_message) {
        setCrisisMessage(err.crisis_message)
      }
      setError(toAppError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectTab = (tab: Tab) => {
    setActiveTab(tab)
    setError(null)
  }

  const handleResetFreeform = () => {
    setFreeformResult(null)
    setDraft('')
    setError(null)
  }

  const handleResetGuided = () => {
    setGuidedResult(null)
    setAnswers({})
    setError(null)
  }

  return (
    <div className="app-layout">
      {/* Non-negotiable Crisis Banner (top of viewport, verbatim message) */}
      {crisisMessage && <CrisisBanner message={crisisMessage} />}

      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenAbout={() => setAboutOpen(true)}
      />

      <main className="main-content">
        <div className="content-container">
          {activeTab === 'freeform' && (
            freeformResult ? (
              <ResultView
                result={freeformResult}
                entryText={draft}
                onEdit={() => setFreeformResult(null)}
                onReset={handleResetFreeform}
              />
            ) : (
              <FreeformEditor
                text={draft}
                onTextChange={setDraft}
                onAnalyze={handleFreeformAnalyze}
                isLoading={isLoading}
                error={error}
              />
            )
          )}

          {activeTab === 'guided' && (
            guidedResult ? (
              <MultiResultView
                result={guidedResult}
                onEdit={() => setGuidedResult(null)}
                onReset={handleResetGuided}
              />
            ) : (
              <GuidedJournal
                answers={answers}
                onAnswersChange={setAnswers}
                onComplete={setGuidedResult}
                onError={setError}
                onCrisisTrigger={setCrisisMessage}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                error={error}
              />
            )
          )}

          {activeTab === 'diary' && (
            <DiaryView
              drafts={diaryDrafts}
              onDraftsChange={setDiaryDrafts}
              result={diaryResult}
              onResult={setDiaryResult}
              onCrisis={setCrisisMessage}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>{MANDATORY_DISCLAIMER}</p>
        <p className="footer-meta">Specula is a non-commercial student research project.</p>
      </footer>

      <AboutModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
    </div>
  )
}

export default App
