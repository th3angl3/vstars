import express from "express";
import { trTtController } from "../controllers/trTtController.js";

const router = express.Router();
router.post("/", trTtController);

export default router;