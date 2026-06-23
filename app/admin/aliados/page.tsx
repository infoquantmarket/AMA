'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import type { Aliado } from '@/lib/supabase'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const EMPTY: Omit<Aliado, 'id'> = {
  city: '', category: '', business_name: '', ai_description: '',
  whatsapp_number: '', website_url: '', commission_type: 'fixed',
  commission_value: 0, promotion: '', active: true,
}

export default function AliadosPage() {
  const [aliados, setAliados] = useState<Aliado[]>([])
  const [editing, setEditing] = useState<Aliado | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Omit<Aliado, 'id'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterCity, setFilterCity] = useState('')

  const supabase = createSupabaseBrowserClient()

  const load = async () => {
    const { data } = await supabase.from('aliados').select('*').order('city')
    setAliados((data as Aliado[]) ?? [])
  }

  useEffect(() => { load() }, [])

  const cities = [...new Set(aliados.map(a => a.city))].sort()
  const filtered = filterCity ? aliados.filter(a => a.city === filterCity) : aliados

  const handleSave = async () => {
    setSaving(true)
    if (editing) {
      await fetch(`/api/admin/aliados/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/admin/aliados', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
    }
    setSaving(false)
    setEditing(null)
    setCreating(false)
    setForm(EMPTY)
    load()
  }

  const toggleActive = async (aliado: Aliado) => {
    await fetch(`/api/admin/aliados/${aliado.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !aliado.active }),
    })
    load()
  }

  const startEdit = (a: Aliado) => {
    setEditing(a)
    setCreating(false)
    const { id: _id, ...rest } = a
    setForm(rest)
  }

  const F = ({ label, field, textarea = false, type = 'text' }: {
    label: string; field: keyof typeof form; textarea?: boolean; type?: string
  }) => (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      {textarea ? (
        <textarea value={form[field] as string} rows={2}
          onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50 resize-none" />
      ) : (
        <input type={type} value={form[field] as string | number}
          onChange={e => setForm(p => ({ ...p, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50" />
      )}
    </div>
  )

  const showForm = creating || editing

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Aliados</h1>
        <button onClick={() => { setCreating(true); setEditing(null); setForm(EMPTY) }}
          className="flex items-center gap-2 bg-amber-500 text-black text-sm font-semibold px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" />Nuevo
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCity('')}
          className={`text-xs px-3 py-1 rounded-full border ${!filterCity ? 'border-amber-500 text-amber-400' : 'border-white/10 text-gray-400'}`}>Todos</button>
        {cities.map(c => (
          <button key={c} onClick={() => setFilterCity(c)}
            className={`text-xs px-3 py-1 rounded-full border ${filterCity === c ? 'border-amber-500 text-amber-400' : 'border-white/10 text-gray-400'}`}>{c}</button>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-amber-500/30 space-y-3">
          <h2 className="text-sm font-semibold text-white">{editing ? 'Editar aliado' : 'Nuevo aliado'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <F label="Ciudad" field="city" />
            <F label="Categoría" field="category" />
            <F label="Nombre del negocio" field="business_name" />
            <F label="WhatsApp (ej: 573001234567)" field="whatsapp_number" />
          </div>
          <F label="Descripción para la IA" field="ai_description" textarea />
          <F label="Promoción exclusiva AMA (opcional)" field="promotion" textarea />
          <F label="Sitio web / reserva (opcional)" field="website_url" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo de comisión</label>
              <select value={form.commission_type}
                onChange={e => setForm(p => ({ ...p, commission_type: e.target.value as 'fixed' | 'percentage' | 'membership' }))}
                className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="fixed">Por comisión ($)</option>
                <option value="percentage">Por comisión (%)</option>
                <option value="membership">Membresía mensual ($)</option>
              </select>
            </div>
            <F label="Valor comisión" field="commission_value" type="number" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-amber-500 text-black font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Guardar
            </button>
            <button onClick={() => { setEditing(null); setCreating(false) }}
              className="text-gray-400 text-sm px-4 py-2">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(a => (
          <div key={a.id} className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-sm font-medium">{a.business_name}</span>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{a.category}</span>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{a.city}</span>
              </div>
              <p className="text-gray-400 text-xs mt-1 line-clamp-1">{a.ai_description}</p>
              {a.promotion && <p className="text-amber-400 text-xs mt-1">🎁 {a.promotion}</p>}
              <p className="text-gray-500 text-xs mt-1">
                {a.commission_type === 'membership'
                  ? `Membresía: $${a.commission_value}/mes`
                  : a.commission_type === 'percentage'
                  ? `Comisión: ${a.commission_value}%`
                  : `Comisión: $${a.commission_value}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-white"><Pencil className="w-4 h-4" /></button>
              <div className="flex gap-1">
                <button onClick={() => a.active || toggleActive(a)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${a.active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'text-gray-500 border-white/10 hover:border-white/20'}`}>
                  Activo
                </button>
                <button onClick={() => !a.active || toggleActive(a)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${!a.active ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'text-gray-500 border-white/10 hover:border-white/20'}`}>
                  Inactivo
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
