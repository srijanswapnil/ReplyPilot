import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { bullConnection } from '../config/redis.js';
import Comment from '../models/Comment.models.js';
import httpClient from '../utils/httpClient.js';
import logger from '../utils/logger.js';
import { enqueueGenerateJob } from '../utils/queueHelpers.js';

export const classifyWorker = new Worker(
  'classify',
  async (job) => {
    const { commentId, tone, personaId, videoId } = job.data;

    try {
      // 1. Fetch the comment
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new Error(`Comment not found for id: ${commentId}`);
      }

      // 2. Call AI Service for classification
      const aiResponse = await httpClient.post('/api/v1/classify', {
        comment_id: commentId,
        text: comment.textDisplay || comment.text,
      });

      const { intents = [], is_spam = false } = aiResponse.data;

      // 3. Update the comment with classification results
      comment.intents = intents.map(i => ({
        label: i.label?.toLowerCase(),
        confidence: i.confidence,
      }));
      comment.isSpam = is_spam;
      comment.classificationStatus = 'done';
      await comment.save();

      // 4. Chain to generate queue if NOT spam
      if (!is_spam) {
        await enqueueGenerateJob(
          {
            commentId,
            tone: tone || 'friendly',
            personaId: personaId || null,
            videoId: videoId || comment.videoId,
          },
          { jobId: `generate-${commentId}` }
        );
        logger.info(`Chained generate job for non-spam comment ${commentId}`);
      } else {
        logger.info(`Skipping generate for spam comment ${commentId}`);
      }

      logger.info(`Classify Job ${job.id} completed for comment ${commentId}`);
      const primaryIntent = intents[0]?.label || 'neutral';
      return { success: true, intent: primaryIntent, isSpam: is_spam };

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
    connection: bullConnection,
    prefix: env.REDIS_BULL_PREFIX,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);
