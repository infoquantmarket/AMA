# Admin Panel AMA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un panel admin mobile-first con dos roles (admin/host), dashboard de analytics, CRUD de propiedades y aliados, y sistema de tracking de clicks en links de WhatsApp/web.

**Architecture:** Next.js App Router con Supabase Auth para sesiones y RLS para permisos. El admin panel vive en `/admin/*` con middleware que protege rutas por rol. El tracking de clicks usa una ruta API que registra el lead antes de redirigir.

**Tech Stack:** Next.js 16 App Router, Supabase Auth + Supabase JS, Tailwind CSS, Lucide React

---

## File Map

**Nuevos archivos:**
- `app/admin/login/page.tsx` — página de login
- `app/admin/layout.tsx` — layout con nav sidebar para admin
- `app/admin/dashboard/page.tsx` — analytics globales (solo admin)
- `app/admin/propiedades/page.tsx` — lista de propiedades (solo admin)
- `app/admin/propiedades/[id]/page.tsx` — editar propiedad (admin + host)
- `app/admin/aliados/page.tsx` — CRUD aliados (solo admin)
- `app/admin/leads/page.tsx` — tabla de leads + analytics (solo admin)
- `app/api/track/route.ts` — tracking de clicks
- `lib/supabase-browser.ts` — cliente Supabase para componentes client-side
- `middleware.ts` — protección de rutas por sesión y rol

**Modificar:**
- `lib/supabase.ts` — agregar tipos nuevos
- `app/api/chat/route.ts` — incluir promotion, tracking links, emergency_contact, welcome_message, verificar active
- `supabase/schema.sql` — agregar migraciones

---

## Task 1: Migraciones de Base de Datos en Supabase

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Agregar SQL de migración al final de schema.sql**

Ir a Supabase Dashboard → SQL Editor → New Query y ejecutar:

```sql
-- Modificar tabla propiedades
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS emergency_contact TEXT NOT NULL DEFAULT '';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS welcome_message TEXT NOT NULL DEFAULT '';

-- Modificar tabla aliados
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS website_url TEXT DEFAULT '';
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'fixed';
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0;
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS promotion TEXT DEFAULT '';
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Modificar tabla registro_leads
ALTER TABLE registro_leads ADD COLUMN IF NOT EXISTS click_type TEXT DEFAULT 'whatsapp';

-- Crear tabla profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'host',
  propiedad_id TEXT REFERENCES propiedades(id)
);

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Política: aliados son visibles para todos los autenticados (el agente los necesita)
CREATE POLICY "Authenticated can read aliados"
  ON aliados FOR SELECT
  TO authenticated
  USING (true);

-- Política: propiedades visibles para service role y para el host dueño
CREATE POLICY "Host can read own propiedad"
  ON propiedades FOR SELECT
  USING (true);

CREATE POLICY "Host can update own propiedad fields"
  ON propiedades FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.propiedad_id = propiedades.id
    )
  );
```

- [ ] **Step 2: Verificar en Table Editor que las columnas se crearon**

En Supabase → Table Editor → propiedades: verificar columnas `active`, `emergency_contact`, `welcome_message`.
En aliados: verificar `website_url`, `commission_type`, `commission_value`, `promotion`, `active`.
En registro_leads: verificar `click_type`.
Verificar tabla `profiles` existe.

- [ ] **Step 3: Actualizar schema.sql local con las migraciones**

Agregar al final de `supabase/schema.sql`:

```sql
-- =============================================
-- MIGRACIÓN: Panel Admin (2026-06-22)
-- =============================================
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS emergency_contact TEXT NOT NULL DEFAULT '';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS welcome_message TEXT NOT NULL DEFAULT '';

ALTER TABLE aliados ADD COLUMN IF NOT EXISTS website_url TEXT DEFAULT '';
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'fixed';
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0;
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS promotion TEXT DEFAULT '';
ALTER TABLE aliados ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

ALTER TABLE registro_leads ADD COLUMN IF NOT EXISTS click_type TEXT DEFAULT 'whatsapp';

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'host',
  propiedad_id TEXT REFERENCES propiedades(id)
);
```

- [ ] **Step 4: Crear usuario admin en Supabase**

Supabase → Authentication → Users → "Invite user" con tu email.
Luego en SQL Editor:
```sql
INSERT INTO profiles (id, role, propiedad_id)
SELECT id, 'admin', NULL
FROM auth.users
WHERE email = 'tu-email@ejemplo.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql
git commit -m "chore: add admin panel DB migrations to schema"
```

