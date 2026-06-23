import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Profile } from '@/lib/supabase'

async function requireAdmin(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single<Profile>()
  return data?.role === 'admin'
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const admin = getSupabaseAdmin()
  if (!(await requireAdmin(admin, user.id))) return new Response('Prohibido', { status: 403 })

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, role, propiedad_id, propiedades(host_name)')
    .order('role')

  const { data: authUsers } = await admin.auth.admin.listUsers()

  const merged = (profiles ?? []).map((p: {
    id: string; role: string; propiedad_id: string | null;
    propiedades: { host_name: string }[] | { host_name: string } | null
  }) => {
    const authUser = authUsers.users.find(u => u.id === p.id)
    const prop = Array.isArray(p.propiedades) ? p.propiedades[0] : p.propiedades
    return {
      id: p.id,
      email: authUser?.email ?? '—',
      role: p.role,
      propiedad_id: p.propiedad_id,
      propiedad_name: prop?.host_name ?? null,
    }
  })

  return Response.json(merged)
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const admin = getSupabaseAdmin()
  if (!(await requireAdmin(admin, user.id))) return new Response('Prohibido', { status: 403 })

  const { email, password, role, propiedad_id } = await req.json()

  if (!email || !password || !role) return new Response('Faltan campos', { status: 400 })
  if (role === 'host' && !propiedad_id) return new Response('El host debe tener una propiedad asignada', { status: 400 })

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !created.user) return new Response(authError?.message ?? 'Error al crear usuario', { status: 500 })

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    role,
    propiedad_id: role === 'host' ? propiedad_id : null,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return new Response(profileError.message, { status: 500 })
  }

  return Response.json({ id: created.user.id, email, role })
}
