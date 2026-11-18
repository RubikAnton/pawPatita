# 🐾 Paw Patita Cusco — Plataforma Web de Cuidado Canino Responsable

> **Propuesta de StartUp Web e Ingeniería de Requisitos (SRS / STRS)**  
> **Curso:** Análisis y Diseño de Software — NRC 39575  
> **Docente:** Holguin Herrera, Melisa Betys  
> **Estudiantes:** Chacón Copa, Angelo Ricardo; Huarancca Camala, Frank Smit; Illapuma Yupanqui, Jerson Reyder; Lovaton Casas, Arantxa Alejandra; Ortiz Gutierrez, Nasdig Jordan.  
> **Cusco, Perú — 2026**

---

## 📌 Descripción del Proyecto

**Paw Patita Cusco** es una aplicación web responsiva desarrollada sobre la arquitectura serverless de **Google Apps Script (GAS)** y respaldada por una base de datos relacional modelada en **Google Sheets** (`BD-PAWPATITAS-v3.xlsx`), diseñada para conectar a propietarios de perros (residentes y turistas) con cuidadores independientes evaluados y certificados en la ciudad del Cusco (Cusco Centro, Wanchaq, San Sebastián, San Jerónimo y Santiago).

### 🌟 Características Principales
* **Catálogo Público de Cuidadores:** Landing page abierta sin login obligatorio con tarjetas interactivas, reputación en estrellas, tarifas por día y modal de perfil público.
* **Filtros Dinámicos en Cusco:** Búsqueda en vivo por modalidad de servicio (`HU E-Code`) y por distritos de la provincia de Cusco.
* **Ficha Canina Digital (`PAW PATITA-ID`):** Registro clínico, de vacunas, alergias y conducta del perro con soporte de fotos remotas vía **PostImg**.
* **Reserva por Periodo de Fechas:** Cálculo automático del total de días, costo del servicio, comisión transparente de la plataforma (**15%**) y liquidación neta al cuidador (**85%**).
* **Muro de Seguimiento en Tiempo Real:** Bitácora donde el cuidador publica notas de bienestar y fotografías en vivo mediante enlaces directos de **PostImg** (`https://i.postimg.cc/...`).
* **Directorio S.O.S. de Emergencias:** Red aliada de 5 clínicas veterinarias georreferenciadas en Cusco con enlace de llamada telefónica inmediata.
* **Layout Privado por Roles:** Sidebar lateral izquierdo diferenciado para Propietarios, Cuidadores y Administradores, cumpliendo con más de 6 Heurísticas de Usabilidad de Nielsen.

---

## 🔑 Credenciales de Acceso Rápido para Demostración

El sistema incluye píldoras interactivas en el modal de inicio de sesión para autocompletar estas credenciales con un solo clic:

| Rol de Usuario | Correo Electrónico | Contraseña | Descripción del Acceso |
| :--- | :--- | :--- | :--- |
| 🐶 **Propietario** | `angelo@gmail.com` | `123456` | Gestión de mascotas PAW-ID, contratación por periodo, cancelación con política del 15% y muro de fotos. |
| 💼 **Cuidador** | `carlos@gmail.com` | `123456` | Panel de control de reservas asignadas, publicación de ofertas HU E-Code y subida de reportes fotográficos. |
| 🛡️ **Administrador** | `admin@pawpatita.pe` | `admin123` | Aprobación de antecedentes policiales/penales, resolución de alertas médicas y auditoría financiera (15% comisión / 85% liquidación). |

---

## 📁 Estructura del Repositorio

```text
paw-patita-cusco/
├── Codigo.gs                          # Backend en Google Apps Script (Controlador, API RPC y función testSistema())
├── Index.html                         # Frontend responsivo (Bootstrap 5, Bootstrap Icons, JS ES5 compatible)
├── BD-PAWPATITAS-v3.xlsx              # Base de datos relacional en Google Sheets (13 pestañas normalizadas)
├── Informe_analisis.md                # Especificación completa de requisitos (STRS/SRS) con 49 diagramas base64
├── Informe_PawPatita_Actualizado.docx # Documento Word formal con formato profesional y marcadores de imágenes
├── .gitignore                         # Exclusión de temporales de Python y sistema
└── README.md                          # Documentación técnica del proyecto
```

---

## 📊 Arquitectura de Base de Datos (13 Pestañas Relacionales)

1. `usuarios`: Cuentas de Propietarios, Cuidadores y Administrador con DNI y ubicación en Cusco.
2. `mascotas`: Ficha digital `PAW PATITA-ID` con vacunas, conducta y `foto_url` (PostImg).
3. `perfiles_cuidadores`: Experiencia, capacidad máxima, reputación y `foto_url` para catálogo.
4. `servicios`: Modalidades publicadas con código único `HU E-Code` y tarifa por día.
5. `reservas`: Contrataciones por rango de fechas (`fecha_inicio` a `fecha_fin`) y estados operativos.
6. `pagos`: Transacciones con Yape/Plin, retención de comisión (15%) y neto del cuidador (85%).
7. `liquidaciones_cuidadores`: Registro de transferencias de liquidación bancaria a cuidadores.
8. `reportes_seguimiento`: Bitácora de actividades y paseos durante el servicio en curso.
9. `fotos_reporte`: Enlaces directos de imágenes de bienestar alojadas en **PostImg**.
10. `clinicas_veterinarias`: Directorio de emergencias aliadas en Cusco Centro, Wanchaq, San Sebastián, San Jerónimo y Santiago.
11. `antecedentes_cuidadores`: Certificados policiales y penales para validación administrativa.
12. `incidencias_emergencias`: Tickets prioritarios y derivaciones médicas veterinarias.
13. `reseñas`: Calificaciones de 1 a 5 estrellas y comentarios de satisfacción.

---

## 🚀 Despliegue en Google Apps Script

### Método 1: Despliegue Directo en Google Drive
1. En Google Drive, crea una nueva **Hoja de cálculo de Google** e importa o copia las 13 pestañas de `BD-PAWPATITAS-v3.xlsx`.
2. En la hoja de cálculo, ve al menú **Extensiones > Apps Script**.
3. Reemplaza el contenido del archivo `Código.gs` con el código de `Codigo.gs`.
4. Añade un archivo HTML llamado `Index.html` y pega el código de `Index.html`.
5. Ejecuta la función `testSistema()` desde el editor de Apps Script para verificar lectura y escritura sobre las 13 pestañas.
6. Haz clic en **Implementar > Nueva implementación**, selecciona el tipo **Aplicación web**:
   - **Ejecutar como:** *Yo (tu cuenta de Google)*.
   - **Quién tiene acceso:** *Cualquier usuario*.
7. Abre la URL web generada y prueba la aplicación.

### Método 2: Despliegue con Google Clasp CLI
```bash
# Instalar clasp globalmente
npm install -g @google/clasp

# Iniciar sesión en tu cuenta de Google
clasp login

# Clonar o crear el script vinculado
clasp create --title "Paw Patita Cusco" --type webapp

# Subir los archivos
clasp push

# Desplegar la aplicación web
clasp deploy --description "Paw Patita Cusco v3.0"
```

---

## 📄 Licencia y Derechos
Desarrollado con fines académicos y de impacto social para la ciudad del Cusco por el equipo de estudiantes de la carrera de Ingeniería de Sistemas (2026).
