import { fetchCourseSchedule } from "./dbService.js";
import type { CourseIndex, CourseSchedule, DayOfWeek, TimetableEntry, TimetableResponse, TimetableOptions } from "../types/types.js";
import { MAX_TIMETABLE_RESULTS } from "../config/constants.js";

async function getCourseSchedule(courseCodeList: string[]): Promise<{ schedules: CourseSchedule[]; notFound: string[]}> {   
    const schedules = await fetchCourseSchedule(courseCodeList);
    const notFound = courseCodeList.filter(code => !schedules.some(s => s.courseCode === code));
    if (notFound.length > 0) {
        console.warn("Courses not found in DB:", notFound);
    }
    return { schedules, notFound };
}

function timeToIndex(time: string): number[] {
    const [st, et] = time.split("-");
    if (!st || !et) {
        throw new Error(`Invalid time format: ${time}`);
    }
    const stIndex = Math.floor((parseInt(st) - 730) / 100);
    const etIndex = Math.floor((parseInt(et) - 730) / 100);

    const timeIndices: number[] = [];
    for (let i = stIndex; i <= etIndex; i++) {
        timeIndices.push(i);
    }
    return timeIndices;
}

function parseTeachingWks(remark: string): Set<number> | null {
    const match = remark.match(/Teaching Wk\s*([\d,\-]+)/i);
    if (!match) {
        return null;
    }

    const weeks = new Set<number>();
    const parts = match[1]!.split(",");

    for (const part of parts) {
        const trimmed = part.trim();

        if (trimmed.includes("-")) {
            const [startStr, endStr] = trimmed.split("-");
            const start = parseInt(startStr!, 10);
            const end = parseInt(endStr!, 10);

            if (isNaN(start) || isNaN(end)) {
                continue;
            }

            for (let w = start; w <= end; w++) {
                weeks.add(w);
            }
        } else {
            const week = parseInt(trimmed, 10);
            if (!isNaN(week)) {
                weeks.add(week);
            }
        }
    }

    return weeks;
}

function weeksOverlap(a: Set<number> | null, b: Set<number> | null): boolean {
    if (a === null || b === null) {
        return true;
    }

    for (const week of a) {
        if (b.has(week)) {
            return true;
        }
    }

    return false;
}

function isConflict(schedule: CourseIndex[]): boolean {
    const timetable: Record<string, (Set<number> | null)[][]> = {};

    for (const course of schedule) {
        for (const entry of course.entry) {
            const day = entry.day;
            const timeIndices = timeToIndex(entry.time);
            const weeks = parseTeachingWks(entry.remark);

            if (!timetable[day]) {
                timetable[day] = Array.from({ length: 14 }, () => []);
            }

            for (const index of timeIndices) {
                const occupied = timetable[day][index]!;

                for (const existingWeeks of occupied) {
                    if (weeksOverlap(existingWeeks, weeks)) {
                        return true;
                    }
                }

                occupied.push(weeks);
            }
        }
    }

    return false;
}

function isFilterConflict(course: CourseIndex, filterOptions: TimetableOptions): boolean {
    for (const entry of course.entry) {

        if (filterOptions.ignoreLEC && entry.type === "LEC/STUDIO") {
            continue; // ignore LEC
        }

        const day = entry.day as DayOfWeek;
        const timeIndices = timeToIndex(entry.time);

        for (const filter of filterOptions.filters) {
            const excluded = filter.excludeTimeSlots?.[day];

            if (!excluded) {
                continue;
            }

            if (timeIndices.some(index => excluded.includes(index))) {
                return true;
            }
        }
    }

    return false;
}

function generateTimetables(
    courseSchedules: CourseSchedule[],
    filterOptions: TimetableOptions,
    inserted: TimetableEntry[],
    result: TimetableEntry[][] = []
): TimetableEntry[][] {
    if (result.length >= MAX_TIMETABLE_RESULTS) return result;

    if (courseSchedules.length === 0) {
        result.push([...inserted]);
        return result;
    }

    const [current, ...rest] = courseSchedules;

    for (const index of current!.schedule) {
        if (result.length >= MAX_TIMETABLE_RESULTS) break;

        inserted.push({ courseCode: current!.courseCode, courseTitle: current!.courseTitle, selectedIndex: index });

        if (!isFilterConflict(index, filterOptions) && !isConflict(inserted.map(e => e.selectedIndex))) {
            generateTimetables(rest, filterOptions, inserted, result);
        }

        inserted.pop();
    }

    return result;
}

async function generateTimetableService(courseCodeList: string[], filterOptions: TimetableOptions): Promise<TimetableResponse> {
    const { schedules, notFound } = await getCourseSchedule(courseCodeList);

    schedules.sort((a, b) => a.schedule.length - b.schedule.length);
    const timetables = generateTimetables(schedules, filterOptions, [], []);

    return { success: true, count: timetables.length, notFound, timetables };
}


export { generateTimetableService };