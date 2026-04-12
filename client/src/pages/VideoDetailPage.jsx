import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getVideo, getVideoComments } from '../api/channel'
import { classifyComment } from '../api/comments'
import { generateReply } from '../api/replies'

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1)   return 'Today'
  if (days < 7)   return `${days}d ago`
  if (days < 30)  return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const INTENT_STYLES = {
  question:  { label: 'Question',  bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30',   dot: 'bg-blue-400'   },
  praise:    { label: 'Praise',    bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/30',  dot: 'bg-green-400'  },
  criticism: { label: 'Criticism', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  spam:      { label: 'Spam',      bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    dot: 'bg-red-400'    },
  neutral:   { label: 'Neutral',   bg: 'bg-gray-500/15',   text: 'text-gray-400',   border: 'border-gray-500/30',   dot: 'bg-gray-400'   },
  pending:   { label: 'Pending',   bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
}

function IntentBadge({ intent }) {
  const s = INTENT_STYLES[intent] ?? INTENT_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  )
}

const INTENT_FILTERS = [
  { key: 'all',       label: 'All'      },
  { key: 'pending',   label: 'Pending'  },
  { key: 'question',  label: 'Question' },
  { key: 'praise',    label: 'Praise'   },
  { key: 'criticism', label: 'Criticism'},
  { key: 'spam',      label: 'Spam'     },
  { key: 'neutral',   label: 'Neutral'  },
]

function VideoInfoSkeleton() {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 animate-pulse flex gap-4">
      <div className="w-40 h-24 bg-[#1c2128] rounded-lg shrink-0" />
      <div className="flex-1 flex flex-col gap-2 py-1">
        <div className="h-5 bg-[#1c2128] rounded w-3/4" />
        <div className="h-3 bg-[#1c2128] rounded w-1/3" />
        <div className="flex gap-3 mt-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-3 bg-[#1c2128] rounded w-16" />)}
        </div>
      </div>
    </div>
  )
}

