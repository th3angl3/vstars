import { fetchCourseSchedule } from "./dbService.js";
import type { CourseSchedule, TimetableFilter } from "../types/types.js";

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

function timeToIndex(time: string): Number[] {
    const [st, et] = time.split("-");
    if (!st || !et) {
        throw new Error(`Invalid time format: ${time}`);
    }
    const stIndex = Math.floor((parseInt(st) - 730) / 100);
    const etIndex = Math.floor((parseInt(et) - 730) / 100);

    const timeIndices: Number[] = [];
    for (let i = stIndex; i <= etIndex; i++) {
        timeIndices.push(i);
    }
    return timeIndices;
}

function generateTimetable(courseSchedules: CourseSchedule[], filters: TimetableFilter[]): void {
    // most constraining course first
    courseSchedules.sort((a, b) => a.schedule.length - b.schedule.length);

}

