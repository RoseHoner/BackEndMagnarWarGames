const socket = io('http://192.168.1.133:3000'); // Asegúrate que esta IP/puerto sea accesible desde donde abras el lobby

// --- Variables Globales del Script ---
let casasActuales = {};       // Estado de casas { nombreJugador: nombreCasa } recibido del servidor
let jugadoresActuales = [];     // Array de nombres de jugadores recibido del servidor
let casaSeleccionada = null;  // Nombre de la casa seleccionada por ESTE cliente (actualizado por el servidor)
let nombre = null;            // Nombre de ESTE cliente
let partida = null;           // ID de la partida
let clave = null;             // Clave de la partida
let esHost = false;           // Si este cliente es el host

// Array con la información de las casas (logos, etc.)
const casas = [
    { nombre: "Stark",     logo: "../imgs/logos/casas/stark.png" },
    { nombre: "Lannister", logo: "../imgs/logos/casas/lannister.png" },
    { nombre: "Targaryen", logo: "../imgs/logos/casas/targaryen.png" },
    { nombre: "Baratheon", logo: "../imgs/logos/casas/baratheon.png" },
    { nombre: "Greyjoy",   logo: "../imgs/logos/casas/greyjoy.png" },
    { nombre: "Martell",   logo: "../imgs/logos/casas/martell.png" },
    { nombre: "Tyrell",    logo: "../imgs/logos/casas/tyrell.png" },
    { nombre: "Arryn",     logo: "../imgs/logos/casas/arryn.png" },
    { nombre: "Tully",     logo: "../imgs/logos/casas/tully.png" }
  ];
// Hacemos accesible globalmente el array 'casas' para la función actualizarLista si es necesario
window.casas = casas;


// --- Funciones ---

function iniciarJuego() {
    if (!partida || !esHost) return; // Solo el host puede iniciar
    // Podríamos añadir una verificación extra aquí para asegurar que todos tienen casa
    console.log(`[Cliente ${nombre}] Intentando iniciar juego en ${partida} con casas:`, casasActuales);
    socket.emit('iniciar-juego', { partida }); // Solo necesita el ID, el servidor tiene las casas
}

function configurarDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    partida = params.get('partida');
    clave = params.get('clave');
    let nombreDesdeURL = params.get('nombre');
    esHost = params.get('host') === 'true';

    if (nombreDesdeURL) {
        nombre = nombreDesdeURL;
        localStorage.setItem('nombreJugador', nombre); // Guarda/Actualiza en localStorage
    } else {
        nombre = localStorage.getItem('nombreJugador'); // Intenta recuperar de localStorage si no vino en URL
    }

    // Actualizar título de la partida en la UI
    if (partida) {
        document.getElementById('partida-nombre').innerText = `Partida: ${partida}`;
    } else {
         // Manejar caso sin ID de partida? Redirigir?
         console.error("Error: No se encontró ID de partida en la URL.");
         alert("Error: Falta el identificador de la partida.");
         window.location.href = 'index.html'; // Redirigir a inicio
         return false; // Indicar que la configuración falló
    }

    return true; // Configuración OK
}

function manejarVisibilidadInicial() {
    if (!nombre) {
        // No hay nombre ni en URL ni en localStorage -> Mostrar form para pedirlo
        document.getElementById('form-nombre').style.display = 'block';
        document.getElementById('lobby').style.display = 'none';
    } else {
        // Hay nombre -> Ocultar form y conectar al lobby
        document.getElementById('form-nombre').style.display = 'none';
        conectarAlLobby();
    }
}

function unirse() {
  const inputNombreElement = document.getElementById('nombre');
  const inputNombre = inputNombreElement.value.trim();
  if (!inputNombre) {
      alert('Por favor, ingresa tu nombre para unirte.');
      return;
  }
  nombre = inputNombre; // Actualiza la variable global
  localStorage.setItem('nombreJugador', nombre); // Guarda en localStorage

  // Actualizar URL sin recargar
  const nuevaURL = new URL(window.location);
  nuevaURL.searchParams.set('nombre', nombre);
  // No necesitamos añadir clave aquí si ya estaba en la URL original
  window.history.replaceState({}, '', nuevaURL);

  // Ocultar form y conectar
  document.getElementById('form-nombre').style.display = 'none';
  conectarAlLobby();
}

