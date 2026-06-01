import type { Request, Response, NextFunction } from "express";
import { scrapeService } from "../services/scrapeService.js";
import type { ScrapeResult, ScrapeResponse } from "../types/types.js";

let isScraping: boolean = false;

async function scrapeController(req: Request, res: Response<ScrapeResponse>, next: NextFunction): Promise<void> {
    if (isScraping) {
        res.status(429).json({
            success: false,
            acadYr: 0,
            sem: 0,
            count: 0,
            message: "Scraping is already in progress. Please try again later."
        });
        return;
    }

    isScraping = true;

    try {
        const scrapeResponse: ScrapeResponse = await scrapeService();
        res.status(200).json(scrapeResponse);
    } catch (error) {
        console.error("Error in scrapeController:", (error as Error).message);
        next(error);
    } finally {
        isScraping = false;
    }
}

export { scrapeController };