/**
 * preventivo_nuevo.js — Sistema de Mantenimientos Preventivos
 * Integración con Google Sheets para gestión completa
 */

// ── CONFIGURACIÓN ───────────────────────────────────────────────────
const PREVENTIVO_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyrP_UdUQWXnQkNqOZatGUQ3jJHZwn2A5w7lhb5R0lZTAmKMgi0vDlO3IdSvmjx2iAbCw/exec';

// ── VARIABLES GLOBALES ───────────────────────────────────────────────
let todosLosPreventivos = [];
let preventivoSeleccionado = null;
let filtroActual = 'todos';

// ── FRECUENCIAS ─────────────────────────────────────────────────────
const FRECUENCIAS_DIAS = {
  'Semanal': 7,
  'Quincenal': 15,
  'Mensual': 30,
  'Bimestral': 60,
  'Trimestral': 90,
  'Semestral': 180,
  'Anual': 365
};

// ── UTILIDADES ───────────────────────────────────────────────────────
function formatearFechaISO(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function parseFecha(fechaStr) {
  if (!fechaStr) return null;
  const d = new Date(fechaStr);
  return isNaN(d.getTime()) ? null : d;
}

function calcularDiasRestantes(fechaStr) {
  if (!fechaStr) return null;
  const fecha = new Date(fechaStr);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = fecha - hoy;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function calcularProximoMantenimiento(ultimoStr, frecuencia) {
  const dias = FRECUENCIAS_DIAS[frecuencia];
  if (!dias) return '';
  
  const ultimo = parseFecha(ultimoStr);
  if (!ultimo) return '';
  
  const proximo = new Date(ultimo);
  proximo.setDate(proximo.getDate() + dias);
  return formatearFechaISO(proximo);
}

function getEstadoPreventivo(proximoStr, estado) {
  if (estado === 'REALIZADO') {
    return { clase: 'estado-realizado', texto: 'Realizado' };
  }
  
  const dias = calcularDiasRestantes(proximoStr);
  if (dias === null) {
    return { clase: 'estado-pendiente', texto: 'Pendiente' };
  }
  
  if (dias < 0) {
    return { clase: 'estado-vencido', texto: 'Vencido' };
  } else if (dias <= 7) {
    return { clase: 'estado-proximo', texto: 'Próximo' };
  } else {
    return { clase: 'estado-pendiente', texto: 'Pendiente' };
  }
}

// ── TOAST NOTIFICATIONS ───────────────────────────────────────────────
function mostrarToast(mensaje, tipo = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.className = `toast ${tipo} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ── INTEGRACIÓN CON GOOGLE SHEETS ────────────────────────────────────
async function guardarPreventivoSheet(datos) {
  try {
    const params = new URLSearchParams();
    params.set('accion', 'guardarPreventivo');
    params.set('equipo', datos.equipo || '');
    params.set('centro_de_negocio', datos.centro_de_negocio || '');
    params.set('frecuencia', datos.frecuencia || '');
    params.set('ultimo_mantenimiento', datos.ultimo_mantenimiento || '');
    params.set('proximo_mantenimiento', datos.proximo_mantenimiento || '');
    params.set('tecnico', datos.tecnico || '');
    params.set('observaciones', datos.observaciones || '');
    params.set('estado', datos.estado || 'PENDIENTE');

    const url = PREVENTIVO_WEBAPP_URL + '?' + params.toString();
    console.log('Guardando preventivo:', url);

    const response = await fetch(url, { method: 'GET' });
    const result = await response.json();

    console.log('Respuesta:', result);
    return result;
  } catch (err) {
    console.error('guardarPreventivo error:', err);
    return { ok: false, error: err.message };
  }
}

async function listarPreventivosSheet() {
  try {
    const url = PREVENTIVO_WEBAPP_URL + '?accion=listarPreventivos';
    console.log('Cargando preventivos:', url);

    const response = await fetch(url, { method: 'GET' });
    const result = await response.json();

    console.log('Preventivos cargados:', result.preventivos?.length || 0);
    return result;
  } catch (err) {
    console.error('listarPreventivos error:', err);
    return { ok: false, error: err.message, preventivos: [] };
  }
}

async function actualizarPreventivoSheet(id, datos) {
  try {
    const params = new URLSearchParams();
    params.set('accion', 'actualizarPreventivo');
    params.set('id', id);
    params.set('fecha_realizado', datos.fecha_realizado || '');
    params.set('trabajo_realizado', datos.trabajo_realizado || '');
    params.set('proximo_mantenimiento', datos.proximo_mantenimiento || '');
    params.set('estado', datos.estado || 'REALIZADO');

    const url = PREVENTIVO_WEBAPP_URL + '?' + params.toString();
    console.log('Actualizando preventivo:', url);

    const response = await fetch(url, { method: 'GET' });
    const result = await response.json();

    console.log('Respuesta actualización:', result);
    return result;
  } catch (err) {
    console.error('actualizarPreventivo error:', err);
    return { ok: false, error: err.message };
  }
}

async function eliminarPreventivoSheet(id) {
  try {
    const params = new URLSearchParams();
    params.set('accion', 'eliminarPreventivo');
    params.set('id', id);

    const url = PREVENTIVO_WEBAPP_URL + '?' + params.toString();
    console.log('Eliminando preventivo:', url);

    const response = await fetch(url, { method: 'GET' });
    const result = await response.json();

    console.log('Respuesta eliminación:', result);
    return result;
  } catch (err) {
    console.error('eliminarPreventivo error:', err);
    return { ok: false, error: err.message };
  }
}

// ── RENDERIZADO DE TABLA ─────────────────────────────────────────────
function renderTabla(preventivos) {
  const tbody = document.getElementById('tabla-preventivos');
  tbody.innerHTML = '';

  if (preventivos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--texto-ter);">
          No hay mantenimientos preventivos registrados
        </td>
      </tr>
    `;
    return;
  }

  preventivos.forEach(preventivo => {
    const estado = getEstadoPreventivo(preventivo.proximo_mantenimiento, preventivo.estado);
    const diasRestantes = calcularDiasRestantes(preventivo.proximo_mantenimiento);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${preventivo.equipo || ''}</td>
      <td>${preventivo.centro_de_negocio || ''}</td>
      <td>${preventivo.frecuencia || ''}</td>
      <td>${preventivo.ultimo_mantenimiento || ''}</td>
      <td>${preventivo.proximo_mantenimiento || ''}</td>
      <td>${preventivo.tecnico || ''}</td>
      <td>
        <span class="estado-badge ${estado.clase}">${estado.texto}</span>
        ${diasRestantes !== null ? `<small style="display: block; color: var(--texto-ter); margin-top: 2px;">${diasRestantes} días</small>` : ''}
      </td>
      <td>
        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 10px;" onclick="abrirModalCompletar('${preventivo.id}')">
          Completar
        </button>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 10px; margin-left: 4px;" onclick="imprimirFormatoPreventivo('${preventivo.id}')">
          Imprimir
        </button>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 10px; margin-left: 4px;" onclick="eliminarPreventivo('${preventivo.id}')">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ── ESTADÍSTICAS ─────────────────────────────────────────────────────
function actualizarEstadisticas() {
  const total = todosLosPreventivos.length;
  const pendientes = todosLosPreventivos.filter(p => p.estado === 'PENDIENTE').length;
  
  const proximos = todosLosPreventivos.filter(p => {
    if (p.estado === 'REALIZADO') return false;
    const dias = calcularDiasRestantes(p.proximo_mantenimiento);
    return dias !== null && dias >= 0 && dias <= 7;
  }).length;
  
  const vencidos = todosLosPreventivos.filter(p => {
    if (p.estado === 'REALIZADO') return false;
    const dias = calcularDiasRestantes(p.proximo_mantenimiento);
    return dias !== null && dias < 0;
  }).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pendientes').textContent = pendientes;
  document.getElementById('stat-proximos').textContent = proximos;
  document.getElementById('stat-vencidos').textContent = vencidos;
}

// ── FILTROS ───────────────────────────────────────────────────────
function aplicarFiltro(preventivos) {
  if (filtroActual === 'todos') return preventivos;
  
  return preventivos.filter(p => {
    const estado = getEstadoPreventivo(p.proximo_mantenimiento, p.estado);
    
    switch (filtroActual) {
      case 'pendiente':
        return estado.texto === 'Pendiente';
      case 'proximo':
        return estado.texto === 'Próximo';
      case 'vencido':
        return estado.texto === 'Vencido';
      case 'realizado':
        return p.estado === 'REALIZADO';
      default:
        return true;
    }
  });
}

function filtrar(tipo, btn) {
  filtroActual = tipo;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');
  renderTabla(aplicarFiltro(todosLosPreventivos));
}

function buscar(query) {
  const q = query.toLowerCase();
  const filtradas = todosLosPreventivos.filter(p =>
    (p.equipo || '').toLowerCase().includes(q) ||
    (p.centro_de_negocio || '').toLowerCase().includes(q) ||
    (p.tecnico || '').toLowerCase().includes(q)
  );
  renderTabla(aplicarFiltro(filtradas));
}

// ── MODALES ─────────────────────────────────────────────────────────
function abrirModalNuevo() {
  document.getElementById('modal-nuevo').classList.add('visible');
  // Establecer fecha actual por defecto
  document.getElementById('p-ultimo').value = formatearFechaISO(new Date());
}

function abrirModalCompletar(id) {
  preventivoSeleccionado = id;
  const p = todosLosPreventivos.find(x => x.id === id);
  if (!p) return;
  
  document.getElementById('c-fecha-realizado').value = formatearFechaISO(new Date());
  document.getElementById('c-trabajo').value = '';
  
  // Calcular próximo basado en frecuencia
  const proximo = calcularProximoMantenimiento(formatearFechaISO(new Date()), p.frecuencia);
  document.getElementById('c-proximo-calculado').value = proximo;
  
  document.getElementById('modal-completar').classList.add('visible');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('visible');
  // Limpiar formulario
  if (id === 'modal-nuevo') {
    document.getElementById('p-equipo').value = '';
    document.getElementById('p-centro').value = '';
    document.getElementById('p-frecuencia').value = '';
    document.getElementById('p-ultimo').value = '';
    document.getElementById('p-tecnico').value = '';
    document.getElementById('p-observaciones').value = '';
  }
}

// ── GUARDAR ─────────────────────────────────────────────────────────
async function guardarPreventivo() {
  const equipo = document.getElementById('p-equipo').value.trim();
  const centro = document.getElementById('p-centro').value;
  const frecuencia = document.getElementById('p-frecuencia').value;
  const ultimo = document.getElementById('p-ultimo').value;
  const tecnico = document.getElementById('p-tecnico').value.trim();
  const observaciones = document.getElementById('p-observaciones').value.trim();
  
  if (!equipo) { mostrarToast('Ingresa el nombre del equipo', 'error'); return; }
  if (!centro) { mostrarToast('Selecciona el centro de negocio', 'error'); return; }
  if (!frecuencia) { mostrarToast('Selecciona la frecuencia', 'error'); return; }
  if (!ultimo) { mostrarToast('Ingresa la fecha del último mantenimiento', 'error'); return; }
  
  const proximo = calcularProximoMantenimiento(ultimo, frecuencia);
  
  const datos = {
    equipo,
    centro_de_negocio: centro,
    frecuencia,
    ultimo_mantenimiento: ultimo,
    proximo_mantenimiento: proximo,
    tecnico,
    observaciones,
    estado: 'PENDIENTE'
  };
  
  const resultado = await guardarPreventivoSheet(datos);
  if (resultado.ok) {
    mostrarToast('Mantenimiento preventivo guardado correctamente', 'success');
    cerrarModal('modal-nuevo');
    await cargarPreventivos();
  } else {
    mostrarToast('Error al guardar: ' + (resultado.error || 'Error desconocido'), 'error');
  }
}

async function completarPreventivo() {
  if (!preventivoSeleccionado) return;
  
  const fechaRealizado = document.getElementById('c-fecha-realizado').value;
  const trabajoRealizado = document.getElementById('c-trabajo').value.trim();
  const proximoManual = document.getElementById('c-proximo-manual').value;
  const proximoCalculado = document.getElementById('c-proximo-calculado').value;
  
  if (!fechaRealizado) { mostrarToast('Ingresa la fecha de realización', 'error'); return; }
  if (!trabajoRealizado) { mostrarToast('Describe el trabajo realizado', 'error'); return; }
  
  const datos = {
    fecha_realizado: fechaRealizado,
    trabajo_realizado: trabajoRealizado,
    proximo_mantenimiento: proximoManual || proximoCalculado,
    estado: 'REALIZADO'
  };
  
  const resultado = await actualizarPreventivoSheet(preventivoSeleccionado, datos);
  if (resultado.ok) {
    mostrarToast('Mantenimiento completado correctamente', 'success');
    cerrarModal('modal-completar');
    await cargarPreventivos();
  } else {
    mostrarToast('Error al completar: ' + (resultado.error || 'Error desconocido'), 'error');
  }
}

async function eliminarPreventivo(id) {
  if (!confirm('¿Estás seguro de eliminar este mantenimiento preventivo?')) return;
  
  const resultado = await eliminarPreventivoSheet(id);
  if (resultado.ok) {
    mostrarToast('Mantenimiento eliminado correctamente', 'success');
    await cargarPreventivos();
  } else {
    mostrarToast('Error al eliminar: ' + (resultado.error || 'Error desconocido'), 'error');
  }
}

// ── IMPRIMIR FORMATO ────────────────────────────────────────────────
async function imprimirFormatoPreventivo(id) {
  const preventivo = todosLosPreventivos.find(p => p.id === id);
  if (!preventivo) {
    mostrarToast('Preventivo no encontrado', 'error');
    return;
  }
  
  try {
    // Cargar el template de impresión
    const response = await fetch('formato_impresion_preventivo.html');
    const template = await response.text();
    
    // Preparar datos para el template
    const datos = {
      tecnico: preventivo.tecnico || '',
      fecha: formatearFechaISO(new Date()),
      equipo: preventivo.equipo || '',
      tiempo: '', // Dejar en blanco para que el técnico lo complete
      area: preventivo.centro_de_negocio || '',
      condicion_inicial: '', // Dejar en blanco
      observaciones: preventivo.observaciones || '' // Cargar observaciones del sistema
    };
    
    // Reemplazar placeholders en el template
    let html = template;
    Object.keys(datos).forEach(key => {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), datos[key]);
    });
    
    // Abrir nueva ventana para impresión
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(html);
    ventanaImpresion.document.close();
    
    // Esperar a que cargue y mostrar diálogo de impresión
    setTimeout(() => {
      ventanaImpresion.print();
    }, 500);
    
  } catch (error) {
    console.error('Error al cargar formato de impresión:', error);
    mostrarToast('Error al cargar formato de impresión', 'error');
  }
}

// ── INICIALIZACIÓN ─────────────────────────────────────────────────
async function cargarPreventivos() {
  const resultado = await listarPreventivosSheet();
  if (resultado.ok) {
    todosLosPreventivos = resultado.preventivos || [];
    renderTabla(aplicarFiltro(todosLosPreventivos));
    actualizarEstadisticas();
  } else {
    mostrarToast('Error al cargar preventivos: ' + (resultado.error || 'Error desconocido'), 'error');
    // Mostrar tabla vacía
    renderTabla([]);
  }
}

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', async () => {
  const sesion = sessionStorage.getItem('aminsa_sesion');
  if (!sesion) {
    window.location.href = 'login.html';
    return;
  }
  
  // Cargar preventivos
  await cargarPreventivos();
});
