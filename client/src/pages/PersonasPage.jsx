import { useState, useEffect } from 'react'
import {
  listPersonas,
  createPersona,
  updatePersona,
  deletePersona,
  analyzePersona,
} from '../api/personas'

const TONE_META = {
  friendly:      { emoji: '😊', label: 'Friendly',      color: 'from-green-500/20 to-green-500/5',   border: 'border-green-500/30',   text: 'text-green-400'   },
  professional:  { emoji: '💼', label: 'Professional',  color: 'from-blue-500/20 to-blue-500/5',    border: 'border-blue-500/30',   text: 'text-blue-400'    },
  humorous:      { emoji: '😂', label: 'Humorous',      color: 'from-yellow-500/20 to-yellow-500/5',border: 'border-yellow-500/30', text: 'text-yellow-400' },
  promotional:   { emoji: '📣', label: 'Promotional',   color: 'from-orange-500/20 to-orange-500/5',border: 'border-orange-500/30', text: 'text-orange-400' },
  appreciative:  { emoji: '🙏', label: 'Appreciative',  color: 'from-pink-500/20 to-pink-500/5',    border: 'border-pink-500/30',   text: 'text-pink-400'    },
  informative:   { emoji: '📚', label: 'Informative',   color: 'from-cyan-500/20 to-cyan-500/5',    border: 'border-cyan-500/30',   text: 'text-cyan-400'    },
  supportive:    { emoji: '🤝', label: 'Supportive',    color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-400' },
  apologetic:    { emoji: '😔', label: 'Apologetic',    color: 'from-red-500/20 to-red-500/5',      border: 'border-red-500/30',    text: 'text-red-400'    },
  neutral:       { emoji: '😐', label: 'Neutral',       color: 'from-gray-500/20 to-gray-500/5',    border: 'border-gray-500/30',   text: 'text-gray-400'   },
}

function ToneBadge({ tone }) {
  const m = TONE_META[tone] ?? TONE_META.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-3 py-1 rounded-full border font-black uppercase tracking-widest bg-gradient-to-r shadow-sm ${m.color} ${m.border} ${m.text}`}>
      {m.emoji} {m.label}
    </span>
  )
}

function PersonaCard({ persona, onEdit, onDelete, onSetDefault, index }) {
  const [deleting, setDeleting] = useState(false)
  const m = TONE_META[persona.tone] ?? TONE_META.neutral

  async function handleDelete() {
    if (!confirm(`Delete persona "${persona.name}"?`)) return
    setDeleting(true)
    try { await onDelete(persona._id) } finally { setDeleting(false) }
  }

  return (
    <div 
      style={{ animationDelay: `${index * 100}ms` }}
      className={`relative group bg-[#161b22]/40 backdrop-blur-md border rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 fill-mode-both ${
        persona.isDefault ? 'border-[#ff4444] shadow-[0_0_20px_rgba(255,68,68,0.1)]' : 'border-[#30363d] hover:border-[#ff4444]/40'
      }`}
    >
      {persona.isDefault && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#ff4444] rounded-full animate-pulse shadow-[0_0_8px_#ff4444]" />
            <span className="text-[10px] font-black text-[#ff4444] tracking-[0.2em]">ACTIVE</span>
        </div>
      )}

      <div className="flex items-center gap-4 mb-5">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 duration-300 shadow-inner bg-gradient-to-br ${m.color}`}>
          {m.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-black text-base tracking-tight truncate uppercase">{persona.name}</h3>
          <div className="mt-1"><ToneBadge tone={persona.tone} /></div>
        </div>
      </div>

      {persona.systemPrompt && (
        <div className="relative mb-6">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#30363d] rounded-full group-hover:bg-[#ff4444]/50 transition-colors" />
            <p className="text-[#8b949e] text-xs leading-relaxed line-clamp-3 pl-4 italic">
              "{persona.systemPrompt}"
            </p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-auto pt-4 border-t border-[#30363d]/50">
        {!persona.isDefault && (
          <button
            onClick={() => onSetDefault(persona)}
            className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] hover:text-white bg-white/5 px-4 py-2 rounded-lg transition-all active:scale-95"
          >
            Set Default
          </button>
        )}
        <button
          onClick={() => onEdit(persona)}
          className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] hover:text-white bg-white/5 px-4 py-2 rounded-lg transition-all active:scale-95"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-white hover:bg-red-500 border border-red-500/20 px-4 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-40 ml-auto"
        >
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function BioStep({ onAnalyzed }) {
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAnalyze() {
    if (bio.trim().length < 10) { setError('Minimum 10 characters required.'); return }
    setLoading(true); setError(null)
    try {
      const result = await analyzePersona(bio.trim())
      onAnalyzed({ bio: bio.trim(), ...result })
    } catch (e) { setError('Analysis failed. Try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-[#0d1117] rounded-2xl p-6 border border-[#30363d] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff4444]/5 blur-3xl" />
        <label className="block text-white font-black text-xs uppercase tracking-[0.2em] mb-4">Identity Description</label>
        <textarea
          value={bio}
          onChange={e => { setBio(e.target.value); setError(null) }}
          placeholder="Describe your unique style, audience, and personality..."
          rows={6}
          className="w-full bg-transparent text-[#e6edf3] text-sm leading-relaxed placeholder-[#484f58] resize-none outline-none transition-all"
        />
        <div className="flex justify-between mt-4 pt-4 border-t border-[#30363d]">
             <span className="text-[10px] font-bold text-[#484f58] uppercase tracking-widest">{bio.length} chars</span>
             {error && <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{error}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[#484f58] text-[10px] font-black uppercase tracking-[0.3em]">Presets</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Funny meme creator with a sarcastic edge.',
            'Educational tech pro making deep dives.',
            'Supportive coach celebrating viewer wins.',
          ].map((ex, i) => (
            <button key={i} onClick={() => setBio(ex)} className="text-[10px] font-bold text-[#8b949e] hover:text-white bg-white/5 border border-[#30363d] px-4 py-2 rounded-xl transition-all active:scale-95 italic">
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || bio.trim().length < 10}
        className="group flex items-center justify-center gap-3 bg-[#ff4444] hover:bg-[#ff6666] disabled:opacity-40 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-xl shadow-[#ff4444]/20 active:scale-95"
      >
        {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✨ Calibrate Identity'}
      </button>
    </div>
  )
}

function ConfirmStep({ analysis, editingPersona, onSave, onBack }) {
  const [name, setName] = useState(editingPersona?.name ?? '')
  const [tone, setTone] = useState(analysis.tone ?? editingPersona?.tone ?? 'neutral')
  const [systemPrompt, setSystemPrompt] = useState(analysis.systemPrompt ?? editingPersona?.systemPrompt ?? '')
  const [isDefault, setIsDefault] = useState(editingPersona?.isDefault ?? false)
  const [saving, setSaving] = useState(false)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="bg-gradient-to-br from-[#ff4444]/10 to-transparent border border-[#ff4444]/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -bottom-4 -right-4 text-6xl opacity-10 rotate-12">{TONE_META[tone]?.emoji}</div>
        <p className="text-[10px] text-[#ff4444] font-black uppercase tracking-[0.2em] mb-4">AI Extraction Complete</p>
        <div className="flex items-center gap-4 mb-4">
             <ToneBadge tone={tone} />
             <div className="h-px flex-1 bg-[#ff4444]/20" />
        </div>
        <p className="text-[#8b949e] text-xs leading-relaxed italic border-l-2 border-[#ff4444]/30 pl-4">"{systemPrompt}"</p>
      </div>

      <div className="space-y-4">
          <div>
            <label className="block text-[#484f58] text-[10px] font-black uppercase tracking-widest mb-2">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Professional Mode" className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#ff4444] rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" />
          </div>

          <div>
            <label className="block text-[#484f58] text-[10px] font-black uppercase tracking-widest mb-3">Tone Calibration</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TONE_META).map(([key, m]) => (
                <button key={key} onClick={() => setTone(key)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${tone === key ? `bg-gradient-to-r ${m.color} ${m.border} ${m.text}` : 'bg-[#0d1117] border-[#30363d] text-[#8b949e]'}`}>
                  {m.emoji} <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#30363d]">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div onClick={() => setIsDefault(!isDefault)} className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${isDefault ? 'bg-[#ff4444]' : 'bg-[#30363d]'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isDefault ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] group-hover:text-white">Active Default</span>
          </label>
          <div className="flex gap-3">
             <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] hover:text-white px-4">Back</button>
             <button onClick={() => onSave({ name, tone, systemPrompt, isDefault })} className="bg-[#ff4444] hover:bg-[#ff6666] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#ff4444]/20 active:scale-95">
                {editingPersona ? 'Update' : 'Deploy'}
             </button>
          </div>
      </div>
    </div>
  )
}

function PersonaModal({ editingPersona, onClose, onSaved }) {
  const [step, setStep] = useState(editingPersona ? 2 : 1)
  const [analysis, setAnalysis] = useState(editingPersona ? { tone: editingPersona.tone, systemPrompt: editingPersona.systemPrompt, bio: '' } : null)

  const handleSave = async (fields) => {
    editingPersona ? await updatePersona(editingPersona._id, fields) : await createPersona(fields)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0d1117]/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-[#161b22] border border-[#30363d] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-[#30363d]">
          <h2 className="text-white font-black text-xs uppercase tracking-[0.3em]">{editingPersona ? 'Edit' : 'Create'} Identity</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {step === 1 ? <BioStep onAnalyzed={(r) => { setAnalysis(r); setStep(2) }} /> : <ConfirmStep analysis={analysis} editingPersona={editingPersona} onSave={handleSave} onBack={() => setStep(1)} />}
        </div>
      </div>
    </div>
  )
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState([]); const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false); const [editingPersona, setEditing] = useState(null)

  const load = async () => { try { const res = await listPersonas(); setPersonas(res.data ?? []) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto pb-20 relative">
      <div className="absolute -top-40 -left-20 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[#30363d]/50 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">Identity <span className="text-[#ff4444]">Calibration</span></h1>
          <p className="text-[#8b949e] font-medium mt-2">Personalize the DNA of your automated replies.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }} className="bg-[#ff4444] hover:bg-[#ff6666] text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl shadow-[#ff4444]/20 active:scale-95">
          + New Persona
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-[#161b22] rounded-3xl animate-pulse" />)}
        </div>
      ) : personas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-[#161b22] rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-2xl">🎭</div>
          <h2 className="text-white font-black text-2xl tracking-tight uppercase">No Personas Defined</h2>
          <p className="text-[#8b949e] font-medium mt-4 max-w-xs mx-auto">Build an identity to start generating personalized AI responses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map((p, idx) => (
            <PersonaCard key={p._id} index={idx} persona={p} onEdit={(p) => { setEditing(p); setShowModal(true) }} onDelete={async (id) => { await deletePersona(id); setPersonas(prev => prev.filter(x => x._id !== id)) }} onSetDefault={async (p) => { await updatePersona(p._id, { isDefault: true }); load() }} />
          ))}
        </div>
      )}

      {showModal && <PersonaModal editingPersona={editingPersona} onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  )
}