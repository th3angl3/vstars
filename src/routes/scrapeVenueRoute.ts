import express from "express";
import { scrapeVenueController } from "../controllers/scrapeVenueController.js";

const router = express.Router();
router.post("/", scrapeVenueController);

export default router;