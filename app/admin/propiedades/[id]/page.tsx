import { redirect, notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin, type Profile, type Propiedad } from '@/lib/supabase'
import EditForm from './edit-form'
import QRButton from './qr-button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function PropiedadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single<Profile>()

  if (profile?.role === 'host' && profile.propiedad_id !== id) {
    redirect(`/admin/propiedades/${profile.propiedad_id}`)
  }

  const { data: propiedad } = await admin
    .from('propiedades').select('*').eq('id', id).single<Propiedad>()

  if (!propiedad) notFound()

  return (
    <div className="space-y-6">
      {profile?.role === 'admin' && (
        <Link href="/admin/propiedades" className="flex items-center gap-2 text-gray-400 text-sm hover:text-white">
          <ArrowLeft className="w-4 h-4" />Volver a propiedades
        </Link>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-white">{propiedad.host_name}</h1>
        <QRButton propiedadId={propiedad.id} propiedadName={propiedad.host_name} />
      </div>
      <EditForm propiedad={propiedad} role={profile?.role ?? 'host'} />
    </div>
  )
}
