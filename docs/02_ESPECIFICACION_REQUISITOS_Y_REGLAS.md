# ESPECIFICACIÓN DE REQUISITOS DEL SISTEMA Y REGLAS DE NEGOCIO (v4.0)

**Proyecto:** Paw Patita Cusco — Plataforma Integral de Cuidado Canino y Bienestar Animal  
**Entorno Tecnológico:** Google Apps Script (GAS) + Google Sheets + HtmlService  
**Versión del Documento:** 4.0  
**Fecha:** Noviembre 2026  

---

## 1. Introducción y Alcance del Documento

Este documento define la especificación técnica y funcional completa del software **Paw Patita Cusco v4.0**. Detalla los Requisitos Funcionales (`RF`), los Requisitos No Funcionales (`RNF`) adaptados a los límites operativos de Google Apps Script, y las Reglas de Negocio (`RN`) expresadas en pseudocódigo formal y riguroso para sustentar el desarrollo, pruebas y la redacción del informe final de ingeniería de software.

---

## 2. Catálogo de Requisitos Funcionales (RF)

### 2.1. Módulo de Autenticación, Seguridad y Perfiles (Común y Propietario)
* **RF-01 (Registro de Propietario Diferenciado):** El sistema debe permitir registrar propietarios clasificándolos en *Local* o *Turista en Cusco*. Si es turista, el sistema debe registrar el país de origen, idioma preferido y nombre del hotel de hospedaje para coordinar el recojo.
* **RF-02 (Aceptación de Términos y Condiciones):** Todo registro y toda creación de reserva debe exigir la aceptación explícita de los Términos y Condiciones vigentes, registrando la versión aceptada, fecha, hora e IP en la pestaña `aceptaciones_tyc`.
* **RF-03 (Autenticación Segura y RBAC):** El sistema debe autenticar usuarios mediante correo y contraseña aplicando hash SHA-256 con salt criptográfico (`PAW::`). Al autenticar, emitirá un token de sesión opaco de 40 caracteres gestionado con `CacheService` con expiración de 6 horas.
* **RF-04 (Gestión de Ficha Digital PAW PATITA-ID):** El propietario debe poder registrar sus mascotas caninas indicando raza, edad, tamaño, sexo, foto (vía `PostImg` o URL externa), notas médicas y cartilla de vacunas. El sistema generará automáticamente un identificador único con formato `PAW-XXX`.
* **RF-05 (Selector Referencial de Moneda PEN/USD):** La interfaz debe proporcionar un conmutador en vivo entre Soles (`PEN`) y Dólares (`USD`) con un tipo de cambio referencial de $S/\ 3.75$, permitiendo a los turistas extranjeros comprender las tarifas en su divisa habitual.

### 2.2. Módulo de Cuidador Independiente y Billetera
* **RF-06 (Postulación de Cuidador con Antecedentes):** Todo nuevo cuidador debe completar su ficha pública, capacidad máxima de perros simultáneos (1 a 6) y adjuntar obligatoriamente enlaces directos a sus antecedentes policiales y certificado de domicilio. Su perfil permanecerá en estado `Pendiente` hasta ser aprobado por el Administrador.
* **RF-07 (Agenda Interactiva y Control Anti-Overbooking):** El cuidador debe disponer de un calendario mensual donde visualice los cupos ocupados vs. cupo máximo por día. Debe poder bloquear/desbloquear fechas particulares y guardar una plantilla semanal de atención (*Lun a Dom*).
* **RF-08 (Gestión del Ciclo de Vida de Reservas):** El cuidador debe poder:
  * Aceptar o rechazar solicitudes de reserva pendientes (con motivo obligatorio en caso de rechazo).
  * Ejecutar el *Check-In* el día de inicio del servicio.
  * Ejecutar el *Check-Out* al finalizar la custodia, lo cual dispara la liberación automática de fondos a su billetera.
* **RF-09 (Muro de Seguimiento con Fotos en Vivo):** Durante una reserva en curso, el cuidador debe poder publicar reportes de estado con notas explicativas y fotografías subidas a `PostImg`, las cuales se reflejarán de inmediato y de forma privada en el muro del propietario.
* **RF-10 (Billetera Digital y Solicitud de Retiros):** El sistema debe calcular en tiempo real el saldo *En Garantía* (reservas en curso), saldo *Disponible* (reservas finalizadas) y el histórico *Retirado*. El cuidador debe poder solicitar el retiro de su saldo disponible hacia *Yape*, *Plin* o cuenta bancaria.

