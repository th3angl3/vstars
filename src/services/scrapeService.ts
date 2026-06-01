import { load } from "cheerio";
import { Scraper } from "../scrapers/courseScraper.js";
import { populateDB } from "./dbService.js";
import type { AcadYrSem, CourseSchedule, ScheduleEntry, ScrapeResponse, ScrapeResult } from "../types/types.js";
import type { Element } from "domhandler";


function processCourseSchedule(html: string): CourseSchedule[] {
    const $ = load(html);

    const courseSchedule: CourseSchedule[] = [];
    let courseInfo: CourseSchedule | null = null;
    let index: string = "", type: string = "", group: string = "", day: string = "", time: string = "", venue: string = "", remark: string = "" ;

    $("table tr").each((i: Number, row: Element) => {
        const rowData: string[] = [];

        $(row).find("th, td").each((j: Number, cell: Element) => {
            const text = $(cell).text().replace(/\s+/g, " ").trim();
            rowData.push(text);
        });

        if (rowData.length < 3) {
            return; // skip empty rows
        }

        if (rowData.length === 3) {
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
                return; // skip header row
            }

            const [idx, typ, grp, dy, tm, vn, rmk] = rowData;

            const scheduleEntry: ScheduleEntry = {
                index: idx ?? index ?? "",
                type: typ ?? type ?? "",
                group: grp ?? group ?? "",
                day: dy ?? day ?? "",
                time: tm ?? time ?? "",
                venue: vn ?? venue ?? "",
                remark: rmk ?? remark ?? ""
            };

            if (!courseInfo) throw new Error("Schedule entry found without corresponding course information");
            courseInfo.schedule.push(scheduleEntry);
        }

        // console.log(`Processed row ${i + 1}:`, courseInfo);
    });
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