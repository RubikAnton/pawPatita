# -*- coding: utf-8 -*-
"""
Generador de BD-PAWPATITAS-v3.xlsx (esquema v4.0, 22 pestañas, 3FN).
Uso:  python tools/generar_bd_v4.py [ruta_salida.xlsx] [--json ruta_seed.json]
Las contraseñas se guardan como SHA-256('PAW::' + clave) (mismo algoritmo que Codigo.gs).
"""
import sys, json, hashlib, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

SALT = 'PAW::'
def H(p):
    return hashlib.sha256((SALT + p).encode('utf-8')).hexdigest()

DEF = 'https://i.postimg.cc/HxXrCmbp/images.jpg'
def U(i):
    return 'https://images.unsplash.com/%s?auto=format&fit=crop&w=800&q=70' % i

DOGS = ['photo-1505628346881-b72b27e84530', 'photo-1552053831-71594a27632d', 'photo-1583511655857-d19b40a7a54e',
        'photo-1548199973-03cce0bbc87b', 'photo-1517849845537-4d257902454a', 'photo-1543466835-00a7907e9de1',
        'photo-1561037404-61cd46aa615b', 'photo-1507146426996-ef05306b995a', 'photo-1477884213360-7e9d7dcc1e48',
        'photo-1530281700549-e82e7bf110d6', 'photo-1587300003388-59208cc962cb', 'photo-1601758228041-f3b2795255f1']
PEOPLE = ['photo-1535713875002-d1d0cf377fde', 'photo-1494790108377-be9c29b29330', 'photo-1500648767791-00dcc994a43e',
          'photo-1438761681033-6461ffad8d80', 'photo-1507003211169-0a1dd7228f2d', 'photo-1544005313-94ddf0286df2']
HOMES = ['photo-1558904541-efa843a96f01', 'photo-1591160690555-5debfba289f0', 'photo-1583337130417-3346a1be7dee',
         'photo-1601758228041-f3b2795255f1']

# ----------------------------------------------------------------------------
# ESQUEMA (22 pestañas)
# ----------------------------------------------------------------------------
SCHEMA = [
 ('usuarios', 'id_usuario nombre apellido email password_hash telefono tipo_usuario subtipo_propietario tipo_documento num_documento pais_origen idioma_preferido direccion distrito_cusco hospedaje_hotel_cusco contacto_emergencia_nombre contacto_emergencia_tel id_clinica_asociada tyc_version_aceptada estado_cuenta fecha_registro'),
 ('mascotas', 'id_mascota paw_patita_id id_propietario nombre raza tamano sexo edad_anos peso_kg esterilizado cartilla_vacunas_al_dia fecha_venc_vacunas cartilla_vacunas_url alergias_restricciones medicacion_actual dieta_alimentacion conducta_observaciones foto_url estado_validacion_vet id_clinica_validadora observacion_veterinaria fecha_registro'),
 ('perfiles_cuidadores', 'id_cuidador id_usuario descripcion_experiencia especialidades idiomas tipo_vivienda capacidad_max_mascotas reputacion_promedio total_resenas estado_postulacion motivo_estado foto_url foto_hogar_url disponibilidad_semanal cuenta_cobro_tipo cuenta_cobro_numero'),
 ('servicios', 'id_oferta hu_ecode id_cuidador categoria tipo_servicio descripcion_servicio tarifa_diaria_por_perro incluye_recojo_hotel tarifa_recojo_extra disponible'),
 ('reservas', 'id_reserva codigo_reserva id_propietario modalidad_cliente id_cuidador id_oferta id_mascota fecha_inicio fecha_fin dias_calculados tarifa_unitaria subtotal_base id_temporada ajuste_temporada id_cupon descuento_cupon extras_detalle extras_monto monto_total moneda_referencial estado_reserva tyc_version_aceptada notas_propietario fecha_solicitud fecha_checkin fecha_checkout'),
 ('pagos', 'id_pago id_reserva metodo_pago pasarela_simulacion num_operacion ultimos_4_digitos monto_bruto comision_porcentaje comision_plataforma monto_neto_cuidador monto_reembolsado penalidad_retenida estado_pago tipo_comprobante num_comprobante comprobante_url fecha_pago'),
 ('liquidaciones_cuidadores', 'id_liquidacion id_cuidador id_pago id_reserva tipo_concepto monto_liquidado cuenta_destino estado_liquidacion num_operacion_desembolso fecha_disponible fecha_solicitud_retiro fecha_liquidacion aprobado_por_admin'),
 ('reportes_seguimiento', 'id_reporte id_reserva id_cuidador fecha_hora tipo_evento estado_animo_mascota ubicacion_referencial nota_estado visto_por_propietario'),
 ('fotos_reporte', 'id_foto id_reporte foto_url descripcion_foto fecha_subida'),
 ('clinicas_veterinarias', 'id_clinica ruc nombre email_institucional direccion telefono_emergencia distrito_cusco horario_atencion especialidades tarifa_consulta_emergencia estado_afiliacion activa'),
 ('antecedentes_cuidadores', 'id_antecedente id_cuidador doc_identidad_url doc_antecedentes_policiales_url doc_antecedentes_penales_url estado_verificacion observaciones_admin revisado_por_admin fecha_carga fecha_revision'),
 ('incidencias_emergencias', 'id_incidencia id_reserva id_mascota reportado_por_usuario nivel_severidad tipo_incidencia descripcion estado_alerta id_clinica_derivada atendido_por_vet_usuario diagnostico_clinico tratamiento_aplicado informe_resolucion costo_atencion_ref fecha_incidencia fecha_atencion fecha_resolucion'),
 ('reseñas', 'id_reseña id_reserva id_propietario id_cuidador calificacion_estrellas puntualidad_estrellas comunicacion_estrellas cuidado_estrellas comentario respuesta_cuidador visible fecha_reseña'),
 ('disponibilidad_cuidadores', 'id_disp id_cuidador fecha estado_dia cupo_maximo_dia cupos_reservados nota_agenda'),
 ('validaciones_veterinarias', 'id_validacion id_mascota id_clinica id_usuario_vet resultado vacunas_verificadas vigencia_hasta observaciones_medicas fecha_validacion'),
 ('cancelaciones_reembolsos', 'id_cancelacion id_reserva id_pago solicitado_por tipo_caso horas_anticipacion regla_aplicada motivo porcentaje_reembolso monto_reembolso monto_penalidad_plataforma monto_compensacion_cuidador estado_tramite resolucion_admin procesado_por_admin fecha_solicitud fecha_resolucion'),
 ('cupones_promocionales', 'id_cupon codigo descripcion tipo_descuento valor_descuento segmento_objetivo monto_minimo fecha_inicio fecha_fin usos_maximos usos_actuales activo'),
 ('temporadas_tarifas', 'id_temporada nombre_temporada fecha_inicio fecha_fin factor_multiplicador porcentaje_ajuste descripcion activa'),
 ('terminos_condiciones', 'id_tyc version alcance titulo contenido_resumen fecha_publicacion estado publicado_por_admin'),
 ('aceptaciones_tyc', 'id_aceptacion id_usuario id_tyc version_tyc contexto id_referencia fecha_aceptacion'),
 ('auditoria_estados', 'id_auditoria entidad id_registro estado_anterior estado_nuevo actor_id_usuario actor_rol detalle_motivo fecha_hora'),
 ('notificaciones', 'id_notificacion id_usuario_destino tipo titulo mensaje id_referencia leida fecha_creacion'),
]
HEADERS = dict((n, c.split()) for n, c in SCHEMA)
DATA = dict((n, []) for n, _ in SCHEMA)

def R(sheet, **kw):
    hs = HEADERS[sheet]
    for k in kw:
        if k not in hs:
            raise Exception('Columna inexistente %s.%s' % (sheet, k))
    DATA[sheet].append([kw.get(h, '') for h in hs])

def r2(x):
    return round(x + 1e-9, 2)

