import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { bullConnection } from '../config/redis.js';
import Comment from '../models/Comment.models.js';
import Reply from '../models/Reply.models.js';
import Persona from '../models/Persona.models.js';
import httpClient from '../utils/httpClient.js';
import logger from '../utils/logger.js';

export const generateWorker = new Worker(
  'generate',
  async (job) => {
    const { commentId, tone, personaId } = job.data;
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

      // 3. Call AI Service to generate a reply
      const aiResponse = await httpClient.post('/api/v1/generate', {
        text: comment.text,
        tone: tone || 'friendly',
        personaDescription
      });

      const generatedText = aiResponse.data.generatedText || aiResponse.data.reply;
      if (!generatedText) {
          throw new Error('AI Service did not return generated text');
      }

      // 4. Create the Reply document
      const reply = new Reply({
          commentId: comment._id,
          ytCommentId: comment.ytCommentId,
          personaId: personaId || null,
          generatedText,
          tone: tone || 'friendly',
          status: 'pending_review' // Defaulting to pending_review
      });

      await reply.save();
      createdReplyId = reply._id;

      // OPTIONAL: If auto-post feature is enabled contextually, we would queue it to postReplyQueue here.
      // But adhering to standard review pipeline, we leave it in 'pending_review'.

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
