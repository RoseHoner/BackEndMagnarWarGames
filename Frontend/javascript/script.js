const socket = io('http://192.168.1.133:3000');

function crearPartida() {
  const nombre = document.getElementById('nombre').value;
  const partida = document.getElementById('partida').value;
  const clave = document.getElementById('clave').value;

  localStorage.setItem('nombreJugador', nombre); // 👈 AÑADIR AQUÍ

  socket.emit('crear-partida', { nombre, partida, clave });

  const params = new URLSearchParams({ nombre, partida, clave });
  window.location.href = `lobby.html?partida=${partida}&clave=${clave}&nombre=${nombre}&host=true`;
}

function unirsePartida() {
  const nombre = document.getElementById('nombre').value;
  const partida = document.getElementById('partida').value;
  const clave = document.getElementById('clave').value;

  localStorage.setItem('nombreJugador', nombre); // 👈 AÑADIR AQUÍ

  const params = new URLSearchParams({ nombre, partida, clave });
  window.location.href = `lobby.html?${params.toString()}`;
}