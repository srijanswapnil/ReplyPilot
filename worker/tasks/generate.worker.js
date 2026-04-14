import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { bullConnection } from '../config/redis.js';
import Comment from '../models/Comment.models.js';
import Reply from '../models/Reply.models.js';
import Persona from '../models/Persona.models.js';
import Video from '../models/Video.models.js';
import httpClient from '../utils/httpClient.js';
import logger from '../utils/logger.js';

export const generateWorker = new Worker(
  'generate',
  async (job) => {
    const { commentId, tone, personaId, videoId } = job.data;
    let createdReplyId = null;

    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new Error(`Comment not found for id: ${commentId}`);
      }

      // 2. Fetch the persona (if provided)
      let personaDescription = '';
      if (personaId) {
        const persona = await Persona.findById(personaId);
        if (persona) {
          personaDescription = persona.systemPrompt || persona.description || persona.bio || '';
        }
      }

      // 3. Build video context
      let videoContext = '';
      const vid = await Video.findOne({ videoId: videoId || comment.videoId }).lean();
      if (vid) {
        videoContext = `Title: ${vid.title || 'N/A'}. Description: ${(vid.description || '').slice(0, 500)}`;
      }

      // 4. Call AI Service to generate a reply
      // AI service expects: comment_id, comment_text, tone, persona_id, video_context
      // AI service returns: comment_id, reply_text, tone, model_used, char_count
      const aiResponse = await httpClient.post('/api/v1/generate', {
        comment_id: commentId,
        comment_text: comment.textDisplay || comment.text,
        tone: tone || 'friendly',
        persona_id: personaId || null,
        video_context: videoContext,
      });

      const generatedText = aiResponse.data.reply_text;
      if (!generatedText) {
          throw new Error('AI Service did not return reply_text');
      }

      // 5. Create or update the Reply document
      const reply = await Reply.findOneAndUpdate(
        { commentId: comment._id },
        {
          commentId: comment._id,
          ytCommentId: comment.ytCommentId,
          personaId: personaId || undefined,
          generatedText,
          tone: aiResponse.data.tone || tone || 'friendly',
          status: 'pending_review',
        },
        { upsert: true, new: true }
      );

      createdReplyId = reply._id;

      logger.info(`Generate Job ${job.id} completed for comment ${commentId}`);
      return { success: true, replyId: reply._id };

    } catch (error) {
      logger.error(`Generate Job ${job.id} failed:`, error.message);
      
      if (createdReplyId) {
          await Reply.findByIdAndUpdate(createdReplyId, { status: 'failed' }).catch((err) => logger.error(`Failed to update reply ${createdReplyId} status: ${err.message}`));
      }

      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection: bullConnection,
    prefix: env.REDIS_BULL_PREFIX,
    concurrency: 5,
  }
);
