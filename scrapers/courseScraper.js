const axios = require("axios");
const cheerio = require("cheerio");
const { connectDB, client } = require("../config/db");

class Scraper {
    constructor() {
        this.ACADYR_SEM_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/aus_schedule.main";
        this.SOURCE_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/AUS_SCHEDULE.main_display1";
    }

    async getAcadYrSem() {
        try {
            const response = await axios.get(this.ACADYR_SEM_URL, { timeout: 60000 });
            const $ = cheerio.load(response.data);

            const acadsem = $("select[name='acadsem'] option").first().attr("value");

            return acadsem.split(";").map(Number);
        } catch (err) {
            console.error("Request failed:", err.message);
        }
    }

    async getCourseScheduleHtml(acadYr, sem) {
        try {
            const coursePayload = {
                r_search_type: "F",
                boption: "Search",
                acadsem: `${acadYr};${sem}`,
                r_subj_code: "",
                staff_access: "false"
            };

            const response = await axios.post(
                this.SOURCE_URL,
                new URLSearchParams(coursePayload),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    timeout: 60000
                }
            );

            return response.data;

        } catch (err) {
            console.error("Request failed:", err.message);
        }
    }
}

(async () => {
    await connectDB();
    const scraper = new Scraper();
    const [acadYr, sem] = await scraper.getAcadYrSem();
    console.log(`Academic Year: ${acadYr}, Semester: ${sem}`);
    const result = await scraper.getCourseScheduleHtml(acadYr, sem);

    const fs = require("fs");
    fs.writeFileSync("course_schedule.html", result);

    console.log("File saved");
})();