---

## Task 2: Actualizar Tipos y Cliente Supabase

**Files:**
- Modify: `lib/supabase.ts`
- Create: `lib/supabase-browser.ts`

- [ ] **Step 1: Actualizar tipos en lib/supabase.ts**

Reemplazar el contenido de `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export type Propiedad = {
  id: string
  host_name: string
  city: string
  address_zone: string
  wifi_network: string
  wifi_password: string
  house_rules: string
  active: boolean
  emergency_contact: string
  welcome_message: string
}

export type Aliado = {
  id: string
  city: string
  category: string
  business_name: string
  ai_description: string
  whatsapp_number: string
  website_url: string
  commission_type: 'percentage' | 'fixed'
  commission_value: number
  promotion: string
  active: boolean
}

export type Lead = {
  id: string
  created_at: string
  propiedad_id: string
  aliado_id: string
  click_type: 'whatsapp' | 'website'
  propiedades?: { host_name: string; city: string }
  aliados?: { business_name: string; commission_type: string; commission_value: number }
}

export type Profile = {
  id: string
  role: 'admin' | 'host'
  propiedad_id: string | null
}

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 2: Crear lib/supabase-browser.ts**

```typescript
import { createBrowserClient } from '@supabase/ssr'

// Cliente para componentes 'use client' — usa anon key pública
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Instalar @supabase/ssr**

```bash
cd C:\Users\EQUIPO\.claude\projects\ama
npm install @supabase/ssr
```

- [ ] **Step 4: Agregar NEXT_PUBLIC_SUPABASE_ANON_KEY a .env.local**

En Supabase → Settings → API → Project API Keys → copiar `anon public` key.
Agregar al `.env.local`:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

También agregar en Vercel → proyecto ama → Settings → Environment Variables.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts lib/supabase-browser.ts
git commit -m "feat: update supabase types and add browser client"
```

---

## Task 3: Middleware de Protección de Rutas

**Files:**
- Create: `middleware.ts`
- Create: `lib/supabase-server.ts`

- [ ] **Step 1: Crear lib/supabase-server.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente para Server Components y Route Handlers con cookies de sesión
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 2: Crear middleware.ts en la raíz del proyecto**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Redirigir a login si no está autenticado y accede a /admin (excepto /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Redirigir al dashboard si ya está autenticado e intenta ir al login
  if (pathname === '/admin/login' && user) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd C:\Users\EQUIPO\.claude\projects\ama
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts lib/supabase-server.ts lib/supabase-browser.ts
git commit -m "feat: add route protection middleware and server supabase client"
```

---

## Task 4: Página de Login

**Files:**
- Create: `app/admin/login/page.tsx`

- [ ] **Step 1: Crear app/admin/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl font-bold text-black mx-auto mb-3">
            A
          </div>
          <h1 className="text-white text-xl font-semibold">AMA Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Panel de administración</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#1a1f2e] text-white border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#1a1f2e] text-white border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-black font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/login/page.tsx
git commit -m "feat: add admin login page"
```

---

## Task 5: Layout del Admin con Navegación

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/nav.tsx`

- [ ] **Step 1: Crear app/admin/nav.tsx**

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, Users, BarChart2, LogOut, X, Menu } from 'lucide-react'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/propiedades', label: 'Propiedades', icon: Building2 },
  { href: '/admin/aliados', label: 'Aliados', icon: Users },
  { href: '/admin/leads', label: 'Leads', icon: BarChart2 },
]

type Props = { role: 'admin' | 'host'; propiedadId?: string | null }