### 2.3. Módulo de Clínica Veterinaria Aliada
* **RF-11 (Central de Emergencias S.O.S.):** La clínica veterinaria aliada debe contar con un panel donde reciba en tiempo real las alertas de emergencia derivadas a su sede, pudiendo cambiar el estado a `En Atención Clínica`, `Estabilizada` y `Resuelta`.
* **RF-12 (Registro Clínico Oficial):** Al resolver una emergencia, el médico veterinario debe registrar el diagnóstico clínico, tratamiento aplicado, informe de alta médica y costo referencial de la atención.
* **RF-13 (Validación Sanitaria de Fichas Caninas):** La clínica debe tener acceso a las fichas caninas en estado `Pendiente Validación`, revisar la cartilla de vacunación y emitir un dictamen médico oficial: `Validada` (con carné activo) u `Observada` (con requerimiento de vacunas pendientes).
* **RF-14 (Perfil Clínico y Horarios):** La clínica debe poder actualizar su número de emergencias 24 horas, horario de atención, especialidades y tarifa de consulta médica de urgencia.

### 2.4. Módulo de Reservas, Pagos y Cancelaciones
* **RF-15 (Cotizador Dinámico de Tarifas):** El sistema debe calcular el costo de la reserva sumando la tarifa base por los días seleccionados, aplicando el factor multiplicador de temporada turística en Cusco, extras seleccionados (baño higiénico, recojo en hotel) y deduciendo cupones promocionales válidos.
* **RF-16 (Pasarela de Pago Simulada):** El sistema debe simular el cobro de la reserva ofreciendo dos modalidades: Billetera Móvil (código QR de Yape/Plin con código de operación) o Tarjeta de Crédito/Débito (tokenización simulada con últimos 4 dígitos) y generar un comprobante electrónico imprimible.
* **RF-17 (Solicitud de Cancelación y Reembolso Automático):** El propietario debe poder solicitar la cancelación de una reserva. El sistema calculará en el acto las horas de anticipación con respecto a la hora oficial de inicio del servicio ($08:00\text{ hrs}$ del día de ingreso) y liquidará el reembolso y penalidad según la regla escalonada.
* **RF-18 (Módulo de Disputas y Arbitraje):** Si ocurre un incumplimiento grave durante una reserva en curso, tanto el propietario como el cuidador pueden abrir una disputa con motivo detallado, lo que congela los fondos hasta que el Administrador dicte una resolución.
* **RF-19 (Sistema de Reseñas Verificadas):** Una vez que una reserva alcance el estado `Finalizada`, el propietario podrá emitir una calificación de 1 a 5 estrellas acompañada de un comentario. El cuidador tendrá derecho a emitir una respuesta pública que se mostrará en su perfil.

### 2.5. Módulo de Administrador de Red y Gobernanza
* **RF-20 (Dashboard Ejecutivo y Analítica Chart.js):** El panel de administración debe mostrar KPIs financieros consolidados (ingresos brutos, comisión acumulada del 15%, reembolsos procesados) y gráficos generados con Chart.js de distribución de usuarios por distrito de Cusco y demanda por categoría de servicio.
* **RF-21 (Aprobación de Cuidadores Postulantes):** El administrador debe auditar los antecedentes policiales y certificados domiciliarios adjuntados por los cuidadores para aprobar su perfil público o rechazarlo con motivo fundamentado.
* **RF-22 (Procesamiento de Reembolsos y Disputas):** El administrador debe revisar las solicitudes de cancelación y disputas activas para ejecutar formalmente los reembolsos a los propietarios y ajustar los pagos en la base de datos.
* **RF-23 (Liquidación de Pagos a Cuidadores):** El administrador debe procesar las solicitudes de retiro de los cuidadores, transfiriendo los fondos correspondientes y registrando el número de operación bancaria para cerrar el ciclo financiero.
* **RF-24 (Gestión de Cupones, Temporadas y TyC):** El administrador debe poder crear y editar cupones promocionales, fijar multiplicadores estacionales (*Inti Raymi*, etc.) y publicar nuevas versiones legales de los Términos y Condiciones.
* **RF-25 (Bitácora Global de Auditoría):** El sistema debe registrar en la pestaña `auditoria_estados` cada cambio de estado sensible (reservas, cuidadores, incidencias, reembolsos) con el identificador del usuario responsable, rol, fecha, hora y justificación.

---

## 3. Catálogo de Requisitos No Funcionales (RNF)

