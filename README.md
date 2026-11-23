# 🐾 Paw Patita Cusco v5.0 — Plataforma Integral de Cuidado Canino y Bienestar Animal

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-brightgreen?logo=github)](https://rubikanton.github.io/pawPatita/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-Vanilla%20ES%20Modules-blue.svg)](#-arquitectura-tecnol%C3%B3gica-v50)
[![Security: RLS](https://img.shields.io/badge/Security-Row%20Level%20Security%20(RLS)-orange.svg)](#1-despliegue-de-la-base-de-datos-en-supabase)

> **Proyecto Fin de Ciclo / StartUp SaaS de Economía Colaborativa**  
> **Arquitectura v5.0:** SPA Serverless (ES Modules nativos + Bootstrap 5.3 + Leaflet + Chart.js) en **GitHub Pages** + Backend Relacional en **Supabase** (PostgreSQL 15, Row Level Security, 21 RPCs Transaccionales, Storage y Realtime).  
> **URL Oficial de Producción:** [https://rubikanton.github.io/pawPatita/](https://rubikanton.github.io/pawPatita/)  
> **Repositorio Oficial:** [https://github.com/RubikAnton/pawPatita.git](https://github.com/RubikAnton/pawPatita.git)  
> **Curso:** Análisis y Diseño de Software — NRC 39575  
> **Docente:** Holguin Herrera, Melisa Betys  
> **Equipo de Desarrollo:**  
> - Chacón Copa, Angelo Ricardo  
> - Huarancca Camala, Frank Smit  
> - Illapuma Yupanqui, Jerson Reyder  
> - Lovaton Casas, Arantxa Alejandra  
> - Ortiz Gutierrez, Nasdig Jordan  
> **Cusco, Perú — Noviembre 2026**

---

## 📌 Descripción General del Sistema

**Paw Patita Cusco v5.0** es una plataforma SaaS de economía colaborativa para el cuidado integral canino en la región de Cusco, Perú. Conecta de forma confiable a propietarios de perros (residentes locales y turistas que recorren el Valle Sagrado y Machu Picchu) con cuidadores certificados e independientes, bajo supervisión médica activa de clínicas veterinarias 24 horas acreditadas y gobernanza centralizada.

En esta **Versión 5.0**, el sistema migró completamente hacia una arquitectura moderna, escalable y desacoplada basada en **GitHub Pages + Supabase (PostgreSQL)**, superando limitaciones de cuotas, problemas de concurrencia y ofreciendo aislamiento estricto de datos con Row Level Security (RLS).

---

## 🔑 Credenciales Oficiales de Demostración (Acceso en 1 Clic)

El modal de inicio de sesión dispone de botones de **Acceso Rápido Demo** que autocompletan las credenciales para evaluar cualquiera de los 4 roles del ecosistema. Todas las cuentas demo comparten la contraseña universal: **`PawPatita2026!`**

| Rol del Actor | Correo Electrónico | Contraseña | Perfil y Capacidades a Evaluar |
| :--- | :--- | :---: | :--- |
| 🐶 **Propietario** | `lucia.mendoza@gmail.com` | `PawPatita2026!` | Registro de mascotas, emisión e impresión de Carné Digital `PAW-ID` con código QR, catálogo con mapa interactivo Leaflet, asistente de reserva con cotizador estacional, muro fotográfico en tiempo real y solicitud de cancelación. |
| 🐕 **Cuidador** | `valeria.cuidadora@pawpatitacusco.pe` | `PawPatita2026!` | Gestión de agenda mensual sin sobrecupos, protocolo de Check-In con escaneo/validación PAW-ID, subida de reportes con fotos al muro, botón de Emergencia S.O.S., Check-Out con liquidación automática del 85% neto y Billetera Virtual. |
| 🏥 **Veterinaria** | `vet.sanfrancisco@pawpatitacusco.pe` | `PawPatita2026!` | Auditoría sanitaria de cartillas de vacunas (Antirrábica, Séxtuple), dictamen médico con **Sello Oficial CMVP**, visor de cartillas y Central de Emergencias Médicas S.O.S. 24 horas con geolocalización en tiempo real. |
| 🛡️ **Administrador** | `admin@pawpatitacusco.pe` | `PawPatita2026!` | Centro de comando con métricas financieras en tiempo real (Comisión 15% calculada sobre volumen bruto), gráficos analíticos Chart.js por los 8 distritos de Cusco, aprobación de cuidadores/clínicas, arbitraje de disputas, gestión de retiros y bitácora de auditoría forense con exportación CSV. |

---

## 🏗️ Arquitectura Tecnológica v5.0

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CLIENTE NAVEGADOR (SPA JAMstack)                     │
│  GitHub Pages (index.html, ES Modules, Bootstrap 5.3, Leaflet, Chart)  │
└──────────────────┬───────────────────────────────────┬─────────────────┘
                   │ HTTPS / WSS                       │ Storage REST
                   ▼                                   ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│          SUPABASE POSTGREST          │   │      SUPABASE STORAGE       │
│  - 23 Tablas Relacionales (3FN)      │   │  - mascotas                 │
│  - Row Level Security (RLS) Activo   │   │  - muro-fotos               │
│  - 21 Funciones RPC Transaccionales  │   │  - perfiles                 │
│  - Triggers y Auditoría Forense      │   │  - documentos-verificacion  │
│  - Supabase Realtime Channels        │   │  - comprobantes-pago        │
└──────────────────────────────────────┘   └─────────────────────────────┘
```

1. **Frontend Desacoplado (GitHub Pages):**
   - Sin bundlers pesados en producción; ejecuta **ES Modules nativos** de JavaScript.
   - Entrypoint único: `index.html` compatible con servidores estáticos y `.nojekyll`.
   - Librerías CDN: Bootstrap 5.3, Leaflet 1.9.4 (mapas georreferenciados), Chart.js 4.4.1 (analítica financiera), QRCode.js (credenciales caninas).
2. **Backend Relacional Serverless (Supabase PostgreSQL):**
   - **23 Tablas Normalizadas:** Modelo relacional íntegro con integridad referencial.
   - **Row Level Security (RLS):** Aislamiento estricto multitenant; ninguna tabla es accesible públicamente sin autenticación o permisos explícitos.
   - **21 Funciones RPC:** Lógica transaccional crítica del lado del servidor (prevención de overbooking, cálculo de comisión del 15%, cancelación escalonada, liquidaciones y auditoría).
   - **Seguridad Garantizada:** Cero claves maestras (`service_role`) en el frontend; únicamente `SUPABASE_ANON_KEY`.

---

## 📁 Estructura Limpia de Producción

El repositorio contiene **únicamente** los componentes del frontend estático para GitHub Pages y la infraestructura SQL de Supabase:

```text
pawPatita/
├── index.html                        # Entrypoint SPA oficial (GitHub Pages)
├── .nojekyll                         # Desactiva el motor Jekyll en GitHub Pages
├── .gitignore                        # Reglas estrictas de exclusión de archivos dev/legacy
├── PLAN_MIGRACION_SUPABASE.md        # Plan Maestro de Migración v5.0
├── BITACORA_EJECUCION_V5.md          # Bitácora técnica viva de ejecución y trazabilidad
├── README.md                         # Este documento de arquitectura y guía
│
├── css/                              # Hojas de estilo modulares
│   ├── main.css                      # Variables de diseño (paleta Cusco), layout y navbar
│   ├── auth.css                      # Modales y formularios de login/registro
│   ├── catalogo.css                  # Tarjetas de cuidadores y popups Leaflet
│   ├── paneles.css                   # Dashboards para Propietario, Cuidador, Vet y Admin
│   └── print.css                     # Estilos @media print para Carné Digital PAW-ID
│
├── js/                               # Código modular en Vanilla ES Modules
│   ├── config.js                     # Variables Supabase y constantes canónicas de Cusco
│   ├── supabase-client.js            # Cliente Supabase singleton (DB, Auth, Storage, Realtime)
│   ├── router.js                     # Enrutador SPA basado en hash con guardias por rol
│   ├── app.js                        # Entrypoint JS y orquestador de eventos
│   ├── auth/                         # Autenticación y registro/postulaciones
│   ├── components/                   # Alerta SOS, Billetera, Calendario, Carné, Charts, Muro, Wizard
│   ├── public/                       # Catálogo, Landing, Mapa Cusco y PAW-ID público
│   ├── roles/                        # Paneles de Propietario, Cuidador, Veterinaria y Admin
│   └── utils/                        # Formateadores peruanos (S/, fechas) y helpers UI
│
└── supabase/                         # Scripts SQL ejecutables en Supabase
    ├── 01_schema.sql                 # Esquema relacional de 23 tablas y ENUMs
    ├── 02_functions_triggers.sql     # Funciones utilitarias, triggers de auditoría y vistas
    ├── 03_rpc_business.sql           # 21 funciones RPC transaccionales de negocio
    ├── 04_rls_policies.sql           # Políticas de seguridad Row Level Security
    ├── 05_storage_buckets.sql        # Buckets y políticas de Supabase Storage
    ├── 06_seed.sql                   # Datos semilla con cuentas demo y perfiles de Cusco
    └── README_SETUP_SUPABASE.md      # Guía detallada de configuración de la BD
```

---

## 🚀 Guía de Despliegue Paso a Paso

### 1. Despliegue de la Base de Datos en Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Dirígete a la sección **SQL Editor** en la barra lateral izquierda.
3. Ejecuta los **6 scripts SQL** de la carpeta `supabase/` en el siguiente **orden cronológico estricto**:
   - `01_schema.sql`: Crea tipos ENUM, secuencias y las 23 tablas relacionales en 3FN.
   - `02_functions_triggers.sql`: Instala triggers automáticos de auditoría forense (`auditoria_estados`) y vistas del catálogo/billetera.
   - `03_rpc_business.sql`: Despliega las 21 funciones transaccionales de negocio (anti-overbooking, comisiones 15%, check-in/out, retiros).
   - `04_rls_policies.sql`: Habilita Row Level Security en las 23 tablas y aplica políticas por rol.
   - `05_storage_buckets.sql`: Crea y configura los 5 buckets de Supabase Storage y sus políticas.
   - `06_seed.sql`: Puebla las cuentas demo autenticadas, cuidadores, clínicas, mascotas y reservas representativas de Cusco.

### 2. Activación de Supabase Realtime

Para habilitar la sincronización en vivo de alertas de emergencia SOS, notificaciones y muro fotográfico:

1. Ve a **Database** → **Publications** → **`supabase_realtime`**, o ejecuta en el **SQL Editor**:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidencias_emergencias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reportes_seguimiento;
```

### 3. Configuración de Supabase Auth

1. Ve a **Authentication** → **URL Configuration**:
   - **Site URL:**  
     `https://rubikanton.github.io/pawPatita/`
   - **Redirect URLs:** Agrega las siguientes URLs permitidas:
     - `https://rubikanton.github.io/pawPatita/**`
     - `http://localhost:5500/**`
     - `http://127.0.0.1:5500/**`
2. Ve a **Authentication** → **Providers** → **Email**:
   - Asegúrate de que **Enable Email provider** esté activo.
   - Para agilizar pruebas demo de registro inmediato, puedes mantener desactivado *"Confirm email"*.

### 4. Configuración de Credenciales en el Frontend (`js/config.js`)

1. En Supabase Dashboard, dirígete a **Project Settings** (engranaje) → **API**.
2. Copia tu **Project URL** y tu **anon public key**.
3. Abre el archivo [`js/config.js`](file:///d:/Usuario/analisisGithub/js/config.js) y reemplaza los valores de `SUPABASE_URL` y `SUPABASE_ANON_KEY`:

```javascript
export const ENV = {
  // Reemplaza con la URL de tu proyecto Supabase:
  SUPABASE_URL: window.__ENV__?.SUPABASE_URL || 'https://tu-proyecto.supabase.co',

  // Reemplaza con tu clave anon pública:
  SUPABASE_ANON_KEY: window.__ENV__?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

  // URL canónica en GitHub Pages:
  SITE_URL: window.__ENV__?.SITE_URL || (window.location.origin + window.location.pathname),

  DEBUG: true
};
```

> ⚠️ **Regla de Oro de Seguridad:** Jamás utilices la clave `service_role` en el frontend. La clave pública `anon` es la única requerida gracias a las políticas RLS.

### 5. Activación de GitHub Pages

1. En el repositorio de GitHub ([https://github.com/RubikAnton/pawPatita](https://github.com/RubikAnton/pawPatita)), dirígete a **Settings > Pages**.
2. En la sección **Build and deployment**:
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` / Folder: `/(root)`
3. Presiona **Save**.
4. En un par de minutos la aplicación estará disponible en vivo en:  
   **[https://rubikanton.github.io/pawPatita/](https://rubikanton.github.io/pawPatita/)**

---

## 🧪 Verificación de Cuentas Demo en Producción

Una vez desplegado el frontend y configurado Supabase, verifica los 4 accesos directos desde el modal de Login:

1. **🐶 Propietario (`lucia.mendoza@gmail.com`):**
   - Accede al panel `#propietario`.
   - Visualiza a la mascota *Inti* (`PAW-6858`) y genera su Carné Digital imprimible con QR.
   - Consulta el Muro de Fotos y prueba el asistente interactivo de reserva.
2. **🐕 Cuidador (`valeria.cuidadora@pawpatitacusco.pe`):**
   - Accede al panel `#cuidador`.
   - Revisa la agenda de reservas por bloques horarios en Wanchaq.
   - Simula Check-In con validación PAW-ID y consulta el balance de Billetera Virtual (85% neto).
3. **🏥 Veterinaria (`vet.sanfrancisco@pawpatitacusco.pe`):**
   - Accede al panel `#veterinaria`.
   - Consulta la Central de Emergencias Médicas S.O.S. conectada a Realtime.
   - Emite dictamen médico con firma CMVP sobre cartillas de vacunación.
4. **🛡️ Administrador (`admin@pawpatitacusco.pe`):**
   - Accede al panel `#administrador`.
   - Comprueba las tarjetas de KPIs financieros (15% comisión retenida, volumen transaccionado).
   - Revisa los gráficos de distribución por distritos de Cusco y la bitácora forense de auditoría.
