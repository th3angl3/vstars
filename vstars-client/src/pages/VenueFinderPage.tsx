import { useEffect, useState, type FormEvent } from "react"
import { getEmptyVenues } from "../services/api"
import { SPINES } from "../config/constants"
import { TIME_SLOTS } from "../utils/schedule"
import type { DayOfWeek, Spine, emptyTrResponse } from "../types"

function toMinutes(hhmm: string) {
    const raw = Number.parseInt(hhmm, 10)
    return Math.floor(raw / 100) * 60 + (raw % 100)
}

function getVenueDefaults() {
    const now = new Date()
    const weekdayOrder: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"]
    const toWeekday = (jsDay: number) => (jsDay >= 1 && jsDay <= 5 ? weekdayOrder[jsDay - 1] : "MON")

    const firstSlotStart = TIME_SLOTS[0].split("-")[0]
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const lastSlotEnd = toMinutes(TIME_SLOTS[TIME_SLOTS.length - 1].split("-")[1])

    // After the last slot ends, jump to the first slot of the next day
    if (currentMinutes >= lastSlotEnd) {
        const nextDay = new Date(now)
        nextDay.setDate(nextDay.getDate() + 1)
        return { day: toWeekday(nextDay.getDay()), time: firstSlotStart }
    }

    // Current slot = latest slot that has already started (e.g. 1015 -> 0930)
    let currentSlotStart = firstSlotStart
    for (const slot of TIME_SLOTS) {
        const slotStart = slot.split("-")[0]
        if (toMinutes(slotStart) <= currentMinutes) {
            currentSlotStart = slotStart
        }
    }

    return { day: toWeekday(now.getDay()), time: currentSlotStart }
}

interface VenueFinderPageProps {
    onSelectTr: (tr: string) => void
}

function VenueFinderPage({ onSelectTr }: VenueFinderPageProps) {
    const [spine, setSpine] = useState<Spine>("NORTH SPINE")
    const [defaults] = useState(getVenueDefaults)
    const [day, setDay] = useState<DayOfWeek>(defaults.day)
    const [time, setTime] = useState(defaults.time)
    const [venueLoading, setVenueLoading] = useState(false)
    const [venueError, setVenueError] = useState("")
    const [venueResult, setVenueResult] = useState<emptyTrResponse | null>(null)

    async function fetchEmptyVenues() {
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

    function handleFindEmptyVenues(event: FormEvent) {
        event.preventDefault()
        fetchEmptyVenues()
    }

    // Load venues for the default selection on first visit
    useEffect(() => {
        fetchEmptyVenues()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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