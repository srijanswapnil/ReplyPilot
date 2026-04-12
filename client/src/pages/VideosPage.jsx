import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVideos } from '../api/channel'

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

function SkeletonCard() {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-[#1c2128]" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-4 bg-[#1c2128] rounded w-3/4" />
        <div className="h-3 bg-[#1c2128] rounded w-1/2" />
        <div className="flex gap-3 mt-2">
          <div className="h-3 bg-[#1c2128] rounded w-16" />
          <div className="h-3 bg-[#1c2128] rounded w-16" />
        </div>
      </div>
    </div>
  )
}
function VideoCard({ video, onClick }) {
  const thumb =
    video.thumbnail?.maxres   || video.thumbnails?.maxres?.url  ||
    video.thumbnail?.high     || video.thumbnails?.high?.url    ||
    video.thumbnail?.medium   || video.thumbnails?.medium?.url  ||
    video.thumbnail?.default  || video.thumbnails?.default?.url ||
    null

  return (
    <button
      onClick={onClick}
      className="group bg-[#161b22] border border-[#30363d] hover:border-[#ff4444]/40 rounded-xl overflow-hidden text-left transition-all duration-200 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
    >
      
      <div className="relative aspect-video bg-[#0d1117] overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-[#30363d]">
            🎬
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {video.duration}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-white text-sm font-semibold line-clamp-2 leading-snug group-hover:text-[#ff4444] transition-colors">
          {video.title || 'Untitled'}
        </p>
        <p className="text-[#484f58] text-xs mt-1">{timeAgo(video.publishedAt)}</p>

        <div className="flex items-center gap-4 mt-3 text-xs text-[#8b949e]">
          <span className="flex items-center gap-1">
            <span>👁️</span>
            {fmt(video.viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <span>💬</span>
            {fmt(video.commentCount)}
          </span>
          {video.likeCount != null && (
            <span className="flex items-center gap-1">
              <span>👍</span>
              {fmt(video.likeCount)}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1 text-[#8b949e] group-hover:text-[#ff4444] text-xs font-medium transition-colors">
          <span>View comments</span>
          <span className="translate-x-0 group-hover:translate-x-0.5 transition-transform">→</span>
        </div>
      </div>
    </button>
  )
}

export default function VideosPage() {
  const navigate = useNavigate()

  const [videos, setVideos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState('date') 
  const [syncing, setSyncing] = useState(false)

  function fetchVideos(force = false) {
    force ? setSyncing(true) : setLoading(true)
    setError(null)
    getVideos(force ? { sync: 'true' } : {})
      .then(data => {
        const list = Array.isArray(data)
          ? data
          : (data.items ?? data.data ?? data.videos ?? [])
        setVideos(list)
      })
      .catch(err => {
        const msg = err.response?.data?.message || err.response?.data?.error
        setError(msg || 'Failed to load videos. Make sure your channel is linked.')
      })
      .finally(() => { setLoading(false); setSyncing(false) })
  }

  useEffect(() => { fetchVideos() }, [])

  const filtered = useMemo(() => {
    let list = [...videos]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v => v.title?.toLowerCase().includes(q))
    }
    if (sortBy === 'views')    list.sort((a, b) => (b.viewCount    ?? 0) - (a.viewCount    ?? 0))
    if (sortBy === 'comments') list.sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0))
    if (sortBy === 'date')     list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    return list
  }, [videos, search, sortBy])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Videos</h1>
          <p className="text-[#8b949e] text-sm mt-0.5">
            {loading ? 'Loading…' : `${videos.length} video${videos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          id="sync-videos-btn"
          onClick={() => fetchVideos(true)}
          disabled={syncing || loading}
          className="flex items-center gap-2 text-sm text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#555] px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
          {syncing ? 'Syncing…' : 'Sync from YouTube'}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58] text-sm">🔍</span>
          <input
            id="videos-search"
            type="text"
            placeholder="Search videos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#ff4444]/60 focus:outline-none rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#484f58] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-lg p-1 shrink-0">
          {[
            { key: 'date',     label: 'Newest'   },
            { key: 'views',    label: 'Views'    },
            { key: 'comments', label: 'Comments' },
          ].map(({ key, label }) => (
            <button
              key={key}
              id={`sort-${key}`}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                sortBy === key
                  ? 'bg-[#ff4444] text-white'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#1c2128]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-white font-semibold text-lg">
            {search ? 'No videos match your search' : 'No videos found'}
          </p>
          <p className="text-[#8b949e] text-sm mt-1">
            {search
              ? 'Try a different keyword'
              : 'Click "Sync from YouTube" to import your videos'}
          </p>
          {search ? (
            <button
              onClick={() => setSearch('')}
              className="mt-4 text-sm text-[#ff4444] hover:underline"
            >
              Clear search
            </button>
          ) : (
            <button
              onClick={() => fetchVideos(true)}
              disabled={syncing}
              className="mt-5 flex items-center gap-2 bg-[#ff4444] hover:bg-[#ff2222] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
              {syncing ? 'Syncing…' : 'Sync from YouTube'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(video => (
            <VideoCard
              key={video.videoId ?? video.id}
              video={video}
              onClick={() => navigate(`/videos/${video.videoId ?? video.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
