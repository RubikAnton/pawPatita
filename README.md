# 🐾 Paw Patita Cusco — Plataforma Web de Cuidado Canino Responsable (Versión Final)

> **Propuesta de StartUp Web, Ingeniería de Requisitos (SRS / STRS) y Evaluación UX/UI (10 Heurísticas de Nielsen)**  
> **Curso:** Análisis y Diseño de Software — NRC 39575  
> **Docente:** Holguin Herrera, Melisa Betys  
> **Estudiantes:** Chacón Copa, Angelo Ricardo; Huarancca Camala, Frank Smit; Illapuma Yupanqui, Jerson Reyder; Lovaton Casas, Arantxa Alejandra; Ortiz Gutierrez, Nasdig Jordan.  
> **Cusco, Perú — 2026**

---

## 📌 Descripción del Proyecto

**Paw Patita Cusco** es una aplicación web responsiva desarrollada sobre la arquitectura serverless de **Google Apps Script (GAS)** y respaldada por una base de datos relacional modelada en **Google Sheets** (`BD-PAWPATITAS-v3.xlsx`), diseñada para conectar a propietarios de mascotas (residentes locales y turistas) con cuidadores independientes evaluados y verificados en los distritos de la ciudad del Cusco (*Cusco Centro, Wanchaq, San Sebastián, San Jerónimo y Santiago*).

---

## 🚀 Innovaciones y Herramientas Avanzadas por Stakeholder

### 📅 1. Calendario de Disponibilidad Semanal (Público y Cuidador)
* **Vista en el Perfil Público del Cuidador (Modal):** Muestra una grilla visual de los 7 días de la semana (`Lunes` a `Domingo`) indicando los días y turnos disponibles (`✔ Disponible`) o de descanso (`✖ Descanso`) antes de realizar una reserva.
* **Gestor Interactivo en el Panel del Cuidador:** Permite al cuidador activar o desactivar sus días de atención con un solo clic y guardar su disponibilidad en tiempo real en la pestaña `perfiles_cuidadores`.

### 🐶 2. Herramientas para el Propietario (Local / Turista)
* **Carné Digital de Mascota (`PAW PATITA-ID`):** Registro de historia clínica, vacunas, peso, alergias, temperamento y fotografía alojada en **PostImg**.
* **Reserva por Periodo con Previsualización Visual:** Cálculo automático de días, tarifa diaria, comisión operativa (**15%**) y pago neto al cuidador (**85%**), mostrando las fotografías del cuidador y la mascota seleccionada, junto con la política de cancelación y reembolso.
* **🚨 Botón de Pánico / Emergencia Veterinaria S.O.S.:** Acceso directo desde sus reservas activas y panel principal que despliega las 5 clínicas veterinarias aliadas en Cusco (`clinicas_veterinarias`) y genera un ticket de atención inmediata en `incidencias_emergencias`.
* **⭐ Módulo de Calificación (1-5 Estrellas):** Evaluación post-servicio que registra el testimonio en `reseñas` y recalcula automáticamente el promedio de reputación pública del cuidador.
* **📸 Muro Fotográfico de Bienestar en Vivo:** Visualización en tiempo real de las fotografías subidas por el cuidador vía enlaces directos de **PostImg**.

### 💼 3. Herramientas para el Cuidador Independiente
* **Dashboard Operativo y Control de Estados:** KPIs semanales (servicios activos, culminados, ganancias netas 85% y reputación) y transición de estados de reserva (`Confirmada` → `En Curso` → `Finalizada`).
* **🧮 Calculadora Interactiva de Ganancias Netas (85%):** Simulador financiero donde el cuidador proyecta sus ingresos mensuales ingresando tarifa diaria, mascotas por día y días trabajados, descontando automáticamente el 15% de comisión de la plataforma.
* **Publicador de Ofertas y Reportes Fotográficos PostImg:** Creación de nuevas modalidades de cuidado y envío de fotos en vivo al muro de bienestar.

### 🛡️ 4. Herramientas para el Administrador
* **Panel Ejecutivo con KPIs Globales:** Monitoreo en vivo del Total Recaudado Bruto (100%), Comisiones Retenidas por Paw Patita (15%), Fondo Neto de Cuidadores (85%) y Cuidadores Activos.
* **Validación de Antecedentes Policiales y Penales:** Revisión documental con botones de **Aprobar** o **Rechazar** postulantes en un clic.
* **Resolución de Tickets S.O.S. y Liquidaciones (`liquidaciones_cuidadores`):** Cierre de alertas médicas veterinarias y desembolso del 85% a los cuidadores.

---

## ✅ Cumplimiento al 100% de las 10 Heurísticas de Jakob Nielsen (Rúbrica 20/20)

