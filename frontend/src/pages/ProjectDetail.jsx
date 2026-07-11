import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, RefreshCw, Sparkles, DollarSign, Shield,
  CheckCircle2, AlertCircle, Loader2, Play
} from 'lucide-react'
import { projectsApi, architecturesApi } from '../services/api'
import LoadingScreen from '../components/shared/LoadingScreen'
import toast from 'react-hot-toast'
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Custom node rendering for React Flow diagram nodes
const CustomServiceNode = ({ data }) => {
  return (
    <div className="px-4 py-3 rounded-xl bg-surface-900 border border-surface-700 shadow-md min-w-[200px] hover:border-brand-500/50 transition-colors">
      <Handle type="target" position={Position.Left} className="!bg-brand-500 w-2 h-2" />
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs text-white uppercase shrink-0"
          style={{ backgroundColor: data.color || '#3b82f6' }}
        >
          {data.icon ? data.icon.slice(0, 3) : 'AWS'}
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold text-white truncate">{data.label}</p>
          <p className="text-[10px] text-surface-200 truncate">{data.aws_service}</p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-surface-800 flex justify-between items-center text-[10px] text-surface-200">
        <span>Est. Cost:</span>
        <span className="font-semibold text-brand-400 font-mono">${data.monthly_cost_usd.toFixed(2)}/mo</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-brand-500 w-2 h-2" />
    </div>
  )
}

const nodeTypes = {
  serviceNode: CustomServiceNode,
}

