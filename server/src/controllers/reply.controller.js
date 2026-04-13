import Comment from '../models/Comment.models.js';
import Reply from '../models/Reply.models.js';
import Video from '../models/Video.models.js';
import Persona from '../models/Persona.models.js';
import { generateReply } from '../services/replyService.js';
import { enqueueGenerateJob } from '../services/queue.service.js';
import logger from '../utils/logger.js';

const VALID_TONES = [
  'friendly', 'professional', 'humorous', 'promotional',
  'appreciative', 'informative', 'supportive', 'apologetic', 'neutral',
];

// ─── Generate a reply for a single comment ──────────────────────────────────

export async function generateSingleReply(req, res, next) {
  try {
    const { id } = req.params; // comment MongoDB _id
    const { tone = 'friendly', personaId } = req.body || {};

    // Validate tone
    if (!VALID_TONES.includes(tone)) {
      return res.status(400).json({ error: `tone must be one of: ${VALID_TONES.join(', ')}` });
    }

    // 1. Fetch the comment
    const comment = await Comment.findById(id).lean();
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // 2. Check if comment is classified — don't generate for spam or unclassified
    if (comment.intent === 'spam') {
      return res.status(400).json({ error: 'Cannot generate reply for spam comments' });
    }
    if (comment.classificationStatus !== 'done') {
      return res.status(400).json({ error: 'Comment must be classified before generating a reply' });
    }

    // 3. Build video context from the Video model
    let videoContext = '';
    const video = await Video.findOne({ videoId: comment.videoId }).lean();
    if (video) {
      videoContext = `Title: ${video.title || 'N/A'}. Description: ${(video.description || '').slice(0, 500)}`;
    }

    // 4. Call the FastAPI generate endpoint
    const aiResult = await generateReply({
      commentId: id,
      commentText: comment.textDisplay || comment.text,
      tone,
      personaId: personaId || null,
      videoContext,
    });

    // 5. Save to MongoDB Reply collection
    const reply = await Reply.findOneAndUpdate(
      { commentId: id },
      {
        commentId: id,
        ytCommentId: comment.ytCommentId,
        personaId: personaId || undefined,
        generatedText: aiResult.reply_text,
        tone: aiResult.tone,
        status: 'pending_review',
      },
      { upsert: true, new: true }
    );

    logger.info(`Reply generated for comment ${id} (tone: ${tone})`);

    return res.status(201).json({
      message: 'Reply generated successfully',
      data: reply,
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI Service (FastAPI) is offline' });
    }
    next(err);
  }
}

// ─── List all replies for a video ───────────────────────────────────────────

export async function listReplies(req, res, next) {
  try {
    const {
      videoId,
      status,
      page = '1',
      limit = '20',
    } = req.query;

    if (!videoId) {
      return res.status(400).json({ error: 'videoId query param is required' });
    }

    // Get all comment IDs for this video
    const commentIds = await Comment.find({ videoId }).distinct('_id');

    const filter = { commentId: { $in: commentIds } };
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Reply.find(filter)
        .populate('commentId', 'text textDisplay authorName intent')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reply.countDocuments(filter),
    ]);

    return res.json({
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get a single reply by comment ID ───────────────────────────────────────

export async function getReply(req, res, next) {
  try {
    const reply = await Reply.findOne({ commentId: req.params.id })
      .populate('commentId', 'text textDisplay authorName intent')
      .lean();
    if (!reply) return res.status(404).json({ error: 'Reply not found for this comment' });
    return res.json({ data: reply });
  } catch (err) {
    next(err);
  }
}

// ─── Edit a generated reply before publishing ───────────────────────────────

export async function editReply(req, res, next) {
  try {
    const { editedText } = req.body;
    if (!editedText || !editedText.trim()) {
      return res.status(400).json({ error: 'editedText is required' });
    }

    const reply = await Reply.findById(req.params.replyId);
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    reply.editedText = editedText.trim();
    reply.finalText = editedText.trim();
    await reply.save();

    return res.json({ message: 'Reply updated', data: reply });
  } catch (err) {
    next(err);
  }
}

// ─── Approve a reply (marks it ready for publishing) ────────────────────────

export async function approveReply(req, res, next) {
  try {
    const reply = await Reply.findById(req.params.replyId);
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    reply.status = 'approved';
    if (!reply.finalText) {
      reply.finalText = reply.editedText || reply.generatedText;
    }
    await reply.save();

    return res.json({ message: 'Reply approved', data: reply });
  } catch (err) {
    next(err);
  }
}

// ─── Reject a reply ─────────────────────────────────────────────────────────

export async function rejectReply(req, res, next) {
  try {
    const reply = await Reply.findByIdAndUpdate(
      req.params.replyId,
      { status: 'rejected' },
      { new: true }
    );
    if (!reply) return res.status(404).json({ error: 'Reply not found' });
    return res.json({ message: 'Reply rejected', data: reply });
  } catch (err) {
    next(err);
  }
}

// ─── Regenerate: create a new reply for the same comment ────────────────────

export async function regenerateReply(req, res, next) {
  try {
    const reply = await Reply.findById(req.params.replyId);
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const { tone = reply.tone } = req.body;

    const comment = await Comment.findById(reply.commentId).lean();
    if (!comment) return res.status(404).json({ error: 'Original comment not found' });

    let videoContext = '';
    const video = await Video.findOne({ videoId: comment.videoId }).lean();
    if (video) {
      videoContext = `Title: ${video.title || 'N/A'}. Description: ${(video.description || '').slice(0, 500)}`;
    }

    const aiResult = await generateReply({
      commentId: reply.commentId.toString(),
      commentText: comment.textDisplay || comment.text,
      tone,
      personaId: reply.personaId?.toString() || null,
      videoContext,
    });

    reply.generatedText = aiResult.reply_text;
    reply.editedText = undefined;
    reply.finalText = aiResult.reply_text;
    reply.tone = aiResult.tone;
    reply.status = 'pending_review';
    await reply.save();

    logger.info(`Reply regenerated for comment ${reply.commentId} (tone: ${tone})`);
    return res.json({ message: 'Reply regenerated', data: reply });
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI Service (FastAPI) is offline' });
    }
    next(err);
  }
}
