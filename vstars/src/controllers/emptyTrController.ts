import type { Request, Response, NextFunction } from "express";
import type { emptyTrRequest, emptyTrResponse } from "../types/types.js";
import { SPINES } from "../config/constants.js";
import { emptyTrService } from "../services/trService.js";

async function emptyTrController(
    req: Request<{}, emptyTrResponse, emptyTrRequest>,
    res: Response<emptyTrResponse>,
    next: NextFunction
): Promise<void> {
    const { spine, day, time } = req.body;

    if (!SPINES.includes(spine)) {
        res.status(400).json({ success: false, records: [] })
        return;
    }

    try {
        const result = await emptyTrService(spine, day, time);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}


export { emptyTrController };