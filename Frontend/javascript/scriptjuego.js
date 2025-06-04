const isLocalhost = window.location.hostname === 'localhost';
const BACKEND_URL = isLocalhost
  ? 'http://localhost:3000'
  : 'https://backendmagnarwargames-production.up.railway.app';


// =============================================
// PARTE 1: INICIALIZACIÓN Y GLOBALES
// =============================================
let modoReclutarNorte = false; // false = reclutar normal, true = reclutar para el norte (Stark)
let levasStarkUsadas = false;
let contadorVerificarRumoresInciales = 0;

window.refuerzoTullyConfirmado = false;

let alianzaDeSangrePendiente = false;

let barcosPerdidosPendientes = 0;
let transferenciasBarcos = [];



let contadorAccionesNorte = 0;
let tropasPerdidas = 0;
let territoriosPerdidos = [];
let nuevoPropietarioPorTerritorio = {};
let perdidasPorUnidad = {};

let inicialYaConfirmado = false;
let modalInicialYaMostrado = false;

window.esAtaqueNorteStark = false;

let jinetesPendientes = 0;
let ataquePendiente = null;

const TODAS_LAS_CASAS = [
  "Stark", "Tully", "Arryn", "Lannister", "Tyrell",
  "Baratheon", "Martell", "Targaryen", "Greyjoy"
];

// mapear nombre de edificio → nombre de fichero PNG
const iconosEdificio = {
  'Granja':    'ic_granja.png',
  'Cantera':   'ic_cantera.png',
  'Mina':      'ic_mina.png',
  'Aserradero':'ic_aserra.png',
  'Castillo':  'ic_castillo.png',
  'Puerto':    'ic_puerto.png',
  'Taller de maquinaria de asedio': 'ic_talle_maq.png',
  'Atalayas':  'ic_atalaya.png',
  'Academia de Caballería': 'ic_acadedmia_cab.png',
  'Armeria':    'ic_armeria.png',
  'Arqueria':    'ic_arqueria.png',
  'Foso':    'ic_foso.png',
  'Puerto Fluvial':    'ic_puerto_fluvial.png',
  'Septo':    'ic_septo.png',
};


const RUMORES_POR_CASA = {
  Stark: ["Camino del Silencio", "Aliento de los Antiguos", "Cornamenta de Skagos"],
  Tully: ["Juramento sin Estandartes", "Lluvia de Roble", "Ecos de Harren el Negro"],
  Targaryen: ["Acero y Juramento", "Fuego Heredado", "Alianza de Sangre"],
  Greyjoy: ["Madera del Abismo", "Rey de los Mares", "Trono de Viejo Wyck"],
  Martell: ["Corsarios del Mediodía", "Mercancía de Sombras", "El Portador del Alba"],
  Tyrell: ["Diezmo de la Abundancia", "Caballeros de la Rosa", "Levantamiento del Pueblo"],
  Baratheon: ["Caza del Venado Blanco", "Martillos de Tormenta", "Llama de R'hllor"],
  Lannister: ["Renacer de Reyne", "Sombras Doradas", "Cetro del León"],
  Arryn: ["Tributo de la Luna", "Alas del Valle", "Roca de los Titanes"]
};


// ─── PARÁMETROS desde PATH y localStorage ───
const segments = window.location.pathname.split('/');
const partida  = segments[segments.length - 1];
const nombre   = localStorage.getItem('nombreJugador');
const casa     = localStorage.getItem('casaJugador');

if (!partida || !nombre || !casa) {
  alert("Error: Faltan datos esenciales para iniciar el juego.");
  window.location.href = '/';
  throw new Error("Faltan datos esenciales para iniciar el juego.");
}



// --- Conexión Socket.IO ---
// Asegúrate de que esta IP/Puerto sea la correcta y accesible desde tus clientes
// Inicializa conexión con el servidor usando Socket.IO
const socket = io(BACKEND_URL, {
  path: '/socket.io',
  transports: ['websocket']
});





// --- Parámetros URL ---
// Extrae parámetros de la URL como partida, nombre y casa


// --- Estado Local del Juego (Reflejo del Servidor) ---
// Este objeto se llenará con los datos enviados por el servidor
// gameState guarda el estado actual del juego enviado por el servidor
let gameState = null;

// --- Constantes UI (Para cálculos en el cliente y poblar selects) ---
// Costos base de cada unidad o edificio usados en la interfaz del cliente
const COSTOS_BASE_UI = {
    regulares: 4,
    barco: 20,
    barcocorsario: 25,
    torre: 20,
    catapulta: 20,
    escorpion: 20,
    sacerdote: 20,
    mercenario: 8,
    mercenarioElite: 15,
    granja: 20,
    cantera: 20,
    mina: 20,
    aserradero: 20,
    castillo: 30,
    puerto: 30,
    'foso': 40,
    'taller de maquinaria de asedio': 30, // Corresponde al value en HTML
    // Facciones (Nombres DEBEN coincidir con los `value` en HTML y lógica backend)
    'Academia de Caballería': 20, // Arryn
    'Atalayas': 40, // Arryn
    'Armería': 30, // Lannister
    'Arquería': 30, // Tully
    'Septo': 50, // Tyrell
    'Puerto Fluvial': 30, // Tully
    'caballero': 10, // Arryn (Reclutable con Academia)
    'sacerdoteLuz': 20, // Baratheon (Reclutable)
    'sacerdoteSal': 20,
    // Añadir costos base para otras unidades reclutables de facción si aplica
};
const EDIFICIOS_PRODUCCION = ['Granja', 'Cantera', 'Mina', 'Aserradero'];
// Nombres usados en HTML para máquinas de asedio (para calcular descuentos)
const MAQUINAS_ASEDIO_UI_VALUES = ['torreAsedio', 'catapulta', 'escorpion'];

const LIMITE_SOLDADOS_POR_CASA = {
    Stark: 7,
    Lannister: 9,
    Targaryen: 6,
    Baratheon: 8,
    Tully: 7,
    Martell: 5,
    Tyrell: 12,
    Arryn: 7,
    Greyjoy: 7
    // Puedes ajustar estos valores por casa según quieras
  };


  // Lista de capitales
const CAPITALES = ["Invernalia", "Rocadragón", "Desembarco del Rey", "Aguasdulces", "Lanza del Sol", "El Nido de Águilas", "Altojardín", "Roca Casterly", "Pyke"];


const territoriosOriginalesGreyjoy = ["Pyke", "Harlaw", "Monte Orca", "Gran Wyk"];

// Función que calcula el límite de reclutamiento de Greyjoy
function calcularLimiteGreyjoy(territoriosJugador) {
  let limite = 7;
  for (const t of territoriosJugador) {
    if (!territoriosOriginalesGreyjoy.includes(t.nombre)) {
      if (t.edificios.includes("Castillo")) {
        limite += 2;
      } else {
        limite += 1;
      }
    }
  }
  return limite;
}

function poblarRumoresIniciales() {
  const selectRumor = document.getElementById('select-rumor-inicial');
  if (!selectRumor) return;

  selectRumor.innerHTML = `<option value="">-- Ninguno --</option>`; // opción por defecto

  const rumores = RUMORES_POR_CASA[casa] || [];
  rumores.forEach(rumor => {
    const option = document.createElement('option');
    option.value = rumor;
    option.textContent = rumor;
    selectRumor.appendChild(option);
  });
}

function poblarRumoresInicialesArryn() {
  const selectRumor = document.getElementById('select-rumor-inicial-arryn');
  if (!selectRumor) return;

  selectRumor.innerHTML = `<option value="">-- Ninguno --</option>`; // opción por defecto

  const rumores = RUMORES_POR_CASA[casa] || [];
  rumores.forEach(rumor => {
    const option = document.createElement('option');
    option.value = rumor;
    option.textContent = rumor;
    selectRumor.appendChild(option);
  });
}

function poblarRumoresInicialesTyrell() {
  const selectRumor = document.getElementById('select-rumor-inicial-tyrell');
  if (!selectRumor) return;

  selectRumor.innerHTML = `<option value="">-- Ninguno --</option>`; // opción por defecto

  const rumores = RUMORES_POR_CASA[casa] || [];
  rumores.forEach(rumor => {
    const option = document.createElement('option');
    option.value = rumor;
    option.textContent = rumor;
    selectRumor.appendChild(option);
  });
}


function mostrarReemplazoJinete() {
  if (jinetesPendientes > 0) {
    document.getElementById("modal-reemplazar-jinete").style.display = "block";
  }
}

function confirmarReemplazoJinete(reponer) {
  document.getElementById("modal-reemplazar-jinete").style.display = "none";
  if (reponer) {
    socket.emit("targaryen-reponer-jinete", { partida, nombre });
  }

  jinetesPendientes--;
  if (jinetesPendientes > 0) {
    mostrarReemplazoJinete()
  } else if (ataquePendiente) {
    // Emitimos el ataque después de completar los reemplazos
    socket.emit('ataque-simple-doble', ataquePendiente);

    if (ataquePendiente.esAtaqueNorteStark) {
      incrementarContadorNorte();
      window.esAtaqueNorteStark = false;
    }

    if (casa === "Arryn") {
      abrirModal('modal-caballero-batalla-arryn');
    }

    ataquePendiente = null; // limpiamos
  }
}



function mostrarModalRumoresCasa() {
  const lista = document.getElementById('lista-rumores-casa');
  lista.innerHTML = '';

  const rumores = RUMORES_POR_CASA[casa] || [];
  rumores.forEach(rumor => {
    const li = document.createElement('p');
    li.textContent = `• ${rumor}`;
    li.style.marginBottom = '6px';
    lista.appendChild(p);
  });

  abrirModal('modal-rumores-casa');
}

function renderizarRumoresDesbloqueados() {
  const contenedor = document.getElementById("lista-rumores");
  contenedor.innerHTML = "";

  if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) return;

  const jugador = gameState.jugadores[nombre];
  const casaJugador = jugador.casa;
  const desbloqueados = jugador.rumoresDesbloqueados || [];
  const rumoresCasa = RUMORES_POR_CASA[casaJugador] || [];

  desbloqueados.forEach(r => {
    if (rumoresCasa.includes(r)) {
      const li = document.createElement("li");
      li.textContent = `${r} ✅`;
      contenedor.appendChild(li);
    }
  });
}

