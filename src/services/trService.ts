import { getSpineTT } from "./dbService.js";
import type { DayOfWeek, Spine, VenueData } from "../types/types.js";

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

async function trService(spine: Spine, day: DayOfWeek, time: string): Promise<TrResponse> {
    const spineTT: VenueData[] = await getSpineTT(spine);

    for (const venue of spineTT) {
        if (!venue.timings) {
            continue
        }

        for (const timing of venue.timings) {
            const { st, et } = parseTimeRange(timing.time);
            if (timing.day !== day || et <= Number(time)) {
                // remove the timing from venue.timings
            }
        }
    }


}
