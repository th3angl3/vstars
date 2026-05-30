const { Scraper } = require("../scrapers/courseScraper");
const { populateDB } = require("./dbService");

function processCourseSchedule(html) {
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);

    const courseSchedule = [];
    let courseInfo = null;
    let index, type, group, day, time, venue;

    $("table tr").each((i, row) => {
        const rowData = [];

        $(row).find("th, td").each((j, cell) => {
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
            courseInfo = {
                courseCode: rowData[0],
                courseTitle: rowData[1],
                au: rowData[2],
                schedule: []
            };

        } else {
            if (rowData[0] === "INDEX") {
                return; // skip header row
            }
            const scheduleEntry = {
                index: rowData[0] || index,
                type: rowData[1] || type,
                group: rowData[2] || group,
                day: rowData[3] || day,
                time: rowData[4] || time,
                venue: rowData[5] || venue,
                remark: rowData[6] || ""
            };
            courseInfo.schedule.push(scheduleEntry);
        }

        // console.log(`Processed row ${i + 1}:`, courseInfo);
    });
    if (courseInfo) {
        courseSchedule.push(courseInfo);
    }
    return courseSchedule;
};

async function scrapeData() {
    try { 
        const scraper = new Scraper();
        const [acadYr, sem] = await scraper.getAcadYrSem();
        const result = await scraper.getCourseScheduleHtml(acadYr, sem);
        const courseSchedule = processCourseSchedule(result);
        return { acadYr, sem, courseSchedule };
    } catch (err) {
        console.error("Scraping failed:", err.message);
        throw err;
    }
}

async function scrapeService() {
    try {
        const { acadYr, sem, courseSchedule } = await scrapeData();
        await populateDB(acadYr, sem, courseSchedule);

        return { acadYr, sem, courseSchedule };
    } catch (err) {
        console.error("Scraping service error:", err.message);
        throw err;
    }

}

module.exports = { scrapeService };


if (require.main === module) {
    const fs = require("fs");
    const processed = processCourseSchedule(fs.readFileSync("temp/course_schedule.html", "utf-8"));
    fs.writeFileSync("temp/course_schedule.json", JSON.stringify(processed, null, 2));
    console.log("Course schedule processed and saved to temp/course_schedule.json");
}