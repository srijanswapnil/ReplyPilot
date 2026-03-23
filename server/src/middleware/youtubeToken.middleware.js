import { google } from "googleapis";
import redis,{keys} from "../config/redis.js";
import User from "../models/User.models.js";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";


export default async function(req,res,next){
    try {
        const userId=req.user?._id?.toString();
        
        if(!userId){
            return res.status(401).json({error:'Not authenticated'});
        }

        const cachedToken = await redis.get(keys.ytAccessToken(userId));
        const expiryStr = await redis.get(keys.ytTokenExpiry(userId));
        const expiryAt = expiryStr ? Number(expiryStr) : 0;
        const bufferMs = 5*60*1000; //youtube accesstoken validity is 60 min so putting 5 min extra for buffer safety.

        if(cachedToken && Date.now() < expiryAt-bufferMs){
            req.ytToken=cachedToken;
            return next();
        }

        const user = await User.findById(userId).select("+refreshToken").lean();
        if(!user?.refreshToken){
            return res.status(401).json({
                error:'Youtube not connected - Please reauthenticate',
                reAuthUrl:'/api/auth/google',
            });
        }

        const oauth2Client=new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({refresh_token:user.refreshToken});

        const {credentials} = await oauth2Client.refreshAccessToken();
        const newAccessToken = credentials.access_token;
        const newExpiresAt = credentials.expiry_date ?? Date.now() + 60*60*1000;
        const ttlSeconds = Math.floor((newExpiresAt-Date.now())/1000);

        await redis.set(keys.ytAccessToken(userId),newAccessToken,{ EX: ttlSeconds });
        await redis.set(keys.ytTokenExpiry(userId),String(newExpiresAt),{ EX: ttlSeconds });

        logger.debug('Access Token refreshed for user:',userId);

        req.ytToken = newAccessToken;
        next();
    } catch (error) {
        logger.error('youtubeToken middleware error:',error.message);
        return res.status(401).json({
            error:'Failed to validate Youtube token - Please re-authenticate',
            reAuthUrl:'/api/auth/google',
        });
    }
}