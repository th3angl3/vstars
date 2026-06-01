import axios from "axios";
import * as cheerio from "cheerio";
import type { AcadYrSem } from "../types/types.js";

export class Scraper {
    private readonly ACAD_SEM_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/aus_schedule.main";
    private readonly SOURCE_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/AUS_SCHEDULE.main_display1";
    
    async getAcadYrSem(): Promise<AcadYrSem> {
        try {
            const response = await axios.get<string>(
                this.ACAD_SEM_URL,
                { timeout: 5000 }
            );

            const $ = cheerio.load(response.data);

            const acadYrSem = $("select[name='acadsem'] option")
                .first()
                .attr("value");

            if (!acadYrSem) {
                throw new Error("Academic year and semester not found");
            }

            const parts = acadYrSem.split(";");
            if (parts.length !== 2) {
                throw new Error("Invalid format for academic year and semester");
            }

            const acadYr = Number(parts[0]);
            const sem = Number(parts[1]);

            if (Number.isNaN(acadYr) || Number.isNaN(sem)) {
                throw new Error("acadYrSem contains invalid numbers");
            }

            return { acadYr, sem };
        } catch (error) {
            console.error(
                "Error fetching academic year and semester.",
                error instanceof Error ? error.message : error
            );
            throw error;
        }
    }

    async getCourseScheduleHtml(acadYr: Number, sem:Number): Promise<string> {
        try {
            const coursePayload = {
                r_search_type: "F",
                boption: "Search",
                acadsem: `${acadYr};${sem}`,
                r_subj_code: "",
                staff_access: "false"
            };

            const response = await axios.post<string>(
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
        } catch (error) {
            console.error(
                "Error fetching course schedule.",
                error instanceof Error ? error.message : error
            );
            throw error;
        }
    }
}

