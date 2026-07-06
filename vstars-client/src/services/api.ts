import type { emptyTrResponse, TimetableFilter, TimetableResponse, TrTtResponse } from "../types/index";
import type { Spine } from "../types/index";

const BASE = "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${url}`, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(err.message ?? "Request failed");
    }
    return res.json();
}

export async function generateTimetable(
    courseCodes: string[],
    ignoreLec: boolean,
    filters: TimetableFilter[] = []
): Promise<TimetableResponse> {
    return request("/api/tt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            courseCodes,
            filterOptions: {
                ignoreLEC: ignoreLec,
                filters,
            },
        }),
    });
}

export async function getEmptyVenues(
    spine: Spine,
    day: string,
    time: string
): Promise<emptyTrResponse> {
    return request("/api/empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spine, day, time }),
    });
}

export async function getTrTimetable(tr: string): Promise<TrTtResponse> {
    return request("/api/tr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tr }),
    });
}