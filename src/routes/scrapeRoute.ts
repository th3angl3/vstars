import express from "express";
import { scrapeController } from "../controllers/scrapeController.js";

const router = express.Router();
router.post("/scrape", scrapeController);

export default router;