# 🐾 Guía de Configuración e Instalación en Supabase — Paw Patita Cusco v5.0

Este directorio contiene la infraestructura completa de Base de Datos PostgreSQL 15+, Funciones RPC Transaccionales, Triggers Forenses, Row Level Security (RLS), Storage Buckets y Semilla de Datos de Cusco para **Paw Patita Cusco v5.0**.

---

## 1. Orden Exacto de Ejecución en el SQL Editor de Supabase

1. Ingresa a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard) y abre la sección **SQL Editor** en la barra lateral izquierda.
2. Ejecuta los siguientes **6 scripts SQL** estrictamente en este orden:

| Orden | Archivo | Propósito Principal |
| :---: | :--- | :--- |
| **1°** | [`01_schema.sql`](./01_schema.sql) | Crea los 21 tipos `ENUM`, 10 secuencias de negocio, las **23 tablas relacionales en 3FN**, claves foráneas (`CASCADE` / `RESTRICT`), restricciones `CHECK` e índices de alto rendimiento. |
| **2°** | [`02_functions_triggers.sql`](./02_functions_triggers.sql) | Crea el trigger `handle_new_auth_user()`, los triggers automáticos de **Bitácora Forense (`auditoria_estados`)** con captura de `old_record` y `new_record` en `JSONB`, el trigger de reputación de cuidadores y las 3 vistas (`v_catalogo_cuidadores`, `v_billetera_cuidador`, `v_resumen_mascotas`). |
| **3°** | [`03_rpc_business.sql`](./03_rpc_business.sql) | Crea las **21 funciones RPC transaccionales atómicas** (`SECURITY DEFINER`) para cotización, reserva anti-overbooking por bloques horarios, check-in/out, cancelación escalonada, arbitraje, retiros, protocolo S.O.S. y métricas del dashboard Admin (15%). |
| **4°** | [`04_rls_policies.sql`](./04_rls_policies.sql) | Activa obligatoriamente `ENABLE ROW LEVEL SECURITY` en las **23 tablas** y define las políticas de acceso granulares para `anon`, `propietario`, `cuidador`, `veterinaria` y `administrador`. |
| **5°** | [`05_storage_buckets.sql`](./05_storage_buckets.sql) | Crea los buckets de Supabase Storage (`mascotas-fotos`, `muro-fotos`, `perfiles`, `documentos-verificacion`, `comprobantes-pago`), sus políticas RLS y el clasificador híbrido para URLs de `PostImg`. |
| **6°** | [`06_seed.sql`](./06_seed.sql) | Puebla la semilla realista de Cusco: 6 cuidadores aprobados en los distritos de Cusco + 2 pendientes, 4 clínicas activas + 1 pendiente, mascotas con `PAW-6858`, reservas en todos los estados, pagos con comisión del 15%, liquidaciones, muro fotográfico y alertas S.O.S. |

---

## 2. Habilitar Supabase Realtime (Alertas S.O.S. y Notificaciones en Vivo)

Para que la Central S.O.S. Veterinaria, la campana de notificaciones y el Muro de Fotos se actualicen en vivo sin recargar la página:

1. En el panel de Supabase, ve a **Database** → **Publications** → **`supabase_realtime`** (o ejecuta el siguiente comando en el SQL Editor):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidencias_emergencias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reportes_seguimiento;
```

---

## 3. Configurar Autenticación y URLs de GitHub Pages

1. Ve a **Authentication** → **URL Configuration**:
   - **Site URL:** `https://nasdigog-glitch.github.io/paw-patita-cusco/` (o `http://localhost:5500` durante pruebas locales).
   - **Redirect URLs:** Agrega:
     - `https://nasdigog-glitch.github.io/paw-patita-cusco/**`
     - `http://localhost:5500/**`
     - `http://127.0.0.1:5500/**`
2. Ve a **Authentication** → **Providers** → **Email**:
   - Mantén **Enable Email provider** activado.
   - Para pruebas ágiles de registro sin esperar confirmación por correo, puedes desactivar temporalmente *"Confirm email"*.

---

## 4. Configurar Credenciales Públicas en el Frontend (`js/config.js`)

1. En Supabase Dashboard, dirígete a **Project Settings** (ícono de engranaje) → **API**.
2. Copia tu **Project URL** (`SUPABASE_URL`) y tu clave pública **`anon` `public`** (`SUPABASE_ANON_KEY`).
3. En la Fase 3, colócalas en `js/config.js`:

```javascript
export const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

> ⚠️ **Regla de Oro de Seguridad:** Jamás coloques la clave `service_role` en el frontend ni la subas a GitHub. Toda la seguridad opera con la `anon` key protegida por las políticas RLS de `04_rls_policies.sql`.

---

## 5. Credenciales Demo Creadas por `06_seed.sql` (Solo 4 Roles Activos)

Contraseña universal de prueba para todas las cuentas demo: **`PawPatita2026!`**

| Rol Operativo | Correo Electrónico | Nombre / Sede en Cusco | Estado |
| :--- | :--- | :--- | :---: |
| **Propietario (Unificado)** | `lucia.mendoza@gmail.com` | Lucía Mendoza (Wanchaq — Dueña de *Inti* `PAW-6858`) | `activo` |
| **Cuidador Independiente** | `valeria.cuidadora@pawpatitacusco.pe` | Valeria Huamán (`CUID-001` — Wanchaq) | `activo` |
| **Clínica Veterinaria Aliada** | `vet.sanfrancisco@pawpatitacusco.pe` | Dra. Claudia Salazar (`VET-001` — Clínica San Francisco 24h) | `activo` |
| **Administrador de Red** | `admin@pawpatitacusco.pe` | Rodrigo Quispe (Cusco Centro) | `activo` |

*(También existen en el seed cuentas en estado `pendiente` como `jorge.postulante@gmail.com` y `postulacion@sacsayhuamanvet.pe` para verificar el bloqueo de inicio de sesión previo a la aprobación del Administrador).*

---

## 6. Verificación Rápida de Integridad en SQL Editor

Después de ejecutar los 6 scripts, pega y ejecuta esta consulta en el **SQL Editor** para comprobar que el modelo y los KPIs del Administrador responden al 100%:

```sql
-- 1. Verificar las 23 tablas con RLS activo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificar el catálogo público de cuidadores aprobados (debe retornar 6 cuidadores en Cusco)
SELECT codigo_cuidador, nombre_completo, distrito_cusco, hu_ecode_principal, tarifa_minima, reputacion_promedio
FROM public.v_catalogo_cuidadores;

-- 3. Verificar métricas financieras del Administrador (comisión 15% > 0 y desglose por distritos de Cusco)
SELECT public.rpc_admin_dashboard_metrics();

-- 4. Verificar vista pública de Carné QR PAW-6858
SELECT public.rpc_obtener_paw_id_publico('PAW-6858');
```
