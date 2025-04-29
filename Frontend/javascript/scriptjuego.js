const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Habilitar CORS para todas las rutas

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite cualquier origen (ajusta en producción)
    methods: ["GET", "POST"]
  }
});

// --- Estado del Servidor ---
const rooms = {};
/* Estructura: rooms[partidaId]: {
    password,
    players: [nombre1, nombre2,...], // Nombres de jugadores
    casas: { nombreJugador: nombreCasa }, // Asignación jugador -> casa
    playerSockets: { nombreJugador: socketId }, // Socket ID actual de cada jugador
    gameState: { ... } // Objeto detallado del estado del juego (ver abajo)
   }
*/

// --- DATOS INICIALES DEL JUEGO ---
const TERRITORIOS_BASE = [
    // TU LISTA COMPLETA DE TERRITORIOS AQUÍ... (la misma que tenías)
    { nombre: "Isla del Oso", oro: 5, propietarioInicial: "Stark", casa: "Stark" }, { nombre: "Costa pedregosa", oro: 4, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Los túmulos", oro: 7, propietarioInicial: "Stark", casa: "Stark" }, { nombre: "Invernalia", oro: 11, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Fuerte terror", oro: 8, propietarioInicial: "Stark", casa: "Stark" }, { nombre: "Bastión Kar", oro: 6, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Skagos", oro: 4, propietarioInicial: "Stark", casa: "Stark" }, { nombre: "Atalaya de la viuda", oro: 5, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Puerto blanco", oro: 7, propietarioInicial: "Stark", casa: "Stark" }, { nombre: "Cabo Kraken", oro: 4, propietarioInicial: "Stark", casa: "Stark" }, // Corregido 'Kralen' a 'Kraken' si es necesario
    { nombre: "Bosque de lobos", oro: 6, propietarioInicial: "Stark", casa: "Stark" }, { nombre: "El cuello", oro: 6, propietarioInicial: "Stark", casa: "Stark" },
    { nombre: "Tribu de las montañas", oro: 4, propietarioInicial: "Stark", casa: "Stark" }, { nombre: "Los Gemelos", oro: 9, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "El Tridente", oro: 8, propietarioInicial: "Tully", casa: "Tully" }, { nombre: "Aguasdulces", oro: 12, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "Harrenhal", oro: 10, propietarioInicial: "Tully", casa: "Tully" }, { nombre: "Septo de Piedra", oro: 5, propietarioInicial: "Tully", casa: "Tully" },
    { nombre: "Varamar", oro: 5, propietarioInicial: "Tully", casa: "Tully" }, { nombre: "Poza de Doncella", oro: 8, propietarioInicial: "Tully", casa: "Tully" }, // Corregido 'Doncella'
    { nombre: "Montañas de la Luna", oro: 6, propietarioInicial: "Arryn", casa: "Arryn" }, { nombre: "Los Dedos", oro: 7, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Arco Largo", oro: 6, propietarioInicial: "Arryn", casa: "Arryn" }, { nombre: "Nido de Águilas", oro: 13, propietarioInicial: "Arryn", casa: "Arryn" }, // Corregido oro Arco Largo si era 9
    { nombre: "Puerta de la Sangre", oro: 4, propietarioInicial: "Arryn", casa: "Arryn" }, { nombre: "Puerto Gaviota", oro: 10, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "Tres Hermanas", oro: 6, propietarioInicial: "Arryn", casa: "Arryn" }, { nombre: "Fuerterrojo", oro: 7, propietarioInicial: "Arryn", casa: "Arryn" },
    { nombre: "El risco", oro: 6, propietarioInicial: "Lannister", casa: "Lannister" }, { nombre: "Roca Casterly", oro: 16, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Colmillo dorado", oro: 8, propietarioInicial: "Lannister", casa: "Lannister" }, { nombre: "Refugio de plata", oro: 10, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Crakehall", oro: 8, propietarioInicial: "Lannister", casa: "Lannister" }, { nombre: "Isla Bella", oro: 6, propietarioInicial: "Lannister", casa: "Lannister" },
    { nombre: "Lannisport", oro: 15, propietarioInicial: "Lannister", casa: "Lannister" }, { nombre: "El Rejo", oro: 10, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Aguas Negras", oro: 6, propietarioInicial: "Tyrell", casa: "Tyrell" }, { nombre: "Río Mander", oro: 9, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Sotodeoro", oro: 9, propietarioInicial: "Tyrell", casa: "Tyrell" }, { nombre: "La Sidra", oro: 6, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Colina Cuerno", oro: 7, propietarioInicial: "Tyrell", casa: "Tyrell" }, { nombre: "Altojardín", oro: 15, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Antigua", oro: 11, propietarioInicial: "Tyrell", casa: "Tyrell" }, { nombre: "Islas Escudo", oro: 4, propietarioInicial: "Tyrell", casa: "Tyrell" },
    { nombre: "Bastión de Tormentas", oro: 14, propietarioInicial: "Baratheon", casa: "Baratheon" }, { nombre: "Tarth", oro: 8, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Marcas de Dorne", oro: 8, propietarioInicial: "Baratheon", casa: "Baratheon" }, { nombre: "Bosque Bruma", oro: 7, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Islaverde", oro: 5, propietarioInicial: "Baratheon", casa: "Baratheon" }, { nombre: "Bosque Alto", oro: 6, propietarioInicial: "Baratheon", casa: "Baratheon" },
    { nombre: "Refugio Estival", oro: 7, propietarioInicial: "Baratheon", casa: "Baratheon" }, { nombre: "Sepulcro del Rey", oro: 10, propietarioInicial: "Martell", casa: "Martell" },
    { nombre: "Asperon", oro: 9, propietarioInicial: "Martell", casa: "Martell" }, { nombre: "Río Sangreverde", oro: 8, propietarioInicial: "Martell", casa: "Martell" },
    { nombre: "Lanza del Sol", oro: 15, propietarioInicial: "Martell", casa: "Martell" }, { nombre: "Los Peldaños", oro: 6, propietarioInicial: "Martell", casa: "Martell" }, // Corregido Példaños
    { nombre: "Campo Estrella", oro: 7, propietarioInicial: "Martell", casa: "Martell" }, { nombre: "Punta Zarpa Rota", oro: 5, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Valle Oscuro", oro: 10, propietarioInicial: "Targaryen", casa: "Targaryen" }, { nombre: "Desembarco del Rey", oro: 23, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Rocadragón", oro: 7, propietarioInicial: "Targaryen", casa: "Targaryen" }, { nombre: "Bosque Real", oro: 6, propietarioInicial: "Targaryen", casa: "Targaryen" },
    { nombre: "Marca Deriva", oro: 9, propietarioInicial: "Targaryen", casa: "Targaryen" }, { nombre: "Pyke", oro: 14, propietarioInicial: "Greyjoy", casa: "Greyjoy" },
    { nombre: "Harlaw", oro: 10, propietarioInicial: "Greyjoy", casa: "Greyjoy" }, { nombre: "Monte Orca", oro: 7, propietarioInicial: "Greyjoy", casa: "Greyjoy" },
    { nombre: "Gran Wyk", oro: 9, propietarioInicial: "Greyjoy", casa: "Greyjoy" }
];

const COSTOS = {
    tropa: 4, barco: 20, maquinaAsedio: 20, sacerdote: 20, mercenario: 8, mercenarioElite: 15,
    granja: 20, cantera: 20, mina: 20, aserradero: 20,
    castillo: 30, puerto: 30, tallerAsedio: 30, academiaCaballeria: 20, // Ejemplo Arryn
    armeria: 30, // Ejemplo Lannister
    arqueria: 30, // Ejemplo Tully
    // Añadir costos específicos de facción si los hay
};

const LIMITES_RECLUTAMIENTO_BASE = {
    Stark: 7, Tully: 7, Arryn: 7, Lannister: 9, Tyrell: 12, Baratheon: 8, Martell: 5, // +10 mercs para Martell
    Targaryen: 6, Greyjoy: 7
};

// --- Funciones Auxiliares ---

// Devuelve un número aleatorio entre min y max (ambos inclusive)
function tirarDado(caras) {
    return Math.floor(Math.random() * caras) + 1;
}

// Simula tirar XdY (e.g., 3d6)
function tirarDados(numero, caras) {
    let resultados = [];
    for (let i = 0; i < numero; i++) {
        resultados.push(tirarDado(caras));
    }
    return resultados;
}

// Simula 1d3 o 1d2
function tirarDadoEspecial(tipo) { // 'd3' o 'd2'
    const tirada = tirarDado(6);
    if (tipo === 'd3') {
        if (tirada <= 2) return 1;
        if (tirada <= 4) return 2;
        return 3;
    } else if (tipo === 'd2') {
        return (tirada <= 3) ? 1 : 2;
    }
    return tirada; // Por si acaso
}


function getEstadoJugador(gameState, nombreJugador) {
    return gameState?.jugadores?.[nombreJugador];
}

function getTerritorio(gameState, nombreTerritorio) {
    return gameState?.territorios?.[nombreTerritorio];
}

// Inicializa el estado detallado del juego
function inicializarGameState(players, casasAsignadas) {
    console.log("[Server Init] Inicializando gameState...");
    const gameState = {
        turno: 1,
        accion: 1,
        fase: 'Accion', // 'Accion' o 'Neutral'
        jugadoresAccionTerminada: [],
        territorios: {},
        jugadores: {},
        config: { modoJuego: 'Conquista' },
        estadoGlobal: { invierno: false }
    };

    // 1. Inicializar Territorios
    TERRITORIOS_BASE.forEach(tBase => {
        gameState.territorios[tBase.nombre] = {
            nombre: tBase.nombre,
            casaOriginal: tBase.casa,
            propietario: tBase.propietarioInicial, // Casa inicial como string
            oroBase: tBase.oro,
            tropas: {
                regulares: tirarDadoEspecial('d3') // Regla: 1d3 tropas iniciales por territorio
                // Aquí irían otras tropas iniciales específicas (Caballeros Arryn, etc.)
            },
            edificios: [], // Array de strings: ["Castillo", "Mina", ...]
            // Añadir más estados si son necesarios: asediado: false, etc.
        };
    });

    // 2. Inicializar Jugadores
    players.forEach(nombre => {
        const casaJugador = casasAsignadas[nombre];
        if (!casaJugador) {
            console.warn(`[Server Init] Jugador ${nombre} no tiene casa asignada, saltando inicialización de jugador.`);
            return; // Saltar si no tiene casa (no debería pasar si la lógica del lobby es correcta)
        }

        const capital = Object.values(gameState.territorios).find(t => t.casaOriginal === casaJugador && t.oroBase > 11); // Heurística simple para capital
        let tropasInicialesCapital = 0;
        if (capital) {
             tropasInicialesCapital = tirarDado(8); // Regla: 1d8 en capital
             capital.tropas.regulares = tropasInicialesCapital; // Sobreescribir el 1d3
             console.log(` > Capital ${capital.nombre} (${casaJugador}) inicia con ${tropasInicialesCapital} tropas.`);
        } else {
             console.warn(` > No se encontró capital para ${casaJugador}, tropas capital no asignadas.`);
        }

        // Calcular tropas totales iniciales (aproximado)
         let tropasTotales = 0;
         Object.values(gameState.territorios).forEach(t => {
             if(t.propietario === casaJugador) {
                 tropasTotales += t.tropas.regulares || 0;
                 // Sumar otras tropas si las hubiera
             }
         });

        gameState.jugadores[nombre] = {
            nombre: nombre,
            casa: casaJugador,
            oro: tirarDado(6) * 10, // Regla: 1d6 * 10 oro inicial
            tropasTotales: tropasTotales, // Suma inicial de tropas en sus territorios
            limiteReclutamientoBase: LIMITES_RECLUTAMIENTO_BASE[casaJugador] || 7,
            tropasReclutadasEsteTurno: 0,
            rumoresDesbloqueados: [],
            estadoPrestamo: null,
            edificiosConstruidosTurno: 0, // Para límite Targaryen
            // Añadir estados específicos de facción aquí
            // Ejemplo Arryn:
            ...(casaJugador === 'Arryn' && { caballerosGratisTorneo: 0, academiaConstruida: false, puedeConstruirAtalaya: true }),
             // Ejemplo Lannister:
            ...(casaJugador === 'Lannister' && { armeriaConstruida: false, intimidacionUsada: false }),
            // Ejemplo Tyrell:
            ...(casaJugador === 'Tyrell' && { septoConstruido: false, granjaInicial: true }), // Asume que ya empieza con una
            // ... y así para las demás casas
        };
         console.log(` > Jugador ${nombre} (${casaJugador}) inicia con ${gameState.jugadores[nombre].oro} oro y ${tropasTotales} tropas.`);

         // Lógica inicial específica de facción (si aplica)
         if (casaJugador === 'Arryn') {
             const caballerosIniciales = tirarDado(4) + 1;
             if (capital) { // Añadir a la capital si existe
                 capital.tropas.caballeros = caballerosIniciales; // Asumiendo 'caballeros' como tipo
                 gameState.jugadores[nombre].tropasTotales += caballerosIniciales;
                 console.log(`   * Arryn empieza con ${caballerosIniciales} caballeros.`);
             }
         }
         if (casaJugador === 'Baratheon') {
              // Empiezan con sacerdote? Añadirlo a gameState.jugadores o a un territorio?
              gameState.jugadores[nombre].sacerdotesLuz = [{ id: 1, ubicacion: capital?.nombre || null }]; // Ejemplo
              console.log(`   * Baratheon empieza con 1 Sacerdote de Luz.`);
         }
          if (casaJugador === 'Targaryen') {
              gameState.jugadores[nombre].dragones = [{ id: 1, nombre: "DragonInicial", jinete: nombre, ubicacion: capital?.nombre || null }]; // Ejemplo
              console.log(`   * Targaryen empieza con 1 Dragón.`);
          }
          // ... etc para otras casas con unidades/estados iniciales
    });

    // Ajustar tropas en la capital según las reglas específicas si es necesario

    console.log("[Server Init] GameState inicializado correctamente.");
    return gameState;
}


// --- Lógica Socket.IO ---
io.on('connection', (socket) => {
    console.log(`🔌 Connect: ${socket.id}`);

    // --- Eventos del Lobby ---
    socket.on('crear-partida', ({ nombre, partida, clave }) => {
        if (rooms[partida]) {
            return socket.emit('error', 'La partida ya existe.');
        }
        rooms[partida] = {
            password: clave,
            players: [], // Inicialmente vacío
            casas: {},
            playerSockets: {},
            gameState: null // Se inicializará al empezar el juego
        };
        console.log(`[Lobby] Partida '${partida}' creada por ${nombre}.`);
        // No unir automáticamente aquí, esperar a 'unirse-partida' desde el lobby.html
        socket.emit('partida-creada', partida); // Confirmar creación (opcional)
    });

    socket.on('unirse-partida', ({ nombre, partida, clave }) => {
        const room = rooms[partida];
        if (!room) {
            return socket.emit('error', 'La partida no existe.');
        }
        if (room.password && room.password !== clave) {
            return socket.emit('error', 'Contraseña incorrecta.');
        }
        if (room.players.includes(nombre)) {
            // Ya está en la sala, quizás es una reconexión o recarga
             console.log(`[Lobby] ${nombre} (${socket.id}) se REUNIO/REFRESCO en ${partida}.`);
        } else {
             if (room.players.length >= 9) {
                 return socket.emit('error', 'La partida está llena.');
             }
             room.players.push(nombre);
             console.log(`[Lobby] ${nombre} (${socket.id}) se unió a ${partida}. Jugadores: ${room.players.length}`);
        }

        // Actualizar socket ID y unir a la sala de Socket.IO
        room.playerSockets[nombre] = socket.id;
        socket.join(partida);

        // Guardar datos de la partida en el socket para futura referencia (desconexión)
        socket.partidaId = partida;
        socket.nombreJugador = nombre;

        // Enviar estado actual del lobby a TODOS en la sala
        io.to(partida).emit('jugadores-actualizados', room.players);
        io.to(partida).emit('casas-actualizadas', room.casas);

        // Si el juego ya había empezado, enviar el gameState al jugador que se une/reune
        if (room.gameState) {
            console.log(`[Juego] ${nombre} se une a partida en curso. Enviando gameState.`);
            socket.emit('actualizar-estado-juego', room.gameState);
        }
    });

    socket.on('elegir-casa', ({ partida, nombre, casa }) => {
        const room = rooms[partida];
        if (!room || !room.players.includes(nombre)) return socket.emit('error', 'Error al elegir casa: partida o jugador no válido.');

        // Verificar si la casa ya está ocupada por OTRO jugador
        const ocupanteActual = Object.keys(room.casas).find(jugador => room.casas[jugador] === casa);
        if (ocupanteActual && ocupanteActual !== nombre) {
            return socket.emit('error', `La casa ${casa} ya está ocupada por ${ocupanteActual}.`);
        }

        // Desasignar casa anterior del jugador si la tenía
        const casaAnterior = room.casas[nombre];
        if (casaAnterior && casaAnterior !== casa) {
             console.log(`[Lobby] ${nombre} cambia de ${casaAnterior} a ${casa} en ${partida}.`);
        }

        // Asignar nueva casa
        room.casas[nombre] = casa;
        console.log(`[Lobby] ${nombre} elige ${casa} en ${partida}.`);

        // Notificar a todos
        io.to(partida).emit('casas-actualizadas', room.casas);
    });

    socket.on('quitar-casa', ({ partida, nombre }) => {
        const room = rooms[partida];
         if (!room || !room.players.includes(nombre)) return socket.emit('error', 'Error al quitar casa: partida o jugador no válido.');

        if (room.casas[nombre]) {
            console.log(`[Lobby] ${nombre} deselecciona ${room.casas[nombre]} en ${partida}.`);
            delete room.casas[nombre];
             // Notificar a todos
            io.to(partida).emit('casas-actualizadas', room.casas);
        }
    });

    // --- Inicio de Juego ---
    socket.on('iniciar-juego', ({ partida }) => {
        const room = rooms[partida];
        if (!room) return socket.emit('error', 'No se puede iniciar: partida no encontrada.');
        // Validación simple: ¿Hay jugadores? ¿Todos tienen casa?
        if (room.players.length === 0 || room.players.length !== Object.keys(room.casas).length) {
             return io.to(room.playerSockets[socket.nombreJugador]).emit('error', 'No se puede iniciar: No todos los jugadores han elegido casa.'); // Mensaje solo al host
        }

        console.log(`[Juego] Iniciando juego en ${partida}...`);
        // *** Crear el estado inicial del juego EN EL SERVIDOR ***
        room.gameState = inicializarGameState(room.players, room.casas);

        console.log(`[Juego] Estado inicial creado para ${partida}. Notificando a jugadores...`);
        // Notificar a todos los clientes que el juego ha comenzado y enviar estado inicial
        io.to(partida).emit('juego-iniciado', {
            // No necesitamos enviar las casas aquí de nuevo, el cliente ya las tiene
            // Pero SÍ enviamos el gameState completo la primera vez
             gameState: room.gameState
         });
    });

    // --- Eventos Durante el Juego ---
    socket.on('unirse-sala-juego', ({ partida, nombre }) => {
        const room = rooms[partida];
        // Re-validar y unir socket a la sala (importante para reconexiones)
        if (room && room.players.includes(nombre)) {
            socket.join(partida);
            room.playerSockets[nombre] = socket.id; // Actualizar socket ID
            socket.partidaId = partida;
            socket.nombreJugador = nombre;
            console.log(`[Juego] ${nombre} (${socket.id}) confirmado/reconectado en sala ${partida}.`);

            // Enviar el estado actual del juego SOLO a este jugador
            if (room.gameState) {
                console.log(`   -> Enviando gameState actual a ${nombre}`);
                socket.emit('actualizar-estado-juego', room.gameState);
            } else {
                console.warn(`   -> Estado juego ${partida} aún no inicializado al (re)unirse ${nombre}.`);
                // ¿Quizás debería esperar o pedir al host que inicie?
            }
        } else {
            console.warn(`Intento inválido de ${nombre} para unirse a sala juego ${partida}`);
            socket.emit('error', 'No se pudo unir a la sala del juego.');
        }
    });

    // --- PROCESAR BATALLA (Refinado) ---
    socket.on('registrar-batalla', (data) => {
        console.log("------------------------------------------");
        console.log(`[Server Batalla ${data.partida}] Recibido:`, data);
        const { partida, atacante, casaAtacante, territorioAtacado, resultado, perdidasAtacante, perdidasDefensor } = data;

        const room = rooms[partida];
        if (!room || !room.gameState) return console.error(`[Batalla ${partida}] ERROR: Partida o gameState no encontrado.`);

        const gameState = room.gameState;
        const jugadorAtacante = getEstadoJugador(gameState, atacante);
        const territorio = getTerritorio(gameState, territorioAtacado);

        // *** VALIDACIONES ***
        if (!jugadorAtacante || jugadorAtacante.casa !== casaAtacante) return console.error(`[Batalla ${partida}] ERROR: Atacante ${atacante} inválido o casa incorrecta.`);
        if (!territorio) return console.error(`[Batalla ${partida}] ERROR: Territorio ${territorioAtacado} no existe.`);
        const defensorCasa = territorio.propietario;
        if (!defensorCasa) return console.warn(`[Batalla ${partida}] WARN: Territorio ${territorioAtacado} es neutral.`);
        if (defensorCasa === casaAtacante) return console.warn(`[Batalla ${partida}] WARN: Ataque a territorio propio.`);
        // Validación de tropas perdidas vs existentes (simplificada, idealmente ver tropas atacantes)
        if (perdidasAtacante < 0 || perdidasDefensor < 0) return console.error(`[Batalla ${partida}] ERROR: Pérdidas negativas.`);
        if (jugadorAtacante.tropasTotales < perdidasAtacante) { // Comprobación básica
            console.warn(`[Batalla ${partida}] WARN: ${atacante} reporta perder ${perdidasAtacante} pero solo tiene ${jugadorAtacante.tropasTotales} total.`);
            // Podríamos ajustar perdidasAtacante aquí o rechazar, por ahora ajustamos
             perdidasAtacante = jugadorAtacante.tropasTotales;
        }
         // Validación tropas defensoras en territorio
         const tropasDefensorasEnTerritorio = territorio.tropas?.regulares || 0; // Asume solo regulares por ahora
         if (tropasDefensorasEnTerritorio < perdidasDefensor) {
             console.warn(`[Batalla ${partida}] WARN: Defensor reporta perder ${perdidasDefensor} en ${territorioAtacado} pero solo hay ${tropasDefensorasEnTerritorio}.`);
             perdidasDefensor = tropasDefensorasEnTerritorio;
         }


        let defensorNombre = Object.keys(room.casas).find(j => room.casas[j] === defensorCasa);
        console.log(`[Batalla ${partida}] ${atacante}(${casaAtacante}) vs ${defensorNombre || 'N/A'}(${defensorCasa || 'Neutral'}) en ${territorioAtacado}`);

        // *** ACTUALIZAR ESTADO ***
        // Tropas Atacante (Total - necesita mejora para ser por territorio origen)
        jugadorAtacante.tropasTotales = Math.max(0, jugadorAtacante.tropasTotales - perdidasAtacante);
        console.log(` -> Tropas TOTALES ${atacante}: ${jugadorAtacante.tropasTotales}`);

        // Tropas Defensor (Total y en Territorio)
        if (defensorNombre) {
             const jugadorDefensor = getEstadoJugador(gameState, defensorNombre);
             if (jugadorDefensor) {
                  jugadorDefensor.tropasTotales = Math.max(0, jugadorDefensor.tropasTotales - perdidasDefensor);
                  console.log(` -> Tropas TOTALES ${defensorNombre}: ${jugadorDefensor.tropasTotales}`);
             }
        }
        territorio.tropas.regulares = Math.max(0, (territorio.tropas.regulares || 0) - perdidasDefensor);
        console.log(` -> Tropas EN ${territorioAtacado}: ${territorio.tropas.regulares}`);


        // Conquista
        if (resultado === 'victoria') {
            console.log(` -> ¡VICTORIA! Conquistando ${territorioAtacado}`);
            territorio.propietario = casaAtacante; // <-- Actualización Propietario
        } else {
            console.log(` -> Derrota. ${territorioAtacado} sigue siendo de ${defensorCasa || 'Neutral'}`);
        }

        // *** EMITIR ACTUALIZACIÓN ***
        // Enviar solo las partes modificadas para eficiencia
        const actualizacion = {
             territorios: { [territorioAtacado]: territorio }, // Estado actualizado del territorio
             jugadores: { // Estado actualizado de los jugadores involucrados
                 [atacante]: { tropasTotales: jugadorAtacante.tropasTotales }
             }
        };
        if (defensorNombre && gameState.jugadores[defensorNombre]) {
            actualizacion.jugadores[defensorNombre] = { tropasTotales: gameState.jugadores[defensorNombre].tropasTotales };
        }

        console.log(`[Server Batalla ${partida}] Emitiendo 'actualizar-estado-juego'.`);
        io.to(partida).emit('actualizar-estado-juego', actualizacion);
        console.log("------------------------------------------");
    }); // Fin registrar-batalla

    // --- ACCIONES NUEVAS ---
    socket.on('solicitud-reclutamiento', ({ partida, nombre, territorio: nombreTerritorio, tipoUnidad, cantidad }) => {
        console.log(`[Recluta ${partida}] Solicitud de ${nombre}: ${cantidad} ${tipoUnidad} en ${nombreTerritorio}`);
        const room = rooms[partida];
        if (!room?.gameState) return socket.emit('error-accion', "Error interno: Estado de partida no encontrado.");

        const gameState = room.gameState;
        const jugador = getEstadoJugador(gameState, nombre);
        const territorio = getTerritorio(gameState, nombreTerritorio);

        if (!jugador || !territorio) return socket.emit('error-accion', "Error interno: Jugador o territorio no encontrado.");
        if (territorio.propietario !== jugador.casa) return socket.emit('error-accion', "No puedes reclutar aquí.");
        if (cantidad <= 0) return socket.emit('error-accion', "Cantidad inválida.");

        let costoUnitario = 0;
        let esMercenario = false;
        let requierePuerto = false;
        let requiereTaller = false;
        let requiereAcademia = false; // Arryn
        let requiereArmeria = false; // Lannister (para mejora, no recluta base)
        let requiereArqueria = false; // Tully

        switch (tipoUnidad) {
            case 'regulares': costoUnitario = COSTOS.tropa; break;
            case 'mercenario': costoUnitario = COSTOS.mercenario; esMercenario = true; break;
            // Añadir mercenarios de élite si tienen UI separada
            case 'barco': costoUnitario = COSTOS.barco; requierePuerto = true; break;
            case 'catapulta': // Ejemplo maquina asedio
            case 'torreAsedio':
            case 'escorpion': costoUnitario = COSTOS.maquinaAsedio; requiereTaller = true; break;
            case 'sacerdoteLuz': // Baratheon
                 if (jugador.casa !== 'Baratheon') return socket.emit('error-accion', "Solo Baratheon recluta Sacerdotes de Luz.");
                 costoUnitario = COSTOS.sacerdote;
                 break;
            case 'caballero': // Arryn
                if (jugador.casa !== 'Arryn') return socket.emit('error-accion', "Solo Arryn recluta Caballeros así.");
                 costoUnitario = 10; // Coste especial Arryn
                 requiereAcademia = true;
                 break;
            // Añadir más unidades específicas: Martell escaramuzadores, Greyjoy ahogados, etc.
            default: return socket.emit('error-accion', `Tipo de unidad desconocido: ${tipoUnidad}`);
        }

        // --- Calcular Costo Real ---
        let descuentoEdificio = 0;
        if (tipoUnidad === 'barco' || requiereTaller) { // Barcos y Máquinas de Asedio
            if (territorio.edificios.includes('Aserradero')) descuentoEdificio = 5;
        }
        if (tipoUnidad === 'regulares') {
             if (territorio.edificios.includes('Granja')) descuentoEdificio = 1;
        }
        // Añadir descuentos de facción si los hay
        let costoTotal = Math.max(0, cantidad * (costoUnitario - descuentoEdificio));

         // --- Aplicar mejoras de coste Lannister (Armería) ---
         // ¡OJO! La armería AUMENTA el coste a cambio de un +1 permanente.
         // Esto debería ser una acción separada ("Mejorar Tropas") o un flag al reclutar.
         // Por simplicidad ahora, asumimos que no está implementado aquí.

        // --- Validaciones ---
        if (jugador.oro < costoTotal) return socket.emit('error-accion', `Oro insuficiente. Necesitas ${costoTotal}, tienes ${jugador.oro}.`);
        if (!esMercenario && (jugador.tropasReclutadasEsteTurno + cantidad > jugador.limiteReclutamientoBase)) {
             // Excepción Martell para mercenarios (límite 10 mercs aparte de los 5 regulares)
             if (!(jugador.casa === 'Martell' && esMercenario /* && contadorMercsMartell < 10 */)) {
                return socket.emit('error-accion', `Límite de reclutamiento (${jugador.limiteReclutamientoBase}) excedido.`);
             }
        }
        if (requierePuerto && !territorio.edificios.includes('Puerto')) return socket.emit('error-accion', `Necesitas un Puerto para reclutar ${tipoUnidad}.`);
        if (requiereTaller && !territorio.edificios.includes('Taller')) return socket.emit('error-accion', `Necesitas un Taller de Asedio para reclutar ${tipoUnidad}.`);
        if (requiereAcademia && !(jugador.casa === 'Arryn' && jugador.academiaConstruida)) return socket.emit('error-accion', `Necesitas una Academia de Caballería construida.`);
        // ... otras validaciones de edificios requeridos

        // --- Actualizar Estado ---
        jugador.oro -= costoTotal;
        if (!esMercenario) {
            jugador.tropasReclutadasEsteTurno += cantidad;
            // Falta añadir contador específico mercenarios Martell
        }
        // Añadir unidad al territorio
        if (!territorio.tropas[tipoUnidad]) territorio.tropas[tipoUnidad] = 0;
        territorio.tropas[tipoUnidad] += cantidad;
        // Actualizar tropas totales del jugador
        jugador.tropasTotales += cantidad;

        console.log(`[Recluta ${partida}] Éxito: ${nombre} reclutó ${cantidad} ${tipoUnidad} en ${nombreTerritorio}. Oro restante: ${jugador.oro}`);

        // --- Emitir Actualización ---
        io.to(partida).emit('actualizar-estado-juego', {
            territorios: { [nombreTerritorio]: territorio },
            jugadores: {
                [nombre]: {
                    oro: jugador.oro,
                    tropasTotales: jugador.tropasTotales,
                    tropasReclutadasEsteTurno: jugador.tropasReclutadasEsteTurno
                    // Enviar otros estados si cambian (e.g., contador mercs Martell)
                }
            }
        });
    }); // Fin solicitud-reclutamiento


    socket.on('solicitud-construccion', ({ partida, nombre, territorio: nombreTerritorio, tipoEdificio }) => {
         console.log(`[Build ${partida}] Solicitud de ${nombre}: ${tipoEdificio} en ${nombreTerritorio}`);
         const room = rooms[partida];
         if (!room?.gameState) return socket.emit('error-accion', "Error interno: Estado de partida no encontrado.");

         const gameState = room.gameState;
         const jugador = getEstadoJugador(gameState, nombre);
         const territorio = getTerritorio(gameState, nombreTerritorio);

         if (!jugador || !territorio) return socket.emit('error-accion', "Error interno: Jugador o territorio no encontrado.");
         if (territorio.propietario !== jugador.casa) return socket.emit('error-accion', "No puedes construir aquí.");

         let costoBase = COSTOS[tipoEdificio.toLowerCase().replace(' ', '')]; // 'Taller de Asedio' -> 'tallerasedio'
         if (costoBase === undefined) {
              // Intentar con nombres específicos de facción
              if (tipoEdificio === 'Atalaya' && jugador.casa === 'Arryn') costoBase = 40;
              else if (tipoEdificio === 'Academia de Caballería' && jugador.casa === 'Arryn') costoBase = COSTOS.academiaCaballeria;
              else if (tipoEdificio === 'Armería' && jugador.casa === 'Lannister') costoBase = COSTOS.armeria;
              else if (tipoEdificio === 'Arquería' && jugador.casa === 'Tully') costoBase = COSTOS.arqueria;
              // Añadir Septo Tyrell, Puerto Fluvial Tully, etc.
              else return socket.emit('error-accion', `Tipo de edificio desconocido: ${tipoEdificio}`);
         }

         // --- Calcular Costo Real ---
         let descuentoEdificio = 0;
         if (territorio.edificios.includes('Cantera')) descuentoEdificio = 5;
         // Añadir descuentos de facción si los hay
         let costoTotal = Math.max(0, costoBase - descuentoEdificio);

         // --- Validaciones ---
         if (jugador.oro < costoTotal) return socket.emit('error-accion', `Oro insuficiente. Necesitas ${costoTotal}, tienes ${jugador.oro}.`);

         // Límite de construcción Targaryen
         if (jugador.casa === 'Targaryen' && jugador.edificiosConstruidosTurno >= 2) { // Pueden 1 más de lo normal
              return socket.emit('error-accion', "Ya has construido el máximo de edificios este turno.");
         } else if (jugador.casa !== 'Targaryen' && jugador.edificiosConstruidosTurno >= 1) {
              return socket.emit('error-accion', "Ya has construido un edificio este turno.");
         }

         // Límites específicos de edificios
         const edificiosProduccion = ['Mina', 'Aserradero', 'Granja', 'Cantera'];
         if (edificiosProduccion.includes(tipoEdificio)) {
              const puedeConstruirMas = { // Quién puede construir más de 1 edificio de producción igual
                    Lannister: 'Mina',
                    Baratheon: 'Aserradero',
                    Targaryen: 'Aserradero',
                    Stark: 'Aserradero',
                    Arryn: 'Cantera',
                    Martell: 'Cantera',
                    Tully: ['Granja', 'Granja', 'Aserradero', 'Aserradero'], // Caso especial Tully
                    Tyrell: 'Granja'
              };
              const maxPermitido = (puedeConstruirMas[jugador.casa] === tipoEdificio) ? 2 : // Lógica simple, ajustar para Tully
                                   (Array.isArray(puedeConstruirMas[jugador.casa]) && puedeConstruirMas[jugador.casa].includes(tipoEdificio)) ? 2 : 1;
              const construidos = territorio.edificios.filter(e => e === tipoEdificio).length;
              if (construidos >= maxPermitido) {
                    return socket.emit('error-accion', `Ya tienes el máximo (${maxPermitido}) de ${tipoEdificio} en este territorio.`);
              }
         } else if (tipoEdificio === 'Puerto' && territorio.edificios.includes('Puerto')) {
             return socket.emit('error-accion', "Ya existe un Puerto aquí.");
         } else if (tipoEdificio === 'Castillo' && territorio.edificios.includes('Castillo')) {
             return socket.emit('error-accion', "Ya existe un Castillo aquí.");
         } // ... otras validaciones de unicidad

         // Validaciones específicas de facción
         if (tipoEdificio === 'Atalaya' && jugador.casa === 'Arryn' && !jugador.puedeConstruirAtalaya) {
             // Lógica Arryn - ¿Solo una por partida? ¿Una por territorio? Necesita estado en jugador/territorio.
             // Asumamos una por territorio por ahora
             if (territorio.edificios.includes('Atalaya')) return socket.emit('error-accion', "Ya hay una Atalaya aquí.");
         }
         if (tipoEdificio === 'Academia de Caballería' && jugador.casa === 'Arryn' && jugador.academiaConstruida) {
             return socket.emit('error-accion', "Ya has construido la Academia."); // ¿Solo 1 por jugador?
         }
         if (tipoEdificio === 'Armería' && jugador.casa === 'Lannister' && jugador.armeriaConstruida) {
             return socket.emit('error-accion', "Ya has construido la Armería."); // ¿Solo 1 por jugador?
         }

         // --- Actualizar Estado ---
         jugador.oro -= costoTotal;
         territorio.edificios.push(tipoEdificio);
         jugador.edificiosConstruidosTurno += 1;

         // Actualizar estado específico del jugador si es necesario
         if (tipoEdificio === 'Academia de Caballería' && jugador.casa === 'Arryn') jugador.academiaConstruida = true;
         if (tipoEdificio === 'Armería' && jugador.casa === 'Lannister') jugador.armeriaConstruida = true;
         if (tipoEdificio === 'Taller de maquinaria de asedio') {
              // Regla: aparece 1 máquina aleatoria gratis
              const maquinas = ['torreAsedio', 'catapulta', 'escorpion'];
              const maquinaGratis = maquinas[tirarDado(3)-1];
              if (!territorio.tropas[maquinaGratis]) territorio.tropas[maquinaGratis] = 0;
              territorio.tropas[maquinaGratis] += 1;
              jugador.tropasTotales += 1; // Asume que las máquinas cuentan como tropa total
              console.log(` > Taller construido! ${nombre} recibe 1 ${maquinaGratis} gratis.`);
         }
         // Añadir lógica Septo Tyrell, etc.

         console.log(`[Build ${partida}] Éxito: ${nombre} construyó ${tipoEdificio} en ${nombreTerritorio}. Oro restante: ${jugador.oro}`);

         // --- Emitir Actualización ---
          io.to(partida).emit('actualizar-estado-juego', {
             territorios: { [nombreTerritorio]: territorio },
             jugadores: {
                 [nombre]: {
                     oro: jugador.oro,
                     edificiosConstruidosTurno: jugador.edificiosConstruidosTurno,
                     // Enviar otros estados de jugador si cambian
                     ...(tipoEdificio === 'Academia de Caballería' && jugador.casa === 'Arryn' && { academiaConstruida: jugador.academiaConstruida }),
                     ...(tipoEdificio === 'Armería' && jugador.casa === 'Lannister' && { armeriaConstruida: jugador.armeriaConstruida }),
                     ...(tipoEdificio === 'Taller de maquinaria de asedio' && { tropasTotales: jugador.tropasTotales })
                 }
             }
         });
    }); // Fin solicitud-construccion


    // --- Avance de Acción/Turno ---
    socket.on('accion-terminada', ({ partida, nombre }) => {
        const room = rooms[partida];
        if (!room || !room.gameState || !room.players.includes(nombre)) return console.log(`[AccTerm ${partida}] Ignorado: Partida/Jugador inválido (${nombre})`);

        const gameState = room.gameState;
        if (!gameState.jugadoresAccionTerminada) gameState.jugadoresAccionTerminada = [];

        console.log(`[AccTerm ${partida}] Recibido de ${nombre}. Fase actual: ${gameState.fase}`);

        if (!gameState.jugadoresAccionTerminada.includes(nombre)) {
            gameState.jugadoresAccionTerminada.push(nombre);
            const listos = gameState.jugadoresAccionTerminada.length;
            const total = room.players.length;
            console.log(`   -> Añadido: ${nombre} (${listos}/${total}).`);

            // Notificar progreso a los clientes
            io.to(partida).emit('estado-espera-jugadores', listos < total ? `⌛ Esperando a ${total - listos} jugador(es)...` : `✅ Procesando siguiente fase...`);

            if (listos === total) {
                console.log(`   -> ¡TODOS TERMINARON! Avanzando...`);
                gameState.jugadoresAccionTerminada = []; // Reset para la siguiente acción/turno

                if (gameState.fase === 'Accion') {
                    gameState.accion++;
                    // Resetear contadores de acción por turno
                    Object.values(gameState.jugadores).forEach(j => { j.edificiosConstruidosTurno = 0; });
                    // NO resetear tropasReclutadasEsteTurno aquí, se hace en Fase Neutral

                    if (gameState.accion > 3) { // Fin de acciones de jugador, pasar a Fase Neutral
                        console.log(`   -> Fin acciones jugador, iniciando Fase Neutral...`);
                        gameState.fase = 'Neutral';
                        procesarFaseNeutral(partida); // Procesar la fase neutral inmediatamente
                    } else {
                        console.log(`   -> Avanzando a Acción ${gameState.accion}.`);
                        // Emitir solo el cambio de acción
                        io.to(partida).emit('avanzar-accion', { turno: gameState.turno, accion: gameState.accion, fase: gameState.fase });
                    }
                }
                 // (La fase Neutral se procesa y luego vuelve a 'Accion' dentro de procesarFaseNeutral)

            }
        } else {
            console.log(`   -> ${nombre} ya había terminado.`);
        }
        console.log(`--- Fin Procesamiento [AccionTerm ${partida}] para ${nombre} ---`);
    }); // Fin accion-terminada


    // --- Lógica de Fase Neutral ---
    function procesarFaseNeutral(partidaId) {
        const room = rooms[partidaId];
        if (!room?.gameState) {
            console.error(`[FaseNeutral ${partidaId}] Error crítico: No se encontró gameState.`);
            return;
        }
        const gameState = room.gameState;
        console.log(`\n=== [FaseNeutral ${partidaId}] Iniciando Turno ${gameState.turno} ===`);

        const actualizaciones = { jugadores: {}, territorios: {} }; // Para enviar cambios

        // 1. COBRO y MANTENIMIENTO
        console.log("  --- Calculando Economía ---");
        for (const nombreJugador in gameState.jugadores) {
            const jugador = gameState.jugadores[nombreJugador];
            let ingresos = 0;
            let costoMantenimiento = 0;
            let numTropasPropias = 0;

            // Recorrer TODOS los territorios para ingresos y mantenimiento
            for (const nombreTerritorio in gameState.territorios) {
                const territorio = gameState.territorios[nombreTerritorio];
                if (territorio.propietario === jugador.casa) {
                    // Ingresos por territorio
                    ingresos += territorio.oroBase;
                    // Ingresos por edificios en el territorio
                    territorio.edificios.forEach(edificio => {
                        switch (edificio) {
                            case 'Mina':
                                ingresos += (jugador.casa === 'Lannister' ? 20 : 10); // Doble para Lannister
                                break;
                            case 'Aserradero': ingresos += 5; break;
                            case 'Granja':
                                // Tyrell no cobra por granjas base, pero tiene rumor
                                // Tully produce +5 extra
                                ingresos += (jugador.casa === 'Tully' ? 10 : 5);
                                if (jugador.casa === 'Tyrell' && jugador.rumoresDesbloqueados.includes('ImpuestoGranjas')) { // Asumiendo nombre de rumor
                                    ingresos += 15;
                                }
                                break;
                            case 'Cantera': ingresos += 5; break;
                            case 'Puerto':
                                // Ingresos base + Comercio
                                ingresos += 10; // Base del puerto
                                // Comercio: +10 por CADA edificio de producción en CUALQUIER territorio propio
                                let numEdificiosProduccion = 0;
                                Object.values(gameState.territorios).forEach(tPropio => {
                                     if(tPropio.propietario === jugador.casa) {
                                         numEdificiosProduccion += tPropio.edificios.filter(e => ['Mina', 'Aserradero', 'Granja', 'Cantera'].includes(e)).length;
                                     }
                                });
                                ingresos += numEdificiosProduccion * 10;
                                break;
                             case 'Puesto Aduanero': // Tully
                                 if (jugador.casa === 'Tully') ingresos += 20;
                                 break;
                            // Añadir otros edificios que generen oro (Puerto Fluvial Tully?)
                        }
                    });

                    // Mantenimiento: Sumar tropas en este territorio
                     // Simplificación: Contamos todas las unidades como 1 tropa para mantenimiento
                     let tropasEnTerritorio = 0;
                     for(const tipoTropa in territorio.tropas) {
                         tropasEnTerritorio += territorio.tropas[tipoTropa] || 0;
                     }
                     numTropasPropias += tropasEnTerritorio;
                }
            } // Fin for territorios

             // Ingresos pasivos de facción (ej. Celtigar para Targaryen)
            if (jugador.casa === 'Targaryen' && jugador.casaValyriaCasada === 'Celtigar') { // Necesita estado de matrimonio
                ingresos += 30;
            }

            // Calcular costo mantenimiento base
            costoMantenimiento = numTropasPropias * (gameState.estadoGlobal.invierno ? 2 : 1);
            // Aplicar reducciones/aumentos de mantenimiento (Demagogo?)

            const oroAntes = jugador.oro;
            jugador.oro += ingresos;

             console.log(`  > ${jugador.nombre} (${jugador.casa}): Ingresos=${ingresos}, Mantenimiento=${costoMantenimiento} (Tropas=${numTropasPropias}), Oro Antes=${oroAntes}, Oro Post-Ingreso=${jugador.oro}`);

            // Pagar mantenimiento o desertar
            if (jugador.oro >= costoMantenimiento) {
                jugador.oro -= costoMantenimiento;
                console.log(`    >> Pagó mantenimiento. Oro Final=${jugador.oro}`);
            } else {
                 console.log(`    >> ¡ORO INSUFICIENTE! (${jugador.oro}/${costoMantenimiento}). Tropas desertarán.`);
                 jugador.oro = 0; // Pierde todo el oro si no puede pagar
                 // Lógica de deserción (Regla: 1d3 por ejército de 5+) - ¡COMPLEJA!
                 // Simplificación MUY BÁSICA: Pierde 1d3 tropas totales
                 let tropasAPerder = tirarDadoEspecial('d3');
                 console.log(`       -> Debe perder ${tropasAPerder} tropas.`);
                 // Distribuir pérdida aleatoriamente entre territorios con tropas
                 let tropasPerdidas = 0;
                 let territoriosPropiosConTropas = Object.values(gameState.territorios)
                     .filter(t => t.propietario === jugador.casa && (t.tropas?.regulares || 0) > 0); // Solo regulares por ahora

                 while (tropasPerdidas < tropasAPerder && territoriosPropiosConTropas.length > 0) {
                      let indiceTerritorio = Math.floor(Math.random() * territoriosPropiosConTropas.length);
                      let terrADesertar = territoriosPropiosConTropas[indiceTerritorio];
                      if (terrADesertar.tropas.regulares > 0) {
                           terrADesertar.tropas.regulares--;
                           jugador.tropasTotales--;
                           tropasPerdidas++;
                           console.log(`       -> Desertó 1 tropa de ${terrADesertar.nombre}.`);
                           // Registrar cambio para emitir
                            if (!actualizaciones.territorios[terrADesertar.nombre]) {
                                actualizaciones.territorios[terrADesertar.nombre] = { tropas: {} };
                            }
                           actualizaciones.territorios[terrADesertar.nombre].tropas.regulares = terrADesertar.tropas.regulares;

                           // Si el territorio queda vacío, removerlo de la lista para evitar bucle
                           if (terrADesertar.tropas.regulares === 0) {
                                territoriosPropiosConTropas.splice(indiceTerritorio, 1);
                           }
                      } else {
                            // Territorio seleccionado ya no tiene tropas, removerlo
                            territoriosPropiosConTropas.splice(indiceTerritorio, 1);
                      }
                 }
                 if (tropasPerdidas < tropasAPerder) console.warn(`    >> No se pudieron perder todas las tropas (${tropasPerdidas}/${tropasAPerder}).`);
                 console.log(`    >> Oro Final=0, Tropas Totales=${jugador.tropasTotales}`);
            }

            // Registrar cambios de jugador para emitir
             if (!actualizaciones.jugadores[nombreJugador]) actualizaciones.jugadores[nombreJugador] = {};
             actualizaciones.jugadores[nombreJugador].oro = jugador.oro;
             if (tropasPerdidas > 0) {
                 actualizaciones.jugadores[nombreJugador].tropasTotales = jugador.tropasTotales;
             }

            // Resetear contador de reclutamiento para el nuevo turno
            jugador.tropasReclutadasEsteTurno = 0;
             actualizaciones.jugadores[nombreJugador].tropasReclutadasEsteTurno = 0; // Asegurar que se envía

        } // Fin for jugadores (Economía)

        // 2. RUMORES
        console.log("  --- Verificando Rumores ---");
        for (const nombreJugador in gameState.jugadores) {
             const jugador = gameState.jugadores[nombreJugador];
             if (jugador.rumoresDesbloqueados.length < 3) {
                  const tiradaRumor = tirarDado(6);
                  console.log(`  > ${jugador.nombre} tira por Rumor: ${tiradaRumor}`);
                  if (tiradaRumor >= 4) {
                       // Éxito! Determinar cuál desbloquear
                       const tiradaQueRumor = tirarDado(6);
                       let indiceRumor = -1;
                       if (tiradaQueRumor <= 2) indiceRumor = 0;
                       else if (tiradaQueRumor <= 4) indiceRumor = 1;
                       else indiceRumor = 2;

                       // Obtener la lista de rumores de la hoja de referencia (necesitamos mapearla)
                       const RUMORES_POR_CASA = obtenerRumoresCasa(jugador.casa); // Necesitas esta función
                       if (RUMORES_POR_CASA && RUMORES_POR_CASA[indiceRumor]) {
                           const nombreRumor = RUMORES_POR_CASA[indiceRumor].nombre; // Necesitamos una estructura {nombre: "...", efecto: ...}
                           if (!jugador.rumoresDesbloqueados.includes(nombreRumor)) {
                                jugador.rumoresDesbloqueados.push(nombreRumor);
                                console.log(`    >> ¡RUMOR DESBLOQUEADO para ${jugador.nombre}! --> ${nombreRumor}`);
                                // Aplicar efecto inmediato si lo hay (ej. tropas gratis)
                                aplicarEfectoRumorInmediato(gameState, jugador, nombreRumor, actualizaciones); // Necesitas esta función
                                // Registrar cambio para emitir
                                if (!actualizaciones.jugadores[nombreJugador]) actualizaciones.jugadores[nombreJugador] = {};
                                actualizaciones.jugadores[nombreJugador].rumoresDesbloqueados = jugador.rumoresDesbloqueados;
                           } else {
                                console.log(`    >> (Ya tenía el rumor ${indiceRumor+1})`);
                           }
                       } else { console.warn(`    >> Error al obtener rumor ${indiceRumor+1} para ${jugador.casa}`); }
                  }
             }
        } // Fin for jugadores (Rumores)

        // 3. OTROS EVENTOS FASE NEUTRAL (Simplificado)
        console.log("  --- Otros Eventos ---");
         for (const nombreJugador in gameState.jugadores) {
             const jugador = gameState.jugadores[nombreJugador];
             // Ejemplo Arryn: Organizar Torneo (1/turno)
             if (jugador.casa === 'Arryn') {
                 const tiradaTorneo = tirarDado(6); // Asumimos que se hace automáticamente por ahora
                 if (tiradaTorneo >= 1) { // Siempre éxito? O necesita acción? Simplificamos a automático
                     const caballerosGanados = tirarDadoEspecial('d3');
                     console.log(`  > Arryn (${jugador.nombre}) organiza torneo y gana ${caballerosGanados} caballeros.`);
                     // Añadir caballeros a la capital u otro lugar
                     let capitalArryn = Object.values(gameState.territorios).find(t => t.casaOriginal === 'Arryn' && t.propietario === 'Arryn' && t.oroBase >= 13);
                     if (capitalArryn) {
                         if (!capitalArryn.tropas.caballeros) capitalArryn.tropas.caballeros = 0;
                         capitalArryn.tropas.caballeros += caballerosGanados;
                         jugador.tropasTotales += caballerosGanados;
                          // Registrar cambio para emitir
                          if (!actualizaciones.territorios[capitalArryn.nombre]) actualizaciones.territorios[capitalArryn.nombre] = { tropas: {} };
                          actualizaciones.territorios[capitalArryn.nombre].tropas.caballeros = capitalArryn.tropas.caballeros;
                          if (!actualizaciones.jugadores[nombreJugador]) actualizaciones.jugadores[nombreJugador] = {};
                          actualizaciones.jugadores[nombreJugador].tropasTotales = jugador.tropasTotales;
                     } else { console.warn("   >> No se encontró capital Arryn para añadir caballeros."); }
                 }
             }
              // Ejemplo Tyrell: Militantes de la Fe (si Septo construido)
              if (jugador.casa === 'Tyrell' && jugador.septoConstruido) { // Necesitamos estado 'septoConstruido'
                    const militantesGanados = tirarDadoEspecial('d3') + 1;
                    console.log(`  > Tyrell (${jugador.nombre}) recibe ${militantesGanados} militantes de la fe.`);
                    // Añadir a capital o territorio con Septo
                    let capitalTyrell = Object.values(gameState.territorios).find(t => t.casaOriginal === 'Tyrell' && t.propietario === 'Tyrell' && t.oroBase >= 15);
                    if (capitalTyrell) {
                          if (!capitalTyrell.tropas.militantes) capitalTyrell.tropas.militantes = 0;
                          capitalTyrell.tropas.militantes += militantesGanados;
                          jugador.tropasTotales += militantesGanados;
                          // Registrar cambio para emitir
                          if (!actualizaciones.territorios[capitalTyrell.nombre]) actualizaciones.territorios[capitalTyrell.nombre] = { tropas: {} };
                          actualizaciones.territorios[capitalTyrell.nombre].tropas.militantes = capitalTyrell.tropas.militantes;
                          if (!actualizaciones.jugadores[nombreJugador]) actualizaciones.jugadores[nombreJugador] = {};
                          actualizaciones.jugadores[nombreJugador].tropasTotales = jugador.tropasTotales;
                    } else { console.warn("   >> No se encontró capital Tyrell para añadir militantes."); }
              }
             // Añadir lógica Greyjoy (Alzamiento 1d2), Targaryen (Huevo 5+, Eclosión 4+), Tully (Caballería sin estandartes 4+)
         } // Fin for jugadores (Otros eventos)


        // 4. AVANZAR TURNO y FASE
        gameState.turno++;
        gameState.accion = 1;
        gameState.fase = 'Accion';
        console.log(`=== [FaseNeutral ${partidaId}] FINALIZADA. Avanzando a Turno ${gameState.turno}, Acción 1 ===\n`);

        // 5. EMITIR ESTADO FINAL DE LA FASE NEUTRAL
        // Se podría enviar solo `actualizaciones` o el estado completo
        // Enviar estado completo es más simple por ahora
        io.to(partidaId).emit('actualizar-estado-juego', gameState);
        // Y notificar explícitamente que la acción avanza para que el cliente reactive botones
        io.to(partidaId).emit('avanzar-accion', { turno: gameState.turno, accion: gameState.accion, fase: gameState.fase });

    } // Fin procesarFaseNeutral


    // --- Desconexión ---
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Disconnect: ${socket.id}. Reason: ${reason}`);
        const partidaId = socket.partidaId;
        const nombreJugador = socket.nombreJugador;

        if (partidaId && nombreJugador && rooms[partidaId]) {
            const room = rooms[partidaId];
            console.log(`[Disconnect] ${nombreJugador} se desconectó de ${partidaId}.`);

            // Eliminar de la lista activa de sockets
            delete room.playerSockets[nombreJugador];

            // Opcional: Eliminar jugador de la lista si no esperamos reconexión?
            // room.players = room.players.filter(p => p !== nombreJugador);
            // delete room.casas[nombreJugador];
            // console.log(` > Jugador ${nombreJugador} eliminado de la partida.`);

            // Notificar a los restantes (si aún queda gente)
            if (Object.keys(room.playerSockets).length > 0) {
                io.to(partidaId).emit('jugador-desconectado', nombreJugador); // Evento nuevo
                io.to(partidaId).emit('jugadores-actualizados', room.players);
                io.to(partidaId).emit('casas-actualizadas', room.casas);
            } else {
                // Si no queda nadie, eliminar la sala
                console.log(`[Server] Partida ${partidaId} vacía. Eliminando.`);
                delete rooms[partidaId];
            }
        }
    }); // Fin disconnect

}); // Fin io.on('connection')


// --- Funciones placeholder para lógica futura ---
function obtenerRumoresCasa(casa) {
    // Deberías mapear los rumores de tus hojas de referencia aquí
    // Ejemplo MUY SIMPLIFICADO
     const todosRumores = {
         Stark: [{ nombre: "Rutas Alternativas" }, { nombre: "Camada Huargos" }, { nombre: "Unicornios Skagos" }],
         Lannister: [{ nombre: "Mina Reyne" }, { nombre: "Contrabandistas" }, { nombre: "Cetro Lannister" }],
         Arryn: [{ nombre: "Someter Bárbaros" }, { nombre: "Caballeros del Águila" }, { nombre: "Mausoleo Gigantes" }],
         Tully: [{ nombre: "Hermandad Activa" }, { nombre: "Arcos Largos" }, { nombre: "Bruja Harrenhal" }],
         Tyrell: [{ nombre: "Impuesto Granjas" }, { nombre: "Caballeros Rosa" }, { nombre: "Revuelta Campesina" }],
         Baratheon: [{ nombre: "Venado Blanco" }, { nombre: "Guardia Martilladores" }, { nombre: "Sacerdotisa Roja" }],
         Martell: [{ nombre: "Flota Corsaria" }, { nombre: "Secta Pentos" }, { nombre: "Guardia del Alba" }],
         Greyjoy: [{ nombre: "Barcos Mejorados" }, { nombre: "Capitán Legendario" }, { nombre: "Trono de Piedramar" }],
         Targaryen: [{ nombre: "Guardia Real" }, { nombre: "Entrenar Jinetes" }, { nombre: "Segundo Matrimonio Valyrio" }]
     };
    return todosRumores[casa];
}

function aplicarEfectoRumorInmediato(gameState, jugador, nombreRumor, actualizaciones) {
     console.log(`    >> Aplicando efecto inmediato de Rumor: ${nombreRumor}`);
     // Lógica para añadir tropas, etc.
     let tropasGanadas = 0;
     let tipoTropa = 'regulares'; // Por defecto
     let dondeAñadir = null; // Territorio capital u otro específico

     // Encontrar capital del jugador (heurística simple)
      let capital = Object.values(gameState.territorios).find(t => t.casaOriginal === jugador.casa && t.propietario === jugador.casa && t.oroBase > 11);
      if (capital) dondeAñadir = capital.nombre;

     switch (nombreRumor) {
         // Arryn
         case "Someter Bárbaros": tropasGanadas = tirarDadoEspecial('d3') + 1; tipoTropa = 'barbaros'; break; // Necesita tipo 'barbaros'
         case "Caballeros del Águila": tropasGanadas = tirarDadoEspecial('d3') + 1; tipoTropa = 'caballerosAguila'; break; // Necesita tipo
         // Tyrell
         case "Caballeros Rosa": tropasGanadas = tirarDadoEspecial('d3') + 1; tipoTropa = 'caballerosRosa'; break; // Necesita tipo
         // Baratheon
         case "Venado Blanco": tropasGanadas = tirarDadoEspecial('d3') + 1; tipoTropa = 'caballerosVenado'; break; // Necesita tipo
         case "Guardia Martilladores": tropasGanadas = tirarDadoEspecial('d3') + 1; tipoTropa = 'martilladores'; break; // Necesita tipo
         case "Sacerdotisa Roja": /* Efecto diferente? -1 dificultad ritos */ break;
          // Martell
          case "Guardia del Alba": tropasGanadas = tirarDadoEspecial('d3') + 1; tipoTropa = 'guardiaAlba'; break; // Necesita tipo
          // Targaryen
          case "Guardia Real": tropasGanadas = tirarDadoEspecial('d3'); tipoTropa = 'guardiaReal'; break; // Necesita tipo
          // Tully
          case "Bruja Harrenhal": tropasGanadas = tirarDadoEspecial('d3'); tipoTropa = 'murcielagosGigantes'; break; // Necesita tipo
          // Stark
          case "Camada Huargos": tropasGanadas = tirarDado(4) + 1; tipoTropa = 'huargos'; break; // Necesita tipo
          case "Unicornios Skagos": tropasGanadas = tirarDadoEspecial('d3'); tipoTropa = 'unicornios'; break; // Necesita tipo

         // Otros rumores (efectos pasivos o acciones nuevas) no dan tropas inmediatamente
         default: break;
     }

     if (tropasGanadas > 0 && dondeAñadir) {
         const terr = gameState.territorios[dondeAñadir];
         if (terr) {
             if (!terr.tropas[tipoTropa]) terr.tropas[tipoTropa] = 0;
             terr.tropas[tipoTropa] += tropasGanadas;
             jugador.tropasTotales += tropasGanadas;
             console.log(`       -> Añadidas ${tropasGanadas} ${tipoTropa} a ${dondeAñadir}.`);
             // Registrar para emitir
              if (!actualizaciones.territorios[dondeAñadir]) actualizaciones.territorios[dondeAñadir] = { tropas: {} };
              actualizaciones.territorios[dondeAñadir].tropas[tipoTropa] = terr.tropas[tipoTropa];
              if (!actualizaciones.jugadores[jugador.nombre]) actualizaciones.jugadores[jugador.nombre] = {};
              actualizaciones.jugadores[jugador.nombre].tropasTotales = jugador.tropasTotales;
         } else { console.warn(`       -> No se encontró territorio ${dondeAñadir} para añadir tropas.`); }
     } else if (tropasGanadas > 0) { console.warn(`       -> No se encontró dónde añadir las tropas del rumor.`); }
}

// --- Inicio del Servidor ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor backend funcionando en http://localhost:${PORT}`);
});