export default function AdminNav({ role, propiedadId }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const links = role === 'admin' ? adminLinks : [
    { href: `/admin/propiedades/${propiedadId}`, label: 'Mi Propiedad', icon: Building2 },
  ]

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#1a1f2e] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-black">A</div>
          <span className="text-white text-sm font-semibold">AMA Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-gray-400">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-[#1a1f2e] border-b border-white/10 px-4 py-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === href ? 'bg-amber-500/10 text-amber-400' : 'text-gray-400 hover:text-white'}`}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-red-400 w-full">
            <LogOut className="w-4 h-4" />Cerrar sesión
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-[#1a1f2e] border-r border-white/10 min-h-screen p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">A</div>
          <span className="text-white font-semibold">AMA Admin</span>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === href ? 'bg-amber-500/10 text-amber-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-red-400 mt-4">
          <LogOut className="w-4 h-4" />Cerrar sesión
        </button>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Crear app/admin/layout.tsx**

```typescript
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin, type Profile } from '@/lib/supabase'
import AdminNav from './nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-[#0d1117] text-white lg:flex">
      <AdminNav role={profile.role} propiedadId={profile.propiedad_id} />
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx app/admin/nav.tsx
git commit -m "feat: add admin layout with role-based navigation"
```

---

## Task 6: API de Tracking de Clicks

**Files:**
- Create: `app/api/track/route.ts`

- [ ] **Step 1: Crear app/api/track/route.ts**

```typescript
import { getSupabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const aliadoId = searchParams.get('aliado')
  const propiedadId = searchParams.get('propiedad')
  const clickType = searchParams.get('type') as 'whatsapp' | 'website' | null

  if (!aliadoId || !propiedadId || !clickType) {
    return new Response('Parámetros faltantes', { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Registrar el lead
  await supabase.from('registro_leads').insert({
    propiedad_id: propiedadId,
    aliado_id: aliadoId,
    click_type: clickType,
  })

  // Obtener destino del aliado
  const { data: aliado } = await supabase
    .from('aliados')
    .select('whatsapp_number, website_url, business_name')
    .eq('id', aliadoId)
    .single()

  if (!aliado) {
    return new Response('Aliado no encontrado', { status: 404 })
  }

  // Obtener nombre de la propiedad para el mensaje de WhatsApp
  const { data: propiedad } = await supabase
    .from('propiedades')
    .select('host_name')
    .eq('id', propiedadId)
    .single()

  const hostName = propiedad?.host_name ?? 'AMA'

  if (clickType === 'whatsapp') {
    const msg = encodeURIComponent(`Hola, vengo de parte de AMA desde la propiedad ${hostName} y necesito sus servicios`)
    return redirect(`https://wa.me/${aliado.whatsapp_number}?text=${msg}`)
  }

  if (clickType === 'website' && aliado.website_url) {
    return redirect(aliado.website_url)
  }

  return new Response('Destino no configurado', { status: 400 })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/track/route.ts
git commit -m "feat: add click tracking API with lead registration"
```

---

## Task 7: Actualizar Route Handler del Chat

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Actualizar app/api/chat/route.ts**

Reemplazar el contenido completo:

```typescript
import { openai } from '@ai-sdk/openai'
import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { getSupabaseAdmin, type Aliado, type Propiedad } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { messages, propertyId }: { messages: UIMessage[]; propertyId: string } = await req.json()

  if (!propertyId) {
    return new Response('Falta el parámetro propertyId', { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: propiedad, error: propError } = await supabaseAdmin
    .from('propiedades')
    .select('*')
    .eq('id', propertyId)
    .single<Propiedad>()

  if (propError || !propiedad) {
    return new Response('Propiedad no encontrada', { status: 404 })
  }

  // Si la propiedad está inactiva, no responder
  if (propiedad.active === false) {
    return new Response('Esta propiedad no tiene AMA activo actualmente.', { status: 403 })
  }

  const { data: aliados } = await supabaseAdmin
    .from('aliados')
    .select('*')
    .eq('city', propiedad.city)
    .eq('active', true)
    .returns<Aliado[]>()

  // Base URL para links de tracking
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://project-i8q9f.vercel.app'

  const aliadosTexto =
    aliados && aliados.length > 0
      ? aliados.map((a) => {
          const waLink = `${baseUrl}/api/track?aliado=${a.id}&propiedad=${propertyId}&type=whatsapp`
          const webLink = a.website_url
            ? `${baseUrl}/api/track?aliado=${a.id}&propiedad=${propertyId}&type=website`
            : null
          const promoTexto = a.promotion ? ` 🎁 PROMOCIÓN EXCLUSIVA AMA: ${a.promotion}` : ''
          const webTexto = webLink ? ` | [Ver sitio web / Reservar](${webLink})` : ''
          return `- ${a.category}: *${a.business_name}* — ${a.ai_description}${promoTexto} | [Contactar por WhatsApp](${waLink})${webTexto}`
        }).join('\n')
      : 'No hay aliados registrados para esta ciudad aún.'

  const systemPrompt = `Eres AMA, el concierge de lujo de la propiedad "${propiedad.host_name}" ubicada en ${propiedad.city}.

INFORMACIÓN DE LA PROPIEDAD:
- Zona: ${propiedad.address_zone}
- WiFi: ${propiedad.wifi_network} / Contraseña: ${propiedad.wifi_password}
- Reglas de la casa: ${propiedad.house_rules}
- Emergencias / Portería: ${propiedad.emergency_contact || 'Consultar con el anfitrión'}
${propiedad.welcome_message ? `- Mensaje del anfitrión: ${propiedad.welcome_message}` : ''}

ALIADOS DISPONIBLES EN ${propiedad.city.toUpperCase()} (usa SIEMPRE estos links — no inventes otros):
${aliadosTexto}

====== REGLAS CRÍTICAS ======

1. LÍMITE DE TEMA: Solo puedes hablar sobre turismo local en ${propiedad.city}, recomendaciones de aliados, emergencias y reglas de la propiedad.

2. PROTECCIÓN: Si el usuario pregunta sobre política, matemáticas, ensayos, programación, historia mundial o cualquier tema fuera del turismo, responde EXACTAMENTE:
   "Lo siento, como tu concierge local, solo estoy capacitado para ayudarte con tu estadía. ¿Necesitas alguna recomendación de la ciudad?"

3. RESPUESTAS CORTAS: Usa viñetas (•) y emojis. Máximo 3-4 líneas. Respuestas ágiles para generar conversiones rápidas.

4. LINKS OBLIGATORIOS: Cuando recomiendes un aliado, SIEMPRE incluye el link de WhatsApp y el de web si existe. Los links ya están formateados arriba — úsalos exactamente como aparecen.

5. PROMOCIONES: Si el aliado tiene promoción, menciónala siempre para generar engagement.

6. IDIOMA: Responde en el idioma del huésped.

7. TONO: Amable, cálido, concierge de lujo. No chatbot genérico.`

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 300,
    temperature: 0.3,
  })

  return result.toUIMessageStreamResponse()
}
```

- [ ] **Step 2: Agregar NEXT_PUBLIC_BASE_URL a .env.local**

```
NEXT_PUBLIC_BASE_URL=https://project-i8q9f.vercel.app
```

También agregar en Vercel → Environment Variables.

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: update chat route with tracking links, promotions, emergency contact"
```

