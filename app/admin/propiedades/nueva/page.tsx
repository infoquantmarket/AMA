'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

const EMPTY = {
  id: '',
  host_name: '',
  city: '',
  address_zone: '',
  wifi_network: '',
  wifi_password: '',
  house_rules: '',
  emergency_contact: '',
  welcome_message: '',
  active: true,
}

export default function NuevaPropiedadPage() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof EMPTY, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.id || !form.host_name || !form.city) {
      setError('ID, nombre y ciudad son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/propiedades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      router.push(`/admin/propiedades/${form.id}`)
    } else {
      const text = await res.text()
      setError(text || 'Error al crear la propiedad')
    }
  }

  const Field = ({ label, field, textarea = false, placeholder = '' }: {
    label: string; field: keyof typeof EMPTY; textarea?: boolean; placeholder?: string
  }) => (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      {textarea ? (
        <textarea value={form[field] as string} rows={3} placeholder={placeholder}
          onChange={e => set(field, e.target.value)}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50 resize-none" />
      ) : (
        <input type="text" value={form[field] as string} placeholder={placeholder}
          onChange={e => set(field, e.target.value)}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50" />
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/admin/propiedades" className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-semibold text-white">Nueva propiedad</h1>
      </div>

      <section className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 space-y-4">
        <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Identificación</h2>
        <Field label="ID único (ej: casa-pedro-poblado-01)" field="id" placeholder="sin espacios, todo minúsculas" />
        <Field label="Nombre de la propiedad" field="host_name" placeholder="ej: Casa Pedro en El Poblado" />
        <Field label="Ciudad" field="city" placeholder="ej: Medellín" />
        <Field label="Zona / dirección" field="address_zone" placeholder="ej: El Poblado, Calle 10 #43D-20" />
      </section>

      <section className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 space-y-4">
        <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Información operativa</h2>
        <Field label="Red WiFi" field="wifi_network" />
        <Field label="Contraseña WiFi" field="wifi_password" />
        <Field label="Reglas de la casa" field="house_rules" textarea placeholder="No fumar, silencio después de las 11pm..." />
        <Field label="Contacto de emergencia / portería" field="emergency_contact" placeholder="ej: +57 300 123 4567" />
        <Field label="Mensaje de bienvenida (opcional)" field="welcome_message" textarea placeholder="Bienvenido a nuestra propiedad..." />
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Estado inicial</label>
          <button onClick={() => set('active', !form.active)}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${form.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {form.active ? '● Activa' : '○ Inactiva'}
          </button>
        </div>
      </section>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-amber-500 text-black font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Crear propiedad
      </button>
    </div>
  )
}