function confirmarReclutarMurcielagos() {
  const cantidad = parseInt(document.getElementById("cantidad-murcielagos").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("tully-reclutar-murcielagos", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-murcielagos").style.display = "none";
}

function confirmarReclutarCaballerosTully() {
  const cantidad = parseInt(document.getElementById("cantidad-caballeros-tully").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("tully-reclutar-caballeros", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-caballeros-tully").style.display = "none";
}











  let turnoReorganizarUsado = null;
  let accionReorganizarUsado = null;

  

// =============================================
// PARTE 2: DEFINICIÓN DE FUNCIONES
// =============================================

function renderizarModalPerdidasDefensor() {
  const contenedor = document.getElementById('lista-perdidas-defensor');
  contenedor.innerHTML = '';

  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador) return;

  const unidades = [
    { key: 'tropas', nombre: 'Tropas' },
    { key: 'tropasBlindadas', nombre: 'Tropas con Armadura' },
    { key: 'mercenarios', nombre: 'Mercenarios' },
    { key: 'elite', nombre: 'Mercenarios de élite' },
    { key: 'barcos', nombre: 'Barcos' },
    { key: 'catapulta', nombre: 'Catapultas' },
    { key: 'torre', nombre: 'Torres de Asedio' },
    { key: 'escorpion', nombre: 'Escorpiones' },
    { key: 'caballero', nombre: 'Caballeros' },
    { key: 'sacerdotes', nombre: 'Sacerdotes' },
    { key: 'dragones', nombre: 'Dragones' },
    { key: 'jinete', nombre: 'Jinetes' },
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' },
    { key: 'kraken', nombre: 'Kraken'},
    { key: 'huargos', nombre: 'Huargos'},
    { key: 'unicornios', nombre: 'Unicornios'},
    { key: 'murcielagos', nombre: 'Murciélagos' },
    { key: 'guardiareal', nombre: 'Guardia Real' },
    { key: 'barcolegendario', nombre: 'Barco Legendario'},
    { key: 'tritones', nombre: 'Tritones'},
    { key: 'barcocorsario', nombre: 'Barco Corsario'},
    { key: 'venadosblancos', nombre: 'Venados Blancos'},
    { key: 'martilladores', nombre: 'Martilladores'},
    { key: 'caballerosdelarosa', nombre: 'Caballeros de la Rosa'},
    { key: 'guardiadelalba', nombre: 'Guardia del Alba'},
    { key: 'sacerdotizaroja', nombre: 'Sacerdotiza Roja'},
    { key: 'barbaros', nombre: 'Barbaros'},
    { key: 'caballerosdelaguila', nombre: 'Caballeros del Aguila'},
    { key: 'sacerdoteSal', nombre: 'SacerdoteSal' },
  ];

  unidades.forEach(({ key, nombre }) => {
  const cantidad = jugador[key] ?? 0;
  if (cantidad > 0) {
    const div = document.createElement('div');
    div.classList.add('campo-formulario');

    // Texto personalizado para Tritones
    const labelText = key === 'tritones'
      ? '¿Cuántos Tritones Tienes ahora? 🧜‍♂️'
      : `${nombre} (Tienes ${cantidad}):`;

    div.innerHTML = `
      <label for="perdidas-def-${key}">${labelText}</label>
      <input type="number" id="perdidas-def-${key}" min="0" max="${cantidad}" value="0" style="width: 100%;">
    `;
    contenedor.appendChild(div);
  }
});


if (casa === "Tully" && gameState.jugadores?.[nombre] && !gameState.jugadores?.[nombre].refuerzoTullyUsadoEsteTurno && !window.refuerzoTullyConfirmado) {

  abrirModal('modal-refuerzos-tully');
  return;
}


  abrirModal('modal-perdidas-defensor');
}

function confirmarRefuerzosTully(acepta) {
  cerrarModal('modal-refuerzos-tully');
  window.refuerzoTullyConfirmado = true;

  if (acepta) {
    const jugador = gameState.jugadores?.[nombre];
    if (jugador) {
      jugador.caballero = (jugador.caballero || 0) + 3;
      jugador.arquero = (jugador.arquero || 0) + 1;
      actualizarUnidadesMilitares();
      socket.emit('refuerzos-tully', {
  partida,
  nombre
});
    }
  }



  renderizarModalPerdidasDefensor();
}


function renderizarModalPerdidasAtaque(jugadorData) {
  const contenedor = document.getElementById('lista-perdidas-ataque');
  contenedor.innerHTML = '';

  const unidades = [
    { key: 'tropas', nombre: 'Tropas' },
    { key: 'tropasBlindadas', nombre: 'Tropas con armadura' },
    { key: 'mercenarios', nombre: 'Mercenarios' },
    { key: 'elite', nombre: 'Mercenarios de élite' },
    { key: 'barcos', nombre: 'Barcos' },
    { key: 'catapulta', nombre: 'Catapultas' },
    { key: 'torre', nombre: 'Torres de asedio' },
    { key: 'escorpion', nombre: 'Escorpiones' },
    { key: 'caballero', nombre: 'Caballeros' },
    { key: 'sacerdotes', nombre: 'Sacerdotes' },
    { key: 'dragones', nombre: 'Dragones' },
    { key: 'jinete', nombre: 'Jinetes' },
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' },
    { key: 'kraken', nombre: 'Kraken'},
    { key: 'huargos', nombre: 'Huargos'},
    { key: 'unicornios', nombre: 'Unicornios'},
    { key: 'murcielagos', nombre: 'Murciélagos' },
    { key: 'guardiareal', nombre: 'Guardia Real' },
    { key: 'barcolegendario', nombre: 'Barco Legendario'},
    { key: 'tritones', nombre: 'Tritones'},
    { key: 'barcocorsario', nombre: 'Barco Corsario'},
    { key: 'venadosblancos', nombre: 'Venados Blancos'},
    { key: 'martilladores', nombre: 'Martilladores'},
    { key: 'caballerosdelarosa', nombre: 'Caballeros de la Rosa'},
    { key: 'guardiadelalba', nombre: 'Guardia del Alba'},
    { key: 'sacerdotizaroja', nombre: 'Sacerdotiza Roja'},
    { key: 'barbaros', nombre: 'Barbaros'},
    { key: 'caballerosdelaguila', nombre: 'Caballeros del Aguila'},
    { key: 'sacerdoteSal', nombre: 'SacerdoteSal' },


  ];

  unidades.forEach(({ key, nombre }) => {
  const cantidad = jugadorData[key] ?? 0;
  if (cantidad > 0) {
    const div = document.createElement('div');
    div.classList.add('campo-formulario');

    const labelText = key === 'tritones'
      ? '¿Cuántos Tritones Tienes ahora? 🧜‍♂️'
      : `${nombre} (Tienes ${cantidad}):`;

    div.innerHTML = `
      <label for="perdida-${key}">${labelText}</label>
      <input type="number" id="perdida-${key}" min="0" max="${cantidad}" value="0" style="width: 100%;">
    `;
    contenedor.appendChild(div);
  }
});


  abrirModal('modal-perdidas-ataque');
}

function renderizarInputsPerdidasRevuelta() {
  const contenedor = document.getElementById('lista-perdidas-revuelta');
  contenedor.innerHTML = '';

  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador) return;

  const unidades = [
  { key: 'tropas', nombre: 'Tropas normales' },
  { key: 'mercenarios', nombre: 'Mercenarios' },
  { key: 'elite', nombre: 'Mercenarios de élite' },
  { key: 'caballeros', nombre: 'Caballeros' },
  { key: 'huargos', nombre: 'Huargos' },
  { key: 'unicornios', nombre: 'Unicornios' },
  { key: 'murcielagos', nombre: 'Murciélagos' },
  { key: 'guardiareal', nombre: 'Guardia Real' },
  { key: 'tritones', nombre: 'Tritones' },
  { key: 'venadosblancos', nombre: 'Venados Blancos' },
  { key: 'martilladores', nombre: 'Martilladores' },
  { key: 'caballerosdelarosa', nombre: 'Caballeros de la Rosa' },
  { key: 'guardiadelalba', nombre: 'Guardia del Alba' },
  { key: 'barcos', nombre: 'Barcos' },
  { key: 'barcolegendario', nombre: 'Barco Legendario' },
  { key: 'jinete', nombre: 'Jinetes' },
  { key: 'dragon', nombre: 'Dragones' },
  { key: 'barbaros', nombre: 'Barbaros'},
  { key: 'caballerosdelaguila', nombre: 'Caballeros del Aguila'},
];
 // Usa el mismo array de unidades
  unidades.forEach(({ key, nombre }) => {
    const cantidad = jugador[key] ?? 0;
    if (cantidad > 0) {
      const div = document.createElement('div');
      div.classList.add('campo-formulario');
      div.innerHTML = `
        <label for="perdida-${key}">${nombre} (Tienes ${cantidad}):</label>
        <input type="number" id="perdida-${key}" min="0" max="${cantidad}" value="0" style="width: 100%;">
      `;
      contenedor.appendChild(div);
    }
  });
}


function renderizarInputsPerdidas() {
  const contenedor = document.getElementById('lista-perdidas-por-unidad');
  contenedor.innerHTML = '';

  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador) return;

  const unidades = [
    { key: 'tropas', nombre: 'Tropas' },
    { key: 'tropasBlindadas', nombre: 'Tropas con armadura' },
    { key: 'mercenarios', nombre: 'Mercenarios' },
    { key: 'elite', nombre: 'Mercenarios de élite' },
    { key: 'barcos', nombre: 'Barcos' },
    { key: 'catapulta', nombre: 'Catapultas' },
    { key: 'torre', nombre: 'Torres de asedio' },
    { key: 'escorpion', nombre: 'Escorpiones' },
    { key: 'caballero', nombre: 'Caballeros' },
    { key: 'sacerdotes', nombre: 'Sacerdotes' },
    { key: 'dragones', nombre: 'Dragones' },
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' },
    { key: 'jinete', nombre: 'Jinetes' },
    { key: 'kraken', nombre: 'Kraken' },
    { key: 'huargos', nombre: 'Huargos' },
    { key: 'unicornios', nombre: 'Unicornios' },
    { key: 'murcielagos', nombre: 'Murciélagos' },
    { key: 'guardiareal', nombre: 'Guardia Real' },
    { key: 'barcolegendario', nombre: 'Barco Legendario' },
    { key: 'tritones', nombre: 'Tritones' },
    { key: 'barcocorsario', nombre: 'Barco Corsario' },
    { key: 'venadosblancos', nombre: 'Venados Blancos' },
    { key: 'martilladores', nombre: 'Martilladores' },
    { key: 'caballerosdelarosa', nombre: 'Caballeros de la Rosa' },
    { key: 'guardiadelalba', nombre: 'Guardia del Alba' },
    { key: 'sacerdotizaroja', nombre: 'Sacerdotiza Roja' },
    { key: 'barbaros', nombre: 'Bárbaros' },
    { key: 'caballerosdelaguila', nombre: 'Caballeros del Águila' },
    { key: 'sacerdoteSal', nombre: 'SacerdoteSal' },
  ];

  unidades.forEach(({ key, nombre }) => {
    const cantidad = jugador[key] ?? 0;
    if (cantidad <= 0) return;

    // Texto personalizado para Tritones
    const labelText = key === 'tritones'
      ? '¿Cuántos Tritones Tienes ahora? 🧜‍♂️'
      : `${nombre} (Tienes ${cantidad}):`;

    const div = document.createElement('div');
    div.classList.add('campo-formulario');
    div.innerHTML = `
      <label for="perdidas-${key}">${labelText}</label>
      <input 
        type="number" 
        id="perdidas-${key}" 
        min="0" 
        max="${cantidad}" 
        value="0" 
        style="width: 100%;"
      >
    `;
    contenedor.appendChild(div);
  });
}



function elegirAsedioGratis(tipo) {
  if (!["catapulta", "torre", "escorpion"].includes(tipo)) return;
  // Emitimos al servidor
  socket.emit('recompensa-asedio', { partida, nombre, tipo });
  // Actualizamos localmente (para no tener que esperar al round-trip)
  const jugador = gameState.jugadores[nombre];
  jugador[tipo] = (jugador[tipo] || 0) + 1;
  actualizarUnidadesMilitares();
  cerrarModal('modal-elegir-asedio');
}

  

function getListaCasasPosibles() {
    return [
      "Stark", "Lannister", "Baratheon", "Targaryen", "Tully",
      "Martell", "Tyrell", "Greyjoy", "Arryn", "Bolton", "Frey"
    ];
  }
  

// --- Funciones de Actualización de UI ---
function actualizarUnidadesMilitares() {
    const lista = document.getElementById('lista-unidades-jugador');
    if (!lista || !gameState || !gameState.jugadores?.[nombre]) return;

    const jugador = gameState.jugadores[nombre];
    lista.innerHTML = ''; // Limpiamos la lista

    const unidadesBasicas = [
      { tipo: 'tropas', nombre: 'Tropa', icono: 'ic_tropa.png' },
      { tipo: 'tropasBlindadas', nombre: 'Tropa con Armadura', icono: 'ic_tropa_armour.png' },
      { tipo: 'mercenarios', nombre: 'Mercenario', icono: 'ic_mercenarios.png' },
      { tipo: 'elite', nombre: 'Mercenario de élite', icono: 'ic_mercenarios_elite.png' },
      { tipo: 'militantesFe', nombre: 'Militante de la Fe', icono: 'ic_militante.png' },
      { tipo: 'arquero', nombre: 'Arquero', icono: 'ic_arqueros.png' },
      { tipo: 'jinete', nombre: 'Jinete', icono: 'ic_jinete_dragon.png' }, 
      { tipo: 'huevos', nombre: 'Huevo de Dragón', icono: 'ic_huevo.png' },
      { tipo: 'sacerdoteSal', nombre: 'Sacerdote de Sal', icono: 'ic_sacerdote_sal.png' },

    ];
    

unidadesBasicas.forEach(u => {
  const cantidad = jugador[u.tipo] || 0;
  if (cantidad > 0) {
    const li = document.createElement('li');
    li.innerHTML = `
      <img src="../imgs/iconos/unidades/${u.icono}" alt="${u.nombre}" style="width: 60px; height: 60px; vertical-align: middle; margin-right: 6px;">
      <span style="color: white;">${u.nombre} x${cantidad}</span>
    `;
    lista.appendChild(li);
  }
});


    const unidades = [
        { tipo: 'dragones', nombre: 'Dragón', icono: 'ic_dragon.png' },
        { tipo: 'barcos', nombre: 'Barco', icono: 'ic_barco.png' },
        { tipo: 'catapulta', nombre: 'Catapulta', icono: 'ic_catapulta.png' },
        { tipo: 'torre', nombre: 'Torre de Asedio', icono: 'ic_torre_asedio.png' },
        { tipo: 'escorpion', nombre: 'Escorpión', icono: 'ic_lanzavirotes.png' },
        { tipo: 'sacerdotes', nombre: 'Sacerdote de Luz', icono: 'ic_sacerdote_luz.png' },
        { tipo: 'caballero', nombre: 'Caballero', icono: 'ic_caballero.png' },
        { tipo: 'kraken', nombre: 'Kraken', icono: 'ic_kraken.png' },
        { tipo: 'huargos', nombre: 'Huargos', icono: 'ic_huargos.png'},
        { tipo: 'unicornios', nombre: 'unicornios', icono: 'ic_unicornio.png'},
        { tipo: 'murcielagos', nombre: 'murcielagos', icono: 'ic_murcielago.png'},
        { tipo: 'guardiareal', nombre: 'Guardia Real', icono: 'ic_guardia real.png' },
        { tipo: 'barcolegendario', nombre: 'Barco Legendario', icono: 'ic_barco_pirata.png'},
        { tipo: 'tritones', nombre: 'Tritones', icono:'ic_tritones.png'},
        { tipo: 'barcocorsario', nombre: 'Barco Corsario', icono:'ic_corsario.png'},
        { tipo: 'venadosblancos', nombre: 'Venados Blancos', icono:'ic_venado_blanco.png'},
        { tipo: 'martilladores', nombre: 'Martilladores', icono:'ic_martilladores.png'},
        { tipo: 'caballerosdelarosa', nombre: 'Caballeros de la Rosa', icono:'ic_cab_rosa.png'},
        { tipo: 'guardiadelalba', nombre: 'Guardia del Alba', icono:'ic_guardia_alba.png'},
        { tipo: 'sacerdotizaroja', nombre: 'Sacerdotiza Roja', icono:'ic_sacerdotisa_roja.png'},
        { tipo: 'barbaros', nombre: 'Barbaros', icono:'ic_barbaros.png'},
        { tipo: 'caballerosdelaguila', nombre: 'Caballeros del Aguila', icono:"ic_cab_aguila.png"},
        

    ];

    unidades.forEach(u => {
        const cantidad = jugador[u.tipo] || 0;
        if (cantidad > 0) {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="../imgs/iconos/unidades/${u.icono}" alt="${u.nombre}" style="width: 60px; height: 60px; vertical-align: middle; margin-right: 6px;">
                <span style="color: white;">${u.nombre} x${cantidad}</span>
            `;
            lista.appendChild(li);
        }
    });

    // Si no tiene ninguna, mostrar mensaje
    if (lista.children.length === 0) {
        const li = document.createElement('li');
        li.textContent = '(Sin unidades especiales)';
        li.style.color = '#ccc';
        li.style.fontSize = '0.85rem';
        lista.appendChild(li);
    }
}


// Actualiza la interfaz con la información del jugador (oro y tropas)
function actualizarInfoJugador() {
    if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) {
        console.warn("ActualizarInfoJugador: gameState o datos del jugador no disponibles.");
        document.getElementById('oro-jugador').style.display = 'none';
        document.getElementById('tropas-jugador').style.display = 'none';
        return;
    }
    const jugador = gameState.jugadores[nombre];
    const cantidadOroEl = document.getElementById('cantidad-oro');
    const oroJugadorDiv = document.getElementById('oro-jugador');

    if (cantidadOroEl) cantidadOroEl.textContent = jugador.oro ?? 0;
    if (oroJugadorDiv) oroJugadorDiv.style.display = 'flex';

    
}

function poblarSelectTyrellGranja() {
  const select = document.getElementById('select-tyrell-granja');
  if (!select) return;

  select.innerHTML = '<option value="">-- Selecciona --</option>';
  Object.values(gameState.territorios)
    .filter(t => t.propietario === "Tyrell")
    .forEach(t => {
      const option = document.createElement('option');
      option.value = t.nombre;
      option.textContent = t.nombre;
      select.appendChild(option);
    });
}

function poblarTerritoriosTyrell() {
  const select = document.getElementById('select-territorio-tecnologia');
  if (!select || !gameState?.territorios) return;

  select.innerHTML = '<option value="">-- Selecciona --</option>';
  Object.values(gameState.territorios)
    .filter(t => t.propietario === casa)
    .forEach(t => {
      const option = document.createElement('option');
      option.value = t.nombre;
      option.textContent = t.nombre;
      select.appendChild(option);
    });
}


// Muestra en pantalla el turno actual y el estado de la acción
function actualizarTurnoAccionUI() {
    if (!gameState) return;
    const turnoEl = document.getElementById('turno-jugador');
    const accionEl = document.getElementById('accion-jugador');

    const btnTorneo = document.getElementById('btn-organizar-torneo');
if (btnTorneo) {
  if (casa === "Arryn" && !gameState.jugadores?.[nombre]?.torneoUsadoEsteTurno) {
    btnTorneo.style.display = 'inline-block';
  } else {
    btnTorneo.style.display = 'none';
  }
}


    if (turnoEl) turnoEl.textContent = `Turno ${gameState.turno}`;
    if (accionEl) {
        const nombresAccion = ["Acción 1", "Acción 2", "Acción 3", "Fase Neutral"];
        accionEl.textContent = nombresAccion[gameState.accion - 1] || `Acción ${gameState.accion}`;
    }
  


     // Mostrar botones especiales de Lannister
const btnDoble = document.getElementById('btn-doble-impuestos');
const btnSobornar = document.getElementById('btn-sobornar-soldados');

if (btnDoble && btnSobornar) {
  if (casa === "Lannister") {
    btnDoble.style.display = 'inline-block';
    btnSobornar.style.display = 'inline-block';
  } else {
    btnDoble.style.display = 'none';
    btnSobornar.style.display = 'none';
  }
}

const btnSaqueo = document.getElementById('btn-saquear-greyjoy');
if (btnSaqueo) {
  if (casa === "Greyjoy") {
    btnSaqueo.style.display = 'inline-block';
  } else {
    btnSaqueo.style.display = 'none';
  }
}

const btnKraken = document.getElementById('btn-ritual-kraken-greyjoy');
 if (btnKraken) {
   const jugador = gameState.jugadores?.[nombre];
  // Solo mostrar si eres Greyjoy, tienes al menos un Sacerdote de Sal y aún no has invocado al kraken
   if (
     casa === "Greyjoy" &&
     (jugador?.sacerdoteSal || 0) > 0 &&
     (jugador?.kraken || 0) === 0
   ) {
     btnKraken.style.display = 'inline-block';
   } else {
     btnKraken.style.display = 'none';
   }
 }





const btnRevuelta = document.getElementById('btn-revuelta-campesina');
if (btnRevuelta) {
  const jugador = gameState.jugadores?.[nombre];
  const tieneRumor = jugador?.rumoresDesbloqueados?.includes("Levantamiento del Pueblo");
  const tieneSepto = Object.values(gameState.territorios || {}).some(
    t => t.propietario === "Tyrell" && t.edificios.includes("Septo")
  );
  btnRevuelta.style.display = (casa === "Tyrell" && tieneRumor && tieneSepto && !jugador?.revueltaTyrellUsadaEsteTurno)
    ? "inline-block" : "none";
}








const btnCasarse = document.getElementById('btn-casarse-targaryen');
if (btnCasarse) {
  const jugador = gameState.jugadores?.[nombre];
  if (casa === "Targaryen") {
    const textoCasadoExistente = document.getElementById('casado-texto-targaryen');
if (textoCasadoExistente) textoCasadoExistente.remove();

const jugador = gameState.jugadores?.[nombre];
if (casa === "Targaryen") {
  const texto = document.createElement('div');
  texto.id = 'casado-texto-targaryen';
  texto.style.color = 'white';
  texto.style.fontSize = '0.9rem';
  texto.style.marginTop = '6px';
  texto.style.textAlign = 'center';

  let contenido = '';
  if (jugador.casadoCon) {
    contenido += `💍 Casado con Casa ${jugador.casadoCon}`;
  }
  if (jugador.casamientoExtra) {
    if (contenido) contenido += '<br>';
    contenido += `💍 Casado Extra con Casa ${jugador.casamientoExtra}`;
  }

  if (contenido) {
    texto.innerHTML = contenido;
    btnCasarse.parentNode.insertBefore(texto, btnCasarse.nextSibling);
  }

  // Mostrar el botón solo si NO está casado normal
  btnCasarse.style.display = jugador.casadoCon ? 'none' : 'inline-block';
}

  }
}


const btnLevas = document.getElementById('btn-levas-stark');
const jugador = gameState?.jugadores?.[nombre];
if (btnLevas) {
  if (casa === "Stark" && !jugador?.levasStarkUsadas) {
    btnLevas.style.display = 'inline-block';
  } else {
    btnLevas.style.display = 'none';
  }
}









const btnTecnologia = document.getElementById('btn-obtener-tecnologia');
if (btnTecnologia) {
  const jugador = gameState.jugadores?.[nombre];
  if (casa === "Tyrell" && !jugador?.tecnologiaTyrellUsada) {
    btnTecnologia.style.display = 'inline-block';
  } else {
    btnTecnologia.style.display = 'none';
  }
}

// Mostrar Barco Corsario si es Martell con el rumor
const boxCorsario = document.getElementById('box-barcocorsario');

if (boxCorsario) {
  if (casa === "Martell" && jugador?.rumoresDesbloqueados?.includes("Corsarios del Mediodía")) {
    boxCorsario.style.display = 'flex';
  } else {
    boxCorsario.style.display = 'none';
  }
}


// Mostrar botones especiales de Stark
const esStark = casa === "Stark";

const btnStarkAtacar = document.getElementById('btn-stark-atacar');
const btnStarkMover = document.getElementById('btn-stark-mover');



if (esStark) {
  mostrarBotonesStark(); // los mostramos por defecto si es Stark


  btnStarkMover?.addEventListener('click', incrementarContadorNorte);
} else {
  ocultarBotonesStark(); // si no es Stark, asegurarse que no se vean
}

// Mostrar contador solo si es Stark
const divContador = document.getElementById("contador-stark");
const spanContador = document.getElementById("valor-contador-stark");

if (divContador && spanContador) {
  if (casa === "Stark") {
    divContador.style.display = 'block';
    spanContador.textContent = contadorAccionesNorte;
  } else {
    divContador.style.display = 'none';
  }
}

const selectDestino = document.getElementById("casaDestino");
if (selectDestino) {
  selectDestino.innerHTML = "";
  Object.values(gameState.jugadores || {}).forEach(j => {
    if (j.casa !== casa) {
      const op = document.createElement("option");
      op.value = j.casa;
      op.textContent = j.casa;
      selectDestino.appendChild(op);
    }
  });
}



}
function prepararOpcionesCasamientoNormal() {
  const select = document.getElementById("select-casa-matrimonio");
  const jugador = gameState.jugadores[nombre];

  const casaCasamientoExtra = jugador.casamientoExtra;

  // Resetear opciones
  select.innerHTML = `
    <option value="">-- Elige casa --</option>
    <option value="Velaryon">Casa Velaryon</option>
    <option value="Qoherys">Casa Qoherys</option>
    <option value="Celtigar">Casa Celtigar</option>
  `;

  // Si ya tiene casamiento extra, eliminar esa opción
  if (casaCasamientoExtra) {
    const option = select.querySelector(`option[value="${casaCasamientoExtra}"]`);
    if (option) option.remove();
  }
}

function prepararOpcionesCasamientoExtra() {
  const select = document.getElementById("select-casa-matrimonio-alianza");
  const jugador = gameState.jugadores[nombre];

  const casaCasadoNormal = jugador.casadoCon;

  // Resetear opciones
  select.innerHTML = `
    <option value="">-- Elige casa --</option>
    <option value="Velaryon">Casa Velaryon</option>
    <option value="Qoherys">Casa Qoherys</option>
    <option value="Celtigar">Casa Celtigar</option>
  `;

  // Si ya está casado normal, eliminar esa opción
  if (casaCasadoNormal) {
    const option = select.querySelector(`option[value="${casaCasadoNormal}"]`);
    if (option) option.remove();
  }
}

function confirmarTransferenciaOro() {
  const casaDestino = document.getElementById("casaDestino").value;
  const cantidad = parseInt(document.getElementById("cantidadOro").value);

  if (!casaDestino || isNaN(cantidad) || cantidad <= 0) {
    alert("Selecciona una casa válida y una cantidad de oro.");
    return;
  }

  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador || jugador.oro < cantidad) {
    alert("No tienes suficiente oro.");
    return;
  }

  socket.emit("transferencia-oro", {
    partida,
    nombre,
    casaDestino,
    cantidad
  });

  cerrarModal("modal-ofrecer-oro");
  cerrarModal("modal-ingresos");
}

function incrementarContadorNorte() {
  contadorAccionesNorte++;
  const spanContador = document.getElementById('valor-contador-stark');
  if (spanContador) {
    spanContador.textContent = contadorAccionesNorte;
  }

  console.log(contadorAccionesNorte,contadorAccionesNorte,contadorAccionesNorte,contadorAccionesNorte,contadorAccionesNorte,contadorAccionesNorte,contadorAccionesNorte,contadorAccionesNorte)
  // Ocultar los botones si el contador llega a 2
  if (contadorAccionesNorte >= 2) {
    document.getElementById('btn-stark-atacar').style.display = 'none'
    document.getElementById('btn-stark-mover').style.display = 'none'
  } else{
    mostrarBotonesStark()
  }

  
}

function ocultarBotonesStark() {
  document.getElementById('btn-stark-atacar').style.display = 'none'
  document.getElementById('btn-stark-mover').style.display = 'none'
}

function mostrarBotonesStark() {
  if ('Stark' == casa) {
    document.getElementById('btn-stark-atacar').style.display = 'flex'
  document.getElementById('btn-stark-mover').style.display = 'flex'
  }
  
}

function actualizarEdificiosJugador() {
  const lista = document.getElementById('lista-edificios-jugador');
  lista.innerHTML = '';
  const territoriosCasa = Object.values(gameState.territorios)
    .filter(t => t.propietario === casa && t.edificios?.length);

  if (!territoriosCasa.length) {
    lista.innerHTML = '<li style="color: #ccc; font-size: 0.9rem;">(Ningún edificio)</li>';
    return;
  }

  territoriosCasa.forEach(t => {
    const li = document.createElement('li');
    li.style.marginBottom = '10px';
    li.innerHTML = `
      <strong style="color: #66f;">${t.nombre}</strong>
      <ul style="margin: 5px 0 10px 15px;">
        ${t.edificios.map(ed => {
          const icono = iconosEdificio[ed] || 'default.png';
          return `
            <li style="font-size: 0.9rem;">
              <img
                src="../imgs/iconos/construcciones/${icono}"
                alt="${ed}"
                class="building-icon" style="width: 40px; height: 40px;"
              >
              ${ed}
            </li>
          `;
        }).join('')}
      </ul>
    `;
    lista.appendChild(li);
  });
}




function setLogoPorCasa(casaNombre) {
    const logoImgEl = document.getElementById('logo-casa');
    if (!logoImgEl) return console.error("[SetLogo] Elemento 'logo-casa' NO ENCONTRADO!");
    const logos = { Stark: '../imgs/logos/casas/stark.png', Lannister: '../imgs/logos/casas/lannister.png', Targaryen: '../imgs/logos/casas/targaryen.png', Baratheon: '../imgs/logos/casas/baratheon.png', Greyjoy: '../imgs/logos/casas/greyjoy.png', Martell: '../imgs/logos/casas/martell.png', Tyrell: '../imgs/logos/casas/tyrell.png', Arryn: '../imgs/logos/casas/arryn.png', Tully: '../imgs/logos/casas/tully.png' };
    const rutaLogo = logos[casaNombre];
    if (rutaLogo) {
        logoImgEl.src = rutaLogo; logoImgEl.alt = `Logo ${casaNombre}`; logoImgEl.style.display = 'block';
    } else { console.warn(`[UI] No logo for: ${casaNombre}`); logoImgEl.style.display = 'none'; }
}

function setFondoPorCasa(casaNombre) {
     const fondos = { Stark: 'url("../imgs/FondosCasas/stark.png")', Lannister: 'url("../imgs/FondosCasas/lannister.png")', Targaryen: 'url("../imgs/FondosCasas/targaryen.png")', Baratheon: 'url("../imgs/FondosCasas/baratheon.png")', Greyjoy: 'url("../imgs/FondosCasas/greyjoy.png")', Martell: 'url("../imgs/FondosCasas/martell.png")', Tyrell: 'url("../imgs/FondosCasas/tyrrel.png")', Arryn: 'url("../imgs/FondosCasas/arryn.png")', Tully: 'url("../imgs/FondosCasas/tully.png")' };
     const fondo = fondos[casaNombre] || 'url("../imgs/mapa/mapafinal.jpeg")';
     document.body.style.backgroundImage = fondo; document.body.style.backgroundSize = 'cover';
     document.body.style.backgroundPosition = 'center center'; document.body.style.backgroundRepeat = 'no-repeat';
}

// --- Funciones Modales Genéricas ---
function abrirModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) modalEl.style.display = 'block';
    else console.error(`Modal #${modalId} no encontrado.`);
}
function cerrarModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) modalEl.style.display = 'none';
}

// --- Funciones Lógica de Acciones y Botones ---

function terminarAccionEspecifica(tipoAccion) {
  if (!partida || !nombre || gameState?.fase === 'Neutral') return;

  console.log(`[${nombre}] Acción '${tipoAccion}' realizada.`);

  // Mostrar modal de espera y deshabilitar botones
  abrirModal('modal-espera-accion');
  deshabilitarBotonesAccion(true);

  // Emitir evento solo para mover o reorganizar
  if (tipoAccion === 'Mover/Atacar' || tipoAccion === 'Reorganizar' || tipoAccion === 'Construir2') {
    console.log(`Emitiendo 'accion-terminada' para ${tipoAccion}`);
    socket.emit('accion-terminada', { partida, nombre});
  }
}


function deshabilitarBotonesAccion(deshabilitar) {
     const container = document.getElementById('acciones-container');
     if(container) {
         const botones = container.querySelectorAll('.btn-accion-juego');
         botones.forEach(btn => btn.disabled = deshabilitar);
     }
     const botonPrincipal = document.getElementById('boton-accion');
     if(botonPrincipal) {
         // Solo deshabilitar el principal si la acción ha terminado o es fase neutral
         botonPrincipal.disabled = deshabilitar || gameState?.fase === 'Neutral' || gameState?.jugadoresAccionTerminada?.includes(nombre);
     }
}


// --- Lógica Modal Batalla ---
function poblarTerritoriosAtacables() {

  const ordenCasas = [
    "Stark", "Arryn", "Greyjoy", "Tully",
    "Lannister", "Tyrell", "Baratheon",
    "Martell", "Targaryen"
  ];

    if (!gameState || !gameState.territorios) return;
    const selectEl = document.getElementById('select-territorio-atacado');
    if (!selectEl) return console.error("Select territorios atacables no encontrado.");
    selectEl.innerHTML = '<option value="">-- Selecciona --</option>';
     Object.values(gameState.territorios)
    .filter(t => t.propietario && t.propietario !== casa)
    .sort((a, b) => {
      // 1) por índice de casa
      const ia = ordenCasas.indexOf(a.propietario);
      const ib = ordenCasas.indexOf(b.propietario);
      if (ia !== ib) return ia - ib;
      // 2) si es la misma casa, por nombre
      return a.nombre.localeCompare(b.nombre);
    })
    .forEach(t => {
      const option = new Option(
        `${t.nombre} (${t.propietario})`,
        t.nombre
      );
      selectEl.appendChild(option);
    });
}
function ajustarPerdidas(inputId, cantidad) {
    const input = document.getElementById(inputId);
    if (!input) return console.error(`Input ${inputId} no encontrado.`);
    let v = parseInt(input.value) || 0;
    v = Math.max(0, v + cantidad);
    input.value = v;
}
function confirmarBatalla() {
    const selectEl = document.getElementById('select-territorio-atacado');
    const inputAtacEl = document.getElementById('input-perdidas-atacante');
    const inputDefEl = document.getElementById('input-perdidas-defensor');
    const territorio = selectEl?.value;
    const resultado = document.querySelector('input[name="resultado-batalla"]:checked')?.value;
    const perdidasAtacante = parseInt(inputAtacEl?.value) || 0;
    const perdidasDefensor = parseInt(inputDefEl?.value) || 0;

    if (!territorio || !resultado || perdidasAtacante < 0 || perdidasDefensor < 0) {
        alert("Por favor, completa todos los campos de batalla correctamente.");
        return;
    }
    console.log(`[Batalla] Emitiendo: Atk:${nombre}(${casa}) -> ${territorio}, Res:${resultado}, PA:${perdidasAtacante}, PD:${perdidasDefensor}`);
    socket.emit('registrar-batalla', { partida, atacante: nombre, casaAtacante: casa, territorioAtacado: territorio, resultado, perdidasAtacante, perdidasDefensor });
    cerrarModal('modal-batalla');
}

// --- Lógica Modal Reclutar ---
function poblarTerritoriosReclutar() {
    if (!gameState || !gameState.territorios) return;
    selectEl.innerHTML = '<option value="">-- Selecciona --</option>';
    Object.values(gameState.territorios)
        .filter(t => t.propietario === casa)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(t => {
            selectEl.appendChild(new Option(t.nombre, t.nombre));
        });
    selectEl.value = ""; // Reset selection
    actualizarCostoReclutar(); // Reset/update cost
}
function poblarUnidadesReclutar() {
     if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) return;
     const jugador = gameState.jugadores[nombre];
     const selectUnidadEl = document.getElementById('select-unidad-reclutar');
     if (!selectUnidadEl) return console.error("Select unidades reclutar no encontrado.");

     // Limpiar opciones existentes excepto las básicas
     const basicas = ['regulares', 'mercenario', 'barco', 'torreAsedio', 'catapulta', 'escorpion'];
     Array.from(selectUnidadEl.options).forEach(option => {
         if (!basicas.includes(option.value)) option.remove();
     });

     if (factionOptionsAdded) {
         selectUnidadEl.appendChild(optgroupFaction);
     }

     selectUnidadEl.value = 'regulares'; // Reset selection
     actualizarCostoReclutar(); // Update cost
}
function ajustarCantidad(tipo, cambio) {
  if (!gameState?.jugadores?.[nombre]) return;

  const jugador = gameState.jugadores[nombre];
  const casaJugador = jugador.casa;
  let limite;

if (casaJugador === "Greyjoy") {
  const territoriosJugador = Object.values(gameState.territorios).filter(t => t.propietario === casaJugador);
  limite = calcularLimiteGreyjoy(territoriosJugador);
} else {
  limite = LIMITE_SOLDADOS_POR_CASA[casaJugador] ?? 5;
}


// Si está casado con Qoherys, subir el límite a 12
if (casaJugador === "Targaryen" && jugador.casadoCon === "Qoherys" || jugador.casamientoExtra === "Qoherys") {
  limite = 12;
}


  // Si es soldado, aplicar límite
  if (tipo === 'soldado') {
    const actual = cantidadesReclutas[tipo] ?? 0;
    const nuevoValor = actual + cambio;
    
    // 👇 Esto impide subir si ya estás en el límite
    if (nuevoValor > limite) return;
  }

  if (tipo === "armadura") {
    const maximo = gameState?.jugadores?.[nombre]?.tropas ?? 0;
    const actual = cantidadesReclutas[tipo] ?? 0;
    const nuevoValor = actual + cambio;
  
    if (nuevoValor > maximo) return; // No dejar superar
  }
  

  cantidadesReclutas[tipo] = Math.max(0, (cantidadesReclutas[tipo] ?? 0) + cambio);
  const el = document.getElementById(`cantidad-${tipo}`);
  if (el) el.textContent = cantidadesReclutas[tipo];
  actualizarCostoTotalRecluta();
}

function actualizarCostoReclutar() {
    if (!gameState || !gameState.territorios || !gameState.jugadores[nombre]) return;
    const jugador = gameState.jugadores[nombre];
    const selectTerritorioEl = document.getElementById('select-territorio-reclutar');
    const selectUnidadEl = document.getElementById('select-unidad-reclutar');
    const inputCantidadEl = document.getElementById('input-cantidad-reclutar');
    const costoValorEl = document.getElementById('costo-reclutar-valor');
    const limiteActualEl = document.getElementById('limite-reclutar-actual');
    const limiteMaximoEl = document.getElementById('limite-reclutar-maximo');
    const limiteInfoEl = document.getElementById('limite-reclutamiento-info');

    const nombreTerritorio = selectTerritorioEl.value;
    const tipoUnidadValue = selectUnidadEl.value; // 'regulares', 'barco', 'caballero', etc.
    const cantidad = parseInt(inputCantidadEl.value) || 1;
    const territorio = gameState.territorios[nombreTerritorio];

    if (!tipoUnidadValue || !territorio) {
        if(costoValorEl) costoValorEl.textContent = '--';
        if(limiteInfoEl) limiteInfoEl.style.display = 'none';
        return;
    }

// Costos base de cada unidad o edificio usados en la interfaz del cliente
    let costoUnitario = COSTOS_BASE_UI[tipoUnidadValue] ?? 0; // Obtener costo base
    let esMaquinaOBarco = tipoUnidadValue === 'barco' || MAQUINAS_ASEDIO_UI_VALUES.includes(tipoUnidadValue);

    // Calcular descuentos de edificios locales
    let descuento = 0;
    if (territorio.edificios.includes('Granja') && tipoUnidadValue === 'regulares') descuento = 1;
    else if (territorio.edificios.includes('Aserradero') && esMaquinaOBarco) descuento = 5;
// Costos base de cada unidad o edificio usados en la interfaz del cliente
    // Aplicar otros descuentos/costos específicos (ej. coste caballero Arryn ya está en COSTOS_BASE_UI)

    // Descuento adicional por rumor "Madera del Abismo" (Greyjoy)
// Rumor "Madera del Abismo" de los Greyjoy
if (
  tipoUnidadValue === "barco" &&
  jugador.casa === "Greyjoy" &&
  jugador.rumoresDesbloqueados?.includes("Madera del Abismo")
) {
  costoUnitario -= 10;
}



    const costoFinalUnitario = Math.max(0, costoUnitario - descuento);
    const costoTotal = costoFinalUnitario * cantidad;
    if(costoValorEl) costoValorEl.textContent = costoTotal;

    // Actualizar info límite
    const esMercenario = tipoUnidadValue === 'mercenario'; // Añadir elite si es diferente
    if (!esMercenario) {
        if(limiteActualEl) limiteActualEl.textContent = jugador.tropasReclutadasEsteTurno ?? 0;
        if(limiteMaximoEl) limiteMaximoEl.textContent = jugador.limiteReclutamientoBase ?? '?';
        if(limiteInfoEl) limiteInfoEl.style.display = 'block';
    } else {
         if (jugador.casa === 'Martell') {
              if(limiteActualEl) limiteActualEl.textContent = jugador.mercenariosReclutadosEsteTurno ?? 0; // Necesita estado backend
              if(limiteMaximoEl) limiteMaximoEl.textContent = '10';
              if(limiteInfoEl) limiteInfoEl.style.display = 'block';
         } else {
              if(limiteInfoEl) limiteInfoEl.style.display = 'none';
         }
    }
}
function confirmarReclutar() {
    const territorio = document.getElementById('select-territorio-reclutar').value;
    const tipoUnidad = document.getElementById('select-unidad-reclutar').value;
    const cantidad = parseInt(document.getElementById('input-cantidad-reclutar').value);
    const mensajeEl = document.getElementById('mensaje-reclutamiento');

    if (!territorio || !tipoUnidad || isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor, completa todos los campos para reclutar.");
        return;
    }

    // Solo aplicamos el límite si es tipo soldado (regulares)
    if (tipoUnidad === '') {
        const jugador = gameState.jugadores[nombre];
        const tropasActuales = jugador.tropas || 0;
        const maximo = LIMITE_SOLDADOS_POR_CASA[casa] || 10; // Por si acaso
        const totalTrasReclutar = tropasActuales + cantidad;

        if (totalTrasReclutar > maximo) {
            mensajeEl.textContent = `❌ Límite de soldados (${maximo}) superado. Tienes ${tropasActuales}.`;
            return; // No dejes confirmar
        }
    }

    // Si todo está bien
    mensajeEl.textContent = ""; // Limpiar mensaje
    console.log(`[Reclutar] Emitiendo: ${cantidad} ${tipoUnidad} en ${territorio}`);
    socket.emit('solicitud-reclutamiento', { partida, nombre, territorio, tipoUnidad, cantidad });
    cerrarModal('modal-reclutar');
    terminarAccionEspecifica('Reclutar');
}


// --- Lógica Modal Construir ---
function poblarTerritoriosConstruir() {
    if (!gameState || !gameState.territorios) return;
    const selectEl = document.getElementById('select-territorio-construir');
    if (!selectEl) return console.error("Select territorios construir no encontrado.");
    selectEl.innerHTML = '<option value="">-- Selecciona --</option>';
    Object.values(gameState.territorios)
        .filter(t => t.propietario === casa)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(t => {
            selectEl.appendChild(new Option(t.nombre, t.nombre));
        });
    selectEl.value = ""; // Reset
    // Resetear edificio y coste también
    const selectEdificio = document.getElementById('select-edificio-construir');
     if(selectEdificio) selectEdificio.value = "";
     actualizarCostoConstruir();
}
function poblarEdificiosConstruir() {
  if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) return;
  const jugador = gameState.jugadores[nombre];
  const select = document.getElementById('select-edificio-construir');
  if (!select) return;

  // Limpia el contenido
  select.innerHTML = `
    <option value="">-- Selecciona --</option>
  `;

  // Grupo Producción
  const optProduccion = document.createElement("optgroup");
  optProduccion.label = "Producción";

  ["Granja", "Cantera", "Mina", "Aserradero"].forEach(ed => {
    const op = document.createElement("option");
    op.value = ed;
    op.textContent = ed;
    optProduccion.appendChild(op);
  });

  // Grupo Militar
  const optMilitar = document.createElement("optgroup");
  optMilitar.label = "Militar";

  ["Castillo", "Puerto", "Taller de maquinaria de asedio"].forEach(ed => {
    const op = document.createElement("option");
    op.value = ed;
    op.textContent = ed;
    optMilitar.appendChild(op);
  });

  // Solo si es Arryn, añade estas dos
if (jugador.casa === "Arryn") {
  ["Atalayas", "Academia de Caballería"].forEach(ed => {
    const op = document.createElement("option");
    op.value = ed;
    op.textContent = ed;
    optMilitar.appendChild(op);
  });
}

//si es tully añade foso
if (jugador.casa === "Tully") {
  const op = document.createElement("option");
  op.value = "Foso";
  op.textContent = "Foso";
  optMilitar.appendChild(op);
}

if (jugador.casa === "Tully") {
  const op = document.createElement("option");
  op.value = "Arquería";
  op.textContent = "Arquería";
  optMilitar.appendChild(op);
}


//si es tully añade puerto fluvial
if (jugador.casa === "Tully") {
  const op = document.createElement("option");
  op.value = "Puerto Fluvial";
  op.textContent = "Puerto Fluvial";
  optMilitar.appendChild(op);
}



// Solo si es Lannister, añade Armería
if (jugador.casa === "Lannister") {
  const op = document.createElement("option");
  op.value = "Armería";
  op.textContent = "Armería";
  optMilitar.appendChild(op);
}

if (jugador.casa === "Tyrell") {
  const op = document.createElement("option");
  op.value = "Septo";
  op.textContent = "Septo";
  optMilitar.appendChild(op);
}



  select.appendChild(optProduccion);
  select.appendChild(optMilitar);

  actualizarCostoConstruir();
}


