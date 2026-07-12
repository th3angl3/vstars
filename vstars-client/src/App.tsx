import { useState } from "react"
import "./App.css"
import { getTrTimetable } from "./services/api"
import TimetableBuilderPage from "./pages/TimetableBuilderPage"
import VenueFinderPage from "./pages/VenueFinderPage"
import TrTimetablePage from "./pages/TrTimetablePage"
import type { TrTtResponse } from "./types"

function App() {
    const [activeTab, setActiveTab] = useState<"timetable" | "venue">("timetable")
    const [selectedTr, setSelectedTr] = useState("")
    const [trDetails, setTrDetails] = useState<TrTtResponse | null>(null)
    const [trLoading, setTrLoading] = useState(false)
    const [trError, setTrError] = useState("")
    const [showTrPage, setShowTrPage] = useState(false)

    async function handleViewTrTimetable(tr: string) {
        setSelectedTr(tr)
        setShowTrPage(true)
        setTrLoading(true)
        setTrError("")

        try {
            const result = await getTrTimetable(tr)
            setTrDetails(result)

            if (!result.success) {
                setTrError("No timetable data was returned for that TR.")
            }
        } catch (error) {
            setTrError(
                error instanceof Error
                    ? error.message
                    : "Unable to fetch TR timetable."
            )
            setTrDetails(null)
        } finally {
            setTrLoading(false)
        }
    }

    return (
        <div className="app-shell">
            <main className="card tab-card">
                {!showTrPage ? (
                    <div className="tab-switcher" role="tablist" aria-label="Tools">
                        <button
                            type="button"
                            className={`tab-button ${activeTab === "timetable" ? "active" : ""}`}
                            onClick={() => setActiveTab("timetable")}
                        >
                            Timetable builder
                        </button>

                        <button
                            type="button"
                            className={`tab-button ${activeTab === "venue" ? "active" : ""}`}
                            onClick={() => setActiveTab("venue")}
                        >
                            Venue finder
                        </button>
                    </div>
                ) : null}

                {showTrPage ? (
                    <TrTimetablePage
                        tr={selectedTr}
                        details={trDetails}
                        loading={trLoading}
                        error={trError}
                        onBack={() => setShowTrPage(false)}
                    />
                ) : activeTab === "timetable" ? (
                    <TimetableBuilderPage />
                ) : (
                    <VenueFinderPage onSelectTr={handleViewTrTimetable} />
                )}
            </main>
        </div>
    )
}

export default App