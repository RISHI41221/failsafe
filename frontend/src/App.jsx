import { Activity, ShieldAlert, UploadCloud } from 'lucide-react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import Auth from './pages/Auth.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              <ShieldAlert className="h-4 w-4" />
              FAILSAFE Intelligence
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                Student risk monitoring, built for action.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
                Upload student performance data, inspect model-driven risk
                signals, and turn predictions into intervention planning across
                your district workflow.
              </p>
            </div>
          </div>

          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Models
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">1</p>
              <p className="mt-1 text-sm text-slate-400">XGBoost pipeline</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                API Status
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                Ready
              </p>
              <p className="mt-1 text-sm text-slate-400">Auth + inference</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Dashboard workspace
              </h2>
              <p className="text-sm text-slate-400">
                Connect this view to `/api/dashboard` to surface live prediction
                results.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-sm font-medium text-slate-200">
                At-risk overview
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Summarize cohort size, high-priority students, and intervention
                backlog.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-sm font-medium text-slate-200">
                SHAP explanations
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Highlight the strongest risk drivers to help counselors act
                faster.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-sm font-medium text-slate-200">
                Intervention queue
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Organize next-step recommendations by urgency and owner.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-slate-900/70 to-slate-900/90 p-6 shadow-xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-200">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Next integration step
              </h2>
              <p className="text-sm text-slate-400">
                Wire the Upload screen to the prediction endpoint and stream
                results back into the dashboard.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              `POST /api/predict/upload`
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              `GET /api/dashboard`
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-400">
              The route shell is live, so these screens are ready for data-bound
              components next.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function UploadPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Upload student data
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              This route is ready for the CSV uploader. Connect it to the
              `predictAPI.uploadCSV` helper to submit files to the FAILSAFE
              inference service and persist results.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-dashed border-cyan-400/20 bg-slate-900/60 p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Expected flow
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>Upload a CSV exported from your SIS or counselor workflow.</li>
            <li>Send it to the backend as `multipart/form-data`.</li>
            <li>Render risk predictions, SHAP factors, and interventions.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Ready for next task
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            The navigation, auth gate, and shell layout are in place, so this
            page can become the real upload workflow without any routing refactor.
          </p>
        </div>
      </section>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="upload" element={<UploadPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
