import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin, type Profile, type Lead } from '@/lib/supabase'
import { TrendingUp, Building2, Users, DollarSign } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (profile?.role !== 'admin') redirect(`/admin/propiedades/${profile?.propiedad_id}`)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: leads } = await admin
    .from('registro_leads')
    .select('*, propiedades(host_name, city), aliados(business_name, commission_type, commission_value)')
    .gte('created_at', startOfMonth)
    .order('created_at', { ascending: false })
    .returns<Lead[]>()

  const leadsData = leads ?? []

  const ingresos = leadsData.reduce((sum, lead) => sum + (lead.aliados?.commission_value ?? 0), 0)

  const aliadoCount: Record<string, { name: string; count: number }> = {}
  leadsData.forEach(l => {
    if (l.aliado_id) {
      const name = l.aliados?.business_name ?? l.aliado_id
      aliadoCount[l.aliado_id] = { name, count: (aliadoCount[l.aliado_id]?.count ?? 0) + 1 }
    }
  })
  const topAliado = Object.values(aliadoCount).sort((a, b) => b.count - a.count)[0]

  const propCount: Record<string, { name: string; count: number }> = {}
  leadsData.forEach(l => {
    if (l.propiedad_id) {
      const name = l.propiedades?.host_name ?? l.propiedad_id
      propCount[l.propiedad_id] = { name, count: (propCount[l.propiedad_id]?.count ?? 0) + 1 }
    }
  })
  const topProp = Object.values(propCount).sort((a, b) => b.count - a.count)[0]

  const top5Aliados = Object.values(aliadoCount).sort((a, b) => b.count - a.count).slice(0, 5)
  const top5Props = Object.values(propCount).sort((a, b) => b.count - a.count).slice(0, 5)

  const { data: todosAliados } = await admin.from('aliados').select('id, business_name').eq('active', true)
  const aliadosConClicks = new Set(Object.keys(aliadoCount))
  const aliadosSinClicks = (todosAliados ?? []).filter((a: { id: string; business_name: string }) => !aliadosConClicks.has(a.id))

  const cards = [
    { label: 'Clicks este mes', value: leadsData.length, icon: TrendingUp, color: 'text-amber-400' },
    { label: 'Ingresos estimados', value: `$${ingresos.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Propiedad más activa', value: topProp?.name ?? '—', icon: Building2, color: 'text-blue-400' },
    { label: 'Aliado más clickeado', value: topAliado?.name ?? '—', icon: Users, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10">
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className="text-gray-400 text-xs">{label}</p>
            <p className="text-white font-semibold text-sm mt-1 truncate">{String(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10">
          <h2 className="text-sm font-semibold text-white mb-3">Top 5 Aliados</h2>
          {top5Aliados.length === 0 ? <p className="text-gray-500 text-xs">Sin datos aún</p> : (
            <ol className="space-y-2">
              {top5Aliados.map((a, i) => (
                <li key={a.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400"><span className="text-amber-400 font-mono mr-2">{i + 1}.</span>{a.name}</span>
                  <span className="text-white font-semibold">{a.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10">
          <h2 className="text-sm font-semibold text-white mb-3">Top 5 Propiedades</h2>
          {top5Props.length === 0 ? <p className="text-gray-500 text-xs">Sin datos aún</p> : (
            <ol className="space-y-2">
              {top5Props.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400"><span className="text-blue-400 font-mono mr-2">{i + 1}.</span>{p.name}</span>
                  <span className="text-white font-semibold">{p.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10">
          <h2 className="text-sm font-semibold text-white mb-3">⚠️ Sin clicks este mes</h2>
          {aliadosSinClicks.length === 0 ? <p className="text-emerald-400 text-xs">¡Todos los aliados tienen clicks!</p> : (
            <ul className="space-y-1">
              {aliadosSinClicks.map((a: { id: string; business_name: string }) => (
                <li key={a.id} className="text-gray-400 text-xs">• {a.business_name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Leads recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 px-4 py-2 font-normal">Fecha</th>
                <th className="text-left text-gray-400 px-4 py-2 font-normal">Propiedad</th>
                <th className="text-left text-gray-400 px-4 py-2 font-normal">Aliado</th>
                <th className="text-left text-gray-400 px-4 py-2 font-normal">Tipo</th>
                <th className="text-left text-gray-400 px-4 py-2 font-normal">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {leadsData.slice(0, 20).map(lead => (
                <tr key={lead.id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-2 text-white">{lead.propiedades?.host_name ?? lead.propiedad_id}</td>
                  <td className="px-4 py-2 text-white">{lead.aliados?.business_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${lead.click_type === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {lead.click_type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-amber-400">${lead.aliados?.commission_value ?? 0}</td>
                </tr>
              ))}
              {leadsData.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Sin leads este mes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
