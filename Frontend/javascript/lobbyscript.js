const socket = io('http://localhost:3000'); // O tu IP/URL del servidor

// --- Variables Globales del Script ---
let casasActuales = {};       // Estado { jugador: casa } recibido del servidor
let jugadoresActuales = [];     // Array [nombre1, nombre2] recibido del servidor
let casaSeleccionadaLocalmente = null; // Casa que ESTE cliente *cree* tener seleccionada
let nombre = null;            // Nombre de ESTE cliente
let partida = null;           // ID de la partida
let clave = null;             // Clave de la partida
let esHost = false;           // Si este cliente es el host

// Array con la información de las casas
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
window.casas = casas; // Hacer accesible globalmente para actualizarLista

// --- Funciones ---

function iniciarJuego() {
    if (!partida || !esHost) return;
    console.log(`[Cliente ${nombre}] Intentando iniciar juego en ${partida}`);
    socket.emit('iniciar-juego', { partida });
}

function configurarDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    partida = params.get('partida');
    clave = params.get('clave');
    let nombreDesdeURL = params.get('nombre');
    esHost = params.get('host') === 'true';

    if (nombreDesdeURL) {
        nombre = nombreDesdeURL;
        localStorage.setItem('nombreJugador', nombre);
    } else {
        nombre = localStorage.getItem('nombreJugador');
    }

    if (partida) {
        document.getElementById('partida-nombre').innerText = `Partida: ${partida}`;
    } else {
         console.error("Error: No se encontró ID de partida en la URL.");
         alert("Error: Falta el identificador de la partida.");
         window.location.href = 'index.html';
         return false;
    }
    return true;
}

