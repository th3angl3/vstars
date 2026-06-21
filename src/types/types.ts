import type { ObjectId } from "mongodb";
import { SPINES } from "../config/constants.js";

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

export interface ScrapeCourseResult extends AcadYrSem {
    courseSchedule: CourseSchedule[];
    venueDoc: VenueDocument;
}

export interface ScrapeCourseResponse {
    success: boolean;
    acadYr: number;
    sem: number;
    courseCount: number;
    entryCount: number;
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

export interface TimetableOptions {
    ignoreLEC: boolean;
    filters: TimetableFilter[];
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
    message?: string;
}

export type Spine = typeof SPINES[number];

export interface VenueData {
    spine: Spine;
    name: string;
    location: string;
    timings? : VenueTiming[]
}

export interface VenueTiming {
    courseCode: string;
    courseTitle: string;
    day: string;
    time: string;
}

export interface VenueDocument {
    records: Record<string, VenueTiming[]>;
    count: number;
}

export interface TimetableRequest {
    courseCodes: string[];
    filterOptions?: TimetableOptions;
    maxResults?: number;
}

export interface TrResponse {
    success: boolean;
    records: TrEmptyTime[]
}

export interface TrEmptyTime {
    venue: string;
    timing: string
}