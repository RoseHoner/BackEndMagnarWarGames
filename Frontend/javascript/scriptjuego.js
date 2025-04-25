// --- Conexión Socket.IO ---
const socket = io('http://192.168.1.133:3000'); // Revisa URL

// --- Parámetros URL ---
const params = new URLSearchParams(window.location.search);
const partida = params.get('partida');
const nombre = params.get('nombre');
const casa = params.get('casa');

// --- Datos Juego (Se poblará/actualizará desde el servidor) ---
// Array inicial con los territorios base - LISTA COMPLETA PEGADA
let territorios = [
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

let turno = 1;
let accion = 1;

// --- Funciones UI ---
function actualizarTurnoYAccion() {
    const turnoEl = document.getElementById('turno-jugador');
    const accionEl = document.getElementById('accion-jugador');
    if (turnoEl) turnoEl.textContent = `Turno ${turno}`;
    if (accionEl) {
        const nombresAccion = ["Acción 1", "Acción 2", "Acción 3", "Fase Neutral"];
        accionEl.textContent = nombresAccion[accion - 1] || `Acción ${accion}`;
    }
}

function setLogoPorCasa(casaNombre) {
    const logoImgEl = document.getElementById('logo-casa');
    if (!logoImgEl) { console.error("[SetLogo] Elemento 'logo-casa' NO ENCONTRADO!"); return; }
    const logos = { Stark: '../imgs/logos/casas/stark.png', Lannister: '../imgs/logos/casas/lannister.png', Targaryen: '../imgs/logos/casas/targaryen.png', Baratheon: '../imgs/logos/casas/baratheon.png', Greyjoy: '../imgs/logos/casas/greyjoy.png', Martell: '../imgs/logos/casas/martell.png', Tyrell: '../imgs/logos/casas/tyrell.png', Arryn: '../imgs/logos/casas/arryn.png', Tully: '../imgs/logos/casas/tully.png' };
    const rutaLogo = logos[casaNombre];
    if (rutaLogo) {
        logoImgEl.src = rutaLogo; logoImgEl.alt = `Logo ${casaNombre}`; logoImgEl.style.display = 'block';
    } else { console.warn(`[UI] No logo for: ${casaNombre}`); logoImgEl.style.display = 'none'; }
}

function setFondoPorCasa(casaNombre) {
     const fondos = { Stark: 'url("../imgs/FondosCasas/stark.png")', Lannister: 'url("../imgs/FondosCasas/lannister.png")', Targaryen: 'url("../imgs/FondosCasas/targaryen.png")', Baratheon: 'url("../imgs/FondosCasas/baratheon.png")', Greyjoy: 'url("../imgs/FondosCasas/greyjoy.png")', Martell: 'url("../imgs/FondosCasas/martell.png")', Tyrell: 'url("../imgs/FondosCasas/tyrell.png")', Arryn: 'url("../imgs/FondosCasas/arryn.png")', Tully: 'url("../imgs/FondosCasas/tully.png")' };
     const fondo = fondos[casaNombre] || 'url("../imgs/mapa/mapafinal.jpeg")';
     document.body.style.backgroundImage = fondo; document.body.style.backgroundSize = 'cover';
     document.body.style.backgroundPosition = 'center center'; document.body.style.backgroundRepeat = 'no-repeat';
}

// --- Funciones Lógica Juego ---
function confirmarOro() {
    const oroInput = document.getElementById('oro-inicial');
    const cantidadOroEl = document.getElementById('cantidad-oro');
    const oroJugadorDiv = document.getElementById('oro-jugador');
    const ventanaOroEl = document.getElementById('ventana-oro');
    const ventanaTropasEl = document.getElementById('ventana-tropas');
    if (!oroInput || !cantidadOroEl || !oroJugadorDiv || !ventanaOroEl || !ventanaTropasEl) return console.error("Error confirmarOro: Faltan elementos.");
    const oro = parseInt(oroInput.value);
    if (isNaN(oro) || oro < 0) return alert("Oro inválido.");
    localStorage.setItem(`oroDe-${nombre}`, oro); // Guardar localmente
    cantidadOroEl.textContent = oro; oroJugadorDiv.style.display = 'flex';
    ventanaOroEl.style.display = 'none'; ventanaTropasEl.style.display = 'block';
    console.log(`[Juego] Oro inicial: ${oro}`);
}

function confirmarTropas() {
    const tropasInput = document.getElementById('tropas-inicial');
    const cantidadTropasEl = document.getElementById('cantidad-tropas');
    const tropasJugadorDiv = document.getElementById('tropas-jugador');
    const ventanaTropasEl = document.getElementById('ventana-tropas');
    if (!tropasInput || !cantidadTropasEl || !tropasJugadorDiv || !ventanaTropasEl) return console.error("Error confirmarTropas: Faltan elementos.");
    const tropas = parseInt(tropasInput.value);
    if (isNaN(tropas) || tropas < 0) return alert("Tropas inválidas.");
    localStorage.setItem(`tropasDe-${nombre}`, tropas); // Guardar localmente
    cantidadTropasEl.textContent = tropas; tropasJugadorDiv.style.display = 'flex';
    ventanaTropasEl.style.display = 'none';
    console.log(`[Juego] Tropas iniciales: ${tropas}`);
    checkMostrarBotonAccion(); // Mostrar botón siguiente acción
}

function checkMostrarBotonAccion() {
    const botonAccionEl = document.getElementById('boton-accion');
    const oroGuardado = localStorage.getItem(`oroDe-${nombre}`);
    const tropasGuardadas = localStorage.getItem(`tropasDe-${nombre}`);
    if (botonAccionEl && oroGuardado !== null && tropasGuardadas !== null) {
        botonAccionEl.style.display = 'inline-block';
    } else if (botonAccionEl) { botonAccionEl.style.display = 'none'; }
}

function siguienteAccion() {
    const botonAccionEl = document.getElementById('boton-accion');
    const estadoTurnoEl = document.getElementById('estado-turno');
    console.log(`[${nombre}] Emitiendo 'accion-terminada'...`);
    socket.emit('accion-terminada', { partida, nombre });
    if (botonAccionEl) botonAccionEl.style.display = 'none';
    if (estadoTurnoEl) estadoTurnoEl.textContent = "⌛ Esperando...";
}

function avanzarAccionLocalmente() {
    accion++;
    if (accion > 4) { accion = 1; turno++; calcularYActualizarOroFinTurno(); }
    actualizarTurnoYAccion();
    const botonAccionEl = document.getElementById('boton-accion');
    const estadoTurnoEl = document.getElementById('estado-turno');
    if (botonAccionEl) botonAccionEl.style.display = 'inline-block';
    if (estadoTurnoEl) estadoTurnoEl.textContent = "";
    console.log(`[${nombre}] Avanzado localmente a T${turno}, A${accion}`);
}

function calcularYActualizarOroFinTurno() {
     const cantidadOroEl = document.getElementById('cantidad-oro');
     const oroJugadorDiv = document.getElementById('oro-jugador');
     let oroActual = parseInt(localStorage.getItem(`oroDe-${nombre}`) || '0');
     const tropasActuales = parseInt(localStorage.getItem(`tropasDe-${nombre}`) || '0');
     // Usa el array 'territorios' actualizado por el servidor
     const territoriosPropios = territorios.filter(t => t.propietario === casa);
     const oroGenerado = territoriosPropios.reduce((sum, t) => sum + t.oro, 0);
     let oroNeto = Math.max(0, oroActual + oroGenerado - tropasActuales);
     localStorage.setItem(`oroDe-${nombre}`, oroNeto);
     if (cantidadOroEl) cantidadOroEl.textContent = oroNeto;
     if (oroJugadorDiv && oroJugadorDiv.style.display !== 'flex') oroJugadorDiv.style.display = 'flex';
     console.log(`Fin T${turno - 1} para ${nombre}: Oro->${oroNeto}(G:${oroGenerado},M:${tropasActuales})`);
}

// --- Modal Batalla ---
function poblarTerritoriosAtacables() {
    const selectEl = document.getElementById('select-territorio-atacado');
    if (!selectEl) return console.error("Select territorios no encontrado.");
    selectEl.innerHTML = '<option value="">-- Selecciona territorio --</option>';
    // Usar el array 'territorios' actualizado por el servidor
    territorios.filter(t => t.propietario !== casa && t.propietario)
               .sort((a, b) => a.nombre.localeCompare(b.nombre))
               .forEach(t => {
                   const option = document.createElement('option');
                   option.value = t.nombre; option.textContent = `${t.nombre} (${t.propietario})`;
                   selectEl.appendChild(option);
               });
}
function abrirModalBatalla() {
    const modalEl = document.getElementById('modal-batalla');
    if (!modalEl) return console.error("Modal batalla no encontrado.");
    poblarTerritoriosAtacables();
    // Resetear valores
    const selectEl = document.getElementById('select-territorio-atacado'); if(selectEl) selectEl.value = "";
    const radioVic = document.querySelector('input[name="resultado-batalla"][value="victoria"]'); if(radioVic) radioVic.checked = true;
    const inputAtac = document.getElementById('input-perdidas-atacante'); if(inputAtac) inputAtac.value = "0";
    const inputDef = document.getElementById('input-perdidas-defensor'); if(inputDef) inputDef.value = "0";
    modalEl.style.display = 'block';
}
function cerrarModalBatalla() {
    const modalEl = document.getElementById('modal-batalla'); if (modalEl) modalEl.style.display = 'none';
}
function ajustarPerdidas(tipo, cantidad) {
    const inputId = `input-perdidas-${tipo}`; const input = document.getElementById(inputId);
    if (!input) return console.error(`Input ${inputId} no encontrado.`);
    let v = parseInt(input.value) || 0; v = Math.max(0, v + cantidad); input.value = v;
}
function confirmarBatalla() {
    const selectEl = document.getElementById('select-territorio-atacado');
    const inputAtacEl = document.getElementById('input-perdidas-atacante');
    const inputDefEl = document.getElementById('input-perdidas-defensor');
    const cantidadTropasEl = document.getElementById('cantidad-tropas');

    const territorio = selectEl?.value;
    const resultado = document.querySelector('input[name="resultado-batalla"]:checked')?.value;
    const perdidasAtacante = parseInt(inputAtacEl?.value) || 0;
    const perdidasDefensor = parseInt(inputDefEl?.value) || 0;

    if (!territorio) return alert("Selecciona territorio.");
    if (!resultado) return alert("Selecciona resultado.");

    let tropasActuales = parseInt(localStorage.getItem(`tropasDe-${nombre}`) || '0');
    if (perdidasAtacante > tropasActuales) return alert(`No puedes perder ${perdidasAtacante} tropas si solo tienes ${tropasActuales}.`);
    tropasActuales = Math.max(0, tropasActuales - perdidasAtacante);
    localStorage.setItem(`tropasDe-${nombre}`, tropasActuales);
    if (cantidadTropasEl) cantidadTropasEl.textContent = tropasActuales;

    console.log(`[Batalla] Emitiendo: Atk:${nombre} -> ${territorio}, Res:${resultado}, PA:${perdidasAtacante}, PD:${perdidasDefensor}`);
    socket.emit('registrar-batalla', { partida, atacante: nombre, casaAtacante: casa, territorioAtacado: territorio, resultado, perdidasAtacante, perdidasDefensor });
    cerrarModalBatalla();
}

// --- Modal Mis Territorios ---
function abrirModalMisTerritorios() {
     const modalEl = document.getElementById('modal-mis-territorios');
     const listaUl = document.getElementById('lista-mis-territorios');
     const contadorSpan = document.getElementById('contador-territorios');
     const oroSpan = document.getElementById('oro-generado-territorios');
     if (!modalEl || !listaUl || !contadorSpan || !oroSpan) return console.error("Elementos modal 'Mis Territorios' no encontrados.");
     // ¡Usar el array 'territorios' actualizado por el servidor!
     const misTerritoriosFiltrados = territorios.filter(t => t.propietario === casa);
     listaUl.innerHTML = ''; let contador = 0, oroTotal = 0;
     if (misTerritoriosFiltrados.length > 0) {
         misTerritoriosFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(t => {
             const li = document.createElement('li'); li.textContent = `${t.nombre} (+${t.oro} Oro)`; listaUl.appendChild(li);
             contador++; oroTotal += t.oro;
         });
     } else { const li = document.createElement('li'); li.textContent = "Aún no posees territorios."; li.style.fontStyle = 'italic'; li.style.opacity = '0.7'; listaUl.appendChild(li); }
     contadorSpan.textContent = contador; oroSpan.textContent = oroTotal;
     modalEl.style.display = 'block';
}
function cerrarModalMisTerritorios() {
     const modalEl = document.getElementById('modal-mis-territorios'); if (modalEl) modalEl.style.display = 'none';
}

// --- Listeners de Socket.IO ---
socket.on('avanzar-accion', (nuevoEstado) => {
    console.log(`[${nombre}] Recibido 'avanzar-accion'.`);
    if (nuevoEstado && nuevoEstado.turno && nuevoEstado.accion) {
        turno = nuevoEstado.turno; accion = nuevoEstado.accion;
    }
    avanzarAccionLocalmente();
});
socket.on('estado-espera-jugadores', (mensaje) => {
    const el = document.getElementById('estado-turno'); if (el) el.textContent = mensaje;
});
socket.on('actualizar-estado-juego', (estadoServidor) => {
    console.log("[Cliente] Recibido 'actualizar-estado-juego'");
    // Actualizar territorios
    if (estadoServidor.territorios && typeof estadoServidor.territorios === 'object') {
        const territoriosRecibidos = estadoServidor.territorios; const nuevoArrayTerritorios = [];
        for (const nombreTerritorio in territoriosRecibidos) {
            if (Object.hasOwnProperty.call(territoriosRecibidos, nombreTerritorio)) {
                const dataTerritorio = territoriosRecibidos[nombreTerritorio];
                nuevoArrayTerritorios.push({ nombre: nombreTerritorio, oro: dataTerritorio.oro, propietario: dataTerritorio.propietario });
            }
        }
        territorios = nuevoArrayTerritorios;
        console.log(`   -> Array 'territorios' local actualizado (${territorios.length}).`);
    }
    // Actualizar Recursos (Oro/Tropas)
    if (estadoServidor.recursos && estadoServidor.recursos[nombre]) {
        const misRecursos = estadoServidor.recursos[nombre];
        const cantidadTropasEl = document.getElementById('cantidad-tropas');
        const cantidadOroEl = document.getElementById('cantidad-oro');
        if (misRecursos.tropas !== undefined) { const t = Math.max(0, parseInt(misRecursos.tropas) || 0); localStorage.setItem(`tropasDe-${nombre}`, t); if (cantidadTropasEl) cantidadTropasEl.textContent = t; }
        if (misRecursos.oro !== undefined) { const o = Math.max(0, parseInt(misRecursos.oro) || 0); localStorage.setItem(`oroDe-${nombre}`, o); if (cantidadOroEl) cantidadOroEl.textContent = o; }
    }
    // Actualizar turno/acción si viene del servidor
    if (estadoServidor.turno !== undefined) turno = estadoServidor.turno;
    if (estadoServidor.accion !== undefined) accion = estadoServidor.accion;
    if (estadoServidor.turno !== undefined || estadoServidor.accion !== undefined) {
        actualizarTurnoYAccion();
    }
});

// --- Inicialización DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("==========================================");
    console.log("DOM Cargado. Iniciando scriptjuego.js...");

    // 1. Validar Datos Iniciales (nombre, casa, partida)
    if (!nombre || !casa || !partida) { console.error("¡CRÍTICO! Faltan datos URL."); alert("Error datos."); return; }
    console.log(`Datos OK: J=${nombre}, C=${casa}, P=${partida}`);

    // 2. Configurar UI Inicial (fondo, logo, turno)
    try { setFondoPorCasa(casa); setLogoPorCasa(casa); actualizarTurnoYAccion(); console.log("[Init] UI Inicial OK."); }
    catch (e) { console.error("[Init] Error UI inicial:", e); return; }

    // 3. Cargar estado guardado o mostrar modales oro/tropas
    console.log("[Init] Verificando estado inicial...");
    try {
        const oroGuardado = localStorage.getItem(`oroDe-${nombre}`);
        const tropasGuardadas = localStorage.getItem(`tropasDe-${nombre}`);
        const cantidadOroEl = document.getElementById('cantidad-oro');
        const oroJugadorDiv = document.getElementById('oro-jugador');
        const cantidadTropasEl = document.getElementById('cantidad-tropas');
        const tropasJugadorDiv = document.getElementById('tropas-jugador');
        const ventanaOroEl = document.getElementById('ventana-oro');
        const ventanaTropasEl = document.getElementById('ventana-tropas');
        if (!cantidadOroEl || !oroJugadorDiv || !cantidadTropasEl || !tropasJugadorDiv || !ventanaOroEl || !ventanaTropasEl) throw new Error("Faltan elementos DOM oro/tropas/ventanas.");
        if (oroGuardado !== null) {
            cantidadOroEl.textContent = oroGuardado; oroJugadorDiv.style.display = 'flex';
            if (tropasGuardadas !== null) {
                cantidadTropasEl.textContent = tropasGuardadas; tropasJugadorDiv.style.display = 'flex';
                checkMostrarBotonAccion();
            } else { ventanaTropasEl.style.display = 'block'; }
        } else { ventanaOroEl.style.display = 'block'; }
        console.log("[Init] Estado inicial OK.");
    } catch (e) { console.error("[Init] Error estado inicial:", e); }

    // 4. Añadir TODOS los Event Listeners
    console.log("[Init] Añadiendo listeners...");
    let listenersOk = true;
    try {
        const setupListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) { element.addEventListener(event, handler); }
            else { console.warn(`WARN: Elemento #${id} no encontrado.`); listenersOk = false; } // No detener, solo advertir
        };
        setupListener('logo-casa-container', 'click', abrirModalMisTerritorios);
        setupListener('btn-batalla', 'click', abrirModalBatalla);
        setupListener('btn-reclutar', 'click', () => console.log("Reclutar"));
        setupListener('btn-construir', 'click', () => console.log("Construir"));
        setupListener('btn-mover', 'click', () => console.log("Mover"));
        setupListener('btn-reorganizar', 'click', () => console.log("Reorganizar"));
        setupListener('boton-accion', 'click', siguienteAccion);
        setupListener('btn-confirmar-oro', 'click', confirmarOro);
        setupListener('btn-confirmar-tropas', 'click', confirmarTropas);
        setupListener('btn-cerrar-modal-batalla', 'click', cerrarModalBatalla);
        setupListener('btn-confirmar-batalla', 'click', confirmarBatalla);
        setupListener('btn-cancelar-batalla', 'click', cerrarModalBatalla);
        setupListener('btn-restar-perdidas-atacante', 'click', () => ajustarPerdidas('atacante', -1));
        setupListener('btn-sumar-perdidas-atacante', 'click', () => ajustarPerdidas('atacante', 1));
        setupListener('btn-restar-perdidas-defensor', 'click', () => ajustarPerdidas('defensor', -1));
        setupListener('btn-sumar-perdidas-defensor', 'click', () => ajustarPerdidas('defensor', 1));
        setupListener('btn-cerrar-modal-territorios', 'click', cerrarModalMisTerritorios);
        setupListener('btn-ok-modal-territorios', 'click', cerrarModalMisTerritorios);
        // setupListener('btn-confirmar-fase-neutral', confirmarFaseNeutral);
        if (!listenersOk) console.error("¡¡ ALGUNOS LISTENERS FALLARON !! Revisa warnings.");
        else console.log("[Init] Listeners añadidos OK.");
    } catch (e) { console.error("¡¡ ERROR CRÍTICO añadiendo listeners !!", e); alert("Error controles."); return; }

    // 5. Unirse a Sala Socket.IO
    if (partida && nombre) {
        console.log(`[${nombre}] Emitiendo 'unirse-sala-juego' a ${partida}`);
        socket.emit('unirse-sala-juego', { partida, nombre });
    } else { console.error("Faltan datos para unirse a sala."); }

    console.log("==========================================");
    console.log("Inicialización del cliente COMPLETADA.");
}); // Fin DOMContentLoaded