import { useEffect, useState, type FormEvent } from "react"
import { generateTimetable } from "../services/api"
import { DAY_COLUMNS, TIME_SLOTS } from "../utils/schedule"
import type { DayOfWeek, TimetableResponse } from "../types"

function parseCourseCodes(input: string): string[] {
    return input
        .split(/[\n,]+/)
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean)
}

function getTimeIndices(time: string): number[] {
    const [startStr, endStr] = time.split("-")
    const start = Number.parseInt(startStr ?? "0", 10)
    const end = Number.parseInt(endStr ?? "0", 10)

    if (Number.isNaN(start) || Number.isNaN(end)) {
        return []
    }

    const startIndex = Math.floor((start - 730) / 100)
    const endIndex = Math.floor((end - 730) / 100)

    return Array.from({ length: endIndex - startIndex + 1 }, (_, index) => startIndex + index)
}

function formatClassType(type: string): string {
    return type.trim().toUpperCase()
}

function TimetableBuilderPage() {
    const [courseInput, setCourseInput] = useState("")
    const [selectedCourses, setSelectedCourses] = useState<Array<{ code: string; title: string }>>([])
    const [ignoreLec, setIgnoreLec] = useState(true)
    const [ttLoading, setTtLoading] = useState(false)
    const [ttError, setTtError] = useState("")
    const [ttResult, setTtResult] = useState<TimetableResponse | null>(null)
    const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
    const [jumpInput, setJumpInput] = useState("1")
    const [excludedSlots, setExcludedSlots] = useState<Partial<Record<DayOfWeek, number[]>>>({})
    const [isDragging, setIsDragging] = useState(false)
    const [dragAction, setDragAction] = useState<"add" | "remove" | null>(null)

    useEffect(() => {
        const stopDragging = () => {
            setIsDragging(false)
            setDragAction(null)
        }

        window.addEventListener("mouseup", stopDragging)
        return () => window.removeEventListener("mouseup", stopDragging)
    }, [])

    function handleAddCourseCodes() {
        const parsed = parseCourseCodes(courseInput)

        if (parsed.length === 0) {
            return
        }

        const nextCourses = parsed
            .filter((code) => !selectedCourses.some((course) => course.code === code))
            .map((code) => ({ code, title: "" }))

        if (nextCourses.length === 0) {
            setCourseInput("")
            return
        }

        setSelectedCourses((current) => [...current, ...nextCourses])
        setCourseInput("")
    }

    function handleRemoveCourse(code: string) {
        setSelectedCourses((current) => current.filter((course) => course.code !== code))
    }

    async function handleGenerateTimetable(event: FormEvent) {
        event.preventDefault()
        const codes = selectedCourses.map((course) => course.code)

        if (codes.length === 0) {
            setTtError("Add at least one course code to the list.")
            return
        }

        const filterPayload = Object.entries(excludedSlots).map(([dayKey, values]) => ({
            excludeTimeSlots: { [dayKey]: values } as Partial<Record<DayOfWeek, number[]>>,
        }))

        setTtLoading(true)
        setTtError("")

        try {
            const result = await generateTimetable(codes, ignoreLec, filterPayload)
            setTtResult(result)
            setSelectedOptionIndex(0)
            setJumpInput("1")

            if (result.success) {
                const titleMap = new Map<string, string>()
                for (const option of result.timetables ?? []) {
                    for (const entry of option) {
                        if (!titleMap.has(entry.courseCode)) {
                            titleMap.set(entry.courseCode, entry.courseTitle)
                        }
                    }
                }

                setSelectedCourses((current) =>
                    current.map((course) => ({
                        ...course,
                        title: titleMap.get(course.code) ?? course.title,
                    }))
                )
            }

            if (!result.success) {
                setTtError(result.message ?? "No timetable could be generated.")
            }
        } catch (error) {
            setTtError(error instanceof Error ? error.message : "Unable to generate timetable.")
            setTtResult(null)
        } finally {
            setTtLoading(false)
        }
    }

    function applySlotSelection(day: DayOfWeek, timeIndex: number, action: "add" | "remove") {
        setExcludedSlots((current) => {
            const existing = current[day] ?? []
            const nextValues = action === "add"
                ? [...new Set([...existing, timeIndex])].sort((left, right) => left - right)
                : existing.filter((value) => value !== timeIndex)

            if (nextValues.length === 0) {
                const { [day]: _, ...rest } = current
                return rest
            }

            return {
                ...current,
                [day]: nextValues,
            }
        })
    }

    function handleSlotPointerDown(day: DayOfWeek, timeIndex: number) {
        const shouldRemove = Boolean(excludedSlots[day]?.includes(timeIndex))
        const action: "add" | "remove" = shouldRemove ? "remove" : "add"

        setIsDragging(true)
        setDragAction(action)
        applySlotSelection(day, timeIndex, action)
    }

    function handleSlotPointerEnter(day: DayOfWeek, timeIndex: number) {
        if (!isDragging || !dragAction) {
            return
        }

        applySlotSelection(day, timeIndex, dragAction)
    }

    function changeDisplayedOption(offset: number) {
        if (!ttResult || ttResult.count === 0) {
            return
        }

        const nextIndex = Math.min(Math.max(selectedOptionIndex + offset, 0), ttResult.count - 1)
        setSelectedOptionIndex(nextIndex)
        setJumpInput(String(nextIndex + 1))
    }

    function handleJumpToTimetable() {
        if (!ttResult || ttResult.count === 0) {
            return
        }

        const parsed = Number.parseInt(jumpInput, 10)
        if (Number.isNaN(parsed)) {
            return
        }

        const nextIndex = Math.min(Math.max(parsed - 1, 0), ttResult.count - 1)
        setSelectedOptionIndex(nextIndex)
        setJumpInput(String(nextIndex + 1))
    }

    const displayedTimetable = ttResult?.timetables[selectedOptionIndex] ?? []

    const selectedIndexMap = new Map(
        displayedTimetable.map((entry) => [
            entry.courseCode,
            entry.selectedIndex.index,
        ])
    )

    const previewBlocks = new Map<string, { courseCode: string; courseTitle: string; type: string; day: DayOfWeek; startRow: number; endRow: number; dayIndex: number }>()

    if (ttResult?.timetables[selectedOptionIndex]) {
        for (const entry of ttResult.timetables[selectedOptionIndex]) {
            for (const slot of entry.selectedIndex.entry) {
                const indices = getTimeIndices(slot.time)
                const dayIndex = DAY_COLUMNS.indexOf(slot.day as DayOfWeek)

                if (indices.length === 0 || dayIndex < 0) {
                    continue
                }

                const blockKey = `${entry.courseCode}-${entry.courseTitle}-${slot.type}-${slot.day}`
                const existing = previewBlocks.get(blockKey)
                const startRow = indices[0]
                const endRow = indices[0] + indices.length - 1

                if (existing) {
                    previewBlocks.set(blockKey, {
                        ...existing,
                        startRow: Math.min(existing.startRow, startRow),
                        endRow: Math.max(existing.endRow, endRow),
                    })
                } else {
                    previewBlocks.set(blockKey, {
                        courseCode: entry.courseCode,
                        courseTitle: entry.courseTitle,
                        type: slot.type,
                        day: slot.day as DayOfWeek,
                        startRow,
                        endRow,
                        dayIndex,
                    })
                }
            }
        }
    }

    const previewBlockList = Array.from(previewBlocks.values())

    return (
        <section>
            <div className="card-header">
                <div>
                    <p className="eyebrow">Timetable builder</p>
                    <h2>Find a timetable around your free slots</h2>
                </div>
            </div>

            <div className="builder-layout">
                <div className="builder-grid-card">
                    <div className="builder-grid-header">
                        <div>
                            <p className="eyebrow">Filter grid</p>
                            <p className="meta-text">Click or drag across a cell to block that time slot.</p>
                        </div>
                    </div>

                    {ttResult && ttResult.count > 0 ? (
                        <div className="result-navigation">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => changeDisplayedOption(-1)}
                                disabled={selectedOptionIndex === 0}
                            >
                                ← Prev
                            </button>

                            <div className="jump-controls">
                                <label htmlFor="jump">Jump to</label>

                                <div className="jump-input-group">
                                    <input
                                        id="jump"
                                        type="number"
                                        min="1"
                                        max={ttResult.count}
                                        value={jumpInput}
                                        onChange={(event) => setJumpInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault()
                                                handleJumpToTimetable()
                                            }
                                        }}
                                    />
                                    <span className="jump-total">/ {ttResult.count}</span>
                                </div>

                                <button type="button" onClick={handleJumpToTimetable}>
                                    Go
                                </button>
                            </div>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => changeDisplayedOption(1)}
                                disabled={selectedOptionIndex === ttResult.count - 1}
                            >
                                Next →
                            </button>
                        </div>
                    ) : null}

                    <div className="timetable-grid builder-grid">
                        <div className="timetable-header">Time</div>
                        {DAY_COLUMNS.map((day) => (
                            <div key={day} className="timetable-header">{day}</div>
                        ))}

                        {TIME_SLOTS.map((slot, rowIndex) => (
                            <div key={`${slot}-row`} className="timetable-row">
                                <div className="time-label">{slot}</div>
                                {DAY_COLUMNS.map((day) => {
                                    const dayIndex = DAY_COLUMNS.indexOf(day)
                                    const isExcluded = Boolean(excludedSlots[day]?.includes(rowIndex))
                                    const blockAtCell = previewBlockList.find(
                                        (block) => block.dayIndex === dayIndex && block.startRow === rowIndex
                                    )
                                    const blockSpan = blockAtCell ? Math.max(1, blockAtCell.endRow - blockAtCell.startRow + 1) : 1

                                    return (
                                        <div key={`${day}-${slot}`} className="timetable-slot-wrapper">
                                            {blockAtCell ? (
                                                <div
                                                    className="preview-slot-block"
                                                    style={{ ["--block-span" as string]: String(blockSpan) }}
                                                >
                                                    <span className="slot-chip">
                                                        {blockAtCell.courseCode} · {formatClassType(blockAtCell.type)}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <button
                                                type="button"
                                                className={`timetable-slot-button ${isExcluded ? "filter-cell" : ""}`}
                                                onMouseDown={() => handleSlotPointerDown(day, rowIndex)}
                                                onMouseEnter={() => handleSlotPointerEnter(day, rowIndex)}
                                            >
                                                {isExcluded ? <span className="slot-chip blocked">Blocked</span> : null}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="builder-controls">
                    <form onSubmit={handleGenerateTimetable} className="stack">
                        <label htmlFor="courses">Course codes</label>
                        <textarea
                            id="courses"
                            rows={4}
                            value={courseInput}
                            onChange={(event) => setCourseInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault()
                                    handleAddCourseCodes()
                                }
                            }}
                            placeholder="CC0001, CC0002"
                        />
                        <button type="button" className="secondary-button" onClick={handleAddCourseCodes}>
                            Add course
                        </button>

                        {selectedCourses.length > 0 ? (
                            <div className="course-list">
                                {selectedCourses.map((course) => (
                                    <div key={course.code} className="course-row">
                                        <div>
                                            <strong>{course.code}</strong>
                                            <span className="option-index">
                                                {selectedIndexMap.get(course.code) ?? "-"}
                                            </span>
                                            <div className="meta-text">
                                                {course.title || "Title pending"}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="remove-course-button"
                                            onClick={() => handleRemoveCourse(course.code)}
                                            aria-label={`Remove ${course.code}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <label className="checkbox-row" htmlFor="ignore-lec">
                            <input
                                id="ignore-lec"
                                type="checkbox"
                                checked={ignoreLec}
                                onChange={(event) => setIgnoreLec(event.target.checked)}
                            />
                            Ignore LEC/STUDIO clashes
                        </label>

                        <button type="submit" disabled={ttLoading}>
                            {ttLoading ? "Generating…" : "Generate timetable"}
                        </button>
                    </form>

                    {ttError ? <p className="error-text">{ttError}</p> : null}
                </div>
            </div>
        </section>
    )
}

export default TimetableBuilderPage