import type { Request, Response, NextFunction } from "express";
import { generateTimetableService } from "../services/ttService.js";
import type { TimetableRequest, TimetableResponse } from "../types/types.js";
import { DEFAULT_TIMETABLE_OPTIONS } from "../config/constants.js";

async function ttController(
    req: Request<{}, TimetableResponse, TimetableRequest>,
    res: Response<TimetableResponse>,
    next: NextFunction
): Promise<void> {
    const { courseCodes, filterOptions = DEFAULT_TIMETABLE_OPTIONS } = req.body;

    if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
        res.status(400).json({ success: false, count: 0, notFound: [], timetables: [], message: "Empty Course Code List." });
        return;
    }

    try {
        const result = await generateTimetableService(courseCodes, filterOptions);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

export { ttController };