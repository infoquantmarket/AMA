import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Profile } from '@/lib/supabase'

async function isAdmin(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single<Profile>()
  return data?.role === 'admin'
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const admin = getSupabaseAdmin()
  if (!(await isAdmin(admin, user.id))) return new Response('Prohibido', { status: 403 })

  const body = await req.json()
  const { error } = await admin.from('aliados').update(body).eq('id', id)
  if (error) return new Response(error.message, { status: 500 })
  return new Response('OK')
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const admin = getSupabaseAdmin()
  if (!(await isAdmin(admin, user.id))) return new Response('Prohibido', { status: 403 })

  const { error } = await admin.from('aliados').update({ active: false }).eq('id', id)
  if (error) return new Response(error.message, { status: 500 })
  return new Response('OK')
}
