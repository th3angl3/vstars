import { load } from "cheerio";
import { VenueScraper } from "../scrapers/venueScraper.js";
import { populateVenueDB } from "./dbService.js";
import type { VenueData, ScrapeVenueResponse, Spine } from "../types/types.js";
import type { Element } from "domhandler";
import { SPINES } from "../config/constants.js";

function stripData(data: string): string {
    return data
        .replace(/"/g, "")
        .trim()
        .split(" ")[0]!
        .replace(/,/g, "");
}

function isSpine(value: string): value is Spine {
    return (SPINES as readonly string[]).includes(value);
}

function processVenueData(html: string): VenueData[] {

    const $ = load(html);
    
    const venues: VenueData[] = []

    const rows = $("table tr").toArray();
    for (const row of rows) {
        const rowData: string[] = [];

        $(row).find("th, td").each((j: Number, cell: Element) => {
            const text = $(cell).text().replace(/\s+/g, " ").trim();
            rowData.push(text);
        });

        if (rowData.length != 6) {
            console.error("Malformatted data scraped:", rowData);
            continue;
        }

        if (!rowData[1]?.includes("TR") || rowData[1].includes("TRX")) {
            continue; // skip LT and TRX
        }

        let spineRaw: string;

        if (rowData[0] === "SCI BUILDING") {
            spineRaw = "SOUTH SPINE";
        } else {
            spineRaw = rowData[0]!;
        }

        if (!isSpine(spineRaw) || !rowData[3]) {
            console.error("Malformatted data scraped:", rowData);
            continue;
        }

        let spine: Spine = spineRaw;

        let venueName = rowData[1].split(" ")[0];

        if (venueName!.includes("LHS")) {
            spine = "THE HIVE";
        }

        venues.push({
            spine,
            name: venueName!,
            location: stripData(rowData[3])
        });

    }
    
    return venues
}

async function scrapeVenueService(): Promise<ScrapeVenueResponse> {
    const scraper = new VenueScraper();
    try {
        const html: string = await scraper.getVenue();
        const venues: VenueData[] = processVenueData(html);
        await populateVenueDB(venues);
        return { success: true, count: venues.length };
    } catch (err) {
        console.error("Error occurred in scrapeVenueData:", (err as Error).message);
        throw err;
    }
}

export { scrapeVenueService };