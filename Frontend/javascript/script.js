const socket = io('http://192.168.1.133:3000');

function crearPartida() {
  const nombre = document.getElementById('nombre').value;
  const partida = document.getElementById('partida').value;
  const clave = document.getElementById('clave').value;

  socket.emit('crear-partida', { nombre, partida, clave });

  // Redirige al lobby con los datos
  const params = new URLSearchParams({ nombre, partida, clave });
  window.location.href = `lobby.html?${params.toString()}`;
}

function unirsePartida() {
  const nombre = document.getElementById('nombre').value;
  const partida = document.getElementById('partida').value;
  const clave = document.getElementById('clave').value;

  // Redirige directamente al lobby
  const params = new URLSearchParams({ nombre, partida, clave });
  window.location.href = `lobby.html?${params.toString()}`;
}