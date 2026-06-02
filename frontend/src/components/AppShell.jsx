import { LayoutDashboard, LogOut, ShieldCheck, Upload } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

const navigationItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Upload Data',
    to: '/upload',
    icon: Upload,
  },
]

function AppShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const currentPage =
    navigationItems.find(({ to }) => location.pathname.startsWith(to))?.label ??
    'FAILSAFE'

  const handleLogout = () => {
    logout()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-80 flex-col border-r border-white/10 bg-slate-900/80 px-6 py-8 backdrop-blur-2xl lg:flex">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
                  FAILSAFE
                </p>
                <h1 className="mt-2 text-xl font-semibold text-white">
                  Student Risk Console
                </h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Navigate between risk analytics and batch uploads inside a single
              protected workspace.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navigationItems.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-white shadow-lg shadow-cyan-950/30'
                      : 'border-transparent bg-white/[0.03] text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-slate-200',
                  ].join(' ')
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-auto flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
                  FAILSAFE
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {currentPage}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>

            <nav className="mt-4 grid grid-cols-2 gap-3">
              {navigationItems.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [
                      'flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition',
                      isActive
                        ? 'border-cyan-400/30 bg-cyan-400/10 text-white'
                        : 'border-white/10 bg-white/[0.04] text-slate-300',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppShell
