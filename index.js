// Importamos los módulos necesarios
const express = require('express'); // Framework web para Node.js
const http = require('http'); // Para crear el servidor HTTP
const { Server } = require('socket.io'); // Para comunicación en tiempo real
const cors = require('cors'); // Permitir conexiones entre dominios diferentes (frontend y backend)

// Creamos la aplicación Express
const app = express();
app.use(cors()); // Permitimos cualquier origen (útil en desarrollo)

// Creamos el servidor HTTP y lo conectamos con socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // Aceptamos conexiones desde cualquier sitio (desarrollo)
});

// Diccionario donde guardaremos todas las partidas creadas
const rooms = {};

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
  
const ORO_INICIAL_POR_DEFECTO = 0;
const TROPAS_INICIALES_POR_DEFECTO = 0;


// Función que genera el estado inicial de los territorios al comenzar la partida
function inicializarEstadoTerritorios() {
    const CAPITALES = [
        "Invernalia", "Aguasdulces", "Nido de Águilas", "Roca Casterly",
        "Altojardín", "Desembarco del Rey", "Bastión de Tormentas", "Lanza del Sol", "Pyke"
    ];

    const estadoTerritorios = {};
    TERRITORIOS_BASE.forEach(t => {
        estadoTerritorios[t.nombre] = {
    nombre: t.nombre,
    propietario: t.propietarioInicial,
    oroBase: t.oro,
    edificios: (() => {
      if (CAPITALES.includes(t.nombre)) {
        if (t.nombre === "Lanza del Sol" || t.nombre === "Pyke") {
            return ["Castillo", "Puerto"];
        }
        return ["Castillo"];
    }
        return [];
    })(),
    tropas: {}
};

    });
    return estadoTerritorios;
}


const BARCOS_INICIALES = {
  Greyjoy: 4,
  Stark: 2,
  Arryn: 1,
  Targaryen: 2,
  Baratheon: 2,
  Martell: 1,
  Tyrell: 2,
  Lannister: 1,
  Tully: 0
};

  

// Función que asigna a cada jugador su casa, oro y tropas al iniciar
function inicializarEstadoJugadores(players, casasAsignadas) {
  const estadoJugadores = {};
  players.forEach(nombre => {
    estadoJugadores[nombre] = {
  sacerdotes: casasAsignadas[nombre] === "Baratheon" ? 1 : 0,
  dragones: casasAsignadas[nombre] === "Targaryen" ? 1 : 0,
  casa: casasAsignadas[nombre] || 'Desconocida',
  tropas: TROPAS_INICIALES_POR_DEFECTO, // soldado
  mercenarios: 0,
  elite: 0,
  oro: ORO_INICIAL_POR_DEFECTO,
  barcos: BARCOS_INICIALES[casasAsignadas[nombre]] || 0,
  catapulta: 0,
  torre: 0,
  escorpion: 0
};

  });
  return estadoJugadores;
}

