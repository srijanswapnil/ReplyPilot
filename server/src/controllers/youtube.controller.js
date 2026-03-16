import oauth2Client from "../config/googleOAuth.js";
import { getChannelInfo, getVideoComments } from "../services/youtube.service.js";

export const googleLogin = (req, res) => {

  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl"
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent"
  });

  res.redirect(url);
};


export const googleCallback = async (req, res) => {

  try {

    const code = req.query.code;

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);
    
    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);

    res.json({
      message: "OAuth Success",
      tokens
    });

  } catch (error) {

    res.status(500).json(error);

  }

};


export const fetchChannel = async (req, res) => {

  try {

    const data = await getChannelInfo();

    res.json(data);

  } catch (error) {

    res.status(500).json(error);

  }

};


export const fetchComments = async (req, res) => {

  try {

    const { videoId } = req.params;

    const data = await getVideoComments(videoId);

    res.json(data);

  } catch (error) {

    res.status(500).json(error);

  }

};