import Comment from "../models/Comment.models.js";

const VALID_INTENTS = ['question', 'praise', 'criticism', 'spam', 'neutral', 'pending'];
const VALID_SORT    = ['publishedAt', 'likeCount'];

export const listComments = async (req,res,next)=>{
  try {
    const {
      videoId,
      intent,
      status,
      page   = '1',
      limit  = '20',
      sortBy = 'publishedAt',
      order  = 'desc',
    } = req.query;

    if (!videoId) {
      return res.status(400).json({ error: 'videoId query param is required' });
    }

    const filter = { videoId };
    if (intent && VALID_INTENTS.includes(intent)) filter.intent = intent;
    if (status) filter.classificationStatus = status;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;
    const sortKey  = VALID_SORT.includes(sortBy) ? sortBy : 'publishedAt';
    const sortDir  = order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Comment.find(filter)
        .sort({ [sortKey]: sortDir })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Comment.countDocuments(filter),
    ]);

    return res.json({
      items,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export const getComment = async (req,res,next)=>{
  try {
    const comment = await Comment.findById(req.params.id).lean();
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    return res.json({ data: comment });
  } catch (err) {
    next(err);
  }
}

export const updateCommentIntent = async (req,res,next)=>{
  try {
    const { intent } = req.body;
    if (!intent || !VALID_INTENTS.includes(intent)) {
      return res.status(400).json({ error: `intent must be one of: ${VALID_INTENTS.join(', ')}` });
    }

    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { intent, classificationStatus: 'done' },
      { new: true }
    );
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    return res.json({ data: comment });
  } catch (err) {
    next(err);
  }
}