| Código | Requisito No Funcional | Especificación Técnica y Adaptación a Google Apps Script |
| :--- | :--- | :--- |
| **RNF-01** | **Tiempo de Respuesta RPC** | Toda llamada a funciones backend vía `google.script.run` debe responder en un tiempo inferior a **2.5 segundos** en condiciones estándar de red mediante el uso de caché de lectura (`_memo`) y llamadas consolidadas. |
| **RNF-02** | **Concurrencia y Locks** | Las operaciones de escritura concurrentes deben utilizar `LockService.getScriptLock()` con un tiempo de espera de hasta 15,000 ms (`waitLock(15000)`) para asegurar que dos reservas no tomen el mismo cupo. |
| **RNF-03** | **Compatibilidad con HtmlService** | El código JavaScript ejecutado en el cliente debe apegarse estrictamente a estándares compatibles con el motor de Google Apps Script (Rhino/V8). **Prohibido el uso de operadores `?.` (optional chaining) o `??` (nullish coalescing)** que generen errores de parsing en GAS. |
| **RNF-04** | **Apagado Garantizado de Spinner** | Toda invocación asíncrona en el cliente debe enlazar obligatoriamente un `.withFailureHandler(...)` que asegure la desactivación del overlay de carga (`loader(false)`) ante cualquier excepción o caída de red. |
| **RNF-05** | **Normalización y Escalabilidad BD** | La base de datos en Google Sheets debe respetar la **Tercera Forma Normal (3FN)** en sus 22 pestañas, sin redundancia y con claves foráneas coherentes, preparada para operar dentro del límite de 10 millones de celdas de Sheets. |
| **RNF-06** | **Seguridad Criptográfica** | No se permite almacenar contraseñas en texto claro. Se debe aplicar un hash SHA-256 utilizando el algoritmo nativo `Utilities.computeDigest` con salt prefijado (`PAW::`). |
| **RNF-07** | **Optimización de Cuotas GAS** | Las lecturas a hojas de cálculo deben minimizarse agrupando rangos con `getDataRange().getValues()` en una sola llamada por tabla para no exceder la cuota de tiempo de cómputo diario de Apps Script. |
| **RNF-08** | **Usabilidad e Heurísticas** | La interfaz web debe cumplir al 100% las 10 Heurísticas de Usabilidad de Jakob Nielsen, obteniendo una calificación auditada de **20/20 puntos**. |
| **RNF-09** | **Resiliencia de Contenidos Multimedia** | Toda imagen externa vinculada desde `PostImg` o Unsplash debe implementar un manejador de error en línea (`onerror="this.src='...'"`) que cargue una imagen de respaldo predeterminada si el enlace externo falla. |
| **RNF-10** | **Diseño Responsivo y Móvil** | La aplicación debe renderizarse de forma óptima en pantallas móviles (desde 360px de ancho) y pantallas de escritorio mediante el sistema de rejilla y utilidades responsivas de Bootstrap 5.3.2. |

---

## 4. Reglas de Negocio Formalizadas (RN)

### RN-01: Política de Cancelación y Reembolso Escalonado
La política protege el dinero del cliente ante cancelaciones con antelación y compensa al cuidador por el bloqueo de su tiempo ante cancelaciones imprevistas.

