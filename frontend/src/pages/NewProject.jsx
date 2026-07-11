import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Server, Shield, Users, Globe } from 'lucide-react'
import { projectsApi } from '../services/api'
import toast from 'react-hot-toast'

const REGIONS = [
  { value: 'us-east-1', label: 'us-east-1 (N. Virginia)' },
  { value: 'us-west-2', label: 'us-west-2 (Oregon)' },
  { value: 'eu-west-1', label: 'eu-west-1 (Ireland)' },
  { value: 'ap-southeast-1', label: 'ap-southeast-1 (Singapore)' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1 (Tokyo)' },
]

const USER_OPTIONS = [
  { value: '<1000', label: 'Startup', desc: 'Less than 1,000 monthly active users' },
  { value: '1000-10000', label: 'Growth', desc: '1,000 to 10,000 monthly active users' },
  { value: '>100000', label: 'Enterprise', desc: 'More than 100,000 monthly active users' },
]

const AVAILABILITY_OPTIONS = [
  { value: 'best-effort', label: 'Best Effort', desc: 'Single AZ / non-critical availability' },
  { value: '99.9%', label: '99.9% SLA', desc: 'Multi-AZ High Availability' },
  { value: '99.99%', label: '99.99% SLA', desc: 'Multi-Region High Availability & DR' },
]

const DATABASE_OPTIONS = [
  { value: 'relational', label: 'Relational SQL', desc: 'PostgreSQL, Aurora, MySQL' },
  { value: 'nosql', label: 'NoSQL Key-Value', desc: 'DynamoDB, MongoDB' },
  { value: 'both', label: 'Hybrid (SQL + NoSQL)', desc: 'Both relational and document DBs' },
  { value: 'none', label: 'No Database', desc: 'Static or external API backend' },
]

const STORAGE_OPTIONS = [
  { value: 'none', label: 'No Storage', desc: 'Simple compute only' },
  { value: 'small (<10GB)', label: 'Small (<10GB)', desc: 'Images, assets, document uploads' },
  { value: 'large (>1TB)', label: 'Large (>1TB)', desc: 'Large files, archives, block storage' },
]

const AUTH_OPTIONS = [
  { value: 'email/password', label: 'Email / Password', desc: 'AWS Cognito User Pools' },
  { value: 'social OAuth', label: 'Social OAuth', desc: 'Google, Apple, Facebook sign-in' },
  { value: 'enterprise SSO', label: 'Enterprise SSO', desc: 'SAML / Enterprise integrations' },
  { value: 'none', label: 'No Authentication', desc: 'Public application' },
]

const BUDGET_OPTIONS = [
  { value: 'minimal (<$100/mo)', label: 'Minimal (<$100/mo)', desc: 'Optimize strictly for cost' },
  { value: 'moderate ($100-1000/mo)', label: 'Moderate ($100-1000/mo)', desc: 'Balance HA and costs' },
  { value: 'large (>$1000/mo)', label: 'Large (>$1000/mo)', desc: 'Performance and DR prioritized' },
]

const STEPS = ['Project Info', 'Scale & Resiliency', 'Data & Identity', 'Review & Generate']

export default function NewProject() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    expected_users: '<1000',
    availability_requirement: 'best-effort',
    region: 'us-east-1',
    database_needs: 'relational',
    storage_needs: 'none',
    auth_method: 'email/password',
    budget: 'minimal (<$100/mo)',
  })

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0 && form.description.trim().length >= 10
    return true
  }

  const handleSubmit = async () => {
    setCreating(true)
    try {
      // 1. Create the project record
      const createRes = await projectsApi.create({
        name: form.name,
        description: form.description,
      })
      const projectId = createRes.data?.id
      if (!projectId) throw new Error('No project ID returned from backend')

      // 2. Save the answers to the 7 clarifying questions
      await projectsApi.updateQuestions(projectId, {
        expected_users: form.expected_users,
        budget: form.budget,
        region: form.region,
        availability_requirement: form.availability_requirement,
        database_needs: form.database_needs,
        storage_needs: form.storage_needs,
        auth_method: form.auth_method,
      })

      toast.success('Project parameters saved!')

      // 3. Trigger architecture generation
      await projectsApi.generate(projectId)
      toast.success('AWS Architecture recommendations generated!')
      navigate(`/projects/${projectId}`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || 'Failed to create project')
      setCreating(false)
    }
  }

  // ── Step 0: Name & Description ────────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-5">
      <div>
        <label className="label">Project Name *</label>
        <input
          type="text"
          placeholder="e.g. My SaaS Portal"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="input font-medium text-white"
          maxLength={100}
        />
      </div>
      <div>
        <label className="label">What does your application do? *</label>
        <textarea
          placeholder="Describe your application. Explain the core features, targeted users, and any key performance requirements. (Minimum 10 characters)..."
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={5}
          className="input resize-none text-white leading-relaxed"
          maxLength={5000}
        />
        <p className="text-xs text-surface-200 mt-1.5 text-right font-mono">
          {form.description.length} / 5000 characters (min 10)
        </p>
      </div>
    </div>
  )

  // ── Step 1: Scale & Resiliency ────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="label flex items-center gap-2"><Users size={16} className="text-brand-400" /> Expected Users</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {USER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('expected_users', opt.value)}
              className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                form.expected_users === opt.value
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/50 shadow-lg'
                  : 'bg-surface-800 text-surface-200 border-surface-700 hover:border-surface-600 hover:text-white'
              }`}
            >
              <h4 className="font-bold text-sm">{opt.label}</h4>
              <p className="text-xs opacity-75 mt-1 leading-normal">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label flex items-center gap-2"><Server size={16} className="text-brand-400" /> Availability & SLA</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {AVAILABILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('availability_requirement', opt.value)}
              className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                form.availability_requirement === opt.value
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/50 shadow-lg'
                  : 'bg-surface-800 text-surface-200 border-surface-700 hover:border-surface-600 hover:text-white'
              }`}
            >
              <h4 className="font-bold text-sm">{opt.label}</h4>
              <p className="text-xs opacity-75 mt-1 leading-normal">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label flex items-center gap-2"><Globe size={16} className="text-brand-400" /> Preferred AWS Region</label>
        <select
          value={form.region}
          onChange={(e) => update('region', e.target.value)}
          className="input text-white bg-surface-800"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
    </div>
  )

  // ── Step 2: Data & Identity ──────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="label flex items-center gap-2"><Server size={16} className="text-brand-400" /> Database Needs</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DATABASE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('database_needs', opt.value)}
              className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                form.database_needs === opt.value
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/50 shadow-lg'
                  : 'bg-surface-800 text-surface-200 border-surface-700 hover:border-surface-600 hover:text-white'
              }`}
            >
              <h4 className="font-bold text-sm">{opt.label}</h4>
              <p className="text-xs opacity-75 mt-1 leading-normal">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label flex items-center gap-2"><Server size={16} className="text-brand-400" /> Storage Capacity</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STORAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('storage_needs', opt.value)}
              className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                form.storage_needs === opt.value
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/50 shadow-lg'
                  : 'bg-surface-800 text-surface-200 border-surface-700 hover:border-surface-600 hover:text-white'
              }`}
            >
              <h4 className="font-bold text-sm">{opt.label}</h4>
              <p className="text-xs opacity-75 mt-1 leading-normal">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label flex items-center gap-2"><Shield size={16} className="text-brand-400" /> Authentication Provider</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AUTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('auth_method', opt.value)}
              className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                form.auth_method === opt.value
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/50 shadow-lg'
                  : 'bg-surface-800 text-surface-200 border-surface-700 hover:border-surface-600 hover:text-white'
              }`}
            >
              <h4 className="font-bold text-sm">{opt.label}</h4>
              <p className="text-xs opacity-75 mt-1 leading-normal">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Step 3: Review & Generate ─────────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="label flex items-center gap-2">Monthly Budget Preference</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BUDGET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('budget', opt.value)}
              className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                form.budget === opt.value
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/50 shadow-lg'
                  : 'bg-surface-800 text-surface-200 border-surface-700 hover:border-surface-600 hover:text-white'
              }`}
            >
              <h4 className="font-bold text-sm">{opt.label}</h4>
              <p className="text-xs opacity-75 mt-1 leading-normal">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="divider my-4 border-surface-850" />

      <div className="card bg-surface-800/30 p-5 rounded-xl border border-surface-750 space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Summary of Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between border-b border-surface-850 pb-2">
            <span className="text-surface-200">Project Name:</span>
            <span className="text-white font-medium">{form.name}</span>
          </div>
          <div className="flex justify-between border-b border-surface-850 pb-2">
            <span className="text-surface-200">Scale Users:</span>
            <span className="text-white font-medium">{form.expected_users}</span>
          </div>
          <div className="flex justify-between border-b border-surface-850 pb-2">
            <span className="text-surface-200">Availability Target:</span>
            <span className="text-white font-medium">{form.availability_requirement}</span>
          </div>
          <div className="flex justify-between border-b border-surface-850 pb-2">
            <span className="text-surface-200">Target Region:</span>
            <span className="text-white font-medium">{form.region}</span>
          </div>
          <div className="flex justify-between border-b border-surface-850 pb-2">
            <span className="text-surface-200">Database Needs:</span>
            <span className="text-white font-medium">{form.database_needs}</span>
          </div>
          <div className="flex justify-between border-b border-surface-850 pb-2">
            <span className="text-surface-200">Storage Needs:</span>
            <span className="text-white font-medium">{form.storage_needs}</span>
          </div>
          <div className="flex justify-between border-b border-surface-850 pb-2">
            <span className="text-surface-200">Auth Method:</span>
            <span className="text-white font-medium">{form.auth_method}</span>
          </div>
          <div className="flex justify-between border-b border-surface-850 pb-2">
            <span className="text-surface-200">Budget Limit:</span>
            <span className="text-white font-medium">{form.budget}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate('/dashboard'))}
          className="btn-ghost mb-4 -ml-2 text-surface-200 hover:text-white"
        >
          <ArrowLeft size={16} /> {step > 0 ? 'Back' : 'Dashboard'}
        </button>
        <h1 className="font-display text-3xl font-bold text-white">Configure AWS Cloud Architecture</h1>
        <p className="text-surface-200 text-sm mt-1">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-brand-500 shadow-sm shadow-brand-500/20' : 'bg-surface-800'
            }`}
          />
        ))}
      </div>

      {/* Form Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="card mb-6"
        >
          <h2 className="font-display text-xl font-bold text-white mb-6 border-b border-surface-850 pb-3">
            {STEPS[step]}
          </h2>
          {steps[step]()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-end gap-3">
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="btn-primary"
          >
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={creating}
            className="btn-primary"
          >
            {creating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Generating AWS Architectures…
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate Architectures
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
