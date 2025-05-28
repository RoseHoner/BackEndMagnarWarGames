// =============================
//  Configuración de conexión
// =============================
const isLocalhost = window.location.hostname === 'localhost';
// URL del backend: usa localhost en desarrollo o Railway en producción
const BACKEND_URL = isLocalhost
  ? 'http://localhost:3000'
  : 'https://backendmagnarwargames-production.up.railway.app';

const socket = io(BACKEND_URL, {
  path: '/socket.io',
  transports: ['websocket']
});

// =============================
//     Estado global del Lobby
// =============================
let casasActuales = {};              // { jugador: casa } según servidor
let jugadoresActuales = [];           // [nombre1, nombre2, ...]
let casaSeleccionadaLocalmente = null;// casa elegida optimistamente por este cliente
let nombre = null;                    // nombre de este jugador
let partida = null;                   // ID de la partida extraído de la URL
let esHost = false;                   // si este cliente es el host

// =====================================
//  Definición de las casas disponibles
// =====================================
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
// Exponer globalmente para funciones de actualización de UI
window.casas = casas;

// =============================
//     Funciones principales
// =============================

// Inicia el juego (solo host)
function iniciarJuego() {
  if (!partida || !esHost) return;
  // Guardar casa seleccionada en localStorage
  const miCasa = casasActuales[nombre];
  localStorage.setItem('casaJugador', miCasa);
  // Emitir evento para arrancar la partida en el servidor
  socket.emit('iniciar-juego', { partida });
  console.log(`[Cliente ${nombre}] Iniciando juego en ${partida}`);
}

// Extrae el ID de partida y nombre guardado de la URL/localStorage
function configurarDesdeURL() {
  const segmentos = window.location.pathname.split('/');
  const idx = segmentos.indexOf('lobby');
  partida = (idx !== -1 && segmentos[idx + 1]) || null;

  if (partida) {
    document.getElementById('partida-nombre').innerText = `Partida: ${partida}`;
  } else {
    alert("Error: Falta el identificador de la partida.");
    window.location.href = 'index.html';
    return false;
  }

  // Recuperar nombre guardado en localStorage (si existe)
  nombre = localStorage.getItem('nombreJugador') || null;
  return true;
}

// Decide si mostrar el formulario de nombre o conectar al lobby directamente
function manejarVisibilidadInicial() {
  if (!nombre) {
    document.getElementById('form-nombre').style.display = 'block';
    document.getElementById('lobby').style.display = 'none';
  } else {
    document.getElementById('form-nombre').style.display = 'none';
    conectarAlLobby();
  }
}

// Valida el nombre ingresado y emite 'comprobar-nombre' antes de unirse
function unirse() {
  const intento = document.getElementById('nombre').value.trim();
  if (!intento) {
    alert('Por favor ingresa tu nombre.');
    return;
  }
  socket.emit('comprobar-nombre', { partida, nombre: intento }, ({ exists }) => {
    if (exists) {
      alert('Ese nombre ya está en uso. Elige otro.');
    } else {
      nombre = intento;
      localStorage.setItem('nombreJugador', nombre);
      window.history.replaceState({}, '', `/lobby/${partida}`);
      document.getElementById('form-nombre').style.display = 'none';
      conectarAlLobby();
    }
  });
}

// Muestra el lobby, genera QR y emite 'unirse-partida'
function conectarAlLobby() {
  if (!nombre || !partida) {
    alert("Error: Falta nombre o ID de partida.");
    window.location.href = 'index.html';
    return;
  }

  // Mostrar sección de lobby
  document.getElementById('lobby').style.display = 'block';

  // Preparar link de invitación
  const linkInput = document.getElementById('link-invitacion');
  const url = `${window.location.origin}/lobby/${partida}`;
  linkInput.value = url;

  // Generar código QR pequeño
  const qrContainer = document.getElementById('qr-code');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: url,
    width: 128,
    height: 128,
    correctLevel: QRCode.CorrectLevel.H
  });

  renderizarCasas();
  socket.emit('unirse-partida', { nombre, partida });
}

// Copia el link de invitación al portapapeles
function copiarLink() {
  const input = document.getElementById('link-invitacion');
  input.select();
  navigator.clipboard.writeText(input.value)
    .then(() => alert("¡Link copiado!"))
    .catch(() => {
      document.execCommand("copy");
      alert("¡Link copiado! (fallback)");
    });
}

// Dibuja todas las casas disponibles en el contenedor
function renderizarCasas() {
  const cont = document.getElementById('casas-container');
  cont.innerHTML = '';
  casas.forEach(c => {
    const div = document.createElement('div');
    div.className = 'casa';
    div.dataset.casa = c.nombre;
    div.innerHTML = `<img src="${c.logo}" alt="Logo ${c.nombre}"><div>${c.nombre}</div>`;
    div.addEventListener('click', () => {
      if (!div.classList.contains('disabled')) seleccionarCasa(c.nombre);
    });
    cont.appendChild(div);
  });
  actualizarVisualizacionCasas();
}

