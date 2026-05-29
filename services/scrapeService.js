function processCourseSchedule(html) {
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);

    const courseSchedule = [];

    // initialize variables to store course details
    let courseInfo = null;
    let courseCode = "";
    let courseName = "";
    let au = "";
    let index = "";
    let type = "";
    let group = "";
    let day = "";
    let time = "";
    let venue = "";
    let remark = "";


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
    courseSchedule.push(courseInfo); // push last course info
    return courseSchedule;
};

module.exports = { processCourseSchedule };


if (require.main === module) {
    const fs = require("fs");
    const processed = processCourseSchedule(fs.readFileSync("temp/course_schedule.html", "utf-8"));
    fs.writeFileSync("temp/course_schedule.json", JSON.stringify(processed, null, 2));
    console.log("Course schedule processed and saved to temp/course_schedule.json");
}