| # | Heurística de Nielsen | Puntaje | Implementación en `Index.html` |
| :---: | :--- | :---: | :--- |
| **1** | **Visibilidad del estado del sistema** | **2/2 (Sí)** | Spinner activo con mensajes contextuales, notificaciones Toast y badges claros (`Confirmada`, `En Curso`, `Finalizada`, `Cancelada`). |
| **2** | **Relación sistema-mundo real** | **2/2 (Sí)** | Lenguaje natural veterinario y de Cusco (distritos reales, Yape/Plin, *"Carné de Mascota"*), sin códigos internos crípticos expuestos. |
| **3** | **Control y libertad del usuario** | **2/2 (Sí)** | Botones explícitos **"Cancelar / Volver"** en todos los formularios y modales que limpian los inputs sin guardar, y cancelación de reservas. |
| **4** | **Consistencia y estándares** | **2/2 (Sí)** | Uniformidad total con Bootstrap 5.3.2, Bootstrap Icons 1.11, paleta cálida `#ff7e47` y tipografía amigable. |
| **5** | **Prevención de errores** | **2/2 (Sí)** | Validaciones en tiempo real: bloqueo de fecha fin anterior a inicio (`min` dinámico), bloqueo de tarifas/pesos negativos y campos vacíos. |
| **6** | **Reconocimiento antes que recuerdo** | **2/2 (Sí)** | Botón de ver/ocultar contraseña (ícono de ojo `bi-eye`), cuentas demo clicables y selectores con nombres, tarifas y fotos visibles. |
| **7** | **Flexibilidad y eficiencia de uso** | **2/2 (Sí)** | Filtros instantáneos en la landing page por tipo de servicio, distrito de Cusco, tarifa máxima y búsqueda por texto. |
| **8** | **Diseño estético y amigable (Temática Mascotas)** | **2/2 (Sí)** | Interfaz moderna, limpia y cálida enfocada en animales (iconos de perros y gatos, bordes suaves, tarjetas PostImg). |
| **9** | **Ayuda para reconocer y recuperarse de errores** | **2/2 (Sí)** | Alertas en rojo (`alert-danger`) en lenguaje sencillo indicando exactamente qué dato corregir. |
| **10** | **Ayuda y documentación** | **2/2 (Sí)** | Botón visible **"❓ Guía / Ayuda Rápida"** en la barra superior que abre un modal con preguntas frecuentes para dueños y cuidadores. |

---

## 🔑 Credenciales de Acceso Rápido para Demostración

El modal de inicio de sesión incluye píldoras interactivas para autocompletar estas cuentas con un solo clic:

| Rol de Usuario | Correo Electrónico | Contraseña | Funcionalidades a Evaluar |
| :--- | :--- | :--- | :--- |
| 🐶 **Propietario** | `angelo@gmail.com` | `123456` | Carné de mascotas, reserva por periodo con previsualización, Botón S.O.S., calificación (1-5★) y Muro de Fotos. |
| 💼 **Cuidador** | `carlos@gmail.com` | `123456` | Calendario de disponibilidad semanal (Lun-Dom), Calculadora de ganancias netas (85%), gestión de reservas y subida de fotos PostImg. |
| 🛡️ **Administrador** | `admin@pawpatita.pe` | `admin123` | KPIs financieros, validación de antecedentes policiales/penales, resolución de emergencias S.O.S. y liquidación de pagos (85%). |

---

## 📁 Estructura del Repositorio

```text
paw-patita-cusco/
├── Codigo.gs                          # Backend en Google Apps Script (SpreadsheetApp.getActiveSpreadsheet() + testSistema())
├── Index.html                         # Frontend responsivo con las 10 Heurísticas de Nielsen y Calendario Semanal
├── BD-PAWPATITAS-v3.xlsx              # Base de datos relacional en Google Sheets (13 pestañas pobladas y verificadas)
├── Informe_PawPatita_Actualizado.docx # Informe final en Word (.docx) con tablas de Nielsen, Stakeholders y marcadores de imágenes
├── Informe_analisis.md                # Especificación técnica completa en Markdown con los 49 diagramas base64
├── .gitignore                         # Exclusión de temporales de Python y sistema
└── README.md                          # Documentación general del proyecto
```

---

## 🛠️ Instrucciones de Despliegue en Google Apps Script

1. Sube o abre el archivo `BD-PAWPATITAS-v3.xlsx` en **Google Drive** y guárdalo como **Hoja de cálculo de Google** (verificando que estén las 13 pestañas).
2. En el menú superior, selecciona **Extensiones > Apps Script**.
3. Copia el contenido de `Codigo.gs` en el archivo `Código.gs` del editor.
4. Crea un archivo HTML llamado `Index.html` y pega el contenido de `Index.html`.
5. Ejecuta la función `testSistema()` en la barra superior del editor para comprobar en el registro de ejecución la lectura de las 13 pestañas y los 3 roles.
6. Haz clic en **Implementar > Nueva implementación > Aplicación web** (*Ejecutar como: Yo* / *Acceso: Cualquier usuario*) y abre el enlace generado.
