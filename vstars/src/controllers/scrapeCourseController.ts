import type { Request, Response, NextFunction } from "express";
import { scrapeCourseService } from "../services/scrapeCourseService.js";
import type { ScrapeCourseResponse } from "../types/types.js";

let isScraping: boolean = false;

async function scrapeCourseController(req: Request, res: Response<ScrapeCourseResponse>, next: NextFunction): Promise<void> {
    if (isScraping) {
        res.status(429).json({
            success: false,
            acadYr: 0,
            sem: 0,
            courseCount: 0,
            entryCount: 0,
            message: "Scraping is already in progress. Please try again later."
        });
        return;
    }

    isScraping = true;

    try {
        const scrapeResponse: ScrapeCourseResponse = await scrapeCourseService();
        res.status(200).json(scrapeResponse);
    } catch (error) {
        console.error("Error in scrapeCourseController:", (error as Error).message);
        next(error);
    } finally {
        isScraping = false;
    }
}

export { scrapeCourseController };