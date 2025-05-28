// =============================
//  Configuración de conexión
// =============================
const isLocalhost = window.location.hostname === 'localhost';
// URL del backend: local en localhost o producción en Railway
const BACKEND_URL = isLocalhost
  ? 'http://localhost:3000'
  : 'https://backendmagnarwargames-production.up.railway.app';

// Conexión a Socket.IO con la ruta y transporte websocket
const socket = io(BACKEND_URL, {
  path: '/socket.io',
  transports: ['websocket']
});

// =============================
//     Gestión de eventos
// =============================

// Al conectar al servidor: mostramos el ID de socket en consola
socket.on('connect', () => {
  console.log('[Index] Conectado al servidor:', socket.id);
});

// Al recibir un error desde el servidor: lo mostramos y alertamos al usuario
socket.on('error', (mensaje) => {
  console.error('[Index] Error del servidor:', mensaje);
  alert(`Error del servidor: ${mensaje}`);
});

// Al desconectarse del servidor: indicamos la razón en consola
socket.on('disconnect', (reason) => {
  console.warn('[Index] Desconectado del servidor:', reason);
});

// =============================
//     Función crearPartida()
// =============================
function crearPartida() {
  // Obtenemos y validamos el nombre del jugador
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre) {
    alert("Por favor ingresa tu nombre.");
    return;
  }
  // Guardamos el nombre en localStorage para uso posterior
  localStorage.setItem('nombreJugador', nombre);

  // Generador de IDs aleatorios de longitud dada
  function generarIdAleatorio(long) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < long; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  }

  // Intentamos crear un ID de partida libre
  function intentarCrear() {
    const partidaId = generarIdAleatorio(10);
    socket.emit('verificar-partida', partidaId, ({ exists }) => {
      if (exists) {
        // Si ya existe, volvemos a intentar con otro ID
        intentarCrear();
      } else {
        // Si está libre, emitimos creación y redirigimos al lobby
        socket.emit('crear-partida', { nombre, partida: partidaId, clave: "" });
        window.location.href = `/lobby/${partidaId}`;
      }
    });
  }

  intentarCrear();
}

// =============================
//    Función unirsePartida()
// =============================
function unirsePartida() {
  // Capturamos los campos del formulario
  const nombreInput = document.getElementById('nombre');
  const partidaInput = document.getElementById('partida');
  const claveInput = document.getElementById('clave');

  // Si falta algún elemento, alertamos y abortamos
  if (!nombreInput || !partidaInput || !claveInput) {
    console.error("Error interno: faltan elementos en la página.");
    alert("Error interno: Faltan elementos en la página.");
    return;
  }

  const nombre = nombreInput.value.trim();
  const partida = partidaInput.value.trim();
  const clave = claveInput.value; // puede estar vacía

  // Validación básica de campos requeridos
  if (!nombre || !partida) {
    alert("Por favor, ingresa tu nombre y el nombre de la partida.");
    return;
  }

  console.log(`[Index] Unirse a partida: Usuario=${nombre}, Partida=${partida}, Clave=${clave ? '***' : '(ninguna)'}`);

  // Guardamos el nombre para uso posterior
  localStorage.setItem('nombreJugador', nombre);

  // Redirigimos al lobby con parámetros en la URL
  const params = new URLSearchParams({ nombre, partida, clave });
  window.location.href = `html/lobby.html?${params.toString()}`;
}
