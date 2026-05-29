const { scrapeCourseSchedule } = require('../scrapers/courseScraper');
const { processCourseSchedule } = require('../services/scrapeService');
const { connectDB, client } = require('../config/db');