const TIERS = [
  { key: 'startup', label: 'Startup Tier', colorClass: 'border-green-500/30 bg-green-500/5 text-green-400' },
  { key: 'production', label: 'Production Tier', colorClass: 'border-blue-500/30 bg-blue-500/5 text-blue-400' },
  { key: 'enterprise', label: 'Enterprise Tier', colorClass: 'border-purple-500/30 bg-purple-500/5 text-purple-400' },
]

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [architectures, setArchitectures] = useState([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [polling, setPolling] = useState(false)
  const [activeTier, setActiveTier] = useState('startup')
  
  // Selection state for node details
  const [selectedService, setSelectedService] = useState(null)

  const loadAll = useCallback(async () => {
    try {
      const [projRes, archRes] = await Promise.all([
        projectsApi.get(projectId),
        architecturesApi.getByProject(projectId),
      ])
      const proj = projRes.data?.project || projRes.data
      const archs = archRes.data?.architectures || archRes.data || []
      setProject(proj)
      setArchitectures(archs)
      return proj
    } catch {
      toast.error('Failed to load project details')
    }
  }, [projectId])

  // Poll while generating
  useEffect(() => {
    let interval
    const init = async () => {
      setLoading(true)
      const proj = await loadAll()
      setLoading(false)
      if (proj?.status === 'generating') {
        setPolling(true)
        interval = setInterval(async () => {
          const p = await loadAll()
          if (p?.status !== 'generating') {
            clearInterval(interval)
            setPolling(false)
          }
        }, 4000)
      }
    }
    init()
    return () => clearInterval(interval)
  }, [loadAll])

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await projectsApi.generate(projectId)
      toast.success('Regeneration started…')
      setPolling(true)
      const interval = setInterval(async () => {
        const p = await loadAll()
        if (p?.status !== 'generating') {
          clearInterval(interval)
          setPolling(false)
        }
      }, 4000)
    } catch {
      toast.error('Failed to start regeneration')
    } finally {
      setRegenerating(false)
    }
  }

  // Find the architecture that fits the selected tab/tier
  const activeArch = architectures.find((a) => a.tier === activeTier)

  const onNodeClick = (event, node) => {
    setSelectedService(node.data)
  }

  // Clear selected node when changing tiers
  const handleTierChange = (tierKey) => {
    setActiveTier(tierKey)
    setSelectedService(null)
  }

  if (loading) return <LoadingScreen message="Loading architecture recommendations…" />
  if (!project) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-white font-semibold">Project not found</p>
      <button onClick={() => navigate('/dashboard')} className="btn-secondary">Back to Dashboard</button>
    </div>
  )

  const isGenerating = project.status === 'generating' || polling
  const isFailed = project.status === 'error'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost mb-3 -ml-2 text-surface-200 hover:text-white">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <h1 className="font-display text-3xl font-bold text-white mb-1">{project.name}</h1>
          <p className="text-surface-200 text-sm max-w-2xl leading-relaxed">{project.description}</p>
        </div>
        <div className="flex items-center gap-3">
          {!isGenerating && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-secondary flex items-center gap-2"
            >
              {regenerating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Generating State */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-center py-16 mb-8"
        >
          <div className="flex flex-col items-center gap-4">
            <Sparkles className="w-12 h-12 text-brand-400 animate-pulse" />
            <h3 className="font-display text-xl font-bold text-white">AI is crafting your architectures…</h3>
            <p className="text-surface-200 text-sm max-w-sm">
              We're designing three tailored AWS architecture plans (Startup, Production, Enterprise). This usually takes 15–30 seconds.
            </p>
            <div className="flex gap-2 mt-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ delay: i * 0.2, repeat: Infinity, duration: 1 }}
                  className="w-2.5 h-2.5 rounded-full bg-brand-500"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Failed State */}
      {isFailed && !isGenerating && (
        <div className="card border border-red-500/30 bg-red-500/5 text-center py-12 mb-8">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-2">Generation Failed</h3>
          <p className="text-surface-200 text-sm mb-4">Something went wrong during generation. Please try regenerating.</p>
          <button onClick={handleRegenerate} disabled={regenerating} className="btn-primary mx-auto">
            <Sparkles size={15} /> Try Again
          </button>
        </div>
      )}

      {/* Main Architectures Viewer */}
      {architectures.length > 0 && !isGenerating && (
        <div className="space-y-6">
          {/* Tabs for Tiers */}
          <div className="flex gap-2 border-b border-surface-850 pb-px">
            {TIERS.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTierChange(t.key)}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                  activeTier === t.key
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-surface-200 hover:text-white hover:border-surface-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeArch ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Canvas - React Flow (66% Width) */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="card p-0 overflow-hidden relative border border-surface-750 flex flex-col h-[520px]">
                  <div className="bg-surface-800/80 px-4 py-3 flex justify-between items-center border-b border-surface-750 shrink-0">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      Interactive AWS Architecture Diagram
                    </h3>
                    <span className="text-xs text-surface-200 bg-surface-900 px-2.5 py-1 rounded-lg border border-surface-750">
                      Click nodes to view details
                    </span>
                  </div>
                  
                  {/* React Flow Canvas */}
                  <div className="flex-1 w-full bg-surface-950 relative">
                    <ReactFlow
                      nodes={activeArch.diagram_nodes || []}
                      edges={activeArch.diagram_edges || []}
                      nodeTypes={nodeTypes}
                      onNodeClick={onNodeClick}
                      fitView
                      minZoom={0.5}
                      maxZoom={1.5}
                    >
                      <Background color="#333" gap={16} />
                      <Controls className="!bg-surface-800 !border-surface-700 !fill-white" />
                    </ReactFlow>
                  </div>
                </div>

                {/* Node Detail Drawer / Info Box */}
                <div className="card border border-surface-750 bg-surface-900/30">
                  <h4 className="text-xs font-semibold text-surface-200 uppercase tracking-wide mb-2">Service Context</h4>
                  {selectedService ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white text-base">{selectedService.label}</h3>
                        <span className="text-xs font-semibold text-brand-400 font-mono bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/30">
                          ${selectedService.monthly_cost_usd.toFixed(2)}/mo
                        </span>
                      </div>
                      <p className="text-sm text-surface-200 leading-relaxed font-normal">{selectedService.rationale}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-surface-200 italic font-light">
                      Click any service node in the interactive diagram above to view its design rationale and cost contribution.
                    </p>
                  )}
                </div>
              </div>

              {/* Right Side - Cost, Security, Deployment (33% Width) */}
              <div className="space-y-6">
                {/* Cost Breakdown */}
                <div className="card border border-surface-750">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-surface-850">
                    <h3 className="font-display font-bold text-lg text-white">Monthly Costs</h3>
                    <div className="text-right">
                      <div className="text-2xl font-black text-brand-400 font-mono">
                        ${activeArch.total_monthly_cost_usd.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-surface-200 uppercase tracking-wider">Estimated Total</span>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {(activeArch.services || []).map((s, idx) => (
                      <div key={idx} className="flex justify-between text-xs items-center gap-3">
                        <div className="overflow-hidden">
                          <p className="text-white font-medium truncate">{s.name}</p>
                          <p className="text-[10px] text-surface-200 truncate">{s.aws_service}</p>
                        </div>
                        <span className="text-white font-mono shrink-0 font-semibold">${s.monthly_cost_usd.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security Recommendations */}
                <div className="card border border-surface-750">
                  <h3 className="font-display font-bold text-base text-white mb-3 flex items-center gap-2">
                    <Shield size={16} className="text-brand-400" /> Security Guidelines
                  </h3>
                  <ul className="space-y-2">
                    {(activeArch.security_recommendations || []).map((rec, idx) => (
                      <li key={idx} className="text-xs text-surface-200 flex items-start gap-2.5 leading-relaxed font-normal">
                        <CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Deployment Steps */}
                <div className="card border border-surface-750">
                  <h3 className="font-display font-bold text-base text-white mb-3 flex items-center gap-2">
                    <Play size={15} className="text-brand-400" /> Step-by-Step Tutorial
                  </h3>
                  <ol className="space-y-3">
                    {(activeArch.deployment_steps || []).map((step, idx) => (
                      <li key={idx} className="text-xs text-surface-200 flex gap-3 leading-relaxed font-normal">
                        <span className="w-5 h-5 rounded-full bg-surface-800 border border-surface-700 text-[10px] font-bold text-brand-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="mt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-16">
              <p className="text-surface-200 text-sm">No architecture details available for this tier.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