# ----------------------------------------------------------------------------
# CLÍNICAS
# ----------------------------------------------------------------------------
R('clinicas_veterinarias', id_clinica='VET-01', ruc='20601234561', nombre='Clínica Veterinaria Cusco Centro', email_institucional='vet.centro@pawpatita.pe', direccion='Calle Matto Turner 220', telefono_emergencia='084-223344', distrito_cusco='Cusco', horario_atencion='Diurno', especialidades='Medicina general, Dermatología, Vacunación', tarifa_consulta_emergencia=80, estado_afiliacion='Activa', activa='Sí')
R('clinicas_veterinarias', id_clinica='VET-02', ruc='20601234562', nombre='Centro Veterinario San Jerónimo', email_institucional='contacto.sanjeronimo@pawpatita.pe', direccion='Av. Manco Cápac 102', telefono_emergencia='984-999888', distrito_cusco='San Jerónimo', horario_atencion='Diurno', especialidades='Medicina general, Cirugía menor', tarifa_consulta_emergencia=70, estado_afiliacion='Activa', activa='Sí')
R('clinicas_veterinarias', id_clinica='VET-03', ruc='20601234563', nombre='Hospital Veterinario Wanchaq 24h', email_institucional='vet.wanchaq@pawpatita.pe', direccion='Av. Los Incas 710', telefono_emergencia='084-245566', distrito_cusco='Wanchaq', horario_atencion='24 Horas', especialidades='Urgencias 24h, Traumatología, Hospitalización', tarifa_consulta_emergencia=120, estado_afiliacion='Activa', activa='Sí')
R('clinicas_veterinarias', id_clinica='VET-04', ruc='20601234564', nombre='Veterinaria Patitas San Sebastián', email_institucional='contacto.patitas@pawpatita.pe', direccion='Av. De la Cultura 2105', telefono_emergencia='984-654321', distrito_cusco='San Sebastián', horario_atencion='Diurno', especialidades='Medicina general, Estética canina', tarifa_consulta_emergencia=75, estado_afiliacion='Activa', activa='Sí')
R('clinicas_veterinarias', id_clinica='VET-05', ruc='20601234565', nombre='Consultorio Veterinario Santiago', email_institucional='vet.santiago@pawpatita.pe', direccion='Av. Grau 815', telefono_emergencia='984-112233', distrito_cusco='Santiago', horario_atencion='Diurno', especialidades='Medicina general', tarifa_consulta_emergencia=65, estado_afiliacion='Pendiente', activa='No')

# ----------------------------------------------------------------------------
# USUARIOS
# ----------------------------------------------------------------------------
def usr(i, nom, ape, email, pw, tel, tipo, sub, doc, pais, idioma, dire, dist, hotel='', cn='', ct='', clin='', estado='Activo', fecha='2026-10-01 09:00:00', tyc='v4.0'):
    R('usuarios', id_usuario=i, nombre=nom, apellido=ape, email=email, password_hash=H(pw), telefono=tel, tipo_usuario=tipo,
      subtipo_propietario=sub, tipo_documento='DNI' if pais == 'Perú' else 'Pasaporte', num_documento=doc, pais_origen=pais,
      idioma_preferido=idioma, direccion=dire, distrito_cusco=dist, hospedaje_hotel_cusco=hotel, contacto_emergencia_nombre=cn,
      contacto_emergencia_tel=ct, id_clinica_asociada=clin, tyc_version_aceptada=tyc, estado_cuenta=estado, fecha_registro=fecha)

usr('USR-01', 'Angelo', 'Chacón', 'angelo@gmail.com', '123456', '984111189', 'Propietario', 'Local', '71796410', 'Perú', 'ES', 'Av. El Sol 450', 'Cusco', '', 'María Copa', '984111100', fecha='2026-10-01 09:00:00')
usr('USR-02', 'Carlos', 'Quispe', 'carlos@gmail.com', '123456', '984333444', 'Cuidador', 'N/A', '49481516', 'Perú', 'ES', 'Urb. Magisterio II Etapa', 'Wanchaq', fecha='2026-10-02 10:15:00')
usr('USR-03', 'Admin', 'General', 'admin@pawpatita.pe', 'admin123', '984000000', 'Administrador', 'N/A', '10203040', 'Perú', 'ES', 'Plaza de Armas s/n', 'Cusco', fecha='2026-09-01 08:00:00')
usr('USR-04', 'Valeria', 'Montes', 'valeria@gmail.com', '123456', '984555666', 'Cuidador', 'N/A', '72345678', 'Perú', 'ES', 'Av. La Cultura 1820', 'San Sebastián', fecha='2026-10-05 11:30:00')
usr('USR-05', 'Diego', 'Huamán', 'diego@gmail.com', '123456', '984777888', 'Cuidador', 'N/A', '73456789', 'Perú', 'ES', 'Calle Manco Cápac 310', 'San Jerónimo', fecha='2026-10-08 14:20:00')
usr('USR-06', 'Lucía', 'Mendoza', 'lucia@gmail.com', '123456', '984222333', 'Cuidador', 'N/A', '74567890', 'Perú', 'ES', 'Av. Antonio Lorena 512', 'Santiago', fecha='2026-10-12 16:00:00')
usr('USR-07', 'Sofía', 'Vargas', 'sofia.turista@gmail.com', '123456', '+57 3001234567', 'Propietario', 'Turista', 'AB123456', 'Colombia', 'ES', 'Calle Plateros 324', 'Cusco', 'Hotel Plateros Boutique, Cusco Centro', 'Andrés Vargas', '+57 3009876543', fecha='2026-10-18 09:45:00')
usr('USR-08', 'Mónica', 'Rivas', 'vet.centro@pawpatita.pe', 'vet123', '084223344', 'Veterinaria', 'N/A', '40112233', 'Perú', 'ES', 'Calle Matto Turner 220', 'Cusco', clin='VET-01', fecha='2026-09-10 09:00:00')
usr('USR-09', 'Raúl', 'Paucar', 'vet.wanchaq@pawpatita.pe', 'vet123', '084245566', 'Veterinaria', 'N/A', '40223344', 'Perú', 'ES', 'Av. Los Incas 710', 'Wanchaq', clin='VET-03', fecha='2026-09-10 09:30:00')
usr('USR-10', 'Elena', 'Soto', 'vet.santiago@pawpatita.pe', 'vet123', '984112233', 'Veterinaria', 'N/A', '40334455', 'Perú', 'ES', 'Av. Grau 815', 'Santiago', clin='VET-05', estado='Pendiente', fecha='2026-11-15 12:00:00')

# ----------------------------------------------------------------------------
# CUIDADORES, ANTECEDENTES, SERVICIOS
# ----------------------------------------------------------------------------
def cuid(i, u, exp, esp, idi, viv, cap, rep, nres, est, motivo, foto, hogar, disp, ct='', cn=''):
    R('perfiles_cuidadores', id_cuidador=i, id_usuario=u, descripcion_experiencia=exp, especialidades=esp, idiomas=idi, tipo_vivienda=viv,
      capacidad_max_mascotas=cap, reputacion_promedio=rep, total_resenas=nres, estado_postulacion=est, motivo_estado=motivo,
      foto_url=foto, foto_hogar_url=hogar, disponibilidad_semanal=disp, cuenta_cobro_tipo=ct, cuenta_cobro_numero=cn)