function actualizarCostoConstruir() {
  if (!gameState || !gameState.territorios || !gameState.jugadores[nombre]) return;

  const jugador = gameState.jugadores[nombre];
  const territorio1 = document.getElementById('select-territorio-construir').value;
  const edificio1 = document.getElementById('select-edificio-construir').value;
  const territorio2 = document.getElementById('select-territorio-construir-2')?.value || "";
  const edificio2 = document.getElementById('select-edificio-construir-2')?.value || "";

  let totalCosto = 0;

  const COSTOS = COSTOS_BASE_UI;
  let descuentoCantera = 0;

  for (const t of Object.values(gameState.territorios)) {
    if (t.propietario === casa && Array.isArray(t.edificios)) {
      descuentoCantera += t.edificios.filter(e => e === "Cantera").length * 5;
    }
  }

  function costoFinal(edificio) {
    const base = COSTOS[edificio] ?? COSTOS[edificio.toLowerCase()] ?? 0;
    return Math.max(0, base - descuentoCantera);
  }

  if (edificio1) totalCosto += costoFinal(edificio1);
  if (casa === "Targaryen" && edificio2) totalCosto += costoFinal(edificio2);

  const costoValorEl = document.getElementById('costo-construir-valor');
  if (costoValorEl) costoValorEl.textContent = totalCosto;

  const limiteActualEl = document.getElementById('limite-construir-actual');
  const limiteMaximoEl = document.getElementById('limite-construir-maximo');
  const limiteInfoEl = document.getElementById('limite-construccion-info');

  const maxConstruccion = (jugador.casa === 'Targaryen') ? 2 : 1;
  if (limiteActualEl) limiteActualEl.textContent = jugador.edificiosConstruidosTurno ?? 0;
  if (limiteMaximoEl) limiteMaximoEl.textContent = maxConstruccion;
  if (limiteInfoEl) limiteInfoEl.style.display = 'block';
}

function confirmarConstruir() {
  const jugador = gameState?.jugadores?.[nombre];
  const territorio1 = document.getElementById('select-territorio-construir').value;
  const edificio1 = document.getElementById('select-edificio-construir').value;
  const territorio2 = document.getElementById('select-territorio-construir-2').value;
  const edificio2 = document.getElementById('select-edificio-construir-2').value;

  if (casa === "Targaryen") {
    if (!territorio1 || !edificio1) {
      alert("Debes seleccionar al menos el primer edificio.");
      return;
    }

    // Enviar siempre el primero (no es la segunda construcción)
    socket.emit('solicitud-construccion', {
      partida,
      nombre,
      territorio: territorio1,
      tipoEdificio: edificio1,
      segundaConstruccion: false
    });

    // Si eligió un segundo edificio, lo envías marcándolo como segundaConstruccion
    if (territorio2 && edificio2) {
      socket.emit('solicitud-construccion', {
        partida,
        nombre,
       territorio: territorio2,
        tipoEdificio: edificio2,
        segundaConstruccion: true
      });
    }

  } else {
    if (!territorio1 || !edificio1) {
      alert("Debes seleccionar territorio y edificio.");
      return;
    }
    socket.emit('solicitud-construccion', { partida, nombre, territorio: territorio1, tipoEdificio: edificio1 });
  }

  cerrarModal('modal-construir');
  
  

  // SI construyó un taller de asedio, abrimos inmediatamente el modal de elección
  if (edificio1 === "Taller de maquinaria de asedio" || edificio2 === "Taller de maquinaria de asedio") {
    abrirModal('modal-elegir-asedio');
  }
    terminarAccionEspecifica('Construir');


}



// --- Lógica Modal Mis Territorios ---
function abrirModalMisTerritorios() {

    if (!gameState || !gameState.territorios || !gameState.jugadores?.[nombre]) {
        console.warn("Estado o jugador no disponible.");
        abrirModal('modal-mis-territorios');
        return;
    }

    const modalEl = document.getElementById('modal-mis-territorios');
    const listaUl = document.getElementById('lista-mis-territorios');
    const contadorSpan = document.getElementById('contador-territorios');
    const oroSpan = document.getElementById('oro-generado-territorios');

    if (!modalEl || !listaUl || !contadorSpan || !oroSpan) return;

    listaUl.innerHTML = ''; let contador = 0; let oroTotalTurno = 0;

    const territorios = Object.values(gameState.territorios);
    const misTerritorios = territorios.filter(t => t && t.propietario === casa);

    if (misTerritorios.length === 0) {
        listaUl.innerHTML = '<li>No tienes territorios todavía.</li>';
    } else {
        misTerritorios.forEach((t, i) => {
            const ingreso = t.oroBase || 0;
            const nombreTerritorio = Object.keys(gameState.territorios).find(key => gameState.territorios[key] === t) || `Territorio ${i + 1}`;
            const li = document.createElement('li');
            li.innerHTML = `<b>${nombreTerritorio}</b> (+${ingreso}💰)`;
            listaUl.appendChild(li);
            oroTotalTurno += ingreso;
            contador++;
          });
    }

    contadorSpan.textContent = contador;
    oroSpan.textContent = oroTotalTurno;
    // Contar barcos del jugador (suponemos que están en jugador.barcos)
    const jugador = gameState.jugadores[nombre];

    const esGreyjoy = casa === "Greyjoy";


    // Calculamos minas
    let oroPorMinas = 0;
    misTerritorios.forEach(t => {
      const minas = t.edificios?.filter(ed => ed === "Mina").length || 0;
      const oroPorMina = esGreyjoy ? 15 : (casa === "Lannister" ? 20 : 10);
      oroPorMinas += minas * oroPorMina;

  });
  

    // Calculamos aserraderos
    let oroPorAserraderos = 0;
    misTerritorios.forEach(t => {
        const aserraderos = t.edificios?.filter(ed => ed === "Aserradero").length || 0;
        oroPorAserraderos += aserraderos * (esGreyjoy ? 8 : 5);
    });

    // Calculamos canteras
let oroPorCanteras = 0;
misTerritorios.forEach(t => {
    const canteras = t.edificios?.filter(ed => ed === "Cantera").length || 0;
    oroPorCanteras += canteras * (esGreyjoy ? 8 : 5);

});

// Calculamos granjas
let oroPorGranjas = 0;
if (casa === "Tully") {
  misTerritorios.forEach(t => {
    const granjas = t.edificios?.filter(ed => ed === "Granja").length || 0;
    oroPorGranjas += granjas * 10;
  });
} else if (casa === "Tyrell") {
  const tieneRumorDiezmo = jugador?.rumoresDesbloqueados?.includes("Diezmo de la Abundancia");
  if (tieneRumorDiezmo) {
    misTerritorios.forEach(t => {
      const granjas = t.edificios?.filter(ed => ed === "Granja").length || 0;
      oroPorGranjas += granjas * 15;
    });
  }
} else {
  misTerritorios.forEach(t => {
    const granjas = t.edificios?.filter(ed => ed === "Granja").length || 0;
    oroPorGranjas += granjas * (esGreyjoy ? 8 : 5);
  });
}







// BONUS por puertos
let oroPorPuertos = 0;
const totalProduccion = misTerritorios.reduce((acc, t) => {
  const prod = t.edificios?.filter(e => ["Mina", "Cantera", "Granja", "Aserradero"].includes(e)).length || 0;
  return acc + prod;
}, 0);
misTerritorios.forEach(t => {
  if (t.edificios?.includes("Puerto")) {
    const oroPorEdificio = casa === "Martell" ? 15 : 10;
    oroPorPuertos += totalProduccion * oroPorEdificio;
  }
});







    // Calculamos mantenimiento
    const mantenimientoTropas = jugador.tropas || 0;
    const mantenimientoBarcos = (jugador.barcos || 0) * 2;
    const mantenimientoMaquinas =
        (jugador.catapulta || 0) +
        (jugador.torre || 0) +
        (jugador.escorpion || 0);

    const mantenimientoDragones = (jugador.dragones || 0) * 5;
    const mantenimientoSacerdotes = (jugador.sacerdotes || 0) * 1;
    const mantenimientoCaballeros = jugador.caballero || 0;
    const mantenimientoHuargos = jugador.huargos || 0;
    const mantenimientoUnicornios = jugador.unicornios || 0;
    const mantenimientomurcielagos = jugador.murcielagos || 0;
    const mantenimientoguardiareal = jugador.guardiareal || 0;
    const mantenimientobarcolegendario = jugador.barcolegendario  * 2;
    const mantenimientobarcocorsario = jugador.barcocorsario  * 2;
    const mantenimientovenadosblancos = jugador.venadosblancos || 0;
    const mantenimientomartilladores = jugador.martilladores || 0;
    const mantenimientocaballerosdelarosa = jugador.caballerosdelarosa || 0;
    const mantenimientoguardiadelalba = jugador.guardiadelalba || 0;
    const mantenimientosacerdotizaroja = jugador.sacerdotizaroja || 0;
    const mantenimientobarbaros = jugador.barbaros || 0;
    const mantenimientocaballerosdelaguila = jugador.caballerosdelaguila || 0;
    const mantenimientosacerdotesal = jugador.sacerdoteSal || 0;
    


    const mantenimientoTotal = mantenimientoTropas + mantenimientoBarcos + mantenimientoMaquinas + 
    mantenimientoDragones + mantenimientoSacerdotes + mantenimientoCaballeros + mantenimientoHuargos
    + mantenimientoUnicornios + mantenimientomurcielagos + mantenimientoguardiareal + mantenimientobarcolegendario
    + mantenimientobarcocorsario + mantenimientovenadosblancos + mantenimientomartilladores + mantenimientocaballerosdelarosa
    + mantenimientoguardiadelalba + mantenimientosacerdotizaroja + mantenimientobarbaros + mantenimientocaballerosdelaguila + mantenimientosacerdotesal;


    let oroEstimado = Math.max(0, oroTotalTurno + oroPorMinas + oroPorAserraderos + oroPorCanteras + oroPorGranjas + oroPorPuertos - mantenimientoTotal);

    //oro 20 de los tully
if (casa === "Tully") {
  oroEstimado += 20;
}

// 💰 Bonus Martell por "Mercancía de Sombras"
if (casa === "Martell" && jugador?.rumoresDesbloqueados?.includes("Mercancía de Sombras")) {
  const edificiosProduccion = misTerritorios.reduce((acc, t) => {
    return acc + (t.edificios?.filter(ed => EDIFICIOS_PRODUCCION.includes(ed)).length || 0);
  }, 0);
  oroEstimado += edificiosProduccion * 10;
}



// 💰 Bonus Martell por el puerto inicial en Lanza del Sol
if (casa === "Martell") {
  const t = gameState.territorios["Lanza del Sol"];
  if (t && t.propietario === "Martell" && t.edificios.includes("Puerto")) {
    oroEstimado += 10;
  }
}

// 💰 Bonus por estar casado con Casa Celtigar
if (jugador.casadoCon === "Celtigar" || jugador.casamientoExtra === "Celtigar") {
  oroEstimado += 30;

  const pBonus = document.createElement('p');
  pBonus.className = 'bonus-celtigar';
  pBonus.innerHTML = 'Bonus Casa Celtigar: +30 <img src="../imgs/Interfaz/oro.png" alt="oro" class="icono-inline">';
  const contenedorScroll = modalEl.querySelector('.lista-scrollable');
  if (contenedorScroll) {
    contenedorScroll.insertBefore(pBonus, contenedorScroll.firstChild);
  }
}


document.getElementById('oro-estimado-final-turno').textContent = oroEstimado;


const contenedorScroll = modalEl.querySelector('.lista-scrollable');
if (contenedorScroll) {
  // Limpiar anteriores
  const bonusTully = contenedorScroll.querySelector('.bonus-tully');
  const bonusMartell = contenedorScroll.querySelector('.bonus-martell');
  const bonusCeltigar = contenedorScroll.querySelector('.bonus-celtigar');
  if (bonusTully) bonusTully.remove();
  if (bonusMartell) bonusMartell.remove();
  if (bonusCeltigar) bonusCeltigar.remove();

  if (casa === "Tully") {
    const pBonus = document.createElement('p');
    pBonus.className = 'bonus-tully';
    pBonus.innerHTML = 'Bonus por aduana Tully: +20 <img src="../imgs/Interfaz/oro.png" alt="oro" class="icono-inline">';
    contenedorScroll.insertBefore(pBonus, contenedorScroll.firstChild);
  }

  if (casa === "Martell") {
    const t = gameState.territorios["Lanza del Sol"];
    if (t && t.propietario === "Martell" && t.edificios.includes("Puerto")) {
      const pBonus = document.createElement('p');
      pBonus.className = 'bonus-martell';
      pBonus.innerHTML = 'Bonus Martell por puerto inicial: +10 <img src="../imgs/Interfaz/oro.png" alt="oro" class="icono-inline">';
      contenedorScroll.insertBefore(pBonus, contenedorScroll.firstChild);
    }
  }
}



    const tituloModal = modalEl.querySelector('h2');
if (tituloModal) {
    tituloModal.innerHTML = `Mis Territorios (<span id="contador-territorios">${contador}</span>)`;
}


    abrirModal('modal-mis-territorios');
}



