# 🐾 Paw Patita Cusco v5.1 — Edición "Andes & Huellas Cusco"

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-brightgreen?logo=github)](https://rubikanton.github.io/pawPatita/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Version](https://img.shields.io/badge/Version-v5.1%20Andes%20%26%20Huellas-E85D24.svg)](#novedades-de-la-version-51)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-Vanilla%20ES%20Modules-blue.svg)](#-arquitectura-tecnológica-v51)
[![Security: RLS](https://img.shields.io/badge/Security-Row%20Level%20Security%20(RLS)-1E5631.svg)](#1-despliegue-de-la-base-de-datos-en-supabase)

> **Proyecto Fin de Ciclo / StartUp SaaS de Economía Colaborativa**  
> **Arquitectura v5.1:** SPA Estática Serverless (Vanilla ES Modules + Tokens CSS "Andes & Huellas Cusco" WCAG AAA + Motor Bilingüe `ES/EN` + Bootstrap 5.3 + Mapas Interactivos + Analítica) en **GitHub Pages** + Backend Relacional en **Supabase** (PostgreSQL 15, Row Level Security, 21 RPCs Transaccionales, Storage Nativo Imágenes/PDF con URLs Firmadas y Realtime en 6 tablas).  
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

**Paw Patita Cusco v5.1** es una plataforma SaaS de economía colaborativa para el cuidado integral canino en la ciudad del Cusco, Perú. Conecta de manera segura y transparente a propietarios de perros (residentes locales y turistas que visitan el Valle Sagrado y Machu Picchu) con cuidadores independientes verificados, bajo supervisión sanitaria activa de clínicas veterinarias aliadas 24 horas y gobernanza administrativa centralizada.

### ✨ Novedades de la Versión 5.1 ("Andes & Huellas Cusco")
- **Identidad Visual Cusqueña y Accesibilidad WCAG AAA:** Paleta cálida andina (`css/tokens.css`), cinta textil cusqueña, Hero editorial de 2 columnas, Banner CTA en Verde Bosque Montaña y Footer con contraste certificado `> 7:1`.
- **Motor Bilingüe `ES / EN` y Conversión `PEN / USD`:** Traducción en vivo (`js/i18n.js`) y conversión referencial orientada a turistas internacionales en Cusco.
- **Marco Legal Peruano Clicable en Todo el Sistema:** Modal legal global de 3 pestañas (`js/components/legal-modal.js`) que cubre Términos y Condiciones v5.1, Política de Privacidad bajo la **Ley N° 29733** (derechos ARCO y privacidad QR/GPS) y Declaración Jurada de Idoneidad (Ley N° 30407 y Art. 411 del Código Penal).
- **Subida Directa Nativa a Supabase Storage (Imágenes + PDFs):** Widget reutilizable (`js/components/file-uploader.js`) con compresión client-side de imágenes, soporte para documentos y cartillas en `PDF`, acceso privado con URLs firmadas (`storage://`) y visor universal integrado (cero dependencias de servidores externos caídos).
- **Persistencia Real S.O.S. y Reglas Operativas Blindadas:** Transiciones clínicas S.O.S. transaccionales en tiempo real (`FOR UPDATE OF i`), Muro Fotográfico restringido a reservas `en_curso`, Hospedaje 24h con validación multi-día completa, validación temporal de Check-Out en zona horaria `America/Lima` y cotización 100% transparente por temporadas oficiales de Cusco.
- **Panel Administrador y Bitácora en Lenguaje Humano:** Persistencia real en los 6 RPCs y parámetros financieros globales, visor firmado de expedientes, analítica por los 8 distritos de Cusco y Bitácora de Auditoría con resúmenes legibles y tabla comparativa *Campo | Valor Anterior | Valor Nuevo*.

---

## 🔑 Credenciales Oficiales de Demostración (Acceso en 1 Clic)

El modal de inicio de sesión dispone de botones de **Acceso Rápido Demo** que autocompletan las credenciales para evaluar cualquiera de los 4 roles del ecosistema. Todas las cuentas demo comparten la contraseña universal: **`PawPatita2026!`**

| Rol del Actor | Nombre Demo | Correo Electrónico | Contraseña | Capacidades Principales a Evaluar |
| :--- | :--- | :--- | :---: | :--- |
| 🐶 **Propietario** | Lucía Mendoza Vargas | `lucia.mendoza@gmail.com` | `PawPatita2026!` | Registro de mascotas con foto/cartilla PDF, Carné Digital `PAW-ID` imprimible con QR (`Inti — PAW-6858`), catálogo con mapa interactivo de Cusco, asistente de reserva multi-día (Hospedaje 24h / Bloques horarios), seguimiento S.O.S. en vivo, muro fotográfico y cancelación escalonada. |
| 🐕 **Cuidador** | Valeria Huamán Delgado | `valeria.cuidadora@pawpatitacusco.pe` | `PawPatita2026!` | Agenda mensual sin sobrecupos, Check-In con validación PAW-ID, Muro Fotográfico exclusivo para reservas `en_curso`, botón S.O.S. geolocalizado, Check-Out con validación horaria `America/Lima` y Billetera Virtual (85% neto con exportación CSV). |
| 🏥 **Veterinaria** | Dra. Claudia Salazar Cáceres | `vet.sanfrancisco@pawpatitacusco.pe` | `PawPatita2026!` | Auditoría sanitaria de cartillas de vacunación (imágenes y PDFs), emisión de dictámenes con **Sello Oficial CMVP**, Central de Emergencias S.O.S. 24h con persistencia transaccional y configuración de sede con subida directa de fachada y constancia. |
| 🛡️ **Administrador** | Rodrigo Quispe Monzón | `admin@pawpatitacusco.pe` | `PawPatita2026!` | Panel Ejecutivo con métricas conciliadas (15% comisión plataforma / 85% cuidador) por los 8 distritos de Cusco, aprobación de cuidadores/clínicas con visor firmado y alta directa con dropzones, arbitraje de disputas, liquidaciones bancarias, parámetros globales, temporadas Cusco y Bitácora de Auditoría humana. |

---

## 🏗️ Arquitectura Tecnológica v5.1

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLIENTE NAVEGADOR (Static SPA JAMstack)                  │
│   GitHub Pages — Vanilla ES Modules, Tokens CSS Cusco, i18n ES/EN,          │
│   Bootstrap 5.3, Leaflet 1.9.4, Chart.js 4.4.1, QRCode.js                   │
└───────────────────┬────────────────────────────────────┬────────────────────┘
                    │ HTTPS / WSS (Realtime)             │ Storage REST / Signed URLs
                    ▼                                    ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────────┐
│          SUPABASE POSTGREST           │   │        SUPABASE STORAGE         │
│  - 23 Tablas Relacionales (3FN)       │   │  - perfiles (Img, 5 MB)         │
│  - Row Level Security (RLS) Activo    │   │  - mascotas-fotos (Img/PDF 10MB)│
│  - 21 Funciones RPC Transaccionales   │   │  - muro-fotos (Img, 5 MB)       │
│  - Triggers de Auditoría y Reglas     │   │  - documentos-verificacion (Prv)│
│  - Realtime en 6 Tablas Críticas      │   │  - comprobantes-pago (Privado)  │
└───────────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 📁 Estructura de Producción

```text
pawPatita/
├── index.html                        # Entrypoint SPA oficial (GitHub Pages)
├── .nojekyll                         # Desactiva Jekyll en GitHub Pages
├── .gitignore                        # Exclusiones de archivos locales/legacy
├── PLAN_MIGRACION_SUPABASE.md        # Plan de migración base v5.0
├── PLAN_PULIDO_V5_1.md               # Blueprint maestro de pulido v5.1 (100% ejecutado)
├── BITACORA_EJECUCION_V5.md          # Bitácora forense completa de Fases 1–7 y P1–P4
├── README.md                         # Documentación oficial del proyecto
│
├── css/                              # Hojas de estilo modulares
│   ├── tokens.css                    # Paleta maestra "Andes & Huellas Cusco" y contraste AAA
│   ├── main.css                      # Layout global, cinta textil, Hero, CTA y Footer
│   ├── auth.css                      # Modales de acceso, registro y postulaciones
│   ├── catalogo.css                  # Tarjetas de cuidadores, mapa y banner PAW-ID
│   ├── paneles.css                   # Dashboards de los 4 roles
│   └── print.css                     # Estilos @media print para Carné Digital PAW-ID
│
├── js/                               # Código modular en Vanilla ES Modules (26 módulos)
│   ├── config.js                     # Variables Supabase y constantes canónicas de Cusco
│   ├── i18n.js                       # Motor bilingüe reactivo ES / EN
│   ├── supabase-client.js            # Singleton Supabase, compresión Canvas y URLs firmadas
│   ├── router.js                     # Enrutador SPA por hash con guardias por rol
│   ├── app.js                        # Orquestador principal, conmutadores y Realtime
│   ├── auth/                         # auth.js, postulaciones.js
│   ├── components/                   # alerta-sos, billetera-cuidador, calendario-agenda,
│   │                                 # carnet-digital, chart-dashboard, file-uploader,
│   │                                 # legal-modal, muro-fotos, wizard-reserva
│   ├── public/                       # catalogo, landing, mapa-cusco, paw-id-publico
│   ├── roles/                        # propietario, cuidador, veterinaria, administrador
│   └── utils/                        # formatters.js (America/Lima, S//USD), ui-helpers.js
│
└── supabase/                         # Infraestructura SQL reproducible e idempotente
    ├── 01_schema.sql                 # 23 tablas en 3FN y tipos ENUM
    ├── 02_functions_triggers.sql     # Triggers de auditoría, auth y vistas
    ├── 03_rpc_business.sql           # 21 RPCs transaccionales de negocio
    ├── 04_rls_policies.sql           # Políticas Row Level Security por rol
    ├── 05_storage_buckets.sql        # 5 buckets Storage (Img/PDF) y políticas RLS
    ├── 06_seed.sql                   # Datos semilla verificados para Cusco
    ├── 07_fix_auth_and_audit.sql     # Parche Auth/Audit v5.0
    ├── 08_pulido_v5_1.sql            # Parche idempotente maestro v5.1 (ejecutar en producción)
    └── README_SETUP_SUPABASE.md      # Guía detallada de despliegue BD
```

---

## 🚀 Guía Rápida de Despliegue y Operación

### 1. Despliegue de la Base de Datos en Supabase
- **Instalación nueva:** Ejecuta en el **SQL Editor** de Supabase los scripts `01_schema.sql` hasta `06_seed.sql` en orden secuencial, seguidos de `08_pulido_v5_1.sql`.
- **Actualización de una BD v5.0 existente en producción:** Ejecuta únicamente **[`supabase/08_pulido_v5_1.sql`](supabase/08_pulido_v5_1.sql)** (100% idempotente; repara `rpc_vet_actualizar_sos` con `FOR UPDATE OF i`, actualiza buckets PDF/Img, limpia enlaces antiguos, aplica validación temporal de Check-Out y publica las 6 tablas en `supabase_realtime`).

### 2. Supabase Auth y Credenciales Frontend
1. En **Authentication → URL Configuration**, configura:
   - **Site URL:** `https://rubikanton.github.io/pawPatita/`
   - **Redirect URLs:** `https://rubikanton.github.io/pawPatita/**`, `http://localhost:5500/**`, `http://127.0.0.1:8091/**`
2. Verifica `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `js/config.js` (nunca incluir `service_role` en el frontend).

### 3. Ejecución Local Rápida
```bash
# Desde la raíz del repositorio (sin dependencias npm ni bundler)
python -m http.server 8091 --bind 127.0.0.1
# Abrir en el navegador: http://127.0.0.1:8091/
```

### 4. Despliegue Automático en GitHub Pages
- Rama publicada: `main` / carpeta `/(root)` con `.nojekyll`.
- Cada `git push origin main` actualiza automáticamente **[https://rubikanton.github.io/pawPatita/](https://rubikanton.github.io/pawPatita/)**.
