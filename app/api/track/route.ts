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

  await supabase.from('registro_leads').insert({
    propiedad_id: propiedadId,
    aliado_id: aliadoId,
    click_type: clickType,
  })

  const { data: aliado } = await supabase
    .from('aliados')
    .select('whatsapp_number, website_url, business_name')
    .eq('id', aliadoId)
    .single()

  if (!aliado) {
    return new Response('Aliado no encontrado', { status: 404 })
  }

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
