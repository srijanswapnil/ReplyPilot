import { Outlet, NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/videos',    icon: '📹', label: 'Videos'    },
  { to: '/replies',   icon: '✨', label: 'Replies'   },
  { to: '/personas',  icon: '🎭', label: 'Personas'  },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (location.pathname.startsWith('/videos')) {
      setSearchQuery(searchParams.get('search') || '')
    }
  }, [location.pathname, searchParams])

  const handleSearchSubmit = () => {
    const query = searchQuery.trim()
    if (!query) return
    navigate(`/videos?search=${encodeURIComponent(query)}`)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchSubmit()
    }
  }

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden font-sans selection:bg-[#ff4444]/30">

      {/* ── Sidebar ── */} 
      <aside className="w-20 lg:w-60 flex flex-col bg-[#161b22] border-r border-[#30363d] shrink-0 transition-all duration-300 ease-in-out">

        {/* Logo - Now a Link to Dashboard */}
        <Link 
          to="/dashboard" 
          className="flex items-center gap-3 px-5 py-6 border-b border-[#30363d] group cursor-pointer hover:bg-[#1c2128] transition-all"
        >
          <span className="text-[#ff4444] text-2xl font-bold group-hover:rotate-[360deg] transition-transform duration-500">
            ▶
          </span>
          <span className="hidden lg:block text-white font-bold text-base tracking-tight group-hover:translate-x-1 transition-transform">
            ReplyPilot
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex flex-col gap-2 p-3 flex-1">
          {nav.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#ff4444]/10 text-[#ff4444]'
                    : 'text-[#8b949e] hover:bg-[#1c2128] hover:text-white'
                }`
              }
            >
              <span className="text-lg shrink-0 group-hover:scale-125 transition-transform">{icon}</span>
              <span className="hidden lg:block">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Right column ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* TopBar - Added Search and Notification functionality */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#161b22]/95 backdrop-blur-sm border-b border-[#30363d] shrink-0 z-10">
          
          {/* Functional Search Bar */}
          <div className="relative group hidden md:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e] group-focus-within:text-[#ff4444] transition-colors">
              🔍
            </span>
            <input 
              type="text"
              placeholder="Search comments or videos... (Cmd + K)"
              className="bg-[#0d1117] border border-[#30363d] rounded-full py-1.5 pl-10 pr-4 text-sm w-80 focus:outline-none focus:border-[#ff4444] focus:ring-1 focus:ring-[#ff4444]/50 transition-all placeholder:text-[#484f58]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          <div className="flex items-center gap-6">
            {/* Notification Bell with Badge */}
            <button className="relative p-2 text-[#8b949e] hover:text-white transition-colors">
              🔔
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ff4444] rounded-full border-2 border-[#161b22]" />
            </button>

            {/* User Profile Section */}
            <div className="flex items-center gap-3 pl-4 border-l border-[#30363d]">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs font-semibold text-white"> {user?.displayName || 'User'} </span>
                <span className="text-[10px] text-green-500 font-medium">Creator</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#ff4444] to-[#ff8e8e] flex items-center justify-center text-xs font-bold border-2 border-[#30363d] cursor-pointer hover:shadow-[0_0_15px_rgba(255,68,68,0.4)] transition-all">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{user?.displayName?.charAt(0) || 'U'}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8 bg-radial-gradient">
          <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}