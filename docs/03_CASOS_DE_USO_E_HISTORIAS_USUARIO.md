# CASOS DE USO E HISTORIAS DE USUARIO (v4.0)

**Proyecto:** Paw Patita Cusco — Plataforma Integral de Cuidado Canino y Bienestar Animal  
**Entorno Tecnológico:** Google Apps Script + Google Sheets + HtmlService  
**Versión del Documento:** 4.0  
**Fecha:** Noviembre 2026  

---

## 1. Modelo de Actores del Sistema

```
                      +-----------------------------+
                      |       ACTORES DEL SISTEMA   |
                      +-----------------------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
+------------------+       +-------------------+       +--------------------+
|   PROPIETARIO    |       |     CUIDADOR      |       |      CLÍNICA       |
|  - Local         |       |   INDEPENDIENTE   |       |  VETERINARIA 24H   |
|  - Turista Cusco |       |  - Aprobado       |       |  (Actor Activo)    |
|                  |       |  - Pendiente      |       +--------------------+
+------------------+       +-------------------+                 |
         |                           |                           |
         +---------------------------+---------------------------+
                                     |
                      +-----------------------------+
                      |    ADMINISTRADOR DE RED     |
                      |   (Gobernanza y Finanzas)   |
                      +-----------------------------+
```

---

## 2. Catálogo de Casos de Uso del Sistema (CU)

### 2.1. Paquete: Gestión de Propietarios y Mascotas
* **CU-01 (Registro de Propietario):** Permite darse de alta en la plataforma eligiendo entre *Local* o *Turista en Cusco*. Si es turista, registra hotel de estadía para el servicio de recojo.
* **CU-02 (Gestión de Carné PAW PATITA-ID):** Permite registrar a un perro, cargar su fotografía, cartilla sanitaria y notas de temperamento. Genera el carné con código identificador único `PAW-XXX`.
* **CU-03 (Búsqueda y Filtrado de Cuidadores):** Explora cuidadores verificados por distrito de Cusco, categoría de servicio, fechas y tarifa referencial en Soles o Dólares.
* **CU-04 (Cotización y Creación de Reserva Wizard 4 Pasos):** Wizard interactivo que guía al usuario en selección de perro, fechas, extras (baño, recojo hotel), cupón y pasarela simulada.
* **CU-05 (Cancelación con Reembolso Escalonado):** Solicita la anulación de la reserva y previsualiza el cálculo automático de reembolso según las horas restantes (>48h, 24–48h, <24h).
* **CU-06 (Activación de Emergencia S.O.S.):** Botón de pánico que dispara una alerta inmediata hacia la clínica veterinaria aliada más cercana en Cusco.
* **CU-07 (Apertura de Disputa):** Formulario de reclamo en caso de inconformidad grave durante el servicio para congelar fondos hasta resolución administrativa.
* **CU-08 (Calificación del Servicio):** Envío de reseña multidimensional (1-5 estrellas) y comentario una vez finalizada la custodia.
* **CU-09 (Muro Privado de Seguimiento):** Visualización cronológica de fotos y notas enviadas por el cuidador durante la estancia.

### 2.2. Paquete: Gestión de Cuidadores Independientes
* **CU-10 (Postulación con Antecedentes):** Envío de documentación policial y comprobante de domicilio vía enlaces directos `PostImg`.
* **CU-11 (Gestión de Agenda Mensual y Cupos):** Visualización de ocupación por día, bloqueo/desbloqueo de fechas y configuración de plantilla semanal.
* **CU-12 (Aprobación/Rechazo de Reservas):** Respuesta a solicitudes entrantes con motivo obligatorio si se rechaza el cupo.
* **CU-13 (Ejecución de Check-In y Check-Out):** Marcación oficial de inicio y fin del servicio físico, permitiendo la liberación de fondos de garantía.
* **CU-14 (Publicación de Fotos al Muro):** Envío de fotos y notas de estado durante la reserva para informar al propietario.
* **CU-15 (Gestión de Billetera y Solicitud de Retiro):** Consulta de fondos en garantía y disponibles, y solicitud de transferencia bancaria o Yape.
* **CU-16 (Respuesta a Reseñas):** Emisión de réplica pública a los comentarios de los clientes en su perfil.

