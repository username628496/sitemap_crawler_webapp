import { useState } from 'react'
import Header from './components/Header'
import CrawlForm from './components/CrawlForm'
import CrawlResults from './components/CrawlResults'
import HistorySection from './components/HistorySection'
import Footer from './components/Footer' // UI bản 2

function App() {
  const [crawlResults, setCrawlResults] = useState([])
  const [refreshHistory, setRefreshHistory] = useState(0)

  // Giữ logic bản 1: set results + scroll + tăng refreshHistory
  const handleCrawlComplete = (results) => {
    setCrawlResults(results)
    setTimeout(() => {
      const resultsElement = document.getElementById('crawl-results')
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setRefreshHistory(prev => prev + 1)
    }, 100)
  }

  // Giữ logic bản 1: clear results trước khi crawl mới
  const handleClearResults = () => {
    setCrawlResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header (UI bản 2) */}
      <div className="bg-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Header />
        </div>
      </div>

      {/* Main Container (UI bản 2: flex-1 + space-y-6) */}
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <main className="space-y-6">
          <CrawlForm
            onCrawlComplete={handleCrawlComplete}
            crawlResults={crawlResults}          // giữ props bản 1
            onClearResults={handleClearResults}  // giữ props bản 1
          />

          {/* Giữ behavior bản 1: luôn render CrawlResults */}
          <CrawlResults
            results={crawlResults}
            onRefreshHistory={() => setRefreshHistory(prev => prev + 1)}
          />

          <HistorySection refreshTrigger={refreshHistory} />
        </main>
      </div>

      {/* Footer (UI bản 2 dùng component riêng) */}
      <Footer />
    </div>
  )
}

export default App