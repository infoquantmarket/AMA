# AMA Admin Panel — Design Spec
**Date:** 2026-06-22

## Overview
Panel de administración web para AMA (Ask Me Anything), un concierge digital B2B2C para propiedades de renta corta. El panel tiene dos niveles de acceso: administrador (dueño de AMA) y anfitrión (dueño del Airbnb). Mobile-first.

---

## 1. Autenticación y Roles

- **Proveedor:** Supabase Auth (email/password)
- **Tabla:** `profiles` con campos `id`, `role` ('admin'|'host'), `propiedad_id`
- **Rutas protegidas:** middleware Next.js verifica sesión y rol
- **Flujo:** `/admin/login` → detecta rol → redirige a dashboard correcto
  - Admin → `/admin/dashboard`
  - Host → `/admin/propiedad/[id]`

---

## 2. Estructura de Rutas

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/admin/login` | Público | Login con email/password |
| `/admin/dashboard` | Solo admin | Analytics globales |
| `/admin/propiedades` | Solo admin | Lista de propiedades, crear, activar/desactivar |
| `/admin/propiedades/[id]` | Admin + Host | Admin ve todo, host solo sus campos |
| `/admin/aliados` | Solo admin | CRUD aliados comerciales |
| `/admin/leads` | Solo admin | Tabla de leads + analytics |

---

## 3. Cambios en Base de Datos

### Tabla `propiedades` (modificar)
```sql
ALTER TABLE propiedades ADD COLUMN active BOOLEAN DEFAULT true;
ALTER TABLE propiedades ADD COLUMN emergency_contact TEXT NOT NULL DEFAULT '';
ALTER TABLE propiedades ADD COLUMN welcome_message TEXT NOT NULL DEFAULT '';
```

### Tabla `aliados` (modificar)
```sql
ALTER TABLE aliados ADD COLUMN website_url TEXT DEFAULT '';
ALTER TABLE aliados ADD COLUMN commission_type TEXT DEFAULT 'fixed'; -- 'percentage' | 'fixed'
ALTER TABLE aliados ADD COLUMN commission_value NUMERIC DEFAULT 0;
ALTER TABLE aliados ADD COLUMN promotion TEXT DEFAULT '';
ALTER TABLE aliados ADD COLUMN active BOOLEAN DEFAULT true;
```

### Tabla `registro_leads` (modificar)
```sql
ALTER TABLE registro_leads ADD COLUMN click_type TEXT DEFAULT 'whatsapp'; -- 'whatsapp' | 'website'
```

### Tabla `profiles` (nueva)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'host', -- 'admin' | 'host'
  propiedad_id TEXT REFERENCES propiedades(id)
);
```

### RLS Policies para `profiles`
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Admin puede ver todos los profiles
-- Host solo puede ver el suyo
```

---

## 4. Sistema de Tracking de Clicks

**Ruta API:** `GET /api/track?aliado=UUID&propiedad=ID&type=whatsapp|website`

Flujo:
1. Recibe parámetros
2. Inserta en `registro_leads` con `click_type`
3. Obtiene el aliado de Supabase
4. Redirige a `whatsapp_number` o `website_url` según `type`

El chat de AMA genera links así:
```
/api/track?aliado=UUID&propiedad=ID&type=whatsapp
/api/track?aliado=UUID&propiedad=ID&type=website
```

El system prompt del agente incluye la promoción del aliado cuando la mencione.

---

## 5. Permisos por Campo

### Campos que solo Admin puede editar:
- `active` (activar/desactivar propiedad)
- `id` (no editable nunca)
- `city`
- `address_zone`
- Gestión de aliados (toda la tabla `aliados`)

### Campos que Host puede editar:
- `host_name`
- `wifi_network`
- `wifi_password`
- `house_rules`
- `emergency_contact`
- `welcome_message`

---

## 6. Dashboard Admin — Analytics

### Cards superiores:
- Total clicks este mes
- Ingresos estimados (suma comisiones por leads del mes)
- Propiedad más activa
- Aliado más clickeado

### Gráfico:
- Clicks por día (últimos 30 días)

### Rankings:
- Top 5 aliados por clicks
- Top 5 propiedades por actividad
- Aliados con 0 clicks (candidatos a reemplazar)

### Tabla de leads:
- Fecha, propiedad, aliado, tipo click, comisión estimada

---

## 7. UI/UX

- **Mobile-first**, funciona en desktop también
- **Stack visual:** Tailwind CSS (ya instalado), sin librerías de UI adicionales
- **Color scheme:** oscuro (ya definido en el chat)
- **Navegación admin:** sidebar colapsable en mobile (hamburger)
- **Navegación host:** sin sidebar, solo header + formulario
- **Tabla de leads:** paginada, filtrable por ciudad/fecha

---

## 8. Cambios al System Prompt del Chat

El route handler `/api/chat/route.ts` debe incluir:
- `promotion` del aliado en la descripción inyectada al agente
- Links de tracking `/api/track?...` en lugar de links directos a WhatsApp
- Campo `emergency_contact` de la propiedad en el system prompt
- Campo `welcome_message` disponible para el agente
- Verificación de `active === true` antes de responder (si está inactivo, responder con mensaje de propiedad no disponible)
