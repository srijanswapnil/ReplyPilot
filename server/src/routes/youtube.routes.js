import express from "express";

import {
  googleLogin,
  googleCallback,
  fetchChannel,
  fetchComments
} from "../controllers/youtube.controller.js";

const router = express.Router();

router.get("/login", googleLogin);

router.get("/callback", googleCallback);

router.get("/channel", fetchChannel);

router.get("/comments/:videoId", fetchComments);

export default router;