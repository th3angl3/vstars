import type { emptyTrResponse } from "../types/index";
import type { Spine } from "../types/index";

const BASE = "http://localhost:3000";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${url}`, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(err.message ?? "Request failed");
    }
    return res.json();
}

export async function getEmptyVenues(
    spine: Spine,
    day: string,
    time: string
): Promise<emptyTrResponse> {
    return request("/empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spine, day, time }),
    });
}