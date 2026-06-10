import axios from "axios";

export class VenueScraper {
    private readonly VENUE_URL = "https://wis.ntu.edu.sg/pls/webexe88/FBSDOCU.FBSLOCATN#top"
    
    async getVenue(): Promise<string> {
        try {
            const response = await axios.get<string>(
                this.VENUE_URL,
                { timeout: 5000 }
            );

            return response.data
        } catch (error) {
            console.error(
                "Error fetching Venue data.",
                error instanceof Error ? error.message : error
            );
            throw error;
        }
    }
}