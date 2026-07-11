import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import Spinner from '../components/shared/Spinner'

// View states
const VIEWS = {
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
  CONFIRM: 'confirm',
  FORGOT: 'forgot',
  RESET: 'reset',
}

const InputField = ({ icon: Icon, type = 'text', placeholder, value, onChange, right, showPwd, onTogglePwd }) => (
  <div className="relative">
    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
      className="input pl-10 pr-10"
    />
    {right && (
      <button
        type="button"
        onClick={onTogglePwd}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-200 hover:text-white"
      >
        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    )}
  </div>
)

export default function AuthPage() {
  const navigate = useNavigate()
  const { loading, error, clearError, signIn, signUp, confirmSignUp, resendCode, forgotPassword, resetPassword } = useAuth()

  const [view, setView] = useState(VIEWS.SIGN_IN)
  const [pendingEmail, setPendingEmail] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  // Form fields
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '', newPassword: '' })

  const update = (field) => (e) => {
    clearError()
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const goTo = (v) => {
    clearError()
    setView(v)
  }

  // ── Handlers ──────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault()
    try {
      await signIn({ email: form.email, password: form.password })
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch {}
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    try {
      await signUp({ email: form.email, password: form.password, name: form.name })
      setPendingEmail(form.email)
      toast.success('Verification code sent to your email!')
      goTo(VIEWS.CONFIRM)
    } catch {}
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    try {
      await confirmSignUp({ email: pendingEmail, code: form.code })
      toast.success('Account confirmed! Please sign in.')
      goTo(VIEWS.SIGN_IN)
    } catch {}
  }

  const handleResend = async () => {
    try {
      await resendCode({ email: pendingEmail })
      toast.success('Code resent!')
    } catch {}
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    try {
      await forgotPassword({ email: form.email })
      setPendingEmail(form.email)
      toast.success('Reset code sent!')
      goTo(VIEWS.RESET)
    } catch {}
  }

  const handleReset = async (e) => {
    e.preventDefault()
    try {
      await resetPassword({ email: pendingEmail, code: form.code, newPassword: form.newPassword })
      toast.success('Password reset! Please sign in.')
      goTo(VIEWS.SIGN_IN)
    } catch {}
  }

  // ── Views ─────────────────────────────────────────────────
  const renderContent = () => {
    switch (view) {
      case VIEWS.SIGN_IN:
        return (
          <form onSubmit={handleSignIn} className="space-y-4">
            <InputField icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={update('email')} />
            <InputField icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={update('password')} right showPwd={showPwd} onTogglePwd={() => setShowPwd(!showPwd)} />
            <button
              type="button"
              onClick={() => goTo(VIEWS.FORGOT)}
              className="text-xs text-brand-400 hover:text-brand-300 text-right w-full"
            >
              Forgot password?
            </button>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <Spinner size="sm" /> : 'Sign In'}
            </button>
            <p className="text-sm text-center text-surface-200">
              No account?{' '}
              <button type="button" onClick={() => goTo(VIEWS.SIGN_UP)} className="text-brand-400 hover:text-brand-300 font-medium">
                Create one
              </button>
            </p>
          </form>
        )

      case VIEWS.SIGN_UP:
        return (
          <form onSubmit={handleSignUp} className="space-y-4">
            <InputField icon={User} placeholder="Full name" value={form.name} onChange={update('name')} />
            <InputField icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={update('email')} />
            <InputField icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="Password (min 8 chars)" value={form.password} onChange={update('password')} right showPwd={showPwd} onTogglePwd={() => setShowPwd(!showPwd)} />
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
            <p className="text-sm text-center text-surface-200">
              Have an account?{' '}
              <button type="button" onClick={() => goTo(VIEWS.SIGN_IN)} className="text-brand-400 hover:text-brand-300 font-medium">
                Sign in
              </button>
            </p>
          </form>
        )

      case VIEWS.CONFIRM:
        return (
          <form onSubmit={handleConfirm} className="space-y-4">
            <p className="text-sm text-surface-200 text-center">
              Enter the 6-digit code sent to <strong className="text-white">{pendingEmail}</strong>
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={form.code}
              onChange={update('code')}
              maxLength={6}
              required
              className="input text-center text-2xl tracking-widest"
            />
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <Spinner size="sm" /> : 'Verify Account'}
            </button>
            <button type="button" onClick={handleResend} className="btn-ghost w-full justify-center text-xs">
              Resend code
            </button>
          </form>
        )

      case VIEWS.FORGOT:
        return (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-sm text-surface-200 text-center">
              Enter your email and we'll send you a reset code.
            </p>
            <InputField icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={update('email')} />
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <Spinner size="sm" /> : 'Send Reset Code'}
            </button>
            <button type="button" onClick={() => goTo(VIEWS.SIGN_IN)} className="btn-ghost w-full justify-center">
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        )

      case VIEWS.RESET:
        return (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-surface-200 text-center">
              Enter the code from your email and choose a new password.
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Reset code"
              value={form.code}
              onChange={update('code')}
              required
              className="input"
            />
            <InputField icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="New password" value={form.newPassword} onChange={update('newPassword')} right showPwd={showPwd} onTogglePwd={() => setShowPwd(!showPwd)} />
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <Spinner size="sm" /> : 'Reset Password'}
            </button>
          </form>
        )

      default:
        return null
    }
  }

  const titles = {
    [VIEWS.SIGN_IN]: { heading: 'Welcome back', sub: 'Sign in to your CloudArch AI account' },
    [VIEWS.SIGN_UP]: { heading: 'Create account', sub: 'Start generating AWS architectures for free' },
    [VIEWS.CONFIRM]: { heading: 'Verify your email', sub: 'Check your inbox for the confirmation code' },
    [VIEWS.FORGOT]: { heading: 'Reset password', sub: "We'll send a code to your inbox" },
    [VIEWS.RESET]: { heading: 'New password', sub: 'Almost there — set your new password' },
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[600px] h-[400px] bg-brand-600/15 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white">CloudArch AI</span>
        </div>

        <div className="card">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-display font-bold text-white mb-1">
                  {titles[view]?.heading}
                </h1>
                <p className="text-sm text-surface-200">{titles[view]?.sub}</p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
