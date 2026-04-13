import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getVideos } from '../api/channel'
import { listReplies, approveReply, rejectReply, editReply, regenerateReply } from '../api/replies'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending_review: { label: 'Pending Review', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  approved:       { label: 'Approved',        bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20'  },
  rejected:       { label: 'Rejected',        bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20'    },
  publishing:     { label: 'Publishing…',     bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20'   },
  published:      { label: 'Published',       bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  failed:         { label: 'Failed',          bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/20'    },
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
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="h-3 bg-[#1c2128] rounded w-1/4" />
        <div className="h-3 bg-[#1c2128] rounded w-16" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-[#1c2128] rounded w-full" />
        <div className="h-3 bg-[#1c2128] rounded w-3/4" />
      </div>
      <div className="h-px bg-[#30363d] my-4" />
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-[#1c2128] rounded w-full" />
        <div className="h-3 bg-[#1c2128] rounded w-2/3" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-[#1c2128] rounded w-20" />
        <div className="h-8 bg-[#1c2128] rounded w-20" />
        <div className="h-8 bg-[#1c2128] rounded w-24" />
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending_review
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  )
}

// ── Reply card ────────────────────────────────────────────────────────────────
function ReplyCard({ reply, onUpdate }) {
  const [status,    setStatus]    = useState(reply.status)
  const [editing,   setEditing]   = useState(false)
  const [editText,  setEditText]  = useState(reply.finalText || reply.generatedText || '')
  const [loading,   setLoading]   = useState(null) // 'approve'|'reject'|'edit'|'regen'
  const [error,     setError]     = useState(null)
  const [showFull,  setShowFull]  = useState(false)

  const comment     = reply.commentId   // populated object
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
    <div className={`bg-[#161b22] border rounded-xl p-5 transition-all ${
      status === 'approved'  ? 'border-green-500/30'  :
      status === 'rejected'  ? 'border-red-500/20'   :
      status === 'published' ? 'border-purple-500/30' :
      'border-[#30363d]'
    }`}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white text-sm font-semibold">
            {comment?.authorName || 'Unknown'}
          </span>
          <StatusBadge status={status} />
          {reply.tone && (
            <span className="text-xs text-[#484f58]">
              {TONE_EMOJI[reply.tone] || ''} {reply.tone}
            </span>
          )}
        </div>
        <span className="text-xs text-[#484f58]">
          {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Original comment */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 mb-4">
        <p className="text-xs text-[#484f58] font-medium uppercase tracking-wide mb-1.5">Original Comment</p>
        <p className={`text-[#8b949e] text-sm leading-relaxed ${!showFull && 'line-clamp-2'}`}>
          {commentText || '—'}
        </p>
        {commentText.length > 120 && (
          <button
            onClick={() => setShowFull(p => !p)}
            className="text-xs text-[#484f58] hover:text-[#8b949e] mt-1 transition-colors"
          >
            {showFull ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Generated reply */}
      <div className="mb-4">
        <p className="text-xs text-[#484f58] font-medium uppercase tracking-wide mb-1.5">
          ✨ AI Reply {reply.editedText ? <span className="text-[#ff4444] normal-case">(edited)</span> : ''}
        </p>

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={4}
              className="w-full bg-[#0d1117] border border-[#ff4444]/40 focus:border-[#ff4444] focus:outline-none rounded-lg px-3 py-2.5 text-sm text-white resize-none transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={loading === 'edit'}
                className="flex items-center gap-1.5 text-xs bg-[#ff4444] hover:bg-[#ff2222] text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading === 'edit'
                  ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : '💾 Save'
                }
              </button>
              <button
                onClick={() => { setEditing(false); setEditText(displayText) }}
                className="text-xs text-[#8b949e] hover:text-white px-3 py-1.5 rounded-lg border border-[#30363d] hover:border-[#555] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-white text-sm leading-relaxed bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3">
            {displayText || <span className="text-[#484f58] italic">No reply text</span>}
          </p>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {/* Actions */}
      {!isLocked && !editing && (
        <div className="flex items-center gap-2 flex-wrap">
          {status !== 'approved' && (
            <button
              id={`approve-${reply._id}`}
              onClick={handleApprove}
              disabled={!!loading}
              className="flex items-center gap-1.5 text-xs text-green-400 hover:text-white bg-green-500/10 hover:bg-green-500 border border-green-500/30 hover:border-green-500 px-3 py-1.5 rounded-lg transition-all font-medium disabled:opacity-40"
            >
              {loading === 'approve'
                ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Approving…</>
                : '✅ Approve'
              }
            </button>
          )}

          {status !== 'rejected' && (
            <button
              id={`reject-${reply._id}`}
              onClick={handleReject}
              disabled={!!loading}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/30 hover:border-red-500 px-3 py-1.5 rounded-lg transition-all font-medium disabled:opacity-40"
            >
              {loading === 'reject'
                ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Rejecting…</>
                : '❌ Reject'
              }
            </button>
          )}

          <button
            id={`edit-${reply._id}`}
            onClick={() => setEditing(true)}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-white bg-[#1c2128] hover:bg-[#252b34] border border-[#30363d] hover:border-[#555] px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40"
          >
            ✏️ Edit
          </button>

          <button
            id={`regen-${reply._id}`}
            onClick={handleRegenerate}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-white bg-[#1c2128] hover:bg-[#252b34] border border-[#30363d] hover:border-[#555] px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40"
          >
            {loading === 'regen'
              ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Generating…</>
              : '🔄 Regenerate'
            }
          </button>
        </div>
      )}

      {isLocked && (
        <p className="text-xs text-[#484f58]">
          {status === 'published' ? '✅ Posted to YouTube' : '⏳ Publishing to YouTube…'}
        </p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RepliesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedVideoId = searchParams.get('videoId') || ''

  const [videos,       setVideos]       = useState([])
  const [videosLoading,setVideosLoading]= useState(true)
  const [replies,      setReplies]      = useState([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  // Load video list for the dropdown
  useEffect(() => {
    getVideos()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.items ?? data.data ?? [])
        setVideos(list)
        // Auto-select first video if none selected
        if (!selectedVideoId && list.length > 0) {
          const firstId = list[0].videoId ?? list[0].id
          setSearchParams({ videoId: firstId }, { replace: true })
        }
      })
      .catch(() => {})
      .finally(() => setVideosLoading(false))
  }, [])

  // Load replies when video changes
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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Replies</h1>
          <p className="text-[#8b949e] text-sm mt-0.5">
            Review, edit and approve AI-generated replies
          </p>
        </div>
        <button
          onClick={fetchReplies}
          disabled={loading || !selectedVideoId}
          className="flex items-center gap-2 text-sm text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#555] px-4 py-2 rounded-lg transition-colors disabled:opacity-40 shrink-0"
        >
          <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
          Refresh
        </button>
      </div>

      {/* ── Video selector ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs text-[#8b949e] font-medium mb-1.5">Select Video</label>
          <select
            id="video-select"
            value={selectedVideoId}
            onChange={e => setSearchParams({ videoId: e.target.value })}
            disabled={videosLoading}
            className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#ff4444]/60 focus:outline-none rounded-lg px-4 py-2.5 text-sm text-white transition-colors appearance-none cursor-pointer"
          >
            {videosLoading ? (
              <option>Loading videos…</option>
            ) : videos.length === 0 ? (
              <option value="">No videos found</option>
            ) : (
              videos.map(v => (
                <option key={v.videoId ?? v.id} value={v.videoId ?? v.id}>
                  {v.title || 'Untitled'}
                </option>
              ))
            )}
          </select>
        </div>

        {selectedVideoId && (
          <div className="flex items-end">
            <button
              onClick={() => navigate(`/videos/${selectedVideoId}`)}
              className="flex items-center gap-2 text-sm text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#555] px-4 py-2.5 rounded-lg transition-colors"
            >
              💬 View Comments
            </button>
          </div>
        )}
      </div>

      {!selectedVideoId ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">📋</span>
          <p className="text-white font-semibold text-lg">Select a video to see its replies</p>
          <p className="text-[#8b949e] text-sm mt-1">Choose a video from the dropdown above</p>
        </div>
      ) : (
        <>
          {/* ── Status filter tabs ── */}
          {!loading && replies.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_FILTERS.map(({ key, label }) => {
                const count = key === 'all' ? replies.length : (statusCounts[key] || 0)
                if (key !== 'all' && count === 0) return null
                return (
                  <button
                    key={key}
                    id={`status-${key}`}
                    onClick={() => setStatusFilter(key)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      statusFilter === key
                        ? 'bg-[#ff4444] border-[#ff4444] text-white'
                        : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#555]'
                    }`}
                  >
                    {label}
                    <span className={`text-[10px] px-1 rounded-full ${statusFilter === key ? 'bg-white/20' : 'bg-[#1c2128]'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-5 py-4 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={fetchReplies} className="text-xs underline hover:no-underline ml-4">Retry</button>
            </div>
          )}

          {/* ── List ── */}
          {loading ? (
            <div className="flex flex-col gap-4">
              {[...Array(3)].map((_, i) => <ReplySkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4">✨</span>
              <p className="text-white font-semibold text-lg">
                {statusFilter !== 'all' ? `No ${statusFilter.replace('_', ' ')} replies` : 'No replies yet'}
              </p>
              <p className="text-[#8b949e] text-sm mt-1">
                {statusFilter !== 'all'
                  ? 'Try a different filter'
                  : 'Go to the Comments page and click "Generate Reply" on a comment'}
              </p>
              {statusFilter !== 'all' ? (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="mt-4 text-sm text-[#ff4444] hover:underline"
                >
                  Clear filter
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/videos/${selectedVideoId}`)}
                  className="mt-5 flex items-center gap-2 bg-[#ff4444] hover:bg-[#ff2222] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  💬 Go to Comments
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map(reply => (
                <ReplyCard
                  key={reply._id}
                  reply={reply}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
