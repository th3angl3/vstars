import { fetchCourseSchedule } from "./dbService.js";
import type { CourseIndex, CourseSchedule, TimetableFilter, DayOfWeek } from "../types/types.js";

async function getCourseSchedule(courseCodeList: string[]): Promise<CourseSchedule[]> {
    const courseSchedules = await fetchCourseSchedule(courseCodeList);
    for (const courseCode of courseCodeList) {
        const schedule = courseSchedules.find(schedule => schedule.courseCode === courseCode);
        if (!schedule) {
            courseSchedules.push({
                courseCode,
                courseTitle: "N/A",
                au: "N/A",
                schedule: []
            })
        }

    }
    return courseSchedules;
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

function generateTimetables(courseSchedules: CourseSchedule[], filters: TimetableFilter[], insertedCourses: CourseIndex[]): CourseIndex[][] {
    if (courseSchedules.length === 0) {
        return [insertedCourses];
    }

    let result: CourseIndex[][] = [];

    for (const course of courseSchedules[0]!.schedule) {
        const newInsertedCourses = [...insertedCourses, course];
        if (isConflict(newInsertedCourses) || isFilterConflict(course, filters)) {
            continue;
        }
        const newCourseSchedules = courseSchedules.slice(1);
        const generated = generateTimetables(newCourseSchedules, filters, newInsertedCourses);
        result.push(...generated);
    }

    return result;
}

async function namePlaceholder(courseCodeList: string[], filters: TimetableFilter[]): Promise<void> {
    const courseSchedules: CourseSchedule[] = await getCourseSchedule(courseCodeList);

    // most constraining course first
    courseSchedules.sort((a, b) => a.schedule.length - b.schedule.length);
    const timetables = generateTimetables(courseSchedules, filters, []);

    



}

