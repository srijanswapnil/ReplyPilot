import { google } from "googleapis";
import redis,{keys} from "../config/redis.js";
import User from "../models/User.models.js";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

// 1️⃣ Create the "Memory Board" at the top of the file, completely outside the middleware function
const ongoingRefreshPromises = new Map(); 

export default async function(req,res,next){
    try {
        const userId=req.user?._id?.toString();
        
        if(!userId){
            return res.status(401).json({error:'Not authenticated'});
        }

        const cachedToken = await redis.get(keys.ytAccessToken(userId));
        const expiryStr = await redis.get(keys.ytTokenExpiry(userId));
        const expiryAt = expiryStr ? Number(expiryStr) : 0;
        const bufferMs = 5*60*1000; 

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

        // 2️⃣ Check if another request is ALREADY refreshing the token right now!
        if (ongoingRefreshPromises.has(userId)) {
            logger.debug(`Request for user ${userId} is waiting for an ongoing refresh to finish...`);
            // Wait for the leader (Request #1) to finish, grab the token it fetched, and proceed immediately!
            req.ytToken = await ongoingRefreshPromises.get(userId);
            return next();
        }

        const oauth2Client=new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({refresh_token:user.refreshToken});

        // 3️⃣ We are Request #1 (the leader). Before we go to Google, we must leave an "IOU note" (Promise) on the board!
        const refreshPromise = oauth2Client.refreshAccessToken().then(async ({ credentials }) => {
            const newAccessToken = credentials.access_token;
            const newExpiresAt = credentials.expiry_date ?? Date.now() + 60*60*1000;
            const ttlSeconds = Math.floor((newExpiresAt-Date.now())/1000);

            await redis.set(keys.ytAccessToken(userId),newAccessToken,{ EX: ttlSeconds });
            await redis.set(keys.ytTokenExpiry(userId),String(newExpiresAt),{ EX: ttlSeconds });

            logger.debug('Access Token refreshed for user:',userId);
            
            // 4️⃣ The refresh is done! Remove the "IOU note" from the board so future requests don't get confused.
            ongoingRefreshPromises.delete(userId); 
            
            return newAccessToken; 
        });

        // Pin the IOU note to the board
        ongoingRefreshPromises.set(userId, refreshPromise);

        // Await our own promise to actually fetch the token
        req.ytToken = await refreshPromise;
        next();
        
    } catch (error) {
        // If it fails, make sure we remove the broken IOU note from the board
        ongoingRefreshPromises.delete(req.user?._id?.toString());
        
        logger.error('youtubeToken middleware error:',error.message);
        return res.status(401).json({
            error:'Failed to validate Youtube token - Please re-authenticate',
            reAuthUrl:'/api/auth/google',
        });
    }
}
