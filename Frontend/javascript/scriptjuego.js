const socket = io('http://192.168.1.133:3000');

const partida = new URLSearchParams(window.location.search).get('partida');
const params = new URLSearchParams(window.location.search);
const nombre = params.get('nombre');

const territorios = [
    { nombre: "Isla del Oso", oro: 5, propietario: "Stark" },
    { nombre: "Costa pedregosa", oro: 4, propietario: "Stark" },
    { nombre: "Los túmulos", oro: 7, propietario: "Stark" },
    { nombre: "Invernalia", oro: 11, propietario: "Stark" },
    { nombre: "Fuerte terror", oro: 8, propietario: "Stark" },
    { nombre: "Bastión Kar", oro: 6, propietario: "Stark" },
    { nombre: "Skagos", oro: 4, propietario: "Stark" },
    { nombre: "Atalaya de la viuda", oro: 5, propietario: "Stark" },
    { nombre: "Puerto blanco", oro: 7, propietario: "Stark" },
    { nombre: "Cabo Kraken", oro: 4, propietario: "Stark" },
    { nombre: "Bosque de lobos", oro: 6, propietario: "Stark" },
    { nombre: "El cuello", oro: 6, propietario: "Stark" },
    { nombre: "Tribu de las montañas", oro: 4, propietario: "Stark" },
    { nombre: "Los Gemelos", oro: 9, propietario: "Tully" },
    { nombre: "El Tridente", oro: 8, propietario: "Tully" },
    { nombre: "Aguasdulces", oro: 12, propietario: "Tully" },
    { nombre: "Harrenhal", oro: 10, propietario: "Tully" },
    { nombre: "Septo de Piedra", oro: 5, propietario: "Tully" },
    { nombre: "Varamar", oro: 5, propietario: "Tully" },
    { nombre: "Poza de Doncella", oro: 8, propietario: "Tully" },
    { nombre: "Montañas de la Luna", oro: 6, propietario: "Arryn" },
    { nombre: "Los Dedos", oro: 7, propietario: "Arryn" },
    { nombre: "Arco Largo", oro: 9, propietario: "Arryn" },
    { nombre: "Nido de Águilas", oro: 13, propietario: "Arryn" },
    { nombre: "Puerta de la Sangre", oro: 4, propietario: "Arryn" },
    { nombre: "Puerto Gaviota", oro: 10, propietario: "Arryn" },
    { nombre: "Tres Hermanas", oro: 6, propietario: "Arryn" },
    { nombre: "Fuerterrojo", oro: 7, propietario: "Arryn" },
    { nombre: "El risco", oro: 6, propietario: "Lannister" },
    { nombre: "Roca Casterly", oro: 16, propietario: "Lannister" },
    { nombre: "Colmillo dorado", oro: 8, propietario: "Lannister" },
    { nombre: "Refugio de plata", oro: 10, propietario: "Lannister" },
    { nombre: "Crakehall", oro: 8, propietario: "Lannister" },
    { nombre: "Isla Bella", oro: 6, propietario: "Lannister" },
    { nombre: "Lannisport", oro: 15, propietario: "Lannister" },
    { nombre: "El Rejo", oro: 10, propietario: "Tyrrel" },
    { nombre: "Aguas Negras", oro: 6, propietario: "Tyrrel" },
    { nombre: "Río Mander", oro: 9, propietario: "Tyrrel" },
    { nombre: "Sotodeoro", oro: 9, propietario: "Tyrrel" },
    { nombre: "La Sidra", oro: 6, propietario: "Tyrrel" },
    { nombre: "Colina Cuerno", oro: 7, propietario: "Tyrrel" },
    { nombre: "Altojardín", oro: 15, propietario: "Tyrrel" },
    { nombre: "Antigua", oro: 11, propietario: "Tyrrel" },
    { nombre: "Islas Escudo", oro: 4, propietario: "Tyrrel" },
    { nombre: "Bastión de Tormentas", oro: 14, propietario: "Baratheon" },
    { nombre: "Tarth", oro: 8, propietario: "Baratheon" },
    { nombre: "Marcas de Dorne", oro: 8, propietario: "Baratheon" },
    { nombre: "Bosque Bruma", oro: 7, propietario: "Baratheon" },
    { nombre: "Islaverde", oro: 5, propietario: "Baratheon" },
    { nombre: "Bosque Alto", oro: 6, propietario: "Baratheon" },
    { nombre: "Refugio Estival", oro: 7, propietario: "Baratheon" },
    { nombre: "Sepulcro del Rey", oro: 10, propietario: "Martell" },
    { nombre: "Asperon", oro: 9, propietario: "Martell" },
    { nombre: "Río Sangreverde", oro: 8, propietario: "Martell" },
    { nombre: "Lanza del Sol", oro: 15, propietario: "Martell" },
    { nombre: "Los Példaños", oro: 6, propietario: "Martell" },
    { nombre: "Campo Estrella", oro: 7, propietario: "Martell" },
    { nombre: "Punta Zarpa Rota", oro: 5, propietario: "Targaryen" },
    { nombre: "Valle Oscuro", oro: 10, propietario: "Targaryen" },
    { nombre: "Desembarco del Rey", oro: 23, propietario: "Targaryen" },
    { nombre: "Rocadragón", oro: 7, propietario: "Targaryen" },
    { nombre: "Bosque Real", oro: 6, propietario: "Targaryen" },
    { nombre: "Marca Deriva", oro: 9, propietario: "Targaryen" },
    { nombre: "Pyke", oro: 14, propietario: "Greyjoy" },
    { nombre: "Harlaw", oro: 10, propietario: "Greyjoy" },
    { nombre: "Monte Orca", oro: 7, propietario: "Greyjoy" },
    { nombre: "Gran Wyk", oro: 9, propietario: "Greyjoy" }
  ];

