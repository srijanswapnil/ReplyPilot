import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getVideo, getVideoComments } from '../api/channel'
import { classifyComment } from '../api/comments'
import { generateReply } from '../api/replies'

// ── Shared Utilities ──────────────────────────────────────────────────────
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
  question:  { label: 'Question',  bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   dot: 'bg-blue-400'   },
  praise:    { label: 'Praise',    bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  dot: 'bg-green-400'  },
  criticism: { label: 'Criticism', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  spam:      { label: 'Spam',      bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    dot: 'bg-red-400'    },
  neutral:   { label: 'Neutral',   bg: 'bg-gray-500/10',   text: 'text-gray-400',   border: 'border-gray-500/20',   dot: 'bg-gray-400'   },
  pending:   { label: 'Pending',   bg: 'bg-yellow-500/5',  text: 'text-yellow-500', border: 'border-yellow-500/10', dot: 'bg-yellow-500' },
}

function IntentBadge({ intent }) {
  const s = INTENT_STYLES[intent] ?? INTENT_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-widest ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1 h-1 rounded-full shrink-0 ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  )
}

// ── Components ─────────────────────────────────────────────────────────────

function CommentCard({ comment, onClassify, onGenerate, index }) {
  const [classifying, setClassifying] = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [localIntent, setLocalIntent] = useState(comment.intent)
  const [replyText,   setReplyText]   = useState(null)
  const [actionError, setActionError] = useState(null)
  const [avatarError, setAvatarError] = useState(false)

  async function handleClassify() {
    setClassifying(true); setActionError(null)
    try {
      const res = await classifyComment(comment._id)
      const newIntent = res?.data?.intent ?? res?.intent
      if (newIntent) setLocalIntent(newIntent)
      onClassify?.(comment._id, newIntent)
    } catch { setActionError('Classification Failed') }
    finally { setClassifying(false) }
  }

  async function handleGenerate() {
    setGenerating(true); setActionError(null); setReplyText(null)
    try {
      const res = await generateReply(comment._id)
      const text = res?.data?.text ?? res?.text ?? res?.reply?.text
      setReplyText(text || 'Reply generated.')
      onGenerate?.(comment._id)
    } catch { setActionError('AI Generation Failed') }
    finally { setGenerating(false) }
  }

  return (
    <div 
      style={{ animationDelay: `${index * 50}ms` }}
      className="bg-[#161b22]/40 backdrop-blur-sm border border-[#30363d] hover:border-[#ff4444]/30 rounded-2xl p-5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
    >
      <div className="flex gap-4">
        {comment.authorAvatar && !avatarError ? (
          <img
            src={comment.authorAvatar}
            alt="Avatar"
            onError={() => setAvatarError(true)}
            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#30363d] shadow-sm"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff4444] to-[#800000] flex items-center justify-center text-sm font-black text-white shrink-0">
            {comment.authorName?.[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2">
                <span className="text-white text-sm font-bold tracking-tight">{comment.authorName}</span>
                <span className="text-[#484f58] text-[10px] font-bold uppercase tracking-tighter">{timeAgo(comment.publishedAt)}</span>
            </div>
            <IntentBadge intent={localIntent} />
          </div>

          <p className="text-[#8b949e] text-sm leading-relaxed mb-4">{comment.textDisplay || comment.text}</p>

          {replyText && (
            <div className="mb-4 p-4 bg-[#ff4444]/5 border border-[#ff4444]/10 rounded-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#ff4444]" />
              <p className="text-[10px] text-[#ff4444] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <span className="animate-pulse">✨</span> AI Suggested Reply
              </p>
              <p className="text-white/90 text-sm leading-relaxed italic">"{replyText}"</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#30363d]/50">
            <div className="flex items-center gap-1.5 text-[#484f58] text-xs font-bold">
               {comment.likeCount > 0 && <span>👍 {fmt(comment.likeCount)}</span>}
            </div>
            
            <div className="flex items-center gap-2">
                <button
                  onClick={handleClassify}
                  disabled={classifying || generating}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-[#30363d] hover:bg-white/10 text-[#8b949e] hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  {classifying ? 'Wait...' : 'Analyze'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || classifying}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#ff4444] hover:bg-[#ff6666] text-white shadow-lg shadow-[#ff4444]/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {generating ? 'Drafting...' : 'Generate Reply'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VideoInfoBar({ video }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff4444]/5 blur-3xl pointer-events-none" />
      
      <img
        src={video.thumbnail?.high || video.thumbnails?.high?.url}
        alt="Thumb"
        className="w-full md:w-64 aspect-video object-cover rounded-2xl border border-[#30363d]"
      />
      
      <div className="flex-1 text-center md:text-left">
        <h2 className="text-white font-black text-xl leading-tight tracking-tight mb-2">{video.title}</h2>
        <div className="flex items-center justify-center md:justify-start gap-4 text-[10px] font-black uppercase tracking-[0.15em] text-[#8b949e]">
          <span className="flex items-center gap-1.5"><span className="text-[#ff4444]">👁</span> {fmt(video.viewCount)}</span>
          <span className="flex items-center gap-1.5"><span className="text-[#ff4444]">💬</span> {fmt(video.commentCount)}</span>
          <span className="flex items-center gap-1.5"><span className="text-[#ff4444]">👍</span> {fmt(video.likeCount)}</span>
        </div>
      </div>
    </div>
  )
}

export default function VideoDetailPage() {
  const { videoId } = useParams(); const navigate = useNavigate()
  const [video, setVideo] = useState(null); const [videoLoading, setVideoLoading] = useState(true)
  const [comments, setComments] = useState([]); const [commentsLoading, setCommentsLoading] = useState(true)
  const [intentFilter, setIntentFilter] = useState('all'); const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    getVideo(videoId).then(setVideo).finally(() => setVideoLoading(false))
  }, [videoId])

  const fetchComments = useCallback((force = false) => {
    force ? setSyncing(true) : setCommentsLoading(true)
    getVideoComments(videoId, force ? { sync: 'true' } : {})
      .then(data => setComments((Array.isArray(data) ? data : (data.items ?? data.data ?? [])).filter(c => !c.isReply)))
      .finally(() => { setCommentsLoading(false); setSyncing(false) })
  }, [videoId])

  useEffect(() => { fetchComments() }, [fetchComments])

  const filtered = intentFilter === 'all' ? comments : comments.filter(c => c.intent === intentFilter)
  const intentCounts = comments.reduce((acc, c) => { acc[c.intent] = (acc[c.intent] || 0) + 1; return acc }, {})

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">
      
      <button onClick={() => navigate('/videos')} className="group flex items-center gap-2 text-[#8b949e] hover:text-[#ff4444] text-xs font-black uppercase tracking-widest transition-all">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Library
      </button>

      {videoLoading ? <div className="h-40 bg-[#161b22] rounded-3xl animate-pulse" /> : video && <VideoInfoBar video={video} />}

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[#30363d]/50 pb-4">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Audience <span className="text-[#ff4444]">Feedback</span>
            <span className="ml-3 text-xs text-[#484f58] font-bold">[{filtered.length} visible]</span>
          </h1>
          <button onClick={() => fetchComments(true)} disabled={syncing} className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] hover:text-white flex items-center gap-2">
            <span className={syncing ? 'animate-spin' : ''}>↻</span> {syncing ? 'Syncing' : 'Refresh'}
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'question', 'praise', 'criticism', 'spam'].map(key => {
            const count = key === 'all' ? comments.length : (intentCounts[key] || 0)
            if (key !== 'all' && count === 0) return null
            return (
              <button key={key} onClick={() => setIntentFilter(key)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${intentFilter === key ? 'bg-[#ff4444] border-[#ff4444] text-white shadow-lg shadow-[#ff4444]/20' : 'bg-[#161b22]/80 border-[#30363d] text-[#8b949e] hover:border-white/20 hover:text-white'}`}>
                {key} <span className="ml-1 opacity-50">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-4">
          {commentsLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-[#161b22]/50 rounded-2xl animate-pulse" />) :
            filtered.length === 0 ? (
              <div className="text-center py-20 bg-[#161b22]/20 rounded-3xl border border-dashed border-[#30363d]">
                <p className="text-[#484f58] font-black uppercase tracking-[0.2em]">No Comments in this Category</p>
              </div>
            ) : filtered.map((c, idx) => <CommentCard key={c._id} index={idx} comment={c} onClassify={(id, intent) => setComments(prev => prev.map(item => item._id === id ? { ...item, intent } : item))} />)
          }
        </div>
      </div>
    </div>
  )
}