import { getChannelInfo } from "../services/youtube.service.js";

import Channel from "../models/Channel.models.js";
import Video from "../models/Video.models.js";
import Comment from "../models/Comment.models.js";
import {
  getChannelInfo,
  getChannelVideosInfo,
  getVideoInfo,
  getVideoCommentsInfo
} from "../services/youtube.service.js";

export const fetchChannel = async (req, res) => {

  try {

    const data = await getChannelInfo();

    res.json(data);

  } catch (error) {

    res.status(500).json(error);

  }

};

// 1. Channel Details
export async function getChannelDetails(req, res, next) {
  try {
    const { channelId } = req.params;
    const data = await getChannelInfo(channelId);

    const channel = await Channel.findOneAndUpdate(
      { channelId },
      { ...data, lastSyncedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, channel });
  } catch (err) {
    next(err);
  }
}

// 2. Channel Videos
export async function getChannelVideos(req, res, next) {
  try {
    const { channelId } = req.params;
    const videos = await getChannelVideosInfo(channelId);

    const saved = await Promise.all(
      videos.map(v =>
        Video.findOneAndUpdate(
          { videoId: v.videoId },
          { ...v, lastSyncedAt: new Date() },
          { upsert: true, new: true }
        )
      )
    );

    res.json({ success: true, videos: saved });
  } catch (err) {
    next(err);
  }
}

// 3. Video Details
export async function getVideoDetails(req, res, next) {
  try {
    const { videoId } = req.params;
    const data = await getVideoInfo(videoId);

    const video = await Video.findOneAndUpdate(
      { videoId },
      { ...data, lastSyncedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, video });
  } catch (err) {
    next(err);
  }
}

// 4. Video Comments
export async function getVideoComments(req, res, next) {
  try {
    const { videoId } = req.params;
    const comments = await getVideoCommentsInfo(videoId);

    const saved = await Promise.all(
      comments.map(c =>
        Comment.findOneAndUpdate(
          { ytCommentId: c.ytCommentId },
          { ...c, classificationStatus: "pending" },
          { upsert: true, new: true }
        )
      )
    );

    res.json({ success: true, comments: saved });
  } catch (err) {
    next(err);
  }
}


