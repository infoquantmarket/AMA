import { openai } from '@ai-sdk/openai'
import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { supabaseAdmin, type Aliado, type Propiedad } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { messages, propertyId }: { messages: UIMessage[]; propertyId: string } = await req.json()

  if (!propertyId) {
    return new Response('Falta el parámetro propertyId', { status: 400 })
  }

  // 1. Consultar la propiedad
  const { data: propiedad, error: propError } = await supabaseAdmin
    .from('propiedades')
    .select('*')
    .eq('id', propertyId)
    .single<Propiedad>()

  if (propError || !propiedad) {
    return new Response('Propiedad no encontrada', { status: 404 })
  }

  // 2. Consultar aliados de la misma ciudad
  const { data: aliados } = await supabaseAdmin
    .from('aliados')
    .select('*')
    .eq('city', propiedad.city)
    .returns<Aliado[]>()

  // 3. Construir sección de aliados para el system prompt
  const aliadosTexto =
    aliados && aliados.length > 0
      ? aliados
          .map(
            (a) =>
              `- ${a.category}: *${a.business_name}* — ${a.ai_description} | WhatsApp: ${a.whatsapp_number}`
          )
          .join('\n')
      : 'No hay aliados registrados para esta ciudad aún.'

  // 4. System prompt dinámico con restricciones de costo y comportamiento
  const hostEncoded = encodeURIComponent(propiedad.host_name)
  const systemPrompt = `Eres AMA, el concierge de lujo de la propiedad "${propiedad.host_name}" ubicada en ${propiedad.city}.

INFORMACIÓN DE LA PROPIEDAD:
- Zona: ${propiedad.address_zone}
- WiFi: ${propiedad.wifi_network} / Contraseña: ${propiedad.wifi_password}
- Reglas de la casa: ${propiedad.house_rules}

ALIADOS DISPONIBLES EN ${propiedad.city.toUpperCase()}:
${aliadosTexto}

====== REGLAS CRÍTICAS — DEBES SEGUIRLAS SIN EXCEPCIÓN ======

1. LÍMITE DE TEMA: Solo puedes hablar sobre turismo local en ${propiedad.city}, las recomendaciones de aliados de la base de datos, emergencias y reglas de la propiedad.

2. PROTECCIÓN TOTAL: Si el usuario pregunta sobre política, matemáticas, redacción de ensayos, programación, recetas de cocina o CUALQUIER tema fuera de tu rol de concierge local, responde EXACTAMENTE:
   "Lo siento, como tu concierge local, solo estoy capacitado para ayudarte con tu estadía. ¿Necesitas alguna recomendación de la ciudad?"

3. RESPUESTAS CORTAS: Sé extremadamente conciso. Usa viñetas (•). Máximo 3-4 líneas por respuesta.

4. MONETIZACIÓN: Cuando recomiendes un aliado, incluye el link de WhatsApp en formato Markdown:
   [Contactar a {business_name}](https://wa.me/{whatsapp_number}?text=Hola,%20soy%20huesped%20de%20${hostEncoded}%20(AMA)%20y%20necesito%20sus%20servicios)

5. IDIOMA: Responde siempre en el mismo idioma que el huésped te escribe.

6. TONO: Amable, cálido, profesional. Eres un concierge de lujo, no un chatbot genérico.`

  const result = streamText({
    model: openai('gpt-4o-mini'), // Económico y rápido — cambia a gpt-4o para más calidad
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 300, // Límite estricto de costo
    temperature: 0.3,     // Respuestas predecibles y consistentes
  })

  return result.toUIMessageStreamResponse()
}
