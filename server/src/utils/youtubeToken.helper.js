import { google } from "googleapis";
import redis, { keys } from "../config/redis.js";
import User from "../models/User.models.js";
import { env } from "../config/env.js";
import logger from "./logger.js";

// "Memory Board" to prevent race conditions during refresh
const ongoingRefreshPromises = new Map(); 

/**
 * Retrieves a valid YouTube OAuth Access token for the given user ID.
 * Refreshes it if it is expired or missing from Redis.
 * @param {string} userId - The ID of the authenticated user
 * @returns {Promise<string>} - The valid YouTube access token
 * @throws {Error} - Throws if user is missing refresh token or auth fails
 */
export async function getValidYoutubeToken(userId) {
    if (!userId) {
        throw new Error('UserId is required to fetch youtube token');
    }

    const cachedToken = await redis.get(keys.ytAccessToken(userId));
    const expiryStr = await redis.get(keys.ytTokenExpiry(userId));
    const expiryAt = expiryStr ? Number(expiryStr) : 0;
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

    // 1. If valid in Redis, return it immediately
    if (cachedToken && Date.now() < expiryAt - bufferMs) {
        return cachedToken;
    }

    // 2. Fetch user to get long-lived refresh token
    const user = await User.findById(userId).select("+refreshToken").lean();
    if (!user?.refreshToken) {
        const err = new Error('Youtube not connected - Please reauthenticate');
        err.reAuthNeeded = true;
        throw err;
    }

    // 3. Check if another request is ALREADY refreshing the token right now
    if (ongoingRefreshPromises.has(userId)) {
        logger.debug(`Request for user ${userId} is waiting for an ongoing refresh to finish...`);
        return await ongoingRefreshPromises.get(userId);
    }

    const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: user.refreshToken });

    // 4. We are Request #1 (the leader). Leave "IOU note" on board.
    const refreshPromise = oauth2Client.refreshAccessToken().then(async ({ credentials }) => {
        const newAccessToken = credentials.access_token;
        const newExpiresAt = credentials.expiry_date ?? Date.now() + 60 * 60 * 1000;
        const ttlSeconds = Math.floor((newExpiresAt - Date.now()) / 1000);

        await redis.set(keys.ytAccessToken(userId), newAccessToken, { EX: ttlSeconds });
        await redis.set(keys.ytTokenExpiry(userId), String(newExpiresAt), { EX: ttlSeconds });

        logger.debug('Access Token refreshed for user:', userId);
        
        // 5. Done refreshing. Remove IOU note.
        ongoingRefreshPromises.delete(userId); 
        
        return newAccessToken; 
    }).catch(error => {
        // Remove broken IOU on failure
        ongoingRefreshPromises.delete(userId);
        throw error;
    });

    ongoingRefreshPromises.set(userId, refreshPromise);
    return await refreshPromise;
}
