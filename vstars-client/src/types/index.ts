import { SPINES } from "../config/constants";

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI";
export type Spine = typeof SPINES[number];

export interface TrEmptyTime {
  venue: string;
  location: string;
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

export interface IndexEntry {
  type: string;
  group: string;
  day: string;
  time: string;
  venue: string;
  remark: string;
}

export interface CourseIndex {
  index: string;
  entry: IndexEntry[];
}

export interface TimetableEntry {
  courseCode: string;
  courseTitle: string;
  selectedIndex: CourseIndex;
}

export interface TimetableFilter {
  excludeTimeSlots?: Partial<Record<DayOfWeek, number[]>>;
}

export interface TrTtResponse {
  success: boolean;
  courses: Record<DayOfWeek, CourseTiming[]>;
}

export interface TimetableResponse {
  success: boolean;
  count: number;
  notFound: string[];
  timetables: TimetableEntry[][];
  message?: string;
}