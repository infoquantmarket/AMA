import { createClient } from '@supabase/supabase-js'

// Cliente con service role para uso exclusivo en el servidor (Route Handlers)
// NUNCA exponer SUPABASE_SERVICE_ROLE_KEY en el cliente
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Propiedad = {
  id: string
  host_name: string
  city: string
  address_zone: string
  wifi_network: string
  wifi_password: string
  house_rules: string
}

export type Aliado = {
  id: string
  city: string
  category: string
  business_name: string
  ai_description: string
  whatsapp_number: string
}
