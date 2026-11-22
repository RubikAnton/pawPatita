# EVALUACIÓN DE LAS 10 HEURÍSTICAS DE USABILIDAD DE NIELSEN (20/20)

**Proyecto:** Paw Patita Cusco — Plataforma Integral de Cuidado Canino y Bienestar Animal  
**Entorno Tecnológico:** Frontend SPA (`Index.html`) + Google Apps Script (`HtmlService`)  
**Metodología de Evaluación:** Inspección Heurística Formal de Jakob Nielsen (10 Principios Generales para el Diseño de Interfaces de Usuario)  
**Calificación Final Auditada:** **20 / 20 Puntos (100% de Cumplimiento Excelente)**  
**Fecha:** Noviembre 2026  

---

## 1. Resumen Consolidado de la Evaluación

| N.º | Principio Heurístico de Usabilidad | Puntuación | Estado | Evidencia Principal en `Index.html` |
| :---: | :--- | :---: | :---: | :--- |
| **H1** | **Visibilidad del estado del sistema** | **2 / 2** | Cumplido Excelente | Spinner animado con mensaje explicativo, badges de estado con colores estándar, progreso del wizard en 4 pasos y contador de cupos. |
| **H2** | **Correspondencia entre el sistema y el mundo real** | **2 / 2** | Cumplido Excelente | Metáforas reconocibles: "Carné PAW PATITA-ID", "Billetera Digital", "Botón S.O.S. de Pánico", terminología cusqueña y moneda dual (PEN/USD). |
| **H3** | **Control y libertad del usuario** | **2 / 2** | Cumplido Excelente | Botones de retroceso paso a paso en el wizard, cierre seguro de modales con botón "X" o tecla Esc, y diálogo de confirmación antes de cancelar. |
| **H4** | **Consistencia y estándares** | **2 / 2** | Cumplido Excelente | Paleta de colores unificada (*Andes Pet Care*), tipografía estándar (`Outfit` + `Plus Jakarta Sans`), iconos semánticos de Bootstrap Icons. |
| **H5** | **Prevención de errores** | **2 / 2** | Cumplido Excelente | Validación de fechas (salida $\ge$ entrada), comprobación anti-overbooking antes de cotizar, desactivación de botones durante llamadas RPC. |
| **H6** | **Reconocimiento antes que recuerdo** | **2 / 2** | Cumplido Excelente | Desglose financiero completo en pantalla (días, recargo festivo, cupón), previsualización del perro en carné digital y campos con autocompletado. |
| **H7** | **Flexibilidad y eficiencia de uso** | **2 / 2** | Cumplido Excelente | Selector de cuentas de demostración con 1 clic en navbar, filtros rápidos por distrito y atajos de Check-In/Check-Out en tabla. |
| **H8** | **Diseño estético y minimalista** | **2 / 2** | Cumplido Excelente | Jerarquía visual nítida, tarjetas con espaciado armónico, eliminación de ruido visual y gráficos ejecutivos limpios vía Chart.js. |
| **H9** | **Ayudar a reconocer, diagnosticar y recuperarse de errores** | **2 / 2** | Cumplido Excelente | Toasts informativos con alertas comprensibles en español neutro indicando la causa exacta y la acción requerida, sin códigos crípticos. |
| **H10**| **Ayuda y documentación** | **2 / 2** | Cumplido Excelente | Modal de Términos y Condiciones v4.0 accesible, infografía visual de la política de reembolsos escalonados y tooltips contextuales. |
| **TOTAL** | **Calificación Global Auditada** | **20 / 20** | **Excelente** | **Máximo puntaje en Usabilidad y Experiencia de Usuario (UX/UI)** |

---

## 2. Auditoría Detallada Heurística por Heurística