function conectarAlLobby() {
  // Validar que tenemos los datos necesarios
  if (!nombre || !partida) {
      console.error("Intento de conexión sin nombre o partida");
      alert("Error: Falta nombre o identificador de partida. Volviendo al inicio.");
      window.location.href = 'index.html';
      return;
  }

  // Mostrar el lobby y configurar link de invitación
  document.getElementById('lobby').style.display = 'block';
  const linkInput = document.getElementById('link-invitacion');
  const urlInvitacion = new URL(window.location);
  urlInvitacion.searchParams.delete('nombre'); // Quitar nombre personal
  urlInvitacion.searchParams.delete('host');   // Quitar flag de host
  linkInput.value = urlInvitacion.toString();

  // Renderizar las opciones de casas (aún sin saber cuáles están ocupadas)
  renderizarCasas();

  // Emitir evento para unirse (el servidor responderá con el estado actual)
  console.log(`[Cliente ${nombre}] Emitiendo 'unirse-partida' a ${partida}`);
  socket.emit('unirse-partida', { nombre, partida, clave }); // Clave puede ser null/undefined si no aplica
}

function copiarLink() {
  const input = document.getElementById('link-invitacion');
  input.select();
  input.setSelectionRange(0, 99999); // Para móviles
  try {
    // Usar API del portapapeles (más moderna y segura)
    navigator.clipboard.writeText(input.value).then(() => {
        alert("¡Link copiado al portapapeles!");
    }).catch(err => {
        console.error('Error al copiar con Clipboard API:', err);
        // Fallback por si falla la API moderna
        document.execCommand("copy");
        alert("¡Link copiado al portapapeles! (método fallback)");
    });
  } catch (err) {
      console.error('Fallback execCommand falló:', err);
      alert("No se pudo copiar el link automáticamente. Por favor, cópialo manualmente.");
  }
}

function renderizarCasas() {
  const contenedor = document.getElementById('casas-container');
  contenedor.innerHTML = ''; // Limpiar antes de renderizar

  casas.forEach(c => {
    const divCasa = document.createElement('div');
    divCasa.className = 'casa';
    divCasa.dataset.casa = c.nombre; // Guardar nombre para identificar

    const imgLogo = document.createElement('img');
    imgLogo.src = c.logo;
    imgLogo.alt = `Logo ${c.nombre}`;
    divCasa.appendChild(imgLogo);

    const nombreDiv = document.createElement('div');
    nombreDiv.textContent = c.nombre;
    nombreDiv.style.marginTop = '5px';
    divCasa.appendChild(nombreDiv);

    // Añadir listener de clic
    divCasa.addEventListener('click', () => {
        // Permitir clic solo si no está deshabilitada
        if (!divCasa.classList.contains('disabled')) {
            seleccionarCasa(c.nombre);
        }
    });
    contenedor.appendChild(divCasa);
  });

  // Aplicar estado visual inicial (basado en `casasActuales` si ya se recibió)
  actualizarVisualizacionCasas();
}


function seleccionarCasa(nombreCasa) {
    // Usar la variable global 'nombre'
    if (!nombre) {
        console.error("No se puede seleccionar casa: nombre de jugador no definido.");
        alert("Error: Tu nombre no está definido.");
        return;
    }

    // Comprobar si se está deseleccionando
    if (casaSeleccionada === nombreCasa) {
      console.log(`[Cliente ${nombre}] Deseleccionando ${nombreCasa}`);
      socket.emit('quitar-casa', { partida, nombre });
      // No actualizamos 'casaSeleccionada' aquí, esperamos confirmación del servidor
    } else {
      // Seleccionando una nueva casa (o la primera)
      console.log(`[Cliente ${nombre}] Seleccionando ${nombreCasa}. (Casa previa local: ${casaSeleccionada})`);
      // Enviamos la casa que queremos, el servidor validará y asignará
      socket.emit('elegir-casa', { partida, nombre, casa: nombreCasa });
      // No actualizamos 'casaSeleccionada' aquí, esperamos confirmación
    }
    // La actualización visual (`.selected`/`.disabled`) se hará en `actualizarVisualizacionCasas`
    // cuando llegue la confirmación del servidor vía 'casas-actualizadas'.
}