### 2.3. Paquete: Gestión de Clínicas Veterinarias Aliadas
* **CU-17 (Atención de Emergencias S.O.S.):** Panel de triaje para tomar casos derivados en Cusco, pasar a *En Atención Clínica* o *Estabilizada*.
* **CU-18 (Alta Médica y Diagnóstico Clínico):** Cierre del caso de emergencia con diagnóstico, tratamiento e informe de alta médica.
* **CU-19 (Validación Sanitaria de Fichas Caninas):** Revisión de cartilla de vacunación y dictamen médico oficial para validar o rechazar el carné `PAW PATITA-ID`.
* **CU-20 (Mantenimiento de Horarios y Contacto de Emergencia):** Edición de teléfono 24 horas y tarifas de urgencia.

### 2.4. Paquete: Administración de Red y Gobernanza
* **CU-21 (Supervisión Ejecutiva y Analítica Chart.js):** Monitoreo de KPIs de ingresos, comisiones, alertas y gráficos de distritos/servicios.
* **CU-22 (Auditoría y Aprobación de Postulantes):** Revisión de antecedentes policiales para admitir o rechazar cuidadores en la red.
* **CU-23 (Ejecución de Reembolsos y Conciliación):** Autorización formal de solicitudes de cancelación y devolución de fondos.
* **CU-24 (Liquidación y Desembolso a Cuidadores):** Autorización de retiros y registro de número de operación bancaria.
* **CU-25 (Gestión de Tarifas Estacionales, Cupones y TyC):** Configuración de multiplicadores para *Inti Raymi*, creación de cupones y versionado legal.
* **CU-26 (Exploración de Bitácora de Auditoría):** Trazabilidad inmutable de todos los eventos del sistema.

---

## 3. Especificación Formal de Historias de Usuario (HU)

### HU-01: Registro y Diferenciación de Propietario Turista en Cusco
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-01` | **Prioridad:** Alta | **Estimación:** 3 Puntos
  * **Como:** Propietario turista que visita Cusco (nacional o extranjero).
  * **Quiero:** Registrarme indicando mi país de origen, idioma preferido y hotel donde me hospedo.
  * **Para:** Que el cuidador sepa dónde recoger a mi mascota cuando vaya de excursión a Machu Picchu y pueda comunicarme en mi idioma.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* el usuario selecciona el tipo de propietario "Turista", *cuando* se despliega el formulario, *entonces* el sistema debe mostrar obligatoriamente el campo para ingresar el nombre del hotel u hospedaje en Cusco.
  * **Criterio 2:** *Dado que* el turista completa su registro, *cuando* presiona "Crear Cuenta", *entonces* el sistema debe registrar en la base de datos `subtipo_propietario = 'Turista'` y su aceptación de los Términos y Condiciones vigentes.
  * **Criterio 3:** *Dado que* el turista navega por la plataforma, *cuando* utiliza el conmutador de divisa, *entonces* todos los precios deben mostrarse en Dólares (`USD`) con el tipo de cambio oficial referencial de $S/\ 3.75$.

---

### HU-02: Cotización Dinámica con Temporada Turística y Cupones Promocionales
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-02` | **Prioridad:** Alta | **Estimación:** 5 Puntos
  * **Como:** Propietario de una mascota.
  * **Quiero:** Cotizar una estadía seleccionando fechas y servicios extras para previsualizar el desglose de precios.
  * **Para:** Conocer con total transparencia el costo exacto antes de pagar, incluyendo recargos por festividades en Cusco o descuentos por cupones.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* el usuario selecciona fechas que coinciden con el periodo de *Inti Raymi* (ej: 23 al 25 de junio), *cuando* el cotizador calcula el monto, *entonces* debe aplicar automáticamente el factor multiplicador del $1.20$ e identificar la temporada festiva.
  * **Criterio 2:** *Dado que* el usuario ingresa el cupón promocional `MACHUPICCHU15`, *cuando* presiona "Aplicar Cupón", *entonces* el sistema valida que sea turista y aplica un 15% de descuento sobre el subtotal.
  * **Criterio 3:** *Dado que* el usuario marca el servicio extra de baño higiénico, *cuando* se recalcula el total, *entonces* se añaden exactamente $S/\ 25.00$ desglosados en el recibo.

---

