import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'

// ── Format large numbers ───────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex items-center gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-[#8b949e] text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-white text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse max-w-5xl mx-auto">
      <div className="h-32 bg-[#161b22] rounded-xl border border-[#30363d]" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-[#161b22] rounded-xl border border-[#30363d]" />
        ))}
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [channel, setChannel]               = useState(null)
  const [channelLoading, setChannelLoading] = useState(false)
  const [channelError, setChannelError]     = useState(null)
  const [syncing, setSyncing]               = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate('/', { replace: true })
  }, [user, authLoading, navigate])

  // Fetch channel only if user has one linked
  useEffect(() => {
    if (user?.channelId) loadChannel(false)
  }, [user])

  async function loadChannel(force) {
    try {
      force ? setSyncing(true) : setChannelLoading(true)
      const res = await api.get('/api/channel', {
        params: force ? { force: 'true' } : {},
      })
      setChannel(res.data.data)
      setChannelError(null)
    } catch (err) {
      setChannelError('Could not load YouTube channel data.')
    } finally {
      setChannelLoading(false)
      setSyncing(false)
    }
  }

  async function handleLogout() {
    await api.post('/api/auth/logout')
    navigate('/', { replace: true })
  }

  if (authLoading) return <Skeleton />

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#8b949e] text-sm mt-0.5">
            Welcome back, {user?.displayName || 'Creator'} 👋
          </p>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="text-sm text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#555] px-4 py-2 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* ── User profile card ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex items-center gap-5">
        {/* Google avatar */}
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.displayName}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#30363d] shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#ff4444]/20 flex items-center justify-center text-2xl shrink-0">
            {user?.displayName?.[0] || '?'}
          </div>
        )}

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg truncate">{user?.displayName || '—'}</p>
          <p className="text-[#8b949e] text-sm mt-0.5">{user?.email || '—'}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Channel link status */}
            {user?.channelId ? (
              <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                ✓ YouTube channel linked
              </span>
            ) : (
              <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                ⚠ No YouTube channel linked
              </span>
            )}
            {/* Member since */}
            {user?.createdAt && (
              <span className="text-xs text-[#484f58]">
                Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Channel section ── */}
      {user?.channelId && (
        <>
          {channelError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-5 py-4 text-sm">
              {channelError}
            </div>
          )}

          {channelLoading ? (
            <div className="animate-pulse grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-[#161b22] rounded-xl border border-[#30363d]" />
              ))}
            </div>
          ) : channel && (
            <>
              {/* Channel banner */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex items-center gap-5">
                <img
                  src={channel.thumbnail?.medium || channel.thumbnail?.default}
                  alt={channel.title}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#30363d] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-white font-bold truncate">{channel.title}</h2>
                    {channel.customUrl && (
                      <span className="text-[#8b949e] text-sm">{channel.customUrl}</span>
                    )}
                  </div>
                  {channel.description && (
                    <p className="text-[#8b949e] text-sm mt-1 line-clamp-1">{channel.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#484f58]">
                    {channel.country && <span>📍 {channel.country}</span>}
                    {channel.publishedAt && (
                      <span>Since {new Date(channel.publishedAt).getFullYear()}</span>
                    )}
                  </div>
                </div>
                <button
                  id="sync-btn"
                  onClick={() => loadChannel(true)}
                  disabled={syncing}
                  className="shrink-0 flex items-center gap-2 text-sm text-[#8b949e] hover:text-white border border-[#30363d] px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
                >
                  <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
                  {syncing ? 'Syncing…' : 'Sync'}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Subscribers"
                  value={channel.hiddenSubscriberCount ? 'Hidden' : fmt(channel.subscriberCount)}
                  icon="👥"
                />
                <StatCard label="Total Views" value={fmt(channel.viewCount)}  icon="👁️" />
                <StatCard label="Videos"      value={fmt(channel.videoCount)} icon="🎬" />
                <StatCard label="Keywords"    value={channel.keywords?.length || '—'} icon="🏷️" />
              </div>
            </>
          )}
        </>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          id="goto-videos-btn"
          onClick={() => navigate('/videos')}
          className="bg-[#161b22] border border-[#30363d] hover:border-[#ff4444]/40 rounded-xl p-5 text-left transition-colors group"
        >
          <div className="text-2xl mb-2">📹</div>
          <p className="text-white font-semibold group-hover:text-[#ff4444] transition-colors">Browse Videos</p>
          <p className="text-[#8b949e] text-sm mt-0.5">View your uploaded videos and comments</p>
        </button>

        <button
          id="goto-personas-btn"
          onClick={() => navigate('/personas')}
          className="bg-[#161b22] border border-[#30363d] hover:border-[#ff4444]/40 rounded-xl p-5 text-left transition-colors group"
        >
          <div className="text-2xl mb-2">🎭</div>
          <p className="text-white font-semibold group-hover:text-[#ff4444] transition-colors">Manage Personas</p>
          <p className="text-[#8b949e] text-sm mt-0.5">Configure your AI reply tone and vocabulary</p>
        </button>
      </div>
    </div>
  )
}