// --- En tu archivo script.js (para index.html) ---
const isLocalhost = window.location.hostname === 'localhost';
const BACKEND_URL = isLocalhost
  ? 'http://localhost:3000'
  : 'https://backendmagnarwargames-production.up.railway.app';

// Conexión al backend con Socket.IO
// Asegúrate de que sea la IP correcta donde corre tu servidor
const socket = io(BACKEND_URL, {
    path: '/socket.io',
    transports: ['websocket']
  });
  
//   Cambia localhost por tu IP si accedes desde otro dispositivo

// Cuando se establece la conexión con el servidor
socket.on('connect', () => {
    console.log('[Index] Conectado al servidor:', socket.id); // Mostramos el ID de socket único
});

// Cuando ocurre un error en el servidor (emitido con socket.emit('error'))
socket.on('error', (mensaje) => {
    console.error('[Index] Error del servidor:', mensaje); // Lo mostramos por consola
    alert(`Error del servidor: ${mensaje}`); // Y lo mostramos al usuario
});

// Cuando se pierde la conexión con el servidor
socket.on('disconnect', (reason) => {
    console.warn('[Index] Desconectado del servidor:', reason);
    // Aquí podrías mostrar un mensaje o bloquear acciones
});

// Función que se ejecuta cuando haces clic en el botón "Crear Partida"
function crearPartida() {
  const nombreInput = document.getElementById('nombre');     // Campo nombre del jugador
  const partidaInput = document.getElementById('partida');   // Campo nombre de la partida
  const claveInput = document.getElementById('clave');       // Campo clave (puede estar vacío)

  // Comprobamos que los campos existen en el HTML
  if (!nombreInput || !partidaInput || !claveInput) {
      console.error("Error: No se encontraron los elementos del formulario (nombre, partida, clave).");
      alert("Error interno: Faltan elementos en la página.");
      return;
  }

  const nombre = nombreInput.value.trim();     // Quitamos espacios
  const partida = partidaInput.value.trim();   // Quitamos espacios
  const clave = claveInput.value;              // No usamos trim porque puede estar vacía

  // Validamos que el jugador ha escrito nombre y nombre de partida
  if (!nombre || !partida) {
     alert("Por favor, ingresa tu nombre y un nombre para la partida.");
     return;
  }

  // Mostramos por consola que vamos a crear partida
  console.log(`[Index] Intentando crear partida: Usuario=${nombre}, Partida=${partida}, Clave=${clave ? '***' : '(ninguna)'}`);

  // Guardamos el nombre del jugador en el navegador para usarlo luego
  localStorage.setItem('nombreJugador', nombre);

  // Enviamos al servidor que queremos crear una partida
  socket.emit('crear-partida', { nombre, partida, clave });

  // Redirigimos al lobby con los datos como parámetros en la URL
  // El parámetro 'host=true' indica que este jugador es el creador
  const params = new URLSearchParams({ nombre, partida, clave, host: 'true' });
  window.location.href = `html/lobby.html?${params.toString()}`;
}

// Función que se ejecuta cuando haces clic en el botón "Unirse a Partida"
function unirsePartida() {
    const nombreInput = document.getElementById('nombre');     // Campo nombre
    const partidaInput = document.getElementById('partida');   // Campo nombre partida
    const claveInput = document.getElementById('clave');       // Campo clave

    // Verificamos que existen los campos
    if (!nombreInput || !partidaInput || !claveInput) {
        console.error("Error: No se encontraron los elementos del formulario (nombre, partida, clave).");
        alert("Error interno: Faltan elementos en la página.");
        return;
    }

    const nombre = nombreInput.value.trim();     // El nombre del jugador
    const partida = partidaInput.value.trim();   // El nombre de la partida
    const clave = claveInput.value;              // La clave puede ser vacía

    // Validación básica
    if (!nombre || !partida) {
        alert("Por favor, ingresa tu nombre y el nombre de la partida a la que quieres unirte.");
        return;
    }

    console.log(`[Index] Intentando unirse a partida: Usuario=${nombre}, Partida=${partida}, Clave=${clave ? '***' : '(ninguna)'}`);

    // Guardamos el nombre del jugador para usarlo luego
    localStorage.setItem('nombreJugador', nombre);

    // Redirigimos al lobby, sin 'host=true' porque no es el creador
    const params = new URLSearchParams({ nombre, partida, clave });
    window.location.href = `html/lobby.html?${params.toString()}`;
}
