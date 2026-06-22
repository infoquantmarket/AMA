import { createClient } from '@supabase/supabase-js'

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

// Lazy: el cliente se crea solo cuando se llama, no al importar el módulo
// Esto evita el error "supabaseUrl is required" en build time
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