### Heurística 1: Visibilidad del Estado del Sistema (Puntuación: 2 / 2)
*El sistema siempre debe mantener a los usuarios informados sobre lo que está ocurriendo, mediante una retroalimentación adecuada dentro de un tiempo razonable.*
* **Cumplimiento en `Index.html`:**
  1. **Overlay Global de Carga (`#global-spinner-overlay`):** Ante cualquier interacción que consulte al backend, se activa un telón de fondo oscuro translúcido con una animación de latido de corazón (`bi-heart-pulse-fill`) y un mensaje contextual explícito (ej: *"Comunicando con el servidor seguro..."*, *"Calculando cálculo de reembolso..."*).
  2. **Apagado Garantizado:** Gracias a que cada llamada a `google.script.run` implementa `.withFailureHandler(function(err) { loader(false); ... })`, el usuario nunca queda atrapado en un estado de congelamiento infinito si la conexión falla.
  3. **Indicador de Progreso del Wizard:** El modal de reserva (`#modal-wizard-reserva`) cuenta con una barra de 4 pasos numerados (`bullet-step-1` a `bullet-step-4`) que cambian de color a naranja activo (`active`) y verde completado (`completed`), mostrando al usuario exactamente en qué etapa se encuentra.
  4. **Badges Cromáticos de Estado:** Los estados de las reservas y fichas caninas utilizan códigos de color universales (Verde para `Confirmada` / `Validada`, Ámbar para `Pendiente`, Azul para `En Curso`, Rojo para `Cancelada`, Morado para `En Disputa`).

---

### Heurística 2: Correspondencia entre el Sistema y el Mundo Real (Puntuación: 2 / 2)
*El sistema debe hablar el lenguaje de los usuarios, con palabras, frases y conceptos familiares para el usuario, en lugar de términos orientados al sistema.*
* **Cumplimiento en `Index.html`:**
  1. **Metáfora del Carné Digital (`PAW PATITA-ID`):** El diseño simula visualmente una tarjeta física de identificación canina con chip dorado, foto del perro, raza, tamaño y sello de acreditación sanitaria por la clínica veterinaria.
  2. **Metáfora de Billetera Digital:** La sección de ingresos del cuidador utiliza la analogía financiera de "Saldo en Garantía" (fondos en custodia que se liberan al entregar a la mascota) y "Saldo Disponible" (dinero listo para retirar a Yape o Banco).
  3. **Terminología Andina y Turística de Cusco:** Se emplean conceptos del entorno real cusqueño: distritos reales (*Wanchaq, San Blas, San Sebastián*), festividades emblemáticas (*Inti Raymi, Fiestas Jubilares*), servicio extra de *"Recojo en Hotel para excursiones a Machu Picchu"* y botón de pánico de *"S.O.S."*.
  4. **Moneda Dual:** Los turistas extranjeros pueden alternar la visualización a Dólares (`USD`), viendo reflejado el precio en una moneda que comprenden de forma natural.

---

### Heurística 3: Control y Libertad del Usuario (Puntuación: 2 / 2)
*Los usuarios a menudo eligen acciones por error y necesitan una "salida de emergencia" claramente marcada para dejar el estado no deseado sin tener que pasar por un diálogo extendido.*
* **Cumplimiento en `Index.html`:**
  1. **Botones de Retroceso en el Wizard:** En los pasos 2, 3 y 4 del wizard de reserva, existe un botón visible `<button class="btn btn-outline-secondary" onclick="wizardAvanzarPaso(N-1)"> Volver</button>` que permite regresar y corregir fechas o servicios sin perder los datos previamente ingresados.
  2. **Cierre Inmediato de Modales:** Todos los modales del sistema cuentan con un botón de cierre en forma de cruz (`btn-close`) en la esquina superior derecha y admiten el cierre mediante clic en el fondo o pulsando la tecla `Escape`.
  3. **Confirmación Previa en Acciones Críticas:** Al ejecutar *Check-In*, *Check-Out* o cancelar una reserva, el sistema presenta diálogos de confirmación explícita con opción de arrepentimiento (`"Mantener Reserva"`), impidiendo que un clic involuntario cancele un servicio.

---

