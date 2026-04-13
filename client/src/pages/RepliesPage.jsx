import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getVideos } from '../api/channel'
import { listReplies, approveReply, rejectReply, editReply, regenerateReply } from '../api/replies'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending_review: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  approved:       { label: 'Approved',   bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  rejected:       { label: 'Rejected',   bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20', dot: 'bg-rose-500' },
  publishing:     { label: 'Publishing', bg: 'bg-sky-500/10',   text: 'text-sky-400',   border: 'border-sky-500/20', dot: 'bg-sky-500' },
  published:      { label: 'Published',  bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', dot: 'bg-indigo-500' },
  failed:         { label: 'Failed',     bg: 'bg-rose-500/10',   text: 'text-rose-600',   border: 'border-rose-500/20', dot: 'bg-rose-600' },
}

const TONE_EMOJI = {
  friendly: '😊', professional: '💼', humorous: '😄', promotional: '📢',
  appreciative: '🙏', informative: 'ℹ️', supportive: '🤝', apologetic: '😔', neutral: '😐',
}

const STATUS_FILTERS = [
  { key: 'all',            label: 'All'      },
  { key: 'pending_review', label: 'Pending'  },
  { key: 'approved',       label: 'Approved' },
  { key: 'rejected',       label: 'Rejected' },
  { key: 'published',      label: 'Published'},
]

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ReplySkeleton() {
  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 animate-pulse">
      <div className="flex justify-between mb-6">
        <div className="flex gap-3">
          <div className="h-5 bg-[#1c2128] rounded-md w-32" />
          <div className="h-5 bg-[#1c2128] rounded-full w-20" />
        </div>
        <div className="h-4 bg-[#1c2128] rounded w-24" />
      </div>
      <div className="space-y-3 mb-6">
        <div className="h-4 bg-[#1c2128] rounded w-full" />
        <div className="h-4 bg-[#1c2128] rounded w-5/6" />
      </div>
      <div className="flex gap-3">
        <div className="h-9 bg-[#1c2128] rounded-lg w-24" />
        <div className="h-9 bg-[#1c2128] rounded-lg w-24" />
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending_review
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full border font-semibold tracking-wide uppercase ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Reply card ────────────────────────────────────────────────────────────────
function ReplyCard({ reply, onUpdate }) {
  const [status,    setStatus]    = useState(reply.status)
  const [editing,   setEditing]   = useState(false)
  const [editText,  setEditText]  = useState(reply.finalText || reply.generatedText || '')
  const [loading,   setLoading]   = useState(null)
  const [error,     setError]     = useState(null)
  const [showFull,  setShowFull]  = useState(false)

  const comment     = reply.commentId
  const displayText = reply.finalText || reply.editedText || reply.generatedText || ''
  const commentText = comment?.textDisplay || comment?.text || ''

  async function handleApprove() {
    setLoading('approve'); setError(null)
    try {
      await approveReply(reply._id)
      setStatus('approved')
      onUpdate(reply._id, 'approved')
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to approve')
    } finally { setLoading(null) }
  }

  async function handleReject() {
    setLoading('reject'); setError(null)
    try {
      await rejectReply(reply._id)
      setStatus('rejected')
      onUpdate(reply._id, 'rejected')
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reject')
    } finally { setLoading(null) }
  }

  async function handleEdit() {
    if (!editText.trim()) return
    setLoading('edit'); setError(null)
    try {
      const res = await editReply(reply._id, editText)
      setEditing(false)
      onUpdate(reply._id, status, res.data?.finalText ?? editText)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save edit')
    } finally { setLoading(null) }
  }

  async function handleRegenerate() {
    setLoading('regen'); setError(null)
    try {
      const res = await regenerateReply(reply._id)
      const newText = res.data?.finalText || res.data?.generatedText || ''
      setEditText(newText)
      setStatus('pending_review')
      onUpdate(reply._id, 'pending_review', newText)
    } catch (e) {
      setError(e.response?.data?.error || 'AI service may be offline')
    } finally { setLoading(null) }
  }

  const isLocked = ['published', 'publishing'].includes(status)

  return (
    <div className={`group bg-[#0d1117] border rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md ${
      status === 'approved'  ? 'border-emerald-500/30'  :
      status === 'rejected'  ? 'border-rose-500/20'    :
      status === 'published' ? 'border-indigo-500/30' :
      'border-[#30363d] hover:border-[#444c56]'
    }`}>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white uppercase">
            {comment?.authorName?.charAt(0) || '?'}
          </div>
          <div className="flex flex-col">
            <span className="text-gray-100 text-sm font-bold leading-tight">
              {comment?.authorName || 'Unknown'}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={status} />
              {reply.tone && (
                <span className="text-[11px] text-[#8b949e] flex items-center gap-1 bg-[#161b22] px-2 py-0.5 rounded-md border border-[#30363d]">
                  {TONE_EMOJI[reply.tone]} {reply.tone}
                </span>
              )}
            </div>
          </div>
        </div>
        <time className="text-[11px] text-[#484f58] font-medium">
          {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>

      {/* Content Stack */}
      <div className="space-y-4">
        {/* Original comment */}
        <div className="relative pl-4 border-l-2 border-[#30363d]">
          <p className="text-[10px] text-[#484f58] font-bold uppercase tracking-widest mb-1">Incoming</p>
          <p className={`text-[#8b949e] text-[13px] leading-relaxed ${!showFull && 'line-clamp-2'}`}>
            {commentText || '—'}
          </p>
          {commentText.length > 120 && (
            <button
              onClick={() => setShowFull(p => !p)}
              className="text-[11px] text-blue-400 hover:text-blue-300 mt-1 font-medium transition-colors"
            >
              {showFull ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Generated reply */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 transition-colors group-hover:bg-[#1c2128]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span className="text-xs">✨</span> AI Response {reply.editedText && <span className="text-[#ff4444] lowercase font-normal">(edited)</span>}
            </p>
          </div>

          {editing ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={4}
                className="w-full bg-[#0d1117] border border-[#ff4444]/40 focus:border-[#ff4444] focus:ring-1 focus:ring-[#ff4444] focus:outline-none rounded-lg px-3 py-2.5 text-sm text-white resize-none transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  disabled={loading === 'edit'}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs bg-[#ff4444] hover:bg-[#ee3333] text-white px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  {loading === 'edit' ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditText(displayText) }}
                  className="flex-1 sm:flex-none text-xs text-[#8b949e] hover:text-white px-4 py-2 rounded-lg border border-[#30363d] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
              {displayText || <span className="text-[#484f58] italic">No reply text</span>}
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
           <p className="text-xs text-rose-400 text-center font-medium">{error}</p>
        </div>
      )}

      {/* Actions */}
      {!isLocked && !editing && (
        <div className="flex items-center gap-2 flex-wrap mt-6 pt-5 border-t border-[#30363d]">
          {status !== 'approved' && (
            <button
              onClick={handleApprove}
              disabled={!!loading}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-all font-bold border border-emerald-500/20 disabled:opacity-40"
            >
              {loading === 'approve' ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Approve'}
            </button>
          )}

          {status !== 'rejected' && (
            <button
              onClick={handleReject}
              disabled={!!loading}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 px-4 py-2 rounded-lg transition-all font-bold border border-rose-500/20 disabled:opacity-40"
            >
              {loading === 'reject' ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Reject'}
            </button>
          )}

          <div className="flex-1 h-px" /> {/* Spacer */}

          <button
            onClick={() => setEditing(true)}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-white bg-[#1c2128] border border-[#30363d] px-4 py-2 rounded-lg transition-all font-bold disabled:opacity-40"
          >
            Edit
          </button>

          <button
            onClick={handleRegenerate}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-white bg-[#1c2128] border border-[#30363d] px-4 py-2 rounded-lg transition-all font-bold disabled:opacity-40"
          >
            {loading === 'regen' ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Regenerate'}
          </button>
        </div>
      )}

      {isLocked && (
        <div className="mt-6 pt-4 border-t border-[#30363d] flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'published' ? 'bg-indigo-500' : 'bg-sky-500'}`} />
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#484f58]">
            {status === 'published' ? 'Synced with YouTube' : 'Syncing to YouTube…'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RepliesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedVideoId = searchParams.get('videoId') || ''

  const [videos,        setVideos]        = useState([])
  const [videosLoading, setVideosLoading] = useState(true)
  const [replies,       setReplies]       = useState([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [statusFilter,  setStatusFilter]  = useState('all')

  useEffect(() => {
    getVideos()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.items ?? data.data ?? [])
        setVideos(list)
        if (!selectedVideoId && list.length > 0) {
          const firstId = list[0].videoId ?? list[0].id
          setSearchParams({ videoId: firstId }, { replace: true })
        }
      })
      .catch(() => {})
      .finally(() => setVideosLoading(false))
  }, [])

  const fetchReplies = useCallback(() => {
    if (!selectedVideoId) return
    setLoading(true)
    setError(null)
    listReplies({ videoId: selectedVideoId })
      .then(data => {
        const list = Array.isArray(data) ? data : (data.items ?? data.data ?? [])
        setReplies(list)
      })
      .catch(err => {
        const msg = err.response?.data?.error || err.response?.data?.message
        setError(msg || 'Failed to load replies')
      })
      .finally(() => setLoading(false))
  }, [selectedVideoId])

  useEffect(() => { fetchReplies() }, [fetchReplies])

  function handleUpdate(id, newStatus, newText) {
    setReplies(prev => prev.map(r =>
      r._id === id
        ? { ...r, status: newStatus ?? r.status, finalText: newText ?? r.finalText }
        : r
    ))
  }

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return replies
    return replies.filter(r => r.status === statusFilter)
  }, [replies, statusFilter])

  const statusCounts = useMemo(() =>
    replies.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  , [replies])

  return (
    <div className="min-h-screen text-gray-300 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Review Center</h1>
            <p className="text-[#8b949e] mt-2 font-medium">
              Manage AI-generated responses for your community.
            </p>
          </div>
          <button
            onClick={fetchReplies}
            disabled={loading || !selectedVideoId}
            className="flex items-center gap-2 text-sm font-bold bg-[#1c2128] text-white border border-[#30363d] hover:bg-[#21262d] px-5 py-2.5 rounded-xl transition-all disabled:opacity-40"
          >
            <span className={`text-lg ${loading ? 'animate-spin' : ''}`}>↻</span>
            Refresh Queue
          </button>
        </header>

        {/* Video Selection Card */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-1 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1">
            <div className="relative flex-1">
              <select
                value={selectedVideoId}
                onChange={e => setSearchParams({ videoId: e.target.value })}
                disabled={videosLoading}
                className="w-full bg-transparent border-none focus:ring-0 px-5 py-4 text-sm text-white font-semibold appearance-none cursor-pointer"
              >
                {videosLoading ? (
                  <option>Loading your videos...</option>
                ) : videos.length === 0 ? (
                  <option value="">No videos available</option>
                ) : (
                  videos.map(v => (
                    <option key={v.videoId ?? v.id} value={v.videoId ?? v.id} className="bg-[#0d1117]">
                      {v.title || 'Untitled Video'}
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#484f58]">
                ▼
              </div>
            </div>
            
            <div className="hidden sm:block w-px h-8 bg-[#30363d]" />

            {selectedVideoId && (
              <button
                onClick={() => navigate(`/videos/${selectedVideoId}`)}
                className="px-6 py-4 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-2"
              >
                View Comments <span>→</span>
              </button>
            )}
          </div>
        </div>

        {!selectedVideoId ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-[#30363d] rounded-3xl">
            <div className="w-16 h-16 bg-[#161b22] rounded-2xl flex items-center justify-center text-3xl mb-4 border border-[#30363d]">📹</div>
            <h3 className="text-white font-bold text-xl">No Video Selected</h3>
            <p className="text-[#8b949e] mt-1">Pick a video from the menu to start moderating.</p>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            {!loading && replies.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {STATUS_FILTERS.map(({ key, label }) => {
                  const count = key === 'all' ? replies.length : (statusCounts[key] || 0)
                  if (key !== 'all' && count === 0) return null
                  const isActive = statusFilter === key
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                        isActive 
                        ? 'bg-[#ff4444] border-[#ff4444] text-white shadow-lg shadow-red-500/20' 
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#444c56]'
                      }`}
                    >
                      {label}
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-black/20' : 'bg-[#1c2128]'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl px-6 py-4 text-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚠️</span>
                  <span className="font-medium">{error}</span>
                </div>
                <button onClick={fetchReplies} className="font-bold hover:underline">Retry</button>
              </div>
            )}

            {/* List Section */}
            <div className="space-y-4">
              {loading ? (
                [...Array(3)].map((_, i) => <ReplySkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-[#0d1117] border border-[#30363d] rounded-3xl text-center px-6">
                  <span className="text-5xl mb-6">🏝️</span>
                  <h3 className="text-white font-bold text-xl">
                    {statusFilter !== 'all' ? `No ${statusFilter.replace('_', ' ')} items` : 'Queue Empty'}
                  </h3>
                  <p className="text-[#8b949e] mt-2 max-w-xs mx-auto">
                    {statusFilter !== 'all' 
                      ? "There's nothing matching this filter right now." 
                      : "Head over to the comments page to generate some AI magic."}
                  </p>
                  {statusFilter === 'all' && (
                    <button
                      onClick={() => navigate(`/videos/${selectedVideoId}`)}
                      className="mt-8 bg-[#ff4444] hover:bg-[#ee3333] text-white text-sm font-black px-8 py-3 rounded-xl transition-all shadow-xl shadow-red-500/20"
                    >
                      Go to Comments
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(reply => (
                  <ReplyCard key={reply._id} reply={reply} onUpdate={handleUpdate} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}