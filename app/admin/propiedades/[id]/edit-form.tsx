'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import type { Propiedad } from '@/lib/supabase'

type Props = { propiedad: Propiedad; role: 'admin' | 'host' }

export default function EditForm({ propiedad, role }: Props) {
  const router = useRouter()
  const [data, setData] = useState(propiedad)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const set = (key: keyof Propiedad, value: string | boolean) =>
    setData(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const res = await fetch(`/api/admin/propiedades/${propiedad.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      setMessage('Guardado correctamente')
      router.refresh()
    } else {
      setMessage('Error al guardar')
    }
  }

  const Field = ({ label, field, readOnly = false, textarea = false }: {
    label: string; field: keyof Propiedad; readOnly?: boolean; textarea?: boolean
  }) => (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      {textarea ? (
        <textarea value={data[field] as string} onChange={e => set(field, e.target.value)}
          disabled={readOnly} rows={3}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50 disabled:opacity-40 resize-none" />
      ) : (
        <input type="text" value={data[field] as string} onChange={e => set(field, e.target.value)}
          disabled={readOnly}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50 disabled:opacity-40" />
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-lg">
      {role === 'admin' && (
        <section className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 space-y-4">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Control del negocio</h2>
          <Field label="ID de la propiedad" field="id" readOnly />
          <Field label="Ciudad" field="city" />
          <Field label="Zona" field="address_zone" />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Estado</label>
            <div className="flex gap-2">
              <button onClick={() => set('active', true)}
                className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors border ${data.active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'text-gray-500 border-white/10 hover:border-white/20'}`}>
                ● Activa
              </button>
              <button onClick={() => set('active', false)}
                className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors border ${!data.active ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'text-gray-500 border-white/10 hover:border-white/20'}`}>
                ○ Inactiva
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 space-y-4">
        <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Información operativa</h2>
        <Field label="Nombre del anfitrión / propiedad" field="host_name" />
        <Field label="Red WiFi" field="wifi_network" />
        <Field label="Contraseña WiFi" field="wifi_password" />
        <Field label="Reglas de la casa" field="house_rules" textarea />
        <Field label="Contacto de emergencia / portería" field="emergency_contact" />
        <Field label="Mensaje de bienvenida (opcional)" field="welcome_message" textarea />
      </section>

      {message && (
        <p className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>
      )}

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-amber-500 text-black font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar cambios
      </button>
    </div>
  )
}
