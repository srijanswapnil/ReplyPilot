import Redis from "ioredis";
import { env } from "./env.js";
import logger from "../utils/logger.js";

const redis= new Redis(env.REDIS_URL,{
    maxRetriesPerRequest:3,
    retryStrategy:(times)=>Math.min(times*100,3000),
    enableReadyCheck:true,
    lazyConnect:false,
});

redis.on('connect',()=>logger.info('Redis connected'));
redis.on('error',(err)=>logger.error('Redis error',err.message));
redis.on('reconnecting',()=>logger.warn('Redis reconnecting'))

export const keys={
    ytAccessToken:(userId)=>`yt:access_token:${userId}`,
    ytTokenExpiry:(userId)=>`yt:token_expiry:${userId}`,
    channelCache:(channelId)=>`cache:channel:${channelId}`,
    videoCache:(videoId)=>`cache:video:${videoId}`,
    session:(sessionId)=>`session:${sessionId}`,
}

export default redis;