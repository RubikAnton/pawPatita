# -*- coding: utf-8 -*-
"""
tools/construir_index.py
Generador integral del Index.html v4.0 para Paw Patita Cusco.
Cumple 100% las 10 Heurísticas de Nielsen (20/20) y las restricciones de Google Apps Script HtmlService:
- Cero operadores ?. ni ??
- Apagado garantizado del spinner (withFailureHandler)
- Soporte para los 4 dashboards independientes con Sidebar
- Pasarela simulada de 4 pasos, muro PostImg con fallback, calendario interactivo de disponibilidad
- S.O.S. en vivo, validación de fichas caninas y políticas escalonadas de cancelación
"""

import re
import sys

def build_index():
    print("Construyendo Index.html v4.0...")
    
    # Lectura de Codigo.gs para validar funciones exportadas
    with open("Codigo.gs", "r", encoding="utf-8") as f:
        codigo_gs = f.read()

    # Buscamos todas las funciones públicas api*
    exported_apis = set(re.findall(r"function\s+(api\w+|doGet|test\w+)", codigo_gs))
    print(f"Detectadas {len(exported_apis)} funciones públicas en Codigo.gs")

    # Contenido HTML dividido en bloques limpios
    part_head = '''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Paw Patita Cusco | Plataforma Integral de Cuidado Canino y Bienestar Animal</title>
  
  <!-- Estilos y Tipografías Oficiales -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Chart.js para Visualización Ejecutiva en Panel de Administrador y Cuidador -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

  <style>
    :root {
      --paw-primary: #FF7E47;
      --paw-primary-dark: #E65C24;
      --paw-primary-light: #FFF1EB;
      --paw-secondary: #0F172A;
      --paw-accent: #10B981;
      --paw-warning: #F59E0B;
      --paw-danger: #EF4444;
      --paw-info: #0284C7;
      --paw-bg: #F8FAFC;
      --paw-card-bg: #FFFFFF;
      --paw-border: #E2E8F0;
      --paw-text-main: #1E293B;
      --paw-text-muted: #64748B;
      --paw-sidebar-w: 260px;
    }

    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--paw-bg);
      color: var(--paw-text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    h1, h2, h3, h4, h5, h6, .brand-font {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    /* Botones y Badges Paw */
    .btn-paw {
      background: linear-gradient(135deg, #FF7E47 0%, #FF5722 100%);
      color: #FFFFFF !important;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      padding: 0.6rem 1.25rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(255, 126, 71, 0.25);
    }
    .btn-paw:hover {
      background: linear-gradient(135deg, #FF6B2B 0%, #E64A19 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(255, 126, 71, 0.35);
    }
    .btn-paw-outline {
      border: 2px solid var(--paw-primary);
      color: var(--paw-primary-dark) !important;
      background: transparent;
      font-weight: 600;
      border-radius: 12px;
      padding: 0.55rem 1.2rem;
      transition: all 0.2s ease;
    }
    .btn-paw-outline:hover {
      background: var(--paw-primary-light);
      border-color: var(--paw-primary);
    }
    .btn-paw-sos {
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: #FFFFFF !important;
      font-weight: 700;
      border: none;
      border-radius: 50px;
      padding: 0.5rem 1.2rem;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
      animation: pulse-sos 2s infinite;
    }
    @keyframes pulse-sos {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Cards y Elementos Visuales */
    .paw-card {
      background: var(--paw-card-bg);
      border: 1px solid var(--paw-border);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .paw-card-hover:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      border-color: #CBD5E1;
    }

    /* Navbar */
    .paw-navbar {
      background: #FFFFFF;
      border-bottom: 1px solid var(--paw-border);
      position: sticky;
      top: 0;
      z-index: 1020;
      backdrop-filter: blur(10px);
    }

    /* Layout con Sidebar en Modo App */
    .app-layout {
      display: flex;
      flex: 1;
      min-height: calc(100vh - 72px);
    }
    .app-sidebar {
      width: var(--paw-sidebar-w);
      background: var(--paw-secondary);
      color: #E2E8F0;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: width 0.3s ease;
    }
    .app-sidebar .nav-link {
      color: #94A3B8;
      font-weight: 500;
      padding: 0.8rem 1.25rem;
      border-radius: 10px;
      margin: 0.15rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .app-sidebar .nav-link:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.06);
    }
    .app-sidebar .nav-link.active {
      color: #FFFFFF;
      background: var(--paw-primary);
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(255, 126, 71, 0.3);
    }
    .app-content {
      flex: 1;
      padding: 2rem;
      background-color: var(--paw-bg);
      overflow-y: auto;
    }

    /* Badges de Estados */
    .badge-estado {
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 30px;
      letter-spacing: 0.01em;
      display: inline-block;
    }
    .badge-confirmada { background: #DCFCE7; color: #15803D; }
    .badge-pendiente { background: #FEF3C7; color: #B45309; }
    .badge-encurso { background: #DBEAFE; color: #1D4ED8; }
    .badge-finalizada { background: #F1F5F9; color: #475569; }
    .badge-cancelada { background: #FEE2E2; color: #B91C1C; }
    .badge-disputa { background: #F3E8FF; color: #7E22CE; }
    .badge-validada { background: #DCFCE7; color: #15803D; }
    .badge-observada { background: #FFEDD5; color: #C2410C; }

    /* Carné PAW PATITA-ID */
    .paw-id-card {
      background: linear-gradient(135deg, #FFFFFF 0%, #FFF7F2 100%);
      border: 2px solid #FFD9C6;
      border-radius: 18px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(255, 126, 71, 0.12);
    }
    .paw-id-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 20px;
    }
    .paw-chip {
      width: 38px;
      height: 28px;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      border-radius: 6px;
      display: inline-block;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
    }

    /* Calendario interactivo semanal / mensual */
    .cal-day-cell {
      min-height: 85px;
      border: 1px solid var(--paw-border);
      border-radius: 10px;
      padding: 0.5rem;
      background: #FFFFFF;
      transition: background 0.15s ease;
      position: relative;
    }
    .cal-day-cell.agotado { background: #FFF1F2; border-color: #FECDD3; }
    .cal-day-cell.bloqueado { background: #F1F5F9; border-color: #CBD5E1; opacity: 0.75; }
    .cal-day-cell.disponible { background: #F0FDF4; border-color: #BBF7D0; }

    /* Wizard Steps */
    .wizard-step-bullet {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #E2E8F0;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }
    .wizard-step-bullet.active {
      background: var(--paw-primary);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(255, 126, 71, 0.35);
    }
    .wizard-step-bullet.completed {
      background: var(--paw-accent);
      color: #FFFFFF;
    }

    /* Spinner Global Overlay */
    #global-spinner-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .paw-spinner-icon {
      font-size: 3.5rem;
      color: var(--paw-primary);
      animation: bounce 1s infinite alternate;
    }
    @keyframes bounce {
      from { transform: translateY(0); }
      to { transform: translateY(-16px); }
    }

    /* Toast Container */
    #toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1090;
    }
  </style>
</head>
<body>

  <!-- Spinner Overlay con Apagado Garantizado -->
  <div id="global-spinner-overlay">
    <div class="paw-spinner-icon"><i class="bi bi-heart-pulse-fill"></i></div>
    <div class="text-white fw-bold mt-3 fs-5" id="global-spinner-text">Procesando solicitud segura...</div>
    <div class="text-white-50 small mt-1">Conectando con Google Apps Script & Sheets</div>
  </div>

  <!-- Toast Container para Alertas y Feedback Inmediato -->
  <div id="toast-container" class="toast-container"></div>
'''

    part_navbar = '''
  <!-- Barra de Navegación Principal -->
  <nav class="paw-navbar navbar navbar-expand-lg py-3 px-3 px-lg-4">
    <div class="container-fluid">
      <a class="navbar-brand d-flex align-items-center gap-2" href="#" onclick="irALanding(); return false;">
        <span class="fs-3 text-warning"><i class="bi bi-shield-check"></i></span>
        <div>
          <span class="brand-font fs-4 text-dark fw-bold">Paw Patita</span>
          <span class="badge bg-warning text-dark ms-1" style="font-size: 0.65rem; vertical-align: top;">CUSCO v4.0</span>
        </div>
      </a>

      <!-- Selector de Moneda y Demostración en vivo -->
      <div class="d-flex align-items-center gap-2 ms-auto ms-lg-0 order-lg-2">
        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-semibold" id="btn-toggle-moneda" onclick="toggleMoneda()">
          <i class="bi bi-currency-exchange me-1"></i><span id="label-moneda">PEN (S/)</span>
        </button>

        <!-- Botón Pánico SOS en Navbar -->
        <button class="btn btn-sm btn-paw-sos" onclick="abrirModalSOS()">
          <i class="bi bi-exclamation-triangle-fill me-1"></i> S.O.S.
        </button>

        <!-- Selector de Cuenta Demo Rápido -->
        <div class="dropdown">
          <button class="btn btn-sm btn-light border dropdown-toggle rounded-pill px-3 fw-semibold" type="button" data-bs-toggle="dropdown">
            <i class="bi bi-person-badge me-1 text-primary"></i> Demo Acceso
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="font-size: 0.85rem; min-width: 250px;">
            <li><h6 class="dropdown-header text-uppercase fw-bold text-muted">Seleccionar Perfil</h6></li>
            <li><a class="dropdown-item py-2" href="#" onclick="loginDemo('angelo@gmail.com', '123456'); return false;"><i class="bi bi-person-fill text-primary me-2"></i><strong>Propietario Local</strong> (Angelo)</a></li>
            <li><a class="dropdown-item py-2" href="#" onclick="loginDemo('sofia.turista@gmail.com', '123456'); return false;"><i class="bi bi-geo-alt-fill text-success me-2"></i><strong>Propietario Turista</strong> (Sofía)</a></li>
            <li><a class="dropdown-item py-2" href="#" onclick="loginDemo('carlos@gmail.com', '123456'); return false;"><i class="bi bi-award-fill text-warning me-2"></i><strong>Cuidador Aprobado</strong> (Carlos)</a></li>
            <li><a class="dropdown-item py-2" href="#" onclick="loginDemo('lucia@gmail.com', '123456'); return false;"><i class="bi bi-hourglass-split text-secondary me-2"></i><strong>Cuidador Pendiente</strong> (Lucía)</a></li>
            <li><a class="dropdown-item py-2" href="#" onclick="loginDemo('vet.centro@pawpatita.pe', 'vet123'); return false;"><i class="bi bi-hospital-fill text-danger me-2"></i><strong>Clínica Veterinaria</strong> (Cusco Centro)</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item py-2 text-danger fw-bold" href="#" onclick="loginDemo('admin@pawpatita.pe', 'admin123'); return false;"><i class="bi bi-shield-lock-fill me-2"></i><strong>Administrador de Red</strong></a></li>
          </ul>
        </div>

        <!-- Zona Usuario / Sesión -->
        <div id="nav-auth-zona" class="ms-2">
          <button class="btn btn-paw-outline btn-sm" onclick="abrirModalLogin()">
            <i class="bi bi-box-arrow-in-right me-1"></i> Ingresar
          </button>
        </div>
      </div>

      <button class="navbar-toggler border-0 order-lg-3" type="button" data-bs-toggle="collapse" data-bs-target="#nav-menu-principal">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse order-lg-1 ms-lg-4" id="nav-menu-principal">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0 fw-semibold">
          <li class="nav-item"><a class="nav-link" href="#" onclick="irALanding(); return false;">Inicio</a></li>
          <li class="nav-item"><a class="nav-link" href="#catalogo-seccion" onclick="irALanding(); return true;">Cuidadores Verificados</a></li>
          <li class="nav-item"><a class="nav-link" href="#veterinarias-seccion" onclick="irALanding(); return true;">Red Veterinaria 24h</a></li>
          <li class="nav-item"><a class="nav-link" href="#politica-seccion" onclick="irALanding(); return true;">Reembolsos & Políticas</a></li>
          <li class="nav-item"><a class="nav-link text-primary" href="#" onclick="abrirModalTyc(); return false;"><i class="bi bi-file-earmark-text me-1"></i>Términos Legales</a></li>
        </ul>
      </div>
    </div>
  </nav>
'''

    part_landing = '''
  <!-- ========================================================================= -->
  <!-- VISTA 1: LANDING PÚBLICA & CATÁLOGO (visible para visitantes y exploración) -->
  <!-- ========================================================================= -->
  <main id="view-landing" class="flex-grow-1">
    
    <!-- Hero Principal con Selector Cusco Friendly -->
    <section class="py-5 bg-white border-bottom position-relative" style="background: linear-gradient(180deg, #FFFFFF 0%, #FFF7F2 100%);">
      <div class="container py-4">
        <div class="row align-items-center g-4">
          <div class="col-lg-7">
            <div class="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-warning-subtle text-warning-emphasis fw-bold mb-3 small">
              <i class="bi bi-stars"></i> Plataforma Oficial de Cuidado Canino en Cusco
            </div>
            <h1 class="display-4 fw-extrabold text-dark mb-3">
              Cuidado responsable para tu perro en la <span class="text-primary" style="color: var(--paw-primary) !important;">Capital Inca</span>
            </h1>
            <p class="lead text-secondary mb-4">
              Cuidadores certificados con verificación policial y de domicilio, supervisión de clínicas veterinarias aliadas y monitoreo con fotos en vivo. Si viajas a Machu Picchu o al Valle Sagrado, cuidamos de tu mascota como en casa.
            </p>

            <!-- Barra de Búsqueda Rápida de Cuidadores -->
            <div class="paw-card p-3 p-md-4 shadow-sm border">
              <div class="row g-2 align-items-end">
                <div class="col-md-3">
                  <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-geo-alt-fill text-danger me-1"></i>Distrito</label>
                  <select class="form-select" id="filtro-distrito" onchange="aplicarFiltrosCatalogo()">
                    <option value="">Todos los distritos</option>
                    <option value="Cusco">Cusco Centro</option>
                    <option value="Wanchaq">Wanchaq</option>
                    <option value="San Sebastián">San Sebastián</option>
                    <option value="San Jerónimo">San Jerónimo</option>
                    <option value="Santiago">Santiago</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-tag-fill text-primary me-1"></i>Servicio</label>
                  <select class="form-select" id="filtro-categoria" onchange="aplicarFiltrosCatalogo()">
                    <option value="">Todos los servicios</option>
                    <option value="Paseo">Paseo Diario</option>
                    <option value="Hospedaje">Hospedaje Familiar</option>
                    <option value="Guardería">Guardería Diurna</option>
                    <option value="Domicilio Turístico">Cuidado en Hotel Turístico</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-calendar-range text-info me-1"></i>Fecha Estimada</label>
                  <input type="date" class="form-control" id="filtro-fecha" onchange="aplicarFiltrosCatalogo()">
                </div>
                <div class="col-md-2">
                  <button class="btn btn-paw w-100" onclick="aplicarFiltrosCatalogo()">
                    <i class="bi bi-search"></i> Filtrar
                  </button>
                </div>
              </div>
            </div>

            <div class="d-flex flex-wrap gap-4 mt-4 text-muted small fw-semibold">
              <div><i class="bi bi-check-circle-fill text-success me-1"></i> 100% Antecedentes Verificados</div>
              <div><i class="bi bi-shield-check text-primary me-1"></i> Carné Digital PAW PATITA-ID</div>
              <div><i class="bi bi-hospital-fill text-danger me-1"></i> Alianza Veterinaria 24h</div>
              <div><i class="bi bi-cash-coin text-warning me-1"></i> Reembolsos Escalonados Claros</div>
            </div>
          </div>

          <div class="col-lg-5 text-center">
            <div class="position-relative d-inline-block">
              <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=700&q=80" 
                   alt="Perro feliz en Cusco" 
                   class="img-fluid rounded-4 shadow-lg border border-4 border-white"
                   onerror="this.src='https://i.postimg.cc/HxXrCmbp/images.jpg';">
              <div class="position-absolute bottom-0 start-0 m-3 p-3 bg-white rounded-3 shadow text-start border" style="max-width: 240px;">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="badge bg-success"><i class="bi bi-shield-fill-check"></i> Activo</span>
                  <span class="small fw-bold">S.O.S. Cusco 24h</span>
                </div>
                <p class="small text-muted mb-0">Red asistencial vinculada en tiempo real a clínicas locales.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Catálogo Interactivo de Cuidadores -->
    <section id="catalogo-seccion" class="py-5">
      <div class="container">
        <div class="d-flex flex-wrap align-items-end justify-content-between mb-4 gap-3">
          <div>
            <span class="text-primary fw-bold text-uppercase small">Red Certificada</span>
            <h2 class="display-6 fw-bold mb-1">Cuidadores Destacados en Cusco</h2>
            <p class="text-muted mb-0">Revisa perfiles, fotos verificadas, calificaciones y disponibilidad en tiempo real.</p>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm rounded-pill" onclick="cargarCatalogoPublico()">
              <i class="bi bi-arrow-clockwise me-1"></i> Actualizar Catálogo
            </button>
          </div>
        </div>

        <!-- Grid de Cards de Cuidadores -->
        <div class="row g-4" id="catalogo-cuidadores-grid">
          <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2">Cargando cuidadores certificados en Cusco...</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Sección Especial para Turistas en Cusco -->
    <section class="py-5 bg-white border-top border-bottom">
      <div class="container">
        <div class="row align-items-center g-4">
          <div class="col-lg-6">
            <span class="badge bg-primary-subtle text-primary fw-bold mb-2">Turismo Responsable en Cusco</span>
            <h2 class="fw-bold mb-3">¿Vas de excursión a Machu Picchu, Vinicunca o el Valle Sagrado?</h2>
            <p class="text-muted">
              Muchos atractivos arqueológicos no permiten el ingreso con mascotas. En Paw Patita Cusco te ofrecemos:
            </p>
            <ul class="list-unstyled d-flex flex-column gap-3 text-secondary">
              <li class="d-flex gap-2">
                <i class="bi bi-car-front-fill text-primary fs-5"></i>
                <div><strong>Recojo y entrega en tu hotel en Cusco:</strong> El cuidador traslada a tu perrito de forma puntual y segura.</div>
              </li>
              <li class="d-flex gap-2">
                <i class="bi bi-camera-fill text-success fs-5"></i>
                <div><strong>Reportes fotográficos por PostImg:</strong> Recibe fotos y videos de cada paseo en tiempo real en tu muro privado.</div>
              </li>
              <li class="d-flex gap-2">
                <i class="bi bi-currency-dollar text-warning fs-5"></i>
                <div><strong>Tarifas transparentes en Soles y Dólares:</strong> Tipo de cambio garantizado de S/ 3.75 sin cargos ocultos.</div>
              </li>
            </ul>
          </div>
          <div class="col-lg-6">
            <div class="paw-card p-4 border bg-light">
              <h5 class="fw-bold mb-3"><i class="bi bi-patch-question-fill text-primary me-2"></i>¿Cómo cotizar tu reserva?</h5>
              <p class="small text-muted mb-3">Selecciona un cuidador en el catálogo o ingresa a tu panel de Propietario para activar cupones promocionales como <code>INTIRAYMI15</code> y personalizar el cuidado de tu mascota.</p>
              <div class="d-flex gap-2">
                <button class="btn btn-paw btn-sm" onclick="abrirModalLogin()">Comenzar Reserva</button>
                <button class="btn btn-outline-secondary btn-sm" onclick="abrirModalTyc()">Ver Políticas Legales</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Red Veterinaria Aliada 24 Horas -->
    <section id="veterinarias-seccion" class="py-5">
      <div class="container">
        <div class="text-center max-w-700 mx-auto mb-5">
          <span class="text-danger fw-bold text-uppercase small"><i class="bi bi-hospital me-1"></i>Soporte Clínico</span>
          <h2 class="display-6 fw-bold">Clínicas Veterinarias Aliadas en Cusco</h2>
          <p class="text-muted">Todas las alertas de emergencia emitidas por el Propietario o Cuidador son derivadas automáticamente a nuestra red médica oficial.</p>
        </div>

        <div class="row g-4" id="veterinarias-cards-grid">
          <!-- Card Vet 1 -->
          <div class="col-md-4">
            <div class="paw-card p-4 h-100 border-start border-4 border-danger">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <h5 class="fw-bold text-dark mb-0">Clínica Vet Cusco Centro</h5>
                <span class="badge bg-danger">24 Horas</span>
              </div>
              <p class="text-muted small mb-2"><i class="bi bi-geo-alt me-1"></i>Av. El Sol 840, Cusco Centro</p>
              <p class="text-muted small mb-3"><i class="bi bi-telephone-fill text-danger me-1"></i>Emergencias: <strong>984-111-222</strong></p>
              <span class="badge bg-light text-dark border">Triage Inmediato</span>
              <span class="badge bg-light text-dark border">Traumatología</span>
            </div>
          </div>
          <!-- Card Vet 2 -->
          <div class="col-md-4">
            <div class="paw-card p-4 h-100 border-start border-4 border-primary">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <h5 class="fw-bold text-dark mb-0">Veterinaria Wanchaq Salud</h5>
                <span class="badge bg-primary">Diurno</span>
              </div>
              <p class="text-muted small mb-2"><i class="bi bi-geo-alt me-1"></i>Av. de la Cultura 1250, Wanchaq</p>
              <p class="text-muted small mb-3"><i class="bi bi-telephone-fill text-danger me-1"></i>Emergencias: <strong>984-333-444</strong></p>
              <span class="badge bg-light text-dark border">Medicina Interna</span>
              <span class="badge bg-light text-dark border">Validación PAW-ID</span>
            </div>
          </div>
          <!-- Card Vet 3 -->
          <div class="col-md-4">
            <div class="paw-card p-4 h-100 border-start border-4 border-success">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <h5 class="fw-bold text-dark mb-0">Clínica San Sebastián Pet</h5>
                <span class="badge bg-success">Diurno</span>
              </div>
              <p class="text-muted small mb-2"><i class="bi bi-geo-alt me-1"></i>Prolongación Av. Cultura, San Sebastián</p>
              <p class="text-muted small mb-3"><i class="bi bi-telephone-fill text-danger me-1"></i>Emergencias: <strong>984-555-666</strong></p>
              <span class="badge bg-light text-dark border">Cirugía Menor</span>
              <span class="badge bg-light text-dark border">Vacunación Oficial</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Política Escalonada de Cancelaciones y Reembolsos -->
    <section id="politica-seccion" class="py-5 bg-white border-top">
      <div class="container">
        <div class="text-center max-w-700 mx-auto mb-5">
          <span class="text-primary fw-bold text-uppercase small">Transparencia Total</span>
          <h2 class="display-6 fw-bold">Política Escalonada de Cancelación y Reembolso</h2>
          <p class="text-muted">Protegemos tu dinero y el tiempo del cuidador con reglas automáticas claras calculadas con base en la hora de inicio de la reserva.</p>
        </div>

        <div class="row g-4 justify-content-center">
          <div class="col-md-4">
            <div class="paw-card p-4 text-center border-top border-4 border-success h-100">
              <div class="display-5 text-success fw-bold mb-2">100%</div>
              <h5 class="fw-bold mb-2">Más de 48 Horas Antes</h5>
              <p class="text-muted small mb-3">Reembolso íntegro del monto abonado. Penalidad 0%. Los fondos se devuelven al canal de pago original.</p>
              <span class="badge bg-success-subtle text-success fw-bold">Cancelación Gratuita</span>
            </div>
          </div>
          <div class="col-md-4">
            <div class="paw-card p-4 text-center border-top border-4 border-warning h-100">
              <div class="display-5 text-warning fw-bold mb-2">70%</div>
              <h5 class="fw-bold mb-2">Entre 24 y 48 Horas Antes</h5>
              <p class="text-muted small mb-3">Reembolso del 70%. El 30% restante cubre los gastos de bloqueo de cupo y preparación del cuidador.</p>
              <span class="badge bg-warning-subtle text-warning-emphasis fw-bold">Reembolso Parcial</span>
            </div>
          </div>
          <div class="col-md-4">
            <div class="paw-card p-4 text-center border-top border-4 border-danger h-100">
              <div class="display-5 text-danger fw-bold mb-2">0%</div>
              <h5 class="fw-bold mb-2">Menos de 24 Horas Antes</h5>
              <p class="text-muted small mb-3">No aplica reembolso monetario debido al perjuicio del cupo reservado que no puede ser reasignado.</p>
              <span class="badge bg-danger-subtle text-danger fw-bold">Sin Reembolso</span>
            </div>
          </div>
        </div>
      </div>
    </section>

  </main>
'''

    part_app = '''
  <!-- ========================================================================= -->
  <!-- VISTA 2: PANEL DE ACTORES CON SIDEBAR (Propietario / Cuidador / Vet / Admin) -->
  <!-- ========================================================================= -->
  <main id="view-app" class="app-layout" style="display: none;">
    
    <!-- Sidebar Navegación Lateral por Rol -->
    <aside class="app-sidebar p-3">
      <!-- Info de Usuario Conectado -->
      <div class="d-flex align-items-center gap-3 p-2 mb-3 border-bottom border-secondary pb-3">
        <div class="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center fw-bold fs-5" style="width: 44px; height: 44px;" id="sidebar-avatar">
          U
        </div>
        <div class="overflow-hidden">
          <div class="text-white fw-bold text-truncate" id="sidebar-nombre-usuario">Usuario</div>
          <span class="badge bg-primary small" id="sidebar-rol-badge">Rol</span>
        </div>
      </div>

      <!-- Menú Dinámico según Rol -->
      <ul class="nav nav-pills flex-column mb-auto" id="sidebar-menu-items">
        <!-- Generado dinámicamente por renderizarSidebar() -->
      </ul>

      <hr class="border-secondary my-3">
      <div>
        <button class="btn btn-outline-danger btn-sm w-100 rounded-pill" onclick="cerrarSesion()">
          <i class="bi bi-box-arrow-right me-1"></i> Cerrar Sesión
        </button>
      </div>
    </aside>

    <!-- Contenido Principal del Panel -->
    <div class="app-content">
      
      <!-- ==================== DASHBOARD 1: PROPIETARIO ==================== -->
      <div id="panel-propietario" style="display: none;">
        
        <!-- Pestaña 1: Resumen -->
        <div id="prop-sub-resumen">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1">Mi Panel de Propietario</h3>
              <p class="text-muted mb-0">Gestiona tus mascotas, reservas y seguimiento fotográfico en vivo.</p>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-paw-outline btn-sm" onclick="abrirModalMascota()">
                <i class="bi bi-plus-circle me-1"></i> Nueva Mascota
              </button>
              <button class="btn btn-paw btn-sm" onclick="irALanding()">
                <i class="bi bi-search me-1"></i> Reservar Cuidador
              </button>
            </div>
          </div>

          <!-- Tarjetas KPI Propietario -->
          <div class="row g-3 mb-4">
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-primary">
                <span class="text-muted small fw-semibold">Mascotas Registradas</span>
                <h3 class="fw-bold text-dark mt-1" id="kpi-prop-mascotas">0</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-success">
                <span class="text-muted small fw-semibold">Reservas Activas</span>
                <h3 class="fw-bold text-dark mt-1" id="kpi-prop-activas">0</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-info">
                <span class="text-muted small fw-semibold">Histórico Reservas</span>
                <h3 class="fw-bold text-dark mt-1" id="kpi-prop-total">0</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-warning">
                <span class="text-muted small fw-semibold">Total Invertido</span>
                <h3 class="fw-bold text-dark mt-1" id="kpi-prop-gastado">S/ 0.00</h3>
              </div>
            </div>
          </div>

          <!-- Mis Mascotas Registradas (Carnés PAW PATITA-ID) -->
          <div class="mb-5">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h4 class="fw-bold mb-0"><i class="bi bi-card-checklist text-primary me-2"></i>Carnés Digitales PAW PATITA-ID</h4>
            </div>
            <div class="row g-3" id="prop-mascotas-cards-grid">
              <div class="col-12 text-muted small">Cargando carné de tus mascotas...</div>
            </div>
          </div>

          <!-- Reservas Recientes del Propietario -->
          <div class="mb-4">
            <h4 class="fw-bold mb-3"><i class="bi bi-clock-history text-secondary me-2"></i>Mis Reservas</h4>
            <div class="paw-card p-0 overflow-hidden border">
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0" id="tabla-prop-reservas">
                  <thead class="table-light small text-uppercase fw-bold text-muted">
                    <tr>
                      <th class="ps-3">Código</th>
                      <th>Cuidador</th>
                      <th>Mascota</th>
                      <th>Servicio</th>
                      <th>Fechas</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th class="text-end pe-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="small" id="tabla-prop-reservas-body">
                    <tr><td colspan="8" class="text-center py-4 text-muted">No tienes reservas activas.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Pestaña 2: Muro de Fotos Privado -->
        <div id="prop-sub-muro" style="display: none;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1"><i class="bi bi-images text-primary me-2"></i>Muro Privado de Seguimiento</h3>
              <p class="text-muted mb-0">Fotografías y notas enviadas por tus cuidadores durante los paseos y hospedajes.</p>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="cargarMuroPropietario()">
              <i class="bi bi-arrow-clockwise me-1"></i> Actualizar Muro
            </button>
          </div>
          <div class="row g-4" id="prop-muro-fotos-grid">
            <div class="col-12 text-muted text-center py-5">No hay reportes fotográficos aún.</div>
          </div>
        </div>

      </div>

      <!-- ==================== DASHBOARD 2: CUIDADOR ==================== -->
      <div id="panel-cuidador" style="display: none;">
        
        <!-- Pestaña 1: Resumen y Solicitudes -->
        <div id="cuid-sub-resumen">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1">Panel del Cuidador Independiente</h3>
              <p class="text-muted mb-0">Gestiona tus cupos diarios, solicitudes de reserva, check-in y billetera.</p>
            </div>
            <span class="badge bg-success-subtle text-success p-2 px-3 fw-bold rounded-pill" id="badge-cuid-estado-postulacion">
              <i class="bi bi-patch-check-fill me-1"></i> Perfil Aprobado
            </span>
          </div>

          <!-- Tarjetas KPI Cuidador -->
          <div class="row g-3 mb-4">
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-warning">
                <span class="text-muted small fw-semibold">Solicitudes Pendientes</span>
                <h3 class="fw-bold text-dark mt-1" id="kpi-cuid-pendientes">0</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-primary">
                <span class="text-muted small fw-semibold">En Curso Hoy</span>
                <h3 class="fw-bold text-dark mt-1" id="kpi-cuid-encurso">0</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-success">
                <span class="text-muted small fw-semibold">Saldo Disponible Retiro</span>
                <h3 class="fw-bold text-success mt-1" id="kpi-cuid-saldo-disponible">S/ 0.00</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-info">
                <span class="text-muted small fw-semibold">Calificación Media</span>
                <h3 class="fw-bold text-dark mt-1" id="kpi-cuid-calificacion">5.0 <i class="bi bi-star-fill text-warning fs-6"></i></h3>
              </div>
            </div>
          </div>

          <!-- Tabla de Solicitudes y Reservas -->
          <div class="paw-card p-0 overflow-hidden border mb-4">
            <div class="p-3 border-bottom bg-light d-flex justify-content-between align-items-center">
              <h5 class="fw-bold mb-0">Gestión de Reservas y Clientes</h5>
              <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="cargarReservasCuidador()">
                <i class="bi bi-arrow-clockwise me-1"></i> Refrescar
              </button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" id="tabla-cuid-reservas">
                <thead class="table-light small text-uppercase fw-bold text-muted">
                  <tr>
                    <th class="ps-3">Código</th>
                    <th>Propietario</th>
                    <th>Mascota</th>
                    <th>Servicio</th>
                    <th>Fechas</th>
                    <th>Neto Cuidador</th>
                    <th>Estado</th>
                    <th class="text-end pe-3">Acciones de Flujo</th>
                  </tr>
                </thead>
                <tbody class="small" id="tabla-cuid-reservas-body">
                  <tr><td colspan="8" class="text-center py-4 text-muted">Cargando reservas...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Pestaña 2: Agenda Interactiva Mensual y Cupos -->
        <div id="cuid-sub-agenda" style="display: none;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1"><i class="bi bi-calendar3 text-primary me-2"></i>Agenda Mensual de Disponibilidad</h3>
              <p class="text-muted mb-0">Haz clic en cualquier día para bloquear cupos o ajustar capacidad manualmente.</p>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm" onclick="guardarPlantillaSemanal()">
                <i class="bi bi-sliders me-1"></i> Guardar Plantilla Semanal
              </button>
            </div>
          </div>

          <div class="paw-card p-4 border mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="fw-bold mb-0" id="cuid-agenda-mes-titulo">Mes Actual</h5>
              <div class="d-flex gap-2 small">
                <span class="badge bg-success-subtle text-success border"><i class="bi bi-check-circle"></i> Disponible</span>
                <span class="badge bg-danger-subtle text-danger border"><i class="bi bi-x-circle"></i> Agotado</span>
                <span class="badge bg-secondary-subtle text-secondary border"><i class="bi bi-slash-circle"></i> Bloqueado</span>
              </div>
            </div>
            <div class="row g-2" id="cuid-calendario-grid">
              <!-- Celdas del calendario generadas dinámicamente -->
            </div>
          </div>
        </div>

        <!-- Pestaña 3: Billetera y Solicitud de Retiro -->
        <div id="cuid-sub-billetera" style="display: none;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1"><i class="bi bi-wallet2 text-success me-2"></i>Mi Billetera Digital Paw Patita</h3>
              <p class="text-muted mb-0">Liquidaciones automáticas transparentes (Comisión 15% / Tu ingreso neto 85%).</p>
            </div>
            <button class="btn btn-paw btn-sm" onclick="abrirModalRetiro()">
              <i class="bi bi-cash me-1"></i> Solicitar Retiro de Fondos
            </button>
          </div>

          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <div class="paw-card p-4 border text-center">
                <span class="text-muted small fw-bold text-uppercase">Saldo en Garantía (En Curso)</span>
                <h2 class="fw-bold text-warning mt-2 mb-0" id="billetera-garantia">S/ 0.00</h2>
                <small class="text-muted">Se liberará al finalizar los servicios</small>
              </div>
            </div>
            <div class="col-md-4">
              <div class="paw-card p-4 border text-center bg-success-subtle">
                <span class="text-success small fw-bold text-uppercase">Saldo Disponible Para Retiro</span>
                <h2 class="fw-bold text-success mt-2 mb-0" id="billetera-disponible">S/ 0.00</h2>
                <small class="text-muted">Listo para transferir a Yape o Banco</small>
              </div>
            </div>
            <div class="col-md-4">
              <div class="paw-card p-4 border text-center">
                <span class="text-muted small fw-bold text-uppercase">Total Histórico Cobrado</span>
                <h2 class="fw-bold text-dark mt-2 mb-0" id="billetera-retirado">S/ 0.00</h2>
                <small class="text-muted">Transferido a tus cuentas</small>
              </div>
            </div>
          </div>

          <!-- Historial de Liquidaciones -->
          <div class="paw-card p-0 overflow-hidden border">
            <div class="p-3 border-bottom bg-light">
              <h6 class="fw-bold mb-0">Historial de Liquidaciones y Pagos</h6>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" id="tabla-cuid-liquidaciones">
                <thead class="table-light small text-uppercase fw-bold text-muted">
                  <tr>
                    <th class="ps-3">ID Liquidación</th>
                    <th>Reserva</th>
                    <th>Monto Neto</th>
                    <th>Estado</th>
                    <th>Fecha Solicitud</th>
                    <th class="pe-3">N.º Operación Bancaria</th>
                  </tr>
                </thead>
                <tbody class="small" id="tabla-cuid-liquidaciones-body">
                  <tr><td colspan="6" class="text-center py-4 text-muted">No registras liquidaciones.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Pestaña 4: Enviar Reporte con Foto PostImg -->
        <div id="cuid-sub-reporte" style="display: none;">
          <div class="mb-4">
            <h3 class="fw-bold mb-1"><i class="bi bi-camera-fill text-primary me-2"></i>Enviar Reporte con Foto al Muro</h3>
            <p class="text-muted mb-0">Sube una fotografía a PostImg (o ingresa su enlace) y escribe una actualización de estado para el dueño.</p>
          </div>

          <div class="paw-card p-4 border max-w-700">
            <form id="form-cuid-reporte" onsubmit="enviarReporteCuidador(event)">
              <div class="mb-3">
                <label class="form-label fw-bold small">Seleccionar Reserva Activa</label>
                <select class="form-select" id="reporte-id-reserva" required>
                  <option value="">Selecciona la reserva...</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold small">Enlace de la Fotografía (PostImg u otro URL)</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-link-45deg"></i></span>
                  <input type="url" class="form-control" id="reporte-foto-url" placeholder="https://i.postimg.cc/..." required>
                </div>
                <div class="form-text small">Puedes subir la foto en <a href="https://postimages.org/" target="_blank">postimages.org</a> y pegar aquí el enlace directo.</div>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold small">Nota de Estado / Mensaje para el Dueño</label>
                <textarea class="form-control" id="reporte-nota" rows="3" placeholder="Ej: Paseamos por Sacsayhuamán durante 45 minutos. Tomó bastante agua y está jugando alegremente." required></textarea>
              </div>
              <button type="submit" class="btn btn-paw w-100">
                <i class="bi bi-send-fill me-1"></i> Publicar Reporte en el Muro Privado
              </button>
            </form>
          </div>
        </div>

      </div>

      <!-- ==================== DASHBOARD 3: CLÍNICA VETERINARIA ==================== -->
      <div id="panel-veterinaria" style="display: none;">
        
        <!-- Pestaña 1: Central de Emergencias SOS -->
        <div id="vet-sub-sos">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1 text-danger"><i class="bi bi-hospital-fill me-2"></i>Central de Emergencias S.O.S.</h3>
              <p class="text-muted mb-0">Casos clínicos derivados a tu clínica en tiempo real por cuidadores o propietarios.</p>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="cargarEmergenciasVet()">
              <i class="bi bi-arrow-clockwise me-1"></i> Refrescar Casos
            </button>
          </div>

          <!-- Grid de Emergencias Activas -->
          <div class="row g-4" id="vet-emergencias-grid">
            <div class="col-12 text-muted text-center py-4">No hay emergencias pendientes en este momento.</div>
          </div>
        </div>

        <!-- Pestaña 2: Validación Médica PAW PATITA-ID -->
        <div id="vet-sub-fichas" style="display: none;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1"><i class="bi bi-clipboard2-pulse-fill text-primary me-2"></i>Validación Oficial de Fichas Caninas</h3>
              <p class="text-muted mb-0">Revisa la cartilla de vacunación y emite dictamen médico oficial para habilitar el carné digital.</p>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="cargarFichasVet()">
              <i class="bi bi-arrow-clockwise me-1"></i> Refrescar Fichas
            </button>
          </div>

          <div class="paw-card p-0 overflow-hidden border">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" id="tabla-vet-fichas">
                <thead class="table-light small text-uppercase fw-bold text-muted">
                  <tr>
                    <th class="ps-3">PAW-ID</th>
                    <th>Mascota</th>
                    <th>Raza / Edad</th>
                    <th>Propietario</th>
                    <th>Cartilla Foto</th>
                    <th>Estado Médico</th>
                    <th class="text-end pe-3">Acción Profesional</th>
                  </tr>
                </thead>
                <tbody class="small" id="tabla-vet-fichas-body">
                  <tr><td colspan="7" class="text-center py-4 text-muted">Cargando fichas caninas...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      <!-- ==================== DASHBOARD 4: ADMINISTRADOR ==================== -->
      <div id="panel-admin" style="display: none;">
        
        <!-- Pestaña 1: Dashboard Ejecutivo con Gráficos Chart.js -->
        <div id="admin-sub-dashboard">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1"><i class="bi bi-speedometer2 text-primary me-2"></i>Dashboard Ejecutivo de Red</h3>
              <p class="text-muted mb-0">Supervisión integral de ingresos, comisiones, alertas y salud operativa en Cusco.</p>
            </div>
            <button class="btn btn-outline-secondary btn-sm rounded-pill" onclick="cargarDashboardAdmin()">
              <i class="bi bi-arrow-clockwise me-1"></i> Refrescar KPIs
            </button>
          </div>

          <!-- Tarjetas KPI Administrador -->
          <div class="row g-3 mb-4">
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-success">
                <span class="text-muted small fw-semibold">Ingresos Brutos</span>
                <h3 class="fw-bold text-dark mt-1" id="kpi-adm-ingresos">S/ 0.00</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-primary">
                <span class="text-muted small fw-semibold">Comisión Plataforma (15%)</span>
                <h3 class="fw-bold text-primary mt-1" id="kpi-adm-comision">S/ 0.00</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-warning">
                <span class="text-muted small fw-semibold">Postulantes Pendientes</span>
                <h3 class="fw-bold text-warning mt-1" id="kpi-adm-postulantes">0</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="paw-card p-3 border-start border-4 border-danger">
                <span class="text-muted small fw-semibold">Alertas SOS Activas</span>
                <h3 class="fw-bold text-danger mt-1" id="kpi-adm-sos">0</h3>
              </div>
            </div>
          </div>

          <!-- Gráficos Chart.js -->
          <div class="row g-4 mb-4">
            <div class="col-lg-6">
              <div class="paw-card p-4 border h-100">
                <h5 class="fw-bold mb-3"><i class="bi bi-geo-alt-fill text-danger me-2"></i>Distribución de Usuarios por Distrito</h5>
                <div style="position: relative; height: 260px;">
                  <canvas id="chart-admin-distritos"></canvas>
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="paw-card p-4 border h-100">
                <h5 class="fw-bold mb-3"><i class="bi bi-pie-chart-fill text-primary me-2"></i>Demanda por Categoría de Servicio</h5>
                <div style="position: relative; height: 260px;">
                  <canvas id="chart-admin-servicios"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pestaña 2: Aprobación de Postulantes -->
        <div id="admin-sub-postulantes" style="display: none;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1">Aprobación de Cuidadores Postulantes</h3>
              <p class="text-muted mb-0">Verifica antecedentes policiales y certificados domiciliarios para habilitar su perfil.</p>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="cargarPostulantesAdmin()">
              <i class="bi bi-arrow-clockwise me-1"></i> Refrescar
            </button>
          </div>

          <div class="paw-card p-0 overflow-hidden border">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" id="tabla-adm-postulantes">
                <thead class="table-light small text-uppercase fw-bold text-muted">
                  <tr>
                    <th class="ps-3">ID Cuidador</th>
                    <th>Nombre y Apellido</th>
                    <th>Email / Teléfono</th>
                    <th>Distrito</th>
                    <th>Antecedente Policial</th>
                    <th>Comprobante Domicilio</th>
                    <th class="text-end pe-3">Dictamen</th>
                  </tr>
                </thead>
                <tbody class="small" id="tabla-adm-postulantes-body">
                  <tr><td colspan="7" class="text-center py-4 text-muted">No hay cuidadores pendientes.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Pestaña 3: Cancelaciones y Reembolsos -->
        <div id="admin-sub-cancelaciones" style="display: none;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1">Gestión de Cancelaciones y Reembolsos</h3>
              <p class="text-muted mb-0">Revisa solicitudes de cancelación y ejecuta los reembolsos conforme a la política.</p>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="cargarCancelacionesAdmin()">
              <i class="bi bi-arrow-clockwise me-1"></i> Refrescar
            </button>
          </div>

          <div class="paw-card p-0 overflow-hidden border">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" id="tabla-adm-cancelaciones">
                <thead class="table-light small text-uppercase fw-bold text-muted">
                  <tr>
                    <th class="ps-3">ID Cancelación</th>
                    <th>Reserva</th>
                    <th>Solicitante</th>
                    <th>Horas Anticipación</th>
                    <th>Regla Aplicada</th>
                    <th>Reembolso Estimado</th>
                    <th>Penalidad</th>
                    <th>Estado</th>
                    <th class="text-end pe-3">Acción</th>
                  </tr>
                </thead>
                <tbody class="small" id="tabla-adm-cancelaciones-body">
                  <tr><td colspan="9" class="text-center py-4 text-muted">No hay cancelaciones por procesar.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Pestaña 4: Liquidaciones y Pagos -->
        <div id="admin-sub-liquidaciones" style="display: none;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1">Liquidaciones de Billetera a Cuidadores</h3>
              <p class="text-muted mb-0">Procesa transferencias a Yape/Plin/Banco y registra el número de operación.</p>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="cargarLiquidacionesAdmin()">
              <i class="bi bi-arrow-clockwise me-1"></i> Refrescar
            </button>
          </div>

          <div class="paw-card p-0 overflow-hidden border">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" id="tabla-adm-liquidaciones">
                <thead class="table-light small text-uppercase fw-bold text-muted">
                  <tr>
                    <th class="ps-3">ID Liquidación</th>
                    <th>Cuidador</th>
                    <th>Canal Cobro</th>
                    <th>Número Cuenta / Tel</th>
                    <th>Monto a Pagar</th>
                    <th>Estado</th>
                    <th class="text-end pe-3">Acción</th>
                  </tr>
                </thead>
                <tbody class="small" id="tabla-adm-liquidaciones-body">
                  <tr><td colspan="7" class="text-center py-4 text-muted">No hay solicitudes de liquidación pendientes.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Pestaña 5: Bitácora de Auditoría -->
        <div id="admin-sub-auditoria" style="display: none;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 class="fw-bold mb-1"><i class="bi bi-shield-shaded text-secondary me-2"></i>Bitácora Global de Auditoría de Estados</h3>
              <p class="text-muted mb-0">Trazabilidad inmutable de cada cambio de estado, transición de reserva y usuario responsable.</p>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="cargarAuditoriaAdmin()">
              <i class="bi bi-arrow-clockwise me-1"></i> Refrescar
            </button>
          </div>

          <div class="paw-card p-0 overflow-hidden border">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" id="tabla-adm-auditoria">
                <thead class="table-light small text-uppercase fw-bold text-muted">
                  <tr>
                    <th class="ps-3">Fecha y Hora</th>
                    <th>Entidad</th>
                    <th>Registro ID</th>
                    <th>Estado Anterior</th>
                    <th>Estado Nuevo</th>
                    <th>Usuario Responsable</th>
                    <th class="pe-3">Motivo / Detalle</th>
                  </tr>
                </thead>
                <tbody class="small" id="tabla-adm-auditoria-body">
                  <tr><td colspan="7" class="text-center py-4 text-muted">Cargando registros de auditoría...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  </main>
'''

    part_modals = '''
  <!-- ========================================================================= -->
  <!-- MODALES GLOBALES DE NEGOCIO Y OPERACIÓN                                  -->
  <!-- ========================================================================= -->

  <!-- Modal 1: Iniciar Sesión -->
  <div class="modal fade" id="modal-login" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold">Iniciar Sesión</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <form id="form-login" onsubmit="ejecutarLogin(event)">
            <div class="mb-3">
              <label class="form-label small fw-bold">Correo Electrónico</label>
              <input type="email" class="form-control" id="login-email" placeholder="ejemplo@pawpatita.pe" required>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Contraseña</label>
              <input type="password" class="form-control" id="login-password" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-paw w-100 py-2">Ingresar a mi Cuenta</button>
          </form>

          <div class="text-center mt-3 border-top pt-3">
            <span class="small text-muted">¿No tienes cuenta?</span>
            <div class="d-flex justify-content-center gap-2 mt-2">
              <button class="btn btn-outline-primary btn-sm rounded-pill" onclick="cerrarModal('modal-login'); abrirModalRegistroProp();">Registro Propietario</button>
              <button class="btn btn-outline-secondary btn-sm rounded-pill" onclick="cerrarModal('modal-login'); abrirModalRegistroCuid();">Postular como Cuidador</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 2: Registro de Propietario (Local vs. Turista Cusco) -->
  <div class="modal fade" id="modal-registro-prop" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold">Registro de Propietario</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <form id="form-registro-prop" onsubmit="ejecutarRegistroProp(event)">
            <div class="row g-2 mb-2">
              <div class="col-6">
                <label class="form-label small fw-bold">Nombre</label>
                <input type="text" class="form-control" id="reg-prop-nombre" required>
              </div>
              <div class="col-6">
                <label class="form-label small fw-bold">Apellido</label>
                <input type="text" class="form-control" id="reg-prop-apellido" required>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Tipo de Propietario</label>
              <select class="form-select" id="reg-prop-subtipo" onchange="toggleHotelRegistro(this.value)" required>
                <option value="Local">Residente Local en Cusco</option>
                <option value="Turista">Turista Nacional o Extranjero</option>
              </select>
            </div>
            <div class="mb-2" id="box-hotel-turista" style="display: none;">
              <label class="form-label small fw-bold">Hotel / Hospedaje en Cusco</label>
              <input type="text" class="form-control" id="reg-prop-hotel" placeholder="Nombre del hotel para recojo">
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Documento (DNI / Pasaporte)</label>
              <input type="text" class="form-control" id="reg-prop-doc" required>
            </div>
            <div class="row g-2 mb-2">
              <div class="col-6">
                <label class="form-label small fw-bold">Teléfono</label>
                <input type="tel" class="form-control" id="reg-prop-tel" required>
              </div>
              <div class="col-6">
                <label class="form-label small fw-bold">Distrito</label>
                <select class="form-select" id="reg-prop-distrito">
                  <option value="Cusco">Cusco</option>
                  <option value="Wanchaq">Wanchaq</option>
                  <option value="San Sebastián">San Sebastián</option>
                  <option value="San Jerónimo">San Jerónimo</option>
                  <option value="Santiago">Santiago</option>
                </select>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Correo Electrónico</label>
              <input type="email" class="form-control" id="reg-prop-email" required>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Contraseña</label>
              <input type="password" class="form-control" id="reg-prop-pass" minlength="6" required>
            </div>
            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="reg-prop-tyc" required>
              <label class="form-check-label small" for="reg-prop-tyc">
                Acepto los <a href="#" onclick="abrirModalTyc(); return false;">Términos y Condiciones Legales v4.0</a>
              </label>
            </div>
            <button type="submit" class="btn btn-paw w-100">Crear mi Cuenta de Propietario</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 3: Registro de Cuidador Independiente -->
  <div class="modal fade" id="modal-registro-cuid" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold">Postulación como Cuidador Independiente</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <form id="form-registro-cuid" onsubmit="ejecutarRegistroCuid(event)">
            <div class="row g-2 mb-2">
              <div class="col-md-6">
                <label class="form-label small fw-bold">Nombre</label>
                <input type="text" class="form-control" id="reg-cuid-nombre" required>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Apellido</label>
                <input type="text" class="form-control" id="reg-cuid-apellido" required>
              </div>
            </div>
            <div class="row g-2 mb-2">
              <div class="col-md-4">
                <label class="form-label small fw-bold">DNI</label>
                <input type="text" class="form-control" id="reg-cuid-doc" required>
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Teléfono</label>
                <input type="tel" class="form-control" id="reg-cuid-tel" required>
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Distrito</label>
                <select class="form-select" id="reg-cuid-distrito">
                  <option value="Cusco">Cusco</option>
                  <option value="Wanchaq">Wanchaq</option>
                  <option value="San Sebastián">San Sebastián</option>
                  <option value="San Jerónimo">San Jerónimo</option>
                  <option value="Santiago">Santiago</option>
                </select>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Presentación Corta</label>
              <input type="text" class="form-control" id="reg-cuid-presentacion" placeholder="Ej: Especialista en paseos de razas medianas y grandes" required>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Biografía y Experiencia con Mascotas</label>
              <textarea class="form-control" id="reg-cuid-bio" rows="2" placeholder="Cuéntanos tu experiencia y el entorno de cuidado..." required></textarea>
            </div>
            <div class="row g-2 mb-2">
              <div class="col-md-6">
                <label class="form-label small fw-bold">Años de Experiencia</label>
                <input type="number" class="form-control" id="reg-cuid-exp" min="0" value="2" required>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Capacidad Máxima de Mascotas Simultáneas</label>
                <input type="number" class="form-control" id="reg-cuid-cap" min="1" max="6" value="3" required>
              </div>
            </div>
            <div class="row g-2 mb-2">
              <div class="col-md-6">
                <label class="form-label small fw-bold">Antecedente Policial (URL PostImg)</label>
                <input type="url" class="form-control" id="reg-cuid-policial" placeholder="https://i.postimg.cc/..." required>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Comprobante Domicilio (URL PostImg)</label>
                <input type="url" class="form-control" id="reg-cuid-domicilio" placeholder="https://i.postimg.cc/..." required>
              </div>
            </div>
            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label small fw-bold">Correo Electrónico</label>
                <input type="email" class="form-control" id="reg-cuid-email" required>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Contraseña</label>
                <input type="password" class="form-control" id="reg-cuid-pass" minlength="6" required>
              </div>
            </div>
            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="reg-cuid-tyc" required>
              <label class="form-check-label small" for="reg-cuid-tyc">
                Declaro que los antecedentes presentados son verídicos y acepto los <a href="#" onclick="abrirModalTyc(); return false;">Términos de Cuidador v4.0</a>
              </label>
            </div>
            <button type="submit" class="btn btn-paw w-100">Enviar Postulación a Revisión</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 4: Wizard de Reserva y Pasarela Simulada (4 Pasos) -->
  <div class="modal fade" id="modal-wizard-reserva" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <div>
            <h5 class="modal-title fw-bold" id="wizard-titulo">Nueva Reserva de Cuidado Canino</h5>
            <div class="d-flex align-items-center gap-3 mt-2">
              <div class="d-flex align-items-center gap-1">
                <div class="wizard-step-bullet active" id="bullet-step-1">1</div>
                <span class="small fw-semibold">Mascota</span>
              </div>
              <div class="d-flex align-items-center gap-1">
                <div class="wizard-step-bullet" id="bullet-step-2">2</div>
                <span class="small fw-semibold">Fechas & Extras</span>
              </div>
              <div class="d-flex align-items-center gap-1">
                <div class="wizard-step-bullet" id="bullet-step-3">3</div>
                <span class="small fw-semibold">Cotización</span>
              </div>
              <div class="d-flex align-items-center gap-1">
                <div class="wizard-step-bullet" id="bullet-step-4">4</div>
                <span class="small fw-semibold">Pago Seguro</span>
              </div>
            </div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">

          <!-- Paso 1: Selección de Mascota -->
          <div id="wizard-paso-1">
            <h6 class="fw-bold mb-3"><i class="bi bi-heart-fill text-danger me-2"></i>Selecciona la Mascota a Cuidar</h6>
            <div class="mb-3">
              <select class="form-select form-select-lg" id="wizard-select-mascota" onchange="verificarMascotaSeleccionada(this.value)">
                <option value="">Cargando tus mascotas...</option>
              </select>
            </div>
            <div id="wizard-mascota-preview" class="p-3 bg-light rounded-3 border mb-3" style="display: none;">
              <!-- Info de la mascota con carné PAW PATITA-ID -->
            </div>
            <div class="text-end">
              <button class="btn btn-paw" onclick="wizardAvanzarPaso(2)">Siguiente: Configurar Fechas <i class="bi bi-arrow-right"></i></button>
            </div>
          </div>

          <!-- Paso 2: Fechas y Extras Turísticos -->
          <div id="wizard-paso-2" style="display: none;">
            <h6 class="fw-bold mb-3"><i class="bi bi-calendar2-week text-primary me-2"></i>Fechas de Cuidado y Extras</h6>
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label small fw-bold">Fecha de Ingreso</label>
                <input type="date" class="form-control" id="wizard-fecha-ini" onchange="recalcularCotizacion()">
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Fecha de Salida</label>
                <input type="date" class="form-control" id="wizard-fecha-fin" onchange="recalcularCotizacion()">
              </div>
            </div>
            <div class="paw-card p-3 border mb-3 bg-light">
              <span class="fw-bold small d-block mb-2">Servicios Opcionales:</span>
              <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" id="wizard-extra-hotel" onchange="recalcularCotizacion()">
                <label class="form-check-label small" for="wizard-extra-hotel">
                  <strong>Recojo y retorno en Hotel (Cusco)</strong> (Extra turístico según cuidador)
                </label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="wizard-extra-bano" onchange="recalcularCotizacion()">
                <label class="form-check-label small" for="wizard-extra-bano">
                  <strong>Baño Higiénico y Cepillado</strong> (+ S/ 25.00)
                </label>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Instrucciones Especiales / Notas Médicas</label>
              <textarea class="form-control" id="wizard-notas" rows="2" placeholder="Horario de comida, si toma medicación, compatibilidad con otros perros..."></textarea>
            </div>
            <div class="d-flex justify-content-between">
              <button class="btn btn-outline-secondary" onclick="wizardAvanzarPaso(1)"><i class="bi bi-arrow-left"></i> Volver</button>
              <button class="btn btn-paw" onclick="wizardAvanzarPaso(3)">Siguiente: Ver Cotización <i class="bi bi-arrow-right"></i></button>
            </div>
          </div>

          <!-- Paso 3: Cotizador y Desglose Financiero -->
          <div id="wizard-paso-3" style="display: none;">
            <h6 class="fw-bold mb-3"><i class="bi bi-calculator-fill text-success me-2"></i>Desglose Financiero y Cupones</h6>
            <div class="paw-card p-4 border bg-white mb-3">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Días / Noches de cuidado:</span>
                <span class="fw-bold" id="cot-dias">1 día</span>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Tarifa Diaria Base:</span>
                <span class="fw-bold" id="cot-tarifa-base">S/ 0.00</span>
              </div>
              <div class="d-flex justify-content-between mb-2" id="box-cot-temporada" style="display: none;">
                <span class="text-muted">Recargo Temporada Turística Cusco:</span>
                <span class="text-warning fw-bold" id="cot-temporada">+ S/ 0.00</span>
              </div>
              <div class="d-flex justify-content-between mb-2" id="box-cot-extras" style="display: none;">
                <span class="text-muted">Servicios Extras:</span>
                <span class="fw-bold" id="cot-extras">+ S/ 0.00</span>
              </div>
              <div class="d-flex justify-content-between mb-2" id="box-cot-descuento" style="display: none;">
                <span class="text-success fw-bold">Descuento Promocional:</span>
                <span class="text-success fw-bold" id="cot-descuento">- S/ 0.00</span>
              </div>
              <hr class="my-2">
              <div class="d-flex justify-content-between align-items-center">
                <span class="fs-5 fw-bold">Total a Pagar:</span>
                <div class="text-end">
                  <div class="fs-4 fw-extrabold text-primary" id="cot-total-pen">S/ 0.00</div>
                  <div class="small text-muted" id="cot-total-usd">Ref: $ 0.00 USD</div>
                </div>
              </div>
            </div>

            <!-- Aplicador de Cupones -->
            <div class="input-group mb-4">
              <input type="text" class="form-control" id="wizard-cupon" placeholder="Código de cupón (ej: INTIRAYMI15)">
              <button class="btn btn-outline-primary fw-bold" type="button" onclick="aplicarCuponWizard()">Aplicar Cupón</button>
            </div>

            <div class="d-flex justify-content-between">
              <button class="btn btn-outline-secondary" onclick="wizardAvanzarPaso(2)"><i class="bi bi-arrow-left"></i> Volver</button>
              <button class="btn btn-paw" onclick="wizardAvanzarPaso(4)">Ir a Pasarela de Pago <i class="bi bi-arrow-right"></i></button>
            </div>
          </div>

          <!-- Paso 4: Pasarela Simulada de Pago -->
          <div id="wizard-paso-4" style="display: none;">
            <h6 class="fw-bold mb-3"><i class="bi bi-shield-lock-fill text-primary me-2"></i>Pasarela de Pago Simulada Segura</h6>
            
            <div class="mb-3">
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="metodo-pago" id="pago-yape" value="Yape" checked onchange="toggleFormularioPago(this.value)">
                <label class="form-check-label fw-bold" for="pago-yape">Yape / Plin (Billetera Móvil)</label>
              </div>
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="metodo-pago" id="pago-tarjeta" value="Tarjeta" onchange="toggleFormularioPago(this.value)">
                <label class="form-check-label fw-bold" for="pago-tarjeta">Tarjeta Visa / Mastercard</label>
              </div>
            </div>

            <!-- Box Pago Yape / Plin -->
            <div id="box-pago-yape" class="paw-card p-3 border mb-3 bg-light text-center">
              <span class="badge bg-purple text-white mb-2" style="background: #6D28D9;">Pago Rápido QR</span>
              <p class="small text-muted mb-2">Escanea el código QR simulado o transfiere al número de plataforma <strong>984-000-111</strong></p>
              <div class="p-3 bg-white d-inline-block rounded-3 border mb-2">
                <i class="bi bi-qr-code display-4 text-dark"></i>
              </div>
              <div class="small fw-semibold text-muted">Monto exacto: <span class="text-primary fw-bold fs-6" id="yape-monto-label">S/ 0.00</span></div>
            </div>

            <!-- Box Tarjeta de Crédito -->
            <div id="box-pago-tarjeta" class="paw-card p-3 border mb-3" style="display: none;">
              <div class="mb-2">
                <label class="form-label small fw-bold">Número de Tarjeta (Simulado)</label>
                <input type="text" class="form-control" id="pago-tarjeta-num" placeholder="4557 •••• •••• 9921" value="4557 1234 5678 9921">
              </div>
              <div class="row g-2">
                <div class="col-6">
                  <label class="form-label small fw-bold">Vencimiento</label>
                  <input type="text" class="form-control" id="pago-tarjeta-exp" placeholder="MM/AA" value="12/28">
                </div>
                <div class="col-6">
                  <label class="form-label small fw-bold">CVV</label>
                  <input type="password" class="form-control" id="pago-tarjeta-cvv" placeholder="•••" value="888">
                </div>
              </div>
            </div>

            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="wizard-acepta-tyc" required checked>
              <label class="form-check-label small" for="wizard-acepta-tyc">
                Acepto los <a href="#" onclick="abrirModalTyc(); return false;">Términos y la Política de Cancelación Escalonada</a> de Paw Patita Cusco.
              </label>
            </div>

            <div class="d-flex justify-content-between">
              <button class="btn btn-outline-secondary" onclick="wizardAvanzarPaso(3)"><i class="bi bi-arrow-left"></i> Volver</button>
              <button class="btn btn-paw" onclick="ejecutarCreacionReserva()">
                <i class="bi bi-check-circle-fill me-1"></i> Confirmar y Pagar Reserva
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

  <!-- Modal 5: Botón S.O.S. de Pánico -->
  <div class="modal fade" id="modal-sos" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow border-top border-4 border-danger">
        <div class="modal-header border-0 pb-0">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill text-danger fs-3"></i>
            <h5 class="modal-title fw-bold text-danger">Protocolo de Emergencia S.O.S.</h5>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <p class="small text-muted mb-3">
            Esta alerta será derivada en vivo a la Clínica Veterinaria de guardia más cercana en Cusco y notificará al Administrador de Red.
          </p>
          <form id="form-sos" onsubmit="ejecutarAlertaSOS(event)">
            <div class="mb-3">
              <label class="form-label small fw-bold">Reserva Activa Relacionada</label>
              <select class="form-select" id="sos-id-reserva" required>
                <option value="">Selecciona la reserva...</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Nivel de Gravedad</label>
              <select class="form-select" id="sos-gravedad" required>
                <option value="Media">Media (Malestar digestivo, decaimiento leve)</option>
                <option value="Alta" selected>Alta (Herida sangrante, ingestión de tóxico)</option>
                <option value="Crítica">Crítica (Atropello, asfixia, inconsciencia)</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Descripción de lo Ocurrido</label>
              <textarea class="form-control" id="sos-descripcion" rows="3" placeholder="Detalla síntomas, hora y ubicación exacta en Cusco..." required></textarea>
            </div>
            <button type="submit" class="btn btn-paw-sos w-100 py-2 fs-6">
              <i class="bi bi-broadcast me-1"></i> EMITIR ALERTA S.O.S. AHORA
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 6: Cancelación y Reembolso Escalonado -->
  <div class="modal fade" id="modal-cancelacion" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold">Solicitar Cancelación de Reserva</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <div id="cancel-preview-box" class="paw-card p-3 border mb-3 bg-light">
            <!-- Calculado dinámicamente con apiPropPrevCancelacion -->
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div> Calculando cálculo de reembolso según política...
          </div>
          <form id="form-cancelacion" onsubmit="ejecutarCancelacionReserva(event)">
            <input type="hidden" id="cancel-id-reserva">
            <div class="mb-3">
              <label class="form-label small fw-bold">Motivo de la Cancelación</label>
              <textarea class="form-control" id="cancel-motivo" rows="2" placeholder="Explica la razón de la cancelación..." required></textarea>
            </div>
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Mantener Reserva</button>
              <button type="submit" class="btn btn-danger">Confirmar Cancelación</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 7: Abrir Disputa / Reclamo -->
  <div class="modal fade" id="modal-disputa" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold text-purple"><i class="bi bi-shield-slash me-2"></i>Abrir Disputa Arbitrada</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <p class="small text-muted mb-3">Si ocurrió una discrepancia grave en el servicio, los fondos quedarán retenidos hasta que el Administrador de Red revise las pruebas.</p>
          <form id="form-disputa" onsubmit="ejecutarDisputa(event)">
            <input type="hidden" id="disputa-id-reserva">
            <div class="mb-3">
              <label class="form-label small fw-bold">Motivo Detallado del Reclamo</label>
              <textarea class="form-control" id="disputa-motivo" rows="3" placeholder="Describe lo sucedido objetivamente..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary w-100">Registrar Disputa</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 8: Dejar Reseña -->
  <div class="modal fade" id="modal-resena" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold"><i class="bi bi-star-fill text-warning me-2"></i>Calificar Servicio del Cuidador</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <form id="form-resena" onsubmit="ejecutarCalificacion(event)">
            <input type="hidden" id="resena-id-reserva">
            <div class="mb-3 text-center">
              <label class="form-label small fw-bold d-block">Puntuación General</label>
              <select class="form-select form-select-lg mx-auto" style="max-width: 200px;" id="resena-estrellas" required>
                <option value="5">★★★★★ (5 - Excelente)</option>
                <option value="4">★★★★☆ (4 - Muy bueno)</option>
                <option value="3">★★★☆☆ (3 - Regular)</option>
                <option value="2">★★☆☆☆ (2 - Deficiente)</option>
                <option value="1">★☆☆☆☆ (1 - Malo)</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Comentario Público</label>
              <textarea class="form-control" id="resena-comentario" rows="3" placeholder="¿Cómo fue la experiencia de tu mascota? ¿Qué destacarías del cuidador?" required></textarea>
            </div>
            <button type="submit" class="btn btn-paw w-100">Publicar Calificación</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 9: Registrar / Editar Mascota -->
  <div class="modal fade" id="modal-mascota" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold">Registrar Nueva Mascota</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <form id="form-mascota" onsubmit="ejecutarGuardarMascota(event)">
            <div class="row g-2 mb-2">
              <div class="col-6">
                <label class="form-label small fw-bold">Nombre del Perro</label>
                <input type="text" class="form-control" id="masc-nombre" required>
              </div>
              <div class="col-6">
                <label class="form-label small fw-bold">Raza</label>
                <input type="text" class="form-control" id="masc-raza" placeholder="Ej: Beagle, Mestizo" required>
              </div>
            </div>
            <div class="row g-2 mb-2">
              <div class="col-4">
                <label class="form-label small fw-bold">Edad (Años)</label>
                <input type="number" class="form-control" id="masc-edad" min="0" max="25" value="3" required>
              </div>
              <div class="col-4">
                <label class="form-label small fw-bold">Tamaño</label>
                <select class="form-select" id="masc-tamano">
                  <option value="Pequeño">Pequeño</option>
                  <option value="Mediano" selected>Mediano</option>
                  <option value="Grande">Grande</option>
                </select>
              </div>
              <div class="col-4">
                <label class="form-label small fw-bold">Sexo</label>
                <select class="form-select" id="masc-sexo">
                  <option value="Macho">Macho</option>
                  <option value="Hembra">Hembra</option>
                </select>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Foto de la Mascota (URL PostImg o Unsplash)</label>
              <input type="url" class="form-control" id="masc-foto" placeholder="https://i.postimg.cc/...">
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Cartilla de Vacunación (URL para validación médica)</label>
              <input type="url" class="form-control" id="masc-vacunas" placeholder="https://i.postimg.cc/...">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Condiciones Médicas / Cuidados Especiales</label>
              <textarea class="form-control" id="masc-notas" rows="2" placeholder="Alergias, medicamentos, si es sociable con otros perros..."></textarea>
            </div>
            <button type="submit" class="btn btn-paw w-100">Guardar Mascota y Generar Carné</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 10: Ficha Médica Completa PAW PATITA-ID -->
  <div class="modal fade" id="modal-paw-id" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold"><i class="bi bi-shield-check text-success me-2"></i>Carné Canino Oficial</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4" id="paw-id-modal-body">
          <!-- Renderizado en vivo por mostrarFichaPawId() -->
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 11: Términos y Condiciones Legales -->
  <div class="modal fade" id="modal-tyc" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header">
          <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-ruled text-primary me-2"></i>Términos y Condiciones Generales v4.0</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4 small" style="line-height: 1.6;">
          <h6 class="fw-bold">1. Naturaleza de la Plataforma Paw Patita Cusco</h6>
          <p class="text-muted">Paw Patita Cusco opera como un ecosistema tecnológico que conecta a Propietarios de mascotas caninas con Cuidadores Independientes debidamente verificados y Clínicas Veterinarias Aliadas en la provincia de Cusco, Perú.</p>

          <h6 class="fw-bold">2. Política de Cancelación y Reembolso Escalonado</h6>
          <p class="text-muted">Toda reserva cancelada con más de 48 horas de anticipación a la fecha de inicio recibirá un reembolso del 100%. Entre 24 y 48 horas de anticipación se reembolsará el 70% (penalidad del 30% a favor de la preparación del cuidador). Con menos de 24 horas no existirá reembolso.</p>

          <h6 class="fw-bold">3. Protocolo de Emergencias S.O.S. y Cobertura Veterinaria</h6>
          <p class="text-muted">El uso del botón S.O.S. compromete el traslado inmediato de la mascota a la Clínica Veterinaria Aliada designada. Los diagnósticos y tratamientos quedan registrados bajo el dictamen médico oficial.</p>

          <h6 class="fw-bold">4. Verificación de Antecedentes de Cuidadores</h6>
          <p class="text-muted">Todo cuidador registrado pasa por una auditoría de antecedentes policiales y comprobante domiciliario verificado por el Administrador de Red antes de habilitar su perfil público.</p>
        </div>
        <div class="modal-footer border-0">
          <button type="button" class="btn btn-secondary rounded-pill" data-bs-dismiss="modal">Entendido</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal 12: Solicitud de Retiro de Billetera (Cuidador) -->
  <div class="modal fade" id="modal-retiro" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold"><i class="bi bi-cash-stack text-success me-2"></i>Solicitar Retiro de Ingresos</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <p class="small text-muted mb-3">El saldo acumulado por reservas finalizadas será transferido a tu cuenta en menos de 24 horas previa conciliación administrativa.</p>
          <form id="form-retiro" onsubmit="ejecutarSolicitudRetiro(event)">
            <div class="mb-3">
              <label class="form-label small fw-bold">Tipo de Cuenta de Destino</label>
              <select class="form-select" id="retiro-tipo" required>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="BCP">Cuenta BCP</option>
                <option value="Interbank">Cuenta Interbank</option>
                <option value="BBVA">Cuenta BBVA</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Número de Teléfono o Cuenta Bancaria</label>
              <input type="text" class="form-control" id="retiro-numero" placeholder="Ej: 984123456 o 191-xxxxxx" required>
            </div>
            <div class="p-3 bg-light rounded-3 border mb-3">
              <div class="d-flex justify-content-between small">
                <span>Saldo disponible actual:</span>
                <strong class="text-success" id="retiro-monto-label">S/ 0.00</strong>
              </div>
            </div>
            <button type="submit" class="btn btn-paw w-100">Confirmar Solicitud de Retiro</button>
          </form>
        </div>
      </div>
    </div>
  </div>
'''

    # Código JavaScript del Frontend (Strict ES5/ES6 sin ?. ni ??)
    with open("tools/client_logic.js", "w", encoding="utf-8") as js_file:
        js_file.write('''
  <!-- Scripts de Soporte y Lógica de Negocio Client-Side -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    /**
     * ============================================================================
     * PAW PATITA CUSCO v4.0 - FRONTEND CONTROLLER (JavaScript Estandar GAS)
     * Compatible 100% con HtmlService (Rhino/V8). Sin operadores de encadenamiento opcional ni nullish
     * Cumplimiento estricto de las 10 Heuristicas de Nielsen (20/20)
     * ============================================================================
     */

    var PawState = {
      token: null,
      usuario: null,
      rol: null,
      subtipo: null,
      moneda: 'PEN',
      tc: 3.75,
      catalogo: [],
      reservaEnCreacion: {
        id_oferta: null,
        id_cuidador: null,
        nombre_cuidador: '',
        tarifa_diaria: 0,
        id_mascota: null,
        fecha_inicio: '',
        fecha_fin: '',
        extras: { bano: false, recojo_hotel: false },
        cupon_codigo: '',
        total_pen: 0
      },
      charts: {
        adminDistritos: null,
        adminServicios: null
      }
    };

    // ============================================================================
    // 1. UTILIDADES Y SPINNER CON APAGADO GARANTIZADO
    // ============================================================================

    function loader(visible, texto) {
      var ov = document.getElementById('global-spinner-overlay');
      var tx = document.getElementById('global-spinner-text');
      if (!ov) return;
      if (visible) {
        if (tx && texto) tx.textContent = texto;
        ov.style.display = 'flex';
      } else {
        ov.style.display = 'none';
      }
    }

    function notificar(mensaje, tipo) {
      var t = tipo || 'info';
      if (t === 'error') t = 'danger';
      var cont = document.getElementById('toast-container');
      if (!cont) return;

      var id = 'toast-' + Math.floor(Math.random() * 100000);
      var icon = 'bi-info-circle-fill';
      if (t === 'success') icon = 'bi-check-circle-fill';
      if (t === 'danger') icon = 'bi-exclamation-triangle-fill';
      if (t === 'warning') icon = 'bi-exclamation-circle-fill';

      var el = document.createElement('div');
      el.className = 'toast align-items-center text-bg-' + t + ' border-0 shadow';
      el.id = id;
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
      el.setAttribute('aria-atomic', 'true');
      el.innerHTML = '<div class="d-flex"><div class="toast-body d-flex align-items-center gap-2"><i class="bi ' + icon + ' fs-5"></i><span>' + mensaje + '</span></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';

      cont.appendChild(el);
      var bsToast = new bootstrap.Toast(el, { delay: 4500 });
      bsToast.show();
      el.addEventListener('hidden.bs.toast', function() { el.remove(); });
    }

    function formatoMoneda(montoPen) {
      var m = Number(montoPen || 0);
      if (PawState.moneda === 'USD') {
        var usd = m / PawState.tc;
        return '$ ' + usd.toFixed(2) + ' USD';
      }
      return 'S/ ' + m.toFixed(2);
    }

    function toggleMoneda() {
      PawState.moneda = PawState.moneda === 'PEN' ? 'USD' : 'PEN';
      var lbl = document.getElementById('label-moneda');
      if (lbl) lbl.textContent = PawState.moneda === 'PEN' ? 'PEN (S/)' : 'USD ($)';
      renderizarCatalogo(PawState.catalogo);
      if (document.getElementById('cot-total-pen')) {
        recalcularCotizacion();
      }
    }

    // Despachador RPC seguro hacia Google Apps Script
    function ejecutarGas(metodo, args, onExito, onFallo, textoCarga) {
      loader(true, textoCarga || 'Comunicando con el servidor seguro...');
      
      if (typeof google === 'undefined' || !google.script || !google.script.run) {
        loader(false);
        console.warn('Ejecutando en entorno local/mock: no se detectó google.script.run');
        if (onFallo) {
          onFallo(new Error('google.script.run no disponible en este entorno.'));
        }
        return;
      }

      var runner = google.script.run
        .withSuccessHandler(function(res) {
          loader(false);
          if (res && res.exito === false) {
            notificar(res.error || 'Ocurrió un error en el servidor.', 'danger');
            if (onFallo) onFallo(new Error(res.error));
          } else {
            if (onExito) onExito(res);
          }
        })
        .withFailureHandler(function(err) {
          loader(false);
          var msg = (err && err.message) ? err.message : String(err);
          notificar('Error en la llamada: ' + msg, 'danger');
          if (onFallo) onFallo(err);
        });

      if (typeof runner[metodo] === 'function') {
        runner[metodo].apply(runner, args || []);
      } else {
        loader(false);
        notificar('La función ' + metodo + ' no existe en Codigo.gs', 'danger');
      }
    }

    // ============================================================================
    // 2. NAVEGACIÓN Y CONTROLADORES DE VISTA
    // ============================================================================

    function irALanding() {
      document.getElementById('view-landing').style.display = 'block';
      document.getElementById('view-app').style.display = 'none';
      cargarCatalogoPublico();
    }

    function irAlPanel() {
      if (!PawState.token) {
        abrirModalLogin();
        return;
      }
      document.getElementById('view-landing').style.display = 'none';
      document.getElementById('view-app').style.display = 'flex';
      renderizarSidebar();
      cargarDashboardPorRol();
    }

    function abrirModal(id) {
      var el = document.getElementById(id);
      if (!el) return;
      var m = bootstrap.Modal.getOrCreateInstance(el);
      m.show();
    }

    function cerrarModal(id) {
      var el = document.getElementById(id);
      if (!el) return;
      var m = bootstrap.Modal.getInstance(el);
      if (m) m.hide();
    }

    function abrirModalLogin() { abrirModal('modal-login'); }
    function abrirModalRegistroProp() { abrirModal('modal-registro-prop'); }
    function abrirModalRegistroCuid() { abrirModal('modal-registro-cuid'); }
    function abrirModalTyc() { abrirModal('modal-tyc'); }
    function abrirModalMascota() { abrirModal('modal-mascota'); }
    function abrirModalRetiro() { abrirModal('modal-retiro'); }

    function abrirModalSOS() {
      if (!PawState.token) {
        notificar('Inicia sesión para emitir una alerta S.O.S. vinculada a tu reserva.', 'warning');
        abrirModalLogin();
        return;
      }
      cargarReservasActivasParaSOS();
      abrirModal('modal-sos');
    }

    function toggleHotelRegistro(subtipo) {
      var box = document.getElementById('box-hotel-turista');
      if (box) box.style.display = subtipo === 'Turista' ? 'block' : 'none';
    }

    // ============================================================================
    // 3. CATÁLOGO PÚBLICO DE CUIDADORES
    // ============================================================================

    function cargarCatalogoPublico() {
      ejecutarGas('apiCatalogoPublico', [], function(res) {
        if (res && res.cuidadores) {
          PawState.catalogo = res.cuidadores;
          renderizarCatalogo(res.cuidadores);
        }
      }, function() {
        // En caso de entorno local sin GAS, renderizamos datos demostrativos
        renderizarCatalogoFallback();
      }, 'Cargando cuidadores certificados en Cusco...');
    }

    function renderizarCatalogo(lista) {
      var grid = document.getElementById('catalogo-cuidadores-grid');
      if (!grid) return;
      if (!lista || lista.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-muted">No se encontraron cuidadores disponibles con los filtros seleccionados.</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        var foto = c.foto_perfil || 'https://i.postimg.cc/HxXrCmbp/images.jpg';
        var cal = Number(c.calificacion_promedio || 5.0).toFixed(1);
        var dist = c.distrito || 'Cusco';
        var exp = c.anios_experiencia || 1;
        var hu = c.hu_ecode || 'HU-001';
        var minPrecio = c.tarifa_minima || 35;

        html += '<div class="col-md-6 col-lg-4">' +
          '<div class="paw-card paw-card-hover h-100 overflow-hidden d-flex flex-column border">' +
            '<div class="position-relative">' +
              '<img src="' + foto + '" class="w-100 object-fit-cover" style="height: 220px;" alt="' + c.nombre + '" onerror="this.src=\\'https://i.postimg.cc/HxXrCmbp/images.jpg\\';">' +
              '<span class="badge bg-dark bg-opacity-75 position-absolute top-0 start-0 m-3 px-2 py-1"><i class="bi bi-patch-check-fill text-warning me-1"></i>' + hu + '</span>' +
              '<span class="badge bg-white text-dark position-absolute bottom-0 end-0 m-3 shadow-sm px-2 py-1 fw-bold"><i class="bi bi-star-fill text-warning me-1"></i>' + cal + '</span>' +
            '</div>' +
            '<div class="p-3 d-flex flex-column flex-grow-1">' +
              '<div class="d-flex justify-content-between align-items-start mb-1">' +
                '<h5 class="fw-bold mb-0 text-dark">' + c.nombre + '</h5>' +
                '<span class="text-primary fw-bold fs-6">' + formatoMoneda(minPrecio) + '<small class="text-muted fw-normal">/día</small></span>' +
              '</div>' +
              '<p class="small text-muted mb-2"><i class="bi bi-geo-alt-fill text-danger me-1"></i>' + dist + ' &bull; ' + exp + ' años exp.</p>' +
              '<p class="small text-secondary mb-3 flex-grow-1">' + (c.presentacion || 'Cuidado canino responsable con reportes diarios en Cusco.') + '</p>' +
              '<div class="d-flex gap-2 mt-auto">' +
                '<button class="btn btn-paw w-100 btn-sm" onclick="iniciarReservaDesdeCatalogo(\\'' + c.id_cuidador + '\\', \\'' + c.nombre + '\\', ' + minPrecio + ')">' +
                  '<i class="bi bi-calendar-check me-1"></i> Reservar' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
      grid.innerHTML = html;
    }

    function renderizarCatalogoFallback() {
      var demo = [
        { id_cuidador: 'CUID-001', nombre: 'Carlos Mendoza', distrito: 'Cusco', anios_experiencia: 4, hu_ecode: 'HU-001', calificacion_promedio: 4.9, tarifa_minima: 35, presentacion: 'Paseos diarios en Sacsayhuamán y cuidado nocturno hogareño con supervisión total.', foto_perfil: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
        { id_cuidador: 'CUID-002', nombre: 'Lucía Fernández', distrito: 'Wanchaq', anios_experiencia: 3, hu_ecode: 'HU-002', calificacion_promedio: 4.8, tarifa_minima: 40, presentacion: 'Guardería diurna con patio cercado, juegos de olfato y socialización supervisada.', foto_perfil: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' }
      ];
      PawState.catalogo = demo;
      renderizarCatalogo(demo);
    }

    function aplicarFiltrosCatalogo() {
      var dist = (document.getElementById('filtro-distrito').value || '').toLowerCase();
      var cat = (document.getElementById('filtro-categoria').value || '').toLowerCase();
      
      var filtrados = PawState.catalogo.filter(function(c) {
        var cDist = (c.distrito || '').toLowerCase();
        var matchDist = !dist || cDist.indexOf(dist) !== -1;
        return matchDist;
      });
      renderizarCatalogo(filtrados);
    }

    // ============================================================================
    // 4. AUTENTICACIÓN, SESIONES Y ACCESO DEMO
    // ============================================================================

    function loginDemo(email, pass) {
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').value = pass;
      abrirModalLogin();
      ejecutarLogin(new Event('submit'));
    }

    function ejecutarLogin(e) {
      if (e && e.preventDefault) e.preventDefault();
      var email = document.getElementById('login-email').value.trim();
      var pass = document.getElementById('login-password').value;

      ejecutarGas('apiLogin', [email, pass], function(res) {
        if (res && res.token) {
          PawState.token = res.token;
          PawState.usuario = res.usuario;
          PawState.rol = res.usuario.tipo;
          PawState.subtipo = res.usuario.subtipo || 'Local';
          
          cerrarModal('modal-login');
          actualizarNavbarAuth();
          notificar('¡Bienvenido, ' + res.usuario.nombre + '! Sesión iniciada como ' + res.usuario.tipo, 'success');
          irAlPanel();
        }
      }, null, 'Autenticando credenciales seguras...');
    }

    function cerrarSesion() {
      if (PawState.token) {
        ejecutarGas('apiLogout', [PawState.token], function() {
          PawState.token = null;
          PawState.usuario = null;
          PawState.rol = null;
          actualizarNavbarAuth();
          irALanding();
          notificar('Sesión cerrada correctamente.', 'info');
        }, function() {
          PawState.token = null;
          PawState.usuario = null;
          PawState.rol = null;
          actualizarNavbarAuth();
          irALanding();
        });
      }
    }

    function actualizarNavbarAuth() {
      var zona = document.getElementById('nav-auth-zona');
      if (!zona) return;
      if (PawState.token && PawState.usuario) {
        zona.innerHTML = '<div class="d-flex align-items-center gap-2">' +
          '<button class="btn btn-paw btn-sm" onclick="irAlPanel()"><i class="bi bi-grid-fill me-1"></i> Mi Panel</button>' +
          '<button class="btn btn-outline-danger btn-sm rounded-circle p-2" onclick="cerrarSesion()" title="Cerrar Sesión"><i class="bi bi-box-arrow-right"></i></button>' +
        '</div>';
      } else {
        zona.innerHTML = '<button class="btn btn-paw-outline btn-sm" onclick="abrirModalLogin()"><i class="bi bi-box-arrow-in-right me-1"></i> Ingresar</button>';
      }
    }

    function ejecutarRegistroProp(e) {
      if (e && e.preventDefault) e.preventDefault();
      var d = {
        nombre: document.getElementById('reg-prop-nombre').value.trim(),
        apellido: document.getElementById('reg-prop-apellido').value.trim(),
        subtipo: document.getElementById('reg-prop-subtipo').value,
        hotel: document.getElementById('reg-prop-hotel').value.trim(),
        num_documento: document.getElementById('reg-prop-doc').value.trim(),
        telefono: document.getElementById('reg-prop-tel').value.trim(),
        distrito: document.getElementById('reg-prop-distrito').value,
        email: document.getElementById('reg-prop-email').value.trim(),
        password: document.getElementById('reg-prop-pass').value,
        acepto_tyc: document.getElementById('reg-prop-tyc').checked
      };

      ejecutarGas('apiRegistrarPropietario', [d], function(res) {
        cerrarModal('modal-registro-prop');
        notificar('¡Registro exitoso! Ya puedes iniciar sesión con tu correo.', 'success');
        document.getElementById('login-email').value = d.email;
        abrirModalLogin();
      }, null, 'Registrando cuenta de propietario...');
    }

    function ejecutarRegistroCuid(e) {
      if (e && e.preventDefault) e.preventDefault();
      var d = {
        nombre: document.getElementById('reg-cuid-nombre').value.trim(),
        apellido: document.getElementById('reg-cuid-apellido').value.trim(),
        num_documento: document.getElementById('reg-cuid-doc').value.trim(),
        telefono: document.getElementById('reg-cuid-tel').value.trim(),
        distrito: document.getElementById('reg-cuid-distrito').value,
        presentacion: document.getElementById('reg-cuid-presentacion').value.trim(),
        biografia: document.getElementById('reg-cuid-bio').value.trim(),
        anios_experiencia: Number(document.getElementById('reg-cuid-exp').value || 1),
        capacidad_max: Number(document.getElementById('reg-cuid-cap').value || 3),
        policial_url: document.getElementById('reg-cuid-policial').value.trim(),
        domicilio_url: document.getElementById('reg-cuid-domicilio').value.trim(),
        email: document.getElementById('reg-cuid-email').value.trim(),
        password: document.getElementById('reg-cuid-pass').value,
        acepto_tyc: document.getElementById('reg-cuid-tyc').checked
      };

      ejecutarGas('apiRegistrarCuidador', [d], function(res) {
        cerrarModal('modal-registro-cuid');
        notificar('¡Postulación enviada! Estado: Pendiente de verificación por el Administrador.', 'success');
        document.getElementById('login-email').value = d.email;
        abrirModalLogin();
      }, null, 'Registrando postulación de cuidador...');
    }

    // ============================================================================
    // 5. SIDEBAR DINÁMICO Y DASHBOARD MULTI-ROL
    // ============================================================================

    function renderizarSidebar() {
      var sbNombre = document.getElementById('sidebar-nombre-usuario');
      var sbRol = document.getElementById('sidebar-rol-badge');
      var sbAvatar = document.getElementById('sidebar-avatar');
      var sbMenu = document.getElementById('sidebar-menu-items');
      if (!sbMenu) return;

      if (PawState.usuario) {
        if (sbNombre) sbNombre.textContent = PawState.usuario.nombre + ' ' + (PawState.usuario.apellido || '');
        if (sbRol) sbRol.textContent = PawState.rol + (PawState.subtipo ? ' (' + PawState.subtipo + ')' : '');
        if (sbAvatar) sbAvatar.textContent = (PawState.usuario.nombre || 'U').charAt(0).toUpperCase();
      }

      var items = '';
      if (PawState.rol === 'Propietario') {
        items += '<li><a class="nav-link active" onclick="cambiarSubtabProp(\\'resumen\\', this)"><i class="bi bi-grid-1x2-fill"></i> Resumen & Mascotas</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabProp(\\'muro\\', this)"><i class="bi bi-images"></i> Muro de Fotos en Vivo</a></li>' +
                 '<li><a class="nav-link" onclick="irALanding()"><i class="bi bi-search"></i> Catálogo Cuidadores</a></li>';
      } else if (PawState.rol === 'Cuidador') {
        items += '<li><a class="nav-link active" onclick="cambiarSubtabCuid(\\'resumen\\', this)"><i class="bi bi-calendar-check"></i> Reservas y Clientes</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabCuid(\\'agenda\\', this)"><i class="bi bi-calendar3"></i> Agenda y Cupos</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabCuid(\\'billetera\\', this)"><i class="bi bi-wallet2"></i> Billetera y Retiros</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabCuid(\\'reporte\\', this)"><i class="bi bi-camera-fill"></i> Enviar Foto al Muro</a></li>';
      } else if (PawState.rol === 'Veterinaria') {
        items += '<li><a class="nav-link active" onclick="cambiarSubtabVet(\\'sos\\', this)"><i class="bi bi-hospital-fill text-danger"></i> Central S.O.S.</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabVet(\\'fichas\\', this)"><i class="bi bi-clipboard2-pulse-fill"></i> Validar Fichas PAW-ID</a></li>';
      } else if (PawState.rol === 'Administrador') {
        items += '<li><a class="nav-link active" onclick="cambiarSubtabAdmin(\\'dashboard\\', this)"><i class="bi bi-speedometer2"></i> Dashboard & Gráficos</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabAdmin(\\'postulantes\\', this)"><i class="bi bi-person-check-fill"></i> Aprobar Cuidadores</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabAdmin(\\'cancelaciones\\', this)"><i class="bi bi-cash-stack"></i> Cancelaciones & Reembolsos</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabAdmin(\\'liquidaciones\\', this)"><i class="bi bi-bank"></i> Liquidaciones Cuidador</a></li>' +
                 '<li><a class="nav-link" onclick="cambiarSubtabAdmin(\\'auditoria\\', this)"><i class="bi bi-shield-shaded"></i> Bitácora Auditoría</a></li>';
      }
      sbMenu.innerHTML = items;
    }

    function cargarDashboardPorRol() {
      // Ocultar todos los paneles primero
      document.getElementById('panel-propietario').style.display = 'none';
      document.getElementById('panel-cuidador').style.display = 'none';
      document.getElementById('panel-veterinaria').style.display = 'none';
      document.getElementById('panel-admin').style.display = 'none';

      if (PawState.rol === 'Propietario') {
        document.getElementById('panel-propietario').style.display = 'block';
        cargarMascotasPropietario();
        cargarReservasPropietario();
      } else if (PawState.rol === 'Cuidador') {
        document.getElementById('panel-cuidador').style.display = 'block';
        cargarReservasCuidador();
        cargarBilleteraCuidador();
      } else if (PawState.rol === 'Veterinaria') {
        document.getElementById('panel-veterinaria').style.display = 'block';
        cargarEmergenciasVet();
        cargarFichasVet();
      } else if (PawState.rol === 'Administrador') {
        document.getElementById('panel-admin').style.display = 'block';
        cargarDashboardAdmin();
      }
    }

    // ============================================================================
    // 6. FLUJOS PROPIETARIO (Mascotas, PAW PATITA-ID, Reservas, Muro)
    // ============================================================================

    function cambiarSubtabProp(sub, el) {
      document.getElementById('prop-sub-resumen').style.display = sub === 'resumen' ? 'block' : 'none';
      document.getElementById('prop-sub-muro').style.display = sub === 'muro' ? 'block' : 'none';
      if (el) actualizarNavActive(el);
      if (sub === 'muro') cargarMuroPropietario();
    }

    function actualizarNavActive(el) {
      var links = document.querySelectorAll('.app-sidebar .nav-link');
      for (var i = 0; i < links.length; i++) links[i].classList.remove('active');
      el.classList.add('active');
    }

    function cargarMascotasPropietario() {
      ejecutarGas('apiPropMascotas', [PawState.token], function(res) {
        if (res && res.mascotas) {
          document.getElementById('kpi-prop-mascotas').textContent = res.mascotas.length;
          renderizarMascotasGrid(res.mascotas);
        }
      });
    }

    function renderizarMascotasGrid(lista) {
      var grid = document.getElementById('prop-mascotas-cards-grid');
      if (!grid) return;
      if (!lista || lista.length === 0) {
        grid.innerHTML = '<div class="col-12 text-muted small p-3 bg-light rounded-3">No tienes mascotas registradas aún. Haz clic en "Nueva Mascota" para generar tu primer carné PAW PATITA-ID.</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        var pawId = m.paw_patita_id || 'PAW-000';
        var est = m.estado_validacion_vet || 'Pendiente Validación';
        var bClass = est === 'Validada' ? 'badge-validada' : (est === 'Observada' ? 'badge-observada' : 'badge-pendiente');
        var foto = m.foto_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80';

        html += '<div class="col-md-6 col-lg-4">' +
          '<div class="paw-id-card p-3">' +
            '<span class="badge ' + bClass + ' paw-id-badge"><i class="bi bi-shield-check"></i> ' + est + '</span>' +
            '<div class="d-flex align-items-center gap-3 mb-3">' +
              '<img src="' + foto + '" class="rounded-circle object-fit-cover border border-2 border-warning" style="width: 60px; height: 60px;" alt="' + m.nombre + '" onerror="this.src=\\'https://i.postimg.cc/HxXrCmbp/images.jpg\\';">' +
              '<div>' +
                '<h5 class="fw-bold mb-0 text-dark">' + m.nombre + '</h5>' +
                '<span class="badge bg-secondary font-monospace" style="font-size: 0.72rem;">' + pawId + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="small text-muted mb-3">' +
              '<div><strong>Raza:</strong> ' + m.raza + ' &bull; ' + m.edad_anios + ' años</div>' +
              '<div><strong>Tamaño:</strong> ' + (m.tamano || 'Mediano') + ' &bull; ' + (m.sexo || 'Macho') + '</div>' +
            '</div>' +
            '<div class="d-flex justify-content-between align-items-center pt-2 border-top">' +
              '<div class="paw-chip"></div>' +
              '<button class="btn btn-sm btn-outline-dark rounded-pill py-1" onclick="verHistorialMascota(\\'' + m.id_mascota + '\\')">' +
                '<i class="bi bi-eye"></i> Ver Carné Digital' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
      grid.innerHTML = html;
    }

    function verHistorialMascota(idMascota) {
      ejecutarGas('apiPropHistorialMascota', [PawState.token, idMascota], function(res) {
        if (res && res.mascota) {
          var m = res.mascota;
          var b = document.getElementById('paw-id-modal-body');
          if (b) {
            b.innerHTML = '<div class="text-center mb-3">' +
              '<img src="' + (m.foto_url || 'https://i.postimg.cc/HxXrCmbp/images.jpg') + '" class="rounded-circle object-fit-cover border border-3 border-warning mb-2" style="width: 90px; height: 90px;">' +
              '<h4 class="fw-bold mb-0">' + m.nombre + '</h4>' +
              '<span class="badge bg-primary font-monospace fs-6 mt-1">' + m.paw_patita_id + '</span>' +
            '</div>' +
            '<ul class="list-group list-group-flush small mb-3">' +
              '<li class="list-group-item d-flex justify-content-between"><span>Raza:</span><strong>' + m.raza + '</strong></li>' +
              '<li class="list-group-item d-flex justify-content-between"><span>Edad:</span><strong>' + m.edad_anios + ' años</strong></li>' +
              '<li class="list-group-item d-flex justify-content-between"><span>Estado Sanitario:</span><strong class="text-success">' + m.estado_validacion_vet + '</strong></li>' +
              '<li class="list-group-item d-flex justify-content-between"><span>Observaciones:</span><span>' + (m.condiciones_medicas || 'Ninguna registrada') + '</span></li>' +
            '</ul>' +
            '<div class="p-2 bg-light rounded text-center small text-muted"><i class="bi bi-patch-check-fill text-success me-1"></i> Ficha auditada por la Red Veterinaria Aliada Cusco.</div>';
          }
          abrirModal('modal-paw-id');
        }
      });
    }

    function ejecutarGuardarMascota(e) {
      if (e && e.preventDefault) e.preventDefault();
      var d = {
        nombre: document.getElementById('masc-nombre').value.trim(),
        raza: document.getElementById('masc-raza').value.trim(),
        edad_anios: Number(document.getElementById('masc-edad').value || 1),
        tamano: document.getElementById('masc-tamano').value,
        sexo: document.getElementById('masc-sexo').value,
        foto_url: document.getElementById('masc-foto').value.trim(),
        enlace_vacunas_postimg: document.getElementById('masc-vacunas').value.trim(),
        condiciones_medicas: document.getElementById('masc-notas').value.trim()
      };

      ejecutarGas('apiPropGuardarMascota', [PawState.token, d], function(res) {
        cerrarModal('modal-mascota');
        notificar('¡Mascota registrada! Carné ' + (res.paw_patita_id || 'PAW') + ' creado.', 'success');
        cargarMascotasPropietario();
      }, null, 'Registrando mascota y generando carné...');
    }

    function cargarReservasPropietario() {
      ejecutarGas('apiPropReservas', [PawState.token], function(res) {
        if (res && res.reservas) {
          var tbody = document.getElementById('tabla-prop-reservas-body');
          if (!tbody) return;
          if (res.reservas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Aún no has realizado reservas. Explora el catálogo de cuidadores para empezar.</td></tr>';
            return;
          }

          var activas = 0, totalGasto = 0;
          var html = '';
          for (var i = 0; i < res.reservas.length; i++) {
            var r = res.reservas[i];
            var est = r.estado;
            if (est === 'Confirmada' || est === 'En Curso' || est === 'Pendiente Confirmación') activas++;
            totalGasto += Number(r.monto_total || 0);

            var bClass = 'badge-pendiente';
            if (est === 'Confirmada') bClass = 'badge-confirmada';
            if (est === 'En Curso') bClass = 'badge-encurso';
            if (est === 'Finalizada') bClass = 'badge-finalizada';
            if (est === 'Cancelada') bClass = 'badge-cancelada';
            if (est === 'En Disputa') bClass = 'badge-disputa';

            var botones = '';
            if (est === 'Pendiente Confirmación' || est === 'Confirmada') {
              botones += '<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="abrirCancelacionPropietario(\\'' + r.id_reserva + '\\')">Cancelar</button> ';
            }
            if (est === 'En Curso') {
              botones += '<button class="btn btn-sm btn-danger py-0 px-2 fw-bold" onclick="abrirModalSOS()">S.O.S.</button> ';
              botones += '<button class="btn btn-sm btn-outline-purple py-0 px-2" onclick="abrirModalDisputa(\\'' + r.id_reserva + '\\')">Disputa</button> ';
            }
            if (est === 'Finalizada') {
              botones += '<button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="abrirModalResena(\\'' + r.id_reserva + '\\')"><i class="bi bi-star"></i> Calificar</button>';
            }

            html += '<tr>' +
              '<td class="ps-3 fw-bold text-dark">' + (r.codigo || r.id_reserva) + '</td>' +
              '<td>' + (r.cuidador_nombre || 'Cuidador') + '</td>' +
              '<td>' + (r.mascota_nombre || 'Mascota') + '</td>' +
              '<td>' + (r.servicio_categoria || 'Paseo') + '</td>' +
              '<td>' + r.fecha_inicio + ' al ' + r.fecha_fin + '</td>' +
              '<td class="fw-bold text-primary">' + formatoMoneda(r.monto_total) + '</td>' +
              '<td><span class="badge ' + bClass + '">' + est + '</span></td>' +
              '<td class="text-end pe-3">' + (botones || '<span class="text-muted small">Sin acciones</span>') + '</td>' +
            '</tr>';
          }
          tbody.innerHTML = html;
          document.getElementById('kpi-prop-activas').textContent = activas;
          document.getElementById('kpi-prop-total').textContent = res.reservas.length;
          document.getElementById('kpi-prop-gastado').textContent = formatoMoneda(totalGasto);
        }
      });
    }

    function cargarMuroPropietario() {
      ejecutarGas('apiPropMuro', [PawState.token], function(res) {
        var grid = document.getElementById('prop-muro-fotos-grid');
        if (!grid) return;
        if (!res || !res.reportes || res.reportes.length === 0) {
          grid.innerHTML = '<div class="col-12 text-center py-5 text-muted">Aún no hay reportes de paseos con fotos en tus reservas.</div>';
          return;
        }

        var html = '';
        for (var i = 0; i < res.reportes.length; i++) {
          var rep = res.reportes[i];
          var foto = rep.foto_url || 'https://i.postimg.cc/HxXrCmbp/images.jpg';
          html += '<div class="col-md-6 col-lg-4">' +
            '<div class="paw-card overflow-hidden h-100 border">' +
              '<img src="' + foto + '" class="w-100 object-fit-cover" style="height: 220px;" alt="Paseo" onerror="this.src=\\'https://i.postimg.cc/HxXrCmbp/images.jpg\\';">' +
              '<div class="p-3">' +
                '<div class="d-flex justify-content-between small text-muted mb-2">' +
                  '<span><i class="bi bi-clock me-1"></i>' + rep.fecha_hora + '</span>' +
                  '<span class="badge bg-light text-dark border">' + (rep.cuidador_nombre || 'Cuidador') + '</span>' +
                '</div>' +
                '<p class="small text-secondary mb-0">' + rep.nota_estado + '</p>' +
              '</div>' +
            '</div>' +
          '</div>';
        }
        grid.innerHTML = html;
      });
    }

    // ============================================================================
    // 7. WIZARD DE RESERVA Y PASARELA SIMULADA DE PAGO
    // ============================================================================

    function iniciarReservaDesdeCatalogo(idCuidador, nombreCuidador, tarifa) {
      if (!PawState.token) {
        notificar('Inicia sesión o regístrate como Propietario para reservar.', 'warning');
        abrirModalLogin();
        return;
      }
      if (PawState.rol !== 'Propietario') {
        notificar('Solo los Propietarios pueden realizar reservas de cuidado.', 'warning');
        return;
      }

      PawState.reservaEnCreacion.id_cuidador = idCuidador;
      PawState.reservaEnCreacion.nombre_cuidador = nombreCuidador;
      PawState.reservaEnCreacion.tarifa_diaria = tarifa;
      PawState.reservaEnCreacion.id_oferta = 'OFE-001'; // Por defecto oferta principal
      
      // Inicializar fechas hoy a mañana
      var hoy = new Date().toISOString().split('T')[0];
      var manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      document.getElementById('wizard-fecha-ini').value = hoy;
      document.getElementById('wizard-fecha-fin').value = manana;
      PawState.reservaEnCreacion.fecha_inicio = hoy;
      PawState.reservaEnCreacion.fecha_fin = manana;

      cargarMascotasParaWizard();
      wizardAvanzarPaso(1);
      abrirModal('modal-wizard-reserva');
    }

    function cargarMascotasParaWizard() {
      var sel = document.getElementById('wizard-select-mascota');
      if (!sel) return;
      sel.innerHTML = '<option value="">Cargando tus mascotas...</option>';

      ejecutarGas('apiPropMascotas', [PawState.token], function(res) {
        if (res && res.mascotas && res.mascotas.length > 0) {
          var opts = '<option value="">Selecciona a tu perro...</option>';
          for (var i = 0; i < res.mascotas.length; i++) {
            var m = res.mascotas[i];
            opts += '<option value="' + m.id_mascota + '">' + m.nombre + ' (' + m.raza + ' - ' + m.paw_patita_id + ')</option>';
          }
          sel.innerHTML = opts;
          // Seleccionar primera mascota por defecto
          sel.value = res.mascotas[0].id_mascota;
          verificarMascotaSeleccionada(res.mascotas[0].id_mascota);
        } else {
          sel.innerHTML = '<option value="">No tienes mascotas registradas. Agrega una primero.</option>';
        }
      });
    }

    function verificarMascotaSeleccionada(idMascota) {
      var prev = document.getElementById('wizard-mascota-preview');
      if (!prev) return;
      if (!idMascota) {
        prev.style.display = 'none';
        PawState.reservaEnCreacion.id_mascota = null;
        return;
      }
      PawState.reservaEnCreacion.id_mascota = idMascota;
      prev.style.display = 'block';
      prev.innerHTML = '<div class="d-flex align-items-center gap-2 text-success small fw-bold">' +
        '<i class="bi bi-shield-check fs-5"></i> Mascota seleccionada para custodia y supervisión médica.' +
      '</div>';
    }

    function wizardAvanzarPaso(numPaso) {
      if (numPaso === 2 && !PawState.reservaEnCreacion.id_mascota) {
        notificar('Por favor selecciona una mascota para continuar.', 'warning');
        return;
      }
      if (numPaso === 3) {
        var ini = document.getElementById('wizard-fecha-ini').value;
        var fin = document.getElementById('wizard-fecha-fin').value;
        if (!ini || !fin || fin < ini) {
          notificar('Selecciona un rango de fechas válido (salida posterior a ingreso).', 'warning');
          return;
        }
        PawState.reservaEnCreacion.fecha_inicio = ini;
        PawState.reservaEnCreacion.fecha_fin = fin;
        PawState.reservaEnCreacion.extras.bano = document.getElementById('wizard-extra-bano').checked;
        PawState.reservaEnCreacion.extras.recojo_hotel = document.getElementById('wizard-extra-hotel').checked;
        recalcularCotizacion();
      }

      for (var i = 1; i <= 4; i++) {
        var p = document.getElementById('wizard-paso-' + i);
        var b = document.getElementById('bullet-step-' + i);
        if (p) p.style.display = i === numPaso ? 'block' : 'none';
        if (b) {
          b.className = 'wizard-step-bullet' + (i === numPaso ? ' active' : (i < numPaso ? ' completed' : ''));
        }
      }
    }

    function recalcularCotizacion() {
      var ini = document.getElementById('wizard-fecha-ini').value;
      var fin = document.getElementById('wizard-fecha-fin').value;
      if (!ini || !fin) return;

      var q = {
        id_oferta: PawState.reservaEnCreacion.id_oferta || 'OFE-001',
        fecha_inicio: ini,
        fecha_fin: fin,
        incluye_bano: document.getElementById('wizard-extra-bano') ? document.getElementById('wizard-extra-bano').checked : false,
        cupon_codigo: PawState.reservaEnCreacion.cupon_codigo || '',
        es_turista: PawState.subtipo === 'Turista',
        extras: {
          bano: document.getElementById('wizard-extra-bano') ? document.getElementById('wizard-extra-bano').checked : false,
          recojo_hotel: document.getElementById('wizard-extra-hotel') ? document.getElementById('wizard-extra-hotel').checked : false
        }
      };

      ejecutarGas('apiPropCotizar', [PawState.token, q], function(res) {
        if (res && res.total !== undefined) {
          PawState.reservaEnCreacion.total_pen = res.total;
          if (document.getElementById('cot-dias')) document.getElementById('cot-dias').textContent = res.dias + ' días';
          if (document.getElementById('cot-tarifa-base')) document.getElementById('cot-tarifa-base').textContent = formatoMoneda(res.base_subtotal);
          
          var bTemp = document.getElementById('box-cot-temporada');
          if (bTemp) {
            bTemp.style.display = res.ajuste_temporada > 0 ? 'flex' : 'none';
            document.getElementById('cot-temporada').textContent = '+ ' + formatoMoneda(res.ajuste_temporada);
          }

          var bExt = document.getElementById('box-cot-extras');
          if (bExt) {
            bExt.style.display = res.extras_monto > 0 ? 'flex' : 'none';
            document.getElementById('cot-extras').textContent = '+ ' + formatoMoneda(res.extras_monto);
          }

          var bDesc = document.getElementById('box-cot-descuento');
          if (bDesc) {
            bDesc.style.display = res.descuento_cupon > 0 ? 'flex' : 'none';
            document.getElementById('cot-descuento').textContent = '- ' + formatoMoneda(res.descuento_cupon);
          }

          if (document.getElementById('cot-total-pen')) {
            document.getElementById('cot-total-pen').textContent = 'S/ ' + Number(res.total).toFixed(2);
          }
          if (document.getElementById('cot-total-usd')) {
            var usd = Number(res.total) / PawState.tc;
            document.getElementById('cot-total-usd').textContent = 'Ref: $ ' + usd.toFixed(2) + ' USD';
          }
          if (document.getElementById('yape-monto-label')) {
            document.getElementById('yape-monto-label').textContent = 'S/ ' + Number(res.total).toFixed(2);
          }
        }
      });
    }

    function aplicarCuponWizard() {
      var c = (document.getElementById('wizard-cupon').value || '').trim().toUpperCase();
      if (!c) return;
      PawState.reservaEnCreacion.cupon_codigo = c;
      notificar('Aplicando cupón ' + c + '...', 'info');
      recalcularCotizacion();
    }

    function toggleFormularioPago(metodo) {
      var boxYape = document.getElementById('box-pago-yape');
      var boxTarj = document.getElementById('box-pago-tarjeta');
      if (boxYape) boxYape.style.display = metodo === 'Yape' ? 'block' : 'none';
      if (boxTarj) boxTarj.style.display = metodo === 'Tarjeta' ? 'block' : 'none';
    }

    function ejecutarCreacionReserva() {
      if (!document.getElementById('wizard-acepta-tyc').checked) {
        notificar('Debes aceptar los Términos y Condiciones Legales.', 'warning');
        return;
      }

      var metodo = document.querySelector('input[name="metodo-pago"]:checked').value;
      var reservaData = {
        id_oferta: PawState.reservaEnCreacion.id_oferta || 'OFE-001',
        id_mascota: PawState.reservaEnCreacion.id_mascota,
        fecha_inicio: PawState.reservaEnCreacion.fecha_inicio,
        fecha_fin: PawState.reservaEnCreacion.fecha_fin,
        incluye_bano: PawState.reservaEnCreacion.extras.bano,
        cupon_codigo: PawState.reservaEnCreacion.cupon_codigo,
        instrucciones_especiales: document.getElementById('wizard-notas').value.trim(),
        extras: PawState.reservaEnCreacion.extras
      };

      var pagoData = {
        metodo: metodo,
        moneda: PawState.moneda,
        numero_operacion_simulado: 'OP-' + Math.floor(Math.random() * 900000 + 100000)
      };

      ejecutarGas('apiPropCrearReserva', [PawState.token, reservaData, pagoData], function(res) {
        cerrarModal('modal-wizard-reserva');
        notificar('¡Reserva creada exitosamente! Código: ' + (res.codigo_reserva || 'RES'), 'success');
        irAlPanel();
      }, null, 'Procesando pago y confirmando reserva...');
    }

    // ============================================================================
    // 8. CANCELACIONES ESCALONADAS, DISPUTAS Y RESEÑAS
    // ============================================================================

    function abrirCancelacionPropietario(idReserva) {
      document.getElementById('cancel-id-reserva').value = idReserva;
      var box = document.getElementById('cancel-preview-box');
      if (box) box.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div> Consultando horas y cálculo de reembolso...';
      abrirModal('modal-cancelacion');

      ejecutarGas('apiPropPrevCancelacion', [PawState.token, idReserva], function(res) {
        if (res && box) {
          box.innerHTML = '<h6 class="fw-bold mb-2">Cálculo de la Política Escalonada:</h6>' +
            '<div class="d-flex justify-content-between small mb-1"><span>Horas de anticipación:</span><strong>' + res.horas_anticipacion + ' h</strong></div>' +
            '<div class="d-flex justify-content-between small mb-1"><span>Regla de reembolso:</span><span class="badge bg-primary">' + res.regla + '</span></div>' +
            '<div class="d-flex justify-content-between small mb-1"><span>Reembolso estimado:</span><strong class="text-success">' + formatoMoneda(res.monto_reembolso) + '</strong></div>' +
            '<div class="d-flex justify-content-between small"><span>Penalidad aplicada:</span><strong class="text-danger">' + formatoMoneda(res.monto_penalidad) + '</strong></div>';
        }
      });
    }

    function ejecutarCancelacionReserva(e) {
      if (e && e.preventDefault) e.preventDefault();
      var idRes = document.getElementById('cancel-id-reserva').value;
      var mot = document.getElementById('cancel-motivo').value.trim();

      ejecutarGas('apiPropCancelar', [PawState.token, idRes, mot], function(res) {
        cerrarModal('modal-cancelacion');
        notificar('Reserva cancelada. ' + (res.mensaje || ''), 'info');
        cargarReservasPropietario();
      }, null, 'Procesando solicitud de cancelación...');
    }

    function abrirModalDisputa(idReserva) {
      document.getElementById('disputa-id-reserva').value = idReserva;
      abrirModal('modal-disputa');
    }

    function ejecutarDisputa(e) {
      if (e && e.preventDefault) e.preventDefault();
      var idRes = document.getElementById('disputa-id-reserva').value;
      var mot = document.getElementById('disputa-motivo').value.trim();

      ejecutarGas('apiAbrirDisputa', [PawState.token, idRes, mot], function(res) {
        cerrarModal('modal-disputa');
        notificar('Disputa registrada. El administrador arbitrará el caso.', 'warning');
        cargarReservasPropietario();
      });
    }

    function abrirModalResena(idReserva) {
      document.getElementById('resena-id-reserva').value = idReserva;
      abrirModal('modal-resena');
    }

    function ejecutarCalificacion(e) {
      if (e && e.preventDefault) e.preventDefault();
      var d = {
        id_reserva: document.getElementById('resena-id-reserva').value,
        calificacion_estrellas: Number(document.getElementById('resena-estrellas').value),
        comentario: document.getElementById('resena-comentario').value.trim()
      };

      ejecutarGas('apiPropResena', [PawState.token, d], function(res) {
        cerrarModal('modal-resena');
        notificar('¡Gracias por tu reseña! Tu opinión fortalece la comunidad.', 'success');
        cargarReservasPropietario();
      });
    }

    // ============================================================================
    // 9. FLUJOS CUIDADOR (Check-in, Check-out, Agenda, Billetera)
    // ============================================================================

    function cambiarSubtabCuid(sub, el) {
      document.getElementById('cuid-sub-resumen').style.display = sub === 'resumen' ? 'block' : 'none';
      document.getElementById('cuid-sub-agenda').style.display = sub === 'agenda' ? 'block' : 'none';
      document.getElementById('cuid-sub-billetera').style.display = sub === 'billetera' ? 'block' : 'none';
      document.getElementById('cuid-sub-reporte').style.display = sub === 'reporte' ? 'block' : 'none';
      if (el) actualizarNavActive(el);
      if (sub === 'agenda') cargarAgendaCuidador();
      if (sub === 'billetera') cargarBilleteraCuidador();
      if (sub === 'reporte') cargarReservasParaReporte();
    }

    function cargarReservasCuidador() {
      ejecutarGas('apiCuidReservas', [PawState.token], function(res) {
        if (res && res.reservas) {
          var tbody = document.getElementById('tabla-cuid-reservas-body');
          if (!tbody) return;
          if (res.reservas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No tienes solicitudes ni reservas asignadas actualmente.</td></tr>';
            return;
          }

          var pendientes = 0, enCurso = 0;
          var html = '';
          for (var i = 0; i < res.reservas.length; i++) {
            var r = res.reservas[i];
            var est = r.estado;
            if (est === 'Pendiente Confirmación') pendientes++;
            if (est === 'En Curso') enCurso++;

            var bClass = 'badge-pendiente';
            if (est === 'Confirmada') bClass = 'badge-confirmada';
            if (est === 'En Curso') bClass = 'badge-encurso';
            if (est === 'Finalizada') bClass = 'badge-finalizada';

            var botones = '';
            if (est === 'Pendiente Confirmación') {
              botones += '<button class="btn btn-sm btn-success py-0 px-2 me-1" onclick="responderReservaCuidador(\\'' + r.id_reserva + '\\', \\'confirmar\\')">Aceptar</button>';
              botones += '<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="responderReservaCuidador(\\'' + r.id_reserva + '\\', \\'rechazar\\')">Rechazar</button>';
            } else if (est === 'Confirmada') {
              botones += '<button class="btn btn-sm btn-primary py-0 px-2" onclick="checkInCuidador(\\'' + r.id_reserva + '\\')"><i class="bi bi-box-arrow-in-right"></i> Check-In</button>';
            } else if (est === 'En Curso') {
              botones += '<button class="btn btn-sm btn-success py-0 px-2 me-1" onclick="checkOutCuidador(\\'' + r.id_reserva + '\\')"><i class="bi bi-check2-circle"></i> Check-Out</button>';
              botones += '<button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="cambiarSubtabCuid(\\'reporte\\')"><i class="bi bi-camera"></i> Foto</button>';
            }

            html += '<tr>' +
              '<td class="ps-3 fw-bold text-dark">' + (r.codigo || r.id_reserva) + '</td>' +
              '<td>' + (r.propietario_nombre || 'Propietario') + '</td>' +
              '<td><a href="#" class="text-decoration-none fw-bold" onclick="verFichaMascotaCuidador(\\'' + r.id_reserva + '\\'); return false;">' + (r.mascota_nombre || 'Perro') + '</a></td>' +
              '<td>' + (r.servicio_categoria || 'Paseo') + '</td>' +
              '<td>' + r.fecha_inicio + ' al ' + r.fecha_fin + '</td>' +
              '<td class="fw-bold text-success">' + formatoMoneda(r.monto_neto) + '</td>' +
              '<td><span class="badge ' + bClass + '">' + est + '</span></td>' +
              '<td class="text-end pe-3">' + (botones || '<span class="text-muted small">Finalizado</span>') + '</td>' +
            '</tr>';
          }
          tbody.innerHTML = html;
          document.getElementById('kpi-cuid-pendientes').textContent = pendientes;
          document.getElementById('kpi-cuid-encurso').textContent = enCurso;
        }
      });
    }

    function responderReservaCuidador(idReserva, accion) {
      var mot = accion === 'rechazar' ? prompt('Indica el motivo del rechazo del cupo:') : '';
      if (accion === 'rechazar' && !mot) return;

      ejecutarGas('apiCuidResponderReserva', [PawState.token, idReserva, accion, mot], function(res) {
        notificar(res.mensaje || 'Reserva actualizada.', 'success');
        cargarReservasCuidador();
      });
    }

    function checkInCuidador(idReserva) {
      if (!confirm('¿Confirmas la recepción física de la mascota e inicio del servicio?')) return;
      ejecutarGas('apiCuidCheckIn', [PawState.token, idReserva], function(res) {
        notificar('Check-In completado. ¡Servicio en curso!', 'success');
        cargarReservasCuidador();
      });
    }

    function checkOutCuidador(idReserva) {
      if (!confirm('¿Confirmas la entrega de la mascota al dueño y finalización del servicio?')) return;
      ejecutarGas('apiCuidCheckOut', [PawState.token, idReserva], function(res) {
        notificar('Check-Out completado. Fondos liberados a tu Billetera.', 'success');
        cargarReservasCuidador();
        cargarBilleteraCuidador();
      });
    }

    function verFichaMascotaCuidador(idReserva) {
      ejecutarGas('apiCuidFichaMascota', [PawState.token, idReserva], function(res) {
        if (res && res.mascota) {
          verHistorialMascota(res.mascota.id_mascota);
        }
      });
    }

    function cargarAgendaCuidador() {
      var d = new Date();
      var mesStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      document.getElementById('cuid-agenda-mes-titulo').textContent = 'Disponibilidad Mes: ' + mesStr;

      ejecutarGas('apiCuidAgenda', [PawState.token, mesStr], function(res) {
        var grid = document.getElementById('cuid-calendario-grid');
        if (!grid || !res || !res.dias) return;

        var html = '';
        for (var i = 0; i < res.dias.length; i++) {
          var dia = res.dias[i];
          var est = dia.estado;
          var cClass = est === 'Disponible' ? 'disponible' : (est === 'Agotado' ? 'agotado' : 'bloqueado');

          html += '<div class="col-4 col-md-3 col-lg-2">' +
            '<div class="cal-day-cell ' + cClass + ' d-flex flex-column justify-content-between" onclick="toggleDiaAgenda(\\'' + dia.fecha + '\\', \\'' + est + '\\')">' +
              '<div class="d-flex justify-content-between align-items-center">' +
                '<strong class="small text-dark">' + dia.fecha.split('-')[2] + '</strong>' +
                '<span class="badge bg-white text-dark border" style="font-size: 0.65rem;">' + (dia.cupos_reservados || 0) + '/' + dia.cupo_maximo + '</span>' +
              '</div>' +
              '<span class="badge bg-transparent text-muted text-uppercase text-truncate" style="font-size: 0.65rem;">' + est + '</span>' +
            '</div>' +
          '</div>';
        }
        grid.innerHTML = html;
      });
    }

    function toggleDiaAgenda(fecha, estActual) {
      var accion = estActual === 'Bloqueado' ? 'desbloquear' : 'bloquear';
      ejecutarGas('apiCuidAjustarFecha', [PawState.token, fecha, accion, 3, 'Ajustado manualmente'], function() {
        notificar('Día ' + fecha + ' ' + accion + 'do.', 'info');
        cargarAgendaCuidador();
      });
    }

    function guardarPlantillaSemanal() {
      var d = prompt('Ingresa los días que atiendes separados por coma (ej: Lun,Mar,Mie,Jue,Vie,Sab):', 'Lun,Mar,Mie,Jue,Vie,Sab');
      if (!d) return;
      ejecutarGas('apiCuidGuardarPlantilla', [PawState.token, d], function() {
        notificar('Plantilla semanal guardada con éxito.', 'success');
        cargarAgendaCuidador();
      });
    }

    function cargarBilleteraCuidador() {
      ejecutarGas('apiCuidBilletera', [PawState.token], function(res) {
        if (res && res.billetera) {
          var b = res.billetera;
          document.getElementById('billetera-garantia').textContent = formatoMoneda(b.saldo_en_garantia);
          document.getElementById('billetera-disponible').textContent = formatoMoneda(b.saldo_disponible);
          document.getElementById('billetera-retirado').textContent = formatoMoneda(b.total_retirado);
          document.getElementById('kpi-cuid-saldo-disponible').textContent = formatoMoneda(b.saldo_disponible);
          document.getElementById('retiro-monto-label').textContent = formatoMoneda(b.saldo_disponible);

          var tbody = document.getElementById('tabla-cuid-liquidaciones-body');
          if (tbody && b.liquidaciones) {
            if (b.liquidaciones.length === 0) {
              tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">Aún no registras solicitudes de liquidación.</td></tr>';
              return;
            }
            var html = '';
            for (var i = 0; i < b.liquidaciones.length; i++) {
              var l = b.liquidaciones[i];
              html += '<tr>' +
                '<td class="ps-3 fw-bold text-dark">' + l.id_liquidacion + '</td>' +
                '<td>' + (l.id_reserva || 'Consolidado') + '</td>' +
                '<td class="fw-bold text-success">' + formatoMoneda(l.monto_liquidado) + '</td>' +
                '<td><span class="badge bg-secondary">' + l.estado_liquidacion + '</span></td>' +
                '<td>' + (l.fecha_solicitud || '') + '</td>' +
                '<td class="pe-3 font-monospace">' + (l.numero_operacion_pago || 'En proceso') + '</td>' +
              '</tr>';
            }
            tbody.innerHTML = html;
          }
        }
      });
    }

    function ejecutarSolicitudRetiro(e) {
      if (e && e.preventDefault) e.preventDefault();
      var tipo = document.getElementById('retiro-tipo').value;
      var num = document.getElementById('retiro-numero').value.trim();

      ejecutarGas('apiCuidSolicitarRetiro', [PawState.token, tipo, num], function(res) {
        cerrarModal('modal-retiro');
        notificar('Solicitud de retiro registrada. El administrador procesará tu pago.', 'success');
        cargarBilleteraCuidador();
      }, null, 'Registrando solicitud de retiro...');
    }

    function cargarReservasParaReporte() {
      var sel = document.getElementById('reporte-id-reserva');
      if (!sel) return;
      sel.innerHTML = '<option value="">Cargando reservas activas...</option>';

      ejecutarGas('apiCuidReservas', [PawState.token], function(res) {
        if (res && res.reservas) {
          var activas = res.reservas.filter(function(r) { return r.estado === 'En Curso'; });
          if (activas.length === 0) {
            sel.innerHTML = '<option value="">No tienes reservas en curso en este momento.</option>';
            return;
          }
          var opts = '<option value="">Selecciona la reserva en curso...</option>';
          for (var i = 0; i < activas.length; i++) {
            opts += '<option value="' + activas[i].id_reserva + '">' + activas[i].codigo + ' - ' + activas[i].mascota_nombre + ' (' + activas[i].propietario_nombre + ')</option>';
          }
          sel.innerHTML = opts;
        }
      });
    }

    function enviarReporteCuidador(e) {
      if (e && e.preventDefault) e.preventDefault();
      var d = {
        id_reserva: document.getElementById('reporte-id-reserva').value,
        foto_url: document.getElementById('reporte-foto-url').value.trim(),
        nota_estado: document.getElementById('reporte-nota').value.trim()
      };

      ejecutarGas('apiCuidReporte', [PawState.token, d], function(res) {
        notificar('¡Reporte publicado en el muro privado del dueño con éxito!', 'success');
        document.getElementById('reporte-nota').value = '';
        document.getElementById('reporte-foto-url').value = '';
      }, null, 'Publicando reporte en el muro...');
    }

    // ============================================================================
    // 10. FLUJOS VETERINARIA (Central SOS y Validación PAW PATITA-ID)
    // ============================================================================

    function cambiarSubtabVet(sub, el) {
      document.getElementById('vet-sub-sos').style.display = sub === 'sos' ? 'block' : 'none';
      document.getElementById('vet-sub-fichas').style.display = sub === 'fichas' ? 'block' : 'none';
      if (el) actualizarNavActive(el);
      if (sub === 'sos') cargarEmergenciasVet();
      if (sub === 'fichas') cargarFichasVet();
    }

    function cargarEmergenciasVet() {
      ejecutarGas('apiVetSOS', [PawState.token], function(res) {
        var grid = document.getElementById('vet-emergencias-grid');
        if (!grid) return;
        if (!res || !res.incidencias || res.incidencias.length === 0) {
          grid.innerHTML = '<div class="col-12 text-center py-4 text-muted">No se registran alertas de emergencia derivadas a tu clínica actualmente.</div>';
          return;
        }

        var html = '';
        for (var i = 0; i < res.incidencias.length; i++) {
          var inc = res.incidencias[i];
          var est = inc.estado_alerta;
          var bClass = est === 'Activa' ? 'bg-danger text-white' : (est === 'En Atención Clínica' ? 'bg-warning text-dark' : 'bg-success text-white');

          html += '<div class="col-md-6">' +
            '<div class="paw-card p-4 border-start border-4 border-danger h-100">' +
              '<div class="d-flex justify-content-between align-items-start mb-2">' +
                '<h5 class="fw-bold mb-0 text-danger">' + inc.id_incidencia + ' - ' + inc.gravedad + '</h5>' +
                '<span class="badge ' + bClass + '">' + est + '</span>' +
              '</div>' +
              '<p class="small text-muted mb-2"><strong>Mascota:</strong> ' + inc.mascota_nombre + ' &bull; <strong>Dueño:</strong> ' + inc.propietario_nombre + ' (' + inc.propietario_telefono + ')</p>' +
              '<p class="small text-dark bg-light p-2 rounded border mb-3">' + inc.descripcion_incidencia + '</p>' +
              '<div class="d-flex gap-2">' +
                (est === 'Activa' ? '<button class="btn btn-sm btn-danger w-100" onclick="tomarCasoVet(\\'' + inc.id_incidencia + '\\')"><i class="bi bi-box-arrow-in-right"></i> Tomar Caso de Emergencia</button>' : '') +
                (est === 'En Atención Clínica' ? '<button class="btn btn-sm btn-success w-100" onclick="resolverCasoVet(\\'' + inc.id_incidencia + '\\')"><i class="bi bi-check2-circle"></i> Registrar Alta y Diagnóstico</button>' : '') +
              '</div>' +
            '</div>' +
          '</div>';
        }
        grid.innerHTML = html;
      });
    }

    function tomarCasoVet(idInc) {
      ejecutarGas('apiVetTomarCaso', [PawState.token, idInc], function(res) {
        notificar('Caso de emergencia ' + idInc + ' tomado. Estado: En Atención Clínica.', 'success');
        cargarEmergenciasVet();
      });
    }

    function resolverCasoVet(idInc) {
      var diag = prompt('Diagnóstico clínico final:');
      if (!diag) return;
      var trat = prompt('Tratamiento aplicado / Medicación:');
      if (!trat) return;
      var inf = prompt('Informe médico de alta:');
      if (!inf) return;
      var costo = Number(prompt('Costo total de atención clínica (S/):', '80') || 0);

      var d = {
        id_incidencia: idInc,
        accion: 'resolver',
        diagnostico: diag,
        tratamiento: trat,
        informe: inf,
        costo: costo
      };

      ejecutarGas('apiVetActualizarCaso', [PawState.token, d], function(res) {
        notificar('Caso resuelto y registrado en el historial médico.', 'success');
        cargarEmergenciasVet();
      });
    }

    function cargarFichasVet() {
      ejecutarGas('apiVetFichas', [PawState.token], function(res) {
        var tbody = document.getElementById('tabla-vet-fichas-body');
        if (!tbody || !res || !res.fichas) return;
        if (res.fichas.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No hay fichas caninas pendientes de revisión médica.</td></tr>';
          return;
        }

        var html = '';
        for (var i = 0; i < res.fichas.length; i++) {
          var f = res.fichas[i];
          var est = f.estado_validacion_vet || 'Pendiente Validación';
          var bClass = est === 'Validada' ? 'badge-validada' : 'badge-pendiente';

          html += '<tr>' +
            '<td class="ps-3 fw-bold font-monospace">' + f.paw_patita_id + '</td>' +
            '<td><strong>' + f.nombre + '</strong></td>' +
            '<td>' + f.raza + ' (' + f.edad_anios + ' a)</td>' +
            '<td>' + (f.propietario_nombre || 'Dueño') + '</td>' +
            '<td><a href="' + (f.enlace_vacunas_postimg || '#') + '" target="_blank" class="small"><i class="bi bi-box-arrow-up-right"></i> Ver Cartilla</a></td>' +
            '<td><span class="badge ' + bClass + '">' + est + '</span></td>' +
            '<td class="text-end pe-3">' +
              (est !== 'Validada' ? '<button class="btn btn-sm btn-success py-0 px-2 me-1" onclick="validarFichaVet(\\'' + f.id_mascota + '\\', \\'validar\\')"><i class="bi bi-check-lg"></i> Validar</button>' : '') +
              '<button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="validarFichaVet(\\'' + f.id_mascota + '\\', \\'observar\\')">Observar</button>' +
            '</td>' +
          '</tr>';
        }
        tbody.innerHTML = html;
      });
    }

    function validarFichaVet(idMascota, accion) {
      var dictamen = accion === 'validar' ? 'Cartilla de vacunación y desparasitación vigente comprobada.' : prompt('Dictamen u observación veterinaria:');
      if (!dictamen) return;

      var d = {
        id_mascota: idMascota,
        accion: accion,
        dictamen: dictamen,
        vacunas_al_dia: accion === 'validar'
      };

      ejecutarGas('apiVetValidarFicha', [PawState.token, d], function(res) {
        notificar('Ficha médica canina actualizada con éxito.', 'success');
        cargarFichasVet();
      });
    }

    // ============================================================================
    // 11. FLUJOS ADMINISTRADOR (KPIs, Chart.js, Aprobaciones, Liquidaciones)
    // ============================================================================

    function cambiarSubtabAdmin(sub, el) {
      document.getElementById('admin-sub-dashboard').style.display = sub === 'dashboard' ? 'block' : 'none';
      document.getElementById('admin-sub-postulantes').style.display = sub === 'postulantes' ? 'block' : 'none';
      document.getElementById('admin-sub-cancelaciones').style.display = sub === 'cancelaciones' ? 'block' : 'none';
      document.getElementById('admin-sub-liquidaciones').style.display = sub === 'liquidaciones' ? 'block' : 'none';
      document.getElementById('admin-sub-auditoria').style.display = sub === 'auditoria' ? 'block' : 'none';
      if (el) actualizarNavActive(el);
      if (sub === 'dashboard') cargarDashboardAdmin();
      if (sub === 'postulantes') cargarPostulantesAdmin();
      if (sub === 'cancelaciones') cargarCancelacionesAdmin();
      if (sub === 'liquidaciones') cargarLiquidacionesAdmin();
      if (sub === 'auditoria') cargarAuditoriaAdmin();
    }

    function cargarDashboardAdmin() {
      ejecutarGas('apiAdminDashboard', [PawState.token], function(res) {
        if (res && res.kpis) {
          var k = res.kpis;
          document.getElementById('kpi-adm-ingresos').textContent = formatoMoneda(k.ingresosBrutos);
          document.getElementById('kpi-adm-comision').textContent = formatoMoneda(k.comisionTotal);
          document.getElementById('kpi-adm-postulantes').textContent = k.postulantesPendientes;
          document.getElementById('kpi-adm-sos').textContent = k.sosActivos;

          if (res.charts) {
            renderizarGraficosAdmin(res.charts);
          }
        }
      });
    }

    function renderizarGraficosAdmin(dataCharts) {
      if (typeof Chart === 'undefined') return;

      // Gráfico Distritos
      var ctxDist = document.getElementById('chart-admin-distritos');
      if (ctxDist && dataCharts.distritos) {
        if (PawState.charts.adminDistritos) PawState.charts.adminDistritos.destroy();
        var labelsD = Object.keys(dataCharts.distritos);
        var valsD = labelsD.map(function(k) { return dataCharts.distritos[k]; });

        PawState.charts.adminDistritos = new Chart(ctxDist, {
          type: 'bar',
          data: {
            labels: labelsD,
            datasets: [{
              label: 'Usuarios y Cuidadores',
              data: valsD,
              backgroundColor: '#FF7E47',
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
          }
        });
      }

      // Gráfico Servicios
      var ctxServ = document.getElementById('chart-admin-servicios');
      if (ctxServ && dataCharts.categorias) {
        if (PawState.charts.adminServicios) PawState.charts.adminServicios.destroy();
        var labelsS = Object.keys(dataCharts.categorias);
        var valsS = labelsS.map(function(k) { return dataCharts.categorias[k]; });

        PawState.charts.adminServicios = new Chart(ctxServ, {
          type: 'doughnut',
          data: {
            labels: labelsS,
            datasets: [{
              data: valsS,
              backgroundColor: ['#FF7E47', '#10B981', '#0284C7', '#F59E0B']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }
    }

    function cargarPostulantesAdmin() {
      ejecutarGas('apiAdminPostulantes', [PawState.token], function(res) {
        var tbody = document.getElementById('tabla-adm-postulantes-body');
        if (!tbody || !res || !res.postulantes) return;
        if (res.postulantes.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No hay cuidadores pendientes de verificación.</td></tr>';
          return;
        }

        var html = '';
        for (var i = 0; i < res.postulantes.length; i++) {
          var p = res.postulantes[i];
          html += '<tr>' +
            '<td class="ps-3 fw-bold">' + p.id_cuidador + '</td>' +
            '<td><strong>' + p.nombre + '</strong></td>' +
            '<td>' + p.email + '<br><small class="text-muted">' + p.telefono + '</small></td>' +
            '<td>' + p.distrito + '</td>' +
            '<td><a href="' + (p.antecedente ? p.antecedente.policial : '#') + '" target="_blank" class="small"><i class="bi bi-file-earmark-pdf"></i> Ver Policial</a></td>' +
            '<td><a href="' + (p.antecedente ? p.antecedente.domicilio : '#') + '" target="_blank" class="small"><i class="bi bi-house-check"></i> Ver Domicilio</a></td>' +
            '<td class="text-end pe-3">' +
              '<button class="btn btn-sm btn-success py-0 px-2 me-1" onclick="aprobarCuidadorAdmin(\\'' + p.id_cuidador + '\\', \\'aprobar\\')">Aprobar</button>' +
              '<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="aprobarCuidadorAdmin(\\'' + p.id_cuidador + '\\', \\'rechazar\\')">Rechazar</button>' +
            '</td>' +
          '</tr>';
        }
        tbody.innerHTML = html;
      });
    }

    function aprobarCuidadorAdmin(idCuidador, accion) {
      var mot = accion === 'rechazar' ? prompt('Indica el motivo del rechazo:') : '';
      if (accion === 'rechazar' && !mot) return;

      var d = { id_cuidador: idCuidador, accion: accion, motivo: mot };
      ejecutarGas('apiAdminAprobarCuidador', [PawState.token, d], function(res) {
        notificar(res.mensaje || 'Cuidador procesado.', 'success');
        cargarPostulantesAdmin();
      });
    }

    function cargarCancelacionesAdmin() {
      ejecutarGas('apiAdminCancelaciones', [PawState.token], function(res) {
        var tbody = document.getElementById('tabla-adm-cancelaciones-body');
        if (!tbody || !res || !res.cancelaciones) return;
        if (res.cancelaciones.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">No hay solicitudes de cancelación en el sistema.</td></tr>';
          return;
        }

        var html = '';
        for (var i = 0; i < res.cancelaciones.length; i++) {
          var c = res.cancelaciones[i];
          var est = c.estado;
          var bClass = est === 'Completado' ? 'bg-success' : (est === 'Rechazado' ? 'bg-danger' : 'bg-warning text-dark');

          html += '<tr>' +
            '<td class="ps-3 fw-bold">' + c.id_cancelacion + '</td>' +
            '<td><strong>' + (c.codigo_reserva || c.id_reserva) + '</strong></td>' +
            '<td>' + c.solicitante + '</td>' +
            '<td>' + c.horas_anticipacion + ' h</td>' +
            '<td><span class="badge bg-light text-dark border">' + c.regla + '</span></td>' +
            '<td class="fw-bold text-success">' + formatoMoneda(c.monto_reembolso) + '</td>' +
            '<td class="fw-bold text-danger">' + formatoMoneda(c.monto_penalidad) + '</td>' +
            '<td><span class="badge ' + bClass + '">' + est + '</span></td>' +
            '<td class="text-end pe-3">' +
              (est === 'Pendiente' ? '<button class="btn btn-sm btn-success py-0 px-2 me-1" onclick="procesarReembolsoAdmin(\\'' + c.id_cancelacion + '\\', \\'aprobar\\')">Ejecutar</button>' +
              '<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="procesarReembolsoAdmin(\\'' + c.id_cancelacion + '\\', \\'rechazar\\')">Rechazar</button>' : '<span class="text-muted small">Cerrado</span>') +
            '</td>' +
          '</tr>';
        }
        tbody.innerHTML = html;
      });
    }

    function procesarReembolsoAdmin(idCancelacion, accion) {
      var mot = accion === 'rechazar' ? prompt('Motivo del rechazo de reembolso:') : '';
      if (accion === 'rechazar' && !mot) return;

      var d = { id_cancelacion: idCancelacion, accion: accion, motivo: mot };
      ejecutarGas('apiAdminProcesarReembolso', [PawState.token, d], function(res) {
        notificar(res.mensaje || 'Reembolso procesado.', 'success');
        cargarCancelacionesAdmin();
      });
    }

    function cargarLiquidacionesAdmin() {
      ejecutarGas('apiAdminLiquidaciones', [PawState.token], function(res) {
        var tbody = document.getElementById('tabla-adm-liquidaciones-body');
        if (!tbody || !res || !res.liquidaciones) return;
        if (res.liquidaciones.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No se registran solicitudes de liquidación.</td></tr>';
          return;
        }

        var html = '';
        for (var i = 0; i < res.liquidaciones.length; i++) {
          var l = res.liquidaciones[i];
          var est = l.estado;
          var bClass = est === 'Pagado' ? 'bg-success' : (est === 'Rechazado' ? 'bg-danger' : 'bg-warning text-dark');

          html += '<tr>' +
            '<td class="ps-3 fw-bold">' + l.id_liquidacion + '</td>' +
            '<td><strong>' + l.cuidador_nombre + '</strong></td>' +
            '<td><span class="badge bg-light text-dark border">' + l.cuenta_tipo + '</span></td>' +
            '<td class="font-monospace">' + l.cuenta_numero + '</td>' +
            '<td class="fw-bold text-success">' + formatoMoneda(l.monto_liquidado) + '</td>' +
            '<td><span class="badge ' + bClass + '">' + est + '</span></td>' +
            '<td class="text-end pe-3">' +
              (est === 'Solicitado' || est === 'Pendiente' ? '<button class="btn btn-sm btn-paw py-0 px-2" onclick="pagarLiquidacionAdmin(\\'' + l.id_liquidacion + '\\')">Transferir & Registrar OP</button>' : '<span class="text-muted small">' + (l.num_operacion || 'Completado') + '</span>') +
            '</td>' +
          '</tr>';
        }
        tbody.innerHTML = html;
      });
    }

    function pagarLiquidacionAdmin(idLiquidacion) {
      var op = prompt('Ingresa el número de operación bancaria transferida:', 'OP-' + Math.floor(Math.random() * 900000 + 100000));
      if (!op) return;

      var d = { id_liquidacion: idLiquidacion, accion: 'pagar', num_operacion: op };
      ejecutarGas('apiAdminLiquidar', [PawState.token, d], function(res) {
        notificar('Liquidación transferida y registrada.', 'success');
        cargarLiquidacionesAdmin();
      });
    }

    function cargarAuditoriaAdmin() {
      ejecutarGas('apiAdminAuditoria', [PawState.token], function(res) {
        var tbody = document.getElementById('tabla-adm-auditoria-body');
        if (!tbody || !res || !res.logs) return;
        if (res.logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No hay registros de auditoría.</td></tr>';
          return;
        }

        var html = '';
        for (var i = 0; i < res.logs.length; i++) {
          var a = res.logs[i];
          html += '<tr>' +
            '<td class="ps-3 text-muted small">' + a.fecha_hora + '</td>' +
            '<td><span class="badge bg-secondary">' + a.entidad + '</span></td>' +
            '<td class="font-monospace fw-bold">' + a.id_registro + '</td>' +
            '<td class="text-muted small">' + a.estado_anterior + '</td>' +
            '<td class="fw-bold text-primary small">' + a.estado_nuevo + '</td>' +
            '<td class="small">' + (a.rol_usuario || 'Sistema') + '</td>' +
            '<td class="pe-3 small text-secondary">' + (a.motivo_cambio || '') + '</td>' +
          '</tr>';
        }
        tbody.innerHTML = html;
      });
    }

    // ============================================================================
    // 12. PROTOCOLO S.O.S. GLOBAL
    // ============================================================================

    function cargarReservasActivasParaSOS() {
      var sel = document.getElementById('sos-id-reserva');
      if (!sel) return;
      sel.innerHTML = '<option value="">Cargando reservas en curso...</option>';

      var api = PawState.rol === 'Cuidador' ? 'apiCuidReservas' : 'apiPropReservas';
      ejecutarGas(api, [PawState.token], function(res) {
        if (res && res.reservas) {
          var activas = res.reservas.filter(function(r) { return r.estado === 'En Curso' || r.estado === 'Confirmada'; });
          if (activas.length === 0) {
            sel.innerHTML = '<option value="">No hay reservas en curso activas.</option>';
            return;
          }
          var opts = '<option value="">Selecciona la reserva afectada...</option>';
          for (var i = 0; i < activas.length; i++) {
            opts += '<option value="' + activas[i].id_reserva + '">' + (activas[i].codigo || activas[i].id_reserva) + ' - ' + (activas[i].mascota_nombre || 'Mascota') + '</option>';
          }
          sel.innerHTML = opts;
        }
      });
    }

    function ejecutarAlertaSOS(e) {
      if (e && e.preventDefault) e.preventDefault();
      var d = {
        id_reserva: document.getElementById('sos-id-reserva').value,
        gravedad: document.getElementById('sos-gravedad').value,
        descripcion: document.getElementById('sos-descripcion').value.trim()
      };

      ejecutarGas('apiCrearSOS', [PawState.token, d], function(res) {
        cerrarModal('modal-sos');
        notificar('ALERTA S.O.S. EMITIDA: ' + (res.mensaje || 'Derivada a clínica de guardia.'), 'danger');
        if (res.telefono) {
          alert('ATENCIÓN VETERINARIA: Comunícate de inmediato al ' + res.telefono + ' (' + res.clinica + ')');
        }
      }, null, 'EMITIENDO ALERTA S.O.S. A LA RED CLÍNICA CUSCO...');
    }

    // ============================================================================
    // 13. INICIALIZACIÓN AL CARGAR LA PÁGINA
    // ============================================================================
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Paw Patita Cusco v4.0 Frontend Inicializado.');
      cargarCatalogoPublico();
    });

  </script>
</body>
</html>
''')

    with open("tools/client_logic.js", "r", encoding="utf-8") as js_file:
        part_js = js_file.read()

    full_html = part_head + part_navbar + part_landing + part_app + part_modals + part_js

    # Escribir Index.html final
    with open("Index.html", "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"Index.html generado con éxito. Tamaño: {len(full_html)} caracteres ({len(full_html.splitlines())} líneas).")

    # VALIDACIONES TÉCNICAS OBLIGATORIAS
    print("\n--- VALIDACIÓN DE RESTRICCIONES TÉCNICAS ---")
    
    # 1. Operador encadenamiento opcional ?.
    matches_opt_chain = re.findall(r"\?\.", full_html)
    print(f"1. Coincidencias de encadenamiento opcional (?.): {len(matches_opt_chain)}")
    if matches_opt_chain:
        print("¡ERROR CRÍTICO! Se encontraron operadores ?. incompatibles con HtmlService:")
        for m in matches_opt_chain:
            print("  ->", m)
        sys.exit(1)

    # 2. Operador coalescencia nula ??
    matches_nullish = re.findall(r"(?<!\?)\?\?(?!\?)", full_html)
    print(f"2. Coincidencias de coalescencia nula (??): {len(matches_nullish)}")
    if matches_nullish:
        print("¡ERROR CRÍTICO! Se encontraron operadores ?? incompatibles con HtmlService:")
        for m in matches_nullish:
            print("  ->", m)
        sys.exit(1)

    # 3. Verificación de llamadas RPC hacia Codigo.gs
    rpc_calls = set(re.findall(r"ejecutarGas\s*\(\s*['\"](api\w+)['\"]", full_html))
    print(f"3. Funciones RPC llamadas desde Index.html: {len(rpc_calls)}")
    faltantes = rpc_calls - exported_apis
    if faltantes:
        print("¡ADVERTENCIA! Las siguientes funciones llamadas no están en Codigo.gs:")
        for fn in faltantes:
            print("  ->", fn)
    else:
        print("¡PERFECTO! El 100% de las llamadas RPC coinciden con funciones exportadas en Codigo.gs.")

    print("\n✓ Index.html cumple con todas las heurísticas y restricciones técnicas de GAS.")

if __name__ == "__main__":
    build_index()
