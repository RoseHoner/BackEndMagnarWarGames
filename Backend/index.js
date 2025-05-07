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
    { nombre: "Isla del Oso", oro: 5, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Costa pedregosa", oro: 4, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Los túmulos", oro: 7, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Invernalia", oro: 11, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Fuerte terror", oro: 8, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Bastión Kar", oro: 6, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Skagos", oro: 4, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Atalaya de la viuda", oro: 5, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Puerto blanco", oro: 7, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Cabo Kraken", oro: 4, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Bosque de lobos", oro: 6, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "El cuello", oro: 6, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Tribu de las montañas", oro: 4, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Los Gemelos", oro: 9, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "El Tridente", oro: 8, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "Aguasdulces", oro: 12, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "Harrenhal", oro: 10, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "Septo de Piedra", oro: 5, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "Varamar", oro: 5, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "Poza de Doncella", oro: 8, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "Montañas de la Luna", oro: 6, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Los Dedos", oro: 7, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Arco Largo", oro: 6, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Nido de Águilas", oro: 13, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Puerta de la Sangre", oro: 4, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Puerto Gaviota", oro: 10, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Tres Hermanas", oro: 6, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Fuerterrojo", oro: 7, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "El risco", oro: 6, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Roca Casterly", oro: 16, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Colmillo dorado", oro: 8, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Refugio de plata", oro: 10, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Crakehall", oro: 8, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Isla Bella", oro: 6, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Lannisport", oro: 15, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "El Rejo", oro: 10, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Aguas Negras", oro: 6, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Río Mander", oro: 9, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Sotodeoro", oro: 9, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "La Sidra", oro: 6, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Colina Cuerno", oro: 7, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Altojardín", oro: 15, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Antigua", oro: 11, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Islas Escudo", oro: 4, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Punta Zarpa Rota", oro: 5, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Valle Oscuro", oro: 10, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Desembarco del Rey", oro: 23, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Rocadragón", oro: 7, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Bosque Real", oro: 6, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Marca Deriva", oro: 9, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Bastión de Tormentas", oro: 14, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Tarth", oro: 8, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Marcas de Dorne", oro: 8, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Bosque Bruma", oro: 7, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Islaverde", oro: 5, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Bosque Alto", oro: 6, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Refugio Estival", oro: 7, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Sepulcro del Rey", oro: 10, propietarioInicial: "Martell", casa: "Martell" },
    { nombre: "Asperon", oro: 9, propietarioInicial: "Martell", casa: "Martell" },
    { nombre: "Río Sangreverde", oro: 8, propietarioInicial: "Martell", casa: "Martell" },
    { nombre: "Lanza del Sol", oro: 15, propietarioInicial: "Martell", casa: "Martell" },
    { nombre: "Los Peldaños", oro: 6, propietarioInicial: "Martell", casa: "Martell" },
    { nombre: "Campo Estrella", oro: 7, propietarioInicial: "Martell", casa: "Martell" },
    { nombre: "Pyke", oro: 14, propietarioInicial: "Greyjoy", casa: "Greyjoy" },
    { nombre: "Harlaw", oro: 10, propietarioInicial: "Greyjoy", casa: "Greyjoy" },
    { nombre: "Monte Orca", oro: 7, propietarioInicial: "Greyjoy", casa: "Greyjoy" },
    { nombre: "Gran Wyk", oro: 9, propietarioInicial: "Greyjoy", casa: "Greyjoy" }
  ];
  
const ORO_INICIAL_POR_DEFECTO = 50;
const TROPAS_INICIALES_POR_DEFECTO = 30;

// Función que genera el estado inicial de los territorios al comenzar la partida
function inicializarEstadoTerritorios() {
    const estadoTerritorios = {};
    TERRITORIOS_BASE.forEach(t => {
        estadoTerritorios[t.nombre] = {
            nombre: t.nombre, // ✅ AÑADIDO AQUÍ
            propietario: t.propietarioInicial,
            oroBase: t.oro,
            edificios: [],
            tropas: {}
        };
    });
    return estadoTerritorios;
}

  

// Función que asigna a cada jugador su casa, oro y tropas al iniciar
function inicializarEstadoJugadores(players, casasAsignadas) {
  const estadoJugadores = {};
  players.forEach(nombre => {
    estadoJugadores[nombre] = {
      casa: casasAsignadas[nombre] || 'Desconocida',
      tropas: TROPAS_INICIALES_POR_DEFECTO,
      oro: ORO_INICIAL_POR_DEFECTO
    };
  });
  return estadoJugadores;
}

// Cuando un cliente se conecta por socket
io.on('connection', (socket) => {
  console.log(`🔌 Connect: ${socket.id}`);

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
        "Puerto Fluvial": 30
      };
    const costo = COSTOS[tipoEdificio] ?? 999;
  
    if (jugador.oro < costo) {
      io.to(room.playerSockets[nombre]).emit('error-accion', 'Oro insuficiente para construir.');
      return;
    }
  
    // Construcción válida
    jugador.oro -= costo;
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
          j.oro += ingreso;
          j.oro = Math.max(0, j.oro - j.tropas);
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
            for (const nombreTerritorio in territorios) {
                const territorio = territorios[nombreTerritorio];
                if (territorio.propietario === casa) {
                    ingreso += territorio.oroBase || 0;
                }
            }
            // 2. Sumar el ingreso
            jugador.oro += ingreso;
            // 3. Restar mantenimiento por tropas (1 oro por cada tropa)
            const costoTropas = jugador.tropas || 0;
            jugador.oro = Math.max(0, jugador.oro - costoTropas);
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