cuid('CUID-01', 'USR-02', 'Especialista en paseos matutinos y hospedaje de caninos en Wanchaq. Amplio jardín cercado y 4 años de experiencia en etología canina.', 'Razas grandes, Jardín cercado, Etología', 'ES', 'Casa con jardín', 3, 5.0, 1, 'Aprobado', 'Documentación verificada', U(PEOPLE[0]), U(HOMES[0]), 'Lun,Mar,Mie,Jue,Vie,Sab', 'Yape', '984333444')
cuid('CUID-02', 'USR-04', 'Auxiliar veterinaria con patio verde en San Sebastián. Atención personalizada, primeros auxilios y reportes fotográficos cada 3 horas.', 'Primeros auxilios, Turistas, Bilingüe, Jardín cercado', 'ES, EN', 'Casa con patio', 4, 5.0, 1, 'Aprobado', 'Documentación verificada', U(PEOPLE[1]), U(HOMES[1]), 'Lun,Mar,Mie,Jue,Vie,Sab,Dom', 'Plin', '984555666')
cuid('CUID-03', 'USR-05', 'Entrenador y paseador canino en San Jerónimo. Rutas ecológicas seguras, juegos de olfato y hospedaje familiar sin jaulas.', 'Entrenamiento, Razas grandes, Paseos ecológicos', 'ES, QU', 'Casa con terreno', 5, 4.8, 0, 'Aprobado', 'Documentación verificada', U(PEOPLE[2]), U(HOMES[2]), 'Lun,Mie,Vie,Sab,Dom', 'Yape', '984777888')
cuid('CUID-04', 'USR-06', 'Cuidadora de razas pequeñas y medianas en Santiago y Cusco Centro. Ideal para turistas que visitan Machu Picchu por el día.', 'Turistas, Bilingüe, Razas pequeñas', 'ES, EN', 'Departamento', 2, 4.7, 0, 'Pendiente', 'En revisión de antecedentes', U(PEOPLE[3]), U(HOMES[3]), 'Mar,Jue,Vie,Sab,Dom', 'Yape', '984222333')

R('antecedentes_cuidadores', id_antecedente='ANT-01', id_cuidador='CUID-01', doc_identidad_url=DEF, doc_antecedentes_policiales_url=DEF, doc_antecedentes_penales_url=DEF, estado_verificacion='Aprobado', observaciones_admin='Documentos vigentes y legibles', revisado_por_admin='USR-03', fecha_carga='2026-10-02 10:20:00', fecha_revision='2026-10-03 09:00:00')
R('antecedentes_cuidadores', id_antecedente='ANT-02', id_cuidador='CUID-02', doc_identidad_url=DEF, doc_antecedentes_policiales_url=DEF, doc_antecedentes_penales_url=DEF, estado_verificacion='Aprobado', observaciones_admin='Documentos vigentes y legibles', revisado_por_admin='USR-03', fecha_carga='2026-10-05 11:40:00', fecha_revision='2026-10-06 09:00:00')
R('antecedentes_cuidadores', id_antecedente='ANT-03', id_cuidador='CUID-03', doc_identidad_url=DEF, doc_antecedentes_policiales_url=DEF, doc_antecedentes_penales_url=DEF, estado_verificacion='Aprobado', observaciones_admin='Documentos vigentes y legibles', revisado_por_admin='USR-03', fecha_carga='2026-10-08 14:30:00', fecha_revision='2026-10-09 09:00:00')
R('antecedentes_cuidadores', id_antecedente='ANT-04', id_cuidador='CUID-04', doc_identidad_url=DEF, doc_antecedentes_policiales_url=DEF, doc_antecedentes_penales_url=DEF, estado_verificacion='Pendiente', fecha_carga='2026-10-12 16:10:00')

def serv(i, hu, c, cat, tipo, desc, tar, rec, trec):
    R('servicios', id_oferta=i, hu_ecode=hu, id_cuidador=c, categoria=cat, tipo_servicio=tipo, descripcion_servicio=desc,
      tarifa_diaria_por_perro=tar, incluye_recojo_hotel=rec, tarifa_recojo_extra=trec, disponible='Sí')

serv('OF-101', 'HU-801', 'CUID-01', 'Hospedaje', 'Hospedaje Temporal Nocturno', 'Estadía nocturna en casa con jardín cercado, camas térmicas y reportes diarios.', 45, 'Sí', 10)
serv('OF-102', 'HU-802', 'CUID-01', 'Paseo', 'Paseo Recreativo Matutino', 'Paseo de 90 minutos por parques de Magisterio y Wanchaq con hidratación.', 25, 'No', 0)
serv('OF-103', 'HU-803', 'CUID-02', 'Hospedaje', 'Hospedaje Familiar Premium', 'Hospedaje familiar con patio verde, primeros auxilios y reportes cada 3 horas.', 50, 'Sí', 12)
serv('OF-104', 'HU-804', 'CUID-02', 'Guardería', 'Guardería Diurna Especializada', 'Guardería de 8:00 a 18:00 con juegos de socialización supervisada.', 35, 'Sí', 12)
serv('OF-105', 'HU-805', 'CUID-03', 'Paseo', 'Paseo Ecológico Guiado', 'Rutas ecológicas seguras en San Jerónimo con juegos de olfato.', 30, 'No', 0)
serv('OF-106', 'HU-806', 'CUID-03', 'Hospedaje', 'Hospedaje Temporal Nocturno', 'Hospedaje familiar sin jaulas, terreno amplio y supervisión permanente.', 40, 'No', 0)
serv('OF-107', 'HU-807', 'CUID-04', 'Domicilio Turístico', 'Cuidado a Domicilio Turístico', 'Cuidado en tu hotel o alojamiento mientras visitas Machu Picchu o el Valle Sagrado.', 38, 'Sí', 0)

# ----------------------------------------------------------------------------
# MASCOTAS
# ----------------------------------------------------------------------------
def pet(i, paw, prop, nom, raza, tam, sexo, edad, peso, est_ster, vac, venc, alerg, med, dieta, cond, foto, estado, clin, obs, fecha):
    R('mascotas', id_mascota=i, paw_patita_id=paw, id_propietario=prop, nombre=nom, raza=raza, tamano=tam, sexo=sexo, edad_anos=edad,
      peso_kg=peso, esterilizado=est_ster, cartilla_vacunas_al_dia=vac, fecha_venc_vacunas=venc, cartilla_vacunas_url=DEF,
      alergias_restricciones=alerg, medicacion_actual=med, dieta_alimentacion=dieta, conducta_observaciones=cond, foto_url=foto,
      estado_validacion_vet=estado, id_clinica_validadora=clin, observacion_veterinaria=obs, fecha_registro=fecha)

pet('PET-30D6F104', 'PAW-6858', 'USR-01', 'Orejas', 'Beagle Mestizo', 'Mediano', 'Macho', 2, 11.5, 'Sí', 'Sí', '2027-10-15', 'Sensible al frío nocturno', 'Ninguna', 'Croquetas adulto 2 veces al día', 'Muy sociable, juguetón y activo en paseos', U(DOGS[0]), 'Validado', 'VET-01', 'Esquema de vacunación completo', '2026-10-15 22:37:17')
pet('PET-696ADDD8', 'PAW-3750', 'USR-01', 'Canela', 'Golden Retriever', 'Grande', 'Hembra', 4, 24, 'Sí', 'Sí', '2027-09-30', 'Alergia al pollo procesado', 'Ninguna', 'Croquetas sin pollo', 'Tranquila, obediente y cariñosa con niños', U(DOGS[1]), 'Validado', 'VET-01', 'Esquema de vacunación completo', '2026-10-15 22:39:47')
pet('PET-26958DD9', 'PAW-7030', 'USR-01', 'Negra', 'Schnauzer Mediano', 'Mediano', 'Hembra', 3, 9.5, 'No', 'Sí', '2027-06-20', 'Ninguna alergia conocida', 'Ninguna', 'Croquetas adulto', 'Curiosa y energética, requiere correa firme', U(DOGS[2]), 'Pendiente', '', '', '2026-11-18 16:18:51')
pet('PET-A1B2C3D4', 'PAW-4421', 'USR-01', 'Luna', 'Mestiza', 'Pequeño', 'Hembra', 1, 6.2, 'No', 'No', '', 'Ninguna', 'Desparasitante mensual', 'Alimento húmedo y seco', 'Algo tímida con extraños', U(DOGS[3]), 'Pendiente', '', '', '2026-11-19 09:10:00')
pet('PET-D0E33A2D', 'PAW-3586', 'USR-07', 'Berny', 'Bulldog Francés', 'Pequeño', 'Macho', 3, 12, 'Sí', 'Sí', '2027-08-12', 'Alergia a picaduras de insectos', 'Antihistamínico si hay reacción', 'Croquetas razas pequeñas', 'Dócil, necesita descansos cortos en caminatas', U(DOGS[4]), 'Validado', 'VET-03', 'Vacunas verificadas; evitar ejercicio intenso en altura', '2026-10-19 12:14:18')

