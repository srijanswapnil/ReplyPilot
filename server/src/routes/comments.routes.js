import express from "express";
import { fetchComments } from "../controllers/comments.controller.js";
import youtubeToken from "../middleware/youtubeToken.middleware.js";

const router=express.Router();

router.route("/:videoId").get(youtubeToken, fetchComments);

export default router;