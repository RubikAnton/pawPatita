# 🐾 Paw Patita Cusco v4.0 — Plataforma Integral de Cuidado Canino y Bienestar Animal

> **Proyecto Fin de Ciclo / StartUp SaaS Serverless**  
> **Arquitectura:** Google Apps Script (GAS) + Google Sheets (Base de Datos Relacional en 3FN) + HtmlService (SPA)  
> **Curso:** Análisis y Diseño de Software — NRC 39575  
> **Docente:** Holguin Herrera, Melisa Betys  
> **Estudiantes:** Chacón Copa, Angelo Ricardo; Huarancca Camala, Frank Smit; Illapuma Yupanqui, Jerson Reyder; Lovaton Casas, Arantxa Alejandra; Ortiz Gutierrez, Nasdig Jordan.  
> **Cusco, Perú — Noviembre 2026**

---

## 📌 Descripción General del Proyecto (v4.0)

**Paw Patita Cusco v4.0** es una plataforma SaaS de economía colaborativa diseñada para resolver los desafíos de cuidado canino y bienestar animal en la ciudad histórica y turística de Cusco, Perú. Conecta a propietarios de perros (segmentados en **Residentes Locales** y **Turistas Nacionales/Extranjeros** que visitan atractivos como Machu Picchu o el Valle Sagrado) con **Cuidadores Independientes** certificados, bajo la supervisión médica activa de **Clínicas Veterinarias Aliadas 24 Horas** y la gobernanza del **Administrador de Red**.

El sistema opera de forma 100% *serverless* sobre la infraestructura de Google Workspace, garantizando alta disponibilidad, coste cero de servidores, transaccionalidad mediante `LockService`, rendimiento optimizado con `CacheService` y cumplimiento estricto de las 10 Heurísticas de Nielsen (20/20).

---

## 🚀 Novedades y Capacidades Principales de la Versión 4.0

1. **Arquitectura Multi-Actor Estricta (4 Roles Activos):**
   * **Propietario Local:** Carné digital `PAW PATITA-ID`, reservas por periodo, muro de fotos en vivo y cancelación con reembolso automático.
   * **Propietario Turista Cusco:** Experiencia optimizada con selector de divisa dual (**PEN / USD** con tipo de cambio referencial $S/\ 3.75$), servicio extra de *Recojo y retorno en Hotel* e idioma inglés/español.
   * **Cuidador Independiente:** Postulación con verificación policial y domiciliaria (`PostImg`), agenda mensual interactiva con control anti-overbooking por cupos, check-in/check-out y billetera digital con retiros a Yape/Plin/Banco.
   * **Clínica Veterinaria Aliada (Actor Activo):** Central de Emergencias S.O.S. en vivo (triage médico, diagnóstico y alta clínica) y auditoría sanitaria oficial de carnés `PAW PATITA-ID`.
   * **Administrador de Red:** Dashboard ejecutivo con gráficos interactivos vía **Chart.js** (distritos y categorías), aprobación de cuidadores, ejecución de reembolsos conciliados y bitácora de auditoría.
