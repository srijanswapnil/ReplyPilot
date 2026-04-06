import { Outlet, NavLink } from 'react-router-dom'

const nav = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard'  },

]

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-16 lg:w-56 flex flex-col bg-[#161b22] border-r border-[#30363d] shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#30363d]">
          <span className="text-[#ff4444] text-xl font-bold">▶</span>
          <span className="hidden lg:block text-white font-semibold text-sm tracking-wide">
            ReplyPilot
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {nav.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#ff4444]/10 text-[#ff4444]'
                    : 'text-[#8b949e] hover:bg-[#1c2128] hover:text-white'
                }`
              }
            >
              <span className="text-base shrink-0">{icon}</span>
              <span className="hidden lg:block">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Right column ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* TopBar */}
        <header className="h-14 flex items-center px-6 bg-[#161b22] border-b border-[#30363d] shrink-0">
          <span className="text-[#8b949e] text-sm font-medium">ReplyPilot</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

      </div>
    </div>
  )
}
