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
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre) {
    alert("Por favor ingresa tu nombre.");
    return;
  }
  localStorage.setItem('nombreJugador', nombre);

  // Generador de IDs aleatorios de 10 caracteres
  function generarIdAleatorio(long) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < long; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  }

  // Intentar hasta encontrar un ID libre
  function intentarCrear() {
    const partidaId = generarIdAleatorio(10);
    socket.emit('verificar-partida', partidaId, ({ exists }) => {
      if (exists) {
        // ya existe, volvemos a intentar
        intentarCrear();
      } else {
        // ID libre: creamos y redirigimos
        socket.emit('crear-partida', { nombre, partida: partidaId, clave: "" });
   // Redirigimos a la ruta bonita
   window.location.href = `/lobby/${partidaId}`;
      }
    });
  }
  intentarCrear();
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