R('validaciones_veterinarias', id_validacion='VAL-01', id_mascota='PET-30D6F104', id_clinica='VET-01', id_usuario_vet='USR-08', resultado='Validado', vacunas_verificadas='Rabia, Parvovirus, Moquillo, Hepatitis', vigencia_hasta='2027-10-15', observaciones_medicas='Esquema de vacunación completo', fecha_validacion='2026-10-16 10:00:00')
R('validaciones_veterinarias', id_validacion='VAL-02', id_mascota='PET-696ADDD8', id_clinica='VET-01', id_usuario_vet='USR-08', resultado='Validado', vacunas_verificadas='Rabia, Parvovirus, Moquillo, Hepatitis, Leptospirosis', vigencia_hasta='2027-09-30', observaciones_medicas='Esquema de vacunación completo', fecha_validacion='2026-10-16 10:30:00')
R('validaciones_veterinarias', id_validacion='VAL-03', id_mascota='PET-D0E33A2D', id_clinica='VET-03', id_usuario_vet='USR-09', resultado='Validado', vacunas_verificadas='Rabia, Parvovirus, Moquillo', vigencia_hasta='2027-08-12', observaciones_medicas='Vacunas verificadas; evitar ejercicio intenso en altura', fecha_validacion='2026-10-20 11:00:00')

# ----------------------------------------------------------------------------
# TEMPORADAS, CUPONES, TyC
# ----------------------------------------------------------------------------
def temp(i, n, a, b, f, d):
    R('temporadas_tarifas', id_temporada=i, nombre_temporada=n, fecha_inicio=a, fecha_fin=b, factor_multiplicador=f,
      porcentaje_ajuste=round((f - 1) * 100, 1), descripcion=d, activa='Sí')
temp('TMP-00', 'Temporada Regular', '01-01', '12-31', 1.00, 'Tarifa base sin ajuste')
temp('TMP-01', 'Inti Raymi y Fiestas Jubilares del Cusco', '06-15', '06-30', 1.20, 'Alta demanda turística por el Inti Raymi (24 de junio)')
temp('TMP-02', 'Fiestas Patrias Perú', '07-25', '07-31', 1.15, 'Feriado largo con alta afluencia de visitantes')
temp('TMP-03', 'Semana Santa / Fin de Año Turístico', '12-20', '01-05', 1.15, 'Temporada alta de fin de año en Cusco')
temp('TMP-04', 'Temporada de Lluvias - Promo Local', '02-01', '02-28', 0.90, 'Descuento para fomentar la demanda en temporada baja')

def cup(i, cod, d, tipo, val, seg, minimo, a, b, mx, us, act):
    R('cupones_promocionales', id_cupon=i, codigo=cod, descripcion=d, tipo_descuento=tipo, valor_descuento=val, segmento_objetivo=seg,
      monto_minimo=minimo, fecha_inicio=a, fecha_fin=b, usos_maximos=mx, usos_actuales=us, activo=act)
cup('CUP-01', 'BIENVENIDO10', '10% de descuento en tu primera reserva', 'Porcentaje', 10, 'Todos', 30, '2026-10-01', '2027-03-31', 200, 0, 'Sí')
cup('CUP-02', 'MACHUPICCHU15', '15% para turistas que visitan Machu Picchu', 'Porcentaje', 15, 'Turista', 50, '2026-10-01', '2027-03-31', 100, 1, 'Sí')
cup('CUP-03', 'CUSCO20', 'S/ 20 de descuento para residentes en reservas desde S/ 100', 'Monto Fijo', 20, 'Local', 100, '2026-10-01', '2027-03-31', 150, 0, 'Sí')
cup('CUP-04', 'VERANO5', 'Cupón de verano vencido (demostración)', 'Monto Fijo', 5, 'Todos', 0, '2026-01-01', '2026-03-31', 50, 12, 'Sí')

TYC_GEN = 'Paw Patita Cusco es una plataforma de intermediación entre propietarios de mascotas y cuidadores independientes. La plataforma no presta servicios veterinarios. Los usuarios aceptan el tratamiento de sus datos personales conforme a la Ley N.° 29733. Comisión de intermediación: 15% del monto de cada reserva. Los pagos se mantienen en garantía hasta la finalización del servicio.'
TYC_PROP = 'El propietario declara que la información de su mascota (PAW PATITA-ID) es veraz, que cuenta con vacunas vigentes y que informó alergias, medicación y conducta. Debe reservar solo con fichas validadas por una clínica aliada. Es responsable de los daños causados por su mascota.'
TYC_CUID = 'El cuidador declara no tener antecedentes policiales ni penales, mantener un espacio seguro, no exceder su capacidad máxima, reportar con fotos el bienestar de la mascota y activar el botón S.O.S. ante cualquier emergencia. Su perfil será visible únicamente tras la aprobación del administrador.'
TYC_VET = 'La clínica aliada se compromete a validar fichas caninas con criterio médico, atender las alertas S.O.S. derivadas y registrar diagnóstico y tratamiento. Las tarifas de emergencia son referenciales y se cobran directamente al propietario.'
TYC_RES = 'Política de cancelación: más de 48 horas antes del inicio: reembolso del 100%. Entre 24 y 48 horas: reembolso del 70% (penalidad 30%: 15% plataforma y 15% cuidador). Menos de 24 horas: sin reembolso (el cuidador recibe el 85% y la plataforma el 15%). Si el cuidador rechaza la reserva o hay fuerza mayor validada por el administrador: reembolso del 100%. Las disputas se pueden abrir hasta 72 horas después del servicio.'
def tyc(i, v, al, t, c, est, f):
    R('terminos_condiciones', id_tyc=i, version=v, alcance=al, titulo=t, contenido_resumen=c, fecha_publicacion=f, estado=est, publicado_por_admin='USR-03')
tyc('TYC-00', 'v3.0', 'General', 'Términos Generales (versión anterior)', 'Versión inicial sin política escalonada de cancelación.', 'Archivado', '2026-09-01')
tyc('TYC-01', 'v4.0', 'General', 'Términos y Condiciones Generales', TYC_GEN, 'Vigente', '2026-11-15')
tyc('TYC-02', 'v4.0', 'Propietario', 'Condiciones del Propietario', TYC_PROP, 'Vigente', '2026-11-15')
tyc('TYC-03', 'v4.0', 'Cuidador', 'Condiciones del Cuidador Independiente', TYC_CUID, 'Vigente', '2026-11-15')
tyc('TYC-04', 'v4.0', 'Veterinaria', 'Condiciones de la Clínica Aliada', TYC_VET, 'Vigente', '2026-11-15')
tyc('TYC-05', 'v4.0', 'Reserva', 'Política de Reservas, Cancelación y Reembolsos', TYC_RES, 'Vigente', '2026-11-15')

# ----------------------------------------------------------------------------
# RESERVAS + PAGOS + LIQUIDACIONES (calculados con la misma fórmula del backend)
# ----------------------------------------------------------------------------
OF = dict((r[0], r) for r in DATA['servicios'])  # id_oferta -> fila
CUENTA = {'CUID-01': 'Yape 984333444', 'CUID-02': 'Plin 984555666', 'CUID-03': 'Yape 984777888', 'CUID-04': 'Yape 984222333'}
pago_n = [500]
liq_n = [200]
RES = []

