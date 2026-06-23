import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Profile } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single<Profile>()

  const body = await req.json()
  const hostFields = ['host_name', 'wifi_network', 'wifi_password', 'house_rules', 'emergency_contact', 'welcome_message']
  const adminFields = ['city', 'address_zone', 'active']
  const allowedFields = profile?.role === 'admin' ? [...hostFields, ...adminFields] : hostFields

  const update: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) update[field] = body[field]
  }

  const { error } = await admin.from('propiedades').update(update).eq('id', id)
  if (error) return new Response(error.message, { status: 500 })
  return new Response('OK')
}
