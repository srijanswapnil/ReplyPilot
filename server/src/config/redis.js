import { createClient } from "redis";
import Redis from "ioredis";
import { env } from "./env.js";
import logger from "../utils/logger.js";


// Node-redis (sessions + caching)
const redis = createClient({
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
    socket: {
        host: env.REDIS_URL,
        port: env.REDIS_PORT,
    }
});

redis.on("connect", () => logger.info("Redis (node-redis) connected"));
redis.on("error", (err) => logger.error("Redis error", err));
redis.on("reconnecting", () => logger.warn("Redis reconnecting"));

await redis.connect();

// ioredis (BullMQ)
export const bullConnection = new Redis({
  host: env.REDIS_URL,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
});

bullConnection.on("connect", () =>
  logger.info("Redis (ioredis) connected for BullMQ")
);
bullConnection.on("error", (err) =>
  logger.error("ioredis error", err)
);

// Keys
export const keys = {
  ytAccessToken: (userId) => `yt:access_token:${userId}`,
  ytTokenExpiry: (userId) => `yt:token_expiry:${userId}`,
  channelCache: (channelId) => `cache:channel:${channelId}`,
  videoCache: (videoId) => `cache:video:${videoId}`,
  session: (sessionId) => `session:${sessionId}`,
};

export default redis;