// =============================================
// Cuando se cargue completamente el HTML, empieza la inicialización
// PARTE 3: DOMContentLoaded - INICIALIZACIÓN Y LISTENERS
// =============================================
// Cuando se cargue completamente el HTML, empieza la inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log("==========================================");
    console.log("DOM Cargado. Iniciando scriptjuego.js...");

    console.log(`Datos OK: Jugador=${nombre}, Casa=${casa}, Partida=${partida}`);

    // 2. Configurar UI Inicial básica (fondo, logo)
    try {
        setFondoPorCasa(casa);
        setLogoPorCasa(casa);
        document.getElementById('turno-jugador').textContent = 'Cargando...';
        document.getElementById('accion-jugador').textContent = '';
        console.log("[Init] UI Inicial OK.");
    } catch (e) { console.error("[Init] Error UI inicial:", e); return; }

     // 3. Ocultar elementos hasta recibir estado
     document.getElementById('oro-jugador').style.display = 'none';
     deshabilitarBotonesAccion(true); // Deshabilitar botones de acción al inicio

    // 4. Añadir TODOS los Event Listeners
    console.log("[Init] Añadiendo listeners...");
    let listenersOk = true;
    try {
        // Helper para añadir listeners y verificar existencia del elemento
        const setupListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
                console.log(`  -> Listener '${event}' añadido a #${id}`);
            } else {
                console.warn(`WARN: Elemento #${id} no encontrado para añadir listener '${event}'.`);
                listenersOk = false; // Marcar que algo falló, pero continuar
            }
        };

const btnLevasStark = document.getElementById('btn-levas-stark');
if (btnLevasStark) {
  btnLevasStark.addEventListener('click', () => {
    document.getElementById('input-levas-stark').value = 1;
    abrirModal('modal-levas-stark');
  });
}

setupListener("oro-jugador", "click", () => {
  const jugador = gameState?.jugadores?.[nombre];
  const territorios = Object.values(gameState?.territorios || {});

  if (!jugador) return;

  let ingresos = 0;

  territorios.forEach(t => {
    if (t.propietario === jugador.casa) {
      ingresos += t.oroBase || 0;
    }
  });

  document.getElementById("oroEstimadoTexto").textContent = `Oro estimado al final del turno: ${jugador.oro} oro`;
  document.getElementById("ingresosPorTerritorioTexto").textContent = `Ingresos por territorios: ${ingresos} oro`;

  abrirModal("modal-ingresos");
});


setupListener('btn-revuelta-campesina', 'click', () => {
  const select = document.getElementById("select-casa-revuelta");
  select.innerHTML = `<option value="">-- Elige casa --</option>`;

  const TODAS_LAS_CASAS = [
    "Stark", "Tully", "Arryn", "Lannister", "Tyrell",
    "Baratheon", "Martell", "Targaryen", "Greyjoy"
  ];

  TODAS_LAS_CASAS.forEach(casa => {
    const option = document.createElement("option");
    option.value = casa;
    option.textContent = casa;
    select.appendChild(option);
  });

  abrirModal("modal-revuelta-tyrell");
});



setupListener("btn-cancelar-revuelta-tyrell", "click", () => {
  cerrarModal("modal-revuelta-tyrell");
});

document.getElementById("btn-confirmar-territorios-revuelta")?.addEventListener("click", () => {
  const seleccionados = Array.from(
    document.querySelectorAll("#lista-territorios-revuelta input:checked")
  ).map(e => e.value);

  socket.emit("tyrell-confirmar-territorios-revuelta", {
    partida,
    nombre,
    casaObjetivo: window.casaObjetivoRevuelta,
    territorios: seleccionados
  });

  cerrarModal("modal-territorios-revuelta");
  terminarAccionEspecifica('revuelta')
});


document.getElementById("btn-confirmar-revuelta-tyrell")?.addEventListener("click", () => {
  const casaObjetivo = document.getElementById("select-casa-revuelta").value;
  const tropasGanadas = parseInt(document.getElementById("input-tropas-revuelta").value);

  if (!casaObjetivo || isNaN(tropasGanadas) || tropasGanadas <= 0) {
    alert("Selecciona una casa y una cantidad válida");
    return;
  }

  socket.emit("tyrell-revuelta-campesina", {
    partida,
    nombre,
    casaObjetivo,
    tropasGanadas
  });

  cerrarModal("modal-revuelta-tyrell");

  // Guardar temporalmente la casa atacada para usarla después en el modal de territorio
  window.casaObjetivoRevuelta = casaObjetivo;
});




setupListener('btn-ritual-kraken-greyjoy', 'click', () => {
  abrirModal('modal-ritual-kraken');
});

setupListener('btn-si-ritual-kraken', 'click', () => {
  cerrarModal('modal-ritual-kraken');
  socket.emit('greyjoy-invocar-kraken', { partida, nombre });
});

setupListener('btn-no-ritual-kraken', 'click', () => {
  cerrarModal('modal-ritual-kraken');
});


setupListener('btn-saquear-greyjoy', 'click', () => {
  document.getElementById('input-oro-saqueo').value = 10;
  abrirModal('modal-saqueo-greyjoy');
});

setupListener('btn-confirmar-saqueo', 'click', () => {
  const oro = parseInt(document.getElementById('input-oro-saqueo').value);
  if (isNaN(oro) || oro <= 0) return alert("Cantidad inválida.");

  socket.emit('greyjoy-saquear', { partida, nombre, oro });
  cerrarModal('modal-saqueo-greyjoy');
  terminarAccionEspecifica('Saqueo');
});




        const btnConfirmarLevas = document.getElementById('btn-confirmar-levas-stark');
if (btnConfirmarLevas) {
  btnConfirmarLevas.addEventListener('click', () => {
    const cantidad = parseInt(document.getElementById('input-levas-stark').value);
    if (isNaN(cantidad) || cantidad <= 0) return alert("Cantidad inválida");

    socket.emit('levas-stark', { partida, nombre, cantidad });
    cerrarModal('modal-levas-stark');
    terminarAccionEspecifica('LevasStark');
  });
}



        setupListener('btn-obtener-tecnologia', 'click', () => {
          abrirModal('modal-pregunta-tecnologia');
        });
        
        setupListener('btn-si-tecnologia', 'click', () => {
          cerrarModal('modal-pregunta-tecnologia');
          poblarTerritoriosTyrell();
          abrirModal('modal-tecnologia-trirren');
        });
        
        setupListener('btn-no-tecnologia', 'click', () => {
          cerrarModal('modal-pregunta-tecnologia');
        });

        setupListener('btn-confirmar-perdidas-ataque', 'click', () => {
  console.log("PENES GIGANTES DIOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOS")
  const perdidas = {};
  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador) return;

  const unidades = [
    'tropas', 'tropasBlindadas', 'mercenarios', 'elite',
    'barcos', 'catapulta', 'torre', 'escorpion',
    'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero',
    'kraken','huargos','unicornios','murcielagos','guardiareal','jinete',
    'barcolegendario', 'tritones','barcocorsario','venadosblancos','martilladores',
    'caballerosdelarosa','guardiadelalba','sacerdotizaroja','barbaros','caballerosdelaguila'
    ,'sacerdoteSal'
  ];

  for (const key of unidades) {
    const input = document.getElementById(`perdida-${key}`);
    if (!input) continue;

    const cantidad = parseInt(input.value);

    if ((jugador[key] || 0) === 0) continue; // ⚠️ Salta si ya no tiene esa unidad

    if (key === "tritones" && casa === "Greyjoy") {
      perdidas[key] = `tritones-final:${cantidad || 0}`;
      continue;
    }

    if (isNaN(cantidad) || cantidad < 0 || cantidad > (jugador[key] || 0)) {
      return alert(`Cantidad inválida para ${key}`);
    }

    if (cantidad > 0) perdidas[key] = cantidad;
  }

  // ⚓ TRANSFERENCIA DE BARCOS SI SE PIERDEN
  const barcosPerdidos = perdidas.barcos || 0;
  if (barcosPerdidos > 0) {
    cerrarModal('modal-fase-neutral');
    barcosPerdidosPendientes = barcosPerdidos;
    transferenciasBarcos = [];
    poblarCasasBarco();
    mostrarModalTransferenciaBarco();

    return;
  }

  const perdidasJinetes = parseInt(document.getElementById("perdida-jinete")?.value) || 0;
  if (
    casa === "Targaryen" &&
    gameState?.jugadores?.[nombre]?.rumoresDesbloqueados?.includes("Fuego Heredado") &&
    perdidasJinetes > 0
  ) {
    jinetesPendientes = perdidasJinetes;
    mostrarReemplazoJinete();
  }

  socket.emit('perdidas-en-batalla', {
    partida,
    nombre,
    perdidas,
    esSaqueoGreyjoy: true
  });
  // ✅ Limpiar datos previos

  cerrarModal('modal-perdidas-ataque');
});



        const btnStarkAtacar = document.getElementById("btn-stark-atacar");

btnStarkAtacar?.addEventListener("click", () => {
  window.esAtaqueNorteStark = true;
  poblarSelectTerritorioAtaque();
  abrirModal('modal-ataque-simple');
});

document.getElementById('btn-confirmar-casamiento-alianza')?.addEventListener('click', () => {
  const casaElegida = document.getElementById('select-casa-matrimonio-alianza').value;
  if (!casaElegida) return alert("Debes elegir una casa.");

  socket.emit('targaryen-activar-alianza-sangre', {
    partida,
    nombre,
    casaElegida
  });

  cerrarModal('modal-casarse-alianza');
});

        
        document.getElementById('btn-confirmar-asignacion-territorios').addEventListener('click', () => {
          const asignaciones = {};
        
          document.querySelectorAll('#lista-territorios-asignar > div').forEach(div => {
            const territorio = div.querySelector('p strong')?.textContent;
            const victoria = div.querySelector(`#victoria-${territorio}`)?.value;
        
            if (victoria === 'si') {
              const seleccion = div.querySelector(`#select-prop-${territorio}`);
              asignaciones[territorio] = seleccion?.value;
            }
            // Si fue 'no', no se añade: se mantiene el propietario actual
          });
        
          socket.emit('asignar-territorios-post-batalla', {
            partida,
            nombre,
            asignaciones
          });
        
          cerrarModal('modal-asignar-territorios');
        });
        
        let huevosPorEclosionar = 0;

document.getElementById('btn-hijo-si').addEventListener('click', () => {
  cerrarModal('modal-hijos-targaryen');
  huevosPorEclosionar = (gameState?.jugadores?.[nombre]?.huevos || 0) + 1;
  socket.emit('targaryen-ganar-hijo', { partida, nombre }); // Ganar 1 jinete y 1 huevo

  if (huevosPorEclosionar > 0) {
    mostrarModalEclosion();
  } else {
    finalizarFaseNeutralYEmitir();
  }
});

document.getElementById('btn-hijo-no').addEventListener('click', () => {
  cerrarModal('modal-hijos-targaryen');
  huevosPorEclosionar = gameState?.jugadores?.[nombre]?.huevos || 0;
  if (huevosPorEclosionar > 0) {
    mostrarModalEclosion();
  } else {
    finalizarFaseNeutralYEmitir();
  }
});

function poblarSelectConCasas(idSelect) {
  const select = document.getElementById(idSelect);
  select.innerHTML = '<option value="">-- Elige casa --</option>';
  Object.values(gameState.jugadores || {}).forEach(jugador => {
    const option = document.createElement("option");
    option.value = jugador.casa;
    option.textContent = jugador.casa;
    select.appendChild(option);
  });
}



function mostrarModalEclosion() {
  if (huevosPorEclosionar <= 0) return finalizarFaseNeutralYEmitir();
  document.getElementById('texto-eclosion-huevo').textContent = `🐣 Huevo restante: ${huevosPorEclosionar}`;
  abrirModal('modal-eclosion-huevo');
}

document.getElementById('btn-eclosion-si').addEventListener('click', () => {
  huevosPorEclosionar--;
  socket.emit('targaryen-eclosionar-huevo', { partida, nombre }); // Gana dragón
  if (huevosPorEclosionar > 0) {
    mostrarModalEclosion();
  } else {
    cerrarModal('modal-eclosion-huevo');
    finalizarFaseNeutralYEmitir();
  }
});

document.getElementById('btn-eclosion-no').addEventListener('click', () => {
  huevosPorEclosionar--;
  if (huevosPorEclosionar > 0) {
    mostrarModalEclosion();
  } else {
    cerrarModal('modal-eclosion-huevo');
    finalizarFaseNeutralYEmitir();
  }
});

function finalizarFaseNeutralYEmitir() {
  socket.emit('actualizar-perdidas-neutral', {
    partida,
    nombre,
    perdidas: tropasPerdidas,
    perdidasPorUnidad,
    territoriosPerdidos,
    nuevoPropietarioPorTerritorio
  });

  cerrarModal('modal-fase-neutral');

}

        
        document.getElementById('btn-confirmar-tecnologia')?.addEventListener('click', () => {
          const edificio = document.getElementById('select-edificio-tecnologia').value;
          const territorio = document.getElementById('select-territorio-tecnologia').value;
        
          if (!edificio || !territorio) return alert("Debes elegir edificio y territorio.");
        
          const jugador = gameState.jugadores[nombre];
          const territorioObj = gameState.territorios[territorio];
          let costo = COSTOS_BASE_UI[edificio] || 999;
        
          const canteras = Object.values(gameState.territorios)
            .filter(t => t.propietario === casa)
            .flatMap(t => t.edificios)
            .filter(e => e === "Cantera").length;
        
          const descuento = canteras * 5;
          const costoFinal = Math.max(0, costo - descuento);
        
          if (jugador.oro < costoFinal) {
            alert("❌ No tienes suficiente oro para construir esta tecnología.");
            return;
          }
        
          socket.emit('tyrell-obtener-tecnologia', { partida, nombre, edificio, territorio });
          document.getElementById('btn-obtener-tecnologia').style.display = 'none';
          cerrarModal('modal-tecnologia-trirren');
          terminarAccionEspecifica('Obtener Tecnología');
        });
        
        
        


        setupListener('btn-organizar-torneo', 'click', () => {
          document.getElementById('input-caballeros-torneo').value = 1;
          abrirModal('modal-torneo-arryn');
        });
        

        setupListener('btn-confirmar-torneo', 'click', () => {
          const cantidad = parseInt(document.getElementById('input-caballeros-torneo').value) || 0;
          if (cantidad <= 0) return alert("Debes ingresar al menos 1 caballero.");
          socket.emit('organizar-torneo-arryn', { partida, nombre, cantidad });
          cerrarModal('modal-torneo-arryn');
          terminarAccionEspecifica('torneo');
        });

        setupListener('btn-confirmar-robo-tropas', 'click', () => {
  const cantidad = parseInt(document.getElementById("input-cantidad-robo-tropas").value);
  const casaRival = document.getElementById("select-casa-robo-tropas").value;

  if (!casaRival || isNaN(cantidad) || cantidad <= 0) {
    alert("Selecciona una casa y una cantidad válida");
    return;
  }

  socket.emit("martell-robar-tropas-moral", {
    partida,
    nombre,
    cantidad,
    casaObjetivo: casaRival
  });

  cerrarModal("modal-robar-tropas-moral");
});

        

        // Botones barra superior y principal
        setupListener('logo-casa-container', 'click', abrirModalMisTerritorios);

        // Botones de Acción específica
        setupListener('btn-reclutar', 'click', () => {
           modoReclutarNorte = false;
            if (!gameState || !gameState.jugadores?.[nombre]) {
              alert("⚠️ Esperando sincronización con el servidor. Intenta en unos segundos.");
              return;
            }
          
            // Resetear cantidades antes de abrir
            for (const tipo in cantidadesReclutas) {
              cantidadesReclutas[tipo] = 0;
              const el = document.getElementById(`cantidad-${tipo}`);
              if (el) el.textContent = '0';
            }
          
            actualizarCostoTotalRecluta(); // para que el oro se actualice desde 0
            agregarReclutaBarcoSiAplica();
            agregarReclutaAsedioSiAplica();
            agregarCaballeroSiArrynConAcademia();
            agregarSacerdoteLuzSiBaratheon(); // << Añade esto
            agregarSacerdoteSalSiGreyjoy();
            agregarSoldadoBlindadoSiLannisterConArmeria();
            agregarArquerosSiTullyConArqueria(); // 👈 añadir esto después de las demás funciones
            agregarUnidadesEspecialesSiTyrellTieneTecnologia();
            abrirModal('modal-reclutar');
          });
          
          
        
        
        setupListener('btn-construir', 'click', () => {
            if (!gameState || !gameState.territorios || !gameState.jugadores) {
                alert("⚠️ Esperando sincronización con el servidor. Intenta en unos segundos.");
                return;
              }
          
            poblarTerritoriosConstruir();
            poblarEdificiosConstruir();
            if (casa === "Targaryen") {
  document.getElementById('contenedor-construccion-extra').style.display = 'block';
  poblarTerritoriosEnSelect('select-territorio-construir-2');
  poblarEdificiosEnSelect('select-edificio-construir-2');
} else {
  document.getElementById('contenedor-construccion-extra').style.display = 'none';
}

            abrirModal('modal-construir');
          });
        setupListener('btn-mover', 'click', () => abrirModal('modal-confirmar-mover'));
        setupListener('btn-batalla', 'click', () => {
  poblarSelectTerritorioAtaque();
  abrirModal('modal-ataque-simple');
});
        setupListener('btn-confirmar-mover', 'click', () => {
          cerrarModal('modal-confirmar-mover');
          terminarAccionEspecifica('Mover/Atacar');
        });
        setupListener('btn-cancelar-mover', 'click', () => cerrarModal('modal-confirmar-mover'));


        
        setupListener('btn-reorganizar', 'click', () => abrirModal('modal-confirmar-reorganizar'));
        setupListener('btn-confirmar-reorganizar', 'click', () => {
          cerrarModal('modal-confirmar-reorganizar');
          const turno = gameState?.turno || 1;
          const accion = gameState?.accion || 1;
          turnoReorganizarUsado = turno;
          accionReorganizarUsado = accion;
          socket.emit('usar-reorganizar', { partida, nombre, turno, accion });
          terminarAccionEspecifica('Reorganizar');
        });
        setupListener('btn-cancelar-reorganizar', 'click', () => cerrarModal('modal-confirmar-reorganizar'));



        
        setupListener('btn-casarse-targaryen', 'click', () => {
          prepararOpcionesCasamientoNormal();
  abrirModal('modal-casarse-targaryen');
});

