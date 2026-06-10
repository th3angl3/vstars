import express from "express";
import { ttController } from "../controllers/ttController.js";

const router = express.Router();
router.post("/generate", ttController);

export default router;