### Heurística 4: Consistencia y Estándares (Puntuación: 2 / 2)
*Los usuarios no deberían tener que preguntarse si diferentes palabras, situaciones o acciones significan lo mismo. Siga las convenciones de la plataforma y de la industria.*
* **Cumplimiento en `Index.html`:**
  1. **Paleta de Identidad Visual Unificada:** Todos los elementos interactivos primarios utilizan el estilo `.btn-paw` con degradado corporativo (`#FF7E47` a `#FF5722`) y bordes redondeados (`border-radius: 12px`), manteniendo coherencia entre landing, dashboards y modales.
  2. **Convenciones de Navegación SaaS:** La disposición de la aplicación privada utiliza el patrón estándar de la industria de **Barra Lateral Izquierda (Sidebar)** con iconos reconocibles de Bootstrap Icons y panel de trabajo centralizado.
  3. **Convenciones Numéricas y de Fechas:** Las fechas siguen el estándar internacional ISO (`YYYY-MM-DD`) y las divisas se presentan con el símbolo oficial `S/` o `$`, con dos decimales exactos y formato de miles.

---

### Heurística 5: Prevención de Errores (Puntuación: 2 / 2)
*Aún mejor que los buenos mensajes de error es un diseño cuidadoso que evite que ocurra un problema en primer lugar.*
* **Cumplimiento en `Index.html`:**
  1. **Validación Lógica de Rango de Fechas:** El cotizador bloquea el avance si la fecha de salida es anterior a la fecha de ingreso (`exigir(fin >= ini)`), mostrando una alerta preventiva antes de intentar la reserva.
  2. **Control Anti-Overbooking en Cliente y Servidor:** El selector de fechas consulta la disponibilidad en tiempo real; si el cuidador tiene el cupo lleno o el día bloqueado, el sistema deshabilita el botón de confirmación indicando el motivo exacto.
  3. **Inhabilitación de Campos Críticos:** En los formularios de cancelación y calificación, los identificadores de reserva se transfieren mediante campos ocultos de sólo lectura (`<input type="hidden">`), eliminando la posibilidad de que el usuario equivoque el código a cancelar.
  4. **Protección contra Doble Clic:** Durante la emisión del S.O.S. o el procesamiento del pago, el overlay del spinner bloquea la pantalla completa, impidiendo que el usuario envíe dos transacciones duplicadas por impaciencia.

---

### Heurística 6: Reconocimiento antes que Recuerdo (Puntuación: 2 / 2)
*Minimice la carga de memoria del usuario haciendo visibles los elementos, las acciones y las opciones. El usuario no debería tener que recordar información de una parte del proceso a otra.*
* **Cumplimiento en `Index.html`:**
  1. **Desglose de Cotización Siempre Visible:** En el paso 3 del wizard, el sistema expone en una tabla clara el número de días facturados, la tarifa base por noche, el recargo exacto por festividad en Cusco, los extras sumados y el descuento aplicado por cupón, evitando que el usuario deba calcular mentalmente de dónde sale el total.
  2. **Previsualización de la Mascota Seleccionada:** Al elegir a su perro en el desplegable, el sistema renderiza en el acto una tarjeta con su foto, raza y carné PAW-ID para que el usuario confirme visualmente que está reservando para la mascota correcta.
  3. **Catálogo con Tarjetas Ricas en Información:** Cada tarjeta de cuidador exhibe su foto de perfil, tarifa mínima, años de experiencia, código `HU E-Code`, promedio en estrellas y disponibilidad semanal resumida en pills legibles (`Lun..Sab`).

---

### Heurística 7: Flexibilidad y Eficiencia de Uso (Puntuación: 2 / 2)
*Los aceleradores (no vistos por los usuarios novatos) a menudo pueden acelerar la interacción para el usuario experto de tal manera que el sistema pueda atender tanto a usuarios inexpertos como experimentados.*
* **Cumplimiento en `Index.html`:**
  1. **Selector Rápido de Demostración ("Demo Acceso"):** En la barra de navegación superior existe un menú desplegable con 1 clic que permite iniciar sesión instantáneamente con cualquiera de los 6 roles de prueba (*Propietario Local, Turista, Cuidador Aprobado, Cuidador Pendiente, Veterinaria y Administrador*) sin tener que memorizar ni teclear contraseñas.
  2. **Filtros Rápidos en el Catálogo:** Los usuarios pueden buscar cuidadores combinando simultáneamente filtros por distrito de Cusco, categoría de servicio y fecha aproximada en una sola interacción.
  3. **Acciones Rápidas en Tablas:** El cuidador y el administrador disponen de botones de acción directa en cada fila de sus tablas (*Aceptar, Rechazar, Check-In, Check-Out, Validar, Dictamen*), permitiendo despachar solicitudes en un solo clic.