```pascal
ALGORITMO CalcularCancelacion(reserva, ahoraMs)
ENTRADA: 
  reserva: Objeto Reserva (fecha_inicio, estado_reserva, monto_total)
  ahoraMs: Timestamp actual en milisegundos
SALIDA: 
  Objeto con (horas_anticipacion, regla, pct_reembolso, monto_reembolso, penalidad_plataforma, compensacion_cuidador)

INICIO
  // La hora de inicio del servicio se fija contractualmente a las 08:00 AM del día de ingreso
  tiempoInicioServicioMs <- ConvertirAFechaMs(reserva.fecha_inicio + " 08:00:00")
  horasAnticipacion <- (tiempoInicioServicioMs - ahoraMs) / 3600000.0
  montoTotal <- reserva.monto_total

  SI reserva.estado_reserva = "Pendiente Confirmación" ENTONCES
    // El cuidador aún no había aceptado la reserva
    pctReembolso <- 100
    regla <- "Reserva sin confirmar por el cuidador: Reembolso 100%"
    penalidadPlat <- 0.00
    compensacionCuid <- 0.00

  SINO SI horasAnticipacion > 48.0 ENTONCES
    // Tramo 1: Más de 48 horas de anticipación
    pctReembolso <- 100
    regla <- "Cancelación con más de 48h de anticipación: Reembolso 100% sin penalidad"
    penalidadPlat <- 0.00
    compensacionCuid <- 0.00

  SINO SI horasAnticipacion >= 24.0 Y horasAnticipacion <= 48.0 ENTONCES
    // Tramo 2: Entre 24 y 48 horas de anticipación
    pctReembolso <- 70
    regla <- "Cancelación entre 24h y 48h: Reembolso 70% y Penalidad 30% (15% Plataforma + 15% Cuidador)"
    montoReembolso <- Redondear(montoTotal * 0.70)
    penalidadPlat <- Redondear(montoTotal * 0.15)
    compensacionCuid <- Redondear(montoTotal - montoReembolso - penalidadPlat)

  SINO
    // Tramo 3: Menos de 24 horas de anticipación
    pctReembolso <- 0
    regla <- "Cancelación con menos de 24h: Sin reembolso (85% Cuidador + 15% Plataforma)"
    montoReembolso <- 0.00
    penalidadPlat <- Redondear(montoTotal * 0.15)
    compensacionCuid <- Redondear(montoTotal - penalidadPlat)
  FIN SI

  montoReembolso <- Redondear(montoTotal * (pctReembolso / 100.0))
  penalidadTotal <- Redondear(montoTotal - montoReembolso)

  RETORNAR {
    horas: horasAnticipacion,
    regla: regla,
    porcentaje_reembolso: pctReembolso,
    total: montoTotal,
    reembolso: montoReembolso,
    penalidad_total: penalidadTotal,
    penalidad_plataforma: penalidadPlat,
    compensacion_cuidador: compensacionCuid
  }
FIN ALGORITMO
```

---

### RN-02: Cotizador Dinámico de Tarifas en Cusco
Calcula el monto justo considerando estacionalidad turística andina, servicios complementarios y cupones de fidelización.

$$\text{Subtotal Base} = \text{Días} \times \text{Tarifa Diaria}$$
$$\text{Ajuste Temporada} = \text{Subtotal Base} \times (\text{Factor Temporada} - 1.0)$$
$$\text{Subtotal Temporada} = \text{Subtotal Base} + \text{Ajuste Temporada} + \text{Extras}$$
$$\text{Total Final} = \max(0, \text{Subtotal Temporada} - \text{Descuento Cupón})$$

```pascal
ALGORITMO CalcularCotizacion(usuario, oferta, fechaIni, fechaFin, extras, codigoCupon)
INICIO
  dias <- Maximo(1, DiferenciaDias(fechaIni, fechaFin))
  tarifaBase <- oferta.tarifa_diaria_por_perro
  subtotalBase <- Redondear(dias * tarifaBase)

  // 1. Detección de Temporada Turística Cusco (Inti Raymi, Fiestas Patrias, etc.)
  temporada <- BuscarTemporadaActiva(fechaIni)
  factorTemporada <- Si(temporada Existe, temporada.factor_multiplicador, 1.0)
  ajusteTemporada <- Redondear(subtotalBase * (factorTemporada - 1.0))

  // 2. Servicios Extras Opcionales
  montoExtras <- 0.00
  SI extras.recojo_hotel = VERDADERO Y oferta.incluye_recojo_hotel = "Sí" ENTONCES
    montoExtras <- montoExtras + oferta.tarifa_recojo_extra
  FIN SI
  SI extras.bano = VERDADERO ENTONCES
    montoExtras <- montoExtras + 25.00 // Tarifa fija de S/ 25 por baño higiénico
  FIN SI

  subtotalConExtras <- Redondear(subtotalBase + ajusteTemporada + montoExtras)

  // 3. Aplicación de Cupones Promocionales
  montoDescuento <- 0.00
  SI codigoCupon <> "" ENTONCES
    cupon <- BuscarCuponActivo(codigoCupon)
    SI cupon Existe Y subtotalConExtras >= cupon.monto_minimo ENTONCES
      SI cupon.segmento_objetivo = "Todos" O cupon.segmento_objetivo = usuario.subtipo_propietario ENTONCES
        SI cupon.tipo_descuento = "Porcentaje" ENTONCES
          montoDescuento <- Redondear(subtotalConExtras * (cupon.valor_descuento / 100.0))
        SINO
          montoDescuento <- Minimo(cupon.valor_descuento, subtotalConExtras)
        FIN SI
      FIN SI
    FIN SI
  FIN SI

  totalFinal <- Redondear(subtotalConExtras - montoDescuento)
  comisionPlataforma <- Redondear(totalFinal * 0.15)
  netoCuidador <- Redondear(totalFinal - comisionPlataforma)
  totalUsd <- Redondear(totalFinal / 3.75)

  RETORNAR {
    dias: dias,
    subtotal_base: subtotalBase,
    factor_temporada: factorTemporada,
    ajuste_temporada: ajusteTemporada,
    extras_monto: montoExtras,
    descuento_cupon: montoDescuento,
    total: totalFinal,
    comision_plataforma: comisionPlataforma,
    neto_cuidador: netoCuidador,
    total_usd: totalUsd
  }
FIN ALGORITMO
```

