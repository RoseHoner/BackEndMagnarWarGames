const isLocalhost = window.location.hostname === 'localhost';
const BACKEND_URL = isLocalhost
  ? 'http://localhost:3000'
  : 'https://backendmagnarwargames-production.up.railway.app';


// =============================================
// PARTE 1: INICIALIZACIÓN Y GLOBALES
// =============================================
let contadorAccionesNorte = 0;
let tropasPerdidas = 0;
let territoriosPerdidos = [];
let nuevoPropietarioPorTerritorio = {};
let perdidasPorUnidad = {};

let inicialYaConfirmado = false;
let modalInicialYaMostrado = false;




// --- Conexión Socket.IO ---
// Asegúrate de que esta IP/Puerto sea la correcta y accesible desde tus clientes
// Inicializa conexión con el servidor usando Socket.IO
const socket = io(BACKEND_URL, {
  path: '/socket.io',
  transports: ['websocket']
});



// --- Parámetros URL ---
// Extrae parámetros de la URL como partida, nombre y casa
const params = new URLSearchParams(window.location.search);
const partida = params.get('partida');
const nombre = params.get('nombre');
const casa = params.get('casa'); // Casa asignada a este jugador

// --- Estado Local del Juego (Reflejo del Servidor) ---
// Este objeto se llenará con los datos enviados por el servidor
// gameState guarda el estado actual del juego enviado por el servidor
let gameState = null;

// --- Constantes UI (Para cálculos en el cliente y poblar selects) ---
// Costos base de cada unidad o edificio usados en la interfaz del cliente
const COSTOS_BASE_UI = {
    regulares: 4,
    barco: 20,
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
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' }
  ];

  unidades.forEach(({ key, nombre }) => {
    const cantidad = jugador[key] ?? 0;
    if (cantidad > 0) {
      const div = document.createElement('div');
      div.classList.add('campo-formulario');
      div.innerHTML = `
        <label for="perdidas-def-${key}">${nombre} (Tienes ${cantidad}):</label>
        <input type="number" id="perdidas-def-${key}" min="0" max="${cantidad}" value="0" style="width: 100%;">
      `;
      contenedor.appendChild(div);
    }
  });

  abrirModal('modal-perdidas-defensor');
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
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' }
  ];

  unidades.forEach(({ key, nombre }) => {
    const cantidad = jugadorData[key] ?? 0;
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

  abrirModal('modal-perdidas-ataque');
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
  ];

  unidades.forEach(({ key, nombre }) => {
    const cantidad = jugador[key] ?? 0;
    if (cantidad <= 0) return;

    const div = document.createElement('div');
    div.classList.add('campo-formulario');
    div.innerHTML = `
      <label for="perdidas-${key}">${nombre} (Tienes ${cantidad}):</label>
      <input type="number" id="perdidas-${key}" min="0" max="${cantidad}" value="0" style="width: 100%;">
    `;
    contenedor.appendChild(div);
  });
}


function elegirAsedioGratis(tipo) {
    if (!["catapulta", "torre", "escorpion"].includes(tipo)) return;
    console.log(`[Asedio Gratis] Elegido: ${tipo}`);
    socket.emit('recompensa-asedio', { partida, nombre, tipo });
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
      { tipo: 'tropas', nombre: 'Tropa', icono: 'soldado.png' },
      { tipo: 'tropasBlindadas', nombre: 'Tropa con Armadura', icono: 'soldado.png' },
      { tipo: 'mercenarios', nombre: 'Mercenario', icono: 'mercenario.png' },
      { tipo: 'elite', nombre: 'Mercenario de élite', icono: 'elite.png' },
      { tipo: 'militantesFe', nombre: 'Militante de la Fe', icono: 'soldado.png' },
      { tipo: 'arquero', nombre: 'Arquero', icono: 'soldado.png' },
      { tipo: 'jinete', nombre: 'Jinete', icono: 'soldado.png' }, 
      { tipo: 'huevos', nombre: 'Huevo de Dragón', icono: 'dragon.png' }

    ];
    

