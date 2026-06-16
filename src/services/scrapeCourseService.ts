import { load } from "cheerio";
import { CourseScraper } from "../scrapers/courseScraper.js";
import { fetchVenue, populateCourseDB } from "./dbService.js";
import type { AcadYrSem, CourseSchedule, CourseIndex, IndexEntry, ScrapeCourseResponse, ScrapeCourseResult, VenueDocument, VenueTiming } from "../types/types.js";
import type { Element } from "domhandler";
import { scrapeVenueService } from "./scrapeVenueService.js";


function processCourseSchedule(html: string): CourseSchedule[] {
    const $ = load(html);

    const courseSchedule: CourseSchedule[] = [];
    let currentIndex: CourseIndex | null = null;
    let courseInfo: CourseSchedule | null = null;
    
    const rows = $("table tr").toArray();
    for (const row of rows) {
        const rowData: string[] = [];

        $(row).find("th, td").each((j: Number, cell: Element) => {
            const text = $(cell).text().replace(/\s+/g, " ").trim();
            rowData.push(text);
        });

        if (rowData.length < 3) {
            continue; // skip empty rows
        }

        if (rowData.length === 3) {
            if (currentIndex) {
                if (!courseInfo) throw new Error("Course information not found for current index");
                courseInfo.schedule.push(currentIndex);
                currentIndex = null;
            }
            if (courseInfo) {
                courseSchedule.push(courseInfo);
            }

            const [courseCode, courseTitle, au] = rowData;
            if (!courseCode || !courseTitle || !au) throw new Error("Invalid course information row");

            courseInfo = {
                courseCode: courseCode,
                courseTitle: courseTitle,
                au: au,
                schedule: []
            };

        } else {
            if (rowData[0] === "INDEX") {
                continue; // skip header row
            }

            const [idx, typ, grp, dy, tm, vn, rmk] = rowData;

            const entry: IndexEntry = {
                type: typ ?? "",
                group: grp ?? "",
                day: dy ?? "",
                time: tm ?? "",
                venue: vn ?? "",
                remark: rmk ?? ""
            };

            if (!courseInfo) throw new Error("Schedule entry found without corresponding course information");
            
            if (idx) {
                if (currentIndex) {
                    courseInfo.schedule.push(currentIndex);
                }

                currentIndex = {
                    index: idx,
                    entry: [entry]
                };
            }
            else {
                if (!currentIndex) throw new Error("Schedule entry found without corresponding index");
                currentIndex.entry.push(entry);
            }
        }
    };

    if (currentIndex) {
        if (!courseInfo) throw new Error("Course information not found for current index at end of table");
        courseInfo.schedule.push(currentIndex);
    }
    if (courseInfo) {
        courseSchedule.push(courseInfo);
    }

    return courseSchedule;
};

function processVenueTiming(venues: string[], courseSchedules: CourseSchedule[]): VenueDocument {
    const venueMap: Record<string, VenueTiming[]> = {};
    let count: number = 0

    for (const venue of venues) {
        venueMap[venue] = [];
    }

    for (const course of courseSchedules) {
        for (const index of course.schedule) {
            for (const entry of index.entry) {

                const venue = entry.venue;

                if (!venue || venue.trim() === "" || !venueMap[venue]) {
                    continue // skip entry not in venue list
                }

                const cleanedTitle = course.courseTitle
                    .replace(/[^a-zA-Z0-9 &:]/g, "")
                    .replace(/\s+/g, " ")
                    .trim();

                venueMap[venue].push({
                    courseCode: course.courseCode,
                    courseTitle: cleanedTitle,
                    day: entry.day,
                    time: entry.time
                });
                count++;
                
            }
        }
    }

    return { records: venueMap, count: count };
}

async function scrapeData(): Promise<ScrapeCourseResult> {
    const scraper = new CourseScraper();

    try {
        const acadYrSem: AcadYrSem = await scraper.getAcadYrSem();
        const html = await scraper.getCourseScheduleHtml(acadYrSem.acadYr, acadYrSem.sem);
        const courseSchedule = processCourseSchedule(html);
        let venues = await fetchVenue();
        if (venues.length === 0) {
            await scrapeVenueService();
            venues = await fetchVenue();
        }
        const venueDoc = processVenueTiming(venues, courseSchedule);

        return { ...acadYrSem, courseSchedule, venueDoc };
    } catch (err) {
        console.error("Error occurred while scraping data:", (err as Error).message);
        throw err;
    }
}

async function scrapeCourseService(): Promise<ScrapeCourseResponse> {
    try {
        const scrapeResult: ScrapeCourseResult = await scrapeData();
        await populateCourseDB(scrapeResult.acadYr, scrapeResult.sem, scrapeResult.courseSchedule, scrapeResult.venueDoc);
        return { success: true, acadYr: scrapeResult.acadYr, sem: scrapeResult.sem, courseCount: scrapeResult.courseSchedule.length, entryCount: scrapeResult.venueDoc.count };

    } catch (err) {
        console.error("Error occurred in scrapeCourseService:", (err as Error).message);
        throw err;
    }
}

export { scrapeCourseService };