### HU-03: Pasarela de Pago Simulada con Billeteras Móviles y Tarjetas
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-03` | **Prioridad:** Alta | **Estimación:** 5 Puntos
  * **Como:** Propietario que completa el wizard de reserva.
  * **Quiero:** Elegir entre pagar con código QR de Yape/Plin o tarjeta bancaria simulada.
  * **Para:** Asegurar la reserva de forma inmediata y obtener un comprobante con número de operación.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* el usuario selecciona el método "Yape/Plin", *cuando* avanza al paso 4 del wizard, *entonces* el sistema muestra el código QR dinámico y el número telefónico oficial de plataforma para transferencia.
  * **Criterio 2:** *Dado que* el usuario selecciona "Tarjeta Visa/Mastercard", *cuando* ingresa número, expiración y CVV, *entonces* el sistema simula la tokenización bancaria y registra únicamente los últimos 4 dígitos por seguridad.
  * **Criterio 3:** *Dado que* se confirma el pago, *cuando* finaliza la transacción, *entonces* se genera un comprobante con formato `B001-XXXXXX`, la reserva pasa a `Pendiente Confirmación` y el dinero queda retenido en garantía.

---

### HU-04: Solicitud de Cancelación con Reembolso Escalonado Automático
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-04` | **Prioridad:** Crítica | **Estimación:** 8 Puntos
  * **Como:** Propietario con una reserva confirmada que sufrió un imprevisto de viaje.
  * **Quiero:** Solicitar la cancelación de mi reserva y ver el cálculo de reembolso que me corresponde.
  * **Para:** Recuperar mi dinero conforme a las políticas pactadas sin intermediación manual demorada.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* la solicitud se realiza con más de 48 horas de anticipación a las 08:00 hrs del día de inicio, *cuando* el sistema liquida la cancelación, *entonces* asigna 100% de reembolso ($S/\ 0.00$ de penalidad).
  * **Criterio 2:** *Dado que* la solicitud se realiza entre 24 y 48 horas de anticipación, *cuando* el sistema procesa la regla, *entonces* asigna 70% de reembolso al propietario, 15% de penalidad a la plataforma y 15% de compensación al cuidador.
  * **Criterio 3:** *Dado que* la solicitud se realiza con menos de 24 horas de antelación, *cuando* se confirma la acción, *entonces* el reembolso monetario es $0\%$, asignando $85\%$ al cuidador por bloqueo de cupo y $15\%$ a la plataforma.

---

### HU-05: Muro Privado de Seguimiento Fotográfico con PostImg
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-05` | **Prioridad:** Media | **Estimación:** 3 Puntos
  * **Como:** Propietario que dejó a su perro al cuidado de un tercero.
  * **Quiero:** Ver en mi panel un muro privado con las fotos y reportes enviados por el cuidador.
  * **Para:** Sentirme tranquilo viendo cómo pasea y descansa mi mascota en tiempo real.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* el cuidador sube una fotografía a `PostImg` y redacta una nota, *cuando* presiona "Publicar Reporte", *entonces* se inserta el registro en `reportes_seguimiento` y `fotos_reporte`.
  * **Criterio 2:** *Dado que* el propietario entra a su pestaña "Muro de Fotos", *cuando* carga la vista, *entonces* solo visualiza los reportes correspondientes a sus propias mascotas y reservas.
  * **Criterio 3:** *Dado que* una imagen externa falla en cargar, *cuando* se dispara el evento `onerror`, *entonces* se reemplaza automáticamente por la imagen de respaldo por defecto para no romper el diseño.

---

### HU-06: Control Anti-Overbooking en Agenda Interactiva del Cuidador
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-06` | **Prioridad:** Alta | **Estimación:** 5 Puntos
  * **Como:** Cuidador independiente.
  * **Quiero:** Que el sistema bloquee automáticamente los días en que ya alcancé mi capacidad máxima de perros.
  * **Para:** No sobrecargarme de trabajo y garantizar una atención personalizada y segura.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* un cuidador tiene una capacidad máxima de 3 perros, *cuando* se confirman 3 reservas para una misma fecha, *entonces* la celda de la fecha en el calendario pasa al estado `Agotado` (color rojo).
  * **Criterio 2:** *Dado que* un cliente intenta reservar en una fecha agotada o bloqueada, *cuando* el cotizador evalúa la disponibilidad, *entonces* rechaza la operación informando el día exacto sin cupos disponibles.
  * **Criterio 3:** *Dado que* el cuidador hace clic en un día en su agenda, *cuando* confirma la acción, *entonces* puede bloquear manualmente el día para descansar.

---