setupListener('btn-confirmar-casamiento', 'click', () => {
  const casaElegida = document.getElementById('select-casa-matrimonio').value;
  if (!casaElegida) return alert("Debes elegir una casa.");

  socket.emit('targaryen-casarse', {
    partida,
    nombre,
    casaElegida
  });

  cerrarModal('modal-casarse-targaryen');
  terminarAccionEspecifica('casarse');
});

        
        
        

        // --- Listeners para Modal Batalla ---
        setupListener('btn-cerrar-modal-batalla', 'click', () => cerrarModal('modal-batalla'));
        setupListener('btn-confirmar-batalla', 'click', confirmarBatalla);
        setupListener('btn-cancelar-batalla', 'click', () => cerrarModal('modal-batalla'));
        setupListener('btn-restar-perdidas-atacante', 'click', () => ajustarPerdidas('input-perdidas-atacante', -1));
        setupListener('btn-sumar-perdidas-atacante', 'click', () => ajustarPerdidas('input-perdidas-atacante', 1));
        setupListener('btn-restar-perdidas-defensor', 'click', () => ajustarPerdidas('input-perdidas-defensor', -1));
        setupListener('btn-sumar-perdidas-defensor', 'click', () => ajustarPerdidas('input-perdidas-defensor', 1));

        // --- Listeners para Modal Reclutar ---
        // (Los botones +/- ahora llaman directamente a ajustarCantidadReclutar en el HTML)
         setupListener('select-territorio-reclutar', 'change', actualizarCostoReclutar);
         setupListener('select-unidad-reclutar', 'change', actualizarCostoReclutar);
         setupListener('input-cantidad-reclutar', 'input', actualizarCostoReclutar);
         setupListener('btn-confirmar-reclutar', 'click', confirmarReclutar);
         // (El botón cancelar llama a cerrarModal en el HTML)

        // --- Listeners para Modal Construir ---
         setupListener('select-territorio-construir', 'change', actualizarCostoConstruir);
         setupListener('select-edificio-construir', 'change', actualizarCostoConstruir);
         setupListener('select-edificio-construir-2', 'change', actualizarCostoConstruir);
         setupListener('select-territorio-construir-2', 'change', actualizarCostoConstruir);
         setupListener('btn-confirmar-construir', 'click', confirmarConstruir);
         // (El botón cancelar llama a cerrarModal en el HTML)

        // --- Listeners para Modal Mis Territorios ---
        setupListener('btn-cerrar-modal-territorios', 'click', () => cerrarModal('modal-mis-territorios'));
        setupListener('btn-ok-modal-territorios', 'click', () => cerrarModal('modal-mis-territorios'));
        
        setupListener('btn-confirmar-perdidas-neutral', 'click', () => {
  perdidasPorUnidad = {};
  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador) return;

  const unidades = [
    'tropas', 'tropasBlindadas', 'mercenarios', 'elite',
    'barcos', 'catapulta', 'torre', 'escorpion',
    'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero',
    'jinete','kraken','huargos','unicornios','murcielagos','guardiareal',
    'barcolegendario','tritones','barcocorsario','venadosblancos','martilladores',
    'caballerosdelarosa','guardiadelalba','sacerdotizaroja','barbaros','caballerosdelaguila',
    'sacerdoteSal'
  ];

  let total = 0;

  for (const key of unidades) {
    const el = document.getElementById(`perdidas-${key}`);
    if (!el) continue;
    const cantidad = Math.max(0, parseInt(el.value) || 0);
    const tiene = jugador[key] ?? 0;

    if (key === "tritones" && casa === "Greyjoy") {
      perdidasPorUnidad[key] = `tritones-final:${cantidad}`;
      continue;
    }

    if (cantidad > tiene) return alert(`No puedes perder más de ${tiene} ${key}`);
    if (cantidad > 0) perdidasPorUnidad[key] = cantidad;
    total += cantidad;
  }

  // 🔥 Aquí insertamos lo de los barcos perdidos
  const barcosPerdidos = perdidasPorUnidad.barcos || 0;

document.getElementById('fase-neutral-paso1').style.display = 'none';
document.getElementById('fase-neutral-paso2').style.display = 'block';

// Si hay barcos, mostramos el modal encima
if (barcosPerdidos > 0) {
  barcosPerdidosPendientes = barcosPerdidos;
  transferenciasBarcos = [];
  poblarCasasBarco();

  
    mostrarModalTransferenciaBarco();
     // pequeño delay para asegurar que el paso 2 se ve debajo
}

// Emitimos ya las pérdidas para que el backend lo procese
socket.emit("actualizar-perdidas-neutral", {
  partida,
  nombre,
  perdidas,
  perdidasPorUnidad,
  territoriosPerdidos: [],
  nuevoPropietarioPorTerritorio: {}
});



  // 🐴 Jinete Fuego Heredado
  const perdidasJinetes = parseInt(document.getElementById("perdidas-jinete")?.value) || 0;
  if (
    casa === "Targaryen" &&
    gameState?.jugadores?.[nombre]?.rumoresDesbloqueados?.includes("Fuego Heredado") &&
    perdidasJinetes > 0
  ) {
    jinetesPendientes = perdidasJinetes;
    mostrarReemplazoJinete();
  }

  // 🔥 Sacerdotiza Roja Baratheon
  if (casa === "Baratheon" && gameState?.jugadores?.[nombre]?.rumoresDesbloqueados?.includes("Llama de R'hllor") && gameState?.jugadores?.[nombre]?.sacerdotizaroja === 0) {
    socket.emit("baratheon-reclutar-sacerdotizaroja", {
      partida,
      nombre,
      cantidad:1,
    });
  }

  verificarHuargosStark();

  document.getElementById('fase-neutral-paso1').style.display = 'none';
  document.getElementById('fase-neutral-paso2').style.display = 'block';
});

        
        

        document.getElementById('btn-confirmar-perdidas-impuestos')?.addEventListener('click', () => {
  const perdidas = {};
  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador) return;

  const claves = [
    'tropas', 'tropasBlindadas', 'mercenarios', 'elite',
    'barcos', 'catapulta', 'torre', 'escorpion',
    'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero','kraken',
    'huargos','unicornios','murcielagos','guardiareal', 'barcolegendario','tritones',
    'barcocorsario','venadosblancos','martilladores','caballerosdelarosa','guardiadelalba','sacerdotizaroja'
    ,'barbaros','caballerosdelaguila','sacerdoteSal'
  ];

  claves.forEach(key => {
    const input = document.getElementById(`perdidas-lan-${key}`);
    const val = parseInt(input?.value) || 0;
    if (val > 0) perdidas[key] = val;
  });

  cerrarModal('modal-lannister-perdidas');
  terminarAccionEspecifica('dobleimpuestos');
  socket.emit('doble-impuestos-completo', { partida, nombre, perdidas });
});


        document.getElementById('btn-confirmar-soborno')?.addEventListener('click', () => {
          const territorio = document.getElementById('select-territorio-soborno').value;
          const cantidad = parseInt(document.getElementById('input-cantidad-soborno').value);
        
          if (!territorio || cantidad <= 0) return alert("Debes seleccionar un territorio y una cantidad válida.");
        
          cerrarModal('modal-soborno-lannister');
        
          socket.emit('lannister-soborno-inicial', {
            partida,
            nombre,
            territorio,
            cantidad
          });
        });
        
        
        document.getElementById('btn-sobornar-soldados')?.addEventListener('click', () => {
          const select = document.getElementById('select-territorio-soborno');
          select.innerHTML = '<option value="">-- Selecciona --</option>';
        
          Object.values(gameState.territorios)
            .filter(t => t.propietario && t.propietario !== casa)
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .forEach(t => {
              const opt = document.createElement('option');
              opt.value = t.nombre;
              opt.textContent = `${t.nombre} (${t.propietario})`;
              select.appendChild(opt);
            });
        
          abrirModal('modal-soborno-lannister');
          document.getElementById('input-cantidad-soborno').addEventListener('input', validarOroSoborno);
validarOroSoborno();

        });

        function agregarAliadoAtacante() {
          const lista = document.getElementById('lista-aliados-atacantes');
          const wrapper = document.createElement('div');
          wrapper.style.marginBottom = '6px';
        
          const select = document.createElement('select');
          select.classList.add('select-aliado');
        
          getListaCasasPosibles().forEach(c => {
            if (c !== casa) {
              const opt = document.createElement('option');
              opt.value = c;
              opt.textContent = c;
              select.appendChild(opt);
            }
          });
        
          wrapper.appendChild(select);
          lista.appendChild(wrapper);
        }
        
        function agregarTerritorioAtaque() {
          const lista = document.getElementById('lista-territorios-a-atacar');
          const wrapper = document.createElement('div');
          wrapper.style.marginBottom = '6px';
        
          const select = document.createElement('select');
          select.classList.add('select-objetivo');
        
          Object.values(gameState.territorios)
            .filter(t => t.propietario && t.propietario !== casa)
            .forEach(t => {
              const opt = document.createElement('option');
              opt.value = t.nombre;
              opt.textContent = `${t.nombre} (${t.propietario})`;
              select.appendChild(opt);
            });
        
          wrapper.appendChild(select);
          lista.appendChild(wrapper);

        }
        window.agregarTerritorioAtaque = agregarTerritorioAtaque;
        
        function confirmarAtaqueCoordinado() {
          const aliados = Array.from(document.querySelectorAll('#lista-aliados-atacantes select')).map(s => s.value);
          const territorios = Array.from(document.querySelectorAll('#lista-territorios-a-atacar select')).map(s => s.value);
        
          cerrarModal('modal-atacar-coordinado');
        
          // Enviar al backend quién ataca y a quién
          socket.emit('ataque-coordinado', {
            partida,
            nombre,
            casaAtacante: casa,
            aliados,
            territorios
          });
        }
        
        
        function poblarSelectTerritorioAtaque() {
  const ordenCasas = [
    "Stark", "Arryn", "Greyjoy", "Tully",
    "Lannister", "Tyrell", "Baratheon",
    "Martell", "Targaryen"
  ];
  const select1 = document.getElementById('select-territorio-ataque1');
  const select2 = document.getElementById('select-territorio-ataque2');
  if (!select1 || !select2 || !gameState?.territorios) return;

  // Filtramos y ordenamos atacables
  const atacables = Object.values(gameState.territorios)
    .filter(t => t.propietario && t.propietario !== casa)
    .sort((a, b) => {
      const ia = ordenCasas.indexOf(a.propietario);
      const ib = ordenCasas.indexOf(b.propietario);
      if (ia !== ib) return ia - ib;
      return a.nombre.localeCompare(b.nombre);
    });

  // Poblamos ambos selects con la lista ya ordenada
  [select1, select2].forEach(select => {
    select.innerHTML = '<option value="">-- Selecciona --</option>';
    atacables.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.nombre;
      opt.textContent = `${t.nombre} (${t.propietario})`;
      select.appendChild(opt);
    });
  });

  // Mostrar pérdidas posibles
  const contenedor = document.getElementById('contenedor-perdidas-ataque');
  const jugador = gameState.jugadores?.[nombre];
  if (!contenedor || !jugador) return;

  contenedor.innerHTML = '';
  const unidades = [
    { key: 'tropas', nombre: 'Tropas' },
    { key: 'tropasBlindadas', nombre: 'Tropas con Armadura' },
    { key: 'mercenarios', nombre: 'Mercenarios' },
    { key: 'elite', nombre: 'Mercenarios de élite' },
    { key: 'barcos', nombre: 'Barcos' },
    { key: 'catapulta', nombre: 'Catapultas' },
    { key: 'torre', nombre: 'Torres de Asedio' },
    { key: 'escorpion', nombre: 'Escorpiones' },
    { key: 'caballero', nombre: 'Caballeros' },
    { key: 'sacerdotes', nombre: 'Sacerdotes' },
    { key: 'dragones', nombre: 'Dragones' },
    { key: 'jinete', nombre: 'Jinetes' },
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' },
    { key: 'kraken', nombre: 'Kraken' },
    { key: 'huargos', nombre: 'Huargos' },
    { key: 'unicornios', nombre: 'Unicornios' },
    { key: 'murcielagos', nombre: 'Murciélagos' },
    { key: 'guardiareal', nombre: 'Guardia Real' },
    { key: 'barcolegendario', nombre: 'Barco Legendario' },
    { key: 'tritones', nombre: 'Tritones' },
    { key: 'barcocorsario', nombre: 'Barco Corsario' },
    { key: 'venadosblancos', nombre: 'Venados Blancos' },
    { key: 'martilladores', nombre: 'Martilladores' },
    { key: 'caballerosdelarosa', nombre: 'Caballeros de la Rosa' },
    { key: 'guardiadelalba', nombre: 'Guardia del Alba' },
    { key: 'sacerdotizaroja', nombre: 'Sacerdotiza Roja' },
    { key: 'barbaros', nombre: 'Bárbaros' },
    { key: 'caballerosdelaguila', nombre: 'Caballeros del Águila' },
    { key: 'sacerdoteSal', nombre: 'Sacerdote de Sal' },
  ];

  unidades.forEach(({ key, nombre }) => {
    const tiene = jugador[key] ?? 0;
    if (tiene > 0) {
      const div = document.createElement('div');
      div.classList.add('campo-formulario');
      div.innerHTML = `
        <label for="perdida-${key}">${nombre} (Tienes ${tiene}):</label>
        <input type="number" id="perdida-${key}" min="0" max="${tiene}" value="0" style="width: 100%;">
      `;
      contenedor.appendChild(div);
    }
  });
}




function confirmarAtaqueSimple() {
  const territorio1 = document.getElementById('select-territorio-ataque1').value;
  const territorio2 = document.getElementById('select-territorio-ataque2').value;

  const resultado1 = document.querySelector('input[name="resultado-ataque1"]:checked')?.value;
  const resultado2 = document.querySelector('input[name="resultado-ataque2"]:checked')?.value;

  if (!territorio1 || resultado1 === undefined) {
    alert("Debes seleccionar al menos un territorio y si lo ganaste.");
    return;
  }

  const perdidasPorUnidad = {};
  const jugador = gameState.jugadores?.[nombre];
  if (!jugador) return;

  const unidades = [
    'tropas', 'tropasBlindadas', 'mercenarios', 'elite',
    'barcos', 'catapulta', 'torre', 'escorpion',
    'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero',
    'kraken', 'huargos', 'unicornios', 'murcielagos', 'guardiareal', 'jinete',
    'barcolegendario','tritones','barcocorsario','venadosblancos','martilladores',
    'caballerosdelarosa','guardiadelalba','sacerdotizaroja','barbaros','caballerosdelaguila',
    'sacerdoteSal'
  ];

  unidades.forEach(key => {
  const input = document.getElementById(`perdida-${key}`);
  if (!input) return;

  const valor = parseInt(input.value) || 0;

  if (key === "tritones" && casa === "Greyjoy") {
    perdidasPorUnidad[key] = `tritones-final:${valor}`;
  } else if (valor > 0) {
    perdidasPorUnidad[key] = valor;
  }
});


  const perdidasJinetes = perdidasPorUnidad.jinete || 0;

  // 🔥 Verificar Fuego Heredado
  if (
    casa === "Targaryen" &&
    gameState?.jugadores?.[nombre]?.rumoresDesbloqueados?.includes("Fuego Heredado") &&
    perdidasJinetes > 0
  ) {
    jinetesPendientes = perdidasJinetes;

    // Guardar ataque pendiente para emitirlo después de los reemplazos
    ataquePendiente = {
      partida,
      nombre,
      casa,
      territorios: [],
      perdidasPorUnidad,
      esAtaqueNorteStark
    };

    const propietario1 = document.getElementById('select-propietario-ataque1')?.value || casa;
    const propietario2 = document.getElementById('select-propietario-ataque2')?.value || casa;

    ataquePendiente.territorios.push({ nombre: territorio1, gano: resultado1 === "si", propietario: propietario1 });

    if (territorio2 && territorio2 !== territorio1) {
      ataquePendiente.territorios.push({ nombre: territorio2, gano: resultado2 === "si", propietario: propietario2 });
    }

    cerrarModal('modal-ataque-simple');
    mostrarReemplazoJinete();
    return;
  }

  // ⛴️ Detectar barcos perdidos
  const barcosPerdidos = perdidasPorUnidad.barcos || 0;
  if (barcosPerdidos > 0) {
    barcosPerdidosPendientes = barcosPerdidos;
    transferenciasBarcos = [];
    poblarCasasBarco();
    
      mostrarModalTransferenciaBarco();
  }

  // Emitir el ataque directamente si no hay jinete perdido o no es Targaryen
  const propietario1 = document.getElementById('select-propietario-ataque1')?.value || casa;
  const propietario2 = document.getElementById('select-propietario-ataque2')?.value || casa;

  const territorios = [{ nombre: territorio1, gano: resultado1 === "si", propietario: propietario1 }];

  if (territorio2 && territorio2 !== territorio1) {
    territorios.push({ nombre: territorio2, gano: resultado2 === "si", propietario: propietario2 });
  }

  socket.emit('ataque-simple-doble', {
    partida,
    nombre,
    casa,
    territorios,
    perdidasPorUnidad,
    esAtaqueNorteStark
  });

  if (window.esAtaqueNorteStark) {
    incrementarContadorNorte();
    window.esAtaqueNorteStark = false;
  } else {
    terminarAccionEspecifica('Batalla');
  }

  cerrarModal('modal-ataque-simple');


  if (casa === "Arryn") {
    abrirModal('modal-caballero-batalla-arryn');
  }
}

window.confirmarAtaqueSimple = confirmarAtaqueSimple;




        function agregarArquerosSiTullyConArqueria() {
          const contenedor = document.getElementById('contenedor-reclutas');
          if (!contenedor || casa !== "Tully" || !gameState || !gameState.territorios) return;
        
          const tieneArqueria = Object.values(gameState.territorios).some(
            t => t.propietario === casa && t.edificios.includes("Arquería")
          );
        
          const yaExiste = contenedor.querySelector('.recluta-box[data-tipo="arquero"]');
          if (!tieneArqueria || yaExiste) return;
        
          const div = document.createElement('div');
          div.className = 'recluta-box';
          div.dataset.tipo = 'arquero';
          div.dataset.costo = '6';
          div.innerHTML = `
            <h3>Arquero</h3>
            <img src="../imgs/reclutar/arqueros.png" alt="Arquero" style="width: 80px;">
            <div class="control-numero">
              <button class="btn-control" onclick="ajustarCantidad('arquero', -1)">-</button>
              <span id="cantidad-arquero">0</span>
              <button class="btn-control" onclick="ajustarCantidad('arquero', 1)">+</button>
            </div>
            <p>Coste: 6 oro</p>
          `;
          contenedor.appendChild(div);
        }

        function agregarUnidadesEspecialesSiTyrellTieneTecnologia() {
          const contenedor = document.getElementById('contenedor-reclutas');
          if (!contenedor || casa !== "Tyrell" || !gameState || !gameState.territorios) return;
        
          const tieneArmeria = Object.values(gameState.territorios).some(
            t => t.propietario === casa && t.edificios.includes("Armería")
          );
        
          const tieneAcademia = Object.values(gameState.territorios).some(
            t => t.propietario === casa && t.edificios.includes("Academia de Caballería")
          );
        
          const tieneArqueria = Object.values(gameState.territorios).some(
            t => t.propietario === casa && t.edificios.includes("Arquería")
          );
        
          // CABALLERO
          if (tieneAcademia && !contenedor.querySelector('.recluta-box[data-tipo="caballero"]')) {
            const div = document.createElement('div');
            div.className = 'recluta-box';
            div.dataset.tipo = 'caballero';
            div.dataset.costo = '10';
            div.innerHTML = `
              <h3>Caballero</h3>
              <img src="../imgs/reclutar/caballero.png" alt="Caballero" style="width: 80px;">
              <div class="control-numero">
                <button class="btn-control" onclick="ajustarCantidad('caballero', -1)">-</button>
                <span id="cantidad-caballero">0</span>
                <button class="btn-control" onclick="ajustarCantidad('caballero', 1)">+</button>
              </div>
              <p>Coste: 10 oro</p>
            `;
            contenedor.appendChild(div);
          }
        
          // SOLDADO BLINDADO
          if (tieneArmeria && !contenedor.querySelector('.recluta-box[data-tipo="soldadoBlindado"]')) {
            const div = document.createElement('div');
            div.className = 'recluta-box';
            div.dataset.tipo = 'soldadoBlindado';
            div.dataset.costo = '6';
            div.innerHTML = `
              <h3>Soldado con Armadura</h3>
              <img src="../imgs/reclutar/tropablindada.png" alt="Soldado Blindado" style="width: 80px;">
              <div class="control-numero">
                <button class="btn-control" onclick="ajustarCantidad('soldadoBlindado', -1)">-</button>
                <span id="cantidad-soldadoBlindado">0</span>
                <button class="btn-control" onclick="ajustarCantidad('soldadoBlindado', 1)">+</button>
              </div>
              <p>Coste: 6 oro</p>
            `;
            contenedor.appendChild(div);
          }
        
          // ARMADURA CONVERSIÓN
          if (tieneArmeria && !contenedor.querySelector('.recluta-box[data-tipo="armadura"]')) {
            const div = document.createElement('div');
            div.className = 'recluta-box';
            div.dataset.tipo = 'armadura';
            div.dataset.costo = '6';
            div.innerHTML = `
              <h3>Armadura (Convertir Tropas)</h3>
              <img src="../imgs/reclutar/tropablindada.png" alt="Armadura" style="width: 80px;">
              <div class="control-numero">
                <button class="btn-control" onclick="ajustarCantidad('armadura', -1)">-</button>
                <span id="cantidad-armadura">0</span>
                <button class="btn-control" onclick="ajustarCantidad('armadura', 1)">+</button>
              </div>
              <p>Coste: 6 oro</p>
            `;
            contenedor.appendChild(div);
          }
        
          // ARQUEROS
          if (tieneArqueria && !contenedor.querySelector('.recluta-box[data-tipo="arquero"]')) {
            const div = document.createElement('div');
            div.className = 'recluta-box';
            div.dataset.tipo = 'arquero';
            div.dataset.costo = '6';
            div.innerHTML = `
              <h3>Arquero</h3>
              <img src="../imgs/reclutar/arqueros.png" alt="Arquero" style="width: 80px;">
              <div class="control-numero">
                <button class="btn-control" onclick="ajustarCantidad('arquero', -1)">-</button>
                <span id="cantidad-arquero">0</span>
                <button class="btn-control" onclick="ajustarCantidad('arquero', 1)">+</button>
              </div>
              <p>Coste: 6 oro</p>
            `;
            contenedor.appendChild(div);
          }
        }
        
        

        function agregarSoldadoBlindadoSiLannisterConArmeria() {
          const contenedor = document.getElementById('contenedor-reclutas');
          if (!contenedor || casa !== "Lannister" || !gameState || !gameState.territorios) return;
        
          const tieneArmeria = Object.values(gameState.territorios).some(
            t => t.propietario === casa && t.edificios.includes("Armería")
          );
        
          if (!tieneArmeria) return;
        
          const existente = contenedor.querySelector('.recluta-box[data-tipo="soldadoBlindado"]');
          if (existente) return;
        
          const div = document.createElement('div');
          div.className = 'recluta-box';
          div.dataset.tipo = 'soldadoBlindado';
          div.dataset.costo = '6';
          div.innerHTML = `
            <h3>Soldado con Armadura</h3>
            <img src="../imgs/reclutar/tropablindada.png" alt="Soldado Blindado" style="width: 80px;">
            <div class="control-numero">
              <button class="btn-control" onclick="ajustarCantidad('soldadoBlindado', -1)">-</button>
              <span id="cantidad-soldadoBlindado">0</span>
              <button class="btn-control" onclick="ajustarCantidad('soldadoBlindado', 1)">+</button>
            </div>
            <p>Coste: 6 oro</p>
          `;
          contenedor.appendChild(div);

          // Añadir solo si no existe ya
if (!contenedor.querySelector('.recluta-box[data-tipo="armadura"]')) {
  const div = document.createElement('div');
  div.className = 'recluta-box';
  div.dataset.tipo = 'armadura';
  div.dataset.costo = '6';
  div.innerHTML = `
    <h3>Armadura (Convertir Tropas)</h3>
    <img src="../imgs/reclutar/tropablindada.png" alt="Armadura" style="width: 80px;">
    <div class="control-numero">
      <button class="btn-control" onclick="ajustarCantidad('armadura', -1)">-</button>
      <span id="cantidad-armadura">0</span>
      <button class="btn-control" onclick="ajustarCantidad('armadura', 1)">+</button>
    </div>
    <p>Coste: 6 oro</p>
  `;
  contenedor.appendChild(div);
}

        }
        

        function validarOroSoborno() {
          const input = document.getElementById('input-cantidad-soborno');
          const btnConfirmar = document.getElementById('btn-confirmar-soborno');
          const mensaje = document.getElementById('mensaje-soborno-insuficiente');
          const cantidad = parseInt(input.value) || 0;
          const jugador = gameState.jugadores?.[nombre];
          const oroDisponible = jugador?.oro ?? 0;
          const costoUnitario = 4 * 2; // Costo por soborno: 8 por soldado
          const total = cantidad * costoUnitario;
        
          if (total > oroDisponible) {
            btnConfirmar.disabled = true;
            mensaje.style.display = 'block';
          } else {
            btnConfirmar.disabled = false;
            mensaje.style.display = 'none';
          }
        }
        
        

        // Paso 2 - NO perdió territorios
        document.getElementById('btn-no-perdi-territorios').addEventListener('click', () => {
          
  gameState.jugadores[nombre].tropas = Math.max(0, gameState.jugadores[nombre].tropas - tropasPerdidas);

  const jugador = gameState.jugadores[nombre];
  if (jugador?.casa === "Targaryen" && jugador.casadoCon) {
    abrirModal('modal-hijos-targaryen');
  } else {
    socket.emit('actualizar-perdidas-neutral', {
      partida,
      nombre,
      perdidas: tropasPerdidas,
      perdidasPorUnidad,
      territoriosPerdidos: [],
      nuevoPropietarioPorTerritorio: {}
    });
    cerrarModal('modal-fase-neutral');
  }
  abrirModalGanarRumor(); // ← Aquí se lanza la pregunta del rumor
});

        
        // Paso 2 - SÍ perdió territorios
        document.getElementById('btn-si-perdi-territorios').addEventListener('click', () => {
            const contenedor = document.getElementById('lista-territorios-perdidos');
            contenedor.innerHTML = '';
            Object.values(gameState.territorios)
              .filter(t => t.propietario === casa)
              .forEach(t => {
                const div = document.createElement('div');
                div.innerHTML = `
                  <label>
                    <input type="checkbox" value="${t.nombre}"> ${t.nombre}
                  </label>`;
                contenedor.appendChild(div);
              });
          
            document.getElementById('fase-neutral-paso2').style.display = 'none';
            document.getElementById('fase-neutral-paso3').style.display = 'block';
          });
          

        document.getElementById('btn-finalizar-fase-neutral').addEventListener('click', () => {
  nuevoPropietarioPorTerritorio = {};

  territoriosPerdidos.forEach(nombre => {
    const select = document.getElementById(`nuevo-prop-${nombre}`);
    const nuevo = select?.value;
    if (nuevo) {
      nuevoPropietarioPorTerritorio[nombre] = nuevo;
    }
  });

  gameState.jugadores[nombre].tropas = Math.max(0, gameState.jugadores[nombre].tropas - tropasPerdidas);

  const jugador = gameState.jugadores[nombre];
  // Solo si es Targaryen y está casado, se abre el flujo de hijos
  if (jugador?.casa === "Targaryen" && jugador.casadoCon) {
    abrirModal('modal-hijos-targaryen');
  } else {
    socket.emit('actualizar-perdidas-neutral', {
      partida,
      nombre,
      perdidas: tropasPerdidas,
      perdidasPorUnidad,
      territoriosPerdidos,
      nuevoPropietarioPorTerritorio
    });
    cerrarModal('modal-fase-neutral');
  }
});

          
          document.getElementById('btn-doble-impuestos')?.addEventListener('click', () => {
  renderizarModalPerdidasLannister();
});

          

        document.getElementById('btn-confirmar-territorios-perdidos').addEventListener('click', () => {
           // ← Aquí también

            const checkboxes = document.querySelectorAll('#lista-territorios-perdidos input[type="checkbox"]:checked');
            territoriosPerdidos = Array.from(checkboxes).map(cb => cb.value);

            if (territoriosPerdidos.length === 0) {
              return alert("Selecciona al menos un territorio que hayas perdido.");
            }
          
            // Paso 4: Crear campos para cada territorio
            const contenedor = document.getElementById('contenedor-cambios-propietario');
            contenedor.innerHTML = '';
            territoriosPerdidos.forEach(nombreTerritorio => {
              const div = document.createElement('div');
              div.style.marginBottom = "12px";
              div.style.display = "flex";
              div.style.alignItems = "center";
              div.style.gap = "10px";

              div.innerHTML = `
                <label for="nuevo-prop-${nombreTerritorio}">${nombreTerritorio} →</label>
                <select id="nuevo-prop-${nombreTerritorio}">
                ${getListaCasasPosibles()
                    .filter(nombreCasa => nombreCasa !== casa)
                    .map(nombreCasa => `<option value="${nombreCasa}">${nombreCasa}</option>`)
                    .join('')}
                                  
                </select>
              `;
              contenedor.appendChild(div);
            });
          
            document.getElementById('fase-neutral-paso3').style.display = 'none';
            document.getElementById('fase-neutral-paso4').style.display = 'block';
            abrirModalGanarRumor();
          });
        
  


        if (!listenersOk) console.error("¡¡ ALGUNOS LISTENERS NO SE PUDIERON AÑADIR !! Revisa warnings.");
        else console.log("[Init] Listeners añadidos OK.");

    } catch (e) {
        console.error("¡¡ ERROR CRÍTICO añadiendo listeners !!", e);
        alert("Error inicializando controles de la página.");
        return; // Detener ejecución si falla aquí
    }



    // === Generar opción barco SOLO si tiene puerto ===
