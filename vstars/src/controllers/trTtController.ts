import type { Request, Response, NextFunction } from "express";
import type { TrTtRequest, TrTtResponse } from "../types/types.js";
import { trTtService } from "../services/trService.js";

async function trTtController(
    req: Request<{}, TrTtResponse, TrTtRequest>,
    res: Response<TrTtResponse>,
    next: NextFunction
): Promise<void> {
    const { tr } = req.body;

    if (!tr) {
        res.status(400).json({ success: false, timings: [] })
        return;
    }

    try {
        const result = await trTtService(tr);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}


export { trTtController };