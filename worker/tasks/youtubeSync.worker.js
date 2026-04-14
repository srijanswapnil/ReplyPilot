import { Worker } from 'bullmq';
import { bullConnection } from '../config/redis.js';
import redis, { keys } from '../config/redis.js';
import { getValidYoutubeToken } from '../utils/youtubeToken.helper.js';
import { buildYoutubeClient, fetchLatestVideos, fetchTranscript } from '../utils/youtubeClient.js';
import Video from '../models/Video.models.js';
import logger from '../utils/logger.js';

const youtubeSyncWorker = new Worker(
  'youtube-sync-queue',
  async (job) => {
    const { userId, channelId } = job.data;
    logger.info(`Starting YouTube sync for user ${userId}, channel ${channelId}`);

    try {
      const accessToken = await getValidYoutubeToken(userId);
      const youtubeClient = buildYoutubeClient(accessToken);

      // We'll check videos published in the last 24 hours
      const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const videos = await fetchLatestVideos(youtubeClient, channelId, publishedAfter);

      logger.info(`Found ${videos.length} videos from the last 24 hours for channel ${channelId}`);

      for (const item of videos) {
        // search.list returns id: { videoId: "..." } for videos
        const videoId = item.id?.videoId;
        if (!videoId) {
           logger.debug('Item has no videoId, skipping', { item: JSON.stringify(item.id) });
           continue; 
        }

        // Upsert video to DB
        logger.debug(`Upserting video ${videoId} to DB for channel ${channelId}`);
        await Video.findOneAndUpdate(
          { videoId: videoId },
          {
            videoId: videoId,
            channelId: channelId,
            userId: userId,
            title: item.snippet?.title,
            description: item.snippet?.description,
            publishedAt: new Date(item.snippet?.publishedAt),
            thumbnail: {
              default: item.snippet?.thumbnails?.default?.url,
              medium: item.snippet?.thumbnails?.medium?.url,
              high: item.snippet?.thumbnails?.high?.url
            },
            lastSyncedAt: new Date()
          },
          { upsert: true, new: true }
        );
        logger.debug(`Successfully upserted video ${videoId}`);

        // Fetch and cache transcript if not already in Redis
        const existingTranscript = await redis.get(keys.ytTranscript(videoId));
        if (existingTranscript) {
          logger.debug(`Transcript for video ${videoId} already exists in Redis, skipping fetch.`);
        } else {
          const transcriptText = await fetchTranscript(videoId);
          if (transcriptText) {
            await redis.set(keys.ytTranscript(videoId), transcriptText, { EX: 86400 });
            logger.debug(`Cached new transcript for video ${videoId}`);
          } else {
            logger.warn(`No transcript found or error fetching for video ${videoId}`);
          }
        }
      }

      logger.info(`Successfully synced channel ${channelId}`);
      return { success: true, videosSynced: videos.length };
    } catch (error) {
      if (error.reAuthNeeded) {
        logger.warn(`User ${userId} needs to re-authenticate. Skipping sync.`);
        return { success: false, reason: "reAuthNeeded" };
      }
      logger.error(`Error in youtube sync worker for channel ${channelId}: ${error.message}`, { errorStack: error.stack });
      throw error;
    }
  },
  { connection: bullConnection }
);

youtubeSyncWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} for youtube sync has completed!`);
});

youtubeSyncWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} for youtube sync has failed with ${err.message}`);
});

export default youtubeSyncWorker;