function agregarReclutaBarcoSiAplica() {
    const contenedor = document.getElementById('contenedor-reclutas');
    if (!contenedor || !gameState || !gameState.territorios) return;

    // Eliminar si ya existía
    const existente = contenedor.querySelector('.recluta-box[data-tipo="barco"]');
    if (existente) existente.remove();

    const tienePuerto = Object.values(gameState.territorios).some(
        t => t.propietario === casa && t.edificios.includes("Puerto")
    );

    if (!tienePuerto) return;

    // Crear visualmente
    const div = document.createElement('div');
    div.className = 'recluta-box';
    div.dataset.tipo = 'barco';
    div.dataset.costo = '20';
    div.innerHTML = `
      <h3>Barco</h3>
      <img src="../imgs/reclutar/barco.png" alt="Barco" style="width: 80px;">
      <div class="control-numero">
        <button class="btn-control" onclick="ajustarCantidad('barco', -1)">-</button>
        <span id="cantidad-barco">0</span>
        <button class="btn-control" onclick="ajustarCantidad('barco', 1)">+</button>
      </div>
      <p>Coste: 20 oro</p>
    `;
    contenedor.appendChild(div);

    // ======== Barco Corsario (solo Martell con el rumor) ========
const jugador = gameState.jugadores?.[nombre];
const tieneRumorCorsarios = jugador?.rumoresDesbloqueados?.includes("Corsarios del Mediodía");

if (casa === "Martell" && tienePuerto && tieneRumorCorsarios) {
  const existenteCorsario = contenedor.querySelector('.recluta-box[data-tipo="barcocorsario"]');
  if (existenteCorsario) existenteCorsario.remove();

  const divCorsario = document.createElement('div');
  divCorsario.className = 'recluta-box';
  divCorsario.dataset.tipo = 'barcocorsario';
  divCorsario.dataset.costo = '25';
  divCorsario.innerHTML = `
    <h3>Barco Corsario</h3>
    <img src="../imgs/reclutar/barco.png" alt="Barco Corsario" style="width: 80px;">
    <div class="control-numero">
      <button class="btn-control" onclick="ajustarCantidad('barcocorsario', -1)">-</button>
      <span id="cantidad-barcocorsario">0</span>
      <button class="btn-control" onclick="ajustarCantidad('barcocorsario', 1)">+</button>
    </div>
    <p>Coste: 25 oro</p>
  `;
  contenedor.appendChild(divCorsario);
}


    // ======== UNIDADES DE ASEDIO (si hay taller) ========
const tieneTaller = Object.values(gameState.territorios).some(
    t => t.propietario === casa && t.edificios.includes("Taller de maquinaria de asedio")
  );
  // Eliminar unidades de asedio anteriores si existen
['catapulta', 'torre', 'escorpion'].forEach(tipo => {
    const existente = contenedor.querySelector(`.recluta-box[data-tipo="${tipo}"]`);
    if (existente) existente.remove();
  });
  

  if (tieneTaller) {
    const unidadesAsedio = [
      { tipo: 'catapulta', nombre: 'Catapulta', costo: 20, imagen: 'catapulta.png' },
      { tipo: 'torre', nombre: 'Torre de Asedio', costo: 20, imagen: 'torreasedio.png' },
      { tipo: 'escorpion', nombre: 'Escorpión', costo: 20, imagen: 'escorpion.png' },
    ];
  
    unidadesAsedio.forEach(({ tipo, nombre, costo, imagen }) => {
      const div = document.createElement('div');
      div.className = 'recluta-box';
      div.dataset.tipo = tipo;
      div.dataset.costo = costo;
      div.innerHTML = `
        <h3>${nombre}</h3>
        <img src="../imgs/reclutar/${imagen}" alt="${nombre}" style="width: 80px;">
        <div class="control-numero">
          <button class="btn-control" onclick="ajustarCantidad('${tipo}', -1)">-</button>
          <span id="cantidad-${tipo}">0</span>
          <button class="btn-control" onclick="ajustarCantidad('${tipo}', 1)">+</button>
        </div>
        <p>Coste: ${costo} oro</p>
      `;
      contenedor.appendChild(div);
    });
  }

  // Arqueros Tully si tienen al menos una Arquería
if (casa === "Tully") {
  const tieneArqueria = Object.values(gameState.territorios).some(
    t => t.propietario === casa && t.edificios.includes("Arquería")
  );

  const yaExiste = contenedor.querySelector('.recluta-box[data-tipo="arquero"]');
  if (tieneArqueria && !yaExiste) {
    const div = document.createElement('div');
    div.className = 'recluta-box';
    div.dataset.tipo = 'arquero';
    div.dataset.costo = '6';
    div.innerHTML = `
      <h3>Arquero</h3>
      <img src="../imgs/reclutar/arqueros.png" alt="Arquero" style="width: 80px;">
      <div class="control-numero">
        <button class="btn-control" onclick="ajustarCantidad('arquero', -1)">-</button>
        <span id="cantidad-arquero">0</span>
        <button class="btn-control" onclick="ajustarCantidad('arquero', 1)">+</button>
      </div>
      <p>Coste: 6 oro</p>
    `;
    contenedor.appendChild(div);
  }
}


}

function agregarCaballeroSiArrynConAcademia() {
  const contenedor = document.getElementById('contenedor-reclutas');
  if (!contenedor || !gameState || !gameState.territorios) return;

const tieneAcademia = Object.values(gameState.territorios).some(
  t => t.propietario === casa && t.edificios.includes("Academia de Caballería")
);

if (!tieneAcademia) return;


  if (!tieneAcademia) return;

  // Evitar duplicados
  const existente = contenedor.querySelector('.recluta-box[data-tipo="caballero"]');
  if (existente) return;

  // Crear visualmente
  const div = document.createElement('div');
  div.className = 'recluta-box';
  div.dataset.tipo = 'caballero';
  div.dataset.costo = '10';
  div.innerHTML = `
    <h3>Caballero</h3>
    <img src="../imgs/reclutar/caballero.png" alt="Caballero" style="width: 80px;">
    <div class="control-numero">
      <button class="btn-control" onclick="ajustarCantidad('caballero', -1)">-</button>
      <span id="cantidad-caballero">0</span>
      <button class="btn-control" onclick="ajustarCantidad('caballero', 1)">+</button>
    </div>
    <p>Coste: 10 oro</p>
  `;
  contenedor.appendChild(div);
}

function agregarSacerdoteLuzSiBaratheon() {
  const contenedor = document.getElementById('contenedor-reclutas');
  if (!contenedor || casa !== "Baratheon") return;

  const existente = contenedor.querySelector('.recluta-box[data-tipo="sacerdoteLuz"]');
  if (!existente) {
    const div = document.createElement('div');
    div.className = 'recluta-box';
    div.dataset.tipo = 'sacerdoteLuz';
    div.dataset.costo = '20';
    div.innerHTML = `
      <h3>Sacerdote de Luz</h3>
      <img src="../imgs/reclutar/sacerdoteluz.png" alt="Sacerdote de Luz" style="width: 80px;">
      <div class="control-numero">
        <button class="btn-control" onclick="ajustarCantidad('sacerdoteLuz', -1)">-</button>
        <span id="cantidad-sacerdoteLuz">0</span>
        <button class="btn-control" onclick="ajustarCantidad('sacerdoteLuz', 1)">+</button>
      </div>
      <p>Coste: 20 oro</p>
    `;
    contenedor.appendChild(div);
  }
}

function agregarSacerdoteSalSiGreyjoy() {
  const cont = document.getElementById('contenedor-reclutas');
  if (!cont || casa !== "Greyjoy") return;
  // Ya agregado?
  if (cont.querySelector('.recluta-box[data-tipo="sacerdoteSal"]')) return;

  const div = document.createElement('div');
  div.className = 'recluta-box';
  div.dataset.tipo = 'sacerdoteSal';
  div.dataset.costo = '20';
  div.innerHTML = `
    <h3>Sacerdote de Sal</h3>
    <img src="../imgs/reclutar/sacerdoteluz.png" alt="Sacerdote de Sal" style="width: 80px;">
    <div class="control-numero">
      <button class="btn-control" onclick="ajustarCantidad('sacerdoteSal', -1)">-</button>
      <span id="cantidad-sacerdoteSal">0</span>
      <button class="btn-control" onclick="ajustarCantidad('sacerdoteSal', 1)">+</button>
    </div>
    <p>Coste: 20 oro</p>
  `;
  cont.appendChild(div);
}



function agregarReclutaAsedioSiAplica() {
    const contenedor = document.getElementById('contenedor-reclutas');
    if (!contenedor || !gameState || !gameState.territorios) return;

    const tieneTaller = Object.values(gameState.territorios).some(
        t => t.propietario === casa && t.edificios.includes("Taller de maquinaria de asedio")
    );

    // Eliminar unidades de asedio anteriores si existen
    ['catapulta', 'torre', 'escorpion'].forEach(tipo => {
        const existente = contenedor.querySelector(`.recluta-box[data-tipo="${tipo}"]`);
        if (existente) existente.remove();
    });

    if (!tieneTaller) return;

    const unidadesAsedio = [
        { tipo: 'catapulta', nombre: 'Catapulta', costo: 20, imagen: 'catapulta.png' },
        { tipo: 'torre', nombre: 'Torre de Asedio', costo: 20, imagen: 'torreasedio.png' },
        { tipo: 'escorpion', nombre: 'Escorpión', costo: 20, imagen: 'escorpion.png' }
    ];

    unidadesAsedio.forEach(({ tipo, nombre, costo, imagen }) => {
        const div = document.createElement('div');
        div.className = 'recluta-box';
        div.dataset.tipo = tipo;
        div.dataset.costo = costo;
        div.innerHTML = `
            <h3>${nombre}</h3>
            <img src="../imgs/reclutar/${imagen}" alt="${nombre}" style="width: 80px;">
            <div class="control-numero">
              <button class="btn-control" onclick="ajustarCantidad('${tipo}', -1)">-</button>
              <span id="cantidad-${tipo}">0</span>
              <button class="btn-control" onclick="ajustarCantidad('${tipo}', 1)">+</button>
            </div>
            <p>Coste: ${costo} oro</p>
        `;
        contenedor.appendChild(div);
    });
}



    // Mostrar modal inicial al entrar

// Evento para confirmar recursos iniciales
document.getElementById('btn-confirmar-iniciales').addEventListener('click', () => {
    const oro = parseInt(document.getElementById('input-oro-inicial').value) || 0;
    const tropas = parseInt(document.getElementById('input-tropas-iniciales').value) || 0;
    const rumorInicial = document.getElementById('select-rumor-inicial').value;

    if (casa === "Baratheon" && rumorInicial === "Llama de R'hllor"){
      socket.emit("baratheon-reclutar-sacerdotizaroja", {
        partida,
        nombre,
        cantidad:1,
      });
    }

    if (casa === "Targaryen" && rumorInicial === "Alianza de Sangre") {
      abrirModal("modal-casarse-alianza");
    }
  
    if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) {
      alert("⚠️ Aún no se ha recibido el estado del juego del servidor. Espera unos segundos y vuelve a intentar.");
      return;
    }
  
    socket.emit('confirmar-iniciales-turno1', { partida, nombre, tropas, oroExtra: oro,rumorInicial: rumorInicial || null });
    

  
    if (rumorInicial === "Aliento de los Antiguos" && casa === "Stark") {
        document.getElementById("modal-reclutar-huargos").style.display = "block"
  }

  if (rumorInicial === "Cornamenta de Skagos" && casa === "Stark") {
        document.getElementById("modal-reclutar-unicornios").style.display = "block";
  }

  if (rumorInicial === "Ecos de Harren el Negro" && casa === "Tully") {
        document.getElementById("modal-reclutar-murcielagos").style.display = "block";
  }

  if (rumorInicial === "Juramento sin Estandartes" && casa === "Tully") {
        document.getElementById("modal-reclutar-caballeros-tully").style.display = "block";
  }

  if (rumorInicial === "Acero y Juramento" && casa === "Targaryen") {
        document.getElementById("modal-reclutar-guardiareal").style.display = "block";
  }

  if (rumorInicial === "Rey de los Mares" && casa === "Greyjoy") {
        document.getElementById("modal-reclutar-barcolegendario").style.display = "block";
  }

  if (rumorInicial === "Trono de Viejo Wyck" && casa === "Greyjoy") {
        document.getElementById("modal-reclutar-tritones").style.display = "block";
  }

  if (rumorInicial === "Caza del Venado Blanco" && casa === "Baratheon") {
        document.getElementById("modal-reclutar-venadosblancos").style.display = "block"
  }

  if (rumorInicial === "Martillos de Tormenta" && casa === "Baratheon") {
        document.getElementById("modal-reclutar-martilladores").style.display = "block"
  }

  if (rumorInicial === "Caballeros de la Rosa" && casa === "Tyrell") {
        document.getElementById("modal-reclutar-caballerosdelarosa").style.display = "block"
  }

  if (rumorInicial === "El Portador del Alba" && casa === "Martell") {
        document.getElementById("modal-reclutar-guardiadelalba").style.display = "block"
  }

  if (rumorInicial === "Tributo de la Luna" && casa === "Arryn") {
        document.getElementById("modal-reclutar-barbaros").style.display = "block"
  }

  if (rumorInicial === "Alas del Valle" && casa === "Arryn") {
        document.getElementById("modal-reclutar-caballerosdelaguila").style.display = "block"
  }

  if (rumorInicial === "Llama de R'hllor" && casa === "Baratheon") {
        socket.emit("baratheon-reclutar-sacerdotizaroja", {
          partida,
          nombre,
          cantidad: 1
        });
  }

  if (rumorInicial === "Alianza de Sangre" && casa === "Targaryen") {
  const jineteCount = (gameState.jugadores[nombre]?.jinete || 0);

  if (jineteCount > 0) {
    prepararOpcionesCasamientoExtra();
    abrirModal("modal-casarse-alianza");
  } else {
    alianzaDeSangrePendiente = true;
  }
}

  
    actualizarInfoJugador();
    cerrarModal('modal-inicial');
    
  
  });
  
  // BLOQUEAR OPCIÓN DE BARCO SI NO TIENE PUERTO
const barcoBox = document.querySelector('.recluta-box[data-tipo="barco"]');
if (barcoBox) {
  const tienePuerto = Object.values(gameState.territorios).some(
    t => t.propietario === casa && t.edificios.includes("Puerto")
  );

  if (!tienePuerto) {
    barcoBox.style.opacity = 0.4;
    barcoBox.querySelectorAll('button').forEach(btn => btn.disabled = true);
    const aviso = document.createElement('p');
    aviso.style.color = 'red';
    aviso.style.fontSize = '0.85em';
    aviso.textContent = "⚠️ Necesitas un Puerto para reclutar barcos";
    barcoBox.appendChild(aviso);
  }
}

document.getElementById('btn-confirmar-perdidas-defensor')?.addEventListener('click', () => {
  const perdidas = {};
  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador) return;

  const unidades = [
    'tropas', 'tropasBlindadas', 'mercenarios', 'elite',
    'barcos', 'catapulta', 'torre', 'escorpion',
    'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero',
    'kraken','huargos','unicornios','murcielagos','guardiareal', 'jinete',
    'barcolegendario','tritones','barcocorsario','venadosblancos','martilladores',
    'caballerosdelarosa','guardiadelalba','sacerdotizaroja','barbaros','caballerosdelaguila',
    'sacerdoteSal'
  ];

  for (const key of unidades) {
    const input = document.getElementById(`perdidas-def-${key}`);
    if (!input) continue;
    const valor = parseInt(input.value) || 0;

    if (key === "tritones" && casa === "Greyjoy") {
      perdidas[key] = `tritones-final:${valor}`;
    } else if (valor > 0) {
      perdidas[key] = valor;
    }
  }

  const perdidasJinetes = parseInt(document.getElementById("perdidas-def-jinete")?.value) || 0;
  if (
    casa === "Targaryen" &&
    gameState?.jugadores?.[nombre]?.rumoresDesbloqueados?.includes("Fuego Heredado") &&
    perdidasJinetes > 0
  ) {
    jinetesPendientes = perdidasJinetes;
    mostrarReemplazoJinete();
  }

  cerrarModal('modal-perdidas-defensor');

  // 🧠 Emitimos las pérdidas al backend para que las registre ya
  socket.emit('perdidas-defensor', { partida, nombre, perdidas });

  // 🛳️ Si hay barcos, mostramos el modal de reparto encima
  const barcosPerdidos = perdidas.barcos || 0;
  if (barcosPerdidos > 0) {
    barcosPerdidosPendientes = barcosPerdidos;
    transferenciasBarcos = [];
    poblarCasasBarco();
    mostrarModalTransferenciaBarco();
  }

  // ⚔️ Si es casa Arryn, mostrar caballeros si aplica
  if (casa === "Arryn") {
    abrirModal('modal-caballero-batalla-arryn');
  }

  window.refuerzoTullyConfirmado = false;
});




