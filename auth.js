// ── VERIFICACIÓN DE SESIÓN COMPARTIDA ─────────────────────────────────

function verificarSesion() {
  const sesionRaw = sessionStorage.getItem('aminsa_sesion');
  if (!sesionRaw) {
    window.location.href = 'login.html';
    return false;
  }
  
  try {
    const sesion = JSON.parse(sesionRaw);
    return sesion;
  } catch(e) {
    sessionStorage.removeItem('aminsa_sesion');
    window.location.href = 'login.html';
    return false;
  }
}

function verificarPermiso(permiso) {
  const sesion = verificarSesion();
  if (!sesion) return false;
  
  const permisos = sesion.permisos || {};
  return permisos[permiso] === true;
}

function cerrarSesion() {
  sessionStorage.removeItem('aminsa_sesion');
  window.location.href = 'login.html';
}

function obtenerSesion() {
  const sesionRaw = sessionStorage.getItem('aminsa_sesion');
  if (!sesionRaw) return null;
  
  try {
    return JSON.parse(sesionRaw);
  } catch(e) {
    return null;
  }
}
