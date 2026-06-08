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

export interface ScrapeVenueResponse {
    success: boolean;
    count: number;
    message?: string;
}

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI";

export interface TimetableFilter {
    excludeTimeSlots?: Partial<Record<DayOfWeek, number[]>>;
}

export interface TimetableEntry {
    courseCode: string;
    courseTitle: string;
    selectedIndex: CourseIndex;
}

export interface TimetableResponse {
    success: boolean;
    count: number;
    notFound: string[];   // course codes not found in DB
    timetables: TimetableEntry[][];
}

type Spine = "NORTH SPINE" | "SOUTH SPINE" | "THE HIVE" | "THE ARC"

export interface VenueData {
    spine: Spine;
    name: string;
    location: string;
}