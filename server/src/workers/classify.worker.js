import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { bullConnection } from '../config/redis.js';
import Comment from '../models/Comment.models.js';
import httpClient from '../utils/httpClient.js';
import logger from '../utils/logger.js';

export const classifyWorker = new Worker(
  'classify',
  async (job) => {
    const { commentId } = job.data;

    try {
      // 1. Fetch the comment
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new Error(`Comment not found for id: ${commentId}`);
      }

      // 2. Call AI Service for classification
      // Assuming a generic endpoint like /api/v1/classify
      const aiResponse = await httpClient.post('/api/v1/classify', {
        text: comment.text,
      });

      const { intent = 'neutral', confidence = null, isSpam = false } = aiResponse.data;

      // 3. Update the comment with classification results
      comment.intent = intent;
      comment.intentConfidence = confidence;
      comment.isSpam = isSpam;
      comment.classificationStatus = 'done';
      await comment.save();

      logger.info(`Classify Job ${job.id} completed for comment ${commentId}`);
      return { success: true, intent, isSpam };

    } catch (error) {
      logger.error(`Classify Job ${job.id} failed:`, error.message);
      
      // Attempt to mark comment as failed if it exists
      if (commentId) {
        await Comment.findByIdAndUpdate(commentId, { classificationStatus: 'failed' }).catch(err => {
            logger.error(`Failed to update comment ${commentId} status to failed: ${err.message}`);
        });
      }
      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection: { client: bullConnection },
    prefix: env.REDIS_BULL_PREFIX,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);
