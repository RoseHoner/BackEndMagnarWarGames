const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

// Estructura de datos
const rooms = {}; // { partida: { password, players: [], casas: {} } }

io.on('connection', (socket) => {
  console.log('Jugador conectado');

  // Crear partida
  socket.on('crear-partida', ({ nombre, partida, clave }) => {
    if (rooms[partida]) {
      socket.emit('error', 'La partida ya existe');
    } else {
      rooms[partida] = {
        password: clave,
        players: [nombre],
        casas: {}
      };
      socket.join(partida);
      socket.emit('partida-creada', {
        link: `http://localhost:5500/lobby.html?partida=${partida}&clave=${clave}`,
        jugadores: rooms[partida].players
      });
      io.to(partida).emit('jugadores-actualizados', rooms[partida].players);
    }
  });

  // Unirse a partida
  socket.on('unirse-partida', ({ nombre, partida, clave }) => {
    const room = rooms[partida];
    //verificar si la partida existe
    if (!room) return socket.emit('error', 'La partida no existe');
    //verificar si la contraseña es correcta
    if (room.password !== clave) return socket.emit('error', 'Contraseña incorrecta');
  
    if (!room.players.includes(nombre)) {
      room.players.push(nombre);
    }
  
    socket.partida = partida;  // <-- IMPORTANTE
    socket.nombre = nombre;    // <-- IMPORTANTE
  
    socket.join(partida);
    io.to(partida).emit('jugadores-actualizados', room.players);
    io.to(partida).emit('casas-actualizadas', room.casas);
  });

  // Elegir casa
  socket.on('elegir-casa', ({ partida, nombre, casa }) => {
    const room = rooms[partida];
    if (!room) return;

    if (!room.casas) room.casas = {};
    const yaElegida = Object.values(room.casas).includes(casa);
    if (yaElegida) return socket.emit('error', `La casa ${casa} ya ha sido elegida`);

    room.casas[nombre] = casa;
    io.to(partida).emit('casas-actualizadas', room.casas);
  });

  // Quitar casa
  socket.on('quitar-casa', ({ partida, nombre }) => {
    const room = rooms[partida];
    if (!room || !room.casas) return;

    delete room.casas[nombre];
    io.to(partida).emit('casas-actualizadas', room.casas);
  });

  // Desconexión (por si quieres mejorar en el futuro)
  socket.on('disconnect', () => {
    const { partida, nombre } = socket;
    if (!partida || !nombre) return;
  
    const room = rooms[partida];
    if (!room) return;
  
    // Eliminar jugador y su casa
    room.players = room.players.filter(j => j !== nombre);
    if (room.casas && room.casas[nombre]) {
      delete room.casas[nombre];
    }
  
    // Si ya no queda nadie en la partida, la eliminamos
    if (room.players.length === 0) {
      delete rooms[partida];
      console.log(`🔥 Partida "${partida}" eliminada por quedarse vacía`);
      return;
    }
  
    // Si aún quedan jugadores, actualizamos la info
    io.to(partida).emit('jugadores-actualizados', room.players);
    io.to(partida).emit('casas-actualizadas', room.casas);
  });
});

server.listen(3000, () => {
  console.log('Servidor backend funcionando en http://localhost:3000');
});