const { scrapeService } = require('../services/scrapeService');

let isScraping = false;

async function scrapeController(req, res, next) {
    if (isScraping) {
        return res.status(429).json({ success: false, message: "Scraping already in progress. Please try again later." });
    }
    isScraping = true;
    try {
        const result = await scrapeService();

        res.json({
            success: true,
            acadYr: result.acadYr,
            sem: result.sem,
            count: result.courseSchedule.length
        });

    } catch (err) {
        console.error("Controller error:", err.message);
        next(err);
    } finally {
        isScraping = false;
    }
}

module.exports = { scrapeController };