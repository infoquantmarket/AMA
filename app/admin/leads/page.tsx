import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin, type Profile, type Lead } from '@/lib/supabase'

export default async function LeadsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (profile?.role !== 'admin') redirect(`/admin/propiedades/${profile?.propiedad_id}`)

  const { data: leads } = await admin
    .from('registro_leads')
    .select('*, propiedades(host_name, city), aliados(business_name, commission_type, commission_value)')
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<Lead[]>()

  const leadsData = leads ?? []
  const totalIngresos = leadsData.reduce((sum, l) => sum + (l.aliados?.commission_value ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Leads</h1>
        <div className="text-sm text-amber-400 font-semibold">
          Total estimado: ${totalIngresos.toLocaleString()}
        </div>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Fecha', 'Propiedad', 'Ciudad', 'Aliado', 'Tipo', 'Comisión'].map(h => (
                  <th key={h} className="text-left text-gray-400 px-4 py-3 font-normal whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leadsData.map(lead => (
                <tr key={lead.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                    {new Date(lead.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-white">{lead.propiedades?.host_name ?? lead.propiedad_id}</td>
                  <td className="px-4 py-3 text-gray-400">{lead.propiedades?.city ?? '—'}</td>
                  <td className="px-4 py-3 text-white">{lead.aliados?.business_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${lead.click_type === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {lead.click_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-amber-400">${lead.aliados?.commission_value ?? 0}</td>
                </tr>
              ))}
              {leadsData.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin leads registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