// Gestiona la selección/deselección de casa (optimista)
function seleccionarCasa(nombreCasa) {
  if (!nombre) {
    alert("Error interno: nombre no definido.");
    return;
  }
  if (casaSeleccionadaLocalmente === nombreCasa) {
    socket.emit('quitar-casa', { partida, nombre });
    casaSeleccionadaLocalmente = null;
  } else {
    socket.emit('elegir-casa', { partida, nombre, casa: nombreCasa });
    casaSeleccionadaLocalmente = nombreCasa;
    localStorage.setItem('casaJugador', nombreCasa);
  }
  actualizarVisualizacionCasas();
}

// Actualiza clases CSS de cada casa y controla el botón "Empezar partida"
function actualizarVisualizacionCasas() {
  const cont = document.getElementById('casas-container');
  Array.from(cont.children).forEach(div => {
    const nc = div.dataset.casa;
    div.classList.remove('selected', 'disabled');
    div.title = '';
    // Comprobar ocupación según casasActuales
    const ocupante = Object.keys(casasActuales)
      .find(j => casasActuales[j] === nc);
    if (ocupante) {
      if (ocupante === nombre) {
        div.classList.add('selected');
        casaSeleccionadaLocalmente = nc;
      } else {
        div.classList.add('disabled');
        div.title = `Ocupada por ${ocupante}`;
      }
    }
  });

  // Mostrar botón "Empezar partida" solo al host cuando todos tengan casa
  if (esHost) {
    const btn = document.getElementById('boton-jugar');
    const todos = jugadoresActuales.length === Object.keys(casasActuales).length
                 && jugadoresActuales.length > 0;
    btn.style.display = todos ? 'inline-block' : 'none';
  }
}

// Reconstruye la lista de jugadores con sus casas (logos)
function actualizarLista(listaJugadores, estadoCasas) {
  const ul = document.getElementById('lista-jugadores');
  ul.innerHTML = '';
  listaJugadores.forEach(j => {
    const li = document.createElement('li');
    li.textContent = j + ' – ';
    const casa = estadoCasas[j];
    if (casa) {
      const info = casas.find(c => c.nombre === casa);
      if (info) {
        const img = document.createElement('img');
        img.src = info.logo;
        img.alt = casa;
        img.className = 'jugador-casa-logo';
        li.appendChild(img);
      }
      li.append(` ${casa}`);
    } else {
      const span = document.createElement('span');
      span.textContent = '(Eligiendo casa...)';
      span.style.fontStyle = 'italic';
      li.appendChild(span);
    }
    ul.appendChild(li);
  });
}

// =============================
//   Listeners de Socket.IO
// =============================
socket.on('connect', () => {
  console.log(`[Cliente ${nombre||'?' }] Conectado como ${socket.id}`);
  if (nombre && partida) {
    socket.emit('unirse-partida', { nombre, partida });
  }
});

socket.on('disconnect', reason => {
  alert("Desconectado del servidor: " + reason);
});

socket.on('error', msg => {
  alert("Error: " + msg);
  if (/partida no existe|llena/.test(msg)) window.location.href = 'index.html';
});

socket.on('partida-cerrada', () => {
  alert("El host cerró la partida.");
  window.location.href = '/';
});

socket.on('host-info', hostName => {
  esHost = (nombre === hostName);
  actualizarVisualizacionCasas();
});

socket.on('jugadores-actualizados', lista => {
  jugadoresActuales = lista;
  actualizarLista(jugadoresActuales, casasActuales);
  actualizarVisualizacionCasas();
});

socket.on('casas-actualizadas', nuevas => {
  casasActuales = nuevas;
  actualizarLista(jugadoresActuales, casasActuales);
  actualizarVisualizacionCasas();
});

socket.on('juego-iniciado', () => {
  localStorage.setItem('casaJugador', casaSeleccionadaLocalmente);
  window.location.href = `${window.location.origin}/juego/${partida}`;
});

// =============================
// Inicialización al cargar DOM
// =============================
document.addEventListener('DOMContentLoaded', () => {
  if (configurarDesdeURL()) manejarVisibilidadInicial();
});

// =============================
//   Gestión del modal QR
// =============================
// Al hacer clic sobre el QR pequeño, abrir versión grande
document.addEventListener('click', e => {
  if (e.target.closest('#qr-code')) {
    const qrG = document.getElementById('qr-grande');
    qrG.innerHTML = '';
    new QRCode(qrG, {
      text: `${window.location.origin}/lobby/${partida}`,
      width: 256,
      height: 256,
      correctLevel: QRCode.CorrectLevel.H
    });
    document.getElementById('qr-modal').style.display = 'flex';
  }
});
// Cerrar modal al pulsar la X
document.querySelector('#qr-modal .close').addEventListener('click', () => {
  document.getElementById('qr-modal').style.display = 'none';
});
