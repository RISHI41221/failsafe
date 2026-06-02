import { LoaderCircle, Shield, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { authAPI } from '../lib/api.js'

function getErrorMessage(error, mode) {
  const backendMessage = error?.response?.data?.detail

  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage
  }

  return mode === 'login'
    ? 'Unable to sign you in. Please verify your credentials and try again.'
    : 'Unable to create your account right now. Please try again in a moment.'
}

function Auth() {
  const [mode, setMode] = useState('login')
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const navigate = useNavigate()
  const { login } = useAuth()

  const isLoginMode = mode === 'login'

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      if (isLoginMode) {
        const response = await authAPI.login(formValues)
        login(response.access_token)
        navigate('/dashboard', { replace: true })
      } else {
        await authAPI.register(formValues)
        setMode('login')
        setFormValues((currentValues) => ({
          ...currentValues,
          password: '',
        }))
        setSuccessMessage(
          'Account created successfully. Sign in to enter the FAILSAFE workspace.',
        )
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, mode))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_24%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              <Shield className="h-4 w-4" />
              FAILSAFE Platform
            </div>

            <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-tight text-white lg:text-5xl">
              Protect outcomes earlier with explainable student risk insights.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 lg:text-base">
              Secure access for counselors, administrators, and student-support
              teams. Authenticate once, upload student data, and act on
              intervention recommendations in a focused command center.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm font-semibold text-white">
                  Explainable predictions
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Surface the strongest SHAP-driven risk factors behind each
                  recommendation.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm font-semibold text-white">
                  Batch-ready workflow
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Move from CSV uploads to dashboard visibility without leaving
                  the authenticated workspace.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-2xl lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Access
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {isLoginMode ? 'Welcome back' : 'Create an account'}
                </h2>
              </div>

              <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/40 p-1">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                disabled={isSubmitting}
                className={[
                  'rounded-xl px-4 py-3 text-sm font-medium transition',
                  isLoginMode
                    ? 'bg-cyan-400/15 text-white shadow-inner shadow-cyan-950/30'
                    : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                disabled={isSubmitting}
                className={[
                  'rounded-xl px-4 py-3 text-sm font-medium transition',
                  !isLoginMode
                    ? 'bg-cyan-400/15 text-white shadow-inner shadow-cyan-950/30'
                    : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                Register
              </button>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                {successMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Email</span>
                <input
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleInputChange}
                  placeholder="counselor@district.org"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Password
                </span>
                <input
                  type="password"
                  name="password"
                  value={formValues.password}
                  onChange={handleInputChange}
                  placeholder="Enter a secure password"
                  autoComplete={
                    isLoginMode ? 'current-password' : 'new-password'
                  }
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {isLoginMode ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : isLoginMode ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              {isLoginMode
                ? "Need access to the workspace?"
                : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() =>
                  handleModeChange(isLoginMode ? 'register' : 'login')
                }
                disabled={isSubmitting}
                className="font-medium text-cyan-200 transition hover:text-cyan-100"
              >
                {isLoginMode ? 'Create one now' : 'Sign in instead'}
              </button>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Auth
