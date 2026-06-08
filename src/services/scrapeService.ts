import { load } from "cheerio";
import { Scraper } from "../scrapers/courseScraper.js";
import { populateDB } from "./dbService.js";
import type { AcadYrSem, CourseSchedule, CourseIndex, IndexEntry, ScrapeResponse, ScrapeResult } from "../types/types.js";
import type { Element } from "domhandler";

function processCourseSchedule(html: string): CourseSchedule[] {
    const $ = load(html);

    const courseSchedule: CourseSchedule[] = [];
    let currentIndex: CourseIndex | null = null;
    let courseInfo: CourseSchedule | null = null;
    let index: string = "", type: string = "", group: string = "", day: string = "", time: string = "", venue: string = "", remark: string = "" ;

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

async function scrapeData(): Promise<ScrapeResult> {
    const scraper = new Scraper();

    try {
        const acadYrSem: AcadYrSem = await scraper.getAcadYrSem();
        const html = await scraper.getCourseScheduleHtml(acadYrSem.acadYr, acadYrSem.sem);
        const courseSchedule = processCourseSchedule(html);

        return { ...acadYrSem, courseSchedule };
    } catch (err) {
        console.error("Error occurred while scraping data:", (err as Error).message);
        throw err;
    }
}

async function scrapeService(): Promise<ScrapeResponse> {
    try {
        const scrapeResult: ScrapeResult = await scrapeData();
        await populateDB(scrapeResult.acadYr, scrapeResult.sem, scrapeResult.courseSchedule);
        return { success: true, acadYr: scrapeResult.acadYr, sem: scrapeResult.sem, count: scrapeResult.courseSchedule.length };

    } catch (err) {
        console.error("Error occurred in scrapeService:", (err as Error).message);
        throw err;
    }
}

export { scrapeService };