unidadesBasicas.forEach(u => {
  const cantidad = jugador[u.tipo] || 0;
  if (cantidad > 0) {
    const li = document.createElement('li');
    li.innerHTML = `
      <img src="../imgs/reclutas/${u.icono}" alt="${u.nombre}" style="width: 24px; vertical-align: middle; margin-right: 6px;">
      <span style="color: white;">${u.nombre} x${cantidad}</span>
    `;
    lista.appendChild(li);
  }
});


    const unidades = [
        { tipo: 'dragones', nombre: 'Dragón', icono: 'dragon.png' },
        { tipo: 'barcos', nombre: 'Barco', icono: 'barco.png' },
        { tipo: 'catapulta', nombre: 'Catapulta', icono: 'catapulta.png' },
        { tipo: 'torre', nombre: 'Torre de Asedio', icono: 'torre.png' },
        { tipo: 'escorpion', nombre: 'Escorpión', icono: 'escorpion.png' },
        { tipo: 'sacerdotes', nombre: 'Sacerdote de Luz', icono: 'sacerdote.png' },
        { tipo: 'caballero', nombre: 'Caballero', icono: 'caballero.png' },


    ];

    unidades.forEach(u => {
        const cantidad = jugador[u.tipo] || 0;
        if (cantidad > 0) {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="../imgs/reclutas/${u.icono}" alt="${u.nombre}" style="width: 24px; vertical-align: middle; margin-right: 6px;">
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
    const estadoTurnoEl = document.getElementById('estado-turno');

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
    
     // Actualizar estado de espera general
     if (estadoTurnoEl) {
        const listos = gameState.jugadoresAccionTerminada?.length || 0;
        const total = Object.keys(gameState.jugadores || {}).length;
        if (gameState.fase === 'Accion' && listos > 0 && listos < total && !gameState.jugadoresAccionTerminada?.includes(nombre)) {
             estadoTurnoEl.textContent = `⌛ Esperando a ${total - listos} jugador(es)...`;
        } else {
             estadoTurnoEl.textContent = ""; // Limpiar si no aplica
        }
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

const btnCasarse = document.getElementById('btn-casarse-targaryen');
if (btnCasarse) {
  const jugador = gameState.jugadores?.[nombre];
  if (casa === "Targaryen") {
    if (!jugador?.casadoCon) {
      btnCasarse.style.display = 'inline-block';
      // Eliminar texto previo si existía
      const anterior = document.getElementById('casado-texto-targaryen');
      if (anterior) anterior.remove();
    } else {
      btnCasarse.style.display = 'none';

      // Crear texto de casado si no existe
      if (!document.getElementById('casado-texto-targaryen')) {
        const texto = document.createElement('div');
        texto.id = 'casado-texto-targaryen';
        texto.textContent = `💍 Casado con Casa ${jugador.casadoCon}`;
        texto.style.color = 'white';
        texto.style.fontSize = '0.9rem';
        texto.style.marginTop = '6px';
        texto.style.textAlign = 'center';

        btnCasarse.parentNode.insertBefore(texto, btnCasarse.nextSibling);
      }
    }
  }
}
const btnReorganizar = document.getElementById('btn-reorganizar');
const btnReorganizarStark = document.getElementById('btn-stark-reorganizar');

if (btnReorganizar && btnReorganizarStark) {
  if (turnoReorganizarUsado === null || accionReorganizarUsado === null) {
    btnReorganizar.style.display = 'inline-block';
    btnReorganizarStark.style.display = 'inline-block';
  } else {
    const turnoDisponible = turnoReorganizarUsado + 2;
    const debeMostrar = (
      gameState.turno === turnoDisponible && gameState.accion === 1
    );

    if (debeMostrar) {
      btnReorganizar.style.display = 'inline-block';
      btnReorganizarStark.style.display = 'inline-block';
      turnoReorganizarUsado = null;
      accionReorganizarUsado = null;
    } else {
      btnReorganizar.style.display = 'none';
      btnReorganizarStark.style.display = 'none';
    }
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

// Mostrar botones especiales de Stark
const esStark = casa === "Stark";

const btnStarkAtacar = document.getElementById('btn-stark-atacar');
const btnStarkMover = document.getElementById('btn-stark-mover');
const btnStarkReorganizar = document.getElementById('btn-stark-reorganizar');
const btnStarkReclutar = document.getElementById('btn-stark-reclutar');

if (esStark) {
  mostrarBotonesStark(); // los mostramos por defecto si es Stark

  btnStarkAtacar?.addEventListener('click', incrementarContadorNorte);
  btnStarkMover?.addEventListener('click', incrementarContadorNorte);
  btnStarkReorganizar?.addEventListener('click', incrementarContadorNorte);
  btnStarkReclutar?.addEventListener('click', incrementarContadorNorte);
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

// Sincronizar visibilidad del botón "Organizar en el Norte" con el botón "Organizar"
const btnOrganizar = document.getElementById('btn-reorganizar');
const btnNorteOrganizar = document.getElementById('btn-stark-reorganizar');

if (btnOrganizar && btnNorteOrganizar) {
  const estaVisible = btnOrganizar.style.display !== 'none';
  btnNorteOrganizar.style.display = estaVisible ? 'inline-block' : 'none';
}

}

function incrementarContadorNorte() {
  contadorAccionesNorte++;
  const spanContador = document.getElementById('valor-contador-stark');
  if (spanContador) {
    spanContador.textContent = contadorAccionesNorte;
  }

  // Ocultar los botones si el contador llega a 2
  if (contadorAccionesNorte >= 2) {
    document.getElementById('btn-stark-atacar')?.classList.add('oculto');
    document.getElementById('btn-stark-mover')?.classList.add('oculto');
    document.getElementById('btn-stark-reorganizar')?.classList.add('oculto');
    document.getElementById('btn-stark-reclutar')?.classList.add('oculto');
  }

  
}

function ocultarBotonesStark() {
  document.getElementById('btn-stark-atacar')?.classList.add('oculto');
  document.getElementById('btn-stark-mover')?.classList.add('oculto');
  document.getElementById('btn-stark-reorganizar')?.classList.add('oculto');
  document.getElementById('btn-stark-reclutar')?.classList.add('oculto');
}

function mostrarBotonesStark() {
  document.getElementById('btn-stark-atacar')?.classList.remove('oculto');
  document.getElementById('btn-stark-mover')?.classList.remove('oculto');
  document.getElementById('btn-stark-reorganizar')?.classList.remove('oculto');
  document.getElementById('btn-stark-reclutar')?.classList.remove('oculto');
}







function actualizarInfoAdicional() {
    if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) return;
    const jugador = gameState.jugadores[nombre];
    const listaRumoresEl = document.getElementById('lista-rumores');

    if (listaRumoresEl) {
        listaRumoresEl.innerHTML = ''; // Limpiar
        if (jugador.rumoresDesbloqueados && jugador.rumoresDesbloqueados.length > 0) {
            jugador.rumoresDesbloqueados.forEach(rumor => {
                const li = document.createElement('li');
                // Podrías tener un mapeo para mostrar descripciones cortas
                const RUMOR_DESC = { // Ejemplo
                    "Rutas Alternativas": "Atacar detrás líneas enemigas",
                    "Camada Huargos": "+1d4+1 Huargos",
                    "Unicornios Skagos": "+1d3 Unicornios (+2 Montaña)",
                    // ... añadir TODOS los rumores con nombre exacto del backend
                };
                li.textContent = `✓ ${rumor}`;
                li.title = RUMOR_DESC[rumor] || "Rumor desbloqueado"; // Tooltip
                listaRumoresEl.appendChild(li);
            });
        } else {
            listaRumoresEl.innerHTML = '<li>(Ninguno)</li>';
        }
    }
    // Aquí se actualizaría más info: estado invierno, préstamos, etc.
    // Ejemplo: const inviernoStatusEl = document.getElementById('invierno-status');
    // if(inviernoStatusEl) inviernoStatusEl.textContent = gameState.estadoGlobal?.invierno ? "Sí" : "No";
}

function actualizarEdificiosJugador() {
    const lista = document.getElementById('lista-edificios-jugador');
    if (!lista || !gameState || !gameState.territorios || !casa) return;

    lista.innerHTML = '';

    const territoriosCasa = Object.values(gameState.territorios)
        .filter(t => t.propietario === casa && Array.isArray(t.edificios) && t.edificios.length > 0);

    if (territoriosCasa.length === 0) {
        lista.innerHTML = '<li style="color: #ccc; font-size: 0.9rem;">(Ningún edificio)</li>';
        return;
    }

    territoriosCasa.forEach(t => {
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.innerHTML = `<strong style="color: #66f;">${t.nombre}</strong><ul style="margin: 5px 0 10px 15px;">` +
            t.edificios.map(ed => `<li style="font-size: 0.9rem;">🏗️ ${ed}</li>`).join('') +
            `</ul>`;
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

    console.log(`[${nombre}] Acción '${tipoAccion}' realizada. Emitiendo 'accion-terminada'...`);
    socket.emit('accion-terminada', { partida, nombre });
    deshabilitarBotonesAccion(true); // Deshabilitar todos mientras espera
    // Actualizar UI para mostrar espera
    const estadoTurnoEl = document.getElementById('estado-turno');
    if (estadoTurnoEl) estadoTurnoEl.textContent = "⌛ Esperando otros jugadores...";
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

function siguienteAccion() { // Para el botón principal 'Terminar Acción'
    if (!partida || !nombre || gameState?.fase === 'Neutral') return;

    console.log(`[${nombre}] Botón 'Terminar Acción' presionado. Emitiendo 'accion-terminada'...`);
    socket.emit('accion-terminada', { partida, nombre });
    deshabilitarBotonesAccion(true); // Deshabilitar todos mientras espera
    // Actualizar UI para mostrar espera
    const botonPrincipal = document.getElementById('boton-accion');
     const estadoTurnoEl = document.getElementById('estado-turno');
    if (estadoTurnoEl) estadoTurnoEl.textContent = "⌛ Esperando otros jugadores...";
}

// --- Lógica Modal Batalla ---
function poblarTerritoriosAtacables() {
    if (!gameState || !gameState.territorios) return;
    const selectEl = document.getElementById('select-territorio-atacado');
    if (!selectEl) return console.error("Select territorios atacables no encontrado.");
    selectEl.innerHTML = '<option value="">-- Selecciona --</option>';
    Object.values(gameState.territorios)
        .filter(t => t.propietario && t.propietario !== casa)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(t => {
            selectEl.appendChild(new Option(`${t.nombre} (${t.propietario})`, t.nombre));
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
  let limite = LIMITE_SOLDADOS_POR_CASA[casaJugador] ?? 5;
// Si está casado con Qoherys, subir el límite a 12
if (casaJugador === "Targaryen" && jugador.casadoCon === "Qoherys") {
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

    // Enviar siempre el primero
    socket.emit('solicitud-construccion', { partida, nombre, territorio: territorio1, tipoEdificio: edificio1 });

    // Si también eligió un segundo edificio, lo envías también
    if (territorio2 && edificio2) {
      socket.emit('solicitud-construccion', { partida, nombre, territorio: territorio2, tipoEdificio: edificio2 });
    }

  } else {
    if (!territorio1 || !edificio1) {
      alert("Debes seleccionar territorio y edificio.");
      return;
    }
    socket.emit('solicitud-construccion', { partida, nombre, territorio: territorio1, tipoEdificio: edificio1 });
  }

  cerrarModal('modal-construir');
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

    // Calculamos minas
    let oroPorMinas = 0;
    misTerritorios.forEach(t => {
      const minas = t.edificios?.filter(ed => ed === "Mina").length || 0;
      const oroPorMina = (casa === "Lannister") ? 20 : 10;
      oroPorMinas += minas * oroPorMina;
  });
  

    // Calculamos aserraderos
    let oroPorAserraderos = 0;
    misTerritorios.forEach(t => {
        const aserraderos = t.edificios?.filter(ed => ed === "Aserradero").length || 0;
        oroPorAserraderos += aserraderos * 5;
    });

    // Calculamos canteras
let oroPorCanteras = 0;
misTerritorios.forEach(t => {
    const canteras = t.edificios?.filter(ed => ed === "Cantera").length || 0;
    oroPorCanteras += canteras * 5;
});

// Calculamos granjas
// Calculamos granjas
let oroPorGranjas = 0;
if (casa === "Tully") {
  misTerritorios.forEach(t => {
    const granjas = t.edificios?.filter(ed => ed === "Granja").length || 0;
    oroPorGranjas += granjas * 10;
  });
} else if (casa !== "Tyrell") {
  misTerritorios.forEach(t => {
    const granjas = t.edificios?.filter(ed => ed === "Granja").length || 0;
    oroPorGranjas += granjas * 5;
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

    const mantenimientoTotal = mantenimientoTropas + mantenimientoBarcos + mantenimientoMaquinas + mantenimientoDragones + mantenimientoSacerdotes + mantenimientoCaballeros;


    let oroEstimado = Math.max(0, oroTotalTurno + oroPorMinas + oroPorAserraderos + oroPorCanteras + oroPorGranjas + oroPorPuertos - mantenimientoTotal);

    //oro 20 de los tully
if (casa === "Tully") {
  oroEstimado += 20;
}



// 💰 Bonus Martell por el puerto inicial en Lanza del Sol
if (casa === "Martell") {
  const t = gameState.territorios["Lanza del Sol"];
  if (t && t.propietario === "Martell" && t.edificios.includes("Puerto")) {
    oroEstimado += 10;
  }
}

// 💰 Bonus por estar casado con Casa Celtigar
if (jugador.casadoCon === "Celtigar") {
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

    // 1. Validar Datos Iniciales (nombre, casa, partida)
    if (!nombre || !casa || !partida) {
        console.error("¡CRÍTICO! Faltan datos URL (nombre, casa, partida). Redirigiendo a inicio.");
        alert("Error: Faltan datos esenciales para iniciar el juego.");
        window.location.href = 'index.html';
        return;
    }
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
          terminarAccionEspecifica("Obtener Tecnología (sin usar)");
        });

        setupListener('btn-confirmar-perdidas-ataque', 'click', () => {
          const perdidas = {};
          const jugador = gameState?.jugadores?.[nombre];
          if (!jugador) return;
        
          const unidades = [
            'tropas', 'tropasBlindadas', 'mercenarios', 'elite',
            'barcos', 'catapulta', 'torre', 'escorpion',
            'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero'
          ];
        
          for (const key of unidades) {
            const input = document.getElementById(`perdida-${key}`);
            if (!input) continue;
            const cantidad = parseInt(input.value) || 0;
            if (cantidad < 0 || cantidad > (jugador[key] || 0)) {
              return alert(`Cantidad inválida para ${key}`);
            }
            if (cantidad > 0) perdidas[key] = cantidad;
          }
        
          socket.emit('perdidas-en-batalla', { partida, nombre, perdidas });
        
          cerrarModal('modal-perdidas-ataque');
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
        });
        

        // Botones barra superior y principal
        setupListener('logo-casa-container', 'click', abrirModalMisTerritorios);

        // Botones de Acción específica
        setupListener('btn-reclutar', 'click', () => {
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
        setupListener('btn-mover', 'click', () => terminarAccionEspecifica('Mover/Atacar')); // Acción simplificada
        setupListener('btn-batalla', 'click', () => {
  poblarSelectTerritorioAtaque();
  abrirModal('modal-ataque-simple');
});

        
        setupListener('btn-reorganizar', 'click', () => {
  const turno = gameState?.turno || 1;
  const accion = gameState?.accion || 1;
  turnoReorganizarUsado = turno;
  accionReorganizarUsado = accion;

  socket.emit('usar-reorganizar', { partida, nombre, turno, accion });
  terminarAccionEspecifica('Reorganizar');
});

setupListener('btn-stark-reorganizar', 'click', () => {
  const turno = gameState?.turno || 1;
  const accion = gameState?.accion || 1;
  turnoReorganizarUsado = turno;
  accionReorganizarUsado = accion;

  const btnReorganizar = document.getElementById('btn-reorganizar');
  const btnStarkReorganizar = document.getElementById('btn-stark-reorganizar');
  if (btnReorganizar) btnReorganizar.style.display = 'none';
  if (btnStarkReorganizar) btnStarkReorganizar.style.display = 'none';

  socket.emit('usar-reorganizar', { partida, nombre, turno, accion });
});



        
        setupListener('btn-casarse-targaryen', 'click', () => {
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
            'jinete'
          ];
        
          let total = 0;
        
          for (const key of unidades) {
            const el = document.getElementById(`perdidas-${key}`);
            if (!el) continue;
            const cantidad = Math.max(0, parseInt(el.value) || 0);
            const tiene = jugador[key] ?? 0;
            if (cantidad > tiene) return alert(`No puedes perder más de ${tiene} ${key}`);
            if (cantidad > 0) perdidasPorUnidad[key] = cantidad;
            total += cantidad;
          }
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
    'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero'
  ];

  claves.forEach(key => {
    const input = document.getElementById(`perdidas-lan-${key}`);
    const val = parseInt(input?.value) || 0;
    if (val > 0) perdidas[key] = val;
  });

  cerrarModal('modal-lannister-perdidas');
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
  const select1 = document.getElementById('select-territorio-ataque1');
  const select2 = document.getElementById('select-territorio-ataque2');
  if (!select1 || !select2 || !gameState?.territorios) return;

  const atacables = Object.values(gameState.territorios)
    .filter(t => t.propietario && t.propietario !== casa);

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
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' }
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
    'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero'
  ];

  unidades.forEach(key => {
    const input = document.getElementById(`perdida-${key}`);
    if (input) {
      const valor = parseInt(input.value) || 0;
      if (valor > 0) perdidasPorUnidad[key] = valor;
    }
  });

  const propietario1 = document.getElementById('select-propietario-ataque1')?.value || casa;
const propietario2 = document.getElementById('select-propietario-ataque2')?.value || casa;



  const territorios = [
  { nombre: territorio1, gano: resultado1 === "si", propietario: propietario1 }
];

if (territorio2 && territorio2 !== territorio1) {
  territorios.push({ nombre: territorio2, gano: resultado2 === "si", propietario: propietario2 });
}

  socket.emit('ataque-simple-doble', {
    partida, nombre, casa, territorios, perdidasPorUnidad
  });

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
            <img src="../imgs/reclutas/soldado.png" alt="Arquero" style="width: 80px;">
            <div class="control-numero">
              <button onclick="ajustarCantidad('arquero', -1)">-</button>
              <span id="cantidad-arquero">0</span>
              <button onclick="ajustarCantidad('arquero', 1)">+</button>
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
              <img src="../imgs/reclutas/caballero.png" alt="Caballero" style="width: 80px;">
              <div class="control-numero">
                <button onclick="ajustarCantidad('caballero', -1)">-</button>
                <span id="cantidad-caballero">0</span>
                <button onclick="ajustarCantidad('caballero', 1)">+</button>
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
              <img src="../imgs/reclutas/soldado.png" alt="Soldado Blindado" style="width: 80px;">
              <div class="control-numero">
                <button onclick="ajustarCantidad('soldadoBlindado', -1)">-</button>
                <span id="cantidad-soldadoBlindado">0</span>
                <button onclick="ajustarCantidad('soldadoBlindado', 1)">+</button>
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
              <img src="../imgs/reclutas/soldado.png" alt="Armadura" style="width: 80px;">
              <div class="control-numero">
                <button onclick="ajustarCantidad('armadura', -1)">-</button>
                <span id="cantidad-armadura">0</span>
                <button onclick="ajustarCantidad('armadura', 1)">+</button>
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
              <img src="../imgs/reclutas/soldado.png" alt="Arquero" style="width: 80px;">
              <div class="control-numero">
                <button onclick="ajustarCantidad('arquero', -1)">-</button>
                <span id="cantidad-arquero">0</span>
                <button onclick="ajustarCantidad('arquero', 1)">+</button>
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
            <img src="../imgs/reclutas/soldado.png" alt="Soldado Blindado" style="width: 80px;">
            <div class="control-numero">
              <button onclick="ajustarCantidad('soldadoBlindado', -1)">-</button>
              <span id="cantidad-soldadoBlindado">0</span>
              <button onclick="ajustarCantidad('soldadoBlindado', 1)">+</button>
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
    <img src="../imgs/reclutas/soldado.png" alt="Armadura" style="width: 80px;">
    <div class="control-numero">
      <button onclick="ajustarCantidad('armadura', -1)">-</button>
      <span id="cantidad-armadura">0</span>
      <button onclick="ajustarCantidad('armadura', 1)">+</button>
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
      <img src="../imgs/reclutas/barco.png" alt="Barco" style="width: 80px;">
      <div class="control-numero">
        <button onclick="ajustarCantidad('barco', -1)">-</button>
        <span id="cantidad-barco">0</span>
        <button onclick="ajustarCantidad('barco', 1)">+</button>
      </div>
      <p>Coste: 20 oro</p>
    `;
    contenedor.appendChild(div);

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
      { tipo: 'torre', nombre: 'Torre de Asedio', costo: 20, imagen: 'torre.png' },
      { tipo: 'escorpion', nombre: 'Escorpión', costo: 20, imagen: 'escorpion.png' },
    ];
  
    unidadesAsedio.forEach(({ tipo, nombre, costo, imagen }) => {
      const div = document.createElement('div');
      div.className = 'recluta-box';
      div.dataset.tipo = tipo;
      div.dataset.costo = costo;
      div.innerHTML = `
        <h3>${nombre}</h3>
        <img src="../imgs/reclutas/${imagen}" alt="${nombre}" style="width: 80px;">
        <div class="control-numero">
          <button onclick="ajustarCantidad('${tipo}', -1)">-</button>
          <span id="cantidad-${tipo}">0</span>
          <button onclick="ajustarCantidad('${tipo}', 1)">+</button>
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
      <img src="../imgs/reclutas/soldado.png" alt="Arquero" style="width: 80px;">
      <div class="control-numero">
        <button onclick="ajustarCantidad('arquero', -1)">-</button>
        <span id="cantidad-arquero">0</span>
        <button onclick="ajustarCantidad('arquero', 1)">+</button>
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
    <img src="../imgs/reclutas/caballero.png" alt="Caballero" style="width: 80px;">
    <div class="control-numero">
      <button onclick="ajustarCantidad('caballero', -1)">-</button>
      <span id="cantidad-caballero">0</span>
      <button onclick="ajustarCantidad('caballero', 1)">+</button>
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
      <img src="../imgs/reclutas/sacerdote.png" alt="Sacerdote de Luz" style="width: 80px;">
      <div class="control-numero">
        <button onclick="ajustarCantidad('sacerdoteLuz', -1)">-</button>
        <span id="cantidad-sacerdoteLuz">0</span>
        <button onclick="ajustarCantidad('sacerdoteLuz', 1)">+</button>
      </div>
      <p>Coste: 20 oro</p>
    `;
    contenedor.appendChild(div);
  }
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
        { tipo: 'torre', nombre: 'Torre de Asedio', costo: 20, imagen: 'torre.png' },
        { tipo: 'escorpion', nombre: 'Escorpión', costo: 20, imagen: 'escorpion.png' }
    ];

    unidadesAsedio.forEach(({ tipo, nombre, costo, imagen }) => {
        const div = document.createElement('div');
        div.className = 'recluta-box';
        div.dataset.tipo = tipo;
        div.dataset.costo = costo;
        div.innerHTML = `
            <h3>${nombre}</h3>
            <img src="../imgs/reclutas/${imagen}" alt="${nombre}" style="width: 80px;">
            <div class="control-numero">
              <button onclick="ajustarCantidad('${tipo}', -1)">-</button>
              <span id="cantidad-${tipo}">0</span>
              <button onclick="ajustarCantidad('${tipo}', 1)">+</button>
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
  
    if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) {
      alert("⚠️ Aún no se ha recibido el estado del juego del servidor. Espera unos segundos y vuelve a intentar.");
      return;
    }
  
    socket.emit('confirmar-iniciales-turno1', { partida, nombre, tropas, oroExtra: oro });
    inicialYaConfirmado = true;

  
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
    'caballero', 'sacerdotes', 'dragones', 'militantesFe', 'arquero'
  ];

  for (const key of unidades) {
    const input = document.getElementById(`perdidas-def-${key}`);
    if (!input) continue;
    const valor = parseInt(input.value) || 0;
    if (valor > 0) perdidas[key] = valor;
  }

  cerrarModal('modal-perdidas-defensor');
    if (casa === "Arryn") {
    abrirModal('modal-caballero-batalla-arryn');
  }
  socket.emit('perdidas-defensor', { partida, nombre, perdidas });
});


document.getElementById('btn-confirmar-soborno-final-lannister')?.addEventListener('click', () => {
  const perdidas = parseInt(document.getElementById('input-tropas-perdidas-soborno-lannister').value) || 0;
  const gano = document.querySelector('input[name="soborno-resultado"]:checked')?.value === 'si';

  cerrarModal('modal-soborno-final-lannister');
  socket.emit('lannister-soborno-final', { partida, nombre, perdidas, gano });
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

  socket.emit("arryn-inicial-completo", {
    partida,
    nombre,
    caballeros,
    oro,
    tropas
  });

  inicialYaConfirmado = true;
  cerrarModal("modal-inicial-arryn");
});


document.getElementById('btn-confirmar-inicial-tyrell').addEventListener('click', () => {
  const territorio = document.getElementById('select-tyrell-granja').value;
  const oro = parseInt(document.getElementById('input-oro-tyrell').value) || 0;
  const tropas = parseInt(document.getElementById('input-tropas-tyrell').value) || 0;

  if (!territorio) {
    alert("Debes seleccionar un territorio para la Granja.");
    return;
  }

  socket.emit("tyrell-inicial-completo", {
    partida,
    nombre,
    territorio,
    oro,
    tropas
  });


  inicialYaConfirmado = true;
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
    if (casa === "Stark") {
  contadorAccionesNorte = 0;
  if (casa === "Stark") {
  document.getElementById('btn-stark-atacar')?.style.setProperty('display', 'inline-block');
  document.getElementById('btn-stark-mover')?.style.setProperty('display', 'inline-block');
  document.getElementById('btn-stark-reorganizar')?.style.setProperty('display', 'inline-block');
  document.getElementById('btn-stark-reclutar')?.style.setProperty('display', 'inline-block');
}

  const spanContador = document.getElementById('valor-contador-stark');
  if (spanContador) {
    spanContador.textContent = contadorAccionesNorte;
  }
}

    // Actualizar UI y reactivar botones (si no es Fase Neutral)
    actualizarTurnoAccionUI();
    if (gameState?.fase === 'Neutral') {
        tropasPerdidas = 0;
        territoriosPerdidos = [];
        nuevoPropietarioPorTerritorio = {};
    
        // Reiniciar pasos del modal
         document.getElementById('btn-stark-atacar')?.classList.remove('oculto');
  document.getElementById('btn-stark-mover')?.classList.remove('oculto');
  document.getElementById('btn-stark-reorganizar')?.classList.remove('oculto');
  document.getElementById('btn-stark-reclutar')?.classList.remove('oculto');
    
        renderizarInputsPerdidas();
        abrirModal('modal-fase-neutral');

    }
    
    
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
    const estadoTurnoEl = document.getElementById('estado-turno');
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

    

    // Validar que el gameState recibido es usable
    if (!gameState.jugadores || !gameState.territorios || !gameState.jugadores[nombre]) {
        console.error("El estado recibido no contiene la información mínima necesaria (jugadores, territorios, datos propios).");
        // Podríamos intentar solicitar de nuevo el estado o mostrar un error grave.
        alert("Error al sincronizar con el servidor. Intenta recargar.");
        return;
    }

    // --- Actualizar TODA la UI basada en el nuevo gameState ---
    try {
        actualizarInfoJugador();
        actualizarTurnoAccionUI();
        actualizarInfoAdicional();
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
  !inicialYaConfirmado &&
  !modalInicialYaMostrado
) {
  if (casa === "Tyrell") {
    poblarSelectTyrellGranja();
    abrirModal("modal-inicial-tyrell");
  } else if (casa === "Arryn") {
    abrirModal("modal-inicial-arryn");
  } else {
    abrirModal("modal-inicial");
  }
  modalInicialYaMostrado = true;
}






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
    caballero: 10,
    soldadoBlindado: 10,
    armadura: 6,
    arquero: 6,


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
    soldadoBlindado: 0,
    armadura: 0,
    arquero: 0,

  };
  
  
  
  function confirmarMilitantesFe() {
    const cantidad = parseInt(document.getElementById("input-militantes-fe").value) || 0;
    if (cantidad <= 0) return;
    cerrarModal("modal-militantes-fe");
    socket.emit("confirmar-militantes-fe", { partida, nombre, cantidad });
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
  
    // Aplicamos descuento visual y actualizamos los textos también
    for (const tipo in cantidadesReclutas) {
      const cantidad = cantidadesReclutas[tipo];
      const precioBase = preciosReclutas[tipo];
      let precioFinal = precioBase;

      if (tipo === "soldado" || tipo === "regulares") {
        precioFinal = Math.max(0, precioBase - descuentoGranja);
      }
      
  
      if (["barco", "catapulta", "torre", "escorpion"].includes(tipo)) {
        precioFinal = Math.max(0, precioBase - descuento);
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
    { key: 'militantesFe', nombre: 'Militantes de la Fe' },
    { key: 'arquero', nombre: 'Arqueros' }
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
      unidades: unidadesValidas
    });
    
  
    // Reset visual
    for (const tipo in cantidadesReclutas) {
      cantidadesReclutas[tipo] = 0;
      const span = document.getElementById(`cantidad-${tipo}`);
      if (span) span.textContent = '0';
    }
  
    actualizarInfoJugador();
    cerrarModal('modal-reclutar');
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