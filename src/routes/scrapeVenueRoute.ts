import express from "express";
import { scrapeVenueController } from "../controllers/scrapeVenueController.js";

const router = express.Router();
router.post("/scrape-venue", scrapeVenueController);

export default router;