document.getElementById('btn-confirmar-soborno-final-lannister')?.addEventListener('click', () => {
  const perdidas = parseInt(document.getElementById('input-tropas-perdidas-soborno-lannister').value) || 0;
  const gano = document.querySelector('input[name="soborno-resultado"]:checked')?.value === 'si';

  cerrarModal('modal-soborno-final-lannister');
  socket.emit('lannister-soborno-final', { partida, nombre, perdidas, gano });
  terminarAccionEspecifica('Soborno');
});

document.getElementById('btn-confirmar-soborno-defensor')?.addEventListener('click', () => {
  const perdidas = parseInt(document.getElementById('input-tropas-perdidas-soborno-defensor').value) || 0;
  cerrarModal('modal-soborno-final-defensor');
  socket.emit('defensor-soborno-perdidas', { partida, nombre, perdidas });
});



document.getElementById('btn-confirmar-inicial-arryn').addEventListener('click', () => {
  const caballeros = parseInt(document.getElementById('input-caballeros-arryn').value) || 0;
  const oro = parseInt(document.getElementById('input-oro-arryn').value) || 0;
  const tropas = parseInt(document.getElementById('input-tropas-arryn').value) || 0;
  const rumorInicial = document.getElementById('select-rumor-inicial-arryn').value;

  socket.emit("arryn-inicial-completo", {
    partida,
    nombre,
    caballeros,
    oro,
    tropas,
    rumorInicial
  });

  if (rumorInicial === "Tributo de la Luna" && casa === "Arryn") {
        document.getElementById("modal-reclutar-barbaros").style.display = "block"
  }

  if (rumorInicial === "Alas del Valle" && casa === "Arryn") {
        document.getElementById("modal-reclutar-caballerosdelaguila").style.display = "block"
  }

  cerrarModal("modal-inicial-arryn");
});


document.getElementById('btn-confirmar-inicial-tyrell').addEventListener('click', () => {
  const territorio = document.getElementById('select-tyrell-granja').value;
  const oro = parseInt(document.getElementById('input-oro-tyrell').value) || 0;
  const tropas = parseInt(document.getElementById('input-tropas-tyrell').value) || 0;
  const rumorInicial = document.getElementById('select-rumor-inicial-tyrell').value;

  if (!territorio) {
    alert("Debes seleccionar un territorio para la Granja.");
    return;
  }

  socket.emit("tyrell-inicial-completo", {
    partida,
    nombre,
    territorio,
    oro,
    tropas,
    rumorInicial
  });

  if (rumorInicial === "Caballeros de la Rosa" && casa === "Tyrell") {
        document.getElementById("modal-reclutar-caballerosdelarosa").style.display = "block"
  }

  cerrarModal("modal-inicial-tyrell");
});

// Hacerla accesible globalmente para el HTML (para el onclick)
window.agregarAliadoAtacante = function () {
  const lista = document.getElementById('lista-aliados-atacantes');
  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = '6px';

  const select = document.createElement('select');
  select.classList.add('select-aliado');

  getListaCasasPosibles().forEach(c => {
    if (c !== casa) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    }
  });

  wrapper.appendChild(select);
  lista.appendChild(wrapper);
}

window.confirmarAtaqueCoordinado = confirmarAtaqueCoordinado;

document.querySelectorAll('input[name="resultado-ataque1"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const cont = document.getElementById('asignar-propietario-ataque1');
    if (radio.value === 'si' && radio.checked) {
      cont.style.display = 'block';
      poblarSelectPropietarios();
    } else {
      cont.style.display = 'none';
    }
  });
});

document.querySelectorAll('input[name="resultado-ataque2"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const cont = document.getElementById('asignar-propietario-ataque2');
    if (radio.value === 'si' && radio.checked) {
      cont.style.display = 'block';
      poblarSelectPropietarios();
    } else {
      cont.style.display = 'none';
    }
  });
});


// Al final de document.addEventListener('DOMContentLoaded', …)
socket.emit('pedir-estado', { partida, nombre });




// Se ejecuta cuando el cliente se conecta al servidor
    // 5. Esperar conexión y solicitar estado inicial (manejado por socket.on('connect'))
    console.log("Esperando conexión al servidor para unirse a la sala y recibir estado...");

    console.log("==========================================");
    console.log("Inicialización del cliente de juego COMPLETADA.");
// Cuando se cargue completamente el HTML, empieza la inicialización
}); // Fin DOMContentLoaded

// =============================================
// PARTE 4: LISTENERS DE SOCKET.IO
// =============================================
// Cuando se cargue completamente el HTML, empieza la inicialización
// (Estos se definen fuera de DOMContentLoaded para estar siempre activos)

// Se ejecuta cuando el cliente se conecta al servidor
socket.on('connect', () => {
    console.log(`[Juego ${nombre}] Conectado al servidor con ID: ${socket.id}`);
    // Solicitar unirse a la sala específica del juego
    if (partida && nombre) {
        console.log(`[${nombre}] Conectado. Emitiendo 'unirse-sala-juego' a ${partida}`);
        socket.emit('unirse-sala-juego', { partida, nombre });
        nombreJugador = nombre;
        // El servidor responderá con 'actualizar-estado-juego' si la unión es exitosa
    } else {
        console.error("Error crítico: Falta 'partida' o 'nombre' al conectar.");
        alert("Error de conexión: Faltan datos de la partida.");
    }
});


// Se ejecuta cuando el cliente se desconecta del servidor
socket.on('disconnect', (reason) => {
    console.warn(`[Juego ${nombre}] Desconectado: ${reason}`);
    alert("¡Desconectado del servidor! Intenta recargar la página.");
    // Deshabilitar UI para evitar acciones inválidas
    deshabilitarBotonesAccion(true);
    document.getElementById('turno-jugador').textContent = 'Desconectado';
    document.getElementById('accion-jugador').textContent = '';
});

socket.on('error', (mensaje) => {
    console.error(`[Juego ${nombre}] Error del servidor: ${mensaje}`);
    alert(`Error del servidor: ${mensaje}`);
});

socket.on('error-accion', (mensaje) => {
    console.warn(`[Juego ${nombre}] Acción inválida recibida: ${mensaje}`);
    alert(`Acción inválida: ${mensaje}`);
    // Reactivar botones si el jugador estaba esperando y la acción falló
    if (gameState && gameState.jugadoresAccionTerminada && !gameState.jugadoresAccionTerminada.includes(nombre)) {
        deshabilitarBotonesAccion(false); // Habilitar de nuevo
        actualizarTurnoAccionUI(); // Restaurar texto/estado del botón principal
    }
});

socket.on("mostrar-modal-territorios-revuelta", ({ territorios }) => {
  const contenedor = document.getElementById("lista-territorios-revuelta");
  contenedor.innerHTML = "";

  territorios.forEach(nombre => {
    const div = document.createElement("div");
    div.innerHTML = `
      <input type="checkbox" value="${nombre}" id="check-${nombre}">
      <label for="check-${nombre}">${nombre}</label>
    `;
    contenedor.appendChild(div);
  });

  abrirModal("modal-territorios-revuelta");
});


socket.on("abrir-modal-revuelta-perdidas", ({ casaAtacante }) => {
  renderizarInputsPerdidasRevuelta();
  poblarTerritoriosCheckbox();
  abrirModal("modal-perdidas-revuelta");

  nombreObjetivoRevuelta = nombre;
});



socket.on('mostrar-modal-robo-moral', () => {
  const casas = [
    "Stark", "Lannister", "Targaryen", "Baratheon", "Greyjoy",
    "Tyrell", "Martell", "Arryn", "Tully"
  ];

  const select = document.getElementById("select-casa-robo-tropas");
  select.innerHTML = '<option value="">-- Selecciona casa --</option>';
  casas.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });

  document.getElementById("input-cantidad-robo-tropas").value = 1;
  abrirModal("modal-robar-tropas-moral");
});



socket.on("preguntar-reemplazo-jinetes", ({ cantidad }) => {
  jinetesPendientes = cantidad;
  mostrarReemplazoJinete();
});


socket.on("forzar-reclutar-huargos", () => {
  verificarHuargosStark();
});

socket.on("forzar-reclutar-guardiareal", () => {
  verificarGuardiarealTargaryen();
});

socket.on("forzar-reclutar-barcolegendario", () => {
  verificarbarcolegendarioGreyjoy();
});

socket.on("forzar-reclutar-tritones", () => {
  verificartritonesGreyjoy();
});


socket.on("forzar-reclutar-murcielagos", () => {
  verificarMurcielagosTully();
});

socket.on("forzar-reclutar-caballeros-tully", () => {
  verificarCaballerosTully();
});

socket.on("forzar-reclutar-unicornios", () => {
  verificarUnicorniosStark();
});

socket.on("forzar-reclutar-venadosblancos", () => {
  verificarVenadosBlancosBaratheon();
});

socket.on("forzar-reclutar-martilladores", () => {
  verificarMartilladoresBaratheon();
});
socket.on("forzar-reclutar-caballerosdelarosa", () => {
  verificarCaballerosdelarosaTyrell();
});

socket.on("forzar-reclutar-guardiadelalba", () => {
  verificarGuardiadelAlbaMartell();
});

socket.on("forzar-reclutar-barbaros", () => {
  verificarBarbarosArryn();
});

socket.on("forzar-reclutar-caballerosdelaguila", () => {
  verificarCaballerosdelaguilaArryn();
});


socket.on("abrir-modal-militantes-fe", () => {
  document.getElementById("input-militantes-fe").value = 1;
  abrirModal("modal-militantes-fe");
});

socket.on('abrir-modal-perdidas-ataque', ({ jugador, datosJugador }) => {
  if (jugador !== nombre) return; // Solo abre para el jugador correcto
  renderizarModalPerdidasAtaque(datosJugador);
});

socket.on('abrir-modal-perdidas-defensor', () => {
  renderizarModalPerdidasDefensor();
});




socket.on('avanzar-accion', (nuevoEstado) => {
    console.log(`[${nombre}] Recibido 'avanzar-accion'`, nuevoEstado);
    if (gameState && nuevoEstado) {
        // Actualizar solo las propiedades relevantes del avance
        gameState.turno = nuevoEstado.turno;
        gameState.accion = nuevoEstado.accion;
        gameState.fase = nuevoEstado.fase;
        gameState.jugadoresAccionTerminada = []; // Todos empiezan sin haber terminado
    } else if(nuevoEstado){
        console.warn("Recibido 'avanzar-accion' pero gameState local es nulo. Esperando estado completo.");
        // Podríamos almacenar temporalmente nuevoEstado y aplicarlo cuando llegue gameState
    }

    cerrarModal('modal-espera-accion');
    if (casa === "Stark") {
  contadorAccionesNorte = 0;
  if (casa === "Stark") {
  document.getElementById('btn-stark-atacar')?.style.setProperty('display', 'inline-block');
  document.getElementById('btn-stark-mover')?.style.setProperty('display', 'inline-block');
}

  const spanContador = document.getElementById('valor-contador-stark');
  if (spanContador) {
    spanContador.textContent = contadorAccionesNorte;
  }
}

    // Actualizar UI y reactivar botones (si no es Fase Neutral)
    if (gameState?.fase === 'Neutral') {

        tropasPerdidas = 0;
        perdidasPorUnidad = {};
        territoriosPerdidos = [];
        nuevoPropietarioPorTerritorio = {};

        
        // Reiniciar pasos visuales del modal
  document.getElementById('fase-neutral-paso1').style.display = 'block';
  document.getElementById('fase-neutral-paso2').style.display = 'none';
  document.getElementById('fase-neutral-paso3').style.display = 'none';
  document.getElementById('fase-neutral-paso4').style.display = 'none';
    
        // Reiniciar pasos del modal
         document.getElementById('btn-stark-atacar').style.display = 'none'
  document.getElementById('btn-stark-mover').style.display = 'none'

    
        renderizarInputsPerdidas();
        abrirModal('modal-fase-neutral');

    }
       actualizarTurnoAccionUI();
    
    
    deshabilitarBotonesAccion(gameState?.fase === 'Neutral');
    

    console.log(`[${nombre}] Avanzado localmente a T${gameState?.turno}, A${gameState?.accion}, F:${gameState?.fase}`);
});

socket.on('modal-caballero-batalla-arryn', () => {
  abrirModal('modal-caballero-batalla-arryn');
});


socket.on('abrir-modal-soborno-lannister-final', ({ territorio }) => {
  abrirModal('modal-soborno-final-lannister');
});

socket.on('abrir-modal-soborno-rival', ({ territorio, cantidad }) => {
  abrirModal('modal-soborno-final-defensor');
});


socket.on('lannister-impuestos-usados', ({ oroGanado }) => {
  alert(`💰 Has cobrado ${oroGanado} de oro por Doble Impuestos.`);
  document.getElementById('input-tropas-perdidas-impuestos').value = 0;
  abrirModal('modal-lannister-perdidas');
  terminarAccionEspecifica('Doble Impuestos');
});


socket.on('estado-espera-jugadores', (mensaje) => {
    // Mostrar mensaje de espera solo si este jugador *no* ha terminado su acción aún
     if (estadoTurnoEl && gameState && gameState.fase === 'Accion' && !gameState.jugadoresAccionTerminada?.includes(nombre)) {
        estadoTurnoEl.textContent = mensaje;
     } else if (estadoTurnoEl) {
         estadoTurnoEl.textContent = ""; // Limpiar en otros casos
     }
});

socket.on('abrir-modal-asignar-territorios', ({ territorios, posiblesCasas }) => {
  const contenedor = document.getElementById('lista-territorios-asignar');
  contenedor.innerHTML = '';

  territorios.forEach(t => {
    const div = document.createElement('div');
    div.innerHTML = `
      <p><strong>${t}</strong></p>
      <label>¿Victoria?
        <select id="victoria-${t}" onchange="toggleSelectPropietario('${t}')">
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>
      </label>
      <div id="selector-prop-${t}" style="margin-top: 5px; display: none;">
        <label>Nuevo propietario:
          <select id="select-prop-${t}">
            ${posiblesCasas.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </label>
      </div>
      <hr>
    `;
    contenedor.appendChild(div);
  });

  abrirModal('modal-asignar-territorios');
});

window.toggleSelectPropietario = function(nombreTerritorio) {
  const victoria = document.getElementById(`victoria-${nombreTerritorio}`).value;
  const selector = document.getElementById(`selector-prop-${nombreTerritorio}`);
  selector.style.display = (victoria === 'si') ? 'block' : 'none';
}




// Listener PRINCIPAL para recibir y aplicar el estado del juego
// Recibe y actualiza el estado del juego completo desde el servidor
socket.on('actualizar-estado-juego', (estadoRecibido) => {

    console.log("[Cliente] Recibido 'actualizar-estado-juego'");
    // console.log(estadoRecibido); // Descomentar para depurar el estado recibido



    if (!estadoRecibido || typeof estadoRecibido !== 'object') {
        console.error("Estado recibido inválido o vacío.");
        return;
    }

    // --- Estrategia de Actualización: Reemplazo Completo ---
    // Por simplicidad y robustez inicial, reemplazamos todo el gameState local.
    // Más adelante se podría optimizar para fusionar solo cambios.
    gameState = estadoRecibido;
    console.log("   -> GameState local actualizado completamente.");
    console.log("PENEEEEEEEEEEEEEEEEEE", gameState.accion);

    renderizarRumoresDesbloqueados();

    console.log(gameState)
    console.log(gameState.jugadores)
    // Validar que el gameState recibido es usable
    if (!gameState.jugadores || !gameState.territorios || !gameState.jugadores[nombre]) {
        console.error("El estado recibido no contiene la información mínima necesaria (jugadores, territorios, datos propios).");
        // Podríamos intentar solicitar de nuevo el estado o mostrar un error grave.
        alert("Error al sincronizar con el servidor. Intenta recargar.");
        return;
    }

    if (alianzaDeSangrePendiente) {
  const jineteActualizado = (gameState.jugadores[nombre]?.jinete || 0);
  if (jineteActualizado > 0) {
    alianzaDeSangrePendiente = false;
    prepararOpcionesCasamientoExtra();
    abrirModal("modal-casarse-alianza");
  }
}



    // --- Actualizar TODA la UI basada en el nuevo gameState ---
    try {
        actualizarInfoJugador();
        actualizarTurnoAccionUI();
        actualizarEdificiosJugador();
        actualizarUnidadesMilitares();


        // Habilitar/Deshabilitar botones según la fase actual y si el jugador ya terminó
        deshabilitarBotonesAccion(gameState.fase === 'Neutral' || gameState.jugadoresAccionTerminada?.includes(nombre));

        console.log("   -> UI actualizada correctamente.");
    } catch (error) {
        console.error("Error al actualizar la UI con el nuevo estado:", error);
        // Intentar continuar, pero loguear el error.
    }

    const jugador = gameState.jugadores?.[nombre];
const yaTermino = gameState.jugadoresAccionTerminada?.includes(nombre);

// Solo mostrar el modal si es turno 1, acción 1 y el jugador NO ha terminado
if (
  gameState.turno === 1 &&
  gameState.accion === 1 &&
  !modalInicialYaMostrado
) {
  if (casa === "Tyrell") {
    poblarSelectTyrellGranja();
    poblarRumoresInicialesTyrell();
    abrirModal("modal-inicial-tyrell");
  } else if (casa === "Arryn") {
    poblarRumoresInicialesArryn();
    abrirModal("modal-inicial-arryn");
  } else {
    poblarRumoresIniciales();
    abrirModal("modal-inicial");
  }
  modalInicialYaMostrado = true;
}


// Si el contador del norte ya llegó a 2, asegúrate de ocultar el botón
contadorAccionesNorte--
incrementarContadorNorte();
});

  





// Listener para cuando otro jugador se desconecta (opcional)
socket.on('jugador-desconectado', (nombreDesconectado) => {
    console.log(`[Juego] Jugador ${nombreDesconectado} se ha desconectado.`);
    alert(`Jugador ${nombreDesconectado} se ha desconectado.`);
    // La UI de espera se actualizará automáticamente si afecta al avance del turno
});

// ====== NUEVO RECLUTAMIENTO VISUAL ======
const preciosReclutas = {
    soldado: 4,
    mercenario: casa === "Martell" ? 5 : 8,
    elite: casa === "Martell" ? 9 : 15,
    barco: 20,
    catapulta: 20,
    torre: 20,
    escorpion: 20,
    sacerdoteLuz: 20,
    sacerdoteSal:20,
    caballero: 10,
    soldadoBlindado: 10,
    armadura: 6,
    arquero: 6,
    barcocorsario: 25,


};
  

  
  const cantidadesReclutas = {
    soldado: 0,
    mercenario: 0,
    elite: 0,
    barco: 0,
    catapulta: 0,
    torre: 0,
    escorpion: 0,
    sacerdoteLuz: 0,
    sacerdoteSal:0,
    soldadoBlindado: 0,
    armadura: 0,
    arquero: 0,

  };
  
  function abrirModalGanarRumor() {
  const jugador = gameState.jugadores[nombre];
  const casaJugador = jugador?.casa;
  const rumoresCasa = RUMORES_POR_CASA[casaJugador] || [];
  const desbloqueados = jugador?.rumoresDesbloqueados || [];


  // Si ya tiene los 3 rumores desbloqueados, no hacer nada
  if (desbloqueados.length >= rumoresCasa.length) {
    console.log("Todos los rumores ya están desbloqueados, no se pregunta.");
    return;
  }

  // Si aún puede ganar rumor, mostramos el modal
  document.getElementById("modal-ganar-rumor").style.display = "block";
}

function poblarCasasBarco() {
  const select = document.getElementById('select-casa-barco');
  select.innerHTML = '<option value="">-- Nadie (se pierde) --</option>';
  Object.values(gameState.jugadores || {}).forEach(j => {
    if (j.casa !== casa) {
      const option = document.createElement("option");
      option.value = j.casa;
      option.textContent = j.casa;
      select.appendChild(option);
    }
  });
}

function mostrarModalTransferenciaBarco() {
  abrirModal('modal-barco-perdido-transferencia');
}

function confirmarTransferenciaBarco() {
  const casaElegida = document.getElementById('select-casa-barco').value;
  transferenciasBarcos.push(casaElegida); // "" significa que se elimina

  cerrarModal('modal-barco-perdido-transferencia');
  barcosPerdidosPendientes--;

  if (barcosPerdidosPendientes > 0) {
      poblarCasasBarco();
      mostrarModalTransferenciaBarco();
  } else {
    // Aquí ya puedes emitir al backend o continuar el flujo normal
    socket.emit("transferencia-barcos", {
      partida,
      nombre,
      transferencias: transferenciasBarcos
    });
  }
}


function confirmarGanarRumor(haGanado) {
  document.getElementById("modal-ganar-rumor").style.display = "none";
  if (haGanado) {
    abrirModalElegirRumor();
  } else {
    socket.emit("rumor-cancelado", { partida, nombre });
    verificarHuargosStark();
    verificarUnicorniosStark();
    verificarMurcielagosTully();
    verificarGuardiarealTargaryen();
    verificarbarcolegendarioGreyjoy();
    verificartritonesGreyjoy();
    verificarVenadosBlancosBaratheon();
    verificarMartilladoresBaratheon();
    verificarCaballerosdelarosaTyrell();
    verificarGuardiadelAlbaMartell();
    verificarBarbarosArryn();
    verificarCaballerosdelaguilaArryn();
    
  }
}

function abrirModalElegirRumor() {
  const select = document.getElementById("select-rumor");
  select.innerHTML = "";

  const jugador = gameState.jugadores[nombre];
  const casaJugador = jugador?.casa;
  const desbloqueados = jugador?.rumoresDesbloqueados || [];

  const lista = RUMORES_POR_CASA[casaJugador] || [];

  // Solo mostramos los rumores que aún NO están desbloqueados
  const rumoresDisponibles = lista.filter(r => !desbloqueados.includes(r));

  rumoresDisponibles.forEach(r => {
    const option = document.createElement("option");
    option.value = r;
    option.innerText = r;
    select.appendChild(option);
  });

  document.getElementById("modal-elegir-rumor").style.display = "block";
}