function manejarVisibilidadInicial() {
    if (!nombre) {
        document.getElementById('form-nombre').style.display = 'block';
        document.getElementById('lobby').style.display = 'none';
    } else {
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
  nombre = inputNombre;
  localStorage.setItem('nombreJugador', nombre);

  const nuevaURL = new URL(window.location);
  nuevaURL.searchParams.set('nombre', nombre);
  window.history.replaceState({}, '', nuevaURL);

  document.getElementById('form-nombre').style.display = 'none';
  conectarAlLobby();
}

function conectarAlLobby() {
  if (!nombre || !partida) {
      console.error("Intento de conexión sin nombre o partida");
      alert("Error: Falta nombre o identificador de partida. Volviendo al inicio.");
      window.location.href = 'index.html';
      return;
  }

  document.getElementById('lobby').style.display = 'block';
  const linkInput = document.getElementById('link-invitacion');
  const urlInvitacion = new URL(window.location);
  urlInvitacion.searchParams.delete('nombre');
  urlInvitacion.searchParams.delete('host');
  linkInput.value = urlInvitacion.toString();

  renderizarCasas();

  console.log(`[Cliente ${nombre}] Emitiendo 'unirse-partida' a ${partida}`);
  socket.emit('unirse-partida', { nombre, partida, clave });
}

function copiarLink() {
  const input = document.getElementById('link-invitacion');
  input.select();
  input.setSelectionRange(0, 99999);
  try {
    navigator.clipboard.writeText(input.value).then(() => {
        alert("¡Link copiado al portapapeles!");
    }).catch(err => {
        console.warn('Fallback a document.execCommand por error en Clipboard API:', err);
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
  contenedor.innerHTML = '';

  casas.forEach(c => {
    const divCasa = document.createElement('div');
    divCasa.className = 'casa';
    divCasa.dataset.casa = c.nombre;

    const imgLogo = document.createElement('img');
    imgLogo.src = c.logo;
    imgLogo.alt = `Logo ${c.nombre}`;
    divCasa.appendChild(imgLogo);

    const nombreDiv = document.createElement('div');
    nombreDiv.textContent = c.nombre;
    nombreDiv.style.marginTop = '5px';
    divCasa.appendChild(nombreDiv);

    divCasa.addEventListener('click', () => {
        if (!divCasa.classList.contains('disabled')) {
            seleccionarCasa(c.nombre);
        }
    });
    contenedor.appendChild(divCasa);
  });
  actualizarVisualizacionCasas(); // Aplicar estado visual inicial
}

// --- SELECCIONAR CASA: Modificado para usar la variable local 'casaSeleccionadaLocalmente' ---
function seleccionarCasa(nombreCasa) {
    if (!nombre) {
        console.error("No se puede seleccionar casa: nombre de jugador no definido.");
        alert("Error: Tu nombre no está definido.");
        return;
    }

    // Comprobar si se está deseleccionando la casa actualmente seleccionada *localmente*
    if (casaSeleccionadaLocalmente === nombreCasa) {
      console.log(`[Cliente ${nombre}] Emitiendo deselección de ${nombreCasa}`);
      socket.emit('quitar-casa', { partida, nombre });
      casaSeleccionadaLocalmente = null; // Actualiza estado local inmediatamente (optimista)
    } else {
      // Seleccionando una nueva casa
      console.log(`[Cliente ${nombre}] Emitiendo selección de ${nombreCasa}`);
      socket.emit('elegir-casa', { partida, nombre, casa: nombreCasa });
      casaSeleccionadaLocalmente = nombreCasa; // Actualiza estado local inmediatamente (optimista)
    }
    // La actualización visual final se hará cuando llegue 'casas-actualizadas'
    actualizarVisualizacionCasas(); // Actualiza la UI localmente de forma optimista
}

// --- ACTUALIZAR VISUALIZACIÓN CASAS: Sin cambios lógicos, usa variables globales ---
function actualizarVisualizacionCasas() {
    const contenedor = document.getElementById('casas-container');
    if (!contenedor || !nombre) return;

    // Usa 'casasActuales' (del servidor) y 'nombre' (local)
    Array.from(contenedor.children).forEach(div => {
      const nombreCasaDiv = div.dataset.casa;
      div.classList.remove('selected', 'disabled');
      div.style.cursor = 'pointer';
      div.title = '';

      let ocupante = null;
      for (const jugador in casasActuales) {
          if (casasActuales[jugador] === nombreCasaDiv) {
              ocupante = jugador;
              break;
          }
      }

      if (ocupante) {
          if (ocupante === nombre) { // Ocupada por MÍ (según el servidor)
              div.classList.add('selected');
              // Sincronizar estado local si difiere (por si hubo desync)
              if (casaSeleccionadaLocalmente !== nombreCasaDiv) {
                  console.log(`Sync local: ${nombre} ahora tiene ${nombreCasaDiv}`);
                  casaSeleccionadaLocalmente = nombreCasaDiv;
              }
          } else { // Ocupada por OTRO
              div.classList.add('disabled');
              div.style.cursor = 'not-allowed';
              div.title = `Ocupada por ${ocupante}`;
          }
      } else {
           // Libre: quitar 'selected' si la tenía localmente pero el servidor no confirma
           if (casaSeleccionadaLocalmente === nombreCasaDiv) {
               console.log(`Sync local: ${nombre} ya no tiene ${nombreCasaDiv}`);
               casaSeleccionadaLocalmente = null;
           }
      }
    });

    // Lógica del Botón de Jugar (Host)
    if (esHost) {
        const totalJugadores = jugadoresActuales.length;
        const jugadoresConCasa = Object.keys(casasActuales).length;
        const botonJugar = document.getElementById('boton-jugar');
        if (!botonJugar) return;

        if (totalJugadores > 0 && totalJugadores === jugadoresConCasa) {
          botonJugar.style.display = 'inline-block';
        } else {
          botonJugar.style.display = 'none';
        }
    }
}

// --- ACTUALIZAR LISTA JUGADORES: Sin cambios lógicos ---
function actualizarLista(listaJugadores, estadoCasas) {
    const listaUL = document.getElementById('lista-jugadores');
    if (!listaUL) return;
    listaUL.innerHTML = '';

    if (!Array.isArray(listaJugadores)) {
        console.error("Error: 'listaJugadores' no es un array.", listaJugadores);
        return;
    }

    listaJugadores.forEach(nombreJugador => {
      const li = document.createElement('li');
      li.dataset.nombre = nombreJugador;
      li.appendChild(document.createTextNode(`${nombreJugador} – `));

      const casaAsignada = estadoCasas[nombreJugador];

      if (casaAsignada) {
          const casaInfo = window.casas.find(c => c.nombre === casaAsignada);
          if (casaInfo && casaInfo.logo) {
              const logoImg = document.createElement('img');
              logoImg.src = casaInfo.logo;
              logoImg.alt = casaAsignada;
              logoImg.classList.add('jugador-casa-logo');
              li.appendChild(logoImg);
          }
          li.appendChild(document.createTextNode(` ${casaAsignada}`));
      } else {
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
    if (nombre && partida) {
        console.log(`[Cliente ${nombre}] Reconectando/Reuniendo a la partida ${partida}`);
        socket.emit('unirse-partida', { nombre, partida, clave });
    }
});

socket.on('disconnect', (reason) => {
    console.warn(`[Cliente ${nombre}] Desconectado del servidor: ${reason}`);
    alert("Te has desconectado del servidor. Intenta recargar la página.");
});

socket.on('error', (mensaje) => {
  console.error(`[Cliente ${nombre}] Error recibido del servidor: ${mensaje}`);
  alert(`Error: ${mensaje}`);
   if (mensaje.includes("partida no existe") || mensaje.includes("Contraseña incorrecta") || mensaje.includes("llena")) {
       window.location.href = 'index.html'; // Redirigir si el error es crítico para unirse
   }
});

socket.on('jugadores-actualizados', (listaJugadores) => {
  console.log("[Cliente] Recibido 'jugadores-actualizados':", listaJugadores);
  jugadoresActuales = listaJugadores; // Actualiza variable global
  actualizarLista(jugadoresActuales, casasActuales);
  actualizarVisualizacionCasas(); // Re-evaluar botón jugar
});

socket.on('casas-actualizadas', (casasRecibidas) => {
    console.log("[Cliente] Recibido 'casas-actualizadas':", casasRecibidas);
    casasActuales = casasRecibidas; // Actualiza estado global de casas
    // Actualizar la UI
    actualizarLista(jugadoresActuales, casasActuales);
    actualizarVisualizacionCasas();
});

socket.on('juego-iniciado', ({ gameState }) => { // Recibe el gameState inicial
    console.log("[Cliente] Recibido 'juego-iniciado'. Redirigiendo...");
    // Ya no necesitamos guardar en localStorage aquí, el juego pedirá el estado al servidor
    const miNombre = nombre;
    const miCasa = casasActuales[nombre]; // Obtener la casa confirmada por el servidor

    if (miNombre && miCasa && partida) {
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
        manejarVisibilidadInicial();
    }
});