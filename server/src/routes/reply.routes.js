import express from "express";
import {
  generateSingleReply,
  listReplies,
  getReply,
  editReply,
  approveReply,
  rejectReply,
  publishReply,
  regenerateReply,
} from "../controllers/reply.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply authMiddleware to all routes
router.use(authMiddleware);

router.route("/")
  .get(listReplies);

router.route("/generate/:id")
  .post(generateSingleReply);

router.route("/:id")
  .get(getReply);

router.route("/:replyId/edit")
  .put(editReply);

router.route("/:replyId/approve")
  .put(approveReply);

router.route("/:replyId/reject")
  .put(rejectReply);

router.route("/:replyId/publish")
  .put(publishReply);

router.route("/:replyId/regenerate")
  .post(regenerateReply);

export default router;
