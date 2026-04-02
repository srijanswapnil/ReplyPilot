import Comment from '../models/Comment.models.js';
import Video from '../models/Video.models.js';
import { enqueueClassifyBulk } from '../services/queue.service.js';
import logger from '../utils/logger.js';

const ENQUEUE_CHUNK = 200;

export async function enqueueBatch(req, res, next) {
  try {
    const userId = req.user._id;
    const { videoId, commentIds, tone = 'friendly', personaId } = req.body;

    if (!videoId) return res.status(400).json({ error: 'videoId is required' });

    /* ── 1. Owner-scoped verification ─────────────────────────────── */
    const video = await Video.findOne({ videoId, userId }).lean();
    if (!video) {
      return res
        .status(403)
        .json({ error: 'Video not found or does not belong to you' });
    }

    /* ── 2. Atomic claim: pending → processing ────────────────────── */
    const claimFilter = { videoId, classificationStatus: 'pending' };
    if (commentIds?.length) claimFilter._id = { $in: commentIds };

    const { modifiedCount } = await Comment.updateMany(claimFilter, {
      $set: { classificationStatus: 'processing' },
    });

    if (modifiedCount === 0) {
      return res.json({ message: 'No pending comments to process', queued: 0 });
    }

    /* ── 3. Read back claimed comments ────────────────────────────── */
    const readFilter = { videoId, classificationStatus: 'processing' };
    if (commentIds?.length) readFilter._id = { $in: commentIds };

    const claimed = await Comment.find(readFilter)
      .select('_id ytCommentId text')
      .lean();

    /* ── 4. Enqueue in bounded chunks ─────────────────────────────── */
    try {
      for (let i = 0; i < claimed.length; i += ENQUEUE_CHUNK) {
        const chunk = claimed.slice(i, i + ENQUEUE_CHUNK);
        const jobs = chunk.map((c) => ({
          name: 'classify',
          data: {
            commentId: c._id.toString(),
            commentText: c.text,
            videoId,
            tone,
            personaId: personaId || null,
          },
        }));
        await enqueueClassifyBulk(jobs);
      }
    } catch (enqueueErr) {
      /* ── 5. Rollback on queue failure ─────────────────────────── */
      await Comment.updateMany(
        { _id: { $in: claimed.map((c) => c._id) } },
        { $set: { classificationStatus: 'pending' } },
      );
      logger.error(
        `Batch enqueue failed for video ${videoId}, rolled back ${claimed.length} comments`,
        enqueueErr,
      );
      throw enqueueErr;
    }

    logger.info(
      `Batch enqueued ${claimed.length} classify jobs for video ${videoId}`,
    );

    return res.status(202).json({
      message: `${claimed.length} comments queued for processing`,
      queued: claimed.length,
    });
  } catch (err) {
    next(err);
  }
}