### HU-07: Billetera Digital del Cuidador y Liquidación de Retiros
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-07` | **Prioridad:** Alta | **Estimación:** 5 Puntos
  * **Como:** Cuidador independiente que finalizó exitosamente un servicio.
  * **Quiero:** Que mis ingresos netos (85%) se liberen a mi saldo disponible para solicitar retiros a Yape o Banco.
  * **Para:** Cobrar oportunamente por mi labor con plena conciliación financiera.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* una reserva está en curso, *cuando* el cuidador consulta su billetera, *entonces* el monto figura en la categoría "Saldo en Garantía".
  * **Criterio 2:** *Dado que* el cuidador ejecuta el *Check-Out*, *cuando* se actualiza el estado a `Finalizada`, *entonces* los fondos pasan inmediatamente a "Saldo Disponible para Retiro".
  * **Criterio 3:** *Dado que* el cuidador solicita un retiro de su saldo disponible, *cuando* el Administrador realiza la transferencia, *entonces* se registra el número de operación bancaria (`OP-XXXXXX`) y la liquidación pasa a estado `Pagado`.

---

### HU-08: Activación y Triage de Emergencias S.O.S. en Clínica Veterinaria Aliada
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-08` | **Prioridad:** Crítica | **Estimación:** 8 Puntos
  * **Como:** Cuidador o Propietario ante un accidente grave de la mascota.
  * **Quiero:** Pulsar el botón S.O.S. para que una clínica veterinaria de guardia en Cusco atienda el caso.
  * **Para:** Salvar la vida del animal brindándole auxilio médico inmediato y protocolizado.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* se activa el S.O.S., *cuando* se envía la alerta, *entonces* el sistema busca la clínica aliada 24h más cercana y le deriva la incidencia en estado `Activa`.
  * **Criterio 2:** *Dado que* el médico veterinario recibe la alerta, *cuando* pulsa "Tomar Caso", *entonces* el estado cambia a `En Atención Clínica` y se notifica al dueño y al cuidador con el teléfono de emergencia.
  * **Criterio 3:** *Dado que* la mascota es atendida y estabilizada, *cuando* el veterinario ingresa diagnóstico, tratamiento y costo, *entonces* el caso pasa a `Resuelta` y queda registrado en el carné de la mascota.

---

### HU-09: Validación Médica Sanitaria de Fichas Caninas PAW PATITA-ID
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-09` | **Prioridad:** Media | **Estimación:** 3 Puntos
  * **Como:** Médico veterinario de una clínica aliada.
  * **Quiero:** Auditar la cartilla de vacunación digital adjuntada por el propietario.
  * **Para:** Otorgarle el sello oficial de "Ficha Validada" o emitir observaciones sanitarias.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* el veterinario abre una ficha con vacunas completas (quíntuple, antirrábica, desparasitación), *cuando* pulsa "Validar Ficha", *entonces* la mascota pasa a estado `Validada` y se muestra el distintivo verde en su carné.
  * **Criterio 2:** *Dado que* falta una vacuna obligatoria, *cuando* pulsa "Observar", *entonces* registra el dictamen profesional y la mascota pasa a estado `Observada` requiriendo subsanación.

---

### HU-10: Dashboard Ejecutivo con Gráficos Chart.js para el Administrador
* **Anverso (Tarjeta de Historia):**
  * **ID:** `HU-10` | **Prioridad:** Alta | **Estimación:** 5 Puntos
  * **Como:** Administrador general de la red.
  * **Quiero:** Visualizar KPIs consolidados y gráficos estadísticos de reservas e ingresos en Cusco.
  * **Para:** Evaluar el crecimiento comercial de la plataforma y tomar decisiones operativas sustentadas.
* **Reverso (Criterios de Aceptación):**
  * **Criterio 1:** *Dado que* el Administrador inicia sesión, *cuando* accede al dashboard, *entonces* se cargan tarjetas con Ingresos Brutos Totales, Comisión Neta (15%), Solicitudes Pendientes y Alertas SOS activas.
  * **Criterio 2:** *Dado que* se procesan datos geográficos, *cuando* se renderiza Chart.js, *entonces* se genera un gráfico de barras con usuarios por distrito de Cusco (Cusco Centro, Wanchaq, San Sebastián, etc.).
  * **Criterio 3:** *Dado que* se consultan los tipos de servicios, *cuando* se dibuja el gráfico doughnut, *entonces* se presenta la distribución porcentual de Paseo, Hospedaje, Guardería y Domicilio Turístico.
