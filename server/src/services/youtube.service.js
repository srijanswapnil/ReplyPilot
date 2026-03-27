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
