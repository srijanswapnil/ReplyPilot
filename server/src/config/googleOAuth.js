import { google } from "googleapis";

import dotenv from "dotenv";
dotenv.config();


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
console.log("redirect uri",process.env.GOOGLE_REDIRECT_URI);

export default oauth2Client;