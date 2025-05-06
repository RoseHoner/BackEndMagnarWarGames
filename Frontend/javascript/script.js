// --- En tu archivo script.js (para index.html) ---

// Asegúrate de que la IP/Puerto sea la correcta y accesible
const socket = io('http://192.168.0.152:3000'); // O tu IP/URL del servidor

socket.on('connect', () => {
    console.log('[Index] Conectado al servidor:', socket.id);
});

socket.on('error', (mensaje) => {
    console.error('[Index] Error del servidor:', mensaje);
    alert(`Error del servidor: ${mensaje}`); // Muestra errores específicos del servidor
});

socket.on('disconnect', (reason) => {
     console.warn('[Index] Desconectado del servidor:', reason);
     // Podrías mostrar un mensaje al usuario
});


function crearPartida() {
  const nombreInput = document.getElementById('nombre');
  const partidaInput = document.getElementById('partida');
  const claveInput = document.getElementById('clave');

  // Validar que los elementos existen
  if (!nombreInput || !partidaInput || !claveInput) {
      console.error("Error: No se encontraron los elementos del formulario (nombre, partida, clave).");
      alert("Error interno: Faltan elementos en la página.");
      return;
  }

  const nombre = nombreInput.value.trim();
  const partida = partidaInput.value.trim();
  const clave = claveInput.value; // La clave puede estar vacía, no usamos trim

  // Validación básica de campos requeridos
  if (!nombre || !partida) {
     alert("Por favor, ingresa tu nombre y un nombre para la partida.");
     return;
  }

  console.log(`[Index] Intentando crear partida: Usuario=${nombre}, Partida=${partida}, Clave=${clave ? '***' : '(ninguna)'}`);

  // Guardar nombre en localStorage para usarlo en el lobby
  localStorage.setItem('nombreJugador', nombre);

  // Emitir evento al servidor
  socket.emit('crear-partida', { nombre, partida, clave });

  // Redirigir al lobby DESPUÉS de emitir. El servidor debe crear la sala rápidamente.
  // Pasamos todos los datos necesarios para que el lobby se una automáticamente.
  const params = new URLSearchParams({ nombre, partida, clave, host: 'true' });
  window.location.href = `lobby.html?${params.toString()}`;
}

function unirsePartida() {
    const nombreInput = document.getElementById('nombre');
    const partidaInput = document.getElementById('partida');
    const claveInput = document.getElementById('clave');

    if (!nombreInput || !partidaInput || !claveInput) {
        console.error("Error: No se encontraron los elementos del formulario (nombre, partida, clave).");
        alert("Error interno: Faltan elementos en la página.");
        return;
    }

    const nombre = nombreInput.value.trim();
    const partida = partidaInput.value.trim();
    const clave = claveInput.value;

    if (!nombre || !partida) {
        alert("Por favor, ingresa tu nombre y el nombre de la partida a la que quieres unirte.");
        return;
    }

    console.log(`[Index] Intentando unirse a partida: Usuario=${nombre}, Partida=${partida}, Clave=${clave ? '***' : '(ninguna)'}`);

    // Guardar nombre en localStorage
    localStorage.setItem('nombreJugador', nombre);

    // Redirigir al lobby. El lobby se encargará de emitir 'unirse-partida' al servidor.
    const params = new URLSearchParams({ nombre, partida, clave }); // No ponemos host=true
    window.location.href = `lobby.html?${params.toString()}`;
}