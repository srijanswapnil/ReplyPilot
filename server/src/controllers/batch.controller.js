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

   /* ── 2. Identify pending comments to claim ───────────────────── */
    const pendingFilter = { videoId, classificationStatus: 'pending' };
    if (commentIds?.length) pendingFilter._id = { $in: commentIds };

    const toClaim = await Comment.find(pendingFilter).select('_id').lean();

    if (toClaim.length === 0) {
      return res.json({ message: 'No pending comments to process', queued: 0 });
    }

    const claimIds = toClaim.map((c) => c._id);

    /* ── 3. Atomic claim by specific IDs ──────────────────────────── */
    await Comment.updateMany(
      { _id: { $in: claimIds }, classificationStatus: 'pending' },
      { $set: { classificationStatus: 'processing' } },
    );

    /* ── 4. Read back only the IDs we intended to claim ───────────── */
    const claimed = await Comment.find({
      _id: { $in: claimIds },
      classificationStatus: 'processing',
    })
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
          opts: { jobId: `classify:${c._id.toString()}` },
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

export async function getBatchStatus(req, res, next) {
  try {
    const status = await getJobStatus(req.params.jobId);
    if (!status) return res.status(404).json({ error: 'Job not found' });
    return res.json({ data: status });
  } catch (err) {
    next(err);
  }
}