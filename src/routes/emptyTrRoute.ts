import express from "express";
import { emptyTrController } from "../controllers/emptyTrController.js";

const router = express.Router();
router.post("/", emptyTrController);

export default router;