import { useState, type FormEvent } from "react"
import { getEmptyVenues } from "../services/api"
import { SPINES } from "../config/constants"
import { TIME_SLOTS } from "../utils/schedule"
import type { DayOfWeek, Spine, emptyTrResponse } from "../types"

function getVenueDefaults() {
    const now = new Date()
    const jsDay = now.getDay()
    const weekdayOrder: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"]

    const currentDay = jsDay >= 1 && jsDay <= 5
        ? weekdayOrder[jsDay - 1]
        : "MON"

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const earliestMinutes = 8 * 60
    const latestMinutes = 22 * 60 + 30

    if (currentMinutes < earliestMinutes) {
        return { day: currentDay, time: "0800" as const }
    }

    if (currentMinutes > latestMinutes) {
        const nextDay = new Date(now)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextJsDay = nextDay.getDay()
        const nextDayLabel = nextJsDay >= 1 && nextJsDay <= 5 ? weekdayOrder[nextJsDay - 1] : "MON"
        return { day: nextDayLabel, time: "0800" as const }
    }

    const slotStarts = TIME_SLOTS.map((slot) => {
        const rawStart = Number.parseInt(slot.split("-")[0] ?? "0", 10)
        const hours = Math.floor(rawStart / 100)
        const minutes = rawStart % 100
        return hours * 60 + minutes
    })

    let nearestStart = slotStarts[0]
    let smallestDiff = Number.POSITIVE_INFINITY

    for (const startValue of slotStarts) {
        const diff = Math.abs(startValue - currentMinutes)
        if (diff < smallestDiff) {
            smallestDiff = diff
            nearestStart = startValue
        }
    }

    const roundedHours = Math.floor(nearestStart / 60)
    const roundedMinutes = nearestStart % 60
    const roundedTime = `${String(roundedHours).padStart(2, "0")}${String(roundedMinutes).padStart(2, "0")}`

    return {
        day: currentDay,
        time: roundedTime,
    }
}

interface VenueFinderPageProps {
    onSelectTr: (tr: string) => void
}

function VenueFinderPage({ onSelectTr }: VenueFinderPageProps) {
    const [spine, setSpine] = useState<Spine>("NORTH SPINE")
    const [day, setDay] = useState<DayOfWeek>(() => getVenueDefaults().day)
    const [time, setTime] = useState(() => getVenueDefaults().time)
    const [venueLoading, setVenueLoading] = useState(false)
    const [venueError, setVenueError] = useState("")
    const [venueResult, setVenueResult] = useState<emptyTrResponse | null>(null)

    async function handleFindEmptyVenues(event: FormEvent) {
        event.preventDefault()
        setVenueLoading(true)
        setVenueError("")

        try {
            const result = await getEmptyVenues(spine, day, time)
            setVenueResult(result)
            if (!result.success) {
                setVenueError("No venue data was returned for that selection.")
            }
        } catch (error) {
            setVenueError(error instanceof Error ? error.message : "Unable to fetch empty venues.")
            setVenueResult(null)
        } finally {
            setVenueLoading(false)
        }
    }

    return (
        <section>
            <div className="card-header">
                <div>
                    <p className="eyebrow">Venue finder</p>
                    <h2>Find empty venues</h2>
                </div>
            </div>

            <form onSubmit={handleFindEmptyVenues} className="stack">
                <label htmlFor="spine">Spine</label>
                <select id="spine" value={spine} onChange={(event) => setSpine(event.target.value as Spine)}>
                    {SPINES.map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </select>

                <div className="inline-fields">
                    <div>
                        <label htmlFor="day">Day</label>
                        <select id="day" value={day} onChange={(event) => setDay(event.target.value as DayOfWeek)}>
                            {["MON", "TUE", "WED", "THU", "FRI"].map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="time">Time</label>
                        <select id="time" value={time} onChange={(event) => setTime(event.target.value)}>
                            {TIME_SLOTS.map((slot) => (
                                <option key={slot} value={slot.split("-")[0]}>
                                    {slot.split("-")[0]}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button type="submit" disabled={venueLoading}>
                    {venueLoading ? "Checking…" : "Find empty venues"}
                </button>
            </form>

            {venueError ? <p className="error-text">{venueError}</p> : null}

            {venueResult ? (
                <div className="result-block">
                    <div className="result-summary">
                        {venueResult.records.length} venue{venueResult.records.length === 1 ? "" : "s"} available.
                    </div>

                    <table className="venue-table">
                        <thead>
                            <tr>
                                <th>TR name</th>
                                <th>Time available</th>
                                <th>TR location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {venueResult.records.map((record) => (
                                <tr key={`${record.venue}-${record.timing}`}>
                                    <td>
                                        <button
                                            type="button"
                                            className="text-link"
                                            onClick={() => onSelectTr(record.venue)}
                                        >
                                            {record.venue}
                                        </button>
                                    </td>
                                    <td>{record.timing}</td>
                                    <td>{record.location}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </section>
    )
}

export default VenueFinderPage