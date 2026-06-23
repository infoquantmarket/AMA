'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, Users, BarChart2, LogOut, X, Menu, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/propiedades', label: 'Propiedades', icon: Building2 },
  { href: '/admin/aliados', label: 'Aliados', icon: Users },
  { href: '/admin/leads', label: 'Leads', icon: BarChart2 },
  { href: '/admin/usuarios', label: 'Usuarios', icon: ShieldCheck },
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
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#1a1f2e] border-b border-white/10">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/AMAlogo_nb.png" alt="AMA" className="h-10 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        <button onClick={() => setOpen(!open)} className="text-gray-400">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

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

      <aside className="hidden lg:flex flex-col w-56 bg-[#1a1f2e] border-r border-white/10 min-h-screen p-4">
        <div className="pb-6 mb-6 border-b border-white/10 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/AMAlogo_nb.png" alt="AMA" className="w-full max-w-[180px] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
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
