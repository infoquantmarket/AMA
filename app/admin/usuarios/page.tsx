'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, ShieldCheck, Home } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type UserRow = {
  id: string
  email: string
  role: 'admin' | 'host'
  propiedad_id: string | null
  propiedad_name: string | null
}

type Propiedad = { id: string; host_name: string; city: string }

const EMPTY = { email: '', password: '', role: 'host' as 'admin' | 'host', propiedad_id: '' }

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const supabase = createSupabaseBrowserClient()

  const load = async () => {
    const res = await fetch('/api/admin/usuarios')
    if (res.ok) setUsers(await res.json())
  }

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? ''))
    supabase.from('propiedades').select('id, host_name, city').order('city').then(({ data }) =>
      setPropiedades((data as Propiedad[]) ?? [])
    )
  }, [])

  const handleCreate = async () => {
    setError('')
    setSuccess('')
    if (!form.email || !form.password) { setError('Email y contraseña son obligatorios'); return }
    if (form.role === 'host' && !form.propiedad_id) { setError('Selecciona una propiedad para el host'); return }
    setSaving(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setSuccess(`Usuario ${form.email} creado correctamente`)
      setForm(EMPTY)
      setCreating(false)
      load()
    } else {
      setError(await res.text())
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`¿Eliminar usuario ${email}? Esta acción no se puede deshacer.`)) return
    setDeletingId(id)
    await fetch(`/api/admin/usuarios/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    load()
  }

  const admins = users.filter(u => u.role === 'admin')
  const hosts = users.filter(u => u.role === 'host')

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Usuarios</h1>
          <p className="text-gray-500 text-xs mt-0.5">Gestiona accesos al panel de administración</p>
        </div>
        <button
          onClick={() => { setCreating(true); setError(''); setSuccess('') }}
          className="flex items-center gap-2 bg-amber-500 text-black text-sm font-semibold px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />Nuevo usuario
        </button>
      </div>

      {/* Formulario de creación */}
      {creating && (
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-amber-500/30 space-y-4">
          <h2 className="text-sm font-semibold text-white">Crear nuevo usuario</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="usuario@email.com"
                className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Contraseña temporal</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50" />
            </div>
          </div>

          {/* Selector de rol */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Rol</label>
            <div className="flex gap-3">
              <button
                onClick={() => setForm(p => ({ ...p, role: 'admin', propiedad_id: '' }))}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${form.role === 'admin' ? 'border-amber-500/60 bg-amber-500/10 text-amber-400' : 'border-white/10 text-gray-400 hover:border-white/20'}`}
              >
                <ShieldCheck className="w-4 h-4" />
                <div className="text-left">
                  <p className="font-semibold">Admin</p>
                  <p className="text-xs opacity-70">Acceso total al panel</p>
                </div>
              </button>
              <button
                onClick={() => setForm(p => ({ ...p, role: 'host' }))}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${form.role === 'host' ? 'border-blue-500/60 bg-blue-500/10 text-blue-400' : 'border-white/10 text-gray-400 hover:border-white/20'}`}
              >
                <Home className="w-4 h-4" />
                <div className="text-left">
                  <p className="font-semibold">Host</p>
                  <p className="text-xs opacity-70">Solo su propiedad</p>
                </div>
              </button>
            </div>
          </div>

          {/* Selector de propiedad (solo para host) */}
          {form.role === 'host' && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Propiedad asignada</label>
              <select value={form.propiedad_id} onChange={e => setForm(p => ({ ...p, propiedad_id: e.target.value }))}
                className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50">
                <option value="">Selecciona una propiedad…</option>
                {propiedades.map(p => (
                  <option key={p.id} value={p.id}>{p.host_name} — {p.city}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={handleCreate} disabled={saving}
              className="flex items-center gap-2 bg-amber-500 text-black font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear usuario
            </button>
            <button onClick={() => { setCreating(false); setError('') }}
              className="text-gray-400 text-sm px-4 py-2 hover:text-white">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <p className="text-emerald-400 text-sm">✓ {success}</p>
        </div>
      )}

      {/* Admins */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Administradores</h2>
          <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{admins.length}</span>
        </div>
        <div className="space-y-2">
          {admins.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-[#1a1f2e] rounded-xl px-4 py-3 border border-white/10">
              <div>
                <p className="text-white text-sm font-medium">{u.email}</p>
                <p className="text-amber-400/60 text-xs mt-0.5">Acceso total</p>
              </div>
              {u.id !== currentUserId ? (
                <button onClick={() => handleDelete(u.id, u.email)} disabled={deletingId === u.id}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1">
                  {deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              ) : (
                <span className="text-xs text-gray-600 px-2">tú</span>
              )}
            </div>
          ))}
          {admins.length === 0 && <p className="text-gray-600 text-xs">Sin admins registrados</p>}
        </div>
      </div>

      {/* Hosts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Home className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Hosts</h2>
          <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{hosts.length}</span>
        </div>
        <div className="space-y-2">
          {hosts.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-[#1a1f2e] rounded-xl px-4 py-3 border border-white/10">
              <div>
                <p className="text-white text-sm font-medium">{u.email}</p>
                <p className="text-blue-400/60 text-xs mt-0.5">
                  {u.propiedad_name ? `Propiedad: ${u.propiedad_name}` : 'Sin propiedad asignada'}
                </p>
              </div>
              <button onClick={() => handleDelete(u.id, u.email)} disabled={deletingId === u.id}
                className="text-gray-600 hover:text-red-400 transition-colors p-1">
                {deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
          {hosts.length === 0 && <p className="text-gray-600 text-xs">Sin hosts registrados</p>}
        </div>
      </div>
    </div>
  )
}