---

### Heurística 8: Diseño Estético y Minimalista (Puntuación: 2 / 2)
*Los diálogos no deben contener información que sea irrelevante o rara vez necesaria. Cada unidad extra de información en un diálogo compite con las unidades relevantes de información y disminuye su visibilidad relativa.*
* **Cumplimiento en `Index.html`:**
  1. **Jerarquía Visual Limpia y Espaciada:** Se eliminaron los contenedores amontonados de la versión anterior; cada dashboard presenta una cabecera clara con título, descripción y botones de acción rápida alineados a la derecha.
  2. **Tableros de Datos Ejecutivos con Chart.js:** En lugar de saturar al Administrador con tablas densas de texto interminable, la analítica se visualiza a través de un gráfico de barras (usuarios por distrito) y un gráfico doughnut (servicios demandados), logrando una interpretación ejecutiva en segundos.
  3. **Tarjetas Flotantes con Sombras Suaves:** Se emplean tarjetas `.paw-card` con bordes sutiles (`#E2E8F0`) y sombras difusas (`box-shadow: 0 4px 20px rgba(15,23,42,0.04)`), logrando una apariencia fresca, profesional y de startup moderna.

---

### Heurística 9: Ayudar a los Usuarios a Reconocer, Diagnosticar y Recuperarse de Errores (Puntuación: 2 / 2)
*Los mensajes de error deben expresarse en un lenguaje sencillo (sin códigos), indicar con precisión el problema y sugerir constructivamente una solución.*
* **Cumplimiento en `Index.html`:**
  1. **Notificaciones Toast Amigables en Español:** Ante cualquier falla, se despliega un toast de color rojo (`danger`) que traduce la causa a lenguaje humano: ej. *"Por favor selecciona una mascota para continuar"*, *"Selecciona un rango de fechas válido (salida posterior a ingreso)"*, *"El cupón INTIRAYMI15 no existe o está vencido"*.
  2. **Mensajes Preventivos en el S.O.S.:** Si un usuario intenta activar el botón de pánico sin haber iniciado sesión, el sistema no colapsa; le informa cortésmente: *"Inicia sesión o regístrate como Propietario para emitir una alerta S.O.S. vinculada a tu reserva."* y le abre automáticamente el modal de ingreso.
  3. **Tolerancia a Enlaces Rotos:** Si un enlace de imagen en `PostImg` es eliminado o falla, el atributo `onerror` reemplaza de inmediato la imagen rota por un avatar canino estilizado, impidiendo que la pantalla muestre iconos de error rotos del navegador.

---

### Heurística 10: Ayuda y Documentación (Puntuación: 2 / 2)
*Aunque es mejor que el sistema se pueda usar sin documentación, puede ser necesario proporcionar ayuda y documentación. Dicha información debe ser fácil de buscar, centrada en la tarea del usuario, enumerar los pasos concretos a seguir y no ser demasiado extensa.*
* **Cumplimiento en `Index.html`:**
  1. **Modal de Términos y Condiciones Legales (`#modal-tyc`):** Accesible de forma ubicua desde la barra de navegación, el pie de página y los formularios de reserva. Presenta un texto estructurado en 4 capítulos que explican la naturaleza del servicio, la cobertura médica de emergencia y los derechos del consumidor.
  2. **Infografía de la Política de Reembolsos:** En la página principal existe una sección visual dedicada exclusivamente a explicar con tres tarjetas claras las tres reglas de reembolso: **100%** (>48h), **70%** (24 a 48h) y **0%** (<24h).
  3. **Textos de Ayuda en Formulario (`form-text`):** En campos especiales como la carga de fotos, se incluye un texto de soporte con enlace directo: *"Puedes subir la foto en postimages.org y pegar aquí el enlace directo."*
