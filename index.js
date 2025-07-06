// Importamos los módulos necesarios
const path = require('path');
const express = require('express'); // Framework web para Node.js
const http = require('http'); // Para crear el servidor HTTP
const { Server } = require('socket.io'); // Para comunicación en tiempo real
const cors = require('cors'); // Permitir conexiones entre dominios diferentes (frontend y backend)
require('dotenv').config();              // <- carga .env
const mysql = require('mysql2/promise'); // <- driver MySQL
const fs = require('fs');


// Creamos la aplicación Express
const app = express();
app.use(cors()); // Permitimos cualquier origen (útil en desarrollo)
app.use(express.json());

const reglasPath = path.join(__dirname, '..', 'Frontend', 'pdf', 'reglamento', 'reglas generales.txt');
let reglasTexto = '';
try {
  reglasTexto = fs.readFileSync(reglasPath, 'utf8');
} catch (err) {
  console.error('Error cargando reglamento', err);
}

// Desactivar cache para que siempre se cargue la última versión de los archivos
// estáticos. Enviamos una cabecera estricta que evita almacenamiento en los
// distintos navegadores y proxies.
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=600');
  next();
});


 // Servir estáticos de la carpeta Frontend
 // Ahora definimos frontPath apuntando a ../Frontend
 const frontPath = path.join(__dirname, '..', 'Frontend');
 app.use(express.static(frontPath));


// Ruta “bonita” para el lobby: /lobby/ABC123
 // Cámbialo a esto, usando frontPath:
 app.get('/lobby/:partida', (req, res) => {
   res.sendFile(path.join(
     frontPath,
     'html',
     'lobby.html'
   ));
 });

app.get('/juego/:partida', (req, res) => {
  res.sendFile(path.join(
    frontPath,     // ../Frontend
    'html',        // si tu juego está en Frontend/html/
    'juego.html'
  ));
});

// Ruta para el modo "Mano del Rey"
app.get('/manodelrey/:partida', (req, res) => {
  res.sendFile(path.join(
    frontPath,
    'html',
    'Manodelrey.html'
  ));
});

function obtenerFragmento(pregunta) {
  const palabras = pregunta.toLowerCase().split(/\s+/);
  const lineas = reglasTexto.split(/\r?\n/);
  let mejorLinea = '';
  let mejorPuntuacion = 0;
  lineas.forEach((l) => {
    let puntuacion = 0;
    palabras.forEach((p) => {
      if (l.toLowerCase().includes(p)) puntuacion++;
    });
    if (puntuacion > mejorPuntuacion) {
      mejorPuntuacion = puntuacion;
      mejorLinea = l;
    }
  });
  return mejorLinea;
}

async function consultarOpenAI(pregunta, fragmento) {
  if (!process.env.OPENAI_API_KEY) return 'Clave API no configurada.';
  const body = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: `Responde usando el reglamento del juego. Fragmento: "${fragmento}"` },
      { role: 'user', content: pregunta }
    ]
  };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta';
}

app.post('/api/chat', async (req, res) => {
  const pregunta = req.body.pregunta;
  if (!pregunta) return res.status(400).json({ error: 'Pregunta requerida' });
  const fragmento = obtenerFragmento(pregunta);
  try {
    const respuesta = await consultarOpenAI(pregunta, fragmento);
    res.json({ respuesta });
  } catch (err) {
    console.error('Error consultando OpenAI', err);
    res.status(500).json({ error: 'Error generando respuesta' });
  }
});

// Creamos el servidor HTTP y lo conectamos con socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // Aceptamos conexiones desde cualquier sitio (desarrollo)
});

// 📦 Pool global de conexiones MySQL
// 📦 Pool global de conexiones MySQL o dummy en local
let db;
if (process.env.DATABASE_URL) {
  db = mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 10
  });
} else {
  console.log('MySQL deshabilitado: no hay DATABASE_URL');
  // Simula un pool con un método query que no hace nada
  db = {
    query: async () => {
      return [[], []];
    }
  };
}



// Diccionario donde guardaremos todas las partidas creadas
const rooms = {};

// Programa la eliminación de una partida después de 20 minutos sin jugadores
function programarEliminacion(partidaId) {
  const room = rooms[partidaId];
  if (!room) return;
  if (room.deleteTimer) clearTimeout(room.deleteTimer);
  room.deleteTimer = setTimeout(async () => {
    const sinConectados = !room.playerSockets ||
      Object.keys(room.playerSockets).length === 0;
    if (sinConectados) {
      try {
        await db.query('DELETE FROM `Partidas` WHERE `nombre` = ?', [partidaId]);
      } catch (err) {
        console.error('Error eliminando partida', partidaId, err);
      }
      delete rooms[partidaId];
      console.log(`Partida '${partidaId}' eliminada por inactividad.`);
    }
  }, 20 * 60 * 1000); // 20 minutos
}

function iniciarConstruccionNPC(room, partida) {
  if (!room.players || room.players.length === 0) return;
  const jugador = room.players[Math.floor(Math.random() * room.players.length)];
  room.npcBuilder = jugador;
  io.to(partida).emit('npc-construccion-iniciar', { jugador });
}

