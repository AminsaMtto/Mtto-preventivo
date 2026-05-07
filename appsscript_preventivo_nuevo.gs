/**
 * appsscript_preventivo_nuevo.gs — Backend para Sistema de Mantenimientos Preventivos
 * Google Apps Script para gestión completa de preventivos
 */

// ── CONFIGURACIÓN ───────────────────────────────────────────────────
const HOJA_PREVENTIVO = 'Preventivos';
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID'; // Reemplazar con ID real

// ── ENCABEZADOS ─────────────────────────────────────────────────────
const ENCABEZADOS_PREVENTIVOS = [
  'ID',
  'Equipo',
  'Centro de Negocio',
  'Frecuencia',
  'Último Mantenimiento',
  'Próximo Mantenimiento',
  'Técnico',
  'Observaciones',
  'Fecha Realizado',
  'Trabajo Realizado',
  'Estado',
  'Fecha Creación'
];

// ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────
function doPost(e) {
  try {
    console.log('Recibida solicitud:', e);
    
    const body = JSON.parse(e.postData.contents);
    console.log('Body parseado:', body);
    
    let result;
    
    switch (body.accion) {
      case 'guardarPreventivo':
        result = guardarPreventivo_data(body.datos);
        break;
      case 'listarPreventivos':
        result = listarPreventivos_data();
        break;
      case 'actualizarPreventivo':
        result = actualizarPreventivo_data(body.id, body.datos);
        break;
      case 'eliminarPreventivo':
        result = eliminarPreventivo_data(body.id);
        break;
      default:
        result = { ok: false, error: 'Acción no reconocida: ' + body.accion };
    }
    
    console.log('Resultado:', result);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
      
  } catch (err) {
    console.error('Error en doPost:', err);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false, 
      error: err.toString()
    }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────────
function inicializarHojaPreventivo() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let hoja = ss.getSheetByName(HOJA_PREVENTIVO);
    
    if (!hoja) {
      console.log('Creando hoja:', HOJA_PREVENTIVO);
      hoja = ss.insertSheet(HOJA_PREVENTIVO);
      hoja.getRange('A1:L1').setValues([ENCABEZADOS_PREVENTIVOS])
           .setFontWeight('bold')
           .setBackground('#f0f0f0')
           .setWrap(true);
    }
    
    return hoja;
  } catch (err) {
    console.error('Error al inicializar hoja:', err);
    throw err;
  }
}

// ── GUARDAR PREVENTIVO ─────────────────────────────────────────────────
function guardarPreventivo_data(datos) {
  try {
    console.log('Guardando preventivo:', datos);
    
    const hoja = inicializarHojaPreventivo();
    
    // Generar ID único
    const id = Utilities.getUuid();
    const fechaCreacion = new Date().toISOString();
    
    const fila = [
      id,
      datos.equipo || '',
      datos.centro_de_negocio || '',
      datos.frecuencia || '',
      datos.ultimo_mantenimiento || '',
      datos.proximo_mantenimiento || '',
      datos.tecnico || '',
      datos.observaciones || '',
      '', // Fecha Realizado
      '', // Trabajo Realizado
      datos.estado || 'PENDIENTE',
      fechaCreacion
    ];
    
    hoja.appendRow(fila);
    
    // Aplicar formato a la nueva fila
    const ultimaFila = hoja.getLastRow();
    hoja.getRange(ultimaFila, 1, 1, fila.length)
         .setBackground('#fff8e1')
         .setFontFamily('Inconsolata')
         .setFontSize(10);
    
    console.log('Preventivo guardado con ID:', id);
    
    return { 
      ok: true, 
      id: id,
      message: 'Mantenimiento preventivo guardado correctamente' 
    };
    
  } catch (err) {
    console.error('Error al guardar preventivo:', err);
    return { 
      ok: false, 
      error: 'Error al guardar preventivo: ' + err.toString() 
    };
  }
}