// --- *** FUNCIÓN CORREGIDA *** ---
// Actualiza las clases CSS (.selected, .disabled) de las casas
function actualizarVisualizacionCasas() {
    const contenedor = document.getElementById('casas-container');
    if (!contenedor) return; // Salir si el contenedor no existe

    // --- USA LAS VARIABLES GLOBALES ---
    // 'nombre' es el nombre de este cliente.
    // 'casaSeleccionada' es la casa que este cliente tiene asignada SEGÚN EL SERVIDOR (actualizada en 'casas-actualizadas').
    // 'casasActuales' es el objeto { jugador: casa } recibido del servidor.
    // --- FIN VARIABLES GLOBALES ---

    if (!nombre) {
        console.warn("actualizarVisualizacionCasas: 'nombre' no está definido para este cliente.");
        // Podríamos deshabilitar todas las casas si no hay nombre? O simplemente no hacer nada.
        return;
    }

    // Iterar sobre cada div de casa en el HTML
    Array.from(contenedor.children).forEach(div => {
      const nombreCasaDiv = div.dataset.casa; // El nombre de la casa que este div representa
      div.classList.remove('selected', 'disabled'); // Limpiar estado previo
      div.style.cursor = 'pointer'; // Resetear cursor
      div.title = ''; // Limpiar tooltip

      // Encontrar quién tiene esta casa según el estado del servidor
      let ocupante = null;
      for (const jugador in casasActuales) {
          if (casasActuales[jugador] === nombreCasaDiv) {
              ocupante = jugador;
              break;
          }
      }

      // --- APLICAR ESTILOS ---
      if (ocupante) {
          // La casa está ocupada
          if (ocupante === nombre) {
              // Ocupada POR MÍ (según el servidor) -> Marcar como seleccionada
              div.classList.add('selected');
              // console.log(`Aplicando 'selected' a ${nombreCasaDiv} para ${nombre}`);
          } else {
              // Ocupada POR OTRO -> Marcar como deshabilitada
              div.classList.add('disabled');
              div.style.cursor = 'not-allowed';
              div.title = `Ocupada por ${ocupante}`;
              // console.log(`Aplicando 'disabled' a ${nombreCasaDiv} (ocupada por ${ocupante})`);
          }
      } else {
          // La casa está libre -> No añadir 'selected' ni 'disabled', es clickeable
      }
    });

    // --- Lógica del Botón de Jugar (Host) ---
    if (esHost) {
        const totalJugadores = jugadoresActuales.length;
        const jugadoresConCasa = Object.keys(casasActuales).length;
        const botonJugar = document.getElementById('boton-jugar');
        if (!botonJugar) return; // Salir si el botón no existe

        // Mostrar botón si hay jugadores y TODOS tienen casa asignada
        if (totalJugadores > 0 && totalJugadores === jugadoresConCasa) {
          botonJugar.style.display = 'inline-block';
        } else {
          botonJugar.style.display = 'none';
        }
    }
}
// --- *** FIN FUNCIÓN CORREGIDA *** ---


// Actualiza la lista de nombres de jugadores
function actualizarLista(listaJugadores, estadoCasas) {
    const listaUL = document.getElementById('lista-jugadores');
    if (!listaUL) return; // Salir si la lista no existe
    listaUL.innerHTML = ''; // Limpiar lista

    if (!Array.isArray(listaJugadores)) {
        console.error("Error: 'listaJugadores' no es un array.", listaJugadores);
        return;
    }

    listaJugadores.forEach(nombreJugador => {
      const li = document.createElement('li');
      li.dataset.nombre = nombreJugador;

      // Añadir nombre
      li.appendChild(document.createTextNode(`${nombreJugador} – `));

      const casaAsignada = estadoCasas[nombreJugador]; // Casa asignada a este jugador

      if (casaAsignada) {
          // Buscar info (logo) en el array global 'casas'
          const casaInfo = window.casas.find(c => c.nombre === casaAsignada);

          if (casaInfo && casaInfo.logo) {
              // Crear y añadir logo
              const logoImg = document.createElement('img');
              logoImg.src = casaInfo.logo;
              logoImg.alt = casaAsignada;
              logoImg.classList.add('jugador-casa-logo'); // Clase para CSS
              li.appendChild(logoImg);
          }
          // Añadir nombre de la casa
          li.appendChild(document.createTextNode(` ${casaAsignada}`));
      } else {
          // Si no hay casa asignada
          const textoSinCasa = document.createElement('span');
          textoSinCasa.textContent = '(Eligiendo casa...)';
          textoSinCasa.style.fontStyle = 'italic';
          textoSinCasa.style.opacity = '0.7';
          li.appendChild(textoSinCasa);
      }
      listaUL.appendChild(li);
    });
}


