import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin, type Profile } from '@/lib/supabase'
import AdminNav from './nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <>{children}</>
  }

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white lg:flex">
      <AdminNav role={profile.role} propiedadId={profile.propiedad_id} />
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