// Configuración inicial del juego
const TERRITORIOS_BASE = [
    { nombre: "Isla del Oso", oro: 5, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Costa pedregosa", oro: 4, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Los túmulos", oro: 7, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Invernalia", oro: 11, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Fuerte terror", oro: 8, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Bastión Kar", oro: 6, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Skagos", oro: 4, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Atalaya de la viuda", oro: 5, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Puerto blanco", oro: 7, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Cabo Kraken", oro: 4, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Bosque de lobos", oro: 6, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "El cuello", oro: 6, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Tribu de las montañas", oro: 4, propietarioInicial: "Stark", casa: "Stark", edificios: [] },
    { nombre: "Los Gemelos", oro: 9, propietarioInicial: "Tully", casa: "Tully", edificios: [] },
    { nombre: "El Tridente", oro: 8, propietarioInicial: "Tully", casa: "Tully", edificios: [] },
    { nombre: "Aguasdulces", oro: 12, propietarioInicial: "Tully", casa: "Tully", edificios: [] },
    { nombre: "Harrenhal", oro: 10, propietarioInicial: "Tully", casa: "Tully", edificios: [] },
    { nombre: "Septo de Piedra", oro: 5, propietarioInicial: "Tully", casa: "Tully", edificios: [] },
    { nombre: "Varamar", oro: 5, propietarioInicial: "Tully", casa: "Tully", edificios: [] },
    { nombre: "Poza de Doncella", oro: 8, propietarioInicial: "Tully", casa: "Tully", edificios: [] },
    { nombre: "Montañas de la Luna", oro: 6, propietarioInicial: "Arryn", casa: "Arryn", edificios: [] },
    { nombre: "Los Dedos", oro: 7, propietarioInicial: "Arryn", casa: "Arryn", edificios: [] },
    { nombre: "Arco Largo", oro: 6, propietarioInicial: "Arryn", casa: "Arryn", edificios: [] },
    { nombre: "Nido de Águilas", oro: 13, propietarioInicial: "Arryn", casa: "Arryn", edificios: [] },
    { nombre: "Puerta de la Sangre", oro: 4, propietarioInicial: "Arryn", casa: "Arryn", edificios: [] },
    { nombre: "Puerto Gaviota", oro: 10, propietarioInicial: "Arryn", casa: "Arryn", edificios: [] },
    { nombre: "Tres Hermanas", oro: 6, propietarioInicial: "Arryn", casa: "Arryn", edificios: [] },
    { nombre: "Fuerterrojo", oro: 7, propietarioInicial: "Arryn", casa: "Arryn", edificios: [] },
    { nombre: "El risco", oro: 6, propietarioInicial: "Lannister", casa: "Lannister", edificios: [] },
    { nombre: "Roca Casterly", oro: 16, propietarioInicial: "Lannister", casa: "Lannister", edificios: [] },
    { nombre: "Colmillo dorado", oro: 8, propietarioInicial: "Lannister", casa: "Lannister", edificios: [] },
    { nombre: "Refugio de plata", oro: 10, propietarioInicial: "Lannister", casa: "Lannister", edificios: [] },
    { nombre: "Crakehall", oro: 8, propietarioInicial: "Lannister", casa: "Lannister", edificios: [] },
    { nombre: "Isla Bella", oro: 6, propietarioInicial: "Lannister", casa: "Lannister", edificios: [] },
    { nombre: "Lannisport", oro: 15, propietarioInicial: "Lannister", casa: "Lannister", edificios: [] },
    { nombre: "El Rejo", oro: 10, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "Aguas Negras", oro: 6, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "Río Mander", oro: 9, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "Sotodeoro", oro: 9, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "La Sidra", oro: 6, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "Colina Cuerno", oro: 7, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "Altojardín", oro: 15, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "Antigua", oro: 11, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "Islas Escudo", oro: 4, propietarioInicial: "Tyrell", casa: "Tyrell", edificios: [] },
    { nombre: "Punta Zarpa Rota", oro: 5, propietarioInicial: "Targaryen", casa: "Targaryen", edificios: [] },
    { nombre: "Valle Oscuro", oro: 10, propietarioInicial: "Targaryen", casa: "Targaryen", edificios: [] },
    { nombre: "Desembarco del Rey", oro: 23, propietarioInicial: "Targaryen", casa: "Targaryen", edificios: [] },
    { nombre: "Rocadragón", oro: 7, propietarioInicial: "Targaryen", casa: "Targaryen", edificios: [] },
    { nombre: "Bosque Real", oro: 6, propietarioInicial: "Targaryen", casa: "Targaryen", edificios: [] },
    { nombre: "Marca Deriva", oro: 9, propietarioInicial: "Targaryen", casa: "Targaryen", edificios: [] },
    { nombre: "Bastión de Tormentas", oro: 14, propietarioInicial: "Baratheon", casa: "Baratheon", edificios: [] },
    { nombre: "Tarth", oro: 8, propietarioInicial: "Baratheon", casa: "Baratheon", edificios: [] },
    { nombre: "Marcas de Dorne", oro: 8, propietarioInicial: "Baratheon", casa: "Baratheon", edificios: [] },
    { nombre: "Bosque Bruma", oro: 7, propietarioInicial: "Baratheon", casa: "Baratheon", edificios: [] },
    { nombre: "Islaverde", oro: 5, propietarioInicial: "Baratheon", casa: "Baratheon", edificios: [] },
    { nombre: "Bosque Alto", oro: 6, propietarioInicial: "Baratheon", casa: "Baratheon", edificios: [] },
    { nombre: "Refugio Estival", oro: 7, propietarioInicial: "Baratheon", casa: "Baratheon", edificios: [] },
    { nombre: "Sepulcro del Rey", oro: 10, propietarioInicial: "Martell", casa: "Martell", edificios: [] },
    { nombre: "Asperon", oro: 9, propietarioInicial: "Martell", casa: "Martell", edificios: [] },
    { nombre: "Río Sangreverde", oro: 8, propietarioInicial: "Martell", casa: "Martell", edificios: [] },
    { nombre: "Lanza del Sol", oro: 15, propietarioInicial: "Martell", casa: "Martell", edificios: [] },
    { nombre: "Los Peldaños", oro: 6, propietarioInicial: "Martell", casa: "Martell", edificios: [] },
    { nombre: "Campo Estrella", oro: 7, propietarioInicial: "Martell", casa: "Martell", edificios: [] },
    { nombre: "Pyke", oro: 14, propietarioInicial: "Greyjoy", casa: "Greyjoy", edificios: [] },
    { nombre: "Harlaw", oro: 10, propietarioInicial: "Greyjoy", casa: "Greyjoy", edificios: [] },
    { nombre: "Monte Orca", oro: 7, propietarioInicial: "Greyjoy", casa: "Greyjoy", edificios: [] },
    { nombre: "Gran Wyk", oro: 9, propietarioInicial: "Greyjoy", casa: "Greyjoy", edificios: [] }
  ];

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

  
const ORO_INICIAL_POR_DEFECTO = 0;
const TROPAS_INICIALES_POR_DEFECTO = 0;

const LIMITE_TROPAS_CASA = {
  Stark: 7,
  Lannister: 9,
  Targaryen: 6,
  Baratheon: 8,
  Tully: 7,
  Martell: 5,
  Tyrell: 12,
  Arryn: 7,
  Greyjoy: 7
};





// Función que genera el estado inicial de los territorios al comenzar la partida
function inicializarEstadoTerritorios() {
    const estadoTerritorios = {};
    TERRITORIOS_BASE.forEach(t => {
        estadoTerritorios[t.nombre] = {
            nombre: t.nombre,
            propietario: t.propietarioInicial,
            propietarioInicial: t.propietarioInicial,
            oroBase: t.oro,
            asediador: null,
            edificios: [],
            tropas: {}
        };
    });
    return estadoTerritorios;
}

function revisarYEmitirRoboMoral(socket, room, nombre) {
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Martell") return;
  if (!jugador.rumoresDesbloqueados?.includes("El Portador del Alba")) return;
  if (!jugador.guardiadelalba || jugador.guardiadelalba <= 0) return;

  const casasDisponibles = Object.values(room.estadoJugadores)
    .filter(j => j.casa !== jugador.casa)
    .map(j => j.casa);

  const socketId = room.playerSockets[nombre];
  if (socketId) {
    io.to(socketId).emit("mostrar-modal-robo-moral", { casasDisponibles });
  }
}




// No otorgar barcos iniciales por defecto a ninguna casa
const BARCOS_INICIALES = {
  Greyjoy: 0,
  Stark: 0,
  Arryn: 0,
  Targaryen: 0,
  Baratheon: 0,
  Martell: 0,
  Tyrell: 0,
  Lannister: 0,
  Tully: 0
};

  

// Función que asigna a cada jugador su casa, oro y tropas al iniciar
function inicializarEstadoJugadores(players, casasAsignadas) {
  const estadoJugadores = {};
  players.forEach(nombre => {
    estadoJugadores[nombre] = {
  // La Casa Baratheon ya no inicia con un Sacerdote de Luz por defecto
  sacerdotes: 0,
  dragones: 0,
  casa: casasAsignadas[nombre] || 'Desconocida',
  tropas: TROPAS_INICIALES_POR_DEFECTO, // soldado
  mercenarios: 0,
  elite: 0,
  jinete: 0,
  huevos: 0,
  casadoCon: null,
  caballero: 0,
  oro: ORO_INICIAL_POR_DEFECTO,
  barcos: BARCOS_INICIALES[casasAsignadas[nombre]] || 0,
  barcocorsario: 0,
  catapulta: 0,
  torre: 0,
  escorpion: 0,
  tropasBlindadas: 0,
  kraken: 0,
  huargos: 0,
  unircornios: 0,
  murcielagos: 0,
  guardiareal: 0,
  barcolegendario: 0,
  sacerdotizaroja:0,
  tritones: 0,
  venadosblancos: 0,
  martilladores:0,
  caballerosdelarosa:0,
  guardiadelalba:0,
  barbaros:0,
  caballerosdelaguila:0,
  sacerdoteSal:0,
  atalayasConstruidas: false,
  torneoUsadoEsteTurno: false,
  dobleImpuestosUsado: false,
  levasStarkUsadas: false,
  refuerzoTullyUsadoEsteTurno: false,
  ejercitoInicialListo: false,
  edificiosInicialesListos: false,
  oroInicialListo: false,


};

  });
  return estadoJugadores;
}

// Cuando un cliente se conecta por socket
io.on('connection', (socket) => {
  
  console.log(`🔌 Connect: ${socket.id}`);

  // Permitir al cliente verificar si un ID de sala ya existe
  socket.on('verificar-partida', async (partidaId, callback) => {
    let exists = !!rooms[partidaId];
    if (!exists) {
      try {
        const [rows] = await db.query(
          'SELECT nombre FROM `Partidas` WHERE `nombre` = ? LIMIT 1',
          [partidaId]
        );
        if (rows.length > 0) exists = true;
      } catch (err) {
        console.error('Error consultando partida en BD:', err);
      }
    }
    callback({ exists });
  });


   // Verificar si un nombre ya está en uso en esa partida
 socket.on('comprobar-nombre', ({ partida, nombre }, callback) => {
   const room = rooms[partida];
   const exists = room ? room.players.includes(nombre) : false;
   callback({ exists });
 });

  socket.on("tyrell-revuelta-campesina", ({ partida, nombre, casaObjetivo, tropasGanadas }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Tyrell") return;

  jugador.tropas = (jugador.tropas || 0) + tropasGanadas;

  // El jugador objetivo pierde tropas y territorios (pedimos luego por modal)
  const socketObjetivo = Object.entries(room.playerSockets).find(([nombreJ, _]) =>
    room.estadoJugadores[nombreJ]?.casa === casaObjetivo
  );
  if (socketObjetivo) {
    const [nombreObjetivo, idSocket] = socketObjetivo;
    io.to(idSocket).emit("abrir-modal-revuelta-perdidas", {
      casaAtacante: "Tyrell"
    });
  }

  const territoriosRivales = Object.keys(room.estadoTerritorios).filter(
  t => room.estadoTerritorios[t].propietario === casaObjetivo
);

const idSocketTyrell = room.playerSockets[nombre];
if (idSocketTyrell) {
  io.to(idSocketTyrell).emit("mostrar-modal-territorios-revuelta", {
    territorios: territoriosRivales
  });
}


  // Actualizar estado
  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

});


socket.on("tyrell-confirmar-territorios-revuelta", ({ partida, nombre, casaObjetivo, territorios }) => {
  const room = rooms[partida];
  if (!room) return;
  if (!territorios || !Array.isArray(territorios)) return;

  territorios.forEach(nombreT => {
    const territorio = room.estadoTerritorios[nombreT];
    if (territorio && territorio.propietario === casaObjetivo) {
      territorio.propietario = "Tyrell";
    }
  });

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

  // Pasar acción
  if (!room.jugadoresAccionTerminada.includes(nombre)) {
    room.jugadoresAccionTerminada.push(nombre);
  }

  const total = room.players.length;
  if (room.jugadoresAccionTerminada.length === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual += 1;
    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual += 1;
    }

    // reset del flag
    for (const j of Object.values(room.estadoJugadores)) {
      j.revueltaTyrellUsadaEsteTurno = false;
    }

    io.to(partida).emit("avanzar-accion", {
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
    if (room.accionActual === 4) {
      iniciarConstruccionNPC(room, partida);
    }
  }
});


socket.on("tyrell-revuelta-perdidas", ({ partida, nombre, perdidas, territoriosPerdidos }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  if (!jugador) return;

  // restar tropas
  for (const tipo in perdidas) {
  const cantidad = parseInt(perdidas[tipo]) || 0;

  // Solo restamos si el jugador tiene esa unidad definida
  if (jugador.hasOwnProperty(tipo)) {
    jugador[tipo] = Math.max(0, jugador[tipo] - cantidad);
  }
}


  // cambiar propietario
  for (const t of territoriosPerdidos) {
    if (room.estadoTerritorios[t]?.propietario === jugador.casa) {
      room.estadoTerritorios[t].propietario = "Tyrell";
    }
  }

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});



  socket.on('greyjoy-saquear', ({ partida, nombre, oro }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Greyjoy") return;

  jugador.oro = (jugador.oro || 0) + oro;

  // Si es más de 50, abre modal de pérdidas
  if (oro > 50) {
    const socketId = room.playerSockets[nombre];
    if (socketId) {
      io.to(socketId).emit('abrir-modal-perdidas-ataque', {
  jugador: nombre,
  datosJugador: jugador,
  esSaqueoGreyjoy: true
});

    }
  } else {
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
    }
  }

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

  // Avanzar acción si todos listos
  const listos = room.jugadoresAccionTerminada.length;
  const total = room.players.length;

  if (listos === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual += 1;
    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual += 1;
    }

    io.to(partida).emit('avanzar-accion', {
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
    if (room.accionActual === 4) {
      iniciarConstruccionNPC(room, partida);
    }
  }
});

socket.on("targaryen-reponer-jinete", ({ partida, nombre }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Targaryen") return;

  jugador.jinete = (jugador.jinete || 0) + 1;

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});



  socket.on('targaryen-ganar-hijo', ({ partida, nombre }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Targaryen") return;

  jugador.jinete = (jugador.jinete || 0) + 1;
  jugador.huevos = (jugador.huevos || 0) + 1;
});

socket.on('targaryen-eclosionar-huevo', ({ partida, nombre }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Targaryen") return;

  if ((jugador.huevos || 0) > 0) {
    jugador.huevos -= 1;
    jugador.dragones = (jugador.dragones || 0) + 1;
  }
});



  socket.on('ataque-coordinado', ({ partida, nombre, casaAtacante, aliados, territorios }) => {
    const room = rooms[partida];
    if (!room) return;

    // Guardamos el atacante principal y los territorios atacados
room.atacantePrincipalTurno = nombre;
room.casaAtacantePrincipal = casaAtacante;
room.territoriosAtacadosPorTurno = territorios;
room.casasAtacantesTurno = [casaAtacante, ...aliados];

  
    const implicados = new Set();

// Añadir atacante principal
implicados.add(nombre);

// Añadir aliados válidos
for (const casaAliada of aliados) {
  const jugadorAliado = Object.entries(room.estadoJugadores).find(([_, j]) => j.casa === casaAliada);
  if (jugadorAliado) implicados.add(jugadorAliado[0]);
}

  
    // AÑADIR defensores (por cada territorio, buscamos su propietario actual)
    for (const t of territorios) {
      const territorio = room.estadoTerritorios[t];
      const casaDefensora = territorio?.propietario;
      const jugadorDefensor = Object.entries(room.estadoJugadores).find(
        ([_, j]) => j.casa === casaDefensora
      );
      if (jugadorDefensor) implicados.add(jugadorDefensor[0]);
    }
  
    // Enviar a cada implicado su modal de pérdidas
    for (const jugadorNombre of implicados) {
      const datosJugador = room.estadoJugadores[jugadorNombre];
      const socketId = room.playerSockets[jugadorNombre];
      if (socketId && datosJugador) {
        io.to(socketId).emit('abrir-modal-perdidas-ataque', {
          jugador: jugadorNombre,
          datosJugador
        });
      }
    }
  });

  socket.on('perdidas-en-batalla', ({ partida, nombre, perdidas, esSaqueoGreyjoy }) => {
    const room = rooms[partida];
    if (!room) return;
  
    const jugador = room.estadoJugadores[nombre];
    if (!jugador) return;

    // Procesar pérdidas
for (const key in perdidas) {
  const valor = perdidas[key];

  if (typeof valor === "string" && valor.startsWith("tritones-final:") && jugador.casa === "Greyjoy") {
    const nuevosTritones = parseInt(valor.split(":")[1]) || 0;
    jugador.tritones = nuevosTritones;
  } else if (jugador[key] !== undefined) {
    jugador[key] = Math.max(0, jugador[key] - valor);
  }
}

  
    // Aplicar las pérdidas recibidas
    // Si es Targaryen y tiene Fuego Heredado y va a perder jinetes, avisamos al cliente antes
if (
  jugador.casa === "Targaryen" &&
  jugador.rumoresDesbloqueados?.includes("Fuego Heredado") &&
  perdidas.jinete && perdidas.jinete > 0
) {
  socket.emit("preguntar-reemplazo-jinetes", {
    cantidad: perdidas.jinete
  });
  return; // detenemos la ejecución, aplicamos pérdidas después según respuesta del jugador
}

revisarYEmitirRoboMoral(socket, room, nombre);


    if (esSaqueoGreyjoy) {
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
    }
  
    // Emitimos estado actualizado (opcional)
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });

    const total = room.players.length;
    if (room.jugadoresAccionTerminada.length === total) {
      room.jugadoresAccionTerminada = [];
      room.accionActual += 1;
      if (room.accionActual > 4) {
        room.accionActual = 1;
        room.turnoActual += 1;
      }
      io.to(partida).emit('avanzar-accion', {
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
      if (room.accionActual === 4) {
        iniciarConstruccionNPC(room, partida);
      }
    }
    return;
  }


  });
  
  socket.on('greyjoy-invocar-kraken', ({ partida, nombre }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];

  jugador.kraken = (jugador.kraken || 0) + 1;

  // Solo actualizamos estado para refrescar UI con el nuevo kraken
  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});




  socket.on('tyrell-obtener-tecnologia', ({ partida, nombre, edificio, territorio }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores[nombre];
    const t = room.estadoTerritorios[territorio];
    if (!jugador || jugador.casa !== "Tyrell" || !t || t.propietario !== "Tyrell") return;
  
    const COSTOS = {
      "Armería": 30,
      "Arquería": 30,
      "Academia de Caballería": 20
    };
  
    const costo = COSTOS[edificio] ?? 999;
    let descuento = 0;
    for (const terr of Object.values(room.estadoTerritorios)) {
      if (terr.propietario === "Tyrell") {
        descuento += terr.edificios.filter(e => e === "Cantera").length * 5;
      }
    }
  
    const costoFinal = Math.max(0, costo - descuento);
    if (jugador.oro < costoFinal) return;
  
    jugador.oro -= costoFinal;
    t.edificios.push(edificio);
    jugador.tecnologiaTyrellUsada = true;
  
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
    }
  
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  
    const listos = room.jugadoresAccionTerminada.length;
    const total = room.players.length;
  
    if (listos === total) {
      room.jugadoresAccionTerminada = [];
      room.accionActual += 1;
      if (room.accionActual > 4) {
        room.accionActual = 1;
        room.turnoActual += 1;
      }
  
      io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });

      io.to(partida).emit('avanzar-accion', {
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
      if (room.accionActual === 4) {
        iniciarConstruccionNPC(room, partida);
      }
    }


  });
  

  socket.on('organizar-torneo-arryn', ({ partida, nombre, cantidad }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores[nombre];
    if (!jugador || jugador.casa !== "Arryn" || jugador.torneoUsadoEsteTurno) return;
  
    jugador.caballero = (jugador.caballero || 0) + cantidad;
    jugador.torneoUsadoEsteTurno = true;
  
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
    }
  
    const listos = room.jugadoresAccionTerminada.length;
    const total = room.players.length;
  
    io.to(partida).emit('estado-espera-jugadores', listos < total ? `Esperando a ${total - listos}...` : `Procesando...`);
  
    if (listos === total) {
      room.jugadoresAccionTerminada = [];
      room.accionActual += 1;
    
      // RESETEO de torneo: al empezar nueva acción (aunque no cambie el turno)
      for (const j of Object.values(room.estadoJugadores)) {
        
      }
    
      if (room.accionActual > 4) {
        room.accionActual = 1;
        room.turnoActual += 1;
      }
    
  
      io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
  
      io.to(partida).emit('avanzar-accion', {
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
      if (room.accionActual === 4) {
        iniciarConstruccionNPC(room, partida);
      }
    }
  });
  

  socket.on('construir-atalayas-arryn', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room) return;
  
    const jugador = room.estadoJugadores[nombre];
    if (!jugador || jugador.casa !== "Arryn" || jugador.atalayasConstruidas) return;
  
    const COSTO = 40;
    let descuentoCantera = 0;
  
    for (const t of Object.values(room.estadoTerritorios)) {
      if (t.propietario === jugador.casa && Array.isArray(t.edificios)) {
        descuentoCantera += t.edificios.filter(e => e === "Cantera").length * 5;
      }
    }
  
    const costoFinal = Math.max(0, COSTO - descuentoCantera);
    if (jugador.oro < costoFinal) {
      io.to(room.playerSockets[nombre]).emit('error-accion', 'Oro insuficiente para construir las Atalayas.');
      return;
    }
  
    jugador.oro -= costoFinal;
    jugador.atalayasConstruidas = true;
  
    for (const territorio of Object.values(room.estadoTerritorios)) {
      const base = TERRITORIOS_BASE.find(t => t.nombre === territorio.nombre);
      if (base?.propietarioInicial === "Arryn") {
        territorio.edificios.push("Atalayas");
      }
    }
  
    io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
    }
  
    const listos = room.jugadoresAccionTerminada.length;
    const total = room.players.length;
  
    io.to(partida).emit('estado-espera-jugadores', listos < total ? `Esperando a ${total - listos}...` : `Procesando...`);
  
    if (listos === total) {
      // avanzar acción
      room.jugadoresAccionTerminada = [];
      room.accionActual += 1;
      if (room.accionActual > 4) {
        room.accionActual = 1;
        room.turnoActual += 1;
      }
  
      io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
  
      io.to(partida).emit('avanzar-accion', {
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
      if (room.accionActual === 4) {
        iniciarConstruccionNPC(room, partida);
      }
    }
  });
  
  socket.on('asignar-territorios-post-batalla', ({ partida, nombre, asignaciones, esAtaqueNorteStark }) => {
    const room = rooms[partida];
    if (!room) return;
  
    for (const t in asignaciones) {
      if (room.estadoTerritorios[t]) {
        room.estadoTerritorios[t].propietario = asignaciones[t];
      }
    }
  
    // Avanzar acción solo para el atacante principal
    if (!esAtaqueNorteStark) {
      if (!room.jugadoresAccionTerminada.includes(nombre)) {
        room.jugadoresAccionTerminada.push(nombre);
      }
    }
  
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  
    const total = room.players.length;
    if (room.jugadoresAccionTerminada.length === total) {
      room.jugadoresAccionTerminada = [];
      room.accionActual++;
      if (room.accionActual > 4) {
        room.accionActual = 1;
        room.turnoActual++;
      }
  
      io.to(partida).emit('avanzar-accion', {
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
      if (room.accionActual === 4) {
        iniciarConstruccionNPC(room, partida);
      }
    }

   


    // LIMPIAR datos del ataque al final del modal 3
room.atacantePrincipalTurno = null;
room.casaAtacantePrincipal = null;
room.territoriosAtacadosPorTurno = null;
room.casasAtacantesTurno = null;

    
  });


  socket.on("ataque-simple-doble", ({ partida, nombre, casa, territorios, perdidasPorUnidad, esAtaqueNorteStark }) => {

  const room = rooms[partida];
  if (!room || !room.estadoJugadores?.[nombre]) return;
  const jugador = room.estadoJugadores[nombre];

  // Restar unidades perdidas
  for (const key in perdidasPorUnidad) {
  const valor = perdidasPorUnidad[key];

  if (typeof valor === "string" && valor.startsWith("tritones-final:") && jugador.casa === "Greyjoy") {
    const nuevosTritones = parseInt(valor.split(":")[1]) || 0;
    jugador.tritones = nuevosTritones;
  } else if (jugador[key] !== undefined) {
    jugador[key] = Math.max(0, jugador[key] - valor);
  }
}


  // Procesar territorios atacados
  for (const t of territorios) {
    const territorio = room.estadoTerritorios?.[t.nombre];
    if (!territorio) continue;
    if (t.levantar) {
      if (t.nuevoPropietario && t.nuevoPropietario !== 'Nadie') {
        territorio.propietario = t.nuevoPropietario;
      }
      territorio.asediador = null;
    }
    if (territorio.propietario !== casa && t.gano) {
      territorio.propietario = t.propietario || casa;
      territorio.asediador = null;
    }
  }

  // La acción se marcará como terminada únicamente cuando el cliente
  // emita explicitamente 'accion-terminada'.
  
  revisarYEmitirRoboMoral(socket, room, nombre);


  // Enviar a todos menos al atacante para que informen sus pérdidas
room.players.forEach(jugador => {
  if (jugador !== nombre && room.playerSockets[jugador]) {
    io.to(room.playerSockets[jugador]).emit('abrir-modal-perdidas-defensor');
  }
});



  // Emitir estado actualizado
  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

  // Avanzar si todos han terminado
  const total = room.players.length;
  if (room.jugadoresAccionTerminada.length === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual += 1;
    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual += 1;
    }
    io.to(partida).emit('avanzar-accion', {
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
    if (room.accionActual === 4) {
      iniciarConstruccionNPC(room, partida);
    }
  }
});




socket.on('perdidas-defensor', ({ partida, nombre, perdidas }) => {
  const room = rooms[partida];
  if (!room || !room.estadoJugadores?.[nombre]) return;

  const jugador = room.estadoJugadores[nombre];
  for (const key in perdidas) {
  const valor = perdidas[key];

  if (typeof valor === "string" && valor.startsWith("tritones-final:") && jugador.casa === "Greyjoy") {
    const nuevosTritones = parseInt(valor.split(":")[1]) || 0;
    jugador.tritones = nuevosTritones;
  } else if (jugador[key] !== undefined) {
    jugador[key] = Math.max(0, jugador[key] - valor);
  }
}

revisarYEmitirRoboMoral(socket, room, nombre);



  // Actualizar estado de ese jugador
  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});


  

  socket.on("arryn-inicial-completo", ({ partida, nombre, caballeros, oro, tropas, rumorInicial }) => {
    const room = rooms[partida];
    if (!room) return;
  
    const jugador = room.estadoJugadores[nombre];
    if (!jugador || jugador.casa !== "Arryn") return;
  
    jugador.tropas = tropas;
    jugador.caballero = caballeros;
  
    let ingreso = 0;
    const territorios = room.estadoTerritorios;
  
    for (const nombreT in territorios) {
      const t = territorios[nombreT];
      if (t.propietario === "Arryn" && !t.asediador) {
        ingreso += t.oroBase || 0;
        ingreso += (t.edificios.filter(e => e === "Mina").length) * 10;
        ingreso += (t.edificios.filter(e => e === "Cantera").length) * 5;
        ingreso += (t.edificios.filter(e => e === "Granja").length) * 5;
        ingreso += (t.edificios.filter(e => e === "Aserradero").length) * 5;
      }
    }
  
    const tienePuerto = Object.values(territorios).some(
      t => t.propietario === "Arryn" && t.edificios.includes("Puerto")
    );
    if (tienePuerto) {
      let totalProd = 0;
      for (const t of Object.values(territorios)) {
        if (t.propietario === "Arryn") {
          totalProd += t.edificios.filter(e =>
            ["Mina", "Cantera", "Granja", "Aserradero"].includes(e)
          ).length;
        }
      }
      const oroPorEdificio = casa === "Martell" ? 15 : 10;
      ingreso += totalProd * oroPorEdificio;
    }
  
    ingreso += oro;
  
    const mantenimiento =
      tropas +
      caballeros +
      (jugador.mercenarios || 0) +
      (jugador.elite || 0) +
      (jugador.barcos || 0) * 2 +
      (jugador.catapulta || 0) +
      (jugador.torre || 0) +
      (jugador.escorpion || 0) +
      (jugador.dragones || 0) * 5 +
      (jugador.sacerdotes || 0);
  
    jugador.oro = Math.max(0, ingreso - mantenimiento);


    if (rumorInicial && RUMORES_POR_CASA[jugador.casa]?.includes(rumorInicial)) {
  jugador.rumoresDesbloqueados = [rumorInicial];
  console.log(`[Rumor Inicial] ${jugador.nombre} empieza con el rumor: ${rumorInicial}`);
}

if (rumorInicial && RUMORES_POR_CASA[jugador.casa]?.includes(rumorInicial)) {
  jugador.rumoresDesbloqueados = [rumorInicial];
  console.log(`[Rumor Inicial] ${jugador.nombre} empieza con el rumor: ${rumorInicial}`);
}
  
    io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });
  

  socket.on("tyrell-inicial-completo", ({ partida, nombre, territorio, oro, tropas, rumorInicial }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  const t = room.estadoTerritorios[territorio];
  if (!jugador || jugador.casa !== "Tyrell" || !t) return;

  // Añadir la Granja
  t.edificios.push("Granja");

  // Asignar tropas (necesario antes de calcular mantenimiento)
  jugador.tropas = tropas;

  // Calcular ingresos
  // Calcular ingresos
  let ingreso = 0;
  for (const terr of Object.values(room.estadoTerritorios)) {
    if (terr.propietario === "Tyrell" && !terr.asediador) {
      ingreso += terr.oroBase || 0;
      ingreso += (terr.edificios.filter(e => e === "Mina").length) * 10;
      ingreso += (terr.edificios.filter(e => e === "Cantera").length) * 5;
      ingreso += (terr.edificios.filter(e => e === "Aserradero").length) * 5;
    }
  }

  // BONUS directo por el rumor Diezmo de la Abundancia
  // BONUS directo por el rumor Diezmo de la Abundancia
if (rumorInicial === "Diezmo de la Abundancia") {
  ingreso += 15; // porque al inicio siempre hay 1 granja
}



  // Bonus por Puerto
  const tienePuerto = Object.values(room.estadoTerritorios).some(
    t => t.propietario === "Tyrell" && t.edificios.includes("Puerto")
  );

  if (tienePuerto) {
    let prodEdificios = 0;
    for (const terr of Object.values(room.estadoTerritorios)) {
      if (terr.propietario === "Tyrell") {
        prodEdificios += terr.edificios.filter(e =>
          ["Mina", "Cantera", "Aserradero", "Granja"].includes(e)
        ).length;
      }
    }
    ingreso += prodEdificios * 10;
  }

  // Sumar oro extra elegido por el jugador
  ingreso += oro;

  // Calcular mantenimiento
  const mantenimiento =
  tropas +
  (jugador.mercenarios || 0) +
  (jugador.elite || 0) +
  (jugador.barcos || 0) * 2 +
  (jugador.catapulta || 0) +
  (jugador.torre || 0) +
  (jugador.escorpion || 0) +
  (jugador.dragones || 0) * 5 +
  (jugador.sacerdotes || 0);
jugador.oro = Math.max(0, ingreso - mantenimiento);

if (rumorInicial && RUMORES_POR_CASA[jugador.casa]?.includes(rumorInicial)) {
  jugador.rumoresDesbloqueados = [rumorInicial];
  console.log(`[Rumor Inicial] ${jugador.nombre} empieza con el rumor: ${rumorInicial}`);
}


  // Emitir estado actualizado
  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});





  socket.on("colocar-granja-tyrell", ({ partida, nombre, territorio }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  const t = room.estadoTerritorios[territorio];
  if (!jugador || jugador.casa !== "Tyrell" || !t || t.propietario !== "Tyrell") return;

  t.edificios.push("Granja");

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});


socket.on('actualizar-perdidas-neutral', ({ partida, nombre, perdidas, perdidasPorUnidad, territoriosPerdidos, nuevoPropietarioPorTerritorio }) => {


    const room = rooms[partida];
    if (!room) return;
  
    const jugador = room.estadoJugadores[nombre];
    if (!jugador) return;

    jugador.torneoUsadoEsteTurno = false
    jugador.refuerzoTullyUsadoEsteTurno = false
  
    jugador.tropas = Math.max(0, jugador.tropas - perdidas);

    if (perdidasPorUnidad && typeof perdidasPorUnidad === 'object') {
  for (const key in perdidasPorUnidad) {
    const valor = perdidasPorUnidad[key];

    if (typeof valor === "string" && valor.startsWith("tritones-final:") && jugador.casa === "Greyjoy") {
      const nuevosTritones = parseInt(valor.split(":")[1]) || 0;
      jugador.tritones = nuevosTritones;
    } else if (jugador.hasOwnProperty(key)) {
      jugador[key] = Math.max(0, jugador[key] - valor);
    }
  }
}

    
  
    if (territoriosPerdidos && typeof nuevoPropietarioPorTerritorio === "object") {
      territoriosPerdidos.forEach(nombreTerritorio => {
        const territorio = room.estadoTerritorios[nombreTerritorio];
        const nuevo = nuevoPropietarioPorTerritorio[nombreTerritorio];
        if (territorio && territorio.propietario === jugador.casa && nuevo) {
          territorio.propietario = nuevo;
        }
      });
    }
    // Si el jugador es Tyrell y tiene un Septo, pedir militantes
if (jugador.casa === "Tyrell") {
  const tieneSepto = Object.values(room.estadoTerritorios).some(
    t => t.propietario === "Tyrell" && t.edificios.includes("Septo")
  );

  if (tieneSepto) {
    io.to(room.playerSockets[nombre]).emit("abrir-modal-militantes-fe");
  }
}

revisarYEmitirRoboMoral(socket, room, nombre);


  
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  
    // El jugador termina automáticamente su fase
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
    }
  
    const listos = room.jugadoresAccionTerminada.length;
    const total = room.players.length;
  
    io.to(partida).emit('estado-espera-jugadores', listos < total ? `Esperando a ${total - listos}...` : `Procesando...`);
  
    if (listos === total) {
      room.jugadoresAccionTerminada = [];
      room.accionActual += 1;
  
      if (room.accionActual > 4) {
        room.accionActual = 1;
        room.turnoActual += 1;
  
        const jugadores = room.estadoJugadores;
        const territorios = room.estadoTerritorios;
  
        for (const jugadorNombre in jugadores) {
          const j = jugadores[jugadorNombre];
          const casa = j.casa;
          let ingreso = 0;

          if (casa === "Tully") {
  ingreso += 20;
}

          
          // Bonus por casarse con Casa Celtigar
if (j.casa === "Targaryen" && (j.casadoCon === "Celtigar" || j.casamientoExtra === "Celtigar")) {
  ingreso += 30;
}



          for (const nombreTerritorio in territorios) {
            const t = territorios[nombreTerritorio];
            if (t.propietario === casa && !t.asediador) {
              ingreso += t.oroBase || 0;
            }
          }
            // BONUS por cada mina construida en territorios del jugador
  for (const nombreTerritorio in territorios) {
    const territorio = territorios[nombreTerritorio];
    if (territorio.propietario === casa && !territorio.asediador && Array.isArray(territorio.edificios)) {
        const minas = territorio.edificios.filter(e => e === "Mina").length;
        const aserraderos = territorio.edificios.filter(e => e === "Aserradero").length;
        const canteras = territorio.edificios.filter(e => e === "Cantera").length;
        const granjas = territorio.edificios.filter(e => e === "Granja").length;
        const tienePuerto = territorio.edificios.includes("Puerto");
if (tienePuerto) {
  // Contar cuántos edificios de producción hay en todos los territorios del jugador
  let totalProduccion = 0;
  for (const otro of Object.values(territorios)) {
    if (otro.propietario === casa && Array.isArray(otro.edificios)) {
      totalProduccion += otro.edificios.filter(e =>
        ["Mina", "Cantera", "Aserradero", "Granja"].includes(e)
      ).length;
    }
  }
  const oroPorEdificio = casa === "Martell" ? 15 : 10;
  ingreso += totalProduccion * oroPorEdificio;
}






const esGreyjoy = casa === "Greyjoy";

ingreso += minas * (esGreyjoy ? 15 : (casa === "Lannister" ? 20 : 10));
ingreso += aserraderos * (esGreyjoy ? 8 : 5);
ingreso += canteras * (esGreyjoy ? 8 : 5);
if (jugador.casa === "Tyrell") {
  const tieneRumorDiezmo = jugador.rumoresDesbloqueados?.includes("Diezmo de la Abundancia");
  ingreso += granjas * (tieneRumorDiezmo ? 15 : 0);
} else {
  ingreso += granjas * (esGreyjoy ? 8 : 5);
}


      }
    }

if (casa === "Martell") {
  const puertoInicial = territorios["Lanza del Sol"];
  if (puertoInicial && puertoInicial.propietario === "Martell" && puertoInicial.edificios.includes("Puerto")) {
    ingreso += 10;
  }
}


// Martell con "Mercancía de Sombras": +10 por edificio de producción
if (j.casa === "Martell" && j.rumoresDesbloqueados?.includes("Mercancía de Sombras")) {
  let edificiosProduccion = 0;
  for (const t of Object.values(territorios)) {
    if (t.propietario === j.casa) {
      edificiosProduccion += t.edificios.filter(e => ["Mina", "Cantera", "Aserradero", "Granja"].includes(e)).length;
    }
  }
  ingreso += edificiosProduccion * 10;
}

          const barcos = j.barcos || 0;
const catapultas = j.catapulta || 0;
const torres = j.torre || 0;
const escorpiones = j.escorpion || 0;
const dragones = j.dragones || 0;

const costoBarcos = barcos * 2;
const costoTropas = (j.tropas || 0) + (j.mercenarios || 0) + (j.elite || 0) + (j.militantesFe || 0);

const costoMaquinas = catapultas + torres + escorpiones;
const costoDragones = dragones * 5;
const costoSacerdotes = j.sacerdotes || 0;
const caballeros = j.caballero || 0;
const costoCaballeros = caballeros * 1;
const costoHuargos = jugador.huargos || 0;
const costounicornios = jugador.unicornios || 0;
const costomurcielagos = jugador.murcielagos || 0;
const costoguardiareal = jugador.guardiareal || 0;
const costoBarcoLegendario = jugador.barcolegendario * 2;
const costobarcocorsario = jugador.barcocorsario * 2;
const costovenadosblancos = jugador.venadosblancos || 0;
const costomartilladores = jugador.martilladores || 0;
const costocaballerosdelarosa = jugador.caballerosdelarosa || 0;
const costoguardiadelalba = jugador.guardiadelalba || 0;
const costosacerdotizaroja = jugador.sacerdotizaroja || 0;
const costobarbaros = jugador.barbaros || 0;
const costocaballerosdelaguila= jugador.caballerosdelaguila || 0;
const costosacerdotesal = j.sacerdoteSal || 0;


j.oro += ingreso;
const oroAntesGastos = j.oro;
const costoTotal = costoTropas + costoBarcos + costoMaquinas + costoDragones + costoSacerdotes + costoCaballeros + costoHuargos + costounicornios
  + costomurcielagos + costoguardiareal + costoBarcoLegendario + costobarcocorsario + costovenadosblancos + costomartilladores + costocaballerosdelarosa + costoguardiadelalba
  + costosacerdotizaroja + costobarbaros + costocaballerosdelaguila + costosacerdotesal;
j.oro = Math.max(0, oroAntesGastos - costoTotal);
if (oroAntesGastos < costoTotal) {
  const sock = room.playerSockets[jugadorNombre];
  if (sock) io.to(sock).emit('abrir-modal-morosidad');
}




        }
      }
  
      io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
  
      io.to(partida).emit('avanzar-accion', {
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
      if (room.accionActual === 4) {
        iniciarConstruccionNPC(room, partida);
      }



    }
    //Aqui se comprueba si justo al perder tropas en fase neutral se manda el emit para combrobar si quedan tropas de ese indole:
    //Huargos:
    socket.emit("forzar-reclutar-huargos");
    //unicornios:
    socket.emit("forzar-reclutar-unicornios");
    //Murcielagos:
    socket.emit("forzar-reclutar-murcielagos");
    //Caballeros Tully:
    socket.emit("forzar-reclutar-caballeros-tully");
    //Guardia Real:
    socket.emit("forzar-reclutar-guardiareal");
    //Barco Legendario:
    socket.emit("forzar-reclutar-barcolegendario");
    //tritones:
    socket.emit("forzar-reclutar-tritones");
    //venados blancos:
    socket.emit("forzar-reclutar-venadosblancos");
    //martilladores:
    socket.emit("forzar-reclutar-martilladores");
    //caballeros de la rosa:
    socket.emit("forzar-reclutar-caballerosdelarosa");
    //Guardia del Alba:
    socket.emit("forzar-reclutar-guardiadelalba");
    //Sacerdotiza Roja:
    socket.emit("forzar-reclutar-sacerdotizaroja");
    //barbaros:
    socket.emit("forzar-reclutar-barbaros");
    //Caballeros del Aguila:
    socket.emit("forzar-reclutar-caballerosdelaguila");

    




    




  });
  
  socket.on("martell-robar-tropas-moral", ({ partida, nombre, cantidad, casaObjetivo }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  const victima = Object.values(room.estadoJugadores).find(j => j.casa === casaObjetivo);

  if (!jugador || jugador.casa !== "Martell" || !victima) return;

  // Aseguramos que no robe más de lo que tiene la víctima
  const cantidadFinal = Math.min(cantidad, victima.tropas || 0);
  jugador.tropas = (jugador.tropas || 0) + cantidadFinal;
  victima.tropas = Math.max(0, (victima.tropas || 0) - cantidadFinal);

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});


  socket.on('actualizar-iniciales', ({ partida, nombre, oro, tropas }) => {
    const room = rooms[partida];
    if (!room || !room.estadoJugadores || !room.estadoJugadores[nombre]) return;
  
    room.estadoJugadores[nombre].oro = oro;
    room.estadoJugadores[nombre].tropas = tropas;
  
    // Opcional: mandar estado actualizado de ese jugador
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('confirmar-iniciales-turno1', ({ partida, nombre, tropas, oroExtra, rumorInicial }) => {
    const room = rooms[partida];
    if (!room || !room.estadoJugadores?.[nombre]) return;
  
    // Solo debe ejecutarse en el turno 1, acción 1
    if (room.turnoActual !== 1 || room.accionActual !== 1) return;
  
    const jugador = room.estadoJugadores[nombre];
    const casa = jugador.casa;
    const territorios = room.estadoTerritorios;
  
    jugador.tropas = tropas;
  
    // Calcular ingresos como en la fase neutral
    let ingreso = 0;

    // BONUS por aduanas si es Tully
    if (casa === "Tully") {
      ingreso += 20;
    }

  
    for (const nombreTerritorio in territorios) {
      const territorio = territorios[nombreTerritorio];
      if (territorio.propietario === casa && !territorio.asediador) {
        ingreso += territorio.oroBase || 0;
  
        const minas = territorio.edificios.filter(e => e === "Mina").length;
        const aserraderos = territorio.edificios.filter(e => e === "Aserradero").length;
        const canteras = territorio.edificios.filter(e => e === "Cantera").length;
        const granjas = territorio.edificios.filter(e => e === "Granja").length;

        const esGreyjoy = casa === "Greyjoy";
  
        ingreso += minas * (esGreyjoy ? 15 : (casa === "Lannister" ? 20 : 10));

        ingreso += aserraderos * (esGreyjoy ? 8 : 5);
        ingreso += canteras * (esGreyjoy ? 8 : 5);
        if (casa === "Tully") {
          ingreso += granjas * 10;
        } else if (casa !== "Tyrell") ingreso += granjas * (esGreyjoy ? 8 : 5);

        // Bonus Martell por Puerto inicial en Lanza del Sol


        
      }
    }

    if (casa === "Martell") {
      const puertoInicial = territorios["Lanza del Sol"];
      if (puertoInicial && puertoInicial.propietario === "Martell" && puertoInicial.edificios.includes("Puerto")) {
        ingreso += 10;
      }
    }
  
    // BONUS por puerto
    const tienePuerto = Object.values(territorios).some(t => t.propietario === casa && t.edificios.includes("Puerto"));
    if (tienePuerto) {
      let totalProd = 0;
      for (const t of Object.values(territorios)) {
        if (t.propietario === casa) {
          totalProd += t.edificios.filter(e => ["Mina", "Cantera", "Aserradero", "Granja"].includes(e)).length;
        }
      }
      const oroPorEdificio = casa === "Martell" ? 15 : 10;
      ingreso += totalProd * oroPorEdificio;
    }
  
    // Sumar oro extra ingresado por el jugador
    ingreso += oroExtra;
  
    // Restar mantenimiento
    const mantenimiento =
  tropas +
  (jugador.mercenarios || 0) +
  (jugador.elite || 0) +
  (jugador.barcos || 0) * 2 +
  (jugador.barcocorsario || 0) * 2 +
  (jugador.catapulta || 0) +
  (jugador.torre || 0) +
  (jugador.escorpion || 0) +
  (jugador.dragones || 0) * 5 +
  (jugador.sacerdotes || 0) +
  (jugador.sacerdoteSal || 0);
jugador.oro = Math.max(0, ingreso - mantenimiento);

if (rumorInicial && RUMORES_POR_CASA[jugador.casa]?.includes(rumorInicial)) {
  jugador.rumoresDesbloqueados = [rumorInicial];
  console.log(`[Rumor Inicial] ${jugador.nombre} empieza con el rumor: ${rumorInicial}`);
}



  
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });

  const listos = room.jugadoresAccionTerminada.length;
  const total = room.players.length;

  io.to(partida).emit(
    'estado-espera-jugadores',
    listos < total ? `Esperando a ${total - listos}...` : `Procesando...`
  );

  if (listos === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual += 1;

    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual += 1;
    }

    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });

    io.to(partida).emit('avanzar-accion', {
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
    if (room.accionActual === 4) {
      iniciarConstruccionNPC(room, partida);
    }
  }

  });
  
  

  // Crear una nueva partida y asignar host
  // Crear una nueva partida, asignar host y guardarla en MySQL
socket.on('crear-partida', async ({ nombre, partida, clave }) => {
  if (rooms[partida]) return;
  rooms[partida] = {
    password: clave,
    players: [],
    casas: {},
    playerSockets: {},
    host: nombre,
    npcBuilder: null,
    territorioPersonalizado: false,
    modoMano: false
  };
  console.log(`[Lobby] Partida '${partida}' creada por ${nombre}.`);

  // Inserta en la tabla partidas
  try {
    await db.query(
    'INSERT INTO `Partidas` (`nombre`,`nombre_delhost`,`fecha_creacion`,`estado`) VALUES (?, ?, CURDATE(), ?)',
    [partida, nombre, 'Lobby']
  );
    console.log('Partida registrada en la BD');
  } catch (err) {
    console.error('Error guardando partida en BD:', err);
  }
});


  // Unirse a una partida ya existente
  socket.on('unirse-partida', ({ nombre, partida, clave }) => {
    if (!rooms[partida]) {
      // Si no existe, la crea al vuelo
      rooms[partida] = {
        password: clave,
        players: [],
        casas: {},
        playerSockets: {},
        host: nombre,
        npcBuilder: null,
        territorioPersonalizado: false,
        modoMano: false
        };
    }

    const room = rooms[partida];
    room.host = room.host || nombre;
    if (!room.players.includes(nombre)) room.players.push(nombre);
    room.playerSockets[nombre] = socket.id;

    socket.join(partida); // Une al cliente a esa sala de socket
    console.log(`[Lobby] ${nombre} se unió a ${partida}`);

    // Le mandamos al jugador el estado inicial del lobby
    socket.emit('casas-actualizadas', room.casas);
    socket.emit('jugadores-actualizados', room.players);
    socket.emit('config-territorios-actualizada', room.territorioPersonalizado);
    socket.emit('config-mano-actualizada', room.modoMano);

    // Avisamos a todos los jugadores del lobby del nuevo jugador
    io.to(partida).emit('jugadores-actualizados', room.players);

    // Avisar a todos quién es el host
    io.to(partida).emit('host-info', room.host);
    io.to(partida).emit('config-territorios-actualizada', room.territorioPersonalizado);
    io.to(partida).emit('config-mano-actualizada', room.modoMano);

    // Si la partida ya empezó, redirigir al jugador inmediatamente
    if (room.started) {
      socket.emit('juego-iniciado');
    }

    // Cancelar temporizador de eliminación si existía
    if (room.deleteTimer) {
      clearTimeout(room.deleteTimer);
      room.deleteTimer = null;
    }
  });

  // Cuando un jugador elige una casa
  socket.on('elegir-casa', ({ partida, nombre, casa }) => {
    const room = rooms[partida];
    if (!room) return;

    const casasUsadas = Object.values(room.casas);
    if (casasUsadas.includes(casa)) return; // No permitir duplicados

    room.casas[nombre] = casa;

    io.to(partida).emit('casas-actualizadas', room.casas);
    io.to(partida).emit('jugadores-actualizados', room.players);
  });

  // Cuando un jugador se quita la casa seleccionada
  socket.on('quitar-casa', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room) return;

    delete room.casas[nombre];

    io.to(partida).emit('casas-actualizadas', room.casas);
    io.to(partida).emit('jugadores-actualizados', room.players);
  });

  // Enviar listado de casas de una partida (útil para reconexión)
  socket.on('obtener-casas', ({ partida }, callback) => {
    const room = rooms[partida];
    if (room && typeof callback === 'function') {
      callback(room.casas);
    } else if (typeof callback === 'function') {
      callback({});
    }
  });

  // Devuelve jugadores desconectados y su casa
  socket.on('obtener-desconectados', ({ partida }, callback) => {
    const room = rooms[partida];
    if (!room || typeof callback !== 'function') {
      if (typeof callback === 'function') callback({});
      return;
    }
    const info = {};
    room.players.forEach(nombre => {
      if (!room.playerSockets[nombre]) {
        info[nombre] = room.casas[nombre];
      }
    });
    callback(info);
  });

  // Guarda el estado inicial de un jugador en el modo Mano del Rey
  socket.on('mano-guardar-estado', ({ partida, nombre, unidades, edificios, oro }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores?.[nombre];
    if (!jugador) return;

    if (typeof oro === 'number') {
      jugador.oro = oro;
      jugador.oroInicialListo = true;
    }

    if (unidades && typeof unidades === 'object') {
      for (const [k, v] of Object.entries(unidades)) {
        if (typeof v === 'number') {
          jugador[k] = v;
        }
      }
      jugador.ejercitoInicialListo = true;
    }

    if (edificios && typeof edificios === 'object') {
      jugador.edificiosIniciales = edificios;
      jugador.edificiosInicialesListos = true;
    }
  });

  // Devuelve el estado guardado de un jugador para el modo Mano del Rey
  socket.on('mano-obtener-estado', ({ partida, nombre }, callback) => {
    const room = rooms[partida];
    if (!room || typeof callback !== 'function') {
      if (typeof callback === 'function') callback(null);
      return;
    }
    const jugador = room.estadoJugadores?.[nombre];
    if (!jugador) {
      callback(null);
      return;
    }
    const edificiosContados = {};
    for (const t of Object.values(room.estadoTerritorios)) {
      if (t.propietario === jugador.casa && Array.isArray(t.edificios)) {
        t.edificios.forEach(e => {
          edificiosContados[e] = (edificiosContados[e] || 0) + 1;
        });
      }
    }
    callback({
      oro: jugador.oro,
      unidades: Object.fromEntries(
        Object.entries(jugador).filter(([k, v]) => typeof v === 'number' && k !== 'oro')
      ),
      edificios: edificiosContados,
      ejercitoListo: jugador.ejercitoInicialListo || false,
      edificiosListos: jugador.edificiosInicialesListos || false,
      oroListo: jugador.oroInicialListo || false
    });
  });

  // Host cambia el modo de territorios
  socket.on('actualizar-config-territorios', ({ partida, nombre, personalizado }) => {
    const room = rooms[partida];
    if (!room) return;
    if (room.host !== nombre) return;
    room.territorioPersonalizado = !!personalizado;
    io.to(partida).emit('config-territorios-actualizada', room.territorioPersonalizado);
  });

  socket.on('actualizar-config-mano', ({ partida, nombre, mano }) => {
    const room = rooms[partida];
    if (!room) return;
    if (room.host !== nombre) return;
    room.modoMano = !!mano;
    io.to(partida).emit('config-mano-actualizada', room.modoMano);
  });

  
  

  // El host inicia el juego
  socket.on('iniciar-juego', async ({ partida }) => {
    const room = rooms[partida];
    if (!room) return;


    room.started = true;

    if (room.deleteTimer) {
      clearTimeout(room.deleteTimer);
      room.deleteTimer = null;
    }
  
    // Inicializamos estado de juego
    room.estadoTerritorios = inicializarEstadoTerritorios();
    room.estadoJugadores = inicializarEstadoJugadores(room.players, room.casas);

    // Si ningún jugador eligió Tyrell, colocar una Granja en Altojardín
    const hayTyrell = Object.values(room.casas).includes("Tyrell");
    if (!hayTyrell) {
      const altojardin = room.estadoTerritorios["Altojardín"];
      if (altojardin && !altojardin.edificios.includes("Granja")) {
        altojardin.edificios.push("Granja");
      }
    }
    room.turnoActual = 1;
    room.accionActual = 1;
    room.jugadoresAccionTerminada = [];

    // 🔄 Actualiza el estado en la BD
   await db.query(
     'UPDATE `Partidas` SET `estado` = ? WHERE `nombre` = ?',
     ['En Partida', partida]
   );

    console.log(`[Juego] Juego iniciado en ${partida}`);
    io.to(partida).emit('config-mano-actualizada', room.modoMano);
    io.to(partida).emit('juego-iniciado', { ok: true });
  });

  // Un jugador entra a juego.html (sala de juego)
  socket.on('unirse-sala-juego', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (room && room.players.includes(nombre)) {
      socket.join(partida);
      if (!room.playerSockets) room.playerSockets = {};
      room.playerSockets[nombre] = socket.id;

      if (room.deleteTimer) {
        clearTimeout(room.deleteTimer);
        room.deleteTimer = null;
      }

      console.log(`[Juego] ${nombre} se conectó a la sala de ${partida}`);
      socket.emit('actualizar-estado-juego', {
        npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
    }
  });

  // === Modo Mano del Rey ===
  socket.on('unirse-sala-mano', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room || !room.players.includes(nombre)) return;
    socket.join(partida);
    if (!room.playerSockets) room.playerSockets = {};
    room.playerSockets[nombre] = socket.id;

    if (room.deleteTimer) {
      clearTimeout(room.deleteTimer);
      room.deleteTimer = null;
    }

    room.turnoManoActual = room.turnoManoActual || 1;
    room.jugadoresTurnoListo = room.jugadoresTurnoListo || [];

    const pendientes = room.players
      .filter(p => !room.jugadoresTurnoListo.includes(p))
      .map(p => room.casas[p]);

    socket.emit('mano-turno-estado', {
      turno: room.turnoManoActual,
      restantes: pendientes
    });

    // Enviar también el estado actual del juego (territorios y jugadores)
    socket.emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
  });

  socket.on('mano-confirmar-turno', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room || !room.players.includes(nombre)) return;

    room.turnoManoActual = room.turnoManoActual || 1;
    room.jugadoresTurnoListo = room.jugadoresTurnoListo || [];

    if (!room.jugadoresTurnoListo.includes(nombre)) {
      room.jugadoresTurnoListo.push(nombre);
    }

    const pendientes = room.players
      .filter(p => !room.jugadoresTurnoListo.includes(p))
      .map(p => room.casas[p]);

    if (pendientes.length === 0) {
      room.turnoManoActual += 1;
      room.jugadoresTurnoListo = [];
      io.to(partida).emit('mano-turno-avanzado', {
        turno: room.turnoManoActual
      });
    } else {
      const sid = room.playerSockets[nombre];
      if (sid) {
        io.to(sid).emit('mano-turno-espera', {
          casa: room.casas[nombre],
          restantes: pendientes
        });
      }
    }
  });

  socket.on('mano-editar-oro', ({ partida, nombre, oro }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores?.[nombre];
    if (!jugador) return;
    jugador.oro = typeof oro === 'number' ? oro : jugador.oro;
    io.to(partida).emit('mano-oro-actualizado', {
      jugador: nombre,
      casa: room.casas[nombre],
      oro: jugador.oro
    });
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('mano-enviar-oro', ({ partida, nombre, destino, cantidad }) => {
    const room = rooms[partida];
    if (!room) return;
    const emisor = room.estadoJugadores?.[nombre];
    const receptor = room.estadoJugadores?.[destino];
    if (!emisor || !receptor) return;
    const cant = parseInt(cantidad, 10) || 0;
    if (cant <= 0 || emisor.oro < cant) return;
    emisor.oro -= cant;
    receptor.oro = (receptor.oro || 0) + cant;
    io.to(partida).emit('mano-oro-enviado', {
      deCasa: room.casas[nombre],
      aCasa: room.casas[destino],
      cantidad: cant
    });
    io.to(partida).emit('mano-oro-actualizado', { jugador: nombre, casa: room.casas[nombre], oro: emisor.oro });
    io.to(partida).emit('mano-oro-actualizado', { jugador: destino, casa: room.casas[destino], oro: receptor.oro });
    const sid = room.playerSockets[destino];
    if (sid) io.to(sid).emit('mano-recibir-oro', { deCasa: room.casas[nombre], cantidad: cant });
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('mano-editar-unidades', ({ partida, nombre, unidades }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores?.[nombre];
    if (!jugador) return;
    if (unidades && typeof unidades === 'object') {
      for (const [k, v] of Object.entries(unidades)) {
        if (typeof v === 'number') jugador[k] = v;
      }
    }
    io.to(partida).emit('mano-unidades-actualizadas', {
      jugador: nombre,
      casa: room.casas[nombre],
      unidades: Object.fromEntries(
        Object.entries(jugador).filter(([k, v]) => typeof v === 'number' && k !== 'oro')
      )
    });
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('mano-registrar-bajas', ({ partida, nombre, bajas }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores?.[nombre];
    if (!jugador) return;
    if (bajas && typeof bajas === 'object') {
      for (const [k, v] of Object.entries(bajas)) {
        const val = parseInt(v, 10) || 0;
        if (typeof jugador[k] === 'number') {
          jugador[k] = Math.max(0, jugador[k] - val);
        }
      }
    }
    const unidadesAct = Object.fromEntries(
      Object.entries(jugador).filter(([key, val]) => typeof val === 'number' && key !== 'oro')
    );
    io.to(partida).emit('mano-bajas-registradas', {
      jugador: nombre,
      casa: room.casas[nombre],
      bajas,
      unidades: unidadesAct
    });
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('mano-reclutar-tropas', ({ partida, nombre, reclutas }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores?.[nombre];
    if (!jugador) return;

    const aserraderos = Object.values(room.estadoTerritorios)
      .filter(t => t.propietario === jugador.casa && Array.isArray(t.edificios))
      .reduce((acc, t) => acc + t.edificios.filter(e => e === 'Aserradero').length, 0);
    const costoBarco = Math.max(0, 20 - aserraderos * 5);
    const COSTOS = {
      tropas: 4,
      mercenarios: 8,
      dothraki: 15,
      companadorada: 15,
      inmaculados: 15,
      barcos: costoBarco
    };

    let total = 0;
    if (reclutas && typeof reclutas === 'object') {
      for (const [k, v] of Object.entries(reclutas)) {
        const val = parseInt(v, 10) || 0;
        if (val > 0) total += val * (COSTOS[k] || 0);
      }
    }

    if (jugador.oro < total) {
      const sid = room.playerSockets[nombre];
      if (sid) io.to(sid).emit('error-accion', 'Oro insuficiente para reclutar.');
      return;
    }

    const limite = LIMITE_TROPAS_CASA[jugador.casa];
    if (typeof limite === 'number') {
      const reclutaTropas = parseInt(reclutas?.tropas || 0, 10) || 0;
      const disponible = limite - (jugador.tropas || 0);
      if (reclutaTropas > disponible) {
        const sid = room.playerSockets[nombre];
        if (sid) io.to(sid).emit('error-accion', 'Límite de tropas alcanzado.');
        return;
      }
    }

    jugador.oro -= total;
    if (reclutas && typeof reclutas === 'object') {
      for (const [k, v] of Object.entries(reclutas)) {
        const val = parseInt(v, 10) || 0;
        if (val > 0) jugador[k] = (jugador[k] || 0) + val;
      }
    }

    const unidadesAct = Object.fromEntries(
      Object.entries(jugador).filter(([key, val]) => typeof val === 'number' && key !== 'oro')
    );

    io.to(partida).emit('mano-tropas-reclutadas', {
      jugador: nombre,
      casa: room.casas[nombre],
      reclutas,
      unidades: unidadesAct,
      oro: jugador.oro
    });

    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('mano-editar-edificios', ({ partida, nombre, edificios }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores?.[nombre];
    if (!jugador) return;
    if (edificios && typeof edificios === 'object') {
      jugador.edificiosIniciales = edificios;
    }
    io.to(partida).emit('mano-edificios-actualizados', {
      jugador: nombre,
      casa: room.casas[nombre],
      edificios: jugador.edificiosIniciales || {}
    });
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('solicitar-cambio-turno', ({ partida, nombre, turno }) => {
    const room = rooms[partida];
    if (!room) return;
    const nuevoTurno = parseInt(turno, 10) || room.turnoActual;
    const pendientes = room.players.filter(p => p !== nombre);

    // Si no hay más jugadores en la partida, confirma inmediatamente el cambio
    if (pendientes.length === 0) {
      room.turnoActual = nuevoTurno;
      room.turnoManoActual = nuevoTurno; // mantener sincronizado el turno de la Mano
      io.to(partida).emit('cambio-turno-confirmado', { turno: room.turnoActual });
      io.to(partida).emit('actualizar-estado-juego', {
        npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
      return;
    }

    room.cambioTurno = {
      solicitante: nombre,
      turno: nuevoTurno,
      pendientes
    };
    const pendientesCasas = pendientes.map(p => room.casas[p]);
    const sidSolicitante = room.playerSockets[nombre];
    if (sidSolicitante) {
      io.to(sidSolicitante).emit('cambio-turno-esperando', { pendientes: pendientesCasas });
    }
    for (const p of pendientes) {
      const sid = room.playerSockets[p];
      if (sid) io.to(sid).emit('cambio-turno-peticion', { solicitanteCasa: room.casas[nombre], turno: nuevoTurno });
    }
  });

  socket.on('responder-cambio-turno', ({ partida, nombre, aceptar }) => {
    const room = rooms[partida];
    if (!room || !room.cambioTurno) return;
    if (!room.cambioTurno.pendientes.includes(nombre)) return;

    if (!aceptar) {
      io.to(partida).emit('cambio-turno-cancelado');
      room.cambioTurno = null;
      return;
    }

    room.cambioTurno.pendientes = room.cambioTurno.pendientes.filter(p => p !== nombre);
    const pendientesCasas = room.cambioTurno.pendientes.map(p => room.casas[p]);

    if (room.cambioTurno.pendientes.length === 0) {
      room.turnoActual = room.cambioTurno.turno;
      room.turnoManoActual = room.cambioTurno.turno; // sincronizar ambos contadores
      io.to(partida).emit('cambio-turno-confirmado', { turno: room.turnoActual });
      io.to(partida).emit('actualizar-estado-juego', {
        npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
      room.cambioTurno = null;
    } else {
      const notificar = room.players.filter(p => !room.cambioTurno.pendientes.includes(p));
      for (const p of notificar) {
        const sid = room.playerSockets[p];
        if (sid) io.to(sid).emit('cambio-turno-esperando', { pendientes: pendientesCasas });
      }
    }
  });

  socket.on('solicitar-editar-territorios', ({ partida, nombre, territorios }) => {
    const room = rooms[partida];
    if (!room || !Array.isArray(territorios)) return;
    const pendientes = room.players.filter(p => p !== nombre);
    const casa = room.casas[nombre];

    if (pendientes.length === 0) {
      territorios.forEach(t => {
        if (room.estadoTerritorios[t]) room.estadoTerritorios[t].propietario = casa;
      });
      io.to(partida).emit('editar-territorios-confirmado', { territorios, casa });
      io.to(partida).emit('actualizar-estado-juego', {
        npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
      return;
    }

    room.cambioTerritorios = { solicitante: nombre, territorios, pendientes };
    const pendientesCasas = pendientes.map(p => room.casas[p]);
    const nuevos = territorios.filter(t => room.estadoTerritorios[t]?.propietario !== casa);
    const sidSolicitante = room.playerSockets[nombre];
    if (sidSolicitante) {
      io.to(sidSolicitante).emit('editar-territorios-esperando', { pendientes: pendientesCasas });
    }
    for (const p of pendientes) {
      const sid = room.playerSockets[p];
      if (sid) io.to(sid).emit('editar-territorios-peticion', { solicitanteCasa: casa, territorios: nuevos });
    }
  });

  socket.on('responder-editar-territorios', ({ partida, nombre, aceptar }) => {
    const room = rooms[partida];
    if (!room || !room.cambioTerritorios) return;
    if (!room.cambioTerritorios.pendientes.includes(nombre)) return;

    if (!aceptar) {
      io.to(partida).emit('editar-territorios-cancelado');
      room.cambioTerritorios = null;
      return;
    }

    room.cambioTerritorios.pendientes = room.cambioTerritorios.pendientes.filter(p => p !== nombre);
    const pendientesCasas = room.cambioTerritorios.pendientes.map(p => room.casas[p]);

    if (room.cambioTerritorios.pendientes.length === 0) {
      const { solicitante, territorios } = room.cambioTerritorios;
      const casaSolicitante = room.casas[solicitante];
      territorios.forEach(t => {
        if (room.estadoTerritorios[t]) room.estadoTerritorios[t].propietario = casaSolicitante;
      });
      io.to(partida).emit('editar-territorios-confirmado', { territorios, casa: casaSolicitante });
      io.to(partida).emit('actualizar-estado-juego', {
        npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
      room.cambioTerritorios = null;
    } else {
      const notificar = room.players.filter(p => !room.cambioTerritorios.pendientes.includes(p));
      for (const p of notificar) {
        const sid = room.playerSockets[p];
        if (sid) io.to(sid).emit('editar-territorios-esperando', { pendientes: pendientesCasas });
      }
    }
  });

  // Permite a la Mano del Rey asignarse territorios conquistados de forma
  // inmediata sin requerir confirmación del resto de jugadores
  socket.on('mano-obtener-territorios', ({ partida, nombre, territorios }) => {
    const room = rooms[partida];
    if (!room || !Array.isArray(territorios)) return;
    const casa = room.casas[nombre];
    territorios.forEach(t => {
      if (room.estadoTerritorios[t]) {
        room.estadoTerritorios[t].propietario = casa;
      }
    });
    io.to(partida).emit('editar-territorios-confirmado', { territorios, casa });
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('solicitar-fin-partida', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room) return;
    const pendientes = room.players.filter(p => p !== nombre);
    if (pendientes.length === 0) {
      io.to(partida).emit('fin-partida-confirmado');
      return;
    }
    room.finPartida = { solicitante: nombre, pendientes, aceptados: [nombre] };
    const sidSolicitante = room.playerSockets[nombre];
    if (sidSolicitante) {
      io.to(sidSolicitante).emit('fin-partida-esperando', {
        aceptados: 1,
        total: room.players.length
      });
    }
    for (const p of pendientes) {
      const sid = room.playerSockets[p];
      if (sid) io.to(sid).emit('fin-partida-peticion', { solicitanteCasa: room.casas[nombre], total: room.players.length });
    }
  });

  socket.on('responder-fin-partida', ({ partida, nombre, aceptar }) => {
    const room = rooms[partida];
    if (!room || !room.finPartida) return;
    if (!room.finPartida.pendientes.includes(nombre)) return;

    if (!aceptar) {
      io.to(partida).emit('fin-partida-cancelado');
      room.finPartida = null;
      return;
    }

    room.finPartida.pendientes = room.finPartida.pendientes.filter(p => p !== nombre);
    room.finPartida.aceptados.push(nombre);

    const aceptados = room.finPartida.aceptados.length;
    const total = room.players.length;

    if (room.finPartida.pendientes.length === 0) {
      io.to(partida).emit('fin-partida-confirmado');
      room.finPartida = null;
    } else {
      const sidSolicitante = room.playerSockets[room.finPartida.solicitante];
      if (sidSolicitante) {
        io.to(sidSolicitante).emit('fin-partida-esperando', { aceptados, total });
      }
    }
  });

  socket.on('targaryen-casarse', ({ partida, nombre, casaElegida }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Targaryen" || jugador.casadoCon) return;

  jugador.casadoCon = casaElegida;

  if (!room.jugadoresAccionTerminada.includes(nombre)) {
    room.jugadoresAccionTerminada.push(nombre);
  }

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

  const listos = room.jugadoresAccionTerminada.length;
  const total = room.players.length;

  if (listos === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual += 1;

    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual += 1;
    }

    io.to(partida).emit('avanzar-accion', {
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
    if (room.accionActual === 4) {
      iniciarConstruccionNPC(room, partida);
    }
  }
});



socket.on('targaryen-activar-alianza-sangre', ({ partida, nombre, casaElegida }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Targaryen") return;

  jugador.casamientoExtra = casaElegida;

  // 🎁 Aplicar beneficios del casamiento extra
  if (casaElegida === "Celtigar") {
    jugador.oro = (jugador.oro || 0) + 30;
  } else if (casaElegida === "Qoherys") {
    jugador.limiteReclutamientoExtra = (jugador.limiteReclutamientoExtra || 0) + 12;
  }

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});



  // Registro de una batalla
  socket.on('registrar-batalla', (data) => {
    const { partida, atacante, casaAtacante, territorioAtacado, resultado, perdidasAtacante, perdidasDefensor } = data;
    const room = rooms[partida];
    if (!room || !room.estadoTerritorios || !room.estadoJugadores) return;

    const territorio = room.estadoTerritorios[territorioAtacado];
    if (!territorio || territorio.propietario === casaAtacante) return;

    const defensorNombre = Object.keys(room.estadoJugadores).find(j => room.estadoJugadores[j].casa === territorio.propietario);

    if (room.estadoJugadores[atacante])
      room.estadoJugadores[atacante].tropas = Math.max(0, room.estadoJugadores[atacante].tropas - perdidasAtacante);

    if (defensorNombre && room.estadoJugadores[defensorNombre])
      room.estadoJugadores[defensorNombre].tropas = Math.max(0, room.estadoJugadores[defensorNombre].tropas - perdidasDefensor);

    if (resultado === 'victoria') {
      territorio.propietario = casaAtacante;
    }

    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      recursos: {
        [atacante]: room.estadoJugadores[atacante],
        [defensorNombre]: room.estadoJugadores[defensorNombre]
      }
    });
  });

    // =============================
  // CONSTRUCCIÓN DE EDIFICIOS
  // =============================
  socket.on('solicitud-construccion', ({ partida, nombre, territorio, tipoEdificio, segundaConstruccion }) => {
    const room = rooms[partida];
    if (!room) return;
  
    const jugador = room.estadoJugadores[nombre];
    const territorioObj = room.estadoTerritorios[territorio];
    if (!jugador || !territorioObj || territorioObj.propietario !== jugador.casa) return;
    if (territorioObj.asediador) {
      io.to(room.playerSockets[nombre]).emit('error-accion', 'No puedes construir en un territorio asediado.');
      return;
    }
    
  
    const COSTOS = {
      sacerdoteLuz: 20,
      sacerdoteSal: 20,
        Puerto: 30,
        Granja: 20,
        Cantera: 20,
        Mina: 20,
        Aserradero: 20,
        Castillo: 30,
        "Taller de maquinaria de asedio": 30,
        "Academia de Caballería": 20,
        Atalaya: 40,
        Armería: 30,
        Arquería: 30,
        Septo: 50,
        "Puerto Fluvial": 30,
        "Foso": 40,
        "Arquería": 30,

      };
    const costo = COSTOS[tipoEdificio] ?? 999;
  

    let descuentoCantera = 0;
for (const nombreTerritorio in room.estadoTerritorios) {
  const t = room.estadoTerritorios[nombreTerritorio];
  if (t.propietario === jugador.casa && Array.isArray(t.edificios)) {
    descuentoCantera += t.edificios.filter(e => e === "Cantera").length * 5;
  }
}
const costoFinal = Math.max(0, costo - descuentoCantera);

if (jugador.oro < costoFinal) {
  io.to(room.playerSockets[nombre]).emit('error-accion', 'Oro insuficiente para construir.');
  return;
}
jugador.oro -= costoFinal;

if (tipoEdificio === "Foso") {
  if (jugador.casa !== "Tully") return;
  if (!territorioObj.edificios.includes("Castillo")) {
    io.to(room.playerSockets[nombre]).emit('error-accion', 'Solo puedes construir un Foso donde haya un Castillo.');
    return;
  }
}

if (tipoEdificio === "Arquería") {
  if (jugador.casa !== "Tully") return;
}


if (tipoEdificio === "Puerto Fluvial") {
  if (jugador.casa !== "Tully") return;
  if (territorio !== "El Tridente") {
    io.to(room.playerSockets[nombre]).emit('error-accion', 'Solo puedes construir el Puerto Fluvial en El Tridente.');
    return;
  }
}



    territorioObj.edificios.push(tipoEdificio);
  
    // Emitir estado actualizado
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  
// Sólo marco fin de acción y avanzo si NO es la segundaConstruccion
    if (!segundaConstruccion) {
      if (!room.jugadoresAccionTerminada.includes(nombre)) {
        room.jugadoresAccionTerminada.push(nombre);
    }
    const listos = room.jugadoresAccionTerminada.length;
    const total  = room.players.length;
  
    io.to(partida).emit('estado-espera-jugadores', listos < total ? `Esperando a ${total - listos}...` : `Procesando...`);
  
    if (listos === total) {
      room.jugadoresAccionTerminada = [];
      room.accionActual += 1;
  
      if (room.accionActual > 4) {
        room.accionActual = 1;
        room.turnoActual += 1;
  
        const jugadores = room.estadoJugadores;
        const territorios = room.estadoTerritorios;
  
        for (const jugadorNombre in jugadores) {
          const j = jugadores[jugadorNombre];
          const casa = j.casa;
          let ingreso = 0;

          // Bonus por casarse con Casa Celtigar
if (j.casa === "Targaryen" && (j.casadoCon === "Celtigar" || j.casamientoExtra === "Celtigar")) {
  ingreso += 30;
}


          for (const nombreTerritorio in territorios) {
            const t = territorios[nombreTerritorio];
            if (t.propietario === casa && !t.asediador) {
              ingreso += t.oroBase || 0;
            }
          }
            // BONUS por cada mina construida en territorios del jugador
  for (const nombreTerritorio in territorios) {
    const territorio = territorios[nombreTerritorio];
    if (territorio.propietario === casa && !territorio.asediador && Array.isArray(territorio.edificios)) {
      const minas = territorio.edificios.filter(e => e === "Mina").length;
      const aserraderos = territorio.edificios.filter(e => e === "Aserradero").length;
      const canteras = territorio.edificios.filter(e => e === "Cantera").length;
      const granjas = territorio.edificios.filter(e => e === "Granja").length;
      const tienePuerto = territorio.edificios.includes("Puerto");
if (tienePuerto) {
  // Contar cuántos edificios de producción hay en todos los territorios del jugador
  let totalProduccion = 0;
  for (const otro of Object.values(territorios)) {
    if (otro.propietario === casa && Array.isArray(otro.edificios)) {
      totalProduccion += otro.edificios.filter(e =>
        ["Mina", "Cantera", "Aserradero", "Granja"].includes(e)
      ).length;
    }
  }
  ingreso += totalProduccion * 10;
}
const esGreyjoy = casa === "Greyjoy";
ingreso += minas * (esGreyjoy ? 15 : (casa === "Lannister" ? 20 : 10));
ingreso += aserraderos * (esGreyjoy ? 8 : 5);
ingreso += canteras * (esGreyjoy ? 8 : 5);
if (casa !== "Tyrell") ingreso += granjas * (esGreyjoy ? 8 : 5);
    }
}

          const barcos = j.barcos || 0;
const catapultas = j.catapulta || 0;
const torres = j.torre || 0;
const escorpiones = j.escorpion || 0;
const dragones = j.dragones || 0;

const costoTropas = (j.tropas || 0) + (j.mercenarios || 0) + (j.elite || 0) + (j.militantesFe || 0);

const costoBarcos = barcos * 2;
const costoMaquinas = catapultas + torres + escorpiones;
const costoDragones = dragones * 5;
const costoSacerdotes = j.sacerdotes || 0;
const caballeros = j.caballero || 0;
const costoCaballeros = caballeros * 1;
const costoHuargos = jugador.huargos || 0;
const costounicornios = jugador.unicornios || 0;
const costomurcielagos = jugador.murcielagos || 0;
const costoguardiareal = jugador.guardiareal || 0;
const costoBarcoLegendario = jugador.barcolegendario * 2;
const costobarcocorsario = jugador.barcocorsario * 2;
const costovenadosblancos = jugador.venadosblancos || 0;
const costomartilladores = jugador.martilladores || 0;
const costocaballerosdelarosa = jugador.caballerosdelarosa || 0;
const costoguardiadelalba = jugador.guardiadelalba || 0;
const costosacerdotizaroja = jugador.sacerdotizaroja || 0;
const costobarbaros = jugador.barbaros || 0;
const costocaballerosdelaguila= jugador.caballerosdelaguila || 0;
const costosacerdotesal = j.sacerdoteSal || 0;







j.oro += ingreso;
const oroAntes = j.oro;
const totalCost = costoTropas + costoBarcos + costoMaquinas + costoDragones + costoSacerdotes + costoCaballeros + costoHuargos + costounicornios
  + costomurcielagos + costoguardiareal + costoBarcoLegendario + costobarcocorsario + costovenadosblancos + costomartilladores + costocaballerosdelarosa
  + costoguardiadelalba + costosacerdotizaroja + costobarbaros + costocaballerosdelaguila + costosacerdotesal;
j.oro = Math.max(0, oroAntes - totalCost);
if (oroAntes < totalCost) {
  const sock = room.playerSockets[jugadorNombre];
  if (sock) io.to(sock).emit('abrir-modal-morosidad');
}


        }
      }
    }
  
  
      io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
  
      // Emitir estado actualizado ANTES de avanzar acción
      io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });

      io.to(partida).emit('avanzar-accion', {
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
      if (room.accionActual === 4) {
        iniciarConstruccionNPC(room, partida);
      }
    }
});

  // =============================
// RECLUTAMIENTO DE UNIDADES
// =============================


socket.on("rumor-desbloqueado", ({ partida, nombre, rumor }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador) return;

  jugador.rumoresDesbloqueados ||= [];
  if (!jugador.rumoresDesbloqueados.includes(rumor)) {
    jugador.rumoresDesbloqueados.push(rumor);
  }

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('stark-reclutar-huargos', ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Stark") return;

  jugador.huargos = (jugador.huargos || 0) + cantidad;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on("stark-reclutar-unicornios", ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;

   const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Stark") return;

  jugador.unicornios = (jugador.unicornios || 0) + cantidad;

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on("tully-reclutar-murcielagos", ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Tully") return;

  jugador.murcielagos = (jugador.murcielagos || 0) + cantidad;

  if (!room.estadoTerritorios["Harrenhal"].edificios.includes("Castillo")) {
  room.estadoTerritorios["Harrenhal"].edificios.push("Castillo");
}

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on("tully-reclutar-caballeros", ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Tully") return;

  jugador.caballero = (jugador.caballero || 0) + cantidad;

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on("targaryen-reclutar-guardiareal", ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Targaryen") return;

  jugador.guardiareal = (jugador.guardiareal || 0) + cantidad;

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on("greyjoy-reclutar-barcolegendario", ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Greyjoy") return;

  jugador.tropas = (jugador.tropas || 0) + cantidad;
  jugador.barcolegendario = 1;

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on("greyjoy-reclutar-tritones", ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Greyjoy") return;

  jugador.tritones = (jugador.tritones || 0) + cantidad;

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('baratheon-reclutar-venadosblancos', ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Baratheon") return;

  jugador.venadosblancos = (jugador.venadosblancos || 0) + cantidad;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('baratheon-reclutar-martilladores', ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Baratheon") return;

  jugador.martilladores = (jugador.martilladores || 0) + cantidad;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on("baratheon-reclutar-sacerdotizaroja", ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Baratheon") return;

  jugador.sacerdotizaroja = 1;
  jugador.oro -= 1;

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('tyrell-reclutar-caballerosdelarosa', ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Tyrell") return;

  jugador.caballerosdelarosa = (jugador.caballerosdelarosa || 0) + cantidad;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('martell-reclutar-guardiadelalba', ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Martell") return;

  jugador.guardiadelalba = (jugador.guardiadelalba || 0) + cantidad;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('arryn-reclutar-barbaros', ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Arryn") return;

  jugador.barbaros = (jugador.barbaros || 0) + cantidad;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('arryn-reclutar-caballerosdelaguila', ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;
  

  const costo = cantidad;
  const jugador = room.estadoJugadores[nombre];
  jugador.oro -= costo;
  if (!jugador || jugador.casa !== "Arryn") return;

  jugador.caballerosdelaguila = (jugador.caballerosdelaguila || 0) + cantidad;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('refuerzos-tully', ({ partida, nombre }) => {
  const room = rooms[partida];
  if (!room || !room.estadoJugadores?.[nombre]) return;

  const jugador = room.estadoJugadores[nombre];
  if (jugador.casa !== "Tully") return;
  if (jugador.refuerzoTullyUsadoEsteTurno) return;

  jugador.caballero = (jugador.caballero || 0) + 3;
  jugador.arquero = (jugador.arquero || 0) + 1;
  jugador.refuerzoTullyUsadoEsteTurno = true;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('arryn-ganar-caballero', ({ partida, nombre }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Arryn") return;

  jugador.caballero = (jugador.caballero || 0) + 1;

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('levas-stark', ({ partida, nombre, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.casa !== "Stark" || jugador.levasStarkUsadas) return;

  jugador.levasStarkUsadas = true;
  jugador.tropas = (jugador.tropas || 0) + cantidad;

  // Marcar acción completada
  if (!room.jugadoresAccionTerminada.includes(nombre)) {
    room.jugadoresAccionTerminada.push(nombre);
  }

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

  const total = room.players.length;
  if (room.jugadoresAccionTerminada.length === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual++;
    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual++;
    }

    io.to(partida).emit('avanzar-accion', {
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
    if (room.accionActual === 4) {
      iniciarConstruccionNPC(room, partida);
    }
  }
});

socket.on("transferencia-oro", ({ partida, nombre, casaDestino, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugadorOrigen = room.estadoJugadores[nombre];
  const jugadorDestino = Object.values(room.estadoJugadores).find(j => j.casa === casaDestino);

  if (!jugadorOrigen || !jugadorDestino) return;
  if ((jugadorOrigen.oro || 0) < cantidad) return;

  jugadorOrigen.oro -= cantidad;
  jugadorDestino.oro += cantidad;

  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on("transferencia-barcos", ({ partida, nombre, transferencias }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  if (!jugador) return;

  for (const destino of transferencias) {
    if (destino === "") continue; // barco se elimina
    const receptor = Object.values(room.estadoJugadores).find(j => j.casa === destino);
    if (receptor) receptor.barcos = (receptor.barcos || 0) + 1;
  }

  // Emitimos el estado actualizado
  io.to(partida).emit("actualizar-estado-juego", {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});

socket.on('morosidad-confirmar', ({ partida, nombre, perdidas, territorios }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  if (!jugador) return;

  if (perdidas && typeof perdidas === 'object') {
    for (const key in perdidas) {
      const val = parseInt(perdidas[key]) || 0;
      if (jugador.hasOwnProperty(key)) {
        jugador[key] = Math.max(0, jugador[key] - val);
      }
    }
  }

  if (Array.isArray(territorios)) {
    territorios.forEach(t => {
      const terr = room.estadoTerritorios[t];
      if (terr && terr.propietario === jugador.casa) {
        terr.propietario = "Nadie";
      }
    });
  }

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});


socket.on('reclutamiento-multiple', ({ partida, nombre, territorio, unidades, reclutarNorte }) => {

  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  const territorioObj = room.estadoTerritorios[territorio];
  if (!jugador || !territorioObj || territorioObj.propietario !== jugador.casa) return;

  const COSTOS = {
    soldado: 4,
    mercenario: jugador.casa === "Martell" ? 5 : 8,
    elite: jugador.casa === "Martell" ? 9 : 15,
    barco: 20,
    barcocorsario: 25,
    catapulta: 20,
    escorpion: 20,
    torre: 20,
    sacerdoteLuz: 20,
    sacerdoteSal:20,
    caballero: 10,
    soldadoBlindado: 10,
    armadura: 6,
    arquero: 6,
  };

  let descuento = 0;
  for (const t of Object.values(room.estadoTerritorios)) {
    if (t.propietario === jugador.casa && Array.isArray(t.edificios)) {
      descuento += t.edificios.filter(e => e === "Aserradero").length * 5;
    }
  }

  let totalCosto = 0;

  for (const tipo in unidades) {
  const cantidad = unidades[tipo] ?? 0;
  let precioUnitario = COSTOS[tipo] ?? 999;

  if (tipo === "soldado") {
    let descuentoGranja = 0;
    for (const t of Object.values(room.estadoTerritorios)) {
      if (t.propietario === jugador.casa && Array.isArray(t.edificios)) {
        descuentoGranja += t.edificios.filter(e => e === "Granja").length;
      }
    }
    precioUnitario = Math.max(0, precioUnitario - descuentoGranja);
  }

  if (tipo === "barco" || tipo === "barcocorsario") {
    let base = COSTOS[tipo];

    // Descuento por rumor Greyjoy
    if (jugador.casa === "Greyjoy" && jugador.rumoresDesbloqueados?.includes("Madera del Abismo")) {
      base -= 10;
    }

    // Descuento por aserraderos (global)
    precioUnitario = Math.max(0, base - descuento);
  } else if (["catapulta", "torre", "escorpion"].includes(tipo)) {
    precioUnitario = Math.max(0, precioUnitario - descuento);
  }

  totalCosto += cantidad * precioUnitario;
}



  if (jugador.oro < totalCosto) {
    io.to(room.playerSockets[nombre]).emit('error-accion', 'Oro insuficiente para reclutar.');
    return;
  }

  jugador.oro -= totalCosto;

  for (const tipo in unidades) {
    const cantidad = unidades[tipo];
    if (!cantidad || cantidad <= 0) continue;

    if (tipo === 'soldado') jugador.tropas += cantidad;
    else if (tipo === 'mercenario') jugador.mercenarios += cantidad;
    else if (tipo === 'elite') jugador.elite += cantidad;
    else if (tipo === 'barco') jugador.barcos += cantidad;
     else if (tipo === 'barcocorsario') jugador.barcocorsario += cantidad;
    else if (tipo === 'catapulta' || tipo === 'torre' || tipo === 'escorpion') jugador[tipo] += cantidad;
    else if (tipo === 'soldadoBlindado') jugador.tropasBlindadas += cantidad;
    else if (tipo === 'armadura') {
      if (jugador.tropas >= cantidad) {
        jugador.tropas -= cantidad;
        jugador.tropasBlindadas += cantidad;
      }
    } else if (tipo === 'arquero') {
    jugador.arquero = (jugador.arquero || 0) + cantidad;
  }
  
    else if (tipo === 'sacerdoteLuz') jugador.sacerdotes += cantidad;
    else if (tipo === 'sacerdoteSal') jugador.sacerdoteSal += cantidad;
    else if (tipo === 'caballero') jugador.caballero += cantidad;
  }

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

  if (reclutarNorte) {
  // No avanzar acción global, solo actualizamos el estado y salimos
  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
  return;
}


  if (!room.jugadoresAccionTerminada.includes(nombre)) {
    room.jugadoresAccionTerminada.push(nombre);
  }

  const listos = room.jugadoresAccionTerminada.length;
  const total = room.players.length;

  io.to(partida).emit('estado-espera-jugadores', listos < total ? `Esperando a ${total - listos}...` : `Procesando...`);

  if (listos === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual += 1;

    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual += 1;
    }

    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });

    io.to(partida).emit('avanzar-accion', {
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
    if (room.accionActual === 4) {
      iniciarConstruccionNPC(room, partida);
    }
  }
});


  // Cuando un jugador termina su acción
  socket.on('accion-terminada', ({ partida, nombre, ignorarAsedio }) => {
    const room = rooms[partida];
    if (!room || !room.players.includes(nombre)) return;

    if (!room.jugadoresAccionTerminada) room.jugadoresAccionTerminada = [];
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
      const listos = room.jugadoresAccionTerminada.length;
      const total = room.players.length;

      if (!ignorarAsedio) {
        const jugador = room.estadoJugadores[nombre];
        if (jugador) {
          const tieneAsedio = Object.values(room.estadoTerritorios)
            .some(t => t.propietario === jugador.casa && t.asediador);
          if (tieneAsedio) {
            const sid = room.playerSockets[nombre];
            if (sid) {
              io.to(sid).emit('abrir-modal-perdidas-asedio', {
                jugador: nombre,
                datosJugador: jugador,
                mostrarCastillo: true,
                territorio: null
              });
            }
          }

          // Si el jugador está asediando un castillo sin jugador defensor,
          // mostrarle directamente el modal para comprobar si está vacío.
          const territorioNPC = Object.values(room.estadoTerritorios)
            .find(t => t.asediador === jugador.casa &&
              !Object.values(room.estadoJugadores)
                .some(j => j.casa === t.propietario));
          if (territorioNPC) {
            const sid = room.playerSockets[nombre];
            if (sid) {
              io.to(sid).emit('abrir-modal-castillo-vacio', { territorio: territorioNPC.nombre });
            }
          }
        }
      }

      io.to(partida).emit('estado-espera-jugadores', listos < total ? `Esperando a ${total - listos}...` : `Procesando...`);

      if (listos === total) {
        // Todos terminaron su acción, se avanza al siguiente paso
        room.jugadoresAccionTerminada = [];
        room.accionActual += 1;
      
        // Si se acaba de terminar la acción 4 (fase neutral), avanzamos de turno
        if (room.accionActual > 4) {
          torneoUsadoEsteTurno = false;
          refuerzoTullyUsadoEsteTurno = false;
          room.accionActual = 1;
          room.turnoActual += 1;

          // FASE DE RECAUDACIÓN Y MANTENIMIENTO
          const jugadores = room.estadoJugadores;
          const territorios = room.estadoTerritorios;
          
          // 1. Calcular ingreso de cada jugador
          for (const jugadorNombre in jugadores) {
            const jugador = jugadores[jugadorNombre];
            const casa = jugador.casa;

            
            
            let ingreso = 0;


              // BONUS por aduanas si es Tully
              if (casa === "Tully") {
                ingreso += 20;
              }




            for (const nombreTerritorio in territorios) {
                const territorio = territorios[nombreTerritorio];
                if (territorio.propietario === casa && !territorio.asediador) {
                    ingreso += territorio.oroBase || 0;
                }
            }

            // Bonus Martell por Puerto inicial en Lanza del Sol
if (casa === "Martell") {
  const puertoInicial = territorios["Lanza del Sol"];
  if (puertoInicial && puertoInicial.propietario === "Martell" && puertoInicial.edificios.includes("Puerto")) {
    ingreso += 10;
  }
}


              // BONUS por cada mina construida en territorios del jugador
  for (const nombreTerritorio in territorios) {
    const territorio = territorios[nombreTerritorio];
    if (territorio.propietario === casa && !territorio.asediador && Array.isArray(territorio.edificios)) {
      const minas = territorio.edificios.filter(e => e === "Mina").length;
      const aserraderos = territorio.edificios.filter(e => e === "Aserradero").length;
      const canteras = territorio.edificios.filter(e => e === "Cantera").length;
      const granjas = territorio.edificios.filter(e => e === "Granja").length;
      const tienePuerto = territorio.edificios.includes("Puerto");
if (tienePuerto) {
  // Contar cuántos edificios de producción hay en todos los territorios del jugador
  let totalProduccion = 0;
  for (const otro of Object.values(territorios)) {
    if (otro.propietario === casa && Array.isArray(otro.edificios)) {
      totalProduccion += otro.edificios.filter(e =>
        ["Mina", "Cantera", "Aserradero", "Granja"].includes(e)
      ).length;
    }
  }
  const oroPorEdificio = casa === "Martell" ? 15 : 10;
  ingreso += totalProduccion * oroPorEdificio;
}
const esGreyjoy = casa === "Greyjoy";
ingreso += minas * (esGreyjoy ? 15 : (casa === "Lannister" ? 20 : 10));

ingreso += aserraderos * (esGreyjoy ? 8 : 5);
ingreso += canteras * (esGreyjoy ? 8 : 5);
      if (casa === "Tully") {
        ingreso += granjas * 10;
      } else if (casa !== "Tyrell") ingreso += granjas * (esGreyjoy ? 8 : 5);
      
    }
}

            // 2. Sumar el ingreso
            jugador.oro += ingreso;
            // 3. Restar mantenimiento por tropas (1 oro por cada tropa)
            const catapultas = jugador.catapulta || 0;
            const torres = jugador.torre || 0;
            const escorpiones = jugador.escorpion || 0;
            const costoMaquinas = catapultas * 1 + torres * 1 + escorpiones * 1; // o el coste de mantenimiento que quieras

            const costoTropas = (jugador.tropas || 0) + (jugador.mercenarios || 0) + (jugador.elite || 0) + (jugador.militantesFe || 0);

            const barcos = jugador.barcos || 0;
            const costoBarcos = barcos * 2;
            const dragones = jugador.dragones || 0;
            const costoDragones = dragones * 5;
            const costoSacerdotes = jugador.sacerdotes || 0;
            const caballeros = jugador.caballero || 0;
const costoCaballeros = caballeros * 1;
const costosacerdotesal = jugador.sacerdoteSal || 0;


            const oroPrevio = jugador.oro;
            const totalCost = costoTropas + costoBarcos + costoMaquinas + costoDragones + costoSacerdotes + costosacerdotesal;
            jugador.oro = Math.max(0, oroPrevio - totalCost);
            if (oroPrevio < totalCost) {
              const sock = room.playerSockets[jugadorNombre];
              if (sock) io.to(sock).emit('abrir-modal-morosidad');
            }


            // Si el jugador es Tyrell y tiene un Septo, lanzar el modal
if (casa === "Tyrell") {
  const tieneSepto = Object.values(territorios).some(
    t => t.propietario === casa && t.edificios.includes("Septo")
  );

  if (tieneSepto) {
    io.to(room.playerSockets[jugadorNombre]).emit("abrir-modal-militantes-fe");
  }
}


        }
        

      
          io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
            territorios: room.estadoTerritorios,
            jugadores: room.estadoJugadores,
            turno: room.turnoActual,
            accion: room.accionActual
          });
        }
      
        io.to(partida).emit('avanzar-accion', {
            turno: room.turnoActual,
            accion: room.accionActual,
            fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
          });
        if (room.accionActual === 4) {
          iniciarConstruccionNPC(room, partida);
        }

      }
      
    }
  });

  socket.on("confirmar-militantes-fe", ({ partida, nombre, cantidad }) => {
    const room = rooms[partida];
    if (!room || !room.estadoJugadores?.[nombre]) return;
  
    const jugador = room.estadoJugadores[nombre];
    if (jugador.casa !== "Tyrell") return;
  
    jugador.militantesFe = (jugador.militantesFe || 0) + cantidad;
  
    io.to(room.playerSockets[nombre]).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });
  

  socket.on('doble-impuestos-completo', ({ partida, nombre, perdidas }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  if (!jugador || jugador.dobleImpuestosUsado) return;

  // Restar las unidades perdidas
  for (const key in perdidas) {
    if (jugador.hasOwnProperty(key)) {
      jugador[key] = Math.max(0, jugador[key] - perdidas[key]);
    }
  }

  // Calcular el oro total a recibir
  let ingreso = 0;
  for (const nombreTerritorio in room.estadoTerritorios) {
    const territorio = room.estadoTerritorios[nombreTerritorio];
    if (territorio.propietario === jugador.casa && !territorio.asediador) {
      ingreso += territorio.oroBase || 0;

      const minas = territorio.edificios.filter(e => e === "Mina").length;
      const aserraderos = territorio.edificios.filter(e => e === "Aserradero").length;
      const canteras = territorio.edificios.filter(e => e === "Cantera").length;
      const granjas = territorio.edificios.filter(e => e === "Granja").length;

      ingreso += minas * 20; // Lannister
      ingreso += aserraderos * 5;
      ingreso += canteras * 5;
      ingreso += granjas * 5;
    }
  }

  // Verificamos si algún territorio tiene puerto para añadir el bono
  const tienePuerto = Object.values(room.estadoTerritorios).some(
    t => t.propietario === jugador.casa && t.edificios.includes("Puerto")
  );

  if (tienePuerto) {
    let totalProd = 0;
    for (const otro of Object.values(room.estadoTerritorios)) {
      if (otro.propietario === jugador.casa && Array.isArray(otro.edificios)) {
        totalProd += otro.edificios.filter(e =>
          ["Mina", "Cantera", "Aserradero", "Granja"].includes(e)
        ).length;
      }
    }
    ingreso += totalProd * 10;
  }

  // Si tiene el rumor "Cetro del León", se multiplica todo el ingreso
  const tieneCetro = jugador.rumoresDesbloqueados?.includes("Cetro del León");
const ingresoFinal = ingreso * 2; // SIEMPRE se multiplica por 2
if (tieneCetro) {
  console.log("Cetro del León activado: ingresos completos multiplicados.");
} else {
  console.log("MARICO TERRITORIOS X 2");
}


  jugador.oro += ingresoFinal;
  jugador.dobleImpuestosUsado = true;

  // Avanza acción
  if (!room.jugadoresAccionTerminada.includes(nombre)) {
    room.jugadoresAccionTerminada.push(nombre);
  }

  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

  const total = room.players.length;
  if (room.jugadoresAccionTerminada.length === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual += 1;
    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual += 1;
    }

    io.to(partida).emit('avanzar-accion', {
      turno: room.turnoActual,
      accion: room.accionActual,
      fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
    });
    if (room.accionActual === 4) {
      iniciarConstruccionNPC(room, partida);
    }
  }
});




  socket.on('defensor-soborno-perdidas', ({ partida, nombre, perdidas }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores[nombre];
    if (!jugador) return;
  
    jugador.tropas = Math.max(0, jugador.tropas - perdidas);
  
    io.to(room.playerSockets[nombre]).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });
  

  socket.on('lannister-soborno-final', ({ partida, nombre, perdidas, gano }) => {
    const room = rooms[partida];
    if (!room || !room.sobornoEnCurso) return;
  
    const jugador = room.estadoJugadores[nombre];
    if (!jugador || jugador.casa !== "Lannister") return;
  
    const territorio = room.sobornoEnCurso.territorio;
    const defensor = room.sobornoEnCurso.defensor;
    const t = room.estadoTerritorios[territorio];
  
    jugador.tropas = Math.max(0, jugador.tropas - perdidas);
  
    if (gano && t) {
      t.propietario = "Lannister";
    }
  
    // Borramos info temporal
    delete room.sobornoEnCurso;
  
    io.to(room.playerSockets[nombre]).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
    
    if (defensor && room.playerSockets[defensor]) {
      io.to(room.playerSockets[defensor]).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
    }

    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
    }
    
    const listos = room.jugadoresAccionTerminada.length;
    const totalJugadores = room.players.length;
    
    io.to(partida).emit(
      'estado-espera-jugadores',
      listos < totalJugadores ? `Esperando a ${totalJugadores - listos}...` : `Procesando...`
    );
    
    if (listos === totalJugadores) {
      room.jugadoresAccionTerminada = [];
      room.accionActual += 1;
    
      if (room.accionActual > 4) {
        room.accionActual = 1;
        room.turnoActual += 1;
      }
    
      io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
    
      io.to(partida).emit('avanzar-accion', {
        turno: room.turnoActual,
        accion: room.accionActual,
        fase: room.accionActual === 4 ? 'Neutral' : 'Accion'
      });
      if (room.accionActual === 4) {
        iniciarConstruccionNPC(room, partida);
      }
    }


  });
  
  
  socket.on('lannister-soborno-inicial', ({ partida, nombre, territorio, cantidad }) => {
    const room = rooms[partida];
    if (!room) return;
  
    const jugador = room.estadoJugadores[nombre];
    if (!jugador || jugador.casa !== "Lannister") return;
  
    const t = room.estadoTerritorios[territorio];
    if (!t || !t.propietario || t.propietario === "Lannister") return;
  
    const casaDefensora = t.propietario;
    const rival = Object.entries(room.estadoJugadores).find(([k, v]) => v.casa === casaDefensora);
  
    jugador.tropas += cantidad;
    const costoPorSoldado = 4; // Costo base de reclutar un soldado
const costoSoborno = costoPorSoldado * 2; // Doble del costo de reclutamiento
jugador.oro = Math.max(0, jugador.oro - cantidad * costoSoborno);

  
    if (rival) {
      const [nombreRival, jugadorRival] = rival;
      jugadorRival.tropas = Math.max(0, jugadorRival.tropas - cantidad);
  
      room.sobornoEnCurso = { territorio, defensor: nombreRival };
  
      io.to(room.playerSockets[nombre]).emit('abrir-modal-soborno-lannister-final', { territorio });
      io.to(room.playerSockets[nombreRival]).emit('abrir-modal-soborno-rival', { territorio, cantidad });
    } else {
      // No hay jugador que controle el territorio (es un NPC)
      room.sobornoEnCurso = { territorio, defensor: null };
      io.to(room.playerSockets[nombre]).emit('abrir-modal-soborno-lannister-final', { territorio });
    }
  
    io.to(room.playerSockets[nombre]).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });
  
  
  
  
  socket.on('lannister-sobornar-soldados', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores[nombre];
    if (!jugador || jugador.casa !== "Lannister") return;
  
    jugador.tropas += 5; // Ajusta cantidad como quieras
    jugador.oro = Math.max(0, jugador.oro - 20); // Cuesta 20 de oro
  
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });
  

  // Tras procesar 'recompensa-asedio'
socket.on('recompensa-asedio', ({ partida, nombre, tipo }) => {
  const room = rooms[partida];
  if (!room) return;
  const jugador = room.estadoJugadores[nombre];
  jugador[tipo] = (jugador[tipo] || 0) + 1;
  // Emitimos estado completo
  io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
    territorios: room.estadoTerritorios,
    jugadores:  room.estadoJugadores,
    turno:      room.turnoActual,
    accion:     room.accionActual
  });
});

  // Marcar o actualizar un asedio en un territorio
  socket.on('marcar-asedio', ({ partida, territorio, asediador }) => {
    const room = rooms[partida];
    if (!room) return;
    if (room.estadoTerritorios[territorio]) {
      room.estadoTerritorios[territorio].asediador = asediador;
      const propietario = room.estadoTerritorios[territorio].propietario;
      const defensorEntry = Object.entries(room.estadoJugadores)
        .find(([_, j]) => j.casa === propietario);
      if (defensorEntry) {
        const [nombreDef, datosDef] = defensorEntry;
        const sid = room.playerSockets[nombreDef];
        if (sid) {
          io.to(sid).emit('abrir-modal-perdidas-asedio', {
            jugador: nombreDef,
            datosJugador: datosDef,
            mostrarCastillo: true,
            territorio
          });
        }
      }
    }
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  // Finalizar un asedio existente sin consumir acción
  socket.on('terminar-asedio', ({ partida, territorio, nuevoPropietario }) => {
    const room = rooms[partida];
    if (!room) return;

    const t = room.estadoTerritorios[territorio];
    if (!t) return;

    t.asediador = null;
    if (nuevoPropietario) {
      if (nuevoPropietario === 'Nadie') {
        t.propietario = null;
      } else {
        t.propietario = nuevoPropietario;
      }
    }

    // Preguntar pérdidas de asedio a todos los jugadores
    for (const [nombreJ, sid] of Object.entries(room.playerSockets)) {
      const datosJ = room.estadoJugadores[nombreJ];
      if (sid && datosJ) {
        io.to(sid).emit('abrir-modal-perdidas-asedio', {
          jugador: nombreJ,
          datosJugador: datosJ,
          mostrarCastillo: false,
          territorio: null
        });
      }
    }

    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('perdidas-asedio', ({ partida, nombre, perdidas }) => {
    const room = rooms[partida];
    if (!room) return;
    const jugador = room.estadoJugadores[nombre];
    if (!jugador) return;
    for (const key in perdidas) {
      const val = parseInt(perdidas[key]) || 0;
      if (jugador.hasOwnProperty(key)) {
        jugador[key] = Math.max(0, jugador[key] - val);
      }
    }
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('asedio-castillo-vacio', ({ partida, nombre, territorio }) => {
    const room = rooms[partida];
    if (!room) return;

    const jugador = room.estadoJugadores[nombre];
    if (!jugador) return;
    const casaJugador = jugador.casa;

    if (territorio) {
      const terr = room.estadoTerritorios[territorio];
      if (terr && terr.asediador && (terr.asediador === casaJugador || terr.propietario === casaJugador)) {
        terr.propietario = terr.asediador;
        terr.asediador = null;
      }
    } else {
      for (const terr of Object.values(room.estadoTerritorios)) {
        if (terr.asediador === casaJugador &&
            !Object.values(room.estadoJugadores).some(j => j.casa === terr.propietario)) {
          terr.propietario = casaJugador;
          terr.asediador = null;
        }
      }
    }

    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  // ───── Construcciones de NPC ─────
  socket.on('npc-construccion-agregar', ({ partida, nombre, territorio, edificio }) => {
    const room = rooms[partida];
    if (!room || room.npcBuilder !== nombre) return;
    if (!room.estadoTerritorios[territorio]) return;
    room.estadoTerritorios[territorio].edificios.push(edificio);
    io.to(partida).emit('actualizar-estado-juego', {
    npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('npc-construccion-finalizar', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room || room.npcBuilder !== nombre) return;
    room.npcBuilder = null;
    io.to(partida).emit('npc-construccion-finalizada');
  });

  // ───── Mano del Rey: Gestionar edificios por territorio ─────
  socket.on('mano-agregar-edificio', ({ partida, nombre, territorio, edificio }) => {
    const room = rooms[partida];
    if (!room) return;
    const t = room.estadoTerritorios[territorio];
    const jugador = room.estadoJugadores?.[nombre];
    if (!t || !jugador || t.propietario !== jugador.casa) return;
    if (!Array.isArray(t.edificios)) t.edificios = [];
    t.edificios.push(edificio);
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('mano-quitar-edificio', ({ partida, nombre, territorio, edificio }) => {
    const room = rooms[partida];
    if (!room) return;
    const t = room.estadoTerritorios[territorio];
    const jugador = room.estadoJugadores?.[nombre];
    if (!t || !jugador || t.propietario !== jugador.casa) return;
    if (!Array.isArray(t.edificios)) t.edificios = [];
    const idx = t.edificios.indexOf(edificio);
    if (idx !== -1) t.edificios.splice(idx, 1);
    io.to(partida).emit('actualizar-estado-juego', {
      npcBuilder: room.npcBuilder,
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  

  // Cuando un jugador se desconecta
  // index.js (servidor)
socket.on('disconnect', async (reason) => {
  console.log(`Desconectado: ${socket.id} (${reason})`);

  for (const partidaId of Object.keys(rooms)) {
    const room = rooms[partidaId];
    const nombreSaliente = Object.entries(room.playerSockets)
      .find(([jug, sid]) => sid === socket.id)?.[0];
    if (!nombreSaliente) continue;

    if (nombreSaliente === room.host) {
      // Host  
      if (!room.started) {
        io.to(partidaId).emit('partida-cerrada');
          // Borra de la BD
          try {
            await db.query(
              'DELETE FROM `Partidas` WHERE `nombre` = ?',
              [partidaId]
            );
            console.log(`Registro de partida '${partidaId}' eliminado de la BD`);
          } catch (err) {
            console.error(`Error eliminando partida '${partidaId}' de la BD:`, err);
          }
          delete rooms[partidaId];
          console.log(`[Lobby] Host salió, partida '${partidaId}' eliminada.`);
      } else {
        io.to(partidaId).emit('host-desconectado');
        console.log(`[Juego] Host desconectado en '${partidaId}', la partida continúa.`);
        delete room.playerSockets[nombreSaliente];
        if (Object.keys(room.playerSockets).length === 0) {
          programarEliminacion(partidaId);
        }
      }
    } else {
      // Jugador normal
      if (!room.started) {
        // Antes de empezar: lo quitamos completamente
        room.players = room.players.filter(j => j !== nombreSaliente);
        delete room.playerSockets[nombreSaliente];
        delete room.casas[nombreSaliente];
        io.to(partidaId).emit('jugadores-actualizados', room.players);
        io.to(partidaId).emit('casas-actualizadas',  room.casas);
        console.log(`[Lobby] Jugador '${nombreSaliente}' salió de '${partidaId}'.`);
      } else {
        // Durante el juego: solo borramos el socket, para permitir reconexión
        delete room.playerSockets[nombreSaliente];
        console.log(`[Juego] Jugador '${nombreSaliente}' perdió conexión, esperando reconexión.`);
      }

      if (!room.started && room.players.length === 0) {
        programarEliminacion(partidaId);
      } else if (room.started && Object.keys(room.playerSockets).length === 0) {
        programarEliminacion(partidaId);
      }
    }

    break; // un socket solo pertenece a una sala
  }
});


});

// Arrancamos el servidor en el puerto 3000 o el que esté en las variables de entorno
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor backend funcionando en http://localhost:${PORT}`);
});