function confirmarRumorElegido() {
  console.log("aaaaaaaaaaaaRUMOOOOOOOOOOOOOOOOOOOOOOOASDFASFASFASFASFASFASaaa")
  const select = document.getElementById("select-rumor");
  const rumorSeleccionado = select.value;

  document.getElementById("modal-elegir-rumor").style.display = "none";

  socket.emit("rumor-desbloqueado", {
    partida,
    nombre,
    rumor: rumorSeleccionado
  });

  // Mostrar modal de Huargos si es el rumor especial de Stark
  if (rumorSeleccionado === "Aliento de los Antiguos" && casa === "Stark") {
        document.getElementById("modal-reclutar-huargos").style.display = "block"
  }

  if (rumorSeleccionado === "Cornamenta de Skagos" && casa === "Stark") {
        document.getElementById("modal-reclutar-unicornios").style.display = "block";
  }

  if (rumorSeleccionado === "Ecos de Harren el Negro" && casa === "Tully") {
        document.getElementById("modal-reclutar-murcielagos").style.display = "block";
  }

  if (rumorSeleccionado === "Juramento sin Estandartes" && casa === "Tully") {
        document.getElementById("modal-reclutar-caballeros-tully").style.display = "block";
  }

  if (rumorSeleccionado === "Acero y Juramento" && casa === "Targaryen") {
        document.getElementById("modal-reclutar-guardiareal").style.display = "block";
  }

  if (rumorSeleccionado === "Rey de los Mares" && casa === "Greyjoy") {
        document.getElementById("modal-reclutar-barcolegendario").style.display = "block";
  }

  if (rumorSeleccionado === "Trono de Viejo Wyck" && casa === "Greyjoy") {
        document.getElementById("modal-reclutar-tritones").style.display = "block";
  }

  if (rumorSeleccionado === "Caza del Venado Blanco" && casa === "Baratheon") {
        document.getElementById("modal-reclutar-venadosblancos").style.display = "block"
  }

  if (rumorSeleccionado === "Martillos de Tormenta" && casa === "Baratheon") {
        document.getElementById("modal-reclutar-martilladores").style.display = "block"
  }

  if (rumorSeleccionado === "Caballeros de la Rosa" && casa === "Tyrell") {
        document.getElementById("modal-reclutar-caballerosdelarosa").style.display = "block"
  }

  if (rumorSeleccionado === "El Portador del Alba" && casa === "Martell") {
        document.getElementById("modal-reclutar-guardiadelalba").style.display = "block"
  }

  if (rumorSeleccionado === "Tributo de la Luna" && casa === "Arryn") {
        document.getElementById("modal-reclutar-barbaros").style.display = "block"
  }

  if (rumorSeleccionado === "Alas del Valle" && casa === "Arryn") {
        document.getElementById("modal-reclutar-caballerosdelaguila").style.display = "block"
  }

  if (rumorSeleccionado === "Llama de R'hllor" && casa === "Baratheon") {
        socket.emit("baratheon-reclutar-sacerdotizaroja", {
          partida,
          nombre,
          cantidad: 1
        });
  }

  if (rumorSeleccionado === "Alianza de Sangre" && casa === "Targaryen") {
  const jineteCount = (gameState.jugadores[nombre]?.jinete || 0);

  if (jineteCount > 0) {
    prepararOpcionesCasamientoExtra();
    abrirModal("modal-casarse-alianza");
  } else {
    alianzaDeSangrePendiente = true;
  }
}
  verificarHuargosStark();
  verificarUnicorniosStark();
  verificarMurcielagosTully();
  verificarGuardiarealTargaryen();
  verificarbarcolegendarioGreyjoy();
  verificartritonesGreyjoy();
  verificarVenadosBlancosBaratheon();
  verificarMartilladoresBaratheon();
  verificarCaballerosdelarosaTyrell();
  verificarGuardiadelAlbaMartell();
  verificarBarbarosArryn();
  verificarCaballerosdelaguilaArryn();
}

function verificarHuargosStark() {
  const jugador = gameState.jugadores[nombre];

  if (
    jugador?.casa === "Stark" &&
    jugador.rumoresDesbloqueados?.includes("Aliento de los Antiguos") &&
    (!jugador.huargos || jugador.huargos === 0)
  ) {
      document.getElementById("modal-reclutar-huargos").style.display = "block";
  }
}

function verificarUnicorniosStark() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Stark" &&
    jugador.rumoresDesbloqueados?.includes("Cornamenta de Skagos") &&
    (!jugador.unicornios || jugador.unicornios === 0)
  ) {
      document.getElementById("modal-reclutar-unicornios").style.display = "block";
  }
}

function verificarMurcielagosTully() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Tully" &&
    jugador.rumoresDesbloqueados?.includes("Ecos de Harren el Negro") &&
    (!jugador.murcielagos || jugador.murcielagos === 0)
  ) {
      document.getElementById("modal-reclutar-murcielagos").style.display = "block";
  }
}

function verificarCaballerosTully() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Tully" &&
    jugador.rumoresDesbloqueados?.includes("Juramento sin Estandartes") &&
    (!jugador.caballeros || jugador.caballeros === 0)
  ) {
      document.getElementById("modal-reclutar-caballeros-tully").style.display = "block";
  }
}

function verificarGuardiarealTargaryen() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Targaryen" &&
    jugador.rumoresDesbloqueados?.includes("Acero y Juramento") &&
    (!jugador.guardiareal || jugador.guardiareal === 0)
  ) {
      document.getElementById("modal-reclutar-guardiareal").style.display = "block";
  }
}

function verificarbarcolegendarioGreyjoy() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Greyjoy" &&
    jugador.rumoresDesbloqueados?.includes("Rey de los Mares") &&
    (!jugador.barcolegendario || jugador.barcolegendario === 0)
  ) {
      document.getElementById("modal-reclutar-barcolegendario").style.display = "block";
  }
}

function verificartritonesGreyjoy() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Greyjoy" &&
    jugador.rumoresDesbloqueados?.includes("Trono de Viejo Wyck") &&
    (!jugador.tritones || jugador.tritones === 0)
  ) {
      document.getElementById("modal-reclutar-tritones").style.display = "block";
  }
}

function verificarVenadosBlancosBaratheon() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Baratheon" &&
    jugador.rumoresDesbloqueados?.includes("Caza del Venado Blanco") &&
    (!jugador.venadosblancos || jugador.venadosblancos === 0)
  ) {
      document.getElementById("modal-reclutar-venadosblancos").style.display = "block";
  }
}

function verificarMartilladoresBaratheon() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Baratheon" &&
    jugador.rumoresDesbloqueados?.includes("Martillos de Tormenta") &&
    (!jugador.martilladores || jugador.martilladores === 0)
  ) {
      document.getElementById("modal-reclutar-martilladores").style.display = "block";
  }
}

function verificarCaballerosdelarosaTyrell() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Tyrell" &&
    jugador.rumoresDesbloqueados?.includes("Caballeros de la Rosa") &&
    (!jugador.caballerosdelarosa || jugador.caballerosdelarosa === 0)
  ) {
      document.getElementById("modal-reclutar-caballerosdelarosa").style.display = "block";
  }
}

function verificarGuardiadelAlbaMartell() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Martell" &&
    jugador.rumoresDesbloqueados?.includes("El Portador del Alba") &&
    (!jugador.guardiadelalba || jugador.guardiadelalba === 0)
  ) {
      document.getElementById("modal-reclutar-guardiadelalba").style.display = "block";
  }
}

function verificarBarbarosArryn() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Arryn" &&
    jugador.rumoresDesbloqueados?.includes("Tributo de la Luna") &&
    (!jugador.barbaros || jugador.barbaros === 0)
  ) {
      document.getElementById("modal-reclutar-barbaros").style.display = "block";
  }
}

function verificarCaballerosdelaguilaArryn() {
  const jugador = gameState.jugadores[nombre];
  if (
    jugador?.casa === "Arryn" &&
    jugador.rumoresDesbloqueados?.includes("Alas del Valle") &&
    (!jugador.caballerosdelaguila || jugador.caballerosdelaguila === 0)
  ) {
      document.getElementById("modal-reclutar-caballerosdelaguila").style.display = "block";
  }
}


function confirmarReclutarUnicornios() {
  const cantidad = parseInt(document.getElementById("cantidad-unicornios").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("stark-reclutar-unicornios", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-unicornios").style.display = "none";
}


function confirmarReclutarHuargos() {
  const cantidad = parseInt(document.getElementById("cantidad-huargos").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("stark-reclutar-huargos", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-huargos").style.display = "none";
}

function confirmarReclutarGuardiaReal() {
  const cantidad = parseInt(document.getElementById("cantidad-guardiareal").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("targaryen-reclutar-guardiareal", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-guardiareal").style.display = "none";
}

function confirmarReclutarBarcoLegendario() {
  const cantidad = parseInt(document.getElementById("cantidad-barcolegendario").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("greyjoy-reclutar-barcolegendario", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-barcolegendario").style.display = "none";
}

function confirmarReclutarTritones() {
  const cantidad = parseInt(document.getElementById("cantidad-tritones").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("greyjoy-reclutar-tritones", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-tritones").style.display = "none";
}

function confirmarReclutarVenadosBlancos() {
  const cantidad = parseInt(document.getElementById("cantidad-venadosblancos").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("baratheon-reclutar-venadosblancos", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-venadosblancos").style.display = "none";
}

function confirmarReclutarMartilladores() {
  const cantidad = parseInt(document.getElementById("cantidad-martilladores").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("baratheon-reclutar-martilladores", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-martilladores").style.display = "none";
}

function confirmarReclutarCaballerosDeLaRosa() {
  const cantidad = parseInt(document.getElementById("cantidad-caballerosdelarosa").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("tyrell-reclutar-caballerosdelarosa", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-caballerosdelarosa").style.display = "none";
}

function confirmarReclutarGuardiaDelAlba() {
  const cantidad = parseInt(document.getElementById("cantidad-guardiadelalba").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("martell-reclutar-guardiadelalba", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-guardiadelalba").style.display = "none";
}

function confirmarReclutarBarbaros() {
  const cantidad = parseInt(document.getElementById("cantidad-barbaros").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("arryn-reclutar-barbaros", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-barbaros").style.display = "none";
}

function confirmarReclutarCaballerosDelAguila() {
  const cantidad = parseInt(document.getElementById("cantidad-caballerosdelaguila").value);
  if (isNaN(cantidad) || cantidad <= 0) return;

  socket.emit("arryn-reclutar-caballerosdelaguila", {
    partida,
    nombre,
    cantidad
  });

  document.getElementById("modal-reclutar-caballerosdelaguila").style.display = "none";
}



  
  function confirmarMilitantesFe() {
    const cantidad = parseInt(document.getElementById("input-militantes-fe").value) || 0;
    if (cantidad <= 0) return;
    cerrarModal("modal-militantes-fe");
    socket.emit("confirmar-militantes-fe", { partida, nombre, cantidad });

    renderizarRumoresDesbloqueados();

  }
  
  
  // Calcula y muestra el costo total
  function actualizarCostoTotalRecluta() {
  let total = 0;
  let descuento = 0;

  let descuentoGranja = 0;
  for (const t of Object.values(gameState.territorios)) {
    if (t.propietario === casa && Array.isArray(t.edificios)) {
      descuentoGranja += t.edificios.filter(e => e === "Granja").length;
    }
  }

  // Calculamos el total de aserraderos
  for (const t of Object.values(gameState.territorios)) {
    if (t.propietario === casa && Array.isArray(t.edificios)) {
      descuento += t.edificios.filter(e => e === "Aserradero").length * 5;
    }
  }

  for (const tipo in cantidadesReclutas) {
    const cantidad = cantidadesReclutas[tipo];
    const precioBase = preciosReclutas[tipo];
  
    let precioFinal = precioBase;

    if (tipo === "soldado" || tipo === "regulares") {
      precioFinal = Math.max(0, precioBase - descuentoGranja);
    }

    if (["barco", "catapulta", "torre", "escorpion"].includes(tipo)) {
      let base = precioBase;
      if (
        tipo === "barco" &&
        casa === "Greyjoy" &&
        gameState.jugadores[nombre].rumoresDesbloqueados?.includes("Madera del Abismo")
      ) {
        base -= 10;
      }
      precioFinal = Math.max(0, base - descuento);
    }

    if (tipo === "barcocorsario") {
      if (
        casa === "Martell" &&
        gameState.jugadores[nombre].rumoresDesbloqueados?.includes("Corsarios del Mediodía")
      ) {
        precioFinal = Math.max(0, precioBase - descuento);
      } else {
        precioFinal = 999; // Si no debería poderse reclutar, lo ponemos muy caro
      }
    }

    total += cantidad * precioFinal;

    // Cambiar el texto visual del coste
    const box = document.querySelector(`.recluta-box[data-tipo="${tipo}"]`);
    if (box) {
      const p = box.querySelector('p');
      if (p) {
        p.textContent = `Coste: ${precioFinal} oro`;
      }
    }
  }

  document.getElementById('costo-total-recluta').textContent = total;
}


  function renderizarModalPerdidasLannister() {
  const contenedor = document.getElementById('lista-perdidas-lannister');
  contenedor.innerHTML = '';

  const jugador = gameState?.jugadores?.[nombre];
  if (!jugador) return;

  const unidades = [
    { key: 'tropas', nombre: 'Tropas' },
    { key: 'tropasBlindadas', nombre: 'Tropas con armadura' },
    { key: 'mercenarios', nombre: 'Mercenarios' },
    { key: 'elite', nombre: 'Mercenarios de élite' },
    { key: 'barcos', nombre: 'Barcos' },
    { key: 'catapulta', nombre: 'Catapultas' },
    { key: 'torre', nombre: 'Torres de asedio' },
    { key: 'escorpion', nombre: 'Escorpiones' },
    { key: 'caballero', nombre: 'Caballeros' },
    { key: 'sacerdotes', nombre: 'Sacerdotes' },
    { key: 'dragones', nombre: 'Dragones' },
    { key: 'jinete', nombre: 'Jinetes' },
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' },
    { key: 'kraken', nombre: 'Kraken'},
    { key: 'huargos', nombre: 'Huargos'},
    { key: 'unicornios', nombre: 'Unicornios'},
    { key: 'murcielagos', nombre: 'Murciélagos' },
    { key: 'guardiareal', nombre: 'Guardia Real' },
    { key: 'barcolegendario', nombre: 'Barco Legendario'},
    { key: 'tritones', nombre: 'Tritones'},
    { key: 'venadosblancos', nombre: 'Venados Blancos'},
    { key: 'martilladores', nombre: 'Martilladores'},
    { key: 'caballerosdelarosa', nombre: 'Caballeros de la Rosa'},
    { key: 'guardiadelalba', nombre: 'Guardia del Alba'},
    { key: 'sacerdotizaroja', nombre: 'Sacerdotiza Roja'},
    { key: 'barbaros', nombre: 'Barbaros'},
    { key: 'caballerosdelaguila', nombre: 'Caballeros del Aguila'},
    { key: 'sacerdoteSal', nombre: 'Sacerdote de Sal' },


  ];

  unidades.forEach(({ key, nombre }) => {
    const cantidad = jugador[key] ?? 0;
    if (cantidad > 0) {
      const div = document.createElement('div');
      div.classList.add('campo-formulario');
      div.innerHTML = `
        <label for="perdidas-lan-${key}">${nombre} (Tienes ${cantidad}):</label>
        <input type="number" id="perdidas-lan-${key}" min="0" max="${cantidad}" value="0" style="width: 100%;">
      `;
      contenedor.appendChild(div);
    }
  });

  abrirModal('modal-lannister-perdidas');
}

function poblarTerritoriosEnSelect(idSelect) {
  const select = document.getElementById(idSelect);
  if (!select || !gameState?.territorios) return;

  select.innerHTML = '<option value="">-- Selecciona --</option>';
  Object.values(gameState.territorios)
    .filter(t => t.propietario === casa)
    .forEach(t => {
      const option = document.createElement('option');
      option.value = t.nombre;
      option.textContent = t.nombre;
      select.appendChild(option);
    });
}

function poblarTerritoriosCheckbox() {
  const cont = document.getElementById("lista-territorios-checkbox");
  cont.innerHTML = '';
  const misTerritorios = Object.values(gameState.territorios).filter(t => t.propietario === casa);
  misTerritorios.forEach(t => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label><input type="checkbox" value="${t.nombre}"> ${t.nombre}</label>
    `;
    cont.appendChild(div);
  });
}

function confirmarPerdidasRevuelta() {
  const perdidas = {};
  const inputs = document.querySelectorAll('#lista-perdidas-revuelta input');

  inputs.forEach(input => {
    const tipo = input.id.replace('perdida-', '');
    const cantidad = parseInt(input.value) || 0;
    if (cantidad > 0) {
      perdidas[tipo] = cantidad;
    }
  });

  const territoriosSeleccionados = Array.from(document.querySelectorAll('#lista-territorios-checkbox input:checked'))
    .map(el => el.value);

  socket.emit("tyrell-revuelta-perdidas", {
    partida,
    nombre,
    perdidas,
    territoriosPerdidos: territoriosSeleccionados
  });

  cerrarModal("modal-perdidas-revuelta");
}




function poblarEdificiosEnSelect(idSelect) {
  const select = document.getElementById(idSelect);
  if (!select) return;

  select.innerHTML = `
    <option value="">-- Selecciona --</option>
    <optgroup label="Producción">
      <option value="Granja">Granja</option>
      <option value="Cantera">Cantera</option>
      <option value="Mina">Mina</option>
      <option value="Aserradero">Aserradero</option>
    </optgroup>
    <optgroup label="Militar">
      <option value="Castillo">Castillo</option>
      <option value="Puerto">Puerto</option>
      <option value="Taller de maquinaria de asedio">Taller de Asedio</option>
    </optgroup>
  `;
}


  
  function confirmarCaballeroArryn(deseaCaballero) {
  cerrarModal('modal-caballero-batalla-arryn');
  if (deseaCaballero) {
    socket.emit('arryn-ganar-caballero', { partida, nombre });
  }
  poblarSelectTerritorioAtaque();
  abrirModal('modal-ataque-simple');
}

window.confirmarCaballeroArryn = confirmarCaballeroArryn;


  
  // Confirmar reclutamiento visual
  function confirmarReclutamiento() {
    const jugador = gameState?.jugadores?.[nombre];
    if (!jugador) return;
  
    const tienePuerto = Object.values(gameState.territorios).some(
      t => t.propietario === casa && t.edificios.includes("Puerto")
    );
  
    // Copiamos solo las unidades válidas según si hay puerto
    const unidadesValidas = {};
    for (const tipo in cantidadesReclutas) {
      if (tipo === 'barco' && !tienePuerto) continue; // Saltar si barco y no hay puerto
      unidadesValidas[tipo] = cantidadesReclutas[tipo];
    }
  
    let totalOro = 0;
let descuento = 0;

let descuentoGranja = 0;
for (const t of Object.values(gameState.territorios)) {
  if (t.propietario === casa && Array.isArray(t.edificios)) {
    descuentoGranja += t.edificios.filter(e => e === "Granja").length;
  }
}


// Calculamos el descuento total según los aserraderos
for (const t of Object.values(gameState.territorios)) {
  if (t.propietario === casa && Array.isArray(t.edificios)) {
    descuento += t.edificios.filter(e => e === "Aserradero").length * 5;
  }
}

// Calcular oro total con descuento aplicado
for (const tipo in unidadesValidas) {
  const cantidad = unidadesValidas[tipo];
  let precioUnitario = preciosReclutas[tipo];

  if (tipo === "soldado" || tipo === "regulares") {
    precioUnitario = Math.max(0, precioUnitario - descuentoGranja);
  }
  

  if (["barco", "catapulta", "torre", "escorpion"].includes(tipo)) {
    precioUnitario = Math.max(0, precioUnitario - descuento);
  }

  totalOro += cantidad * precioUnitario;
}

  
    const mensajeEl = document.getElementById('mensaje-reclutamiento');
    if (totalOro > jugador.oro) {
      mensajeEl.textContent = '⚠️ Oro insuficiente';
      return;
    }

  
    // Emitimos reclutamiento por tipo de unidad
    socket.emit('reclutamiento-multiple', {
      partida,
      nombre,
      territorio: obtenerTerritorioConPuerto() || obtenerPrimerTerritorio(),
      unidades: unidadesValidas,
      reclutarNorte: modoReclutarNorte
    });
    
  
    // Reset visual
    for (const tipo in cantidadesReclutas) {
      cantidadesReclutas[tipo] = 0;
      const span = document.getElementById(`cantidad-${tipo}`);
      if (span) span.textContent = '0';
    }
  
    actualizarInfoJugador();
    cerrarModal('modal-reclutar');
    terminarAccionEspecifica('reclutar');

    if (modoReclutarNorte) {
  incrementarContadorNorte();
  document.getElementById('valor-contador-stark').textContent = contadorAccionesNorte;
  cerrarModal('modal-reclutar');
  modoReclutarNorte = false;

  if (contadorAccionesNorte >= 2) {
    if ('Stark' == casa){
      document.getElementById('acciones-container2').style.display = 'flex';
    }

  }
  

  return; // Ya está todo hecho, salimos
}

  }

  function poblarSelectPropietarios() {
  const casas = getListaCasasPosibles(); // Ya definida en tu script
  const select1 = document.getElementById('select-propietario-ataque1');
  const select2 = document.getElementById('select-propietario-ataque2');

  [select1, select2].forEach(select => {
    if (!select) return;
    select.innerHTML = '<option value="">-- Elige casa --</option>';
    casas.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
    select.value = casa; // Selecciona tu propia casa por defecto
  });
}

  
  function obtenerTerritorioConPuerto() {
    const t = Object.values(gameState.territorios).find(
      t => t.propietario === casa && t.edificios.includes("Puerto")
    );
    return t?.nombre;
  }
  
  function obtenerPrimerTerritorio() {
    const t = Object.values(gameState.territorios).find(
      t => t.propietario === casa
    );
    return t?.nombre;
  }
  
  
// --- FIN DEL SCRIPT ---