---

### RN-03: Control Anti-Overbooking y Disponibilidad
Asegura que un cuidador nunca sobrepase su capacidad máxima autorizada en ningún día del periodo solicitado.

```pascal
ALGORITMO VerificarDisponibilidadAntiOverbooking(idCuidador, fechaIni, fechaFin)
INICIO
  perfil <- ObtenerPerfilCuidador(idCuidador)
  capacidadMaxima <- perfil.capacidad_max_mascotas
  diasRango <- ListarFechasEntre(fechaIni, fechaFin)

  PARA CADA dia EN diasRango HACER
    // 1. Verificar si el día está bloqueado manualmente por el cuidador
    bloqueo <- BuscarDisponibilidad(idCuidador, dia)
    SI bloqueo Existe Y bloqueo.estado_dia = "Bloqueado" ENTONCES
      RETORNAR { disponible: FALSO, motivo: "El cuidador no atiende el día " + dia }
    FIN SI

    // 2. Contar reservas confirmadas y en curso que ocupan cupo en esta fecha
    reservasActivas <- ContarReservasActivas(idCuidador, dia)
    cupoMaximoDia <- Si(bloqueo Existe, bloqueo.cupo_maximo_dia, capacidadMaxima)

    SI (reservasActivas + 1) > cupoMaximoDia ENTONCES
      RETORNAR { disponible: FALSO, motivo: "Cupos agotados para la fecha " + dia + " (Máx: " + cupoMaximoDia + ")" }
    FIN SI
  FIN PARA

  RETORNAR { disponible: VERDADERO, motivo: "Cupos disponibles en todo el rango" }
FIN ALGORITMO
```

---

### RN-04: Transiciones del Ciclo de Vida de Reservas (Máquina de Estados)
Solo se permiten las transiciones explícitamente autorizadas para resguardar la consistencia de los fondos:

| Estado Actual | Transición Permitida | Disparador | Acción Financiera Asociada |
| :--- | :--- | :--- | :--- |
| `Pendiente Confirmación` | `Confirmada` | Cuidador acepta la reserva | Fondos pasan a `En Garantía`. Se incrementa ocupación en agenda. |
| `Pendiente Confirmación` | `Cancelada` | Cuidador rechaza o Propietario cancela | Reembolso del 100% automático al propietario. |
| `Confirmada` | `En Curso` | Cuidador ejecuta *Check-In* | Inicio oficial del servicio de cuidado. |
| `Confirmada` | `Cancelada` | Propietario cancela antes del inicio | Aplicación de política escalonada (RN-01). Se liberan cupos. |
| `En Curso` | `Finalizada` | Cuidador ejecuta *Check-Out* | Fondos se liberan de garantía y pasan a estado `Disponible` en billetera. |
| `En Curso` | `En Disputa` | Propietario o Cuidador abren reclamo | Fondos quedan retenidos temporalmente sin liquidación. |
| `En Disputa` | `Finalizada` / `Cancelada` | Administrador emite resolución arbitral | Liquidación forzosa o reembolso parcial según dictamen. |

---

### RN-05: Protocolo de Emergencias S.O.S. y Triage Veterinario
1. **Disparo:** El botón S.O.S. solo puede ser activado por el Propietario o Cuidador si existe una reserva en estado `Confirmada` o `En Curso`.
2. **Derivación:** El sistema selecciona automáticamente la clínica aliada activa más cercana al distrito del servicio (priorizando aquellas con atención `24 Horas`).
3. **Notificación Multicanal:** Se emiten alertas de prioridad inmediata al propietario, al cuidador y a todos los administradores.
4. **Triage:** La clínica aliada asume la responsabilidad del caso pasando el estado a `En Atención Clínica`.
5. **Cierre:** La alerta no puede marcarse como `Resuelta` si no contiene un diagnóstico médico $\ge 5$ caracteres, tratamiento aplicado $\ge 5$ caracteres y costo referencial registrado.
