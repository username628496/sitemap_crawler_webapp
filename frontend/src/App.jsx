import { useState } from 'react'
import Header from './components/Header'
import CrawlForm from './components/CrawlForm'
import CrawlResults from './components/CrawlResults'
import GPContentResults from './components/GPContentResults'
import HistorySection from './components/HistorySection'
import WelcomePopup from './components/WelcomePopup'
import Footer from './components/Footer'
import { useGPContentCrawl } from './hooks/useGPContentCrawl'

function App() {
  const [crawlResults, setCrawlResults] = useState([])
  const [refreshHistory, setRefreshHistory] = useState(0)

  // GP Content Crawler state
  const {
    isLoading: isGPContentLoading,
    results: gpContentResults,
    progress: gpContentProgress,
    currentDomain: gpCurrentDomain,
    domainInfos: gpDomainInfos,
    startCrawl: startGPContentCrawl,
    clearResults: clearGPContentResults
  } = useGPContentCrawl()

  // ✅ Update results immediately as each domain completes
  const handleResultUpdate = (results) => {
    console.log('App: handleResultUpdate called with', results.length, 'results')
    setCrawlResults(results)
  }

  // Called when ALL domains complete
  const handleCrawlComplete = (results) => {
    console.log('App: handleCrawlComplete called')
    setCrawlResults(results)
    setTimeout(() => {
      const resultsElement = document.getElementById('crawl-results')
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setRefreshHistory(prev => prev + 1)
    }, 100)
  }

  const handleClearResults = () => {
    setCrawlResults([])
  }

  const handleGPContentCrawl = (domains) => {
    clearGPContentResults()
    startGPContentCrawl(domains)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <WelcomePopup />
      <div className="bg-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Header />
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <main className="space-y-6">
          <CrawlForm
            onCrawlComplete={handleCrawlComplete}
            onResultUpdate={handleResultUpdate}
            crawlResults={crawlResults}
            onClearResults={handleClearResults}
            onGPContentCrawl={handleGPContentCrawl}
            isGPContentLoading={isGPContentLoading}
          />

          <CrawlResults
            results={crawlResults}
            onRefreshHistory={() => setRefreshHistory(prev => prev + 1)}
          />

          <GPContentResults
            results={gpContentResults}
            isLoading={isGPContentLoading}
            progress={gpContentProgress}
            currentDomain={gpCurrentDomain}
            domainInfos={gpDomainInfos}
          />

          <HistorySection refreshTrigger={refreshHistory} />
        </main>
      </div>

      <Footer />
    </div>
  )
}

export default App
