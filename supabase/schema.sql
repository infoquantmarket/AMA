-- =============================================
-- AMA — Schema de Base de Datos
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================

-- Tabla de propiedades
CREATE TABLE IF NOT EXISTS propiedades (
  id           TEXT PRIMARY KEY,           -- ej: "pedro-poblado-01"
  host_name    TEXT NOT NULL,              -- ej: "Casa Pedro en El Poblado"
  city         TEXT NOT NULL,              -- ej: "Medellín"
  address_zone TEXT NOT NULL,              -- ej: "El Poblado, Calle 10"
  wifi_network TEXT NOT NULL DEFAULT '',
  wifi_password TEXT NOT NULL DEFAULT '',
  house_rules  TEXT NOT NULL DEFAULT ''
);

-- Tabla de aliados comerciales
CREATE TABLE IF NOT EXISTS aliados (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city           TEXT NOT NULL,            -- debe coincidir con propiedades.city
  category       TEXT NOT NULL,            -- ej: "Restaurante", "Taxi", "Tours"
  business_name  TEXT NOT NULL,
  ai_description TEXT NOT NULL,            -- descripción que leerá el agente
  whatsapp_number TEXT NOT NULL            -- formato: 573001234567 (sin +, sin espacios)
);

-- Tabla de registro de leads (monetización)
CREATE TABLE IF NOT EXISTS registro_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  propiedad_id  TEXT REFERENCES propiedades(id),
  aliado_id     UUID REFERENCES aliados(id)
);

-- =============================================
-- DATOS DE PRUEBA
-- =============================================

INSERT INTO propiedades (id, host_name, city, address_zone, wifi_network, wifi_password, house_rules)
VALUES (
  'pedro-poblado-01',
  'Casa Pedro en El Poblado',
  'Medellín',
  'El Poblado, Calle 10 #43D-20',
  'CasaPedro_WiFi',
  'bienvenido2024',
  'No fumar dentro. Silencio después de las 11pm. No mascotas. Check-out: 12pm.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO aliados (city, category, business_name, ai_description, whatsapp_number)
VALUES
  ('Medellín', 'Restaurante', 'El Cielo', 'Restaurante de cocina molecular y experiencia gastronómica única en El Poblado. Reservas recomendadas.', '573001234567'),
  ('Medellín', 'Tours', 'Medellín City Tour', 'Tours en chiva por la ciudad, graffiti tour en la 70 y tour de Pablo Escobar. Recogen en el hotel.', '573009876543'),
  ('Medellín', 'Transporte', 'CityTaxi Medellín', 'Taxi seguro y confiable. Tarifas fijas al aeropuerto. Disponible 24/7.', '573005551234')
ON CONFLICT DO NOTHING;

-- RLS (Row Level Security) — el backend usa service_role key que bypasea RLS
-- Habilitar RLS para proteger acceso público directo
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliados ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_leads ENABLE ROW LEVEL SECURITY;

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