def reserva(idr, cod, prop, mod, cu, of, pet_, ini, fin, dias, extras, cup_id, cup_desc, estado, solicitud, tyc_v='v4.0', checkin='', checkout='', notas='', moneda='PEN', pago_est='Aprobado', metodo='Yape', ref_ops=''):
    tar = OF[of][6]
    base = tar * dias
    sub = base + extras
    total = max(10, sub - cup_desc)
    com = r2(total * 0.15)
    neto = r2(total - com)
    R('reservas', id_reserva=idr, codigo_reserva=cod, id_propietario=prop, modalidad_cliente=mod, id_cuidador=cu, id_oferta=of, id_mascota=pet_,
      fecha_inicio=ini, fecha_fin=fin, dias_calculados=dias, tarifa_unitaria=tar, subtotal_base=base, id_temporada='TMP-00', ajuste_temporada=0,
      id_cupon=cup_id, descuento_cupon=cup_desc, extras_detalle='', extras_monto=extras, monto_total=total, moneda_referencial=moneda,
      estado_reserva=estado, tyc_version_aceptada=tyc_v, notas_propietario=notas, fecha_solicitud=solicitud, fecha_checkin=checkin, fecha_checkout=checkout)
    pago_n[0] += 1
    liq_n[0] += 1
    RES.append(dict(id=idr, cu=cu, ini=ini, fin=fin, estado=estado, total=total, com=com, neto=neto, pay='PAY-%d' % pago_n[0], liq='LIQ-%d' % liq_n[0], metodo=metodo, sol=solicitud))
    return RES[-1]

reserva('RES-1001', 'COD-8841', 'USR-01', 'Local', 'CUID-01', 'OF-101', 'PET-30D6F104', '2026-11-19', '2026-11-22', 3, 0, '', 0, 'En Curso', '2026-11-16 10:30:00', checkin='2026-11-19 08:10:00', notas='Orejas es sensible al frío nocturno')
reserva('RES-1002', 'COD-9102', 'USR-01', 'Local', 'CUID-02', 'OF-103', 'PET-696ADDD8', '2026-11-01', '2026-11-03', 2, 0, '', 0, 'Finalizada', '2026-10-29 15:20:00', checkin='2026-11-01 08:00:00', checkout='2026-11-03 17:30:00', metodo='Plin')
reserva('RES-1003', 'COD-9350', 'USR-07', 'Turista', 'CUID-03', 'OF-105', 'PET-D0E33A2D', '2026-11-28', '2026-11-30', 2, 0, 'CUP-02', 9, 'Confirmada', '2026-11-16 09:00:00', moneda='USD', notas='Visitaremos Machu Picchu ese fin de semana')
reserva('RES-1004', 'COD-9411', 'USR-01', 'Local', 'CUID-01', 'OF-102', 'PET-30D6F104', '2026-12-03', '2026-12-05', 2, 0, '', 0, 'Pendiente Confirmación', '2026-11-20 18:40:00')
reserva('RES-1005', 'COD-9020', 'USR-07', 'Turista', 'CUID-02', 'OF-104', 'PET-D0E33A2D', '2026-11-10', '2026-11-12', 2, 0, '', 0, 'Cancelada', '2026-11-04 11:00:00', moneda='USD', pago_est='Reembolsado Total', metodo='Tarjeta')
reserva('RES-1006', 'COD-9001', 'USR-01', 'Local', 'CUID-01', 'OF-101', 'PET-696ADDD8', '2026-11-05', '2026-11-07', 2, 0, '', 0, 'Finalizada', '2026-11-01 08:45:00', checkin='2026-11-05 08:05:00', checkout='2026-11-07 09:00:00')
reserva('RES-1007', 'COD-9188', 'USR-07', 'Turista', 'CUID-03', 'OF-106', 'PET-D0E33A2D', '2026-11-13', '2026-11-15', 2, 0, '', 0, 'Cancelada', '2026-11-08 12:00:00', moneda='USD', pago_est='Reembolsado Parcial', metodo='Tarjeta')
reserva('RES-1008', 'COD-9210', 'USR-01', 'Local', 'CUID-03', 'OF-106', 'PET-30D6F104', '2026-11-14', '2026-11-16', 2, 0, '', 0, 'En Disputa', '2026-11-10 09:00:00', checkin='2026-11-14 08:30:00', checkout='2026-11-16 10:00:00', pago_est='En Disputa')

RD = dict((r['id'], r) for r in RES)
OPS = {'RES-1001': ('Yape', 'OP-987213', ''), 'RES-1002': ('Plin', 'OP-654981', ''), 'RES-1003': ('Tarjeta', 'OP-321789', '4242'),
       'RES-1004': ('Yape', 'OP-410022', ''), 'RES-1005': ('Tarjeta', 'OP-200551', '1881'), 'RES-1006': ('Yape', 'OP-111902', ''),
       'RES-1007': ('Tarjeta', 'OP-300778', '4242'), 'RES-1008': ('Plin', 'OP-222810', '')}
PAGO_FECHA = {'RES-1001': '2026-11-16 10:35:00', 'RES-1002': '2026-10-29 15:25:00', 'RES-1003': '2026-11-16 09:05:00', 'RES-1004': '2026-11-20 18:45:00',
              'RES-1005': '2026-11-04 11:05:00', 'RES-1006': '2026-11-01 08:50:00', 'RES-1007': '2026-11-08 12:05:00', 'RES-1008': '2026-11-10 09:05:00'}
for r in RES:
    m, op, l4 = OPS[r['id']]
    total, com, neto = r['total'], r['com'], r['neto']
    reem = pen = 0
    if r['id'] == 'RES-1005':
        reem, com, neto, pen = total, 0, 0, 0
    if r['id'] == 'RES-1007':
        reem = r2(total * 0.70); com = r2(total * 0.15); neto = r2(total - reem - com); pen = r2(com + neto)
    est_pago = [x for x in DATA['reservas'] if x[0] == r['id']][0][20]
    pest = {'En Curso': 'Aprobado', 'Finalizada': 'Aprobado', 'Confirmada': 'Aprobado', 'Pendiente Confirmación': 'Aprobado'}.get(est_pago, None)
    if r['id'] == 'RES-1005': pest = 'Reembolsado Total'
    elif r['id'] == 'RES-1007': pest = 'Reembolsado Parcial'
    elif r['id'] == 'RES-1008': pest = 'En Disputa'
    R('pagos', id_pago=r['pay'], id_reserva=r['id'], metodo_pago=m, pasarela_simulacion='Simulada v4', num_operacion=op, ultimos_4_digitos=l4,
      monto_bruto=total, comision_porcentaje=15, comision_plataforma=com, monto_neto_cuidador=neto, monto_reembolsado=reem, penalidad_retenida=pen,
      estado_pago=pest, tipo_comprobante='Boleta', num_comprobante='B001-%06d' % (100 + int(r['pay'][-3:])), comprobante_url=DEF, fecha_pago=PAGO_FECHA[r['id']])
    r['com'], r['neto'], r['reem'] = com, neto, reem

# liquidaciones
LIQ = {
 'RES-1001': ('Servicio Finalizado', 'En Garantía', '', '', '', ''),
 'RES-1002': ('Servicio Finalizado', 'Liquidado', 'DESEM-0001', '2026-11-03 17:30:00', '2026-11-04 10:00:00', '2026-11-04 18:00:00'),
 'RES-1003': ('Servicio Finalizado', 'En Garantía', '', '', '', ''),
 'RES-1004': ('Servicio Finalizado', 'En Garantía', '', '', '', ''),
 'RES-1005': ('Servicio Finalizado', 'Anulado', '', '', '', ''),
 'RES-1006': ('Servicio Finalizado', 'Disponible', '', '2026-11-07 09:00:00', '', ''),
 'RES-1007': ('Compensación Cancelación', 'Disponible', '', '2026-11-11 20:00:00', '', ''),
 'RES-1008': ('Servicio Finalizado', 'En Garantía', '', '', '', ''),
}
for r in RES:
    tc, est, nop, fdisp, fsol, fliq = LIQ[r['id']]
    R('liquidaciones_cuidadores', id_liquidacion=r['liq'], id_cuidador=r['cu'], id_pago=r['pay'], id_reserva=r['id'], tipo_concepto=tc,
      monto_liquidado=r['neto'], cuenta_destino=CUENTA[r['cu']], estado_liquidacion=est, num_operacion_desembolso=nop, fecha_disponible=fdisp,
      fecha_solicitud_retiro=fsol, fecha_liquidacion=fliq, aprobado_por_admin='USR-03' if est == 'Liquidado' else '')

