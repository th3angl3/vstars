import { DAY_COLUMNS, TIME_SLOTS } from "../utils/schedule"
import type { TrTtResponse } from "../types"

interface TrTimetablePageProps {
    tr: string
    details: TrTtResponse | null
    loading: boolean
    error: string
    onBack: () => void
}

function TrTimetablePage({
    tr,
    details,
    loading,
    error,
    onBack,
}: TrTimetablePageProps) {
    return (
        <section>
            <div className="card-header">
                <div>
                    <p className="eyebrow">TR timetable</p>
                    <h2>{tr}</h2>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={onBack}
                >
                    Back to venue finder
                </button>
            </div>

            {loading ? <p className="meta-text">Loading timetable…</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            {details ? (
                <div className="timetable-page">
                    <div className="timetable-grid">
                        <div className="timetable-header">Time</div>

                        {DAY_COLUMNS.map((day) => (
                            <div key={day} className="timetable-header">
                                {day}
                            </div>
                        ))}

                        {TIME_SLOTS.map((slot, rowIndex) => (
                            <div key={`${slot}-row`} className="timetable-row">
                                <div className="time-label">{slot}</div>

                                {DAY_COLUMNS.map((day) => {
                                    const dayKey =
                                        day as keyof typeof details.courses
                                    const courses =
                                        details.courses[dayKey] ?? []

                                    const uniqueMatches = Array.from(
                                        new Map(
                                            courses
                                                .filter(
                                                    (course) =>
                                                        course.time[0] ===
                                                        rowIndex
                                                )
                                                .map((course) => [
                                                    course.courseCode,
                                                    course,
                                                ])
                                        ).values()
                                    )

                                    return (
                                        <div
                                            key={`${day}-${slot}`}
                                            className="slot-cell"
                                        >
                                            {uniqueMatches.map((course) => (
                                                <div
                                                    key={`${day}-${slot}-${course.courseCode}`}
                                                    className="slot-entry"
                                                >
                                                    <div className="slot-code">
                                                        {course.courseCode}
                                                    </div>
                                                    <div className="slot-title">
                                                        {course.courseTitle}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </section>
    )
}

export default TrTimetablePage