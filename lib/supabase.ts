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
  commission_type: 'percentage' | 'fixed' | 'membership'
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