# cancelaciones y disputas
R('cancelaciones_reembolsos', id_cancelacion='CAN-001', id_reserva='RES-1005', id_pago=RD['RES-1005']['pay'], solicitado_por='USR-07', tipo_caso='Cancelación',
  horas_anticipacion=96, regla_aplicada='Más de 48 horas: reembolso 100%', motivo='Cambio de itinerario del viaje', porcentaje_reembolso=100,
  monto_reembolso=70, monto_penalidad_plataforma=0, monto_compensacion_cuidador=0, estado_tramite='Reembolsado', resolucion_admin='Reembolso ejecutado a tarjeta terminada en 1881',
  procesado_por_admin='USR-03', fecha_solicitud='2026-11-06 08:00:00', fecha_resolucion='2026-11-06 15:00:00')
r7 = RD['RES-1007']
R('cancelaciones_reembolsos', id_cancelacion='CAN-002', id_reserva='RES-1007', id_pago=r7['pay'], solicitado_por='USR-07', tipo_caso='Cancelación',
  horas_anticipacion=36, regla_aplicada='Entre 24 y 48 horas: reembolso 70%, penalidad 30%', motivo='Problemas de salud del acompañante', porcentaje_reembolso=70,
  monto_reembolso=r7['reem'], monto_penalidad_plataforma=r7['com'], monto_compensacion_cuidador=r7['neto'], estado_tramite='Pendiente Revisión',
  fecha_solicitud='2026-11-11 20:00:00')
R('cancelaciones_reembolsos', id_cancelacion='CAN-003', id_reserva='RES-1008', id_pago=RD['RES-1008']['pay'], solicitado_por='USR-01', tipo_caso='Disputa',
  horas_anticipacion=0, regla_aplicada='Disputa abierta por el propietario', motivo='Retraso de 3 horas en la entrega y sin reportes fotográficos durante la estadía',
  porcentaje_reembolso=0, monto_reembolso=0, monto_penalidad_plataforma=0, monto_compensacion_cuidador=0, estado_tramite='Pendiente Revisión',
  fecha_solicitud='2026-11-17 09:00:00')

# ----------------------------------------------------------------------------
# SEGUIMIENTO, S.O.S., RESEÑAS
# ----------------------------------------------------------------------------
def rep(i, res, cu, fh, ev, animo, ubi, nota, fotos, visto='No'):
    R('reportes_seguimiento', id_reporte=i, id_reserva=res, id_cuidador=cu, fecha_hora=fh, tipo_evento=ev, estado_animo_mascota=animo,
      ubicacion_referencial=ubi, nota_estado=nota, visto_por_propietario=visto)
    for k, f in enumerate(fotos):
        R('fotos_reporte', id_foto='FOT-%s-%d' % (i[-2:], k + 1), id_reporte=i, foto_url=f, descripcion_foto=ev, fecha_subida=fh + ':00')
rep('REP-01', 'RES-1001', 'CUID-01', '2026-11-20 09:30', 'Paseo Matutino', 'Muy Feliz', 'Parque de Magisterio, Wanchaq', 'Orejas jugó feliz en el parque, tomó agua fresca y socializó muy bien.', [U(DOGS[0])])
rep('REP-02', 'RES-1001', 'CUID-01', '2026-11-20 14:15', 'Alimentación e Hidratación', 'Tranquilo', 'Casa de Carlos, Wanchaq', 'Comió toda su ración a tiempo y ahora descansa tranquilo en su cama térmica.', [U(DOGS[5])])
rep('REP-03', 'RES-1002', 'CUID-02', '2026-11-02 11:00', 'Juegos y Socialización', 'Juguetón', 'Patio de Valeria, San Sebastián', 'Canela estuvo súper alegre jugando con la pelota en el patio.', [U(DOGS[1])], 'Sí')
rep('REP-04', 'RES-1006', 'CUID-01', '2026-11-06 10:00', 'Paseo Matutino', 'Muy Feliz', 'Parque de Magisterio, Wanchaq', 'Canela disfrutó su paseo y cuidó mucho el ritmo de la caminata.', [U(DOGS[6])], 'Sí')

R('incidencias_emergencias', id_incidencia='INC-01', id_reserva='RES-1001', id_mascota='PET-30D6F104', reportado_por_usuario='USR-01', nivel_severidad='Leve',
  tipo_incidencia='Malestar digestivo / Inapetencia', descripcion='El canino presentó inapetencia temporal por cambio de clima en la mañana.', estado_alerta='Activa',
  id_clinica_derivada='VET-01', fecha_incidencia='2026-11-20 11:00:00')
R('incidencias_emergencias', id_incidencia='INC-02', id_reserva='RES-1002', id_mascota='PET-696ADDD8', reportado_por_usuario='USR-04', nivel_severidad='Leve',
  tipo_incidencia='Alergia cutánea o picadura', descripcion='Pequeña irritación en pata delantera tras paseo en césped.', estado_alerta='Resuelta',
  id_clinica_derivada='VET-03', atendido_por_vet_usuario='USR-09', diagnostico_clinico='Dermatitis leve de contacto', tratamiento_aplicado='Limpieza tópica y crema cicatrizante por 3 días',
  informe_resolucion='Atendida sin complicaciones. Se recomienda secar bien las patas tras paseos en césped.', costo_atencion_ref=80,
  fecha_incidencia='2026-11-02 16:30:00', fecha_atencion='2026-11-02 17:00:00', fecha_resolucion='2026-11-02 18:15:00')
R('incidencias_emergencias', id_incidencia='INC-03', id_reserva='RES-1001', id_mascota='PET-30D6F104', reportado_por_usuario='USR-02', nivel_severidad='Moderada',
  tipo_incidencia='Lesión o cojera durante el paseo', descripcion='Orejas cojea levemente de la pata trasera derecha después de correr en el parque.', estado_alerta='En Atención Clínica',
  id_clinica_derivada='VET-03', atendido_por_vet_usuario='USR-09', fecha_incidencia='2026-11-21 10:20:00', fecha_atencion='2026-11-21 10:45:00')

R('reseñas', id_reseña='REV-3091', id_reserva='RES-1002', id_propietario='USR-01', id_cuidador='CUID-02', calificacion_estrellas=5, puntualidad_estrellas=5, comunicacion_estrellas=5,
  cuidado_estrellas=5, comentario='Excelente servicio de Valeria en San Sebastián, me envió fotos puntuales y Canela regresó súper feliz.', respuesta_cuidador='¡Gracias Angelo! Canela es un amor.', visible='Sí', fecha_reseña='2026-11-04 10:15:00')
R('reseñas', id_reseña='REV-3092', id_reserva='RES-1006', id_propietario='USR-01', id_cuidador='CUID-01', calificacion_estrellas=5, puntualidad_estrellas=5, comunicacion_estrellas=5,
  cuidado_estrellas=5, comentario='Carlos es muy atento y puntual con los paseos en Wanchaq. Totalmente recomendado en Cusco.', visible='Sí', fecha_reseña='2026-11-08 18:20:00')

# ----------------------------------------------------------------------------
# DISPONIBILIDAD (agenda granular) – coherente con las reservas activas
# ----------------------------------------------------------------------------
import datetime as dt
def dias_ocupados(ini, fin):
    a = dt.date.fromisoformat(ini); b = dt.date.fromisoformat(fin)
    if b <= a: b = a + dt.timedelta(days=1)
    out = []
    while a < b:
        out.append(a.isoformat()); a += dt.timedelta(days=1)
    return out
CAP = dict((r[0], r[6]) for r in DATA['perfiles_cuidadores'])
occ = {}
for r in RES:
    if r['estado'] in ('Pendiente Confirmación', 'Confirmada', 'En Curso'):
        for d in dias_ocupados(r['ini'], r['fin']):
            occ[(r['cu'], d)] = occ.get((r['cu'], d), 0) + 1
disp_n = 0
rows = []
for (c, d), n in sorted(occ.items()):
    rows.append((c, d, 'Lleno' if n >= CAP[c] else 'Parcial', CAP[c], n, ''))
