const socket = io('http://192.168.1.133:3000');

let casasActuales = {};
let jugadoresActuales = [];



const casas = [
    { nombre: "Stark", emoji: "🐺" },
    { nombre: "Lannister", emoji: "🦁" },
    { nombre: "Targaryen", emoji: "🐉" },
    { nombre: "Baratheon", emoji: "🦌" },
    { nombre: "Greyjoy", emoji: "🐙" },
    { nombre: "Martell", emoji: "🌞" },
    { nombre: "Tyrell", emoji: "🌹" },
    { nombre: "Arryn", emoji: "🦅" },
    { nombre: "Tully", emoji: "🐟" }
  ];

function iniciarJuego() {
    socket.emit('iniciar-juego', { partida, casas: casasActuales });
  }
  //Inicia la partida
  socket.on('juego-iniciado', (casas) => {
    // Crear estructura: { nombre: { casa, ready: false } }
    const enriched = {};
    for (const [nombre, casa] of Object.entries(casas)) {
      enriched[nombre] = {
        casa,
        ready: false
      };
    }
  
    localStorage.setItem('casasGlobales', JSON.stringify(enriched));
  
    // Redirigir al juego
    const casa = localStorage.getItem(`casaDe-${nombre}`);
    window.location.href = `juego.html?nombre=${nombre}&casa=${casa}&partida=${partida}`;

  });

  const params = new URLSearchParams(window.location.search);
  const partida = params.get('partida');
  const clave = params.get('clave');
  let nombre = params.get('nombre');
  
  localStorage.setItem('nombreJugador', nombre); // 👈 AÑADIDO AQUÍ
  
  let casaSeleccionada = null;

const esHost = params.get('host') === 'true';
document.getElementById('partida-nombre').innerText = `Partida: ${partida}`;

if (!nombre) {
  document.getElementById('form-nombre').style.display = 'block';
} else {
  conectarAlLobby();
}

function unirse() {
  const input = document.getElementById('nombre').value;
  if (!input) return alert('Pon tu nombre pa entrar');
  nombre = input;

  const nuevaURL = `?partida=${partida}&clave=${clave}&nombre=${nombre}`;
  window.history.replaceState({}, '', nuevaURL);

  document.getElementById('form-nombre').style.display = 'none';
  conectarAlLobby();
}

function conectarAlLobby() {
  socket.emit('unirse-partida', { nombre, partida, clave });
  document.getElementById('lobby').style.display = 'block';
  const linkInput = document.getElementById('link-invitacion');
  linkInput.value = `${window.location.origin}/lobby.html?partida=${partida}&clave=${clave}&nombre=${nombre}`;
  renderizarCasas();
}

function copiarLink() {
  const input = document.getElementById('link-invitacion');
  input.select();
  input.setSelectionRange(0, 99999);
  document.execCommand("copy");
  alert("¡Link copiado al portapapeles!");
}

function renderizarCasas() {
  const contenedor = document.getElementById('casas-container');
  contenedor.innerHTML = '';
  casas.forEach(c => {
    const div = document.createElement('div');
    div.className = 'casa';
    div.dataset.casa = c.nombre;
    div.innerHTML = `<div style="font-size: 40px">${c.emoji}</div><div>${c.nombre}</div>`;
    div.addEventListener('click', () => seleccionarCasa(c.nombre));
    contenedor.appendChild(div);
  });
}

function seleccionarCasa(casa) {
    if (casaSeleccionada === casa) {
      socket.emit('quitar-casa', { partida, nombre });
      casaSeleccionada = null;
      localStorage.removeItem(`casaDe-${nombre}`);
    } else {
      casaSeleccionada = casa;
      socket.emit('elegir-casa', { partida, nombre, casa });
  
      // 🔥 SOLO GUARDO CUANDO YO CLICO
      localStorage.setItem(`casaDe-${nombre}`, casa);
      localStorage.setItem('nombreJugador', nombre);
    }
const url = new URL(window.location.href);
url.searchParams.set('casa', casa); // actualiza la URL visible
window.history.replaceState({}, '', url); // sin recargar
}



socket.on('jugadores-actualizados', (jugadores) => {
  jugadoresActuales = jugadores;
  actualizarLista(jugadoresActuales, casasActuales);

  if (esHost) {
    const totalJugadores = jugadoresActuales.length;
    const totalConCasa = Object.keys(casasActuales).length;
    const botonJugar = document.getElementById('boton-jugar');
    if (totalJugadores > 0 && totalJugadores === totalConCasa) {
      botonJugar.style.display = 'inline-block';
    } else {
      botonJugar.style.display = 'none';
    }
  }
});

socket.on('casas-actualizadas', (casas) => {
    casasActuales = casas;
  
    actualizarLista(jugadoresActuales, casas);

    const contenedor = document.getElementById('casas-container');
    Array.from(contenedor.children).forEach(div => {
      const casa = div.dataset.casa;
      div.classList.remove('selected', 'disabled');
  
      if (casa === casaSeleccionada) {
        div.classList.add('selected');
      } else if (Object.values(casas).includes(casa)) {
        div.classList.add('disabled');
      }
    });
  
    if (esHost) {
      const totalJugadores = jugadoresActuales.length;
      const totalConCasa = Object.keys(casas).length;
      const botonJugar = document.getElementById('boton-jugar');
      if (totalJugadores > 0 && totalJugadores === totalConCasa) {
        botonJugar.style.display = 'inline-block';
      } else {
        botonJugar.style.display = 'none';
      }
    }
  });

  function actualizarLista(jugadores, casas) {
    const lista = document.getElementById('lista-jugadores');
    lista.innerHTML = '';
    jugadores.forEach(nombreJugador => {
      const li = document.createElement('li');
      li.dataset.nombre = nombreJugador;
  
      const casa = casas[nombreJugador];
      const emoji = emojiDeCasa(casa);
      li.textContent = casa ? `${nombreJugador} – ${emoji} ${casa}` : `${nombreJugador} – sin casa`;
  
      lista.appendChild(li);
    });
  }

function emojiDeCasa(casa) {
  const emojis = {
    Stark: "🐺",
    Lannister: "🦁",
    Targaryen: "🐉",
    Baratheon: "🦌",
    Greyjoy: "🐙",
    Martell: "🌞",
    Tyrell: "🌹",
    Arryn: "🦅",
    Tully: "🐟"
  };
  return emojis[casa] || "";
}

socket.on('error', (mensaje) => {
  alert(mensaje);
  window.location.href = 'index.html';
});