const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// --- Estado del Servidor ---
const rooms = {};
/* Estructura: rooms[partidaId]: { password, players[], casas{}, playerSockets{}, estadoTerritorios{}, estadoJugadores{}, turnoActual, accionActual, jugadoresAccionTerminada[] } */

// --- DATOS INICIALES DEL JUEGO ---
const TERRITORIOS_BASE = [
    // ###########################################################
    // ### ASEGÚRATE DE QUE TU LISTA COMPLETA ESTÉ PEGADA AQUÍ ###
    // ###########################################################
    { nombre: "Isla del Oso", oro: 5, propietario: "Stark" }, { nombre: "Costa pedregosa", oro: 4, propietario: "Stark" },
    { nombre: "Los túmulos", oro: 7, propietario: "Stark" }, { nombre: "Invernalia", oro: 11, propietario: "Stark" },
    { nombre: "Fuerte terror", oro: 8, propietario: "Stark" }, { nombre: "Bastión Kar", oro: 6, propietario: "Stark" },
    { nombre: "Skagos", oro: 4, propietario: "Stark" }, { nombre: "Atalaya de la viuda", oro: 5, propietario: "Stark" },
    { nombre: "Puerto blanco", oro: 7, propietario: "Stark" }, { nombre: "Cabo Kraken", oro: 4, propietario: "Stark" },
    { nombre: "Bosque de lobos", oro: 6, propietario: "Stark" }, { nombre: "El cuello", oro: 6, propietario: "Stark" },
    { nombre: "Tribu de las montañas", oro: 4, propietario: "Stark" }, { nombre: "Los Gemelos", oro: 9, propietario: "Tully" },
    { nombre: "El Tridente", oro: 8, propietario: "Tully" }, { nombre: "Aguasdulces", oro: 12, propietario: "Tully" },
    { nombre: "Harrenhal", oro: 10, propietario: "Tully" }, { nombre: "Septo de Piedra", oro: 5, propietario: "Tully" },
    { nombre: "Varamar", oro: 5, propietario: "Tully" }, { nombre: "Poza de Doncella", oro: 8, propietario: "Tully" },
    { nombre: "Montañas de la Luna", oro: 6, propietario: "Arryn" }, { nombre: "Los Dedos", oro: 7, propietario: "Arryn" },
    { nombre: "Arco Largo", oro: 9, propietario: "Arryn" }, { nombre: "Nido de Águilas", oro: 13, propietario: "Arryn" },
    { nombre: "Puerta de la Sangre", oro: 4, propietario: "Arryn" }, { nombre: "Puerto Gaviota", oro: 10, propietario: "Arryn" },
    { nombre: "Tres Hermanas", oro: 6, propietario: "Arryn" }, { nombre: "Fuerterrojo", oro: 7, propietario: "Arryn" },
    { nombre: "El risco", oro: 6, propietario: "Lannister" }, { nombre: "Roca Casterly", oro: 16, propietario: "Lannister" },
    { nombre: "Colmillo dorado", oro: 8, propietario: "Lannister" }, { nombre: "Refugio de plata", oro: 10, propietario: "Lannister" },
    { nombre: "Crakehall", oro: 8, propietario: "Lannister" }, { nombre: "Isla Bella", oro: 6, propietario: "Lannister" },
    { nombre: "Lannisport", oro: 15, propietario: "Lannister" }, { nombre: "El Rejo", oro: 10, propietario: "Tyrell" },
    { nombre: "Aguas Negras", oro: 6, propietario: "Tyrell" }, { nombre: "Río Mander", oro: 9, propietario: "Tyrell" },
    { nombre: "Sotodeoro", oro: 9, propietario: "Tyrell" }, { nombre: "La Sidra", oro: 6, propietario: "Tyrell" },
    { nombre: "Colina Cuerno", oro: 7, propietario: "Tyrell" }, { nombre: "Altojardín", oro: 15, propietario: "Tyrell" },
    { nombre: "Antigua", oro: 11, propietario: "Tyrell" }, { nombre: "Islas Escudo", oro: 4, propietario: "Tyrell" },
    { nombre: "Bastión de Tormentas", oro: 14, propietario: "Baratheon" }, { nombre: "Tarth", oro: 8, propietario: "Baratheon" },
    { nombre: "Marcas de Dorne", oro: 8, propietario: "Baratheon" }, { nombre: "Bosque Bruma", oro: 7, propietario: "Baratheon" },
    { nombre: "Islaverde", oro: 5, propietario: "Baratheon" }, { nombre: "Bosque Alto", oro: 6, propietario: "Baratheon" },
    { nombre: "Refugio Estival", oro: 7, propietario: "Baratheon" }, { nombre: "Sepulcro del Rey", oro: 10, propietario: "Martell" },
    { nombre: "Asperon", oro: 9, propietario: "Martell" }, { nombre: "Río Sangreverde", oro: 8, propietario: "Martell" },
    { nombre: "Lanza del Sol", oro: 15, propietario: "Martell" }, { nombre: "Los Példaños", oro: 6, propietario: "Martell" },
    { nombre: "Campo Estrella", oro: 7, propietario: "Martell" }, { nombre: "Punta Zarpa Rota", oro: 5, propietario: "Targaryen" },
    { nombre: "Valle Oscuro", oro: 10, propietario: "Targaryen" }, { nombre: "Desembarco del Rey", oro: 23, propietario: "Targaryen" },
    { nombre: "Rocadragón", oro: 7, propietario: "Targaryen" }, { nombre: "Bosque Real", oro: 6, propietario: "Targaryen" },
    { nombre: "Marca Deriva", oro: 9, propietario: "Targaryen" }, { nombre: "Pyke", oro: 14, propietario: "Greyjoy" },
    { nombre: "Harlaw", oro: 10, propietario: "Greyjoy" }, { nombre: "Monte Orca", oro: 7, propietario: "Greyjoy" },
    { nombre: "Gran Wyk", oro: 9, propietario: "Greyjoy" }
];
const ORO_INICIAL_POR_DEFECTO = 50;
const TROPAS_INICIALES_POR_DEFECTO = 30;