rows += [('CUID-01', '2026-12-24', 'Bloqueado', 0, 0, 'Navidad - descanso familiar'), ('CUID-01', '2026-12-25', 'Bloqueado', 0, 0, 'Navidad - descanso familiar'),
         ('CUID-02', '2026-12-31', 'Bloqueado', 0, 0, 'Fin de año'), ('CUID-03', '2026-12-09', 'Disponible', 3, 0, 'Cupo reducido por evento familiar')]
for c, d, e, mx, n, nota in rows:
    disp_n += 1
    R('disponibilidad_cuidadores', id_disp='DSP-%04d' % disp_n, id_cuidador=c, fecha=d, estado_dia=e, cupo_maximo_dia=mx, cupos_reservados=n, nota_agenda=nota)

# ----------------------------------------------------------------------------
# ACEPTACIONES TyC, AUDITORÍA, NOTIFICACIONES
# ----------------------------------------------------------------------------
acc_n = [0]
def acc(u, tyc_id, ctx, ref, f):
    acc_n[0] += 1
    R('aceptaciones_tyc', id_aceptacion='ACE-%04d' % acc_n[0], id_usuario=u, id_tyc=tyc_id, version_tyc='v4.0', contexto=ctx, id_referencia=ref, fecha_aceptacion=f)
for u in DATA['usuarios']:
    tid = {'Propietario': 'TYC-02', 'Cuidador': 'TYC-03', 'Veterinaria': 'TYC-04', 'Administrador': 'TYC-01'}[u[6]]
    ctx = 'Postulación' if u[6] == 'Cuidador' else 'Registro'
    acc(u[0], 'TYC-01', ctx, u[0], u[20])
    if u[6] != 'Administrador':
        acc(u[0], tid, ctx, u[0], u[20])
for r in RES:
    prop = [x for x in DATA['reservas'] if x[0] == r['id']][0][2]
    acc(prop, 'TYC-05', 'Reserva', r['id'], r['sol'])

aud_n = [0]
def aud(ent, idr, a, n, u, rol, det, f):
    aud_n[0] += 1
    R('auditoria_estados', id_auditoria='AUD-%05d' % aud_n[0], entidad=ent, id_registro=idr, estado_anterior=a, estado_nuevo=n, actor_id_usuario=u, actor_rol=rol, detalle_motivo=det, fecha_hora=f)
aud('Cuidador', 'CUID-01', 'Pendiente', 'Aprobado', 'USR-03', 'Administrador', 'Documentos verificados', '2026-10-03 09:00:00')
aud('Cuidador', 'CUID-02', 'Pendiente', 'Aprobado', 'USR-03', 'Administrador', 'Documentos verificados', '2026-10-06 09:00:00')
aud('Cuidador', 'CUID-03', 'Pendiente', 'Aprobado', 'USR-03', 'Administrador', 'Documentos verificados', '2026-10-09 09:00:00')
aud('Mascota', 'PET-30D6F104', 'Pendiente', 'Validado', 'USR-08', 'Veterinaria', 'Validación VET-01', '2026-10-16 10:00:00')
aud('Reserva', 'RES-1001', 'Confirmada', 'En Curso', 'USR-02', 'Cuidador', 'Check-In realizado', '2026-11-19 08:10:00')
aud('Reserva', 'RES-1002', 'En Curso', 'Finalizada', 'USR-04', 'Cuidador', 'Check-Out realizado', '2026-11-03 17:30:00')
aud('Reserva', 'RES-1005', 'Confirmada', 'Cancelada', 'USR-07', 'Propietario', 'Cancelación con reembolso 100%', '2026-11-06 08:00:00')
aud('Reserva', 'RES-1007', 'Confirmada', 'Cancelada', 'USR-07', 'Propietario', 'Cancelación con reembolso 70%', '2026-11-11 20:00:00')
aud('Reserva', 'RES-1008', 'Finalizada', 'En Disputa', 'USR-01', 'Propietario', 'Disputa abierta', '2026-11-17 09:00:00')
aud('Incidencia', 'INC-02', 'En Atención Clínica', 'Resuelta', 'USR-09', 'Veterinaria', 'Alta médica', '2026-11-02 18:15:00')
aud('Liquidación', 'LIQ-202', 'Solicitado', 'Liquidado', 'USR-03', 'Administrador', 'Desembolso DESEM-0001', '2026-11-04 18:00:00')

not_n = [0]
def noti(u, tipo, t, m, ref, leida, f):
    not_n[0] += 1
    R('notificaciones', id_notificacion='NOT-%04d' % not_n[0], id_usuario_destino=u, tipo=tipo, titulo=t, mensaje=m, id_referencia=ref, leida=leida, fecha_creacion=f)
noti('USR-01', 'SOS', 'Alerta S.O.S. en curso', 'Se registró una alerta Moderada para Orejas (INC-03). La clínica Wanchaq 24h la está atendiendo.', 'INC-03', 'No', '2026-11-21 10:45:00')
noti('USR-01', 'ValidacionVet', 'Ficha pendiente de validación', 'La ficha de Negra (PAW-7030) está en espera de validación por una clínica aliada.', 'PET-26958DD9', 'No', '2026-11-18 16:20:00')
noti('USR-02', 'Reserva', 'Nueva solicitud de reserva', 'Angelo solicitó RES-1004 del 2026-12-03 al 2026-12-05. Acepta o rechaza la solicitud.', 'RES-1004', 'No', '2026-11-20 18:45:00')
noti('USR-02', 'Pago', 'Saldo disponible', 'Tienes saldo disponible para retiro por la reserva RES-1006.', 'LIQ-205', 'No', '2026-11-07 09:00:00')
noti('USR-09', 'SOS', 'Alerta S.O.S. asignada', 'Caso INC-03 (Moderada) en atención clínica.', 'INC-03', 'No', '2026-11-21 10:20:00')
noti('USR-08', 'SOS', 'Nueva alerta S.O.S. derivada', 'INC-01 (Leve): Malestar digestivo. Toma el caso desde tu panel.', 'INC-01', 'No', '2026-11-20 11:00:00')
noti('USR-08', 'ValidacionVet', 'Fichas por validar', 'Hay 2 fichas PAW PATITA-ID pendientes de validación.', 'PET-26958DD9', 'No', '2026-11-19 09:10:00')
noti('USR-03', 'Cancelacion', 'Cancelación por revisar', 'RES-1007: cancelación con reembolso del 70% en espera de ejecución.', 'CAN-002', 'No', '2026-11-11 20:00:00')
noti('USR-03', 'Cancelacion', 'Disputa abierta', 'RES-1008: disputa abierta por el propietario.', 'CAN-003', 'No', '2026-11-17 09:00:00')
noti('USR-03', 'Aprobacion', 'Cuidadora pendiente', 'Lucía Mendoza espera la verificación de antecedentes.', 'CUID-04', 'No', '2026-10-12 16:10:00')
noti('USR-03', 'Aprobacion', 'Clínica pendiente', 'Consultorio Veterinario Santiago solicita afiliación.', 'VET-05', 'No', '2026-11-15 12:00:00')
noti('USR-07', 'Cancelacion', 'Reembolso en proceso', 'Tu cancelación de RES-1007 se encuentra en revisión del administrador.', 'CAN-002', 'Sí', '2026-11-11 20:00:00')

