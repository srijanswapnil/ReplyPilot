import express from "express";
import { fetchChannel } from "../controllers/youtube.controller.js";
import youtubeToken from "../middleware/youtubeToken.middleware.js";

const router = express.Router();

router.get("/channel", youtubeToken, fetchChannel);

export default router;