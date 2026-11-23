/**
 * Paw Patita Cusco v5.2 — Modal Legal Global
 * js/components/legal-modal.js
 * 
 * Implementa el Modal Legal Global con 3 pestañas navegables completas (Bilingüe ES / EN):
 * 1. Términos y Condiciones de Uso v5.2 (Intermediación, PAW-ID, 15/85, Pago Protegido, Ley 30407, SOS)
 * 2. Política de Privacidad — Ley N° 29733 (Datos personales, geolocalización SOS, privacidad QR, ARCO)
 * 3. Declaración Jurada de Idoneidad y Antecedentes (Cuidadores y Clínicas, Art. 411 CP)
 * 
 * Cuenta con delegación global de eventos para [data-legal-tab] y apilamiento seguro
 * (z-index 1085 / backdrop 1080) sin romper el scroll de modales padre.
 */

import { getCurrentLang } from '../i18n.js';

let legalModalInstance = null;
let modalElement = null;
let currentModalLang = null;

function getLegalModalHtml(lang = 'ES') {
  const isEn = lang === 'EN';

  return `
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
      <div class="modal-content shadow-lg border-0" style="border-radius: var(--pp-radius-lg, 18px); overflow: hidden;">
        <!-- Header con Identidad Andina -->
        <div class="modal-header text-white" style="background: linear-gradient(135deg, var(--pp-secondary, #111827) 0%, var(--pp-secondary-dark, #0B1120) 100%); border-bottom: 3.5px solid var(--pp-primary, #E85D24);">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-shield-check text-warning fs-4"></i>
            <div>
              <h5 class="modal-title fw-bold mb-0 text-white" id="modal-legal-title">
                ${isEn ? 'Legal Framework & Paw Patita Cusco Regulations' : 'Marco Legal y Normativa Paw Patita Cusco'}
              </h5>
              <small class="text-white-50">${isEn ? 'Official Edition v5.2 • Cusco, Peru' : 'Edición Oficial v5.2 • Cusco, Perú'}</small>
            </div>
          </div>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="${isEn ? 'Close' : 'Cerrar'}"></button>
        </div>

        <!-- Navegación de Pestañas Legales -->
        <div class="bg-light px-3 pt-2 border-bottom">
          <ul class="nav nav-tabs border-0" id="legal-tabs-nav" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active fw-bold text-dark" id="tab-btn-terminos" data-bs-toggle="tab" data-bs-target="#pane-legal-terminos" type="button" role="tab" aria-controls="pane-legal-terminos" aria-selected="true">
                <i class="bi bi-file-earmark-text text-primary me-1"></i> ${isEn ? '1. Terms & Conditions' : '1. Términos y Condiciones'}
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link fw-bold text-dark" id="tab-btn-privacidad" data-bs-toggle="tab" data-bs-target="#pane-legal-privacidad" type="button" role="tab" aria-controls="pane-legal-privacidad" aria-selected="false">
                <i class="bi bi-shield-lock text-success me-1"></i> ${isEn ? '2. Privacy (Law 29733)' : '2. Privacidad (Ley 29733)'}
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link fw-bold text-dark" id="tab-btn-declaracion" data-bs-toggle="tab" data-bs-target="#pane-legal-declaracion" type="button" role="tab" aria-controls="pane-legal-declaracion" aria-selected="false">
                <i class="bi bi-pen text-warning me-1"></i> ${isEn ? '3. Sworn Affidavit' : '3. Declaración Jurada'}
              </button>
            </li>
          </ul>
        </div>

        <!-- Contenido de las Pestañas -->
        <div class="modal-body p-4" style="background-color: var(--pp-bg-surface, #FFFFFF); font-size: 0.92rem; line-height: 1.6;">
          <div class="tab-content" id="legal-tabs-content">
            
            <!-- PESTAÑA 1: TÉRMINOS Y CONDICIONES v5.2 -->
            <div class="tab-pane fade show active" id="pane-legal-terminos" role="tabpanel" aria-labelledby="tab-btn-terminos">
              <div class="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                <i class="bi bi-info-circle-fill fs-5"></i>
                <span><strong>${isEn ? 'Effective:' : 'Vigencia:'}</strong> ${isEn ? 'Updated to November 2026 for the Paw Patita Cusco v5.2 platform.' : 'Actualizado a Noviembre 2026 para la plataforma Paw Patita Cusco v5.2.'}</span>
              </div>

              ${isEn ? `
                <h6 class="fw-bold text-dark mb-2">1. Nature of the Service & Technological Intermediation</h6>
                <p class="text-secondary mb-3">
                  <strong>Paw Patita Cusco</strong> operates as a digital technology intermediation platform connecting companion animal owners (locals and tourists) with <strong>Qualified Independent Caregivers</strong> and <strong>24h Allied Veterinary Clinics</strong> across the Cusco region. Paw Patita does not directly provide ambulatory veterinary medical care, other than managing the S.O.S. emergency network, management software, and the PAW-ID Digital Card.
                </p>

                <h6 class="fw-bold text-dark mb-2">2. PAW-ID Digital Card & Health Requirements</h6>
                <p class="text-secondary mb-3">
                  Every pet receiving services through the platform must have its <strong>PAW-ID Digital Card</strong> generated in the system. Up-to-date sextuple/octuple and rabies vaccines certified by a collegiate veterinary clinic are strictly required. The owner guarantees the veracity of the declared medical history.
                </p>

                <h6 class="fw-bold text-dark mb-2">3. Transparent Rates & Distribution Model (15% / 85%)</h6>
                <p class="text-secondary mb-3">The platform promotes a fair, transparent economy:</p>
                <ul class="text-secondary mb-3">
                  <li><strong>85% of net service value</strong> belongs entirely to the Independent Caregiver for their dedication, family care, and hosting.</li>
                  <li><strong>15% of service value</strong> constitutes Paw Patita's platform fee for server infrastructure, background auditing, 24/7 support, and S.O.S. network maintenance.</li>
                </ul>

                <h6 class="fw-bold text-dark mb-2">4. Escrow Protected Payment until Check-Out</h6>
                <p class="text-secondary mb-3">
                  100% of the funds paid by the Owner upon booking remain in <strong>Protected Escrow</strong>. Funds are released to the Caregiver only after the stay is completed and the Caregiver records the <strong>formal Check-Out</strong> at the scheduled date and time.
                </p>

                <h6 class="fw-bold text-dark mb-2">5. Tiered Cancellation and Refund Policy</h6>
                <div class="table-responsive mb-3">
                  <table class="table table-bordered table-sm small align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Cancellation Notice</th>
                        <th>Owner Refund</th>
                        <th>Caregiver Compensation</th>
                        <th>Platform Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>More than 48 hours</strong> prior</td>
                        <td class="text-success fw-bold">100% refund</td>
                        <td>0%</td>
                        <td>0%</td>
                      </tr>
                      <tr>
                        <td><strong>Between 24 and 48 hours</strong> prior</td>
                        <td class="text-warning-emphasis fw-bold">70% refund</td>
                        <td>15% (calendar reservation)</td>
                        <td>15% (admin fee)</td>
                      </tr>
                      <tr>
                        <td><strong>Less than 24 hours</strong> prior</td>
                        <td class="text-danger fw-bold">50% refund</td>
                        <td>35% (slot block)</td>
                        <td>15% (admin fee)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h6 class="fw-bold text-dark mb-2">6. Animal Welfare & Legal Framework (Peruvian Law No. 30407)</h6>
                <p class="text-secondary mb-3">
                  Both Owners and Caregivers are subject to the provisions of <strong>Law No. 30407 (Animal Protection and Welfare Law of Peru)</strong>. Any negligent conduct or animal cruelty will result in immediate termination, withholding of earnings, and legal prosecution before the Public Prosecutor's Office and the Peruvian National Police.
                </p>

                <h6 class="fw-bold text-dark mb-2">7. S.O.S. Protocol & Emergency Veterinary Network</h6>
                <p class="text-secondary mb-0">
                  In case of any trauma or health incident during an active booking, the Caregiver must immediately activate the <strong>S.O.S. Alert</strong>, routing the pet to the closest 24h allied veterinary clinic in Cusco and notifying both Owner and Administrator in real time.
                </p>
              ` : `
                <h6 class="fw-bold text-dark mb-2">1. Naturaleza del Servicio e Intermediación Tecnológica</h6>
                <p class="text-secondary mb-3">
                  <strong>Paw Patita Cusco</strong> opera como una plataforma tecnológica digital de intermediación que conecta a propietarios de animales de compañía (locales y turistas) con <strong>Cuidadores Independientes Calificados</strong> y <strong>Clínicas Veterinarias Aliadas 24h</strong> en el ámbito territorial del Departamento y Provincia del Cusco. Paw Patita no presta directamente servicios veterinarios de atención médica ambulatoria, salvo la gestión de la red de emergencia S.O.S. y la provisión del software de gestión y Carné Digital PAW-ID.
                </p>

                <h6 class="fw-bold text-dark mb-2">2. Carné Digital PAW-ID y Requisitos Sanitarios</h6>
                <p class="text-secondary mb-3">
                  Toda mascota que reciba servicios a través de la plataforma debe contar con su <strong>Carné Digital PAW-ID</strong> generado en el sistema. Es condición obligatoria que las vacunas séxtuple/óctuple y antirrábica se encuentren vigentes y validadas documentalmente por una clínica veterinaria colegiada. El propietario garantiza la veracidad del historial de salud y alergias declarado en la ficha.
                </p>

                <h6 class="fw-bold text-dark mb-2">3. Tarifas Transparentes y Modelo de Distribución (15% / 85%)</h6>
                <p class="text-secondary mb-3">
                  La plataforma promueve una economía justa y transparente:
                </p>
                <ul class="text-secondary mb-3">
                  <li><strong>85% del valor neto del servicio</strong> corresponde íntegramente al Cuidador Independiente por su tiempo, dedicación, cuidado familiar y alojamiento.</li>
                  <li><strong>15% del valor del servicio</strong> corresponde a la comisión de Paw Patita por sostenimiento de servidores, auditoría de antecedentes, soporte 24/7 y cobertura de la Central de Emergencias S.O.S.</li>
                </ul>

                <h6 class="fw-bold text-dark mb-2">4. Pago Protegido en Garantía hasta el Check-Out</h6>
                <p class="text-secondary mb-3">
                  El 100% de los fondos abonados por el Propietario al momento de reservar queda en <strong>Pago Protegido en Garantía</strong>. Dichos fondos no son liberados al Cuidador hasta que se complete satisfactoriamente la estadía y el Cuidador registre el <strong>Check-Out formal</strong> en la fecha y hora pactadas.
                </p>

                <h6 class="fw-bold text-dark mb-2">5. Política Escalonada de Cancelación y Reembolsos</h6>
                <div class="table-responsive mb-3">
                  <table class="table table-bordered table-sm small align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Anticipación de Cancelación</th>
                        <th>Reembolso Propietario</th>
                        <th>Compensación Cuidador</th>
                        <th>Plataforma</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Más de 48 horas</strong> previas al inicio</td>
                        <td class="text-success fw-bold">100% de reembolso</td>
                        <td>0%</td>
                        <td>0%</td>
                      </tr>
                      <tr>
                        <td><strong>Entre 24 y 48 horas</strong> previas</td>
                        <td class="text-warning-emphasis fw-bold">70% de reembolso</td>
                        <td>15% (reserva de agenda)</td>
                        <td>15% (gastos adm.)</td>
                      </tr>
                      <tr>
                        <td><strong>Menos de 24 horas</strong> previas</td>
                        <td class="text-danger fw-bold">50% de reembolso</td>
                        <td>35% (bloqueo de cupo)</td>
                        <td>15% (gastos adm.)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h6 class="fw-bold text-dark mb-2">6. Bienestar Animal y Marco Legal (Ley N° 30407)</h6>
                <p class="text-secondary mb-3">
                  Tanto Propietarios como Cuidadores se someten expresamente a las disposiciones de la <strong>Ley N° 30407 (Ley de Protección y Bienestar Animal del Perú)</strong>. Cualquier conducta negligente, acto de crueldad o abandono derivará en la baja inmediata de la cuenta, retención de haberes y la interposición de las denuncias correspondientes ante el Ministerio Público y la Policía Nacional del Perú.
                </p>

                <h6 class="fw-bold text-dark mb-2">7. Protocolo S.O.S. y Emergencias Veterinarias en Cusco</h6>
                <p class="text-secondary mb-0">
                  Ante cualquier eventualidad de salud, trauma o accidente durante una reserva en curso, el Cuidador está obligado a activar de inmediato la <strong>Alerta S.O.S.</strong> en el sistema, lo cual derivará a la mascota hacia la Clínica Veterinaria Aliada 24h más cercana en Cusco, notificando en tiempo real al Propietario y al Administrador.
                </p>
              `}
            </div>

            <!-- PESTAÑA 2: POLÍTICA DE PRIVACIDAD — LEY N° 29733 -->
            <div class="tab-pane fade" id="pane-legal-privacidad" role="tabpanel" aria-labelledby="tab-btn-privacidad">
              <div class="alert alert-success py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                <i class="bi bi-shield-lock-fill fs-5"></i>
                <span><strong>${isEn ? 'Legal Protection:' : 'Protección Legal:'}</strong> ${isEn ? 'Compliant with Peruvian Personal Data Protection Law No. 29733 and its Regulations (D.S. No. 003-2013-JUS).' : 'Conforme a la Ley N° 29733 (Ley de Protección de Datos Personales del Perú) y su Reglamento D.S. N° 003-2013-JUS.'}</span>
              </div>

              ${isEn ? `
                <h6 class="fw-bold text-dark mb-2">1. Data Controller & Data Bank</h6>
                <p class="text-secondary mb-3">
                  Paw Patita Cusco guarantees that personal data collected via web forms, registrations, and mobile applications is processed under the principles of legality, consent, purpose, proportionality, and security established by Peruvian regulations.
                </p>

                <h6 class="fw-bold text-dark mb-2">2. Purpose of Collected Data</h6>
                <ul class="text-secondary mb-3">
                  <li><strong>Owners & Pets:</strong> Identity verification, medical health records, direct contact for bookings, and S.O.S. emergency coordination.</li>
                  <li><strong>Caregivers:</strong> Identity verification via DNI/CE, criminal and police background auditing, home address validation, and bank payout processing.</li>
                  <li><strong>Veterinary Clinics:</strong> Accreditation before the Peruvian College of Veterinary Physicians (CMVP), clinic branch locations, and veterinary health records.</li>
                </ul>

                <h6 class="fw-bold text-dark mb-2">3. Privacy of PAW-ID QR Code & Sensitive Data</h6>
                <p class="text-secondary mb-3">
                  The PAW-ID Digital Card includes a public QR code engineered under the <strong>privacy-by-design</strong> principle. When scanned in an emergency:
                </p>
                <ul class="text-secondary mb-3">
                  <li><strong>NEVER displays the Owner's ID or national document number.</strong></li>
                  <li><strong>NEVER displays the exact home address</strong> (only referential district, e.g., <em>Wanchaq, Cusco</em>).</li>
                  <li>Only exposes voluntary rescue channels: direct WhatsApp and phone call buttons to the Owner and emergency contact.</li>
                </ul>

                <h6 class="fw-bold text-dark mb-2">4. Strictly Limited Geolocation</h6>
                <p class="text-secondary mb-3">
                  The platform <strong>DOES NOT perform continuous background location tracking</strong>. Geographic coordinates are only requested voluntarily in two cases:
                </p>
                <ol class="text-secondary mb-3">
                  <li>When filtering caregivers in the interactive Cusco district catalog.</li>
                  <li>When issuing an S.O.S. emergency alert to locate the nearest 24h allied veterinary clinic.</li>
                </ol>

                <h6 class="fw-bold text-dark mb-2">5. Exercise of ARCO Rights</h6>
                <p class="text-secondary mb-0">
                  Any data subject may exercise their <strong>Access, Rectification, Cancellation, and Opposition (ARCO)</strong> rights by emailing: <strong class="text-primary">privacidad@pawpatitacusco.pe</strong>, with a statutory response time of up to 10 business days.
                </p>
              ` : `
                <h6 class="fw-bold text-dark mb-2">1. Responsable del Tratamiento y Banco de Datos</h6>
                <p class="text-secondary mb-3">
                  Paw Patita Cusco garantiza que el tratamiento de los datos personales recopilados a través de formularios web, registros y aplicaciones móviles se realiza conforme a los principios de legalidad, consentimiento, finalidad, proporcionalidad y seguridad establecidos por la normativa peruana.
                </p>

                <h6 class="fw-bold text-dark mb-2">2. Finalidad de los Datos Recopilados</h6>
                <ul class="text-secondary mb-3">
                  <li><strong>Datos de Propietarios y Mascotas:</strong> Verificación de identidad, registro médico sanitario, contacto directo en reservas y coordinación de emergencias médicas S.O.S.</li>
                  <li><strong>Datos de Cuidadores:</strong> Verificación de identidad mediante DNI/CE, evaluación de antecedentes penales/policiales, comprobación domiciliaria y liquidación de pagos bancarios.</li>
                  <li><strong>Datos de Clínicas Veterinarias:</strong> Acreditación colegiada ante el CMVP, dirección de sedes de atención y registro de dictámenes médicos.</li>
                </ul>

                <h6 class="fw-bold text-dark mb-2">3. Privacidad del Carné QR PAW-ID y Protección de Datos Sensibles</h6>
                <p class="text-secondary mb-3">
                  El Carné Digital PAW-ID dispone de un código QR público diseñado bajo el principio de <strong>privacidad por diseño</strong>. Al ser escaneado por transeúntes en caso de extravío:
                </p>
                <ul class="text-secondary mb-3">
                  <li><strong>NUNCA se muestra el DNI</strong> ni el número de documento de identidad del Propietario.</li>
                  <li><strong>NUNCA se exhibe la dirección exacta</strong> ni el domicilio privado del Propietario (solo el distrito referencial, ej. <em>Wanchaq, Cusco</em>).</li>
                  <li>Solo se exponen los canales de auxilio voluntario: enlace a WhatsApp y botón de llamada directa al teléfono de emergencia y al Propietario.</li>
                </ul>

                <h6 class="fw-bold text-dark mb-2">4. Geolocalización Estrictamente Limitada</h6>
                <p class="text-secondary mb-3">
                  La plataforma <strong>NO realiza seguimiento ni geolocalización continua en segundo plano</strong> de sus usuarios. La ubicación geográfica solo es consultada de manera puntual y voluntaria en dos escenarios:
                </p>
                <ol class="text-secondary mb-3">
                  <li>Al buscar cuidadores cercanos en el catálogo interactivo de distritos de Cusco.</li>
                  <li>Al emitir una alerta de emergencia S.O.S., para identificar y enlazar la clínica veterinaria 24h más próxima al lugar del incidente.</li>
                </ol>

                <h6 class="fw-bold text-dark mb-2">5. Ejercicio de Derechos ARCO</h6>
                <p class="text-secondary mb-0">
                  Todo titular de datos personales podrá ejercer en cualquier momento sus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong>, así como revocar su consentimiento, remitiendo una solicitud firmada con copia de su documento de identidad al correo oficial: <strong class="text-primary">privacidad@pawpatitacusco.pe</strong>, con tiempo de respuesta máximo de 10 días hábiles.
                </p>
              `}
            </div>

            <!-- PESTAÑA 3: DECLARACIÓN JURADA DE IDONEIDAD Y ANTECEDENTES -->
            <div class="tab-pane fade" id="pane-legal-declaracion" role="tabpanel" aria-labelledby="tab-btn-declaracion">
              <div class="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                <i class="bi bi-exclamation-triangle-fill fs-5"></i>
                <span><strong>${isEn ? 'Binding Legal Effect:' : 'Efecto Vinculante:'}</strong> ${isEn ? 'This sworn affidavit holds full legal validity under Article 411 of the Peruvian Penal Code.' : 'Esta declaración jurada tiene plena validez legal conforme al Artículo 411 del Código Penal Peruano.'}</span>
              </div>

              ${isEn ? `
                <h6 class="fw-bold text-dark mb-2">Sworn Affidavit for Independent Caregivers</h6>
                <div class="p-3 rounded bg-light border text-secondary small mb-3">
                  <p class="mb-2">
                    I, when voluntarily applying as an Independent Caregiver on the Paw Patita Cusco platform, <strong>DECLARE UNDER OATH</strong>:
                  </p>
                  <ul class="mb-2 ps-3">
                    <li>I have no police, criminal, or judicial records for crimes against property, life, bodily integrity, health, or personal liberty in Peru or abroad.</li>
                    <li><strong>I have no complaints, active investigations, or final convictions for animal cruelty, abuse, or abandonment</strong> under Peruvian Law No. 30407 and Article 206-A of the Penal Code.</li>
                    <li>All submitted documents (DNI/Foreigner Card, Police Background Certificate, Judicial Criminal Certificate, and Utility/Proof of Address Bill) are genuine, legitimate, and current.</li>
                    <li>I guarantee a safe, hygienic, toxic-free environment with fresh drinking water and adequate ventilation when offering hosting or daycare services at my home.</li>
                    <li>I commit to providing affectionate, dignified, and ethical care to every assigned pet, delivering regular photo updates via the Live Wall.</li>
                  </ul>
                </div>

                <h6 class="fw-bold text-dark mb-2">Sworn Affidavit for Allied Veterinary Clinics</h6>
                <div class="p-3 rounded bg-light border text-secondary small mb-3">
                  <p class="mb-2">
                    The legal entity or individual applying as an Allied Veterinary Clinic <strong>DECLARES UNDER OATH</strong>:
                  </p>
                  <ul class="mb-2 ps-3">
                    <li>It holds an Active and Registered Tax Identification Number (RUC) before the SUNAT.</li>
                    <li>All responsible veterinarians hold <strong>active, valid professional licenses and habilitation</strong> before the Peruvian College of Veterinary Physicians (CMVP).</li>
                    <li>The facility possesses clinical equipment, emergency medicines, and cold-chain storage to treat emergencies and stabilize canine and feline patients.</li>
                    <li>It guarantees timely attention in the event of S.O.S. emergency referrals from the Paw Patita caregiver network in Cusco.</li>
                  </ul>
                </div>

                <h6 class="fw-bold text-dark mb-2">Penalties for Falsehood</h6>
                <p class="text-secondary small mb-0">
                  Any discovered falsehood or alteration empowers Paw Patita to terminate the account, cancel active bookings without indemnity, and file formal criminal charges for <strong>False Declaration in Administrative Proceedings (Art. 411 of the Peruvian Penal Code)</strong>.
                </p>
              ` : `
                <h6 class="fw-bold text-dark mb-2">Declaración Jurada para Cuidadores Independientes</h6>
                <div class="p-3 rounded bg-light border text-secondary small mb-3">
                  <p class="mb-2">
                    Yo, al postular voluntariamente como Cuidador Independiente en la plataforma Paw Patita Cusco, <strong>DECLARO BAJO JURAMENTO</strong>:
                  </p>
                  <ul class="mb-2 ps-3">
                    <li>No registrar antecedentes policiales, penales ni judiciales por delitos contra el patrimonio, la vida, el cuerpo y la salud, ni contra la libertad en el territorio nacional ni en el extranjero.</li>
                    <li><strong>No contar con denuncias, investigaciones ni sentencias firmes por maltrato, crueldad o abandono animal</strong> tipificados en la Ley N° 30407 y el Artículo 206-A del Código Penal.</li>
                    <li>Que los documentos presentados (Copia de DNI/CE, Certificado de Antecedentes Policiales PNP, Antecedentes Penales del Poder Judicial y Comprobante de Domicilio) son auténticos, legítimos y vigentes.</li>
                    <li>Garantizar un ambiente seguro, limpio, libre de sustancias tóxicas, con agua potable y ventilación adecuada en caso de ofrecer servicio de Hospedaje o Guardería en mi domicilio.</li>
                    <li>Brindar trato afectuoso, digno y ético a cada mascota encomendada, reportando verazmente fotos y novedades a través del Muro en Vivo.</li>
                  </ul>
                </div>

                <h6 class="fw-bold text-dark mb-2">Declaración Jurada para Clínicas Veterinarias Aliadas</h6>
                <div class="p-3 rounded bg-light border text-secondary small mb-3">
                  <p class="mb-2">
                    La persona jurídica o natural que postula como Clínica Veterinaria Aliada <strong>DECLARA BAJO JURAMENTO</strong>:
                  </p>
                  <ul class="mb-2 ps-3">
                    <li>Contar con Registro Único de Contribuyentes (RUC) en estado Activo y Habido ante la SUNAT.</li>
                    <li>Que los profesionales veterinarios responsables cuentan con <strong>Colegiatura Profesional vigente y Habilitación activa</strong> ante el Colegio Médico Veterinario del Perú (CMVP).</li>
                    <li>Disponer de infraestructura, equipamiento clínico, medicación y cadena de frío adecuada para atender urgencias y estabilizar pacientes caninos y felinos.</li>
                    <li>Garantizar atención oportuna en caso de derivaciones S.O.S. reportadas por la red de cuidadores de Paw Patita en la ciudad de Cusco.</li>
                  </ul>
                </div>

                <h6 class="fw-bold text-dark mb-2">Sanciones por Falsedad</h6>
                <p class="text-secondary small mb-0">
                  Cualquier falsedad, omisión u adulteración detectada en la información declarada facultará a Paw Patita a dar de baja definitiva la cuenta, cancelar reservas en curso sin derecho a indemnización y formalizar la denuncia penal por <strong>Falsa Declaración en Procedimiento Administrativo (Art. 411 del Código Penal Peruano)</strong>.
                </p>
              `}
            </div>

          </div>
        </div>

        <!-- Footer del Modal -->
        <div class="modal-footer bg-light border-top py-2 px-3 d-flex justify-content-between align-items-center">
          <small class="text-muted"><i class="bi bi-shield-fill-check text-success me-1"></i> ${isEn ? 'Official Document Paw Patita Cusco v5.2' : 'Documento Oficial Paw Patita Cusco v5.2'}</small>
          <button type="button" class="btn btn-secondary btn-sm px-4 fw-semibold" data-bs-dismiss="modal">${isEn ? 'Understood & Close' : 'Entendido y Cerrar'}</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Inicializa el contenedor del modal legal en el DOM y configura eventos
 */
export function initLegalModal() {
  modalElement = document.getElementById('modal-legal-global');
  const lang = getCurrentLang();

  if (!modalElement) {
    modalElement = document.createElement('div');
    modalElement.className = 'modal fade';
    modalElement.id = 'modal-legal-global';
    modalElement.tabIndex = -1;
    modalElement.setAttribute('aria-labelledby', 'modal-legal-title');
    modalElement.setAttribute('aria-hidden', 'true');
    modalElement.style.zIndex = '1085';
    modalElement.innerHTML = getLegalModalHtml(lang);
    currentModalLang = lang;
    document.body.appendChild(modalElement);
  } else if (currentModalLang !== lang) {
    modalElement.innerHTML = getLegalModalHtml(lang);
    currentModalLang = lang;
  }

  // Instanciar el Modal de Bootstrap
  if (window.bootstrap && window.bootstrap.Modal) {
    legalModalInstance = window.bootstrap.Modal.getOrCreateInstance(modalElement, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
  }

  // Manejo de z-index y preservación de scroll cuando se abre sobre modales padre
  modalElement.addEventListener('show.bs.modal', () => {
    modalElement.style.zIndex = '1085';
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      if (backdrops.length > 0) {
        const topBackdrop = backdrops[backdrops.length - 1];
        topBackdrop.style.zIndex = '1080';
      }
    }, 10);
  });

  modalElement.addEventListener('hidden.bs.modal', () => {
    setTimeout(() => {
      const otherModals = document.querySelectorAll('.modal.show');
      if (otherModals.length > 0) {
        document.body.classList.add('modal-open');
      }
    }, 50);
  });

  // Delegación global en document para cualquier enlace o botón con [data-legal-tab]
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-legal-tab]');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      const tab = trigger.getAttribute('data-legal-tab') || 'terminos';
      abrirModalLegal(tab);
    }
  });
}

/**
 * Abre el modal legal seleccionando la pestaña indicada
 * @param {'terminos' | 'privacidad' | 'declaracion'} tab 
 */
export function abrirModalLegal(tab = 'terminos') {
  const lang = getCurrentLang();

  if (!modalElement) {
    initLegalModal();
  } else if (currentModalLang !== lang) {
    modalElement.innerHTML = getLegalModalHtml(lang);
    currentModalLang = lang;
  }

  // Activar la pestaña solicitada
  const tabBtnId = `tab-btn-${tab}`;
  const tabBtn = document.getElementById(tabBtnId);
  if (tabBtn && window.bootstrap && window.bootstrap.Tab) {
    const tabInstance = window.bootstrap.Tab.getOrCreateInstance(tabBtn);
    tabInstance.show();
  } else if (tabBtn) {
    tabBtn.click();
  }

  // Mostrar el modal
  if (!legalModalInstance && window.bootstrap && window.bootstrap.Modal) {
    legalModalInstance = window.bootstrap.Modal.getOrCreateInstance(modalElement);
  }

  if (legalModalInstance) {
    legalModalInstance.show();
  }
}