# ----------------------------------------------------------------------------
# ESCRITURA DEL LIBRO
# ----------------------------------------------------------------------------
ENUMS = {
 'usuarios': {'tipo_usuario': 'Propietario,Cuidador,Veterinaria,Administrador', 'subtipo_propietario': 'Local,Turista,N/A', 'idioma_preferido': 'ES,EN', 'estado_cuenta': 'Activo,Pendiente,Suspendido'},
 'mascotas': {'tamano': 'Pequeño,Mediano,Grande', 'estado_validacion_vet': 'Pendiente,Validado,Observado'},
 'perfiles_cuidadores': {'estado_postulacion': 'Pendiente,Aprobado,Observado,Rechazado,Suspendido', 'cuenta_cobro_tipo': 'Yape,Plin,CCI'},
 'servicios': {'categoria': 'Paseo,Hospedaje,Guardería,Domicilio Turístico', 'disponible': 'Sí,No'},
 'reservas': {'estado_reserva': 'Pendiente Confirmación,Confirmada,En Curso,Finalizada,Cancelada,En Disputa', 'modalidad_cliente': 'Local,Turista'},
 'pagos': {'metodo_pago': 'Yape,Plin,Tarjeta,Transferencia', 'estado_pago': 'Aprobado,Reembolsado Parcial,Reembolsado Total,En Disputa'},
 'liquidaciones_cuidadores': {'estado_liquidacion': 'En Garantía,Disponible,Solicitado,Liquidado,Anulado', 'tipo_concepto': 'Servicio Finalizado,Compensación Cancelación'},
 'clinicas_veterinarias': {'estado_afiliacion': 'Pendiente,Activa,Suspendida', 'horario_atencion': '24 Horas,Diurno', 'activa': 'Sí,No'},
 'antecedentes_cuidadores': {'estado_verificacion': 'Pendiente,Aprobado,Observado,Rechazado'},
 'incidencias_emergencias': {'nivel_severidad': 'Leve,Moderada,Crítica', 'estado_alerta': 'Activa,En Atención Clínica,Estabilizada,Resuelta'},
 'disponibilidad_cuidadores': {'estado_dia': 'Disponible,Parcial,Lleno,Bloqueado'},
 'validaciones_veterinarias': {'resultado': 'Validado,Observado,Rechazado'},
 'cancelaciones_reembolsos': {'tipo_caso': 'Cancelación,Disputa,Rechazo Cuidador', 'estado_tramite': 'Pendiente Revisión,Aprobado,Reembolsado,Rechazado'},
 'cupones_promocionales': {'tipo_descuento': 'Porcentaje,Monto Fijo', 'segmento_objetivo': 'Todos,Local,Turista', 'activo': 'Sí,No'},
 'temporadas_tarifas': {'activa': 'Sí,No'},
 'terminos_condiciones': {'alcance': 'General,Propietario,Cuidador,Veterinaria,Reserva', 'estado': 'Vigente,Archivado'},
 'aceptaciones_tyc': {'contexto': 'Registro,Reserva,Postulación'},
 'notificaciones': {'tipo': 'Reserva,SOS,ValidacionVet,Pago,Cancelacion,Aprobacion,Sistema', 'leida': 'Sí,No'},
}
COLORS = ['0F172A', 'E85D2A', '0F766E', '1E293B', 'B45309']

def build(path):
    wb = Workbook()
    wb.remove(wb.active)
    for idx, (name, _) in enumerate(SCHEMA):
        ws = wb.create_sheet(name)
        hs = HEADERS[name]
        ws.append(hs)
        for row in DATA[name]:
            ws.append(row)
        for c in range(1, len(hs) + 1):
            cell = ws.cell(1, c)
            cell.font = Font(bold=True, color='FFFFFF')
            cell.fill = PatternFill('solid', fgColor=COLORS[idx % len(COLORS)])
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            ws.column_dimensions[get_column_letter(c)].width = max(14, min(42, len(hs[c - 1]) + 4))
        for r in range(2, ws.max_row + 1):
            for c in range(1, len(hs) + 1):
                cell = ws.cell(r, c)
                if isinstance(cell.value, str):
                    cell.number_format = '@'
        ws.freeze_panes = 'B2'
        ws.row_dimensions[1].height = 32
        for col, vals in ENUMS.get(name, {}).items():
            ci = hs.index(col) + 1
            dv = DataValidation(type='list', formula1='"%s"' % vals, allow_blank=True)
            ws.add_data_validation(dv)
            dv.add('%s2:%s1000' % (get_column_letter(ci), get_column_letter(ci)))
    wb.save(path)

def verificar():
    """Integridad referencial del dataset semilla."""
    ids = dict((n, set(r[0] for r in DATA[n])) for n, _ in SCHEMA)
    def fk(sheet, col, target):
        i = HEADERS[sheet].index(col)
        for r in DATA[sheet]:
            v = r[i]
            if v and v not in ids[target]:
                raise Exception('FK rota %s.%s=%s -> %s' % (sheet, col, v, target))
    fk('usuarios', 'id_clinica_asociada', 'clinicas_veterinarias')
    fk('mascotas', 'id_propietario', 'usuarios'); fk('mascotas', 'id_clinica_validadora', 'clinicas_veterinarias')
    fk('perfiles_cuidadores', 'id_usuario', 'usuarios'); fk('servicios', 'id_cuidador', 'perfiles_cuidadores')
    for c, t in [('id_propietario', 'usuarios'), ('id_cuidador', 'perfiles_cuidadores'), ('id_oferta', 'servicios'), ('id_mascota', 'mascotas'), ('id_temporada', 'temporadas_tarifas'), ('id_cupon', 'cupones_promocionales')]:
        fk('reservas', c, t)
    fk('pagos', 'id_reserva', 'reservas'); fk('liquidaciones_cuidadores', 'id_pago', 'pagos'); fk('liquidaciones_cuidadores', 'id_reserva', 'reservas')
    fk('liquidaciones_cuidadores', 'id_cuidador', 'perfiles_cuidadores')
    fk('reportes_seguimiento', 'id_reserva', 'reservas'); fk('fotos_reporte', 'id_reporte', 'reportes_seguimiento')
    fk('antecedentes_cuidadores', 'id_cuidador', 'perfiles_cuidadores'); fk('antecedentes_cuidadores', 'revisado_por_admin', 'usuarios')
    for c, t in [('id_reserva', 'reservas'), ('id_mascota', 'mascotas'), ('reportado_por_usuario', 'usuarios'), ('id_clinica_derivada', 'clinicas_veterinarias'), ('atendido_por_vet_usuario', 'usuarios')]:
        fk('incidencias_emergencias', c, t)
    fk('reseñas', 'id_reserva', 'reservas'); fk('reseñas', 'id_propietario', 'usuarios'); fk('reseñas', 'id_cuidador', 'perfiles_cuidadores')
    fk('disponibilidad_cuidadores', 'id_cuidador', 'perfiles_cuidadores')
    fk('validaciones_veterinarias', 'id_mascota', 'mascotas'); fk('validaciones_veterinarias', 'id_clinica', 'clinicas_veterinarias'); fk('validaciones_veterinarias', 'id_usuario_vet', 'usuarios')
    fk('cancelaciones_reembolsos', 'id_reserva', 'reservas'); fk('cancelaciones_reembolsos', 'id_pago', 'pagos'); fk('cancelaciones_reembolsos', 'solicitado_por', 'usuarios')
    fk('aceptaciones_tyc', 'id_usuario', 'usuarios'); fk('aceptaciones_tyc', 'id_tyc', 'terminos_condiciones'); fk('notificaciones', 'id_usuario_destino', 'usuarios')
    # invariante contable: bruto = comision + neto + reembolso
    ip = HEADERS['pagos']
    for r in DATA['pagos']:
        b, c, n, rf = r[ip.index('monto_bruto')], r[ip.index('comision_plataforma')], r[ip.index('monto_neto_cuidador')], r[ip.index('monto_reembolsado')]
        if abs(b - (c + n + rf)) > 0.011:
            raise Exception('Invariante contable rota en %s: %s != %s+%s+%s' % (r[0], b, c, n, rf))
    # unicidad de emails
    em = [r[3] for r in DATA['usuarios']]
    assert len(em) == len(set(em))

if __name__ == '__main__':
    args = sys.argv[1:]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'BD-PAWPATITAS-v3.xlsx')
    js = None
    if '--json' in args:
        js = args[args.index('--json') + 1]
        args = [a for i, a in enumerate(args) if a != '--json' and (i == 0 or args[i - 1] != '--json')]
    if args:
        out = args[0]
    verificar()
    build(os.path.abspath(out))
    if js:
        with open(js, 'w', encoding='utf-8') as f:
            json.dump({'schema': [[n, HEADERS[n]] for n, _ in SCHEMA], 'data': DATA}, f, ensure_ascii=False)
    print('OK -> %s | %d pestañas | %d filas' % (os.path.abspath(out), len(SCHEMA), sum(len(v) for v in DATA.values())))
