import Comment from '../models/Comment.models.js';
import { enqueueClassifyJob } from '../services/queue.service.js';
import logger from '../utils/logger.js';

export async function enqueueBatch(req, res, next) {
  try {
    const { videoId, commentIds, tone = 'friendly', personaId } = req.body;

    if (!videoId) return res.status(400).json({ error: 'videoId is required' });

    const filter = { videoId, classificationStatus: 'pending' };
    if (commentIds?.length) filter._id = { $in: commentIds };

    const comments = await Comment.find(filter).select('_id ytCommentId text').lean();

    if (!comments.length) {
      return res.json({ message: 'No pending comments to process', queued: 0 });
    }

    const jobs = await Promise.all(
      comments.map((c) =>
        enqueueClassifyJob({
          commentId:   c._id.toString(),
          commentText: c.text,
          videoId,
          tone,
          personaId: personaId || null,
        })
      )
    );

    await Comment.updateMany(
      { _id: { $in: comments.map((c) => c._id) } },
      { classificationStatus: 'processing' }
    );

    logger.info(`Batch enqueued ${jobs.length} classify jobs for video ${videoId}`);

    return res.status(202).json({
      message: `${jobs.length} comments queued for processing`,
      queued:  jobs.length,
      jobIds:  jobs.map((j) => j.id),
    });
  } catch (err) {
    next(err);
  }
}