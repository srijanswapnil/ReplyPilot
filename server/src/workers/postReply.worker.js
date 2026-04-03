import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { bullConnection } from '../config/redis.js';
import Reply from '../models/Reply.models.js';
import Comment from '../models/Comment.models.js';
import Video from '../models/Video.models.js';
import { getValidYoutubeToken } from '../utils/youtubeToken.helper.js';
import { buildYoutubeClient } from '../utils/youtubeClient.js';
import logger from '../utils/logger.js';

export const postReplyWorker = new Worker(
  'post-reply',
  async (job) => {
    const { replyId } = job.data;

    try {
      // 1. Fetch the Reply
      const reply = await Reply.findById(replyId);
      if (!reply) {
        throw new Error(`Reply not found for id: ${replyId}`);
      }

      if (reply.status === 'published') {
          logger.warn(`Reply ${replyId} is already published.`);
          return { success: true, status: 'already_published' };
      }

      // Ensure we have final text to post
      const textToPost = reply.finalText || reply.editedText || reply.generatedText;
      if (!textToPost) {
          throw new Error(`Reply ${replyId} has no text to post`);
      }

      // 2. Fetch the Comment to get the video ID
      const comment = await Comment.findById(reply.commentId);
      if (!comment) {
          throw new Error('Associated comment not found');
      }

      // 3. Fetch the Video to get the owner (userId)
      const video = await Video.findOne({ videoId: comment.videoId });
      if (!video) {
          throw new Error(`Video ${comment.videoId} not found`);
      }

      // 4. Fetch the valid YouTube Access Token for the user
      const accessToken = await getValidYoutubeToken(video.userId.toString());
      
      // 5. Build the YouTube Client and post the comment
      const youtube = buildYoutubeClient(accessToken);
      
      const response = await youtube.comments.insert({
          part: ['snippet'],
          requestBody: {
              snippet: {
                  parentId: comment.ytCommentId,
                  textOriginal: textToPost
              }
          }
      });

      const ytReplyId = response.data.id;

      // 6. Update the Reply document
      reply.ytReplyId = ytReplyId;
      reply.status = 'published';
      reply.publishedAt = new Date();
      await reply.save();

      // Optionally, update the Comment's reply count
      comment.replyCount = (comment.replyCount || 0) + 1;
      await comment.save();

      logger.info(`PostReply Job ${job.id} completed. Posted reply to ${comment.ytCommentId}`);
      return { success: true, ytReplyId };

    } catch (error) {
      logger.error(`PostReply Job ${job.id} failed:`, error.message);
      
      // Mark reply as failed if it hasn't been posted yet
      if (replyId) {
          await Reply.findByIdAndUpdate(replyId, { status: 'failed' }).catch(err => {
              logger.error(`Failed to update reply ${replyId} status to failed: ${err.message}`);
          });
      }
      
      throw error; // Let BullMQ retry
    }
  },
  {
    connection: { client: bullConnection },
    prefix: env.REDIS_BULL_PREFIX,
    concurrency: 5,
  }
);
