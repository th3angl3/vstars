import { getSpineTT, getVenueTT } from "./dbService.js";
import type { DayOfWeek, Spine, TrEmptyTime, emptyTrResponse, VenueData, TrTtResponse, VenueTiming, CourseTiming } from "../types/types.js";
import { timeToIndex } from "./ttService.js";

const DAY_END = parseTimePoint("2330");

function parseDayTime(day: string, time: string): { day: DayOfWeek; time: string } {
    const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"];
    const WEEKEND = ["SAT", "SUN"];
    const NEXT_DAY: Record<DayOfWeek, DayOfWeek> = {
        MON: "TUE", TUE: "WED", WED: "THU", THU: "FRI", FRI: "MON"
    };

    
    if (!DAYS.includes(day as DayOfWeek) && !WEEKEND.includes(day)) {
        throw new Error(`Invalid day: "${day}"`);
    }
    
    if (WEEKEND.includes(day)) {
        return { day: "MON", time: "0800" };
    }

    let resolvedDay: DayOfWeek = WEEKEND.includes(day) ? "MON" : day as DayOfWeek;

    const timePoint = parseTimePoint(time);

    if (timePoint >= parseTimePoint("2330")) {
        return { day: NEXT_DAY[resolvedDay], time: "0800" };
    }

    if (timePoint <= parseTimePoint("0800")) {
        return { day: resolvedDay, time: "0800" };
    }

    const rounded = Math.floor(timePoint / 30) * 30;
    return { day: resolvedDay, time: minutesToHHMM(rounded) };
}

function parseTimePoint(hhmm: string): number {
    const hours = Number(hhmm.slice(0, 2));
    const minutes = Number(hhmm.slice(2, 4));
    return hours * 60 + minutes;
}

function parseTimeRange(range: string): { st: number; et: number } {
    const [startStr, endStr] = range.split("-");
    if (!startStr || !endStr) {
        throw new Error(`Invalid time range format: "${range}"`);
    }
    return { st: parseTimePoint(startStr), et: parseTimePoint(endStr) };
}

function minutesToHHMM(minutes: number): string {
    const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
    const mins = (minutes % 60).toString().padStart(2, "0");
    return `${hours}${mins}`;
}

function sortRecords(records: TrEmptyTime[]): TrEmptyTime[] {
    return records.sort((a, b) => {
        // sort by end time, later first
        const aEnd = parseTimePoint(a.timing.split("-")[1] ?? "0000");
        const bEnd = parseTimePoint(b.timing.split("-")[1] ?? "0000");
        if (bEnd !== aEnd) return bEnd - aEnd;

        // sort by tr increasing
        const venueNum = (name: string) => {
            const match = name.match(/(\d+)$/);
            return match ? Number(match[1]) : 0;
        };

        return venueNum(a.venue) - venueNum(b.venue);
    });
}

async function emptyTrService(spine: Spine, rawDay: string, rawTime: string): Promise<emptyTrResponse> {
    const spineTT: VenueData[] = await getSpineTT(spine);
    const { day, time } = parseDayTime(rawDay, rawTime);
    const queryPoint = parseTimePoint(time);

    const records: TrEmptyTime[] = [];

    for (const venue of spineTT) {
        if (!venue.timings) {
            continue;
        }

        const dayTimings = venue.timings
            .filter(t => t.day === day)
            .map(t => parseTimeRange(t.time))
            .sort((a, b) => a.st - b.st);

        const isBusyNow = dayTimings.some(({ st, et }) => queryPoint >= st && queryPoint < et);
        if (isBusyNow) {
            continue;
        }

        const nextBooking = dayTimings.find(({ st }) => st > queryPoint);
        const freeUntil = nextBooking ? nextBooking.st : DAY_END;

        records.push({
            venue: venue.name,
            location: venue.location,
            timing: `${time}-${minutesToHHMM(freeUntil)}`,
        });
    }

    return { success: true, records: sortRecords(records) };
}

async function trTtService(tr: string): Promise<TrTtResponse> {
    try {
        const venueTiming: VenueTiming[] = await getVenueTT(tr);

        const courses: Record<DayOfWeek, CourseTiming[]> = {
            MON: [], TUE: [], WED: [], THU: [], FRI: []
        };

        for (const v of venueTiming) {
            const day = v.day as DayOfWeek;
            if (courses[day]) {
                courses[day].push({
                    courseCode: v.courseCode,
                    courseTitle: v.courseTitle,
                    time: timeToIndex(v.time),
                });
            }
        }

        return { success: true, courses };
    } catch (err) {
        console.error("Error occurred in trTTService:", (err as Error).message);
        throw err;
    }
}

export { emptyTrService, trTtService };
