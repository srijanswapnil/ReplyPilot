import { google } from "googleapis";
import oauth2Client from "../config/googleOAuth.js";

export const getChannelInfo = async () => {

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client
  });

  const response = await youtube.channels.list({
    part: "snippet,statistics",
    mine: true
  });

  return response.data;
};


export const getVideoComments = async (videoId) => {

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client
  });

  const response = await youtube.commentThreads.list({
    part: "snippet",
    videoId: videoId,
    maxResults: 20
  });

  return response.data;

};