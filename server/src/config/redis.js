import { createClient } from "redis";
import { env } from "./env.js";
import logger from "../utils/logger.js";

const redis = createClient({
  url: env.REDIS_URL,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error("Redis error", err.message));
redis.on("reconnecting", () => logger.warn("Redis reconnecting"));

await redis.connect();

export const keys = {
  ytAccessToken: (userId) => `yt:access_token:${userId}`,
  ytTokenExpiry: (userId) => `yt:token_expiry:${userId}`,
  channelCache: (channelId) => `cache:channel:${channelId}`,
  videoCache: (videoId) => `cache:video:${videoId}`,
  session: (sessionId) => `session:${sessionId}`,
};

export default redis;