2. **Motor Dinámico de Tarifas y Cupones:** Detección de temporadas altas en Cusco (*Inti Raymi, Fiestas Patrias, Semana Santa*) con factor multiplicador automático y motor de cupones promocionales (ej: `INTIRAYMI15`, `MACHUPICCHU15`).
3. **Política Escalonada de Cancelación y Reembolso:** Cálculo transparente y atómico según las horas de anticipación al inicio del servicio (>48h: 100% reembolso; 24 a 48h: 70% reembolso y 30% penalidad; <24h: 0% reembolso).
4. **Base de Datos Relacional Normalizada (3FN):** Ampliación de 11 a **22 pestañas interconectadas** en [BD-PAWPATITAS-v3.xlsx](file:///d:/Usuario/analisisGithub/BD-PAWPATITAS-v3.xlsx), con claves primarias y foráneas, contraseñas hasheadas en SHA-256 (`PAW::`) y conciliación contable sin desfases.
5. **Frontend SaaS Profesional:** 3,400+ líneas en [Index.html](file:///d:/Usuario/analisisGithub/Index.html), compatible al 100% con `HtmlService` (0 operadores `?.` o `??`), wizard en 4 pasos, pasarela simulada y apagado garantizado del spinner.

---

## 🔑 Credenciales Oficiales de Demostración

El modal de inicio de sesión y la barra de navegación cuentan con un selector rápido con 1 clic ("Demo Acceso") que autocompleta cualquiera de estos perfiles:

| Rol del Actor | Correo Electrónico | Contraseña | Perfil y Capacidades a Evaluar |
| :--- | :--- | :---: | :--- |
| 🐶 **Propietario Local** | `angelo@gmail.com` | `123456` | Residente cusqueño (Angelo Pérez). Gestiona 4 perros con `PAW PATITA-ID`, wizard de reserva, muro de fotos en vivo y solicitudes de cancelación. |
| 🧳 **Propietario Turista** | `sofia.turista@gmail.com` | `123456` | Turista en Cusco (Sofía Valdivia). Moneda en Dólares USD, recojo en Hotel Monasterio, uso de cupón `MACHUPICCHU15` y botón S.O.S. |
| 🐕 **Cuidador Aprobado** | `carlos@gmail.com` | `123456` | Cuidador verificado (Carlos Quispe). Agenda mensual de cupos, Check-In / Check-Out, envío de fotos al muro y Billetera Digital con saldo disponible. |
| ⏳ **Cuidador Pendiente** | `lucia@gmail.com` | `123456` | Cuidador en revisión (Lucía Fernández). Visualización de estado `Pendiente` y expediente de antecedentes policiales y domicilio. |
| 🏥 **Clínica Veterinaria** | `vet.centro@pawpatita.pe` | `vet123` | *Clínica Veterinaria Cusco Centro (24h)*. Central S.O.S. para tomar casos críticos, triaje, alta médica y validación sanitaria de fichas caninas. |
| 🛡️ **Administrador de Red** | `admin@pawpatita.pe` | `admin123` | Administrador general. Dashboard ejecutivo con **Chart.js**, aprobación de postulantes, ejecución de reembolsos, pago de liquidaciones y auditoría. |

---

## 📚 Índice Maestro de la Documentación Exhaustiva (`docs/`)

Para la redacción del informe final oficial y auditorías académicas de software, se ha estructurado la documentación en 5 manuales técnicos dentro de `docs/`:

1. **[01_CHANGELOG_Y_TRAZABILIDAD_CAMBIOS.md](file:///d:/Usuario/analisisGithub/docs/01_CHANGELOG_Y_TRAZABILIDAD_CAMBIOS.md):** Matriz comparativa exhaustiva (v3.0 vs. v4.0), justificación técnica de la normalización de 11 a 22 pestañas, evolución de los 4 actores y eliminación de acoplamientos por índices numéricos.
2. **[02_ESPECIFICACION_REQUISITOS_Y_REGLAS.md](file:///d:/Usuario/analisisGithub/docs/02_ESPECIFICACION_REQUISITOS_Y_REGLAS.md):** Catálogo de Requisitos Funcionales (`RF-01` a `RF-25`), Requisitos No Funcionales adaptados a cuotas de GAS (`RNF-01` a `RNF-10`) y algoritmos formalizados en pseudocódigo (política de reembolso, cotizador estacional, anti-overbooking y máquina de estados).
3. **[03_CASOS_DE_USO_E_HISTORIAS_USUARIO.md](file:///d:/Usuario/analisisGithub/docs/03_CASOS_DE_USO_E_HISTORIAS_USUARIO.md):** Catálogo de 26 Casos de Uso (`CU-01` a `CU-26`) y 10 Historias de Usuario completas (`HU-01` a `HU-10`) en formato Anverso / Reverso con criterios de aceptación verificables.
4. **[04_DICCIONARIO_DE_DATOS_Y_ARQUITECTURA.md](file:///d:/Usuario/analisisGithub/docs/04_DICCIONARIO_DE_DATOS_Y_ARQUITECTURA.md):** Diccionario de datos campo por campo de las **22 pestañas relacionales** de `BD-PAWPATITAS-v3.xlsx`, arquitectura en capas con control de caché/locks y Diagrama Entidad-Relación (`erDiagram`).
5. **[05_EVALUACION_HEURISTICAS_NIELSEN.md](file:///d:/Usuario/analisisGithub/docs/05_EVALUACION_HEURISTICAS_NIELSEN.md):** Matriz de evaluación de las **10 Heurísticas de Usabilidad de Jakob Nielsen con calificación perfecta 20/20**, detallando evidencia visual y código de soporte en `Index.html`.

---

## 🛠️ Guía Rápida de Despliegue en Google Sheets + Apps Script

### Paso 1: Configurar la Base de Datos en Google Drive
1. Sube el archivo `BD-PAWPATITAS-v3.xlsx` a tu unidad de **Google Drive**.
2. Haz clic derecho sobre el archivo y selecciona **Abrir con > Hojas de cálculo de Google**.
3. Selecciona **Archivo > Guardar como hoja de cálculo de Google**. Comprueba que se carguen las 22 pestañas con sus filas pobladas.

### Paso 2: Crear y Desplegar el Proyecto en Google Apps Script
1. En la hoja de cálculo creada, dirígete al menú superior: **Extensiones > Apps Script**.
2. En el archivo `Código.gs`, borra el código por defecto y pega el contenido íntegro de [Codigo.gs](file:///d:/Usuario/analisisGithub/Codigo.gs).
3. En el panel izquierdo del editor, haz clic en el botón `+` junto a *Archivos* y selecciona **HTML**. Nómbralo exactamente `Index` (se creará `Index.html`).
4. Pega el contenido íntegro de [Index.html](file:///d:/Usuario/analisisGithub/Index.html) en el archivo HTML creado y guarda los cambios (`Ctrl + S`).

### Paso 3: Verificación Automatizada en el Editor de GAS
1. En el selector superior de funciones del editor de Apps Script, selecciona la función `testSistemaCompleto`.
2. Presiona el botón **Ejecutar**.
3. Revisa el registro de ejecución (*Execution Log*): debe mostrar `=== TEST SISTEMA COMPLETO: EXITOSO ===` con **149 aserciones automáticas aprobadas** (esquema de 22 pestañas, cotizador, cancelaciones, autenticación y dashboard).

### Paso 4: Publicar la Aplicación Web
1. Haz clic en el botón azul **Implementar > Nueva implementación**.
2. En el tipo de implementación (engranaje), elige **Aplicación web**.
3. Configura:
   * **Descripción:** `Paw Patita Cusco v4.0 Oficial`
   * **Ejecutar como:** `Yo (tu correo de Google)`
   * **Quién tiene acceso:** `Cualquier usuario` (para permitir el acceso a clientes y evaluadores).
4. Haz clic en **Implementar** y copia la **URL de la aplicación web**.

---

## 🧪 Verificación Local con Mock de GAS en Node.js

Para auditar y probar el sistema localmente sin necesidad de conexión activa a Google Workspace:

```bash
# Ejecutar la suite automatizada de pruebas mock
node tools/test_mock_gas.js
```

La suite valida:
* Sintaxis JS estricta (0 operadores `?.` ni `??`).
* Evaluación completa de `Codigo.gs` con mocks de `SpreadsheetApp`, `CacheService`, `LockService` y `Utilities`.
* Ejecución completa de `testSistemaCompleto()` (149 aserciones).
* Pruebas transaccionales de los 4 roles (login, cotización, reservas, check-in, billetera, SOS y analítica admin).

---

## 📂 Estructura del Repositorio

```text
paw-patita-cusco/
├── BD-PAWPATITAS-v3.xlsx              # Base de datos relacional normalizada (22 pestañas en 3FN, 154 filas)
├── Codigo.gs                          # Backend en GAS (2,428 líneas, 71 funciones RPC, locking, caché, RBAC)
├── Index.html                         # Frontend SPA SaaS (3,429 líneas, 4 dashboards, Chart.js, wizard 4 pasos)
├── README.md                          # Índice maestro del proyecto v4.0, credenciales y guía de despliegue
├── Informe_PawPatita_Actualizado.docx # Documento de informe oficial previo
├── Informe_analisis.md                # Especificación técnica inicial
├── docs/                              # Documentación técnica y académica exhaustiva v4.0
│   ├── 01_CHANGELOG_Y_TRAZABILIDAD_CAMBIOS.md
│   ├── 02_ESPECIFICACION_REQUISITOS_Y_REGLAS.md
│   ├── 03_CASOS_DE_USO_E_HISTORIAS_USUARIO.md
│   ├── 04_DICCIONARIO_DE_DATOS_Y_ARQUITECTURA.md
│   └── 05_EVALUACION_HEURISTICAS_NIELSEN.md
└── tools/                             # Herramientas de generación y pruebas automatizadas
    ├── construir_index.py             # Compilador y validador de sintaxis de Index.html
    ├── generar_bd_v4.py               # Generador de BD-PAWPATITAS-v3.xlsx con 22 pestañas
    ├── seed.json                      # Respaldo JSON de las 22 pestañas y 154 filas
    └── test_mock_gas.js               # Suite de pruebas automatizadas con mock completo de GAS
```

---

*Desarrollado con pasión y excelencia técnica por el equipo de estudiantes de la Universidad Continental (Cusco, 2026).*