socket.emit('unirse-partida', {
  nombre,
  partida,
  clave: "" // no pedimos clave en esta etapa, pero es requerido por el backend
});

let jugadoresListos = []; // array con los nombres que han pulsado
let turno = 1;
let accion = 1;

let casas = {};
casas = JSON.parse(localStorage.getItem('casasGlobales')) || {};

function actualizarTurnoYAccion() {
    document.getElementById('turno-jugador').textContent = `Turno ${turno}`;
  
    if (accion === 4) {
      document.getElementById('accion-jugador').textContent = "Fase Neutral";
    } else {
      document.getElementById('accion-jugador').textContent = `Acción ${accion}`;
    }
  }
function setLogoPorCasa(casa) {
    const logos = {
        Stark: '../imgs/logos/casas/stark.png',
        Lannister: '../imgs/logos/casas/lannister.png',
        Targaryen: '../imgs/logos/casas/targaryen.png',
        Baratheon: '../imgs/logos/casas/baratheon.png',
        Greyjoy: '../imgs/logos/casas/greyjoy.png',
        Martell: '../imgs/logos/casas/martell.png',
        Tyrell: '../imgs/logos/casas/tyrrel.png',
        Arryn: '../imgs/logos/casas/arryn.png',
        Tully: '../imgs/logos/casas/tully.png'
      };

    const rutaLogo = logos[casa];
    const logo = document.getElementById('logo-casa');
    
    if (rutaLogo && logo) {
    logo.src = rutaLogo;
    logo.alt = `Logo de la casaaaa ${casa}`;
    }
}

function setFondoPorCasa(casa) {
    const fondos = {
      Stark: 'url("../imgs/FondosCasas/stark.png")',
      Lannister: 'url("../imgs/FondosCasas/lannister.png")',
      Targaryen: 'url("../imgs/FondosCasas/targaryen.png")',
      Baratheon: 'url("../imgs/FondosCasas/baratheon.png")',
      Greyjoy: 'url("../imgs/FondosCasas/greyjoy.png")',
      Martell: 'url("../imgs/FondosCasas/martell.png")',
      Tyrell: 'url("../imgs/FondosCasas/tyrrel.png")',
      Arryn: 'url("../imgs/FondosCasas/arryn.png")',
      Tully: 'url("../imgs/FondosCasas/tully.png")'
    };
  
    const fondo = fondos[casa] || 'none';
  
    document.body.style.backgroundImage = fondo;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
  }
  

