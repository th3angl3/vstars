import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { generateTimetable, getEmptyVenues, getTrTimetable } from './services/api'
import { SPINES } from './config/constants'
import type { DayOfWeek, Spine, TimetableResponse, emptyTrResponse, TrTtResponse } from './types'

function parseCourseCodes(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
}

const TIME_SLOTS = [
  '0800-0830',
  '0830-0920',
  '0930-1020',
  '1030-1120',
  '1130-1220',
  '1230-1320',
  '1330-1420',
  '1430-1520',
  '1530-1620',
  '1630-1720',
  '1730-1820',
  '1830-1920',
  '1930-2020',
  '2030-2120',
  '2130-2220',
  '2230-2320',
]

const DAY_COLUMNS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI']

function getVenueDefaults() {
  const now = new Date()
  const jsDay = now.getDay()
  const weekdayOrder: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI']

  const currentDay = jsDay >= 1 && jsDay <= 5
    ? weekdayOrder[jsDay - 1]
    : 'MON'

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const earliestMinutes = 8 * 60
  const latestMinutes = 22 * 60 + 30

  if (currentMinutes < earliestMinutes) {
    return { day: currentDay, time: '0800' as const }
  }

  if (currentMinutes > latestMinutes) {
    const nextDay = new Date(now)
    nextDay.setDate(nextDay.getDate() + 1)
    const nextJsDay = nextDay.getDay()
    const nextDayLabel = nextJsDay >= 1 && nextJsDay <= 5 ? weekdayOrder[nextJsDay - 1] : 'MON'
    return { day: nextDayLabel, time: '0800' as const }
  }

  const slotStarts = TIME_SLOTS.map((slot) => {
    const rawStart = Number.parseInt(slot.split('-')[0] ?? '0', 10)
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
  const roundedTime = `${String(roundedHours).padStart(2, '0')}${String(roundedMinutes).padStart(2, '0')}`

  return {
    day: currentDay,
    time: roundedTime,
  }
}

function getTimeIndices(time: string): number[] {
  const [startStr, endStr] = time.split('-')
  const start = Number.parseInt(startStr ?? '0', 10)
  const end = Number.parseInt(endStr ?? '0', 10)

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

function App() {
  const [activeTab, setActiveTab] = useState<'timetable' | 'venue'>('timetable')
  const [courseInput, setCourseInput] = useState('')
  const [selectedCourses, setSelectedCourses] = useState<Array<{ code: string; title: string }>>([])
  const [ignoreLec, setIgnoreLec] = useState(true)
  const [ttLoading, setTtLoading] = useState(false)
  const [ttError, setTtError] = useState('')
  const [ttResult, setTtResult] = useState<TimetableResponse | null>(null)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
  const [jumpInput, setJumpInput] = useState('1')

  const [spine, setSpine] = useState<Spine>('NORTH SPINE')
  const [day, setDay] = useState<DayOfWeek>(() => getVenueDefaults().day)
  const [time, setTime] = useState(() => getVenueDefaults().time)
  const [venueLoading, setVenueLoading] = useState(false)
  const [venueError, setVenueError] = useState('')
  const [venueResult, setVenueResult] = useState<emptyTrResponse | null>(null)
  const [selectedTr, setSelectedTr] = useState('')
  const [trDetails, setTrDetails] = useState<TrTtResponse | null>(null)
  const [trLoading, setTrLoading] = useState(false)
  const [trError, setTrError] = useState('')
  const [showTrPage, setShowTrPage] = useState(false)
  const [excludedSlots, setExcludedSlots] = useState<Partial<Record<DayOfWeek, number[]>>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [dragAction, setDragAction] = useState<'add' | 'remove' | null>(null)

  useEffect(() => {
    const stopDragging = () => {
      setIsDragging(false)
      setDragAction(null)
    }

    window.addEventListener('mouseup', stopDragging)
    return () => window.removeEventListener('mouseup', stopDragging)
  }, [])

  function handleAddCourseCodes() {
    const parsed = parseCourseCodes(courseInput)

    if (parsed.length === 0) {
      return
    }

    const nextCourses = parsed
      .filter((code) => !selectedCourses.some((course) => course.code === code))
      .map((code) => ({ code, title: '' }))

    if (nextCourses.length === 0) {
      setCourseInput('')
      return
    }

    setSelectedCourses((current) => [...current, ...nextCourses])
    setCourseInput('')
  }

  function handleRemoveCourse(code: string) {
    setSelectedCourses((current) => current.filter((course) => course.code !== code))
  }

  async function handleGenerateTimetable(event: FormEvent) {
    event.preventDefault()
    const codes = selectedCourses.map((course) => course.code)

    if (codes.length === 0) {
      setTtError('Add at least one course code to the list.')
      return
    }

    const filterPayload = Object.entries(excludedSlots).map(([dayKey, values]) => ({
      excludeTimeSlots: { [dayKey]: values } as Partial<Record<DayOfWeek, number[]>>,
    }))

    setTtLoading(true)
    setTtError('')

    try {
      const result = await generateTimetable(codes, ignoreLec, filterPayload)
      setTtResult(result)
      setSelectedOptionIndex(0)
      setJumpInput('1')

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
        setTtError(result.message ?? 'No timetable could be generated.')
      }
    } catch (error) {
      setTtError(error instanceof Error ? error.message : 'Unable to generate timetable.')
      setTtResult(null)
    } finally {
      setTtLoading(false)
    }
  }

  async function handleFindEmptyVenues(event: FormEvent) {
    event.preventDefault()
    setVenueLoading(true)
    setVenueError('')

    try {
      const result = await getEmptyVenues(spine, day, time)
      setVenueResult(result)
      if (!result.success) {
        setVenueError('No venue data was returned for that selection.')
      }
    } catch (error) {
      setVenueError(error instanceof Error ? error.message : 'Unable to fetch empty venues.')
      setVenueResult(null)
    } finally {
      setVenueLoading(false)
    }
  }

  async function handleViewTrTimetable(tr: string) {
    setSelectedTr(tr)
    setShowTrPage(true)
    setTrLoading(true)
    setTrError('')

    try {
      const result = await getTrTimetable(tr)
      setTrDetails(result)
      if (!result.success) {
        setTrError('No timetable data was returned for that TR.')
      }
    } catch (error) {
      setTrError(error instanceof Error ? error.message : 'Unable to fetch TR timetable.')
      setTrDetails(null)
    } finally {
      setTrLoading(false)
    }
  }

  function applySlotSelection(day: DayOfWeek, timeIndex: number, action: 'add' | 'remove') {
    setExcludedSlots((current) => {
      const existing = current[day] ?? []
      const nextValues = action === 'add'
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
    const action: 'add' | 'remove' = shouldRemove ? 'remove' : 'add'

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
    <div className="app-shell">
      <main className="card tab-card">
        {!showTrPage ? (
          <div className="tab-switcher" role="tablist" aria-label="Tools">
            <button
              type="button"
              className={`tab-button ${activeTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              Timetable builder
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'venue' ? 'active' : ''}`}
              onClick={() => setActiveTab('venue')}
            >
              Venue finder
            </button>
          </div>
        ) : null}

        {showTrPage ? (
          <section>
            <div className="card-header">
              <div>
                <p className="eyebrow">TR timetable</p>
                <h2>{selectedTr}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setShowTrPage(false)}>
                Back to venue finder
              </button>
            </div>

            {trLoading ? <p className="meta-text">Loading timetable…</p> : null}
            {trError ? <p className="error-text">{trError}</p> : null}

            {trDetails ? (
              <div className="timetable-page">
                <div className="timetable-grid">
                  <div className="timetable-header">Time</div>
                  {DAY_COLUMNS.map((day) => (
                    <div key={day} className="timetable-header">{day}</div>
                  ))}

                  {TIME_SLOTS.map((slot, rowIndex) => (
                    <div key={`${slot}-row`} className="timetable-row">
                      <div className="time-label">{slot}</div>
                      {DAY_COLUMNS.map((day) => {
                        const dayKey = day as keyof typeof trDetails.courses
                        const courses = trDetails.courses[dayKey] ?? []
                        const uniqueMatches = Array.from(
                          new Map(
                            courses
                              .filter((course) => course.time[0] === rowIndex)
                              .map((course) => [course.courseCode, course])
                          ).values()
                        )

                        return (
                          <div key={`${day}-${slot}`} className="slot-cell">
                            {uniqueMatches.map((course) => (
                              <div key={`${day}-${slot}-${course.courseCode}`} className="slot-entry">
                                <div className="slot-code">{course.courseCode}</div>
                                <div className="slot-title">{course.courseTitle}</div>
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
        ) : activeTab === 'timetable' ? (
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
                      <input
                        id="jump"
                        type="number"
                        min="1"
                        max={ttResult.count}
                        value={jumpInput}
                        onChange={(event) => setJumpInput(event.target.value)}
                      />
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
                                style={{ ['--block-span' as string]: String(blockSpan) }}
                              >
                                <span className="slot-chip">
                                  {blockAtCell.courseCode} · {formatClassType(blockAtCell.type)}
                                </span>
                              </div>
                            ) : null}
                            <button
                              type="button"
                              className={`timetable-slot-button ${isExcluded ? 'filter-cell' : ''}`}
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
                    placeholder="CC0001, CC0002"
                  />
                  <button type="button" className="secondary-button" onClick={handleAddCourseCodes}>
                    Add course
                  </button>

                  {selectedCourses.length > 0 ? (
                    <div className="course-list">
                      {selectedCourses.map((course, index) => (
                        <div key={course.code} className="course-row">
                          <div>
                            <strong>{course.code}</strong>
                            <span className="option-index">#{index + 1}</span>
                            <div className="meta-text">{course.title || 'Title pending'}</div>
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
                    {ttLoading ? 'Generating…' : 'Generate timetable'}
                  </button>
                </form>

                {ttError ? <p className="error-text">{ttError}</p> : null}

                {ttResult ? (
                  <div className="result-block">
                    <div className="result-summary">
                      <strong>{ttResult.count}</strong> timetable option{ttResult.count === 1 ? '' : 's'} found.
                      {ttResult.notFound.length > 0 ? ` Missing: ${ttResult.notFound.join(', ')}` : null}
                    </div>

                    {ttResult.count > 0 ? (
                      <p className="meta-text">
                        Showing option {selectedOptionIndex + 1} of {ttResult.count}.
                      </p>
                    ) : null}

                    {ttResult.timetables[selectedOptionIndex] ? (
                      <ul className="compact-list">
                        {ttResult.timetables[selectedOptionIndex].map((entry, index) => (
                          <li key={`${entry.courseCode}-${entry.selectedIndex.index}`}>
                            <strong>{entry.courseCode}</strong>
                            <span className="option-index">#{index + 1}</span> — {entry.courseTitle}
                            <div className="meta-text">
                              {entry.selectedIndex.entry.map((slot) => `${slot.day} ${slot.time}`).join(' • ')}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="meta-text">No timetable options matched the selected filters.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
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
                    {['MON', 'TUE', 'WED', 'THU', 'FRI'].map((value) => (
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
                      <option key={slot} value={slot.split('-')[0]}>
                        {slot.split('-')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={venueLoading}>
                {venueLoading ? 'Checking…' : 'Find empty venues'}
              </button>
            </form>

            {venueError ? <p className="error-text">{venueError}</p> : null}

            {venueResult ? (
              <div className="result-block">
                <div className="result-summary">
                  {venueResult.records.length} venue{venueResult.records.length === 1 ? '' : 's'} available.
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
                            onClick={() => handleViewTrTimetable(record.venue)}
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
        )}
      </main>
    </div>
  )
}

export default App
