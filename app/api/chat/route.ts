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

  if (propiedad.active === false) {
    return new Response('Esta propiedad no tiene AMA activo actualmente.', { status: 403 })
  }

  const { data: aliados } = await supabaseAdmin
    .from('aliados')
    .select('*')
    .eq('city', propiedad.city)
    .eq('active', true)
    .returns<Aliado[]>()

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
