export interface ScheduleEntry {
    index: string;
    type: string;
    group: string;
    day: string;
    time: string;
    venue: string;
    remark: string;
}

export interface CourseSchedule {
    courseCode: string;
    courseTitle: string;
    au: string;
    schedule: ScheduleEntry[];
}

export interface AcadYrSem {
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