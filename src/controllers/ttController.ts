import type { Request, Response, NextFunction } from "express";
import { generateTimetableService } from "../services/ttService.js";
import type { TimetableFilter, TimetableResponse } from "../types/types.js";


interface TimetableRequest {
    courseCodes: string[];
    filters?: TimetableFilter[];
    maxResults?: number;
}

async function ttController(
    req: Request<{}, TimetableResponse, TimetableRequest>,
    res: Response<TimetableResponse>,
    next: NextFunction
): Promise<void> {
    const { courseCodes, filters = [] } = req.body;

    if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
        res.status(400).json({ success: false, count: 0, notFound: [], timetables: [] });
        return;
    }

    try {
        const result = await generateTimetableService(courseCodes, filters);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

export { ttController };