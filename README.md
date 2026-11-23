# 🐾 Paw Patita Cusco v5.2 — Calidad Comercial, Responsive Total & Certificación IHC 20/20

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-brightgreen?logo=github)](https://rubikanton.github.io/pawPatita/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Version](https://img.shields.io/badge/Version-v5.2%20Comercial%20IHC%2020%2F20-E85D24.svg)](#-novedades-de-la-versión-52)
[![Nielsen Heuristics](https://img.shields.io/badge/Nielsen%20Heuristics-20%2F20%20Certified-1E5631.svg)](#-matriz-de-cumplimiento-de-las-10-heurísticas-de-jakob-nielsen-2020)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-Vanilla%20ES%20Modules-blue.svg)](#-arquitectura-tecnológica-v52)

> **Proyecto Fin de Ciclo / StartUp SaaS de Economía Colaborativa**  
> **Arquitectura v5.2:** SPA Estática Serverless (28 Vanilla ES Modules + Tokens CSS *"Andes & Huellas Cusco"* WCAG AAA + Responsive Total `360px / 768px / 1366px` + Motor Bilingüe 100% Público `ES / EN` + Motor Central de Validación `validators.js` + Centro de Ayuda FAQ H10 + Bootstrap 5.3 + Mapas Interactivos + Analítica) en **GitHub Pages** + Backend Relacional en **Supabase** (PostgreSQL 15, Row Level Security estricto por usuario, 23 RPCs Transaccionales, Storage Nativo Imágenes/PDF con URLs Firmadas y Realtime filtrado por usuario/entidad).  
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

**Paw Patita Cusco v5.2** es una plataforma SaaS de economía colaborativa para el cuidado integral canino en la ciudad del Cusco, Perú. Conecta de manera segura y transparente a propietarios de perros (residentes locales y turistas que visitan el Valle Sagrado y Machu Picchu) con cuidadores independientes verificados, bajo supervisión sanitaria activa de clínicas veterinarias aliadas 24 horas y gobernanza administrativa centralizada.

### ✨ Novedades de la Versión 5.2 (Calidad Comercial & Rigor UX)
- **Responsive Total Multi-Dispositivo (`360px`, `768px`, `1366px`):** Scroll fluido (`max-height: 90dvh`, `overflow-y: auto`) en `#modal-perfil-cuidador` y todos los modales de autenticación/postulación; sidebars sin recortes de nombre/correo + drawer colapsable móvil en los 4 paneles; calendario mensual del cuidador con 7 días (`Lun..Dom`) siempre alineados y scroll horizontal táctil; cero desbordamientos horizontales.
- **Internacionalización `ES / EN` al 100% en Flujo Público y Lenguaje Neutro:** 335 claves simétricas (`js/i18n.js`) cubriendo Navbar, Footer, Landing, Catálogo, Mapa Cusco, Modal Perfil Cuidador, PAW-ID público, Modales de Registro/Postulación, Modal Legal v5.2 (`legal-modal.js`) y Centro de Ayuda FAQ (`help-modal.js`), con lenguaje neutro consistente (`Cuidador` / `Propietario`).
- **Motor Central de Validación Estricta (`js/utils/validators.js`):** Sanitización en vivo (`input`) y validación en `blur`/`submit` sobre los 20 formularios del sistema: teléfonos Perú (`^9\d{8}$`) e internacionales turistas (`^\+[1-9]\d{7,14}$`), `DNI` (8 dígitos), `CE` (9–12 alfanum.), `Pasaporte` (6–12 alfanum.), `RUC` (11 dígitos), email estricto, nombres sin dígitos, cuentas de cobro (`Yape/Plin` 9 dígitos, `CCI` 20 dígitos), tarjeta 4 dígitos, códigos de operación, contraseñas (`>= 8` + confirmación) y bloqueo estandarizado por checkboxes obligatorios de Términos / Declaración Jurada.
- **Trazabilidad Financiera de Emergencias S.O.S. (Propietario ↔ Veterinaria ↔ Administrador):** Columnas y RPCs transaccionales (`supabase/09_pulido_v5_2.sql`) para gestionar cargos clínicos S.O.S. (`sin_cargo`, `pendiente_pago`, `reportado_propietario`, `conciliado`, `exonerado`):
  - **Propietario:** KPIs financieros S.O.S. (`PEN/USD`), banner de alerta en Resumen y modal validado *"Regularizar Cargo Clínico"* (`rpc_propietario_regularizar_sos`).
  - **Veterinaria:** Badge de estado de cobro clínico y constancia en cada tarjeta S.O.S.
  - **Administrador:** Columna *"Cargo Clínico S.O.S."* en Central Global S.O.S. y modal *"Conciliar / Exonerar Cargo"* (`rpc_admin_conciliar_cobro_sos`).
- **Restricción S.O.S. del Cuidador a Custodia Activa (`en_curso`):** Bloqueo doble (UI + PostgreSQL `rpc_emitir_sos`) impidiendo que un cuidador emita alertas S.O.S. sobre reservas finalizadas o pendientes; estado vacío instructivo si no tiene mascotas con Check-In activo.
- **Aislamiento Estricto y Auto-Lectura de Notificaciones:** Políticas RLS de `public.notificaciones` restringidas exclusivamente a `id_usuario_destino = auth.uid()`, purga de canales Realtime y singletons en `logout()`/`loginWithEmail()` (`paw:auth-changed`), limpieza instantánea del contador `#notif-badge-count` al abrir la campanita o pulsar *"Marcar leídas"* y persistencia `leida = true`.
- **Centro de Ayuda & FAQ Contextual por Rol (`js/components/help-modal.js` — Heurística H10):** Guías rápidas bilingües (`ES / EN`) en 5 pestañas (*Propietarios & Turistas, Cuidadores, Clínicas Veterinarias, Política S.O.S. & Cobros, Seguridad PAW-ID*) accesibles desde Navbar, Footer y los 4 Sidebars.

---

## 🏆 Matriz de Cumplimiento de las 10 Heurísticas de Jakob Nielsen (`20 / 20`)

Auditoría IHC completa documentada en `docs/05_EVALUACION_HEURISTICAS_NIELSEN.md`:

| N.º | Heurística de Jakob Nielsen | Puntaje v5.2 | Estado | Evidencia Clave Implementada |
| :---: | :--- | :---: | :---: | :--- |
| **H1** | **Visibilidad del estado del sistema** | **2 / 2** | ✅ Excelente | Campanita con limpieza inmediata al abrir (`leida = true`), badges financieros S.O.S. en 3 roles, stepper clínico 4 etapas y progreso de carga Storage. |
| **H2** | **Correspondencia sistema–mundo real** | **2 / 2** | ✅ Excelente | Género neutro 100% (`Cuidador`/`Propietario`), 0 jerga técnica en UI, `ES / EN` completo público, `PEN / USD` y terminología cusqueña natural. |
| **H3** | **Control y libertad del usuario** | **2 / 2** | ✅ Excelente | Scroll fluido (`90dvh`) en `#modal-perfil-cuidador` y modales auth, scroll horizontal en calendario 7 días, drawer móvil reversible y confirmaciones antes de cancelar. |
| **H4** | **Consistencia y estándares** | **2 / 2** | ✅ Excelente | Motor único `validators.js` + `novalidate` en los 20 formularios, tokens WCAG AAA (`css/tokens.css`), iconos semánticos y hora oficial `America/Lima`. |
| **H5** | **Prevención de errores** | **2 / 2** | ✅ Excelente | Sanitización en vivo que bloquea letras en teléfonos/DNI/RUC/Yape/CCI, bloqueo uniforme por TyC/Declaración Jurada, S.O.S. cuidador solo `en_curso` (UI+SQL) y anti-overbooking. |
| **H6** | **Reconocimiento antes que recuerdo** | **2 / 2** | ✅ Excelente | Sidebars sin recortes (nombre/email completos), calendario con `Lun..Dom` siempre visibles, desglose 85%/15% y detalle clínico/financiero S.O.S. en tarjeta. |
| **H7** | **Flexibilidad y eficiencia de uso** | **2 / 2** | ✅ Excelente | Accesos demo 1-clic, atajo *"Marcar leídas"*, filtros combinados instantáneos + reset, exportación CSV y accesos directos a Regularización S.O.S. / Check-In. |
| **H8** | **Diseño estético y minimalista** | **2 / 2** | ✅ Excelente | Layout verificado en `360px`, `768px` y `1366px` con `0px` de desbordamiento horizontal, scrollbars estilizados y bitácora humana sin JSON crudo. |
| **H9** | **Ayuda a reconocer, diagnosticar y recuperarse de errores** | **2 / 2** | ✅ Excelente | Mensajes `.invalid-feedback` bilingües exactos, foco/scroll automático al primer campo inválido, estado vacío instructivo en S.O.S. cuidador y `handleSupabaseError()`. |
| **H10** | **Ayuda y documentación** | **2 / 2** | ✅ Excelente | Centro de Ayuda & FAQ contextual por rol (`help-modal.js`, `ES/EN`) en Navbar/Footer/Sidebars, Modal Legal v5.2 bilingüe y textos guía `.form-text`. |
| **TOTAL** | **Calificación Global IHC** | **20 / 20** | **🏆 100%** | **Certificación Completa de Usabilidad v5.2** |

---

## 🔑 Credenciales Oficiales de Demostración (Acceso en 1 Clic)

El modal de inicio de sesión dispone de botones de **Acceso Rápido Demo** que autocompletan las credenciales para evaluar cualquiera de los 4 roles del ecosistema. Todas las cuentas demo comparten la contraseña universal: **`PawPatita2026!`**

| Rol del Actor | Nombre Demo | Correo Electrónico | Contraseña | Capacidades Principales a Evaluar |
| :--- | :--- | :--- | :---: | :--- |
| 🐶 **Propietario** | Lucía Mendoza Vargas | `lucia.mendoza@gmail.com` | `PawPatita2026!` | Registro de mascotas con foto/cartilla PDF, Carné Digital `PAW-ID` imprimible con QR (`Inti — PAW-6858`), catálogo con mapa interactivo de Cusco, asistente de reserva multi-día (Hospedaje 24h / Bloques horarios), seguimiento S.O.S. + **Regularización de Cargos Clínicos**, muro fotográfico y cancelación escalonada. |
| 🐕 **Cuidador** | Valeria Huamán Delgado | `valeria.cuidadora@pawpatitacusco.pe` | `PawPatita2026!` | Agenda mensual de 7 días sin sobrecupos, Check-In con validación PAW-ID, Muro Fotográfico y botón **S.O.S. restringido estrictamente a reservas `en_curso`**, Check-Out con validación horaria `America/Lima` y Billetera Virtual (85% neto con validación estricta Yape/Plin/CCI y exportación CSV). |
| 🏥 **Veterinaria** | Dra. Claudia Salazar Cáceres | `vet.sanfrancisco@pawpatitacusco.pe` | `PawPatita2026!` | Auditoría sanitaria de cartillas de vacunación (imágenes y PDFs), emisión de dictámenes con **Sello Oficial CMVP**, Central de Emergencias S.O.S. 24h con persistencia transaccional y **badge de estado de cobro clínico**, y configuración de sede validada. |
| 🛡️ **Administrador** | Rodrigo Quispe Monzón | `admin@pawpatitacusco.pe` | `PawPatita2026!` | Panel Ejecutivo con métricas conciliadas (15% comisión plataforma / 85% cuidador) por los 8 distritos de Cusco, aprobación de cuidadores/clínicas con visor firmado, arbitraje de disputas, liquidaciones bancarias, **Central Global S.O.S. con Conciliación/Exoneración de Cargos Clínicos**, parámetros globales validados y Bitácora de Auditoría humana. |

---

## 🏗️ Arquitectura Tecnológica v5.2

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLIENTE NAVEGADOR (Static SPA JAMstack)                  │
│   GitHub Pages — 28 Vanilla ES Modules, Tokens CSS Cusco, i18n ES/EN,       │
│   validators.js, help-modal.js, Bootstrap 5.3, Leaflet 1.9.4, Chart.js 4.4  │
└───────────────────┬────────────────────────────────────┬────────────────────┘
                    │ HTTPS / WSS (Realtime filtrado)    │ Storage REST / Signed URLs
                    ▼                                    ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────────┐
│          SUPABASE POSTGREST           │   │        SUPABASE STORAGE         │
│  - 23 Tablas Relacionales (3FN)       │   │  - perfiles (Img, 5 MB)         │
│  - Row Level Security (RLS) Estricto  │   │  - mascotas-fotos (Img/PDF 10MB)│
│  - 23 Funciones RPC Transaccionales   │   │  - muro-fotos (Img, 5 MB)       │
│  - Triggers de Auditoría y Reglas     │   │  - documentos-verificacion (Prv)│
│  - Realtime por Usuario y Entidad     │   │  - comprobantes-pago (Privado)  │
└───────────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 📁 Estructura de Producción

```text
pawPatita/
├── index.html                        # Entrypoint SPA oficial v5.2 (GitHub Pages)
├── .nojekyll                         # Desactiva Jekyll en GitHub Pages
├── .gitignore                        # Exclusiones de archivos locales/legacy
├── PLAN_MIGRACION_SUPABASE.md        # Plan de migración base v5.0
├── PLAN_PULIDO_V5_1.md               # Blueprint maestro v5.1 (100% ejecutado)
├── PLAN_PULIDO_V5_2.md               # Blueprint maestro v5.2 (100% ejecutado)
├── BITACORA_EJECUCION_V5.md          # Bitácora forense completa Fases 1–7, P1–P4 y 5.2A–5.2C
├── README.md                         # Documentación oficial del proyecto
│
├── docs/
│   └── 05_EVALUACION_HEURISTICAS_NIELSEN.md  # Certificación IHC 20/20 v5.2
│
├── css/                              # Hojas de estilo modulares (Responsive 360/768/1366)
│   ├── tokens.css                    # Paleta maestra "Andes & Huellas Cusco" y contraste AAA
│   ├── main.css                      # Layout global, cinta textil, Hero, CTA, Modales y Footer
│   ├── auth.css                      # Modales de acceso, registro y postulaciones scrollables
│   ├── catalogo.css                  # Tarjetas de cuidadores, modal perfil scrollable y mapa
│   ├── paneles.css                   # Dashboards 4 roles, drawer móvil y calendario 7 días
│   └── print.css                     # Estilos @media print para Carné Digital PAW-ID
│
├── js/                               # Código modular en Vanilla ES Modules (28 módulos)
│   ├── config.js                     # Variables Supabase, constantes Cusco y TYC_VERSION 5.2
│   ├── i18n.js                       # Motor bilingüe reactivo ES / EN (335 claves simétricas)
│   ├── supabase-client.js            # Singleton Supabase, compresión Canvas y URLs firmadas
│   ├── router.js                     # Enrutador SPA por hash con guardias por rol
│   ├── app.js                        # Orquestador, centro de notificaciones aislado y validaciones
│   ├── auth/                         # auth.js, postulaciones.js
│   ├── components/                   # alerta-sos, billetera-cuidador, calendario-agenda,
│   │                                 # carnet-digital, chart-dashboard, file-uploader,
│   │                                 # help-modal (H10), legal-modal, muro-fotos, wizard-reserva
│   ├── public/                       # catalogo, landing, mapa-cusco, paw-id-publico
│   ├── roles/                        # propietario, cuidador, veterinaria, administrador
│   └── utils/                        # formatters.js, ui-helpers.js, validators.js
│
└── supabase/                         # Infraestructura SQL reproducible e idempotente
    ├── 01_schema.sql                 # 23 tablas en 3FN y tipos ENUM (incluye cobro S.O.S.)
    ├── 02_functions_triggers.sql     # Triggers de auditoría, auth y vistas
    ├── 03_rpc_business.sql           # 23 RPCs transaccionales de negocio
    ├── 04_rls_policies.sql           # Políticas RLS estrictas (notificaciones aisladas por uid)
    ├── 05_storage_buckets.sql        # 5 buckets Storage (Img/PDF) y políticas RLS
    ├── 06_seed.sql                   # Datos semilla verificados para Cusco
    ├── 07_fix_auth_and_audit.sql     # Parche Auth/Audit v5.0
    ├── 08_pulido_v5_1.sql            # Parche idempotente v5.1
    ├── 09_pulido_v5_2.sql            # Parche idempotente v5.2 (ejecutar en producción)
    └── README_SETUP_SUPABASE.md      # Guía detallada de despliegue BD
```

---

## 🚀 Guía Rápida de Despliegue y Operación

### 1. Despliegue de la Base de Datos en Supabase
- **Instalación nueva:** Ejecuta en el **SQL Editor** de Supabase los scripts `01_schema.sql` hasta `06_seed.sql` en orden secuencial, seguidos de `08_pulido_v5_1.sql` y **[`supabase/09_pulido_v5_2.sql`](supabase/09_pulido_v5_2.sql)**.
- **Actualización de una BD v5.1 existente en producción:** Ejecuta únicamente **[`supabase/09_pulido_v5_2.sql`](supabase/09_pulido_v5_2.sql)** en el Supabase SQL Editor (100% idempotente, sin pérdida de datos; añade las columnas y RPCs de cobro clínico S.O.S., endurece `rpc_emitir_sos` exigiendo `en_curso` al cuidador y aísla estrictamente las políticas RLS de `public.notificaciones` por `auth.uid()`).

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