---

## Task 8: Dashboard de Analytics (Admin)

**Files:**
- Create: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Crear app/admin/dashboard/page.tsx**

```typescript
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

  // Rango del mes actual
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Leads del mes
  const { data: leads } = await admin
    .from('registro_leads')
    .select('*, propiedades(host_name, city), aliados(business_name, commission_type, commission_value)')
    .gte('created_at', startOfMonth)
    .order('created_at', { ascending: false })
    .returns<Lead[]>()

  const leadsData = leads ?? []

  // Ingresos estimados
  const ingresos = leadsData.reduce((sum, lead) => {
    const v = lead.aliados?.commission_value ?? 0
    return sum + v
  }, 0)

  // Aliado más clickeado
  const aliadoCount: Record<string, { name: string; count: number }> = {}
  leadsData.forEach(l => {
    if (l.aliado_id) {
      const name = l.aliados?.business_name ?? l.aliado_id
      aliadoCount[l.aliado_id] = { name, count: (aliadoCount[l.aliado_id]?.count ?? 0) + 1 }
    }
  })
  const topAliado = Object.values(aliadoCount).sort((a, b) => b.count - a.count)[0]

  // Propiedad más activa
  const propCount: Record<string, { name: string; count: number }> = {}
  leadsData.forEach(l => {
    if (l.propiedad_id) {
      const name = l.propiedades?.host_name ?? l.propiedad_id
      propCount[l.propiedad_id] = { name, count: (propCount[l.propiedad_id]?.count ?? 0) + 1 }
    }
  })
  const topProp = Object.values(propCount).sort((a, b) => b.count - a.count)[0]

  // Top 5 aliados
  const top5Aliados = Object.values(aliadoCount).sort((a, b) => b.count - a.count).slice(0, 5)

  // Top 5 propiedades
  const top5Props = Object.values(propCount).sort((a, b) => b.count - a.count).slice(0, 5)

  // Aliados con 0 clicks
  const { data: todosAliados } = await admin.from('aliados').select('id, business_name').eq('active', true)
  const aliadosConClicks = new Set(Object.keys(aliadoCount))
  const aliadosSinClicks = (todosAliados ?? []).filter(a => !aliadosConClicks.has(a.id))

  const cards = [
    { label: 'Clicks este mes', value: leadsData.length, icon: TrendingUp, color: 'text-amber-400' },
    { label: 'Ingresos estimados', value: `$${ingresos.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Propiedad más activa', value: topProp?.name ?? '—', icon: Building2, color: 'text-blue-400' },
    { label: 'Aliado más clickeado', value: topAliado?.name ?? '—', icon: Users, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10">
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className="text-gray-400 text-xs">{label}</p>
            <p className="text-white font-semibold text-sm mt-1 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Rankings */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top aliados */}
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

        {/* Top propiedades */}
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

        {/* Aliados sin clicks */}
        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10">
          <h2 className="text-sm font-semibold text-white mb-3">⚠️ Sin clicks este mes</h2>
          {aliadosSinClicks.length === 0 ? <p className="text-emerald-400 text-xs">¡Todos los aliados tienen clicks!</p> : (
            <ul className="space-y-1">
              {aliadosSinClicks.map(a => (
                <li key={a.id} className="text-gray-400 text-xs">• {a.business_name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tabla de leads recientes */}
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
                <tr key={lead.id} className="border-b border-white/5 hover:bg-white/2">
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
                  <td className="px-4 py-2 text-amber-400">
                    ${lead.aliados?.commission_value ?? 0}
                  </td>
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/dashboard/page.tsx
git commit -m "feat: add admin analytics dashboard"
```

---

## Task 9: Lista y Gestión de Propiedades (Admin)

**Files:**
- Create: `app/admin/propiedades/page.tsx`
- Create: `app/admin/propiedades/[id]/page.tsx`
- Create: `app/admin/propiedades/[id]/edit-form.tsx`

- [ ] **Step 1: Crear app/admin/propiedades/page.tsx**

```typescript
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

  // Agrupar por ciudad
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
                className="flex items-center justify-between bg-[#1a1f2e] rounded-xl p-4 border border-white/10 hover:border-amber-500/30 transition-colors">
                <div>
                  <p className="text-white text-sm font-medium">{p.host_name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{p.address_zone} · ID: {p.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  {p.active
                    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                    : <XCircle className="w-4 h-4 text-red-400" />}
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
```

- [ ] **Step 2: Crear app/admin/propiedades/[id]/edit-form.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import type { Propiedad } from '@/lib/supabase'

type Props = {
  propiedad: Propiedad
  role: 'admin' | 'host'
}

export default function EditForm({ propiedad, role }: Props) {
  const router = useRouter()
  const [data, setData] = useState(propiedad)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const set = (key: keyof Propiedad, value: string | boolean) =>
    setData(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const res = await fetch(`/api/admin/propiedades/${propiedad.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      setMessage('Guardado correctamente')
      router.refresh()
    } else {
      setMessage('Error al guardar')
    }
  }

  const Field = ({ label, field, readOnly = false, textarea = false }: {
    label: string; field: keyof Propiedad; readOnly?: boolean; textarea?: boolean
  }) => (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      {textarea ? (
        <textarea
          value={data[field] as string}
          onChange={e => set(field, e.target.value)}
          disabled={readOnly}
          rows={3}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50 disabled:opacity-40 resize-none"
        />
      ) : (
        <input
          type="text"
          value={data[field] as string}
          onChange={e => set(field, e.target.value)}
          disabled={readOnly}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50 disabled:opacity-40"
        />
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-lg">
      {/* Campos solo admin */}
      {role === 'admin' && (
        <section className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 space-y-4">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Control del negocio</h2>
          <Field label="ID de la propiedad" field="id" readOnly />
          <Field label="Ciudad" field="city" />
          <Field label="Zona" field="address_zone" />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Estado</label>
            <button
              onClick={() => set('active', !data.active)}
              className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${data.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
            >
              {data.active ? '● Activa' : '○ Inactiva'}
            </button>
          </div>
        </section>
      )}

      {/* Campos del anfitrión */}
      <section className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 space-y-4">
        <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Información operativa</h2>
        <Field label="Nombre del anfitrión / propiedad" field="host_name" />
        <Field label="Red WiFi" field="wifi_network" />
        <Field label="Contraseña WiFi" field="wifi_password" />
        <Field label="Reglas de la casa" field="house_rules" textarea />
        <Field label="Contacto de emergencia / portería" field="emergency_contact" />
        <Field label="Mensaje de bienvenida (opcional)" field="welcome_message" textarea />
      </section>

      {message && (
        <p className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
          {message}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-amber-500 text-black font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar cambios
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Crear app/admin/propiedades/[id]/page.tsx**

```typescript
import { redirect, notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin, type Profile, type Propiedad } from '@/lib/supabase'
import EditForm from './edit-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function PropiedadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single<Profile>()

  // Host solo puede ver su propiedad
  if (profile?.role === 'host' && profile.propiedad_id !== id) {
    redirect(`/admin/propiedades/${profile.propiedad_id}`)
  }

  const { data: propiedad } = await admin
    .from('propiedades')
    .select('*')
    .eq('id', id)
    .single<Propiedad>()

  if (!propiedad) notFound()

  return (
    <div className="space-y-6">
      {profile?.role === 'admin' && (
        <Link href="/admin/propiedades" className="flex items-center gap-2 text-gray-400 text-sm hover:text-white">
          <ArrowLeft className="w-4 h-4" />Volver a propiedades
        </Link>
      )}
      <h1 className="text-xl font-semibold text-white">{propiedad.host_name}</h1>
      <EditForm propiedad={propiedad} role={profile?.role ?? 'host'} />
    </div>
  )
}
```

- [ ] **Step 4: Crear app/api/admin/propiedades/[id]/route.ts**

```typescript
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

  // Campos que el host puede editar
  const hostFields = ['host_name', 'wifi_network', 'wifi_password', 'house_rules', 'emergency_contact', 'welcome_message']
  // Campos adicionales que solo admin puede editar
  const adminFields = ['city', 'address_zone', 'active']

  const allowedFields = profile?.role === 'admin'
    ? [...hostFields, ...adminFields]
    : hostFields

  const update: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) update[field] = body[field]
  }

  const { error } = await admin.from('propiedades').update(update).eq('id', id)
  if (error) return new Response(error.message, { status: 500 })

  return new Response('OK')
}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/propiedades/ app/api/admin/
git commit -m "feat: add properties list and edit pages with role-based fields"
```

---

## Task 10: CRUD de Aliados (Admin)

**Files:**
- Create: `app/admin/aliados/page.tsx`
- Create: `app/api/admin/aliados/route.ts`
- Create: `app/api/admin/aliados/[id]/route.ts`

- [ ] **Step 1: Crear app/api/admin/aliados/route.ts**

```typescript
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
```

- [ ] **Step 2: Crear app/api/admin/aliados/[id]/route.ts**

```typescript
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
```

- [ ] **Step 3: Crear app/admin/aliados/page.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import type { Aliado } from '@/lib/supabase'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const EMPTY: Omit<Aliado, 'id'> = {
  city: '', category: '', business_name: '', ai_description: '',
  whatsapp_number: '', website_url: '', commission_type: 'fixed',
  commission_value: 0, promotion: '', active: true,
}

export default function AliadosPage() {
  const [aliados, setAliados] = useState<Aliado[]>([])
  const [editing, setEditing] = useState<Aliado | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Omit<Aliado, 'id'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterCity, setFilterCity] = useState('')

  const supabase = createSupabaseBrowserClient()

  const load = async () => {
    const { data } = await supabase.from('aliados').select('*').order('city')
    setAliados((data as Aliado[]) ?? [])
  }

  useEffect(() => { load() }, [])

  const cities = [...new Set(aliados.map(a => a.city))].sort()
  const filtered = filterCity ? aliados.filter(a => a.city === filterCity) : aliados

  const handleSave = async () => {
    setSaving(true)
    if (editing) {
      await fetch(`/api/admin/aliados/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/admin/aliados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setSaving(false)
    setEditing(null)
    setCreating(false)
    setForm(EMPTY)
    load()
  }

  const toggleActive = async (aliado: Aliado) => {
    await fetch(`/api/admin/aliados/${aliado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !aliado.active }),
    })
    load()
  }

  const startEdit = (a: Aliado) => {
    setEditing(a)
    setCreating(false)
    const { id, ...rest } = a
    setForm(rest)
  }

  const F = ({ label, field, textarea = false, type = 'text' }: {
    label: string; field: keyof typeof form; textarea?: boolean; type?: string
  }) => (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      {textarea ? (
        <textarea value={form[field] as string} rows={2} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50 resize-none" />
      ) : (
        <input type={type} value={form[field] as string | number} onChange={e => setForm(p => ({ ...p, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
          className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500/50" />
      )}
    </div>
  )

  const showForm = creating || editing

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Aliados</h1>
        <button onClick={() => { setCreating(true); setEditing(null); setForm(EMPTY) }}
          className="flex items-center gap-2 bg-amber-500 text-black text-sm font-semibold px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" />Nuevo
        </button>
      </div>

      {/* Filtro por ciudad */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCity('')} className={`text-xs px-3 py-1 rounded-full border ${!filterCity ? 'border-amber-500 text-amber-400' : 'border-white/10 text-gray-400'}`}>Todos</button>
        {cities.map(c => (
          <button key={c} onClick={() => setFilterCity(c)} className={`text-xs px-3 py-1 rounded-full border ${filterCity === c ? 'border-amber-500 text-amber-400' : 'border-white/10 text-gray-400'}`}>{c}</button>
        ))}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-amber-500/30 space-y-3">
          <h2 className="text-sm font-semibold text-white">{editing ? 'Editar aliado' : 'Nuevo aliado'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <F label="Ciudad" field="city" />
            <F label="Categoría" field="category" />
            <F label="Nombre del negocio" field="business_name" />
            <F label="WhatsApp (ej: 573001234567)" field="whatsapp_number" />
          </div>
          <F label="Descripción para la IA" field="ai_description" textarea />
          <F label="Promoción exclusiva AMA (opcional)" field="promotion" textarea />
          <F label="Sitio web / reserva (opcional)" field="website_url" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo de comisión</label>
              <select value={form.commission_type} onChange={e => setForm(p => ({ ...p, commission_type: e.target.value as 'fixed' | 'percentage' }))}
                className="w-full bg-[#0d1117] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="fixed">Fijo ($)</option>
                <option value="percentage">Porcentaje (%)</option>
              </select>
            </div>
            <F label="Valor comisión" field="commission_value" type="number" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-amber-500 text-black font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Guardar
            </button>
            <button onClick={() => { setEditing(null); setCreating(false) }}
              className="text-gray-400 text-sm px-4 py-2">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {filtered.map(a => (
          <div key={a.id} className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-sm font-medium">{a.business_name}</span>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{a.category}</span>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{a.city}</span>
              </div>
              <p className="text-gray-400 text-xs mt-1 line-clamp-1">{a.ai_description}</p>
              {a.promotion && <p className="text-amber-400 text-xs mt-1">🎁 {a.promotion}</p>}
              <p className="text-gray-500 text-xs mt-1">Comisión: ${a.commission_value} {a.commission_type === 'percentage' ? '%' : 'fijo'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-white"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => toggleActive(a)} className={a.active ? 'text-emerald-400' : 'text-gray-600'}>
                {a.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/aliados/ app/api/admin/aliados/
git commit -m "feat: add aliados CRUD with city filter and commission tracking"
```

---

## Task 11: Página de Leads y Deploy Final

**Files:**
- Create: `app/admin/leads/page.tsx`

- [ ] **Step 1: Crear app/admin/leads/page.tsx**

```typescript
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
                <tr key={lead.id} className="border-b border-white/5 hover:bg-white/2">
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
```

- [ ] **Step 2: Verificar TypeScript final**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Commit y push a producción**

```bash
git add app/admin/leads/ app/admin/dashboard/ app/admin/propiedades/ app/admin/aliados/ app/api/ middleware.ts lib/
git commit -m "feat: complete admin panel with dashboard, properties, aliados, leads and tracking"
git push
```

- [ ] **Step 4: Agregar variables de entorno en Vercel**

En Vercel → proyecto ama → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key de Supabase
- `NEXT_PUBLIC_BASE_URL` = `https://project-i8q9f.vercel.app`

- [ ] **Step 5: Verificar en producción**

Abrir `https://project-i8q9f.vercel.app/admin/login` y verificar que:
- Login funciona con el usuario admin creado
- Dashboard muestra las cards
- Propiedades lista agrupada por ciudad
- Aliados con CRUD funcional
- Leads vacío (se irá llenando con clicks)
