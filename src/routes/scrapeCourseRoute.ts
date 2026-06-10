import express from "express";
import { scrapeCourseController } from "../controllers/scrapeCourseController.js";

const router = express.Router();
router.post("/scrape", scrapeCourseController);

export default router;