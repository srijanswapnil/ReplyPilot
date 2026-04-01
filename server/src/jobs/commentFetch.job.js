import { enqueueClassifyBulk } from '../services/queue.service.js';
import logger from '../utils/logger.js';

/**
 * Enqueues one classify job per comment into the BullMQ classify queue.
 *
 * Called right after Comment.bulkWrite() inside getVideoCommentsInfo().
 * Uses addBulk() instead of individual adds — one Redis round-trip for all jobs.
 *
 * @param {Array} comments  - CommentMapper() output array (has ytCommentId + text)
 * @param {string} userId   - MongoDB User._id (string) — passed to generate worker later
 */
export const enqueueClassifyJobsForVideo = async (comments, userId) => {
  if (!comments?.length) return;

  const jobs = comments.map((comment) => ({
    name: 'classify',
    data: {
      ytCommentId: comment.ytCommentId, // used by worker to look up the Comment doc
      commentText: comment.text,         // sent directly to AI — no extra DB read needed
      userId,                            // needed later for persona lookup in generate step
    },
  }));

  await enqueueClassifyBulk(jobs);

  logger.info(`Enqueued ${jobs.length} classify jobs for userId: ${userId}`);
};
