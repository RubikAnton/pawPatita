# 🐾 Paw Patita Cusco v5.0 — Plataforma Integral de Cuidado Canino y Bienestar Animal

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-brightgreen?logo=github)](https://nasdigog-glitch.github.io/paw-patita-cusco/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-Vanilla%20ES%20Modules-blue.svg)](#arquitectura-tecnol%C3%B3gica)
[![Security: RLS](https://img.shields.io/badge/Security-Row%20Level%20Security%20(RLS)-orange.svg)](#seguridad-y-pol%C3%ADticas-rls)

> **Proyecto Fin de Ciclo / StartUp SaaS de Economía Colaborativa**  
> **Arquitectura v5.0:** SPA Serverless (ES Modules nativos + Bootstrap 5.3) en **GitHub Pages** + Backend Relacional en **Supabase** (PostgreSQL 15, RLS, 21 RPCs Transaccionales, Storage y Realtime).  
> **URL Oficial de Producción:** [https://nasdigog-glitch.github.io/paw-patita-cusco/](https://nasdigog-glitch.github.io/paw-patita-cusco/)  
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

En esta **Versión 5.0**, el sistema migró completamente de Google Apps Script hacia una arquitectura moderna, escalable y robusta basada en **GitHub Pages + Supabase (PostgreSQL)**, superando definitivamente las cuotas de 6 minutos de GAS, problemas de concurrencia y límites de almacenamiento.

---

## 🔑 Credenciales Oficiales de Demostración (Acceso en 1 Clic)

El modal de inicio de sesión dispone de botones de **Acceso Rápido Demo** que autocompletan las credenciales para evaluar cualquiera de los 4 roles del ecosistema:

| Rol del Actor | Correo Electrónico | Contraseña | Perfil y Capacidades a Evaluar |
| :--- | :--- | :---: | :--- |
| 🐶 **Propietario** | `owner@pawpatita.pe` | `OwnerDemo2026!` | Registro de mascotas, emisión e impresión de Carné Digital `PAW-ID` con código QR, catálogo con mapa Leaflet, reserva con cotizador estacional, pasarela de pago simulada, muro de fotos en tiempo real y cancelación escalonada. |
| 🐕 **Cuidador** | `cuidador@pawpatita.pe` | `CuidadorDemo2026!` | Gestión de agenda mensual sin overbooking, protocolo de Check-In con verificación PAW-ID, publicación de reportes con fotos, botón de Emergencia S.O.S., Check-Out con acreditación inmediata del 85% neto y Billetera Virtual con retiros. |
| 🏥 **Veterinaria** | `vet@pawpatita.pe` | `VetDemo2026!` | Auditoría sanitaria de cartillas de vacunas (Antirrábica, Séxtuple), dictamen médico con **Sello Oficial CMVP**, visor de cartillas y Central de Emergencias Médicas S.O.S. 24 horas con geolocalización. |
| 🛡️ **Administrador** | `admin@pawpatita.pe` | `AdminDemo2026!` | Centro de comando con métricas financieras en tiempo real (Comisión 15% calculada sobre volumen bruto), gráficos Chart.js por los 8 distritos de Cusco, aprobación de cuidadores/clínicas, arbitraje de disputas, liquidaciones y bitácora de auditoría forense con exportación CSV. |

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
│  - 23 Tablas Relacionales            │   │  - paw-cartillas            │
│  - Row Level Security (RLS) Activo   │   │  - paw-reportes             │
│  - 21 Funciones RPC Transaccionales  │   │  - paw-documentos           │
│  - Triggers y Auditoría Forense      │   └─────────────────────────────┘
└──────────────────────────────────────┘
```

1. **Frontend Desacoplado (GitHub Pages):**
   - Sin bundlers ni Node.js en producción; ejecuta **ES Modules nativos**.
   - Entry point único: `index.html` (minúscula) compatible con GitHub Pages y `.nojekyll`.
   - Librerías CDN: Bootstrap 5.3, Leaflet 1.9.4 (mapas), Chart.js 4.4.1 (analítica), QRCode.js (credenciales).
2. **Backend Relacional Serverless (Supabase PostgreSQL):**
   - **23 Tablas Normalizadas:** Modelo relacional íntegro que reemplaza las 22 hojas de cálculo legacy.
   - **Row Level Security (RLS):** Aislamiento estricto multitenant; ninguna tabla es accesible públicamente sin autenticación o permisos explícitos.
   - **21 Funciones RPC:** Lógica transaccional crítica del lado del servidor (prevención de overbooking, cálculo de comisión del 15%, cancelación escalonada, liquidaciones y auditoría).
   - **Seguridad Garantizada:** Cero claves maestras (`service_role`) en el frontend; únicamente `SUPABASE_ANON_KEY`.

---

## 📁 Estructura del Repositorio

```text
paw-patita-cusco/
├── index.html                        # Entrypoint SPA oficial (GitHub Pages)
├── .nojekyll                         # Evita procesamiento Jekyll en GitHub Pages
├── PLAN_MIGRACION_SUPABASE.md        # Plan Maestro de Migración con checklist por fases
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
│   ├── supabase-client.js            # Cliente Supabase singleton (DB, Auth, Storage)
│   ├── router.js                     # Enrutador SPA basado en hash con guardias por rol
│   ├── auth/                         # Gestión de sesiones y autenticación
│   ├── components/                   # Mapa Leaflet, Gráficos Chart.js, Modales y QR
│   ├── roles/                        # Vistas de Propietario, Cuidador, Veterinaria y Admin
│   └── utils/                        # Formateadores peruanos (S/, fechas) y helpers UI
│
├── supabase/                         # Scripts SQL ejecutables en Supabase
│   ├── 01_schema.sql                 # Esquema relacional de 23 tablas y ENUMs
│   ├── 02_functions_triggers.sql     # Funciones utilitarias y triggers de auditoría
│   ├── 03_rpc_business.sql           # 21 funciones RPC transaccionales de negocio
│   ├── 04_rls_policies.sql           # Políticas de seguridad Row Level Security
│   ├── 05_storage_buckets.sql        # Buckets y políticas de Storage
│   ├── 06_seed.sql                   # Datos semilla con perfiles y cuidadores de Cusco
│   └── README_SETUP_SUPABASE.md      # Guía paso a paso para el despliegue en Supabase
│
├── tests/                            # Suite de verificación y aseguramiento de calidad
│   ├── sql_integrity_checks.sql      # Aserciones automáticas para Supabase SQL Editor
│   └── e2e_verification_checklist.md # Matriz de pruebas end-to-end (52 casos probados)
│
├── docs/                             # Documentación formal y académica
│   ├── 01_CHANGELOG_Y_TRAZABILIDAD_CAMBIOS.md
│   ├── 02_ESPECIFICACION_REQUISITOS_Y_REGLAS.md
│   ├── 03_CASOS_DE_USO_E_HISTORIAS_USUARIO.md
│   ├── 04_DICCIONARIO_DE_DATOS_Y_ARQUITECTURA.md
│   └── 05_EVALUACION_HEURISTICAS_NIELSEN.md
│
└── legacy-gas/                       # Archivo histórico preservado (sin pérdida de historial git)
    ├── Codigo.gs                     # Backend legacy Google Apps Script
    ├── Index.html                    # Frontend monolítico v4.0 legacy
    ├── BD-PAWPATITAS-v3.xlsx         # Hoja de cálculo relacional v4.0
    └── tools/                        # Scripts de migración y validación mock previa
```

---

## 🚀 Guía de Despliegue

### 1. Despliegue de la Base de Datos en Supabase
1. Crea un proyecto nuevo en [Supabase](https://supabase.com/).
2. Abre el **SQL Editor** y ejecuta los scripts ubicados en `supabase/` en el siguiente orden estricto:
   - `01_schema.sql` (Crea tipos ENUM y las 23 tablas relacionales).
   - `02_functions_triggers.sql` (Instala triggers de actualización y auditoría forense).
   - `03_rpc_business.sql` (Despliega las 21 funciones de negocio transaccionales).
   - `04_rls_policies.sql` (Habilita RLS y define políticas de acceso por rol).
   - `05_storage_buckets.sql` (Crea los buckets para cartillas, reportes y documentos).
   - `06_seed.sql` (Inserta datos de prueba representativos para Cusco).
3. En la sección **Project Settings > API**, copia tu `Project URL` y `anon public key`.
4. En **Authentication > URL Configuration**, añade `https://nasdigog-glitch.github.io/paw-patita-cusco/` a las *Redirect URLs*.

### 2. Configuración del Frontend
1. Abre el archivo `js/config.js`.
2. Actualiza los valores de `SUPABASE_URL` y `SUPABASE_ANON_KEY` con los de tu proyecto:
   ```javascript
   export const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
   export const SUPABASE_ANON_KEY = 'tu-clave-anon-publica';
   ```

### 3. Publicación en GitHub Pages
1. Asegúrate de que el archivo `.nojekyll` esté presente en la raíz del repositorio.
2. En tu repositorio de GitHub, dirígete a **Settings > Pages**.
3. En la sección **Build and deployment**:
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` / Folder: `/(root)`
4. Haz clic en **Save**. En un par de minutos tu aplicación estará disponible en vivo en:
   **`https://<usuario>.github.io/<repositorio>/`**

---

## 🧪 Ejecución de Pruebas y Certificación de Calidad

### Pruebas de Integridad SQL (Supabase)
Ejecuta el script [tests/sql_integrity_checks.sql](file:///d:/Usuario/analisisGithub/tests/sql_integrity_checks.sql) en el **SQL Editor** de Supabase para validar:
- Existencia de las 23 tablas canónicas.
- RLS activo en el 100% de las tablas.
- Integridad referencial de claves foráneas.
- Exactitud en el cálculo de comisión del 15% y neto de cuidadores (85%).
- Prevención de sobrecupos y overbooking horario.
- Escalamiento estricto de reembolsos (>48h: 100%, 24-48h: 50%, <24h: 0%).
- Triggers de auditoría en la tabla `auditoria_estados`.

### Matriz de Verificación E2E
Consulta la [Matriz de Verificación E2E](file:///d:/Usuario/analisisGithub/tests/e2e_verification_checklist.md) para revisar los **52 casos de prueba** completados en verde sobre los 4 roles del sistema, garantizando:
- **0 textos `undefined`** o `[object Object]` en pantalla.
- **Responsividad verificada** en 360px, 768px y 1440px.
- **Impresión nítida** del Carné Digital PAW-ID vía `@media print`.

---

## 📚 Documentación Técnica Detallada (`docs/`)

- [01_CHANGELOG_Y_TRAZABILIDAD_CAMBIOS.md](file:///d:/Usuario/analisisGithub/docs/01_CHANGELOG_Y_TRAZABILIDAD_CAMBIOS.md): Historial de versiones y memoria técnica de la migración arquitectónica v4.0 → v5.0.
- [02_ESPECIFICACION_REQUISITOS_Y_REGLAS.md](file:///d:/Usuario/analisisGithub/docs/02_ESPECIFICACION_REQUISITOS_Y_REGLAS.md): Catálogo de 25 Requisitos Funcionales, 10 RNF y reglas formalizadas de negocio.
- [03_CASOS_DE_USO_E_HISTORIAS_USUARIO.md](file:///d:/Usuario/analisisGithub/docs/03_CASOS_DE_USO_E_HISTORIAS_USUARIO.md): 26 Casos de Uso y 10 Historias de Usuario verificables.
- [04_DICCIONARIO_DE_DATOS_Y_ARQUITECTURA.md](file:///d:/Usuario/analisisGithub/docs/04_DICCIONARIO_DE_DATOS_Y_ARQUITECTURA.md): Modelo Entidad-Relación PostgreSQL de 23 tablas, catálogo de campos, RPCs y políticas RLS.
- [05_EVALUACION_HEURISTICAS_NIELSEN.md](file:///d:/Usuario/analisisGithub/docs/05_EVALUACION_HEURISTICAS_NIELSEN.md): Evaluación de usabilidad de Jakob Nielsen con puntuación 20/20.

---

## 🏛️ Código Legacy Preservado (`legacy-gas/`)

Por motivos de trazabilidad académica y auditoría de software, la versión histórica v4.0 basada en Google Apps Script ha sido archivada íntegramente en la carpeta [legacy-gas/](file:///d:/Usuario/analisisGithub/legacy-gas/) mediante comandos Git, preservando intacto el 100% del historial de commits del proyecto.