function siguienteAccion() {
    const params = new URLSearchParams(window.location.search);
    const nombre = params.get('nombre');
    let casas = JSON.parse(localStorage.getItem('casasGlobales')) || {};
  
    // ✅ Marcar a este jugador como listo
    if (casas[nombre]) {
      casas[nombre].ready = true;
      localStorage.setItem('casasGlobales', JSON.stringify(casas));
    }
  
    // 🔒 Ocultar el botón mientras espera
    document.getElementById('boton-accion').style.display = 'none';
    document.getElementById('estado-turno').textContent = "⌛ Esperando a los demás jugadores...";
  
    // ✅ Verificar cada segundo si TODOS están ready
    const intervaloCheck = setInterval(() => {
        verificarEstadoReady()
      casas = JSON.parse(localStorage.getItem('casasGlobales')) || {};
      const todosListos = Object.values(casas).every(j => j.ready === true);
  
      if (todosListos) {
        clearInterval(intervaloCheck); // 🧹 parar verificación
  
        // ✅ Avanzar acción o turno
        avanzarAccion();
  
        // 🔁 Reiniciar ready a false para todos
        for (const jugador in casas) {
          casas[jugador].ready = false;
        }
        localStorage.setItem('casasGlobales', JSON.stringify(casas));
  
        // 👁️ Mostrar el botón y limpiar mensaje
        document.getElementById('boton-accion').style.display = 'inline-block';
        document.getElementById('estado-turno').textContent = "";
      }
    }, 1000); // verifica cada 1 segundo
  }
  

  function avanzarAccion() {
    accion++;
    if (accion > 4) {
      accion = 1;
      turno++;
  
      const nombre = new URLSearchParams(window.location.search).get('nombre');
      const casa = new URLSearchParams(window.location.search).get('casa');
  
      let oro = parseInt(localStorage.getItem(`oroDe-${nombre}`) || '0');
      const tropas = parseInt(localStorage.getItem(`tropasDe-${nombre}`) || '0');
  
      const territoriosPropios = territorios.filter(t => t.propietario === casa);
      const totalOro = territoriosPropios.reduce((sum, t) => sum + t.oro, 0);
  
      oro += totalOro;
      oro -= tropas;
      if (oro < 0) oro = 0;
  
      localStorage.setItem(`oroDe-${nombre}`, oro);
      document.getElementById('cantidad-oro').textContent = oro;
      document.getElementById('oro-jugador').style.display = 'block';
    }
  
    actualizarTurnoYAccion();
  }

  function verificarEstadoReady() {
    const params = new URLSearchParams(window.location.search);
    const nombre = params.get('nombre');
  
    setInterval(() => {
      const casas = JSON.parse(localStorage.getItem('casasGlobales')) || {};
      const yo = casas[nombre];
  
      const boton = document.getElementById('boton-accion');
  
      if (yo && yo.ready === false && boton.style.display === 'none') {
        // 🔥 Avanzar acción localmente si no lo había hecho
        avanzarAccion();
  
        // 🔁 Mostrar el botón
        boton.style.display = 'inline-block';
        document.getElementById('estado-turno').textContent = "";
      }
    }, 100); // verifica cada segundo
  }
  
  
  

// Mostrar al cargar
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const casa = params.get('casa');
    setFondoPorCasa(casa);
    setLogoPorCasa(casa);
    actualizarTurnoYAccion();
});

const casa = params.get('casa');

const emojiDeCasa = {
  Stark: "🐺",
  Lannister: "🦁",
  Targaryen: "🐉",
  Baratheon: "🦌",
  Greyjoy: "🐙",
  Martell: "🌞",
  Tyrell: "🌹",
  Arryn: "🦅",
  Tully: "🐟"
};

console.log("🧍 Nombre:", nombre);
console.log("🏰 Casa desde URL:", casa);

const emoji = emojiDeCasa[casa];
document.getElementById('emoji-casa').textContent = emoji || "❓";
  
  // FUNCIONALIDAD DE ORO
  function confirmarOro() {
    const oro = parseInt(document.getElementById('oro-inicial').value);
    if (isNaN(oro) || oro < 0) {
      alert("Pon una cantidad válida de oro.");
      return;
    }
    const nombre = new URLSearchParams(window.location.search).get('nombre');
    localStorage.setItem(`oroDe-${nombre}`, oro);
    document.getElementById('cantidad-oro').textContent = oro;
    document.getElementById('oro-jugador').style.display = 'block';
  
    document.getElementById('ventana-oro').style.display = 'none';
    document.getElementById('ventana-tropas').style.display = 'block'; // mostrar siguiente

  }
  
  function confirmarTropas() {
    const tropas = parseInt(document.getElementById('tropas-inicial').value);
    if (isNaN(tropas) || tropas < 0) {
      alert("Pon una cantidad válida de tropas.");
      return;
    }
  
    localStorage.setItem(`tropasDe-${nombre}`, tropas);
    document.getElementById('cantidad-tropas').textContent = tropas;
    document.getElementById('tropas-jugador').style.display = 'block';
  
    document.getElementById('ventana-tropas').style.display = 'none';

    checkMostrarBotonAccion();
  }

  function checkMostrarBotonAccion() {
    const oro = localStorage.getItem('oro');
    const tropas = localStorage.getItem('tropas');
  
    if (oro && tropas) {
      document.getElementById('boton-accion').style.display = 'inline-block';
    }
  }

  socket.on('todos-listos', () => {
  
    actualizarTurnoYAccion();
  
    document.getElementById('boton-accion').style.display = 'inline-block';
    document.getElementById('estado-turno').textContent = "";
  });

  socket.on('jugadores-listos', ({ listos, total }) => {
    const faltan = total - listos;
    document.getElementById('estado-turno').textContent = 
      faltan > 0
        ? `⌛ Esperando a los demás jugadores... (${faltan} faltan)`
        : `✅ Todos listos`;
  });
  
  
  