import { google } from "googleapis";
import { env } from "../config/env.js";

export const getChannelInfo = async (userAccessToken) => {
  // 1. Create a fresh, empty client for this specific request
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET
  );

  // 2. Set the credentials using the token passed from the controller
  oauth2Client.setCredentials({ access_token: userAccessToken });

  // 3. Initialize the YouTube API with this user's specific client
  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  // 4. Make the request
  const response = await youtube.channels.list({
    part: "snippet,statistics",
    mine: true,
  });

  return response.data;
};
export const getChannelVideosInfo = async (channelId) => {
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const response = await youtube.search.list({
    part: "snippet",
    channelId,
    maxResults: 20, // adjust as needed
    order: "date",
  });

  return response.data.items.map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnails: item.snippet.thumbnails,
  }));
};

export const getVideoInfo = async (videoId) => {
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const response = await youtube.videos.list({
    part: "snippet,statistics,contentDetails",
    id: videoId,
  });

  return response.data.items[0];
};

export const getVideoCommentsInfo = async (videoId) => {
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const response = await youtube.commentThreads.list({
    part: "snippet,replies",
    videoId,
    maxResults: 30,
    textFormat: "plainText",
  });

  return response.data.items.map(item => {
    const snippet = item.snippet.topLevelComment.snippet;
    return {
      ytCommentId: item.snippet.topLevelComment.id,
      videoId,
      channelId: snippet.channelId,
      text: snippet.textOriginal,
      authorName: snippet.authorDisplayName,
      authorChannelId: snippet.authorChannelId,
      authorAvatar: snippet.authorProfileImageUrl,
      likeCount: snippet.likeCount,
      replyCount: item.snippet.totalReplyCount,
      publishedAt: snippet.publishedAt,
      updatedAt: snippet.updatedAt,
    };
  });
};