function CommentSkeleton() {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 animate-pulse flex gap-3">
      <div className="w-9 h-9 bg-[#1c2128] rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 bg-[#1c2128] rounded w-1/4" />
        <div className="h-4 bg-[#1c2128] rounded w-full" />
        <div className="h-4 bg-[#1c2128] rounded w-3/4" />
        <div className="flex gap-2 mt-1">
          <div className="h-6 bg-[#1c2128] rounded w-20" />
          <div className="h-6 bg-[#1c2128] rounded w-24" />
        </div>
      </div>
    </div>
  )
}
function CommentCard({ comment, onClassify, onGenerate }) {
  const [classifying, setClassifying] = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [localIntent, setLocalIntent] = useState(comment.intent)
  const [replyText,   setReplyText]   = useState(null)
  const [actionError, setActionError] = useState(null)

  async function handleClassify() {
    setClassifying(true)
    setActionError(null)
    try {
      const res = await classifyComment(comment._id)
      const newIntent = res?.data?.intent ?? res?.intent
      if (newIntent) setLocalIntent(newIntent)
      onClassify?.(comment._id, newIntent)
    } catch {
      setActionError('Classify failed')
    } finally {
      setClassifying(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setActionError(null)
    setReplyText(null)
    try {
      const res = await generateReply(comment._id)
      const text = res?.data?.text ?? res?.text ?? res?.reply?.text
      setReplyText(text || 'Reply generated — view in Replies page')
      onGenerate?.(comment._id)
    } catch {
      setActionError('Failed to generate reply')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] hover:border-[#3d4450] rounded-xl p-4 transition-colors">
      <div className="flex gap-3">

        {comment.authorAvatar ? (
          <img
            src={comment.authorAvatar}
            alt={comment.authorName}
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#30363d]"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#ff4444]/15 flex items-center justify-center text-sm font-bold text-[#ff4444] shrink-0">
            {comment.authorName?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-white text-sm font-semibold truncate">
              {comment.authorName || 'Anonymous'}
            </span>
            <span className="text-[#484f58] text-xs">{timeAgo(comment.publishedAt)}</span>
            <IntentBadge intent={localIntent} />
            {comment.likeCount > 0 && (
              <span className="text-xs text-[#484f58]">👍 {fmt(comment.likeCount)}</span>
            )}
          </div>

          <p className="text-[#8b949e] text-sm leading-relaxed">
            {comment.textDisplay || comment.text}
          </p>

          {replyText && (
            <div className="mt-3 p-3 bg-[#ff4444]/5 border border-[#ff4444]/20 rounded-lg">
              <p className="text-xs text-[#ff4444] font-semibold mb-1">✨ Generated Reply</p>
              <p className="text-[#8b949e] text-sm leading-relaxed">{replyText}</p>
            </div>
          )}

          {actionError && (
            <p className="mt-2 text-xs text-red-400">{actionError}</p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              id={`classify-${comment._id}`}
              onClick={handleClassify}
              disabled={classifying || generating}
              className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-white bg-[#1c2128] hover:bg-[#252b34] border border-[#30363d] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              {classifying
                ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Classifying…</>
                : <>🏷️ Classify Intent</>
              }
            </button>

            <button
              id={`generate-${comment._id}`}
              onClick={handleGenerate}
              disabled={generating || classifying}
              className="flex items-center gap-1.5 text-xs text-[#ff4444] hover:text-white bg-[#ff4444]/10 hover:bg-[#ff4444] border border-[#ff4444]/30 hover:border-[#ff4444] px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
            >
              {generating
                ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Generating…</>
                : <>✨ Generate Reply</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VideoInfoBar({ video }) {
  const thumb =
    video.thumbnail?.high   || video.thumbnail?.medium  ||
    video.thumbnail?.default|| video.thumbnails?.high?.url ||
    null

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex gap-4 items-start">
      {thumb && (
        <img
          src={thumb}
          alt={video.title}
          className="w-40 h-24 object-cover rounded-lg shrink-0 border border-[#30363d]"
        />
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-white font-bold text-base line-clamp-2 leading-snug">{video.title}</h2>
        <p className="text-[#484f58] text-xs mt-1">{timeAgo(video.publishedAt)}</p>
        <div className="flex items-center gap-5 mt-3 text-sm text-[#8b949e]">
          <span>👁️ {fmt(video.viewCount)}</span>
          <span>💬 {fmt(video.commentCount)}</span>
          <span>👍 {fmt(video.likeCount)}</span>
        </div>
      </div>
    </div>
  )
}

export default function VideoDetailPage() {
  const { videoId } = useParams()
  const navigate    = useNavigate()

  const [video,           setVideo]           = useState(null)
  const [videoLoading,    setVideoLoading]    = useState(true)
  const [comments,        setComments]        = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError,   setCommentsError]   = useState(null)
  const [syncing,         setSyncing]         = useState(false)
  const [intentFilter,    setIntentFilter]    = useState('all')

  useEffect(() => {
    getVideo(videoId)
      .then(setVideo)
      .catch(() => {})
      .finally(() => setVideoLoading(false))
  }, [videoId])

  const fetchComments = useCallback((force = false) => {
    force ? setSyncing(true) : setCommentsLoading(true)
    setCommentsError(null)
    getVideoComments(videoId, force ? { sync: 'true' } : {})
      .then(data => {
        const list = Array.isArray(data) ? data : (data.items ?? data.data ?? [])
        // Only top-level comments (not replies to replies)
        setComments(list.filter(c => !c.isReply))
      })
      .catch(err => {
        const msg = err.response?.data?.message || err.response?.data?.error
        setCommentsError(msg || 'Failed to load comments')
      })
      .finally(() => { setCommentsLoading(false); setSyncing(false) })
  }, [videoId])

  useEffect(() => { fetchComments() }, [fetchComments])

  // Filter by intent
  const filtered = intentFilter === 'all'
    ? comments
    : comments.filter(c => c.intent === intentFilter)

  const intentCounts = comments.reduce((acc, c) => {
    acc[c.intent] = (acc[c.intent] || 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">

      {/* ── Back button ── */}
      <button
        onClick={() => navigate('/videos')}
        className="flex items-center gap-2 text-[#8b949e] hover:text-white text-sm transition-colors w-fit"
      >
        ← Back to Videos
      </button>

      {/* ── Video info ── */}
      {videoLoading ? <VideoInfoSkeleton /> : video ? <VideoInfoBar video={video} /> : null}

      {/* ── Comments header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">
            Comments
            {!commentsLoading && (
              <span className="ml-2 text-[#8b949e] text-base font-normal">
                ({filtered.length}{intentFilter !== 'all' ? ` of ${comments.length}` : ''})
              </span>
            )}
          </h1>
        </div>

        <button
          id="sync-comments-btn"
          onClick={() => fetchComments(true)}
          disabled={syncing || commentsLoading}
          className="flex items-center gap-2 text-sm text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#555] px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
          {syncing ? 'Syncing…' : 'Sync Comments'}
        </button>
      </div>

      {/* ── Intent filter pills ── */}
      {!commentsLoading && comments.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {INTENT_FILTERS.map(({ key, label }) => {
            const count = key === 'all' ? comments.length : (intentCounts[key] || 0)
            if (key !== 'all' && count === 0) return null
            return (
              <button
                key={key}
                id={`filter-${key}`}
                onClick={() => setIntentFilter(key)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  intentFilter === key
                    ? 'bg-[#ff4444] border-[#ff4444] text-white'
                    : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#555]'
                }`}
              >
                {label}
                <span className={`text-[10px] px-1 rounded-full ${intentFilter === key ? 'bg-white/20' : 'bg-[#1c2128]'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Error ── */}
      {commentsError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-5 py-4 text-sm flex items-center justify-between">
          <span>{commentsError}</span>
          <button
            onClick={() => fetchComments(true)}
            className="text-xs underline hover:no-underline ml-4 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Comments list ── */}
      {commentsLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => <CommentSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">💬</span>
          <p className="text-white font-semibold text-lg">
            {intentFilter !== 'all' ? `No ${intentFilter} comments` : 'No comments yet'}
          </p>
          <p className="text-[#8b949e] text-sm mt-1">
            {intentFilter !== 'all'
              ? 'Try a different filter'
              : 'Click "Sync Comments" to load comments from YouTube'}
          </p>
          {intentFilter !== 'all' ? (
            <button
              onClick={() => setIntentFilter('all')}
              className="mt-4 text-sm text-[#ff4444] hover:underline"
            >
              Clear filter
            </button>
          ) : (
            <button
              onClick={() => fetchComments(true)}
              disabled={syncing}
              className="mt-5 flex items-center gap-2 bg-[#ff4444] hover:bg-[#ff2222] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
              {syncing ? 'Syncing…' : 'Sync Comments'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(comment => (
            <CommentCard
              key={comment._id}
              comment={comment}
              onClassify={(id, intent) => {
                setComments(prev =>
                  prev.map(c => c._id === id ? { ...c, intent: intent ?? c.intent } : c)
                )
              }}
              onGenerate={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}
