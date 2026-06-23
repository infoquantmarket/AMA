import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin, type Profile, type Propiedad } from '@/lib/supabase'
import { Plus, CheckCircle, XCircle } from 'lucide-react'

export default async function PropiedadesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (profile?.role !== 'admin') redirect(`/admin/propiedades/${profile?.propiedad_id}`)

  const { data: propiedades } = await admin
    .from('propiedades')
    .select('*')
    .order('city')
    .returns<Propiedad[]>()

  const porCiudad = (propiedades ?? []).reduce<Record<string, Propiedad[]>>((acc, p) => {
    acc[p.city] = [...(acc[p.city] ?? []), p]
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Propiedades</h1>
        <Link href="/admin/propiedades/nueva" className="flex items-center gap-2 bg-amber-500 text-black text-sm font-semibold px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" />Nueva
        </Link>
      </div>

      {Object.entries(porCiudad).map(([ciudad, props]) => (
        <div key={ciudad}>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{ciudad}</h2>
          <div className="space-y-2">
            {props.map(p => (
              <Link key={p.id} href={`/admin/propiedades/${p.id}`}
                className={`flex items-center justify-between bg-[#1a1f2e] rounded-xl p-4 border transition-colors hover:border-amber-500/30
                  ${p.active ? 'border-white/10' : 'border-red-500/30 opacity-60'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">{p.host_name}</p>
                    {!p.active && <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">inactiva</span>}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{p.address_zone} · ID: {p.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  {p.active ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className="text-gray-500 text-xs">›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {(!propiedades || propiedades.length === 0) && (
        <p className="text-gray-500 text-sm">No hay propiedades registradas aún.</p>
      )}
    </div>
  )
}
