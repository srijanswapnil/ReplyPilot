import { useState, useEffect } from 'react'
import {
  listPersonas,
  createPersona,
  updatePersona,
  deletePersona,
  analyzePersona,
} from '../api/personas'

const TONE_META = {
  friendly:      { emoji: '😊', label: 'Friendly',      color: 'from-green-500/20 to-green-500/5',   border: 'border-green-500/30',  text: 'text-green-400'  },
  professional:  { emoji: '💼', label: 'Professional',  color: 'from-blue-500/20 to-blue-500/5',    border: 'border-blue-500/30',   text: 'text-blue-400'   },
  humorous:      { emoji: '😂', label: 'Humorous',      color: 'from-yellow-500/20 to-yellow-500/5',border: 'border-yellow-500/30', text: 'text-yellow-400' },
  promotional:   { emoji: '📣', label: 'Promotional',   color: 'from-orange-500/20 to-orange-500/5',border: 'border-orange-500/30', text: 'text-orange-400' },
  appreciative:  { emoji: '🙏', label: 'Appreciative',  color: 'from-pink-500/20 to-pink-500/5',    border: 'border-pink-500/30',   text: 'text-pink-400'   },
  informative:   { emoji: '📚', label: 'Informative',   color: 'from-cyan-500/20 to-cyan-500/5',    border: 'border-cyan-500/30',   text: 'text-cyan-400'   },
  supportive:    { emoji: '🤝', label: 'Supportive',    color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-400' },
  apologetic:    { emoji: '😔', label: 'Apologetic',    color: 'from-red-500/20 to-red-500/5',      border: 'border-red-500/30',    text: 'text-red-400'    },
  neutral:       { emoji: '😐', label: 'Neutral',       color: 'from-gray-500/20 to-gray-500/5',    border: 'border-gray-500/30',   text: 'text-gray-400'   },
}


function ToneBadge({ tone }) {
  const m = TONE_META[tone] ?? TONE_META.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium bg-gradient-to-r ${m.color} ${m.border} ${m.text}`}>
      {m.emoji} {m.label}
    </span>
  )
}

function PersonaCard({ persona, onEdit, onDelete, onSetDefault }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete persona "${persona.name}"?`)) return
    setDeleting(true)
    try { await onDelete(persona._id) } finally { setDeleting(false) }
  }

  return (
    <div className={`relative bg-[#161b22] border rounded-xl p-5 transition-all hover:border-[#3d4450] ${
      persona.isDefault ? 'border-[#ff4444]/50 ring-1 ring-[#ff4444]/20' : 'border-[#30363d]'
    }`}>
      {persona.isDefault && (
        <span className="absolute top-3 right-3 text-[10px] font-bold text-[#ff4444] bg-[#ff4444]/10 border border-[#ff4444]/30 px-2 py-0.5 rounded-full">
          DEFAULT
        </span>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff4444]/30 to-[#ff4444]/10 flex items-center justify-center text-lg shrink-0">
          {TONE_META[persona.tone]?.emoji ?? '🤖'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-semibold text-sm truncate">{persona.name}</h3>
          <div className="mt-1"><ToneBadge tone={persona.tone} /></div>
        </div>
      </div>

      {persona.systemPrompt && (
        <p className="text-[#8b949e] text-xs leading-relaxed line-clamp-3 mb-4 bg-[#1c2128] rounded-lg p-3 border border-[#30363d]">
          {persona.systemPrompt}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-auto">
        {!persona.isDefault && (
          <button
            onClick={() => onSetDefault(persona)}
            className="text-xs text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#555] px-3 py-1.5 rounded-lg transition-colors"
          >
            Set Default
          </button>
        )}
        <button
          onClick={() => onEdit(persona)}
          className="text-xs text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#555] px-3 py-1.5 rounded-lg transition-colors"
        >
          ✏️ Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-400 hover:text-white hover:bg-red-500/80 border border-red-500/30 hover:border-red-500 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 ml-auto"
        >
          {deleting ? '…' : '🗑️ Delete'}
        </button>
      </div>
    </div>
  )
}

function BioStep({ onAnalyzed }) {
  const [bio, setBio]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleAnalyze() {
    if (bio.trim().length < 10) {
      setError('Please write at least a sentence about yourself.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await analyzePersona(bio.trim())
      onAnalyzed({ bio: bio.trim(), ...result })
    } catch (e) {
      setError(e.response?.data?.error || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-white font-semibold text-sm mb-2">
          Tell us about yourself
        </label>
        <p className="text-[#8b949e] text-xs mb-3 leading-relaxed">
          Write a paragraph about who you are, your content style, your audience, and how you like to engage with them.
          The AI will derive your reply tone and style from this.
        </p>
        <textarea
          id="persona-bio"
          value={bio}
          onChange={e => { setBio(e.target.value); setError(null) }}
          placeholder="e.g. I'm a tech educator who makes tutorials for beginners. I love helping people learn programming in a friendly, encouraging way. I always try to make complex topics simple and celebrate my viewers' progress..."
          rows={6}
          className="w-full bg-[#1c2128] border border-[#30363d] focus:border-[#ff4444]/60 focus:ring-1 focus:ring-[#ff4444]/20 rounded-xl px-4 py-3 text-[#e6edf3] text-sm placeholder-[#484f58] resize-none outline-none transition-all"
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${bio.length < 10 ? 'text-[#484f58]' : 'text-[#8b949e]'}`}>
            {bio.length} characters
          </span>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>

      {/* Example snippets */}
      <div>
        <p className="text-[#484f58] text-xs mb-2 font-medium uppercase tracking-wider">Quick examples</p>
        <div className="flex flex-wrap gap-2">
          {[
            'I make funny meme videos and love to joke around with my audience.',
            'I\'m a finance professional sharing investment tips in a clear, data-driven way.',
            'I create cooking tutorials and always appreciate my viewers\' kind words.',
          ].map((ex, i) => (
            <button
              key={i}
              onClick={() => setBio(ex)}
              className="text-xs text-[#8b949e] hover:text-white bg-[#1c2128] hover:bg-[#252b34] border border-[#30363d] px-3 py-1.5 rounded-lg transition-colors text-left"
            >
              "{ex.slice(0, 45)}…"
            </button>
          ))}
        </div>
      </div>

      <button
        id="analyze-bio-btn"
        onClick={handleAnalyze}
        disabled={loading || bio.trim().length < 10}
        className="flex items-center justify-center gap-2 bg-[#ff4444] hover:bg-[#ff2222] disabled:opacity-40 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all w-full"
      >
        {loading
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing your persona…</>
          : <><span>✨</span> Analyze My Persona</>
        }
      </button>
    </div>
  )
}

// ─── Confirm & Name Step (Step 2) ─────────────────────────────────────────────

function ConfirmStep({ analysis, editingPersona, onSave, onBack }) {
  const [name, setName]               = useState(editingPersona?.name ?? '')
  const [tone, setTone]               = useState(analysis.tone ?? editingPersona?.tone ?? 'neutral')
  const [systemPrompt, setSystemPrompt] = useState(analysis.systemPrompt ?? editingPersona?.systemPrompt ?? '')
  const [isDefault, setIsDefault]     = useState(editingPersona?.isDefault ?? false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)

  async function handleSave() {
    if (!name.trim()) { setError('Please give this persona a name.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({ name: name.trim(), tone, systemPrompt, isDefault })
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save persona.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* AI result preview */}
      <div className="bg-gradient-to-br from-[#ff4444]/10 to-transparent border border-[#ff4444]/20 rounded-xl p-4">
        <p className="text-xs text-[#ff4444] font-semibold uppercase tracking-wider mb-3">✨ AI Analysis Result</p>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{TONE_META[tone]?.emoji}</span>
          <div>
            <p className="text-white text-sm font-semibold">Detected tone</p>
            <ToneBadge tone={tone} />
          </div>
        </div>
        {systemPrompt && (
          <p className="text-[#8b949e] text-xs leading-relaxed bg-[#1c2128] rounded-lg p-3 border border-[#30363d]">
            {systemPrompt}
          </p>
        )}
      </div>

      {/* Persona name */}
      <div>
        <label className="block text-white font-semibold text-sm mb-1.5">Persona Name <span className="text-red-400">*</span></label>
        <input
          id="persona-name"
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(null) }}
          placeholder="e.g. My Creator Voice, Professional Mode…"
          className="w-full bg-[#1c2128] border border-[#30363d] focus:border-[#ff4444]/60 focus:ring-1 focus:ring-[#ff4444]/20 rounded-xl px-4 py-2.5 text-[#e6edf3] text-sm placeholder-[#484f58] outline-none transition-all"
        />
      </div>

      {/* Override tone */}
      <div>
        <label className="block text-white font-semibold text-sm mb-1.5">Tone <span className="text-[#484f58] font-normal text-xs">(override if needed)</span></label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TONE_META).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setTone(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                tone === key
                  ? `bg-gradient-to-r ${m.color} ${m.border} ${m.text}`
                  : 'bg-[#1c2128] border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#555]'
              }`}
            >
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* System prompt override */}
      <div>
        <label className="block text-white font-semibold text-sm mb-1.5">Reply Instructions <span className="text-[#484f58] font-normal text-xs">(optional, editable)</span></label>
        <textarea
          id="persona-prompt"
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          rows={4}
          className="w-full bg-[#1c2128] border border-[#30363d] focus:border-[#ff4444]/60 focus:ring-1 focus:ring-[#ff4444]/20 rounded-xl px-4 py-3 text-[#e6edf3] text-sm placeholder-[#484f58] resize-none outline-none transition-all"
        />
      </div>

      {/* Set as default */}
      <label className="flex items-center gap-3 cursor-pointer select-none group">
        <div
          onClick={() => setIsDefault(v => !v)}
          className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isDefault ? 'bg-[#ff4444]' : 'bg-[#30363d]'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isDefault ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
        <span className="text-sm text-[#8b949e] group-hover:text-white transition-colors">Set as default persona</span>
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 text-sm text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#555] px-4 py-2.5 rounded-xl transition-colors"
        >
          ← Back
        </button>
        <button
          id="save-persona-btn"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 flex items-center justify-center gap-2 bg-[#ff4444] hover:bg-[#ff2222] disabled:opacity-40 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
        >
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
            : editingPersona ? '💾 Update Persona' : '🚀 Create Persona'
          }
        </button>
      </div>
    </div>
  )
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function PersonaModal({ editingPersona, onClose, onSaved }) {
  // If editing, jump straight to step 2 with existing data
  const [step, setStep]         = useState(editingPersona ? 2 : 1)
  const [analysis, setAnalysis] = useState(
    editingPersona
      ? { tone: editingPersona.tone, systemPrompt: editingPersona.systemPrompt, bio: '' }
      : null
  )

  function handleAnalyzed(result) {
    setAnalysis(result)
    setStep(2)
  }

  async function handleSave(fields) {
    if (editingPersona) {
      await updatePersona(editingPersona._id, fields)
    } else {
      await createPersona(fields)
    }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <div>
            <h2 className="text-white font-bold text-base">
              {editingPersona ? 'Edit Persona' : 'Create Persona'}
            </h2>
            {!editingPersona && (
              <div className="flex items-center gap-2 mt-1.5">
                {[1, 2].map(s => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      step >= s ? 'w-8 bg-[#ff4444]' : 'w-4 bg-[#30363d]'
                    }`}
                  />
                ))}
                <span className="text-[#484f58] text-xs ml-1">Step {step} of 2</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white text-lg transition-colors">✕</button>
        </div>

        <div className="p-5">
          {step === 1 && <BioStep onAnalyzed={handleAnalyzed} />}
          {step === 2 && analysis && (
            <ConfirmStep
              analysis={analysis}
              editingPersona={editingPersona}
              onSave={handleSave}
              onBack={() => setStep(1)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PersonasPage() {
  const [personas, setPersonas]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editingPersona, setEditing]  = useState(null)

  async function load() {
    try {
      const res = await listPersonas()
      setPersonas(res.data ?? [])
    } catch {
      setPersonas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setShowModal(true) }
  function openEdit(p)  { setEditing(p);    setShowModal(true) }
  function closeModal() { setShowModal(false); setEditing(null) }

  async function handleDelete(id) {
    await deletePersona(id)
    setPersonas(prev => prev.filter(p => p._id !== id))
  }

  async function handleSetDefault(persona) {
    await updatePersona(persona._id, { isDefault: true })
    await load()
  }

  const defaultPersona = personas.find(p => p.isDefault)

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Personas</h1>
          <p className="text-[#8b949e] text-sm mt-1">
            Define how the AI replies on your behalf — based on your personality and style.
          </p>
        </div>
        <button
          id="create-persona-btn"
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#ff4444] hover:bg-[#ff2222] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shrink-0"
        >
          <span>+</span> New Persona
        </button>
      </div>

      {/* ── Default banner ── */}
      {defaultPersona && (
        <div className="bg-gradient-to-r from-[#ff4444]/10 to-transparent border border-[#ff4444]/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <span className="text-2xl">{TONE_META[defaultPersona.tone]?.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#ff4444] font-semibold uppercase tracking-wider mb-0.5">Active Default Persona</p>
            <p className="text-white font-semibold text-sm">{defaultPersona.name}</p>
            <p className="text-[#8b949e] text-xs truncate">{defaultPersona.systemPrompt}</p>
          </div>
          <ToneBadge tone={defaultPersona.tone} />
        </div>
      )}

      {/* ── Persona grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#1c2128]" />
                <div className="flex-1 flex flex-col gap-2 py-1">
                  <div className="h-4 bg-[#1c2128] rounded w-2/3" />
                  <div className="h-3 bg-[#1c2128] rounded w-1/3" />
                </div>
              </div>
              <div className="h-16 bg-[#1c2128] rounded-lg" />
            </div>
          ))}
        </div>
      ) : personas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-6xl mb-4">🎭</span>
          <h2 className="text-white font-bold text-xl mb-2">No Personas Yet</h2>
          <p className="text-[#8b949e] text-sm max-w-sm mb-6">
            Create your first persona by describing yourself — the AI will figure out the rest.
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#ff4444] hover:bg-[#ff2222] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all"
          >
            ✨ Create My First Persona
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personas.map(p => (
            <PersonaCard
              key={p._id}
              persona={p}
              onEdit={openEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <PersonaModal
          editingPersona={editingPersona}
          onClose={closeModal}
          onSaved={load}
        />
      )}
    </div>
  )
}
