import type { Request, Response, NextFunction } from "express";
import { scrapeVenueService } from "../services/scrapeVenueService.js";
import type { ScrapeVenueResponse } from "../types/types.js";

let isScraping: boolean = false;

async function scrapeVenueController(req: Request, res: Response<ScrapeVenueResponse>, next: NextFunction): Promise<void> {
    if (isScraping) {
        res.status(429).json({
            success: false,
            count: 0,
            message: "Scraping is already in progress. Please try again later."
        });
        return;
    }

    isScraping = true;

    try {
        const scrapeResponse: ScrapeVenueResponse = await scrapeVenueService();
        res.status(200).json(scrapeResponse);
    } catch (error) {
        console.error("Error in scrapeVenueController:", (error as Error).message);
        next(error);
    } finally {
        isScraping = false;
    }
}

export { scrapeVenueController };