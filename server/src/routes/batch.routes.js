import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { enqueueBatch } from "../controllers/batch.controller.js";

const router = express.Router();

router.route("/").post(authMiddleware,enqueueBatch);

export default router;