// --- Listeners de Socket.IO ---

socket.on('connect', () => {
    console.log(`[Cliente ${nombre || 'Desconocido'}] Conectado al servidor con ID: ${socket.id}`);
    // Si ya teníamos datos (ej. tras recargar), intentar volver a unirse
    if (nombre && partida) {
        console.log(`[Cliente ${nombre}] Reconectando/Reuniendo a la partida ${partida}`);
        socket.emit('unirse-partida', { nombre, partida, clave });
    }
});

socket.on('disconnect', (reason) => {
    console.warn(`[Cliente ${nombre}] Desconectado del servidor: ${reason}`);
    alert("Te has desconectado del servidor. Intenta recargar la página o vuelve al inicio.");
    // Podrías intentar una reconexión automática o mostrar un mensaje más persistente
    // Si la desconexión es permanente, quizás redirigir:
    // window.location.href = 'index.html?error=disconnected';
});

socket.on('error', (mensaje) => {
  console.error(`[Cliente ${nombre}] Error recibido del servidor: ${mensaje}`);
  alert(`Error: ${mensaje}`);
  // Considerar si siempre redirigir o depende del error
  // if (mensaje.includes("partida no existe") || mensaje.includes("Contraseña incorrecta")) {
  //     window.location.href = 'index.html';
  // }
});

// Recibe la lista actualizada de jugadores en la sala
socket.on('jugadores-actualizados', (listaJugadores) => {
  console.log("[Cliente] Recibido 'jugadores-actualizados':", listaJugadores);
  jugadoresActuales = listaJugadores; // Actualiza variable global
  actualizarLista(jugadoresActuales, casasActuales); // Actualiza la UI de la lista
  actualizarVisualizacionCasas(); // Re-evaluar botón jugar si cambia número de jugadores
});

// Recibe el estado actualizado de las casas asignadas
socket.on('casas-actualizadas', (casasRecibidas) => {
    console.log("[Cliente] Recibido 'casas-actualizadas':", casasRecibidas);
    casasActuales = casasRecibidas; // Actualiza estado global de casas

    // --- ACTUALIZACIÓN CRÍTICA ---
    // Actualiza la variable global 'casaSeleccionada' para ESTE cliente
    // basado en la información recibida del servidor.
    casaSeleccionada = casasActuales[nombre] || null;
    // --- FIN ACTUALIZACIÓN CRÍTICA ---

    // (Opcional) Sincronizar localStorage para persistencia al recargar
    if (casaSeleccionada) {
        localStorage.setItem(`casaDe-${nombre}`, casaSeleccionada);
    } else {
        localStorage.removeItem(`casaDe-${nombre}`);
    }

    // Actualizar ambas partes de la UI que dependen de las casas
    actualizarLista(jugadoresActuales, casasActuales); // Lista de jugadores (con logos)
    actualizarVisualizacionCasas();                   // Grid de selección de casas (.selected/.disabled)
});

// Redirige al juego cuando el servidor lo indica
socket.on('juego-iniciado', (casasDelJuego) => {
    console.log("[Cliente] Recibido 'juego-iniciado'. Casas:", casasDelJuego);
    // Guardar estado global para la pantalla de juego (si es necesario)
    // localStorage.setItem('casasGlobales', JSON.stringify(casasDelJuego)); // ¿Realmente necesario si ya tenemos localStorage.casaDe-nombre?

    // Asegurarse de tener los datos para la URL
    const miNombre = nombre;
    const miCasa = casaSeleccionada; // Usar la variable actualizada

    if (miNombre && miCasa && partida) {
        console.log(`[Cliente ${miNombre}] Redirigiendo a juego.html...`);
        window.location.href = `juego.html?nombre=${encodeURIComponent(miNombre)}&casa=${encodeURIComponent(miCasa)}&partida=${encodeURIComponent(partida)}`;
    } else {
        console.error("[Cliente] No se pudo redirigir a juego.html: faltan datos.", { miNombre, miCasa, partida });
        alert("Error al iniciar el juego. Faltan datos.");
    }
});

// --- Inicialización al Cargar la Página ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Cliente] DOM Cargado. Configurando desde URL...");
    if (configurarDesdeURL()) {
        // Si la configuración fue exitosa, decidir si mostrar form o conectar
        manejarVisibilidadInicial();
    }
    // Si configurarDesdeURL falla (ej. sin ID de partida), ya habrá redirigido.
});