import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Profile } from '@/lib/supabase'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single<Profile>()
  if (profile?.role !== 'admin') return new Response('Prohibido', { status: 403 })

  const body = await req.json()
  const { error } = await admin.from('aliados').insert(body)
  if (error) return new Response(error.message, { status: 500 })
  return new Response('OK', { status: 201 })
}
