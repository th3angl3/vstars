import { fetchCourseSchedule } from "./dbService.js";
import type { CourseIndex, CourseSchedule, TimetableFilter, DayOfWeek, TimetableEntry, TimetableResponse } from "../types/types.js";
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

function isConflict(schedule: CourseIndex[]): boolean {
    const timetable: Record<string, boolean[]> = {};


    for (const course of schedule) {
        for (const entry of course.entry) {
            const day = entry.day;
            const timeIndices = timeToIndex(entry.time);

            if (!timetable[day]) {
                timetable[day] = Array(14).fill(false);
            }

            for (const index of timeIndices) {
                if (timetable[day][index]) {
                    return true;
                }

                timetable[day][index] = true;
            }
        }
    }

    return false;
}

function isFilterConflict(course: CourseIndex, filters: TimetableFilter[]): boolean {
    for (const entry of course.entry) {
        const day = entry.day as DayOfWeek;
        const timeIndices = timeToIndex(entry.time);

        for (const filter of filters) {
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
    filters: TimetableFilter[],
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

        if (!isConflict(inserted.map(e => e.selectedIndex)) && !isFilterConflict(index, filters)) {
            generateTimetables(rest, filters, inserted, result);
        }

        inserted.pop();
    }

    return result;
}

async function generateTimetableService(courseCodeList: string[], filters: TimetableFilter[]): Promise<TimetableResponse> {
    const { schedules, notFound } = await getCourseSchedule(courseCodeList);

    schedules.sort((a, b) => a.schedule.length - b.schedule.length);
    const timetables = generateTimetables(schedules, filters, [], []);

    return { success: true, count: timetables.length, notFound, timetables };
}


export { generateTimetableService };