// --- Funciones Auxiliares ---
function inicializarEstadoTerritorios() {
    const estadoTerritorios = {};
    TERRITORIOS_BASE.forEach(t => {
        estadoTerritorios[t.nombre] = { propietario: t.propietario, oro: t.oro };
    });
    console.log("[Server Init] Estado territorios inicializado.");
    return estadoTerritorios;
}
function inicializarEstadoJugadores(players, casasAsignadas) {
    const estadoJugadores = {};
    players.forEach(nombre => {
        estadoJugadores[nombre] = {
            casa: casasAsignadas[nombre] || 'Desconocida',
            tropas: TROPAS_INICIALES_POR_DEFECTO, oro: ORO_INICIAL_POR_DEFECTO
        };
    });
    console.log("[Server Init] Estado jugadores inicializado:", estadoJugadores);
    return estadoJugadores;
}

// --- Lógica Socket.IO ---
io.on('connection', (socket) => {
    console.log(`🔌 Connect: ${socket.id}`);

    // --- Eventos del Lobby ---
    socket.on('crear-partida', ({ partida, clave }) => { /* ... */ });
    socket.on('unirse-partida', ({ nombre, partida, clave }) => { /* ... */ });
    socket.on('elegir-casa', ({ partida, nombre, casa }) => { /* ... */ });
    socket.on('quitar-casa', ({ partida, nombre }) => { /* ... */ });

    // --- Inicio de Juego ---
    socket.on('iniciar-juego', ({ partida }) => { /* ... (igual que antes, inicializa estado) ... */ });

    // --- Eventos Durante el Juego ---
    socket.on('unirse-sala-juego', ({ partida, nombre }) => {
        const room = rooms[partida];
        if (room && room.players.includes(nombre)) {
            socket.join(partida);
            console.log(`[Server] 🎮 ${nombre} (${socket.id}) unido/confirmado en sala JUEGO ${partida}`);
            if (room.estadoTerritorios && room.estadoJugadores) {
                 console.log(`   -> Enviando estado actual a ${nombre}`);
                 socket.emit('actualizar-estado-juego', {
                     territorios: room.estadoTerritorios, recursos: room.estadoJugadores,
                     turno: room.turnoActual, accion: room.accionActual
                 });
            } else { console.warn(`   -> Estado juego ${partida} aún no inicializado al unirse ${nombre}.`); }
        } else { console.warn(`Intento inválido de ${nombre} para unirse a sala juego ${partida}`); }
    });

    // --- ****** PROCESAR BATALLA (CON LOGS Y CONQUISTA) ****** ---
    socket.on('registrar-batalla', (data) => {
        console.log("------------------------------------------");
        console.log(`[Server Batalla ${data.partida}] Recibido:`, data);
        const { partida, atacante, casaAtacante, territorioAtacado, resultado, perdidasAtacante, perdidasDefensor } = data;

        const room = rooms[partida];
        if (!room || !room.estadoTerritorios || !room.estadoJugadores) return console.error(`[Batalla ${partida}] ERROR: Partida o estado no encontrado.`);
        if (!room.players.includes(atacante)) return console.error(`[Batalla ${partida}] ERROR: Atacante ${atacante} no válido.`);
        const territorio = room.estadoTerritorios[territorioAtacado];
        if (!territorio) return console.error(`[Batalla ${partida}] ERROR: Territorio ${territorioAtacado} no existe.`);
        const defensorCasa = territorio.propietario;
        if (defensorCasa === casaAtacante) return console.warn(`[Batalla ${partida}] WARN: Ataque a territorio propio.`);

        let defensorNombre = Object.keys(room.estadoJugadores).find(j => room.estadoJugadores[j].casa === defensorCasa);
        console.log(`[Batalla ${partida}] ${atacante}(${casaAtacante}) vs ${defensorNombre || 'N/A'}(${defensorCasa || 'Neutral'}) en ${territorioAtacado}`);

        const recursosActualizados = {};

        // Actualizar Tropas Atacante
        if (room.estadoJugadores[atacante]) {
            const tropasAntes = room.estadoJugadores[atacante].tropas;
            room.estadoJugadores[atacante].tropas = Math.max(0, tropasAntes - perdidasAtacante);
            recursosActualizados[atacante] = { ...room.estadoJugadores[atacante] }; // Copia estado COMPLETO (incluye oro aunque no cambie aquí)
            console.log(` -> Tropas ${atacante}: ${tropasAntes} -> ${room.estadoJugadores[atacante].tropas}`);
        } else { console.error(`[Batalla ${partida}] Atacante ${atacante} no encontrado en estadoJugadores.`); }

        // Actualizar Tropas Defensor
        if (defensorNombre && room.estadoJugadores[defensorNombre]) {
            const tropasAntes = room.estadoJugadores[defensorNombre].tropas;
            room.estadoJugadores[defensorNombre].tropas = Math.max(0, tropasAntes - perdidasDefensor);
             recursosActualizados[defensorNombre] = { ...room.estadoJugadores[defensorNombre] }; // Copia estado COMPLETO
            console.log(` -> Tropas ${defensorNombre}: ${tropasAntes} -> ${room.estadoJugadores[defensorNombre].tropas}`);
        } else { console.log(" -> No se encontró jugador defensor para actualizar tropas."); }

        // *** LÓGICA DE CONQUISTA (CON LOGS) ***
        if (resultado === 'victoria') {
            console.log(` -> [Batalla ${partida}] ¡VICTORIA!`);
            console.log(`    -> Dueño ANTES de ${territorioAtacado}: ${territorio.propietario}`);
            territorio.propietario = casaAtacante; // <-- LA ACTUALIZACIÓN OCURRE AQUÍ
            console.log(`    -> Dueño DESPUÉS de ${territorioAtacado}: ${territorio.propietario} (Debería ser ${casaAtacante})`);
        } else {
            console.log(` -> [Batalla ${partida}] Derrota. ${territorioAtacado} sigue siendo de ${defensorCasa}`);
        }
        // *** FIN LÓGICA DE CONQUISTA ***

        // Emitir actualización a TODOS
        const estadoParaEmitir = {
            territorios: room.estadoTerritorios, // Envía el estado COMPLETO de territorios
            recursos: recursosActualizados        // Envía solo los recursos de jugadores afectados
        };
        console.log(`[Server Batalla ${partida}] Emitiendo 'actualizar-estado-juego'. Dueño de ${territorioAtacado} en payload: ${estadoParaEmitir.territorios[territorioAtacado]?.propietario}`);
        io.to(partida).emit('actualizar-estado-juego', estadoParaEmitir);
        console.log("------------------------------------------");

    }); // Fin socket.on('registrar-batalla')
     // --- ****** FIN LISTENER BATALLA ****** ---


    // --- Avance de Acción/Turno (con logs) ---
    socket.on('accion-terminada', ({ partida, nombre }) => {
        const room = rooms[partida];
        if (!room || !room.players || !room.players.includes(nombre)) return console.log(`[AccTerm ${partida}] Ignorado: Partida/Jugador inválido (${nombre})`);
        if (!room.jugadoresAccionTerminada) room.jugadoresAccionTerminada = [];
        console.log(`[AccTerm ${partida}] Recibido de ${nombre}.`);
        if (!room.jugadoresAccionTerminada.includes(nombre)) {
            room.jugadoresAccionTerminada.push(nombre);
            const listos = room.jugadoresAccionTerminada.length; const total = room.players.length;
            console.log(`   -> Añadido: ${nombre} (${listos}/${total}).`);
            io.to(partida).emit('estado-espera-jugadores', listos < total ? `⌛ Esperando a ${total - listos}...` : `✅ Procesando...`);
            console.log(`   -> ¿Listos (${listos}) === Total (${total})? --> ${listos === total}`);
            if (listos === total) {
                console.log(`   -> ¡TODOS TERMINARON! Avanzando...`);
                room.jugadoresAccionTerminada = []; // Reset
                room.accionActual = (room.accionActual || 0) + 1; room.turnoActual = room.turnoActual || 1;
                if (room.accionActual > 4) { room.accionActual = 1; room.turnoActual++; }
                console.log(`   -> Nuevo estado SERVIDOR: T${room.turnoActual}, A${room.accionActual}. Emitiendo 'avanzar-accion'...`);
                io.to(partida).emit('avanzar-accion', { turno: room.turnoActual, accion: room.accionActual });
            }
        } else { console.log(`   -> ${nombre} ya había terminado.`); }
        console.log(`--- Fin Procesamiento [AccionTerm ${partida}] para ${nombre} ---`);
    });

    // --- Desconexión ---
    socket.on('disconnect', (reason) => { /* ... (código anterior sin cambios) ... */ });

}); // Fin io.on('connection')

// --- Inicio del Servidor ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`🚀 Servidor backend funcionando en http://localhost:${PORT}`); });