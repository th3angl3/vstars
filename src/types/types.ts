import type { ObjectId } from "mongodb";

export interface CourseIndex {
    index: string;
    entry: IndexEntry[];
}

export interface IndexEntry {
    type: string;
    group: string;
    day: string;
    time: string;
    venue: string;
    remark: string;
}

export interface CourseSchedule {
    _id?: ObjectId;
    courseCode: string;
    courseTitle: string;
    au: string;
    schedule: CourseIndex[];
}

export interface AcadYrSem {
    _id?: ObjectId;
    acadYr: number;
    sem: number;
}

export interface ScrapeResult extends AcadYrSem {
    courseSchedule: CourseSchedule[];
}

export interface ScrapeResponse {
    success: boolean;
    acadYr: number;
    sem: number;
    count: number;
    message? : string;
}

type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI";

export interface TimetableFilter {
    excludeTimeSlots?: { day: DayOfWeek; timeIndex: Number[] }[];
}