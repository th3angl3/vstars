import { SPINES } from "../config/constants";

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI";
export type Spine = typeof SPINES[number];

export interface TrEmptyTime {
  venue: string;
  timing: string;
}

export interface emptyTrResponse {
  success: boolean;
  records: TrEmptyTime[];
}

export interface CourseTiming {
  courseCode: string;
  courseTitle: string;
  time: number[];
}

export interface TrTtResponse {
  success: boolean;
  courses: Record<DayOfWeek, CourseTiming[]>;
}

export interface TimetableResponse {
  success: boolean;
  count: number;
  notFound: string[];
  timetables: any[][];
  message?: string;
}