// Cuando un cliente se conecta por socket
io.on('connection', (socket) => {
  console.log(`🔌 Connect: ${socket.id}`);

  socket.on("tyrell-inicial-completo", ({ partida, nombre, territorio, oro, tropas }) => {
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
  let ingreso = 0;
  for (const terr of Object.values(room.estadoTerritorios)) {
    if (terr.propietario === "Tyrell") {
      ingreso += terr.oroBase || 0;
      ingreso += (terr.edificios.filter(e => e === "Mina").length) * 10;
      ingreso += (terr.edificios.filter(e => e === "Cantera").length) * 5;
      if (jugador.casa !== "Tyrell") {
      ingreso += (terr.edificios.filter(e => e === "Granja").length) * 5;
    }
      ingreso += (terr.edificios.filter(e => e === "Aserradero").length) * 5;
    }
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


  // Emitir estado actualizado
  io.to(partida).emit("actualizar-estado-juego", {
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
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });
});


  socket.on('actualizar-perdidas-neutral', ({ partida, nombre, perdidas, territoriosPerdidos, nuevoPropietarioPorTerritorio }) => {

    const room = rooms[partida];
    if (!room) return;
  
    const jugador = room.estadoJugadores[nombre];
    if (!jugador) return;
  
    jugador.tropas = Math.max(0, jugador.tropas - perdidas);
  
    if (territoriosPerdidos && typeof nuevoPropietarioPorTerritorio === "object") {
      territoriosPerdidos.forEach(nombreTerritorio => {
        const territorio = room.estadoTerritorios[nombreTerritorio];
        const nuevo = nuevoPropietarioPorTerritorio[nombreTerritorio];
        if (territorio && territorio.propietario === jugador.casa && nuevo) {
          territorio.propietario = nuevo;
        }
      });
    }
    
  
    io.to(partida).emit('actualizar-estado-juego', {
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
  
    io.to(partida).emit('estado-espera-jugadores', listos < total ? `⌛ Esperando a ${total - listos}...` : `✅ Procesando...`);
  
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
          for (const nombreTerritorio in territorios) {
            const t = territorios[nombreTerritorio];
            if (t.propietario === casa) {
              ingreso += t.oroBase || 0;
            }
          }
            // 🔨 BONUS por cada mina construida en territorios del jugador
  for (const nombreTerritorio in territorios) {
    const territorio = territorios[nombreTerritorio];
    if (territorio.propietario === casa && Array.isArray(territorio.edificios)) {
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
        ingreso += minas * 10;
        ingreso += aserraderos * 5;
        ingreso += canteras * 5;
        if (casa !== "Tyrell") {
  ingreso += granjas * 5;
}
      }
    }

          const barcos = j.barcos || 0;
const catapultas = j.catapulta || 0;
const torres = j.torre || 0;
const escorpiones = j.escorpion || 0;
const dragones = j.dragones || 0;

const costoBarcos = barcos * 2;
const costoTropas = (j.tropas || 0) + (j.mercenarios || 0) + (j.elite || 0);
const costoMaquinas = catapultas + torres + escorpiones;
const costoDragones = dragones * 5;
const costoSacerdotes = j.sacerdotes || 0;
const caballeros = j.caballero || 0;
const costoCaballeros = caballeros * 1;




j.oro += ingreso;
j.oro = Math.max(0, j.oro - costoTropas - costoBarcos - costoMaquinas - costoDragones - costoSacerdotes - costoCaballeros);




        }
      }
  
      io.to(partida).emit('actualizar-estado-juego', {
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
    }
  });
  

  socket.on('actualizar-iniciales', ({ partida, nombre, oro, tropas }) => {
    const room = rooms[partida];
    if (!room || !room.estadoJugadores || !room.estadoJugadores[nombre]) return;
  
    room.estadoJugadores[nombre].oro = oro;
    room.estadoJugadores[nombre].tropas = tropas;
  
    // Opcional: mandar estado actualizado de ese jugador
    io.to(partida).emit('actualizar-estado-juego', {
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });

  socket.on('confirmar-iniciales-turno1', ({ partida, nombre, tropas, oroExtra }) => {
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
      if (territorio.propietario === casa) {
        ingreso += territorio.oroBase || 0;
  
        const minas = territorio.edificios.filter(e => e === "Mina").length;
        const aserraderos = territorio.edificios.filter(e => e === "Aserradero").length;
        const canteras = territorio.edificios.filter(e => e === "Cantera").length;
        const granjas = territorio.edificios.filter(e => e === "Granja").length;
  
        ingreso += minas * 10;
        ingreso += aserraderos * 5;
        ingreso += canteras * 5;
        if (casa !== "Tyrell") {
  ingreso += granjas * 5;
}
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
      ingreso += totalProd * 10;
    }
  
    // Sumar oro extra ingresado por el jugador
    ingreso += oroExtra;
  
    // Restar mantenimiento
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

  
    io.to(partida).emit('actualizar-estado-juego', {
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });

  const listos = room.jugadoresAccionTerminada.length;
  const total = room.players.length;

  io.to(partida).emit(
    'estado-espera-jugadores',
    listos < total ? `⌛ Esperando a ${total - listos}...` : `✅ Procesando...`
  );

  if (listos === total) {
    room.jugadoresAccionTerminada = [];
    room.accionActual += 1;

    if (room.accionActual > 4) {
      room.accionActual = 1;
      room.turnoActual += 1;
    }

    io.to(partida).emit('actualizar-estado-juego', {
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
  }

  });
  
  

  // Crear una nueva partida
  socket.on('crear-partida', ({ partida, clave }) => {
    if (rooms[partida]) return; // Si ya existe, no se crea otra vez
    rooms[partida] = {
      password: clave,
      players: [],
      casas: {},
      playerSockets: {}
    };
    console.log(`[Lobby] Partida '${partida}' creada.`);
  });

  // Unirse a una partida ya existente
  socket.on('unirse-partida', ({ nombre, partida, clave }) => {
    if (!rooms[partida]) {
      // Si no existe, la crea al vuelo
      rooms[partida] = {
        password: clave,
        players: [],
        casas: {},
        playerSockets: {}
      };
    }

    const room = rooms[partida];
    if (!room.players.includes(nombre)) room.players.push(nombre);
    room.playerSockets[nombre] = socket.id;

    socket.join(partida); // Une al cliente a esa sala de socket
    console.log(`[Lobby] ${nombre} se unió a ${partida}`);

    // Le mandamos al jugador el estado inicial del lobby
    socket.emit('casas-actualizadas', room.casas);
    socket.emit('jugadores-actualizados', room.players);

    // Avisamos a todos los jugadores del lobby del nuevo jugador
    io.to(partida).emit('jugadores-actualizados', room.players);
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

  
  

  // El host inicia el juego
  socket.on('iniciar-juego', ({ partida }) => {
    const room = rooms[partida];
    if (!room) return;

    // Inicializamos estado de juego
    room.estadoTerritorios = inicializarEstadoTerritorios();
    room.estadoJugadores = inicializarEstadoJugadores(room.players, room.casas);
    room.turnoActual = 1;
    room.accionActual = 1;
    room.jugadoresAccionTerminada = [];

    console.log(`[Juego] Juego iniciado en ${partida}`);
    io.to(partida).emit('juego-iniciado', { ok: true });
  });

  // Un jugador entra a juego.html (sala de juego)
  socket.on('unirse-sala-juego', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (room && room.players.includes(nombre)) {
      socket.join(partida);
      console.log(`[Juego] ${nombre} se conectó a la sala de ${partida}`);
      socket.emit('actualizar-estado-juego', {
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });      
    }
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
  socket.on('solicitud-construccion', ({ partida, nombre, territorio, tipoEdificio }) => {
    const room = rooms[partida];
    if (!room) return;
  
    const jugador = room.estadoJugadores[nombre];
    const territorioObj = room.estadoTerritorios[territorio];
    if (!jugador || !territorioObj || territorioObj.propietario !== jugador.casa) return;
    
  
    const COSTOS = {
      sacerdoteLuz: 20,
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
        caballero: 10
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

    territorioObj.edificios.push(tipoEdificio);
  
    // Emitir estado actualizado
    io.to(partida).emit('actualizar-estado-juego', {
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  
    // Marcar que terminó la acción de construir
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
    }
  
    const listos = room.jugadoresAccionTerminada.length;
    const total = room.players.length;
  
    io.to(partida).emit('estado-espera-jugadores', listos < total ? `⌛ Esperando a ${total - listos}...` : `✅ Procesando...`);
  
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
          for (const nombreTerritorio in territorios) {
            const t = territorios[nombreTerritorio];
            if (t.propietario === casa) {
              ingreso += t.oroBase || 0;
            }
          }
            // 🔨 BONUS por cada mina construida en territorios del jugador
  for (const nombreTerritorio in territorios) {
    const territorio = territorios[nombreTerritorio];
    if (territorio.propietario === casa && Array.isArray(territorio.edificios)) {
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
      ingreso += minas * 10;
      ingreso += aserraderos * 5;
      ingreso += canteras * 5;
      if (casa !== "Tyrell") {
  ingreso += granjas * 5;
}
    }
}

          const barcos = j.barcos || 0;
const catapultas = j.catapulta || 0;
const torres = j.torre || 0;
const escorpiones = j.escorpion || 0;
const dragones = j.dragones || 0;

const costoTropas = (j.tropas || 0) + (j.mercenarios || 0) + (j.elite || 0);
const costoBarcos = barcos * 2;
const costoMaquinas = catapultas + torres + escorpiones;
const costoDragones = dragones * 5;
const costoSacerdotes = j.sacerdotes || 0;
const caballeros = j.caballero || 0;
const costoCaballeros = caballeros * 1;




j.oro += ingreso;
j.oro = Math.max(0, j.oro - costoTropas - costoBarcos - costoMaquinas - costoDragones - costoSacerdotes - costoCaballeros);


        }
      }
  
      io.to(partida).emit('actualizar-estado-juego', {
        territorios: room.estadoTerritorios,
        jugadores: room.estadoJugadores,
        turno: room.turnoActual,
        accion: room.accionActual
      });
  
      // Emitir estado actualizado ANTES de avanzar acción
      io.to(partida).emit('actualizar-estado-juego', {
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
    }
  });

  // =============================
// RECLUTAMIENTO DE UNIDADES
// =============================
socket.on('solicitud-reclutamiento', ({ partida, nombre, territorio, tipoUnidad, cantidad }) => {
  const room = rooms[partida];
  if (!room) return;

  const jugador = room.estadoJugadores[nombre];
  const territorioObj = room.estadoTerritorios[territorio];

  if (!jugador || !territorioObj || territorioObj.propietario !== jugador.casa) return;

  if (tipoUnidad === "caballero") {
    if (jugador.casa !== "Arryn") return;
    const tieneAcademia = Object.values(room.estadoTerritorios).some(
      t => t.propietario === jugador.casa && t.edificios.includes("Academia de Caballería")
    );
    if (!tieneAcademia) return;
  }
  

  const COSTOS = {
    sacerdoteLuz: 20,
    soldado: 4,
    mercenario: 5,
    elite: 7,
    barco: 20,
    catapulta: 20,
    escorpion: 20,
    torre: 20,
    caballero: 10
  };
  

  let costoUnitario = COSTOS[tipoUnidad] ?? 999;

  // Si el jugador está reclutando barcos,escorpion,torre y catapulta aplicamos el descuento por aserraderos, tambien si hay granjas descontamos soldados
  let descuento = 0;

  if (tipoUnidad === "soldado") {
    for (const nombreTerritorio in room.estadoTerritorios) {
      const territorio = room.estadoTerritorios[nombreTerritorio];
      if (territorio.propietario === jugador.casa && Array.isArray(territorio.edificios)) {
        descuento += territorio.edificios.filter(e => e === "Granja").length;
      }
    }
  }

  costoUnitario = Math.max(0, costoUnitario - descuento);
  

if (["barco", "catapulta", "escorpion", "torre"].includes(tipoUnidad)) {
  for (const nombreTerritorio in room.estadoTerritorios) {
    const territorio = room.estadoTerritorios[nombreTerritorio];
    if (territorio.propietario === jugador.casa && Array.isArray(territorio.edificios)) {
      const aserraderos = territorio.edificios.filter(e => e === "Aserradero").length;
const canteras = territorio.edificios.filter(e => e === "Cantera").length;
ingreso += aserraderos * 5;
ingreso += canteras * 5;

    }
  }
  costoUnitario = Math.max(0, COSTOS[tipoUnidad] - descuento);
}

  
  // Calcular costo final con el costo unitario (con o sin descuento)
  const costoTotal = costoUnitario * cantidad;
  
  if (jugador.oro < costoTotal) {
    io.to(room.playerSockets[nombre]).emit('error-accion', 'Oro insuficiente para reclutar.');
    return;
  }
  
  jugador.oro -= costoTotal;
  
  

  if (tipoUnidad === 'soldado') {
  jugador.tropas = (jugador.tropas || 0) + cantidad;
} else if (tipoUnidad === 'mercenario') {
  jugador.mercenarios = (jugador.mercenarios || 0) + cantidad;
} else if (tipoUnidad === 'elite') {
  jugador.elite = (jugador.elite || 0) + cantidad;
} else if (tipoUnidad === 'barco') {
  jugador.barcos = (jugador.barcos || 0) + cantidad;
} else if (tipoUnidad === 'sacerdoteLuz') {
  jugador.sacerdotes = (jugador.sacerdotes || 0) + cantidad;
} else if (["catapulta", "torre", "escorpion"].includes(tipoUnidad)) {
  jugador[tipoUnidad] = (jugador[tipoUnidad] || 0) + cantidad;
} else if (tipoUnidad === 'caballero') {
  jugador.caballero = (jugador.caballero || 0) + cantidad;
}



  

  io.to(partida).emit('actualizar-estado-juego', {
    territorios: room.estadoTerritorios,
    jugadores: room.estadoJugadores,
    turno: room.turnoActual,
    accion: room.accionActual
  });

  // Marcar acción como completada
  if (!room.jugadoresAccionTerminada.includes(nombre)) {
    room.jugadoresAccionTerminada.push(nombre);
  }

  const listos = room.jugadoresAccionTerminada.length;
  const total = room.players.length;

  io.to(partida).emit(
    'estado-espera-jugadores',
    listos < total ? `⌛ Esperando a ${total - listos}...` : `✅ Procesando...`
  );

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
        for (const nombreTerritorio in territorios) {
          const t = territorios[nombreTerritorio];
          if (t.propietario === casa) {
            ingreso += t.oroBase || 0;
          }
        }

          // 🔨 BONUS por cada mina construida en territorios del jugador
  for (const nombreTerritorio in territorios) {
    const territorio = territorios[nombreTerritorio];
    if (territorio.propietario === casa && Array.isArray(territorio.edificios)) {
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
      ingreso += minas * 10;
      ingreso += aserraderos * 5;
      ingreso += canteras * 5;
      if (casa !== "Tyrell") {
  ingreso += granjas * 5;
}
    }
}

        const barcos = j.barcos || 0;
const catapultas = j.catapulta || 0;
const torres = j.torre || 0;
const escorpiones = j.escorpion || 0;
const dragones = j.dragones || 0;

const costoBarcos = barcos * 2;
const costoTropas = (j.tropas || 0) + (j.mercenarios || 0) + (j.elite || 0);
const costoMaquinas = catapultas + torres + escorpiones;
const costoDragones = dragones * 5;
const costoSacerdotes = j.sacerdotes || 0;
const caballeros = j.caballero || 0;
const costoCaballeros = caballeros * 1;



j.oro += ingreso;
j.oro = Math.max(0, j.oro - costoTropas - costoBarcos - costoMaquinas - costoDragones - costoSacerdotes - costoCaballeros);


      }
    }

    io.to(partida).emit('actualizar-estado-juego', {
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
  }
});

  

  // Cuando un jugador termina su acción
  socket.on('accion-terminada', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room || !room.players.includes(nombre)) return;

    if (!room.jugadoresAccionTerminada) room.jugadoresAccionTerminada = [];
    if (!room.jugadoresAccionTerminada.includes(nombre)) {
      room.jugadoresAccionTerminada.push(nombre);
      const listos = room.jugadoresAccionTerminada.length;
      const total = room.players.length;

      io.to(partida).emit('estado-espera-jugadores', listos < total ? `⌛ Esperando a ${total - listos}...` : `✅ Procesando...`);

      if (listos === total) {
        // Todos terminaron su acción, se avanza al siguiente paso
        room.jugadoresAccionTerminada = [];
        room.accionActual += 1;
      
        // 👉 Si se acaba de terminar la acción 4 (fase neutral), avanzamos de turno
        if (room.accionActual > 4) {
          room.accionActual = 1;
          room.turnoActual += 1;

          // 💰 FASE DE RECAUDACIÓN Y MANTENIMIENTO
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
                if (territorio.propietario === casa) {
                    ingreso += territorio.oroBase || 0;
                }
            }

              // 🔨 BONUS por cada mina construida en territorios del jugador
  for (const nombreTerritorio in territorios) {
    const territorio = territorios[nombreTerritorio];
    if (territorio.propietario === casa && Array.isArray(territorio.edificios)) {
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
      ingreso += minas * 10;
      ingreso += aserraderos * 5;
      ingreso += canteras * 5;
      if (casa !== "Tyrell") {
  ingreso += granjas * 5;
}
    }
}

            // 2. Sumar el ingreso
            jugador.oro += ingreso;
            // 3. Restar mantenimiento por tropas (1 oro por cada tropa)
            const catapultas = jugador.catapulta || 0;
            const torres = jugador.torre || 0;
            const escorpiones = jugador.escorpion || 0;
            const costoMaquinas = catapultas * 1 + torres * 1 + escorpiones * 1; // o el coste de mantenimiento que quieras

            const costoTropas = (j.tropas || 0) + (j.mercenarios || 0) + (j.elite || 0);
            const barcos = jugador.barcos || 0;
            const costoBarcos = barcos * 2;
            const dragones = jugador.dragones || 0;
            const costoDragones = dragones * 5;
            const costoSacerdotes = j.sacerdotes || 0;
            const caballeros = j.caballero || 0;
const costoCaballeros = caballeros * 1;


            jugador.oro = Math.max(0, jugador.oro - costoTropas - costoBarcos - costoMaquinas - costoDragones - costoSacerdotes);

        }
      
          io.to(partida).emit('actualizar-estado-juego', {
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
          
      }
      
    }
  });

  socket.on('recompensa-asedio', ({ partida, nombre, tipo }) => {
    const room = rooms[partida];
    if (!room || !room.estadoJugadores?.[nombre]) return;
    if (!["catapulta", "torre", "escorpion"].includes(tipo)) return;
  
    const jugador = room.estadoJugadores[nombre];
    jugador[tipo] = (jugador[tipo] || 0) + 1;
  
    io.to(partida).emit('actualizar-estado-juego', {
      territorios: room.estadoTerritorios,
      jugadores: room.estadoJugadores,
      turno: room.turnoActual,
      accion: room.accionActual
    });
  });
  

  // Cuando un jugador se desconecta
  socket.on('disconnect', (reason) => {
    console.log(`❌ Desconectado: ${socket.id} (${reason})`);
  });
});

// Arrancamos el servidor en el puerto 3000 o el que esté en las variables de entorno
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor backend funcionando en http://localhost:${PORT}`);
});
