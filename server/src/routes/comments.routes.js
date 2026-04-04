import express from "express";
import { getComment, listComments, updateCommentIntent, classifyComment } from "../controllers/comments.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router=express.Router();

router.route("/").get(authMiddleware,listComments);

router.route("/:id").get(authMiddleware,getComment);

router.route("/:id/intent").patch(authMiddleware,updateCommentIntent);

router.route("/:id/classify").post(authMiddleware, classifyComment);

export default router;