// ── LISTAR PREVENTIVOS ─────────────────────────────────────────────────
function listarPreventivos_data() {
  try {
    console.log('Listando preventivos...');
    
    const hoja = inicializarHojaPreventivo();
    const datos = hoja.getDataRange().getValues();
    
    if (datos.length <= 1) {
      console.log('No hay preventivos registrados');
      return { ok: true, preventivos: [] };
    }
    
    const encabezados = datos[0].map(h => h.toString().trim().toLowerCase().replace(/\s+/g, '_'));
    const filas = datos.slice(1);
    
    const preventivos = filas.map(fila => {
      const objeto = {};
      encabezados.forEach((header, index) => {
        objeto[header] = fila[index] || '';
      });
      return objeto;
    });
    
    console.log('Preventivos encontrados:', preventivos.length);
    
    return { ok: true, preventivos: preventivos };
    
  } catch (err) {
    console.error('Error al listar preventivos:', err);
    return { 
      ok: false, 
      error: 'Error al listar preventivos: ' + err.toString(),
      preventivos: []
    };
  }
}

// ── ACTUALIZAR PREVENTIVO ───────────────────────────────────────────────
function actualizarPreventivo_data(id, datos) {
  try {
    console.log('Actualizando preventivo ID:', id, 'con datos:', datos);
    
    const hoja = inicializarHojaPreventivo();
    const todosDatos = hoja.getDataRange().getValues();
    
    // Buscar fila por ID
    let filaIndex = -1;
    for (let i = 1; i < todosDatos.length; i++) {
      if (todosDatos[i][0] === id) {
        filaIndex = i;
        break;
      }
    }
    
    if (filaIndex === -1) {
      return { ok: false, error: 'Preventivo no encontrado con ID: ' + id };
    }
    
    const fila = filaIndex + 1; // +1 porque getRange usa 1-based indexing
    
    // Actualizar campos específicos
    const actualizaciones = {
      8: datos.fecha_realizado,     // Fecha Realizado
      9: datos.trabajo_realizado,   // Trabajo Realizado
      10: datos.proximo_mantenimiento, // Próximo Mantenimiento
      11: datos.estado              // Estado
    };
    
    for (const [colIndex, valor] of Object.entries(actualizaciones)) {
      if (valor !== undefined && valor !== null) {
        hoja.getRange(fila, parseInt(colIndex) + 1).setValue(valor);
      }
    }
    
    // Aplicar formato de actualización
    hoja.getRange(fila, 1, 1, 12)
         .setBackground('#e8f5e8')
         .setFontFamily('Inconsolata')
         .setFontSize(10);
    
    console.log('Preventivo actualizado correctamente');
    
    return { 
      ok: true, 
      message: 'Mantenimiento preventivo actualizado correctamente' 
    };
    
  } catch (err) {
    console.error('Error al actualizar preventivo:', err);
    return { 
      ok: false, 
      error: 'Error al actualizar preventivo: ' + err.toString() 
    };
  }
}

// ── ELIMINAR PREVENTIVO ───────────────────────────────────────────────
function eliminarPreventivo_data(id) {
  try {
    console.log('Eliminando preventivo ID:', id);
    
    const hoja = inicializarHojaPreventivo();
    const todosDatos = hoja.getDataRange().getValues();
    
    // Buscar fila por ID
    let filaIndex = -1;
    for (let i = 1; i < todosDatos.length; i++) {
      if (todosDatos[i][0] === id) {
        filaIndex = i;
        break;
      }
    }
    
    if (filaIndex === -1) {
      return { ok: false, error: 'Preventivo no encontrado con ID: ' + id };
    }
    
    const fila = filaIndex + 1; // +1 porque deleteRow usa 1-based indexing
    hoja.deleteRow(fila);
    
    console.log('Preventivo eliminado correctamente');
    
    return { 
      ok: true, 
      message: 'Mantenimiento preventivo eliminado correctamente' 
    };
    
  } catch (err) {
    console.error('Error al eliminar preventivo:', err);
    return { 
      ok: false, 
      error: 'Error al eliminar preventivo: ' + err.toString() 
    };
  }
}

// ── FUNCIÓN DE PRUEBA ─────────────────────────────────────────────────
function testPreventivo() {
  // Función para probar el sistema
  const datosPrueba = {
    equipo: 'Equipo de Prueba',
    centro_de_negocio: 'Zinc',
    frecuencia: 'Mensual',
    ultimo_mantenimiento: '2026-04-15',
    proximo_mantenimiento: '2026-05-15',
    tecnico: 'Técnico de Prueba',
    observaciones: 'Observaciones de prueba',
    estado: 'PENDIENTE'
  };
  
  const resultado = guardarPreventivo_data(datosPrueba);
  console.log('Resultado de prueba:', resultado);
  
  return resultado;
}
