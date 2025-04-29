// =============================================
// PARTE 1: INICIALIZACIÓN Y GLOBALES
// =============================================

// --- Conexión Socket.IO ---
// Asegúrate de que esta IP/Puerto sea la correcta y accesible desde tus clientes
const socket = io('http://192.168.1.133:3000');

// --- Parámetros URL ---
const params = new URLSearchParams(window.location.search);
const partida = params.get('partida');
const nombre = params.get('nombre');
const casa = params.get('casa'); // Casa asignada a este jugador

// --- Estado Local del Juego (Reflejo del Servidor) ---
// Este objeto se llenará con los datos enviados por el servidor
let gameState = null;

// --- Constantes UI (Para cálculos en el cliente y poblar selects) ---
const COSTOS_BASE_UI = {
    regulares: 4,
    barco: 20,
    torreAsedio: 20, // Corresponde al value="torreAsedio" en HTML
    catapulta: 20,
    escorpion: 20,
    sacerdote: 20, // Costo genérico, puede variar por facción
    mercenario: 8,
    mercenarioElite: 15,
    granja: 20,
    cantera: 20,
    mina: 20,
    aserradero: 20,
    castillo: 30,
    puerto: 30,
    'taller de maquinaria de asedio': 30, // Corresponde al value en HTML
    // Facciones (Nombres DEBEN coincidir con los `value` en HTML y lógica backend)
    'Academia de Caballería': 20, // Arryn
    'Atalaya': 40, // Arryn
    'Armería': 30, // Lannister
    'Arquería': 30, // Tully
    'Septo': 50, // Tyrell
    'Puerto Fluvial': 30, // Tully
    'caballero': 10, // Arryn (Reclutable con Academia)
    'sacerdoteLuz': 20, // Baratheon (Reclutable)
    // Añadir costos base para otras unidades reclutables de facción si aplica
};
const EDIFICIOS_PRODUCCION = ['Granja', 'Cantera', 'Mina', 'Aserradero'];
// Nombres usados en HTML para máquinas de asedio (para calcular descuentos)
const MAQUINAS_ASEDIO_UI_VALUES = ['torreAsedio', 'catapulta', 'escorpion'];

// =============================================
// PARTE 2: DEFINICIÓN DE FUNCIONES
// =============================================

// --- Funciones de Actualización de UI ---

function actualizarInfoJugador() {
    if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) {
        console.warn("ActualizarInfoJugador: gameState o datos del jugador no disponibles.");
        document.getElementById('oro-jugador').style.display = 'none';
        document.getElementById('tropas-jugador').style.display = 'none';
        return;
    }
    const jugador = gameState.jugadores[nombre];
    const cantidadOroEl = document.getElementById('cantidad-oro');
    const oroJugadorDiv = document.getElementById('oro-jugador');
    const cantidadTropasEl = document.getElementById('cantidad-tropas');
    const tropasJugadorDiv = document.getElementById('tropas-jugador');

    if (cantidadOroEl) cantidadOroEl.textContent = jugador.oro ?? 0;
    if (oroJugadorDiv) oroJugadorDiv.style.display = 'flex';
    if (cantidadTropasEl) cantidadTropasEl.textContent = jugador.tropasTotales ?? 0;
    if (tropasJugadorDiv) tropasJugadorDiv.style.display = 'flex';
}

function actualizarTurnoAccionUI() {
    if (!gameState) return;
    const turnoEl = document.getElementById('turno-jugador');
    const accionEl = document.getElementById('accion-jugador');
    const botonAccionEl = document.getElementById('boton-accion');
    const estadoTurnoEl = document.getElementById('estado-turno');

    if (turnoEl) turnoEl.textContent = `Turno ${gameState.turno}`;
    if (accionEl) {
        const nombresAccion = ["Acción 1", "Acción 2", "Acción 3", "Fase Neutral"];
        accionEl.textContent = nombresAccion[gameState.accion - 1] || `Acción ${gameState.accion}`;
    }
    if (botonAccionEl) {
        const enEspera = gameState.jugadoresAccionTerminada?.includes(nombre);
        const textoBoton = gameState.fase === 'Neutral' ? "⌛ Procesando..." :
                          enEspera ? "⌛ Esperando..." : "✅ Terminar Acción";
        botonAccionEl.textContent = textoBoton;
        botonAccionEl.disabled = gameState.fase === 'Neutral' || enEspera;
        // Mostrar/Ocultar botón acción principal
        botonAccionEl.style.display = (gameState.fase === 'Accion' || enEspera) ? 'inline-block' : 'none';
    }
     // Actualizar estado de espera general
     if (estadoTurnoEl) {
        const listos = gameState.jugadoresAccionTerminada?.length || 0;
        const total = Object.keys(gameState.jugadores || {}).length;
        if (gameState.fase === 'Accion' && listos > 0 && listos < total && !gameState.jugadoresAccionTerminada?.includes(nombre)) {
             estadoTurnoEl.textContent = `⌛ Esperando a ${total - listos} jugador(es)...`;
        } else {
             estadoTurnoEl.textContent = ""; // Limpiar si no aplica
        }
     }
}

function actualizarInfoAdicional() {
    if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) return;
    const jugador = gameState.jugadores[nombre];
    const listaRumoresEl = document.getElementById('lista-rumores');

    if (listaRumoresEl) {
        listaRumoresEl.innerHTML = ''; // Limpiar
        if (jugador.rumoresDesbloqueados && jugador.rumoresDesbloqueados.length > 0) {
            jugador.rumoresDesbloqueados.forEach(rumor => {
                const li = document.createElement('li');
                // Podrías tener un mapeo para mostrar descripciones cortas
                const RUMOR_DESC = { // Ejemplo
                    "Rutas Alternativas": "Atacar detrás líneas enemigas",
                    "Camada Huargos": "+1d4+1 Huargos",
                    "Unicornios Skagos": "+1d3 Unicornios (+2 Montaña)",
                    // ... añadir TODOS los rumores con nombre exacto del backend
                };
                li.textContent = `✓ ${rumor}`;
                li.title = RUMOR_DESC[rumor] || "Rumor desbloqueado"; // Tooltip
                listaRumoresEl.appendChild(li);
            });
        } else {
            listaRumoresEl.innerHTML = '<li>(Ninguno)</li>';
        }
    }
    // Aquí se actualizaría más info: estado invierno, préstamos, etc.
    // Ejemplo: const inviernoStatusEl = document.getElementById('invierno-status');
    // if(inviernoStatusEl) inviernoStatusEl.textContent = gameState.estadoGlobal?.invierno ? "Sí" : "No";
}

function setLogoPorCasa(casaNombre) {
    const logoImgEl = document.getElementById('logo-casa');
    if (!logoImgEl) return console.error("[SetLogo] Elemento 'logo-casa' NO ENCONTRADO!");
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

// --- Funciones Modales Genéricas ---
function abrirModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) modalEl.style.display = 'block';
    else console.error(`Modal #${modalId} no encontrado.`);
}
function cerrarModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) modalEl.style.display = 'none';
}

// --- Funciones Lógica de Acciones y Botones ---

function terminarAccionEspecifica(tipoAccion) {
    if (!partida || !nombre || gameState?.fase === 'Neutral') return;

    console.log(`[${nombre}] Acción '${tipoAccion}' realizada. Emitiendo 'accion-terminada'...`);
    socket.emit('accion-terminada', { partida, nombre });
    deshabilitarBotonesAccion(true); // Deshabilitar todos mientras espera
    // Actualizar UI para mostrar espera
    const botonAccionEl = document.getElementById('boton-accion');
    const estadoTurnoEl = document.getElementById('estado-turno');
     if (botonAccionEl) {
        botonAccionEl.disabled = true;
        botonAccionEl.textContent = "⌛ Esperando...";
    }
    if (estadoTurnoEl) estadoTurnoEl.textContent = "⌛ Esperando otros jugadores...";
}

function deshabilitarBotonesAccion(deshabilitar) {
     const container = document.getElementById('acciones-container');
     if(container) {
         const botones = container.querySelectorAll('.btn-accion-juego');
         botones.forEach(btn => btn.disabled = deshabilitar);
     }
     const botonPrincipal = document.getElementById('boton-accion');
     if(botonPrincipal) {
         // Solo deshabilitar el principal si la acción ha terminado o es fase neutral
         botonPrincipal.disabled = deshabilitar || gameState?.fase === 'Neutral' || gameState?.jugadoresAccionTerminada?.includes(nombre);
     }
}

function siguienteAccion() { // Para el botón principal 'Terminar Acción'
    if (!partida || !nombre || gameState?.fase === 'Neutral') return;

    console.log(`[${nombre}] Botón 'Terminar Acción' presionado. Emitiendo 'accion-terminada'...`);
    socket.emit('accion-terminada', { partida, nombre });
    deshabilitarBotonesAccion(true); // Deshabilitar todos mientras espera
    // Actualizar UI para mostrar espera
     const botonAccionEl = document.getElementById('boton-accion');
     const estadoTurnoEl = document.getElementById('estado-turno');
     if (botonAccionEl) {
        botonAccionEl.disabled = true;
        botonAccionEl.textContent = "⌛ Esperando...";
    }
    if (estadoTurnoEl) estadoTurnoEl.textContent = "⌛ Esperando otros jugadores...";
}

// --- Lógica Modal Batalla ---
function poblarTerritoriosAtacables() {
    if (!gameState || !gameState.territorios) return;
    const selectEl = document.getElementById('select-territorio-atacado');
    if (!selectEl) return console.error("Select territorios atacables no encontrado.");
    selectEl.innerHTML = '<option value="">-- Selecciona --</option>';
    Object.values(gameState.territorios)
        .filter(t => t.propietario && t.propietario !== casa)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(t => {
            selectEl.appendChild(new Option(`${t.nombre} (${t.propietario})`, t.nombre));
        });
}
function ajustarPerdidas(inputId, cantidad) {
    const input = document.getElementById(inputId);
    if (!input) return console.error(`Input ${inputId} no encontrado.`);
    let v = parseInt(input.value) || 0;
    v = Math.max(0, v + cantidad);
    input.value = v;
}
function confirmarBatalla() {
    const selectEl = document.getElementById('select-territorio-atacado');
    const inputAtacEl = document.getElementById('input-perdidas-atacante');
    const inputDefEl = document.getElementById('input-perdidas-defensor');
    const territorio = selectEl?.value;
    const resultado = document.querySelector('input[name="resultado-batalla"]:checked')?.value;
    const perdidasAtacante = parseInt(inputAtacEl?.value) || 0;
    const perdidasDefensor = parseInt(inputDefEl?.value) || 0;

    if (!territorio || !resultado || perdidasAtacante < 0 || perdidasDefensor < 0) {
        alert("Por favor, completa todos los campos de batalla correctamente.");
        return;
    }
    console.log(`[Batalla] Emitiendo: Atk:${nombre}(${casa}) -> ${territorio}, Res:${resultado}, PA:${perdidasAtacante}, PD:${perdidasDefensor}`);
    socket.emit('registrar-batalla', { partida, atacante: nombre, casaAtacante: casa, territorioAtacado: territorio, resultado, perdidasAtacante, perdidasDefensor });
    cerrarModal('modal-batalla');
}

// --- Lógica Modal Reclutar ---
function poblarTerritoriosReclutar() {
    if (!gameState || !gameState.territorios) return;
    const selectEl = document.getElementById('select-territorio-reclutar');
    if (!selectEl) return console.error("Select territorios reclutar no encontrado.");
    selectEl.innerHTML = '<option value="">-- Selecciona --</option>';
    Object.values(gameState.territorios)
        .filter(t => t.propietario === casa)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(t => {
            selectEl.appendChild(new Option(t.nombre, t.nombre));
        });
    selectEl.value = ""; // Reset selection
    actualizarCostoReclutar(); // Reset/update cost
}
function poblarUnidadesReclutar() {
     if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) return;
     const jugador = gameState.jugadores[nombre];
     const selectUnidadEl = document.getElementById('select-unidad-reclutar');
     if (!selectUnidadEl) return console.error("Select unidades reclutar no encontrado.");

     // Limpiar opciones existentes excepto las básicas
     const basicas = ['regulares', 'mercenario', 'barco', 'torreAsedio', 'catapulta', 'escorpion'];
     Array.from(selectUnidadEl.options).forEach(option => {
         if (!basicas.includes(option.value)) option.remove();
     });

     // Eliminar optgroup de facción si existe
     const oldOptgroup = selectUnidadEl.querySelector('optgroup[label="Facción"]');
     if (oldOptgroup) oldOptgroup.remove();

     // Crear nuevo optgroup para facción
     const optgroupFaction = document.createElement('optgroup');
     optgroupFaction.label = "Facción";
     let factionOptionsAdded = false;

     // Añadir opciones según la casa y el estado del juego
     if (jugador.casa === 'Arryn') {
         if (jugador.academiaConstruida) { // Chequear estado del gameState
             optgroupFaction.appendChild(new Option('Caballero Arryn', 'caballero')); // Usa 'caballero' como value
             factionOptionsAdded = true;
         }
         // Añadir Cetrería aquí si es reclutable
     } else if (jugador.casa === 'Baratheon') {
         optgroupFaction.appendChild(new Option('Sacerdote de Luz', 'sacerdoteLuz')); // Usa 'sacerdoteLuz'
         factionOptionsAdded = true;
         // Añadir martilladores/venados si son reclutables
     } else if (jugador.casa === 'Tully') {
          // La arquería permite *tirar* a los arqueros, no necesariamente reclutarlos como unidad separada?
          // Revisa las reglas: ¿Tully recluta "Arqueros" o sus tropas regulares obtienen la habilidad?
          // Si es una unidad, añade: optgroupFaction.appendChild(new Option('Arquero Tully', 'arquero'));
          // Si murcielagos son reclutables: optgroupFaction.appendChild(new Option('Murciélago Gigante', 'murcielagoGigante'));
          // factionOptionsAdded = true; // Si añades alguna
     }
     // ... Añadir lógica para OTRAS CASAS ...
     else if (jugador.casa === 'Tyrell' && jugador.septoConstruido) {
         optgroupFaction.appendChild(new Option('Militante de la Fe', 'militante'));
         factionOptionsAdded = true;
     }


     if (factionOptionsAdded) {
         selectUnidadEl.appendChild(optgroupFaction);
     }

     selectUnidadEl.value = 'regulares'; // Reset selection
     actualizarCostoReclutar(); // Update cost
}
function ajustarCantidadReclutar(cantidad) {
    const input = document.getElementById('input-cantidad-reclutar');
    if (!input) return;
    let v = parseInt(input.value) || 1;
    v = Math.max(1, v + cantidad);
    input.value = v;
    actualizarCostoReclutar();
}
function actualizarCostoReclutar() {
    if (!gameState || !gameState.territorios || !gameState.jugadores[nombre]) return;
    const jugador = gameState.jugadores[nombre];
    const selectTerritorioEl = document.getElementById('select-territorio-reclutar');
    const selectUnidadEl = document.getElementById('select-unidad-reclutar');
    const inputCantidadEl = document.getElementById('input-cantidad-reclutar');
    const costoValorEl = document.getElementById('costo-reclutar-valor');
    const limiteActualEl = document.getElementById('limite-reclutar-actual');
    const limiteMaximoEl = document.getElementById('limite-reclutar-maximo');
    const limiteInfoEl = document.getElementById('limite-reclutamiento-info');

    const nombreTerritorio = selectTerritorioEl.value;
    const tipoUnidadValue = selectUnidadEl.value; // 'regulares', 'barco', 'caballero', etc.
    const cantidad = parseInt(inputCantidadEl.value) || 1;
    const territorio = gameState.territorios[nombreTerritorio];

    if (!tipoUnidadValue || !territorio) {
        if(costoValorEl) costoValorEl.textContent = '--';
        if(limiteInfoEl) limiteInfoEl.style.display = 'none';
        return;
    }

    let costoUnitario = COSTOS_BASE_UI[tipoUnidadValue] ?? 0; // Obtener costo base
    let esMaquinaOBarco = tipoUnidadValue === 'barco' || MAQUINAS_ASEDIO_UI_VALUES.includes(tipoUnidadValue);

    // Calcular descuentos de edificios locales
    let descuento = 0;
    if (territorio.edificios.includes('Granja') && tipoUnidadValue === 'regulares') descuento = 1;
    else if (territorio.edificios.includes('Aserradero') && esMaquinaOBarco) descuento = 5;
    // Aplicar otros descuentos/costos específicos (ej. coste caballero Arryn ya está en COSTOS_BASE_UI)

    const costoFinalUnitario = Math.max(0, costoUnitario - descuento);
    const costoTotal = costoFinalUnitario * cantidad;
    if(costoValorEl) costoValorEl.textContent = costoTotal;

    // Actualizar info límite
    const esMercenario = tipoUnidadValue === 'mercenario'; // Añadir elite si es diferente
    if (!esMercenario) {
        if(limiteActualEl) limiteActualEl.textContent = jugador.tropasReclutadasEsteTurno ?? 0;
        if(limiteMaximoEl) limiteMaximoEl.textContent = jugador.limiteReclutamientoBase ?? '?';
        if(limiteInfoEl) limiteInfoEl.style.display = 'block';
    } else {
         if (jugador.casa === 'Martell') {
              if(limiteActualEl) limiteActualEl.textContent = jugador.mercenariosReclutadosEsteTurno ?? 0; // Necesita estado backend
              if(limiteMaximoEl) limiteMaximoEl.textContent = '10';
              if(limiteInfoEl) limiteInfoEl.style.display = 'block';
         } else {
              if(limiteInfoEl) limiteInfoEl.style.display = 'none';
         }
    }
}
function confirmarReclutar() {
    const territorio = document.getElementById('select-territorio-reclutar').value;
    const tipoUnidad = document.getElementById('select-unidad-reclutar').value;
    const cantidad = parseInt(document.getElementById('input-cantidad-reclutar').value);

    if (!territorio || !tipoUnidad || isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor, completa todos los campos para reclutar.");
        return;
    }
    console.log(`[Reclutar] Emitiendo: ${cantidad} ${tipoUnidad} en ${territorio}`);
    socket.emit('solicitud-reclutamiento', { partida, nombre, territorio, tipoUnidad, cantidad });
    cerrarModal('modal-reclutar');
}

// --- Lógica Modal Construir ---
function poblarTerritoriosConstruir() {
    if (!gameState || !gameState.territorios) return;
    const selectEl = document.getElementById('select-territorio-construir');
    if (!selectEl) return console.error("Select territorios construir no encontrado.");
    selectEl.innerHTML = '<option value="">-- Selecciona --</option>';
    Object.values(gameState.territorios)
        .filter(t => t.propietario === casa)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(t => {
            selectEl.appendChild(new Option(t.nombre, t.nombre));
        });
    selectEl.value = ""; // Reset
    // Resetear edificio y coste también
    const selectEdificio = document.getElementById('select-edificio-construir');
     if(selectEdificio) selectEdificio.value = "";
     actualizarCostoConstruir();
}
function poblarEdificiosConstruir() {
      if (!gameState || !gameState.jugadores || !gameState.jugadores[nombre]) return;
      const jugador = gameState.jugadores[nombre];
      const selectEdificioEl = document.getElementById('select-edificio-construir');
      if (!selectEdificioEl) return console.error("Select edificios construir no encontrado.");

      // Limpiar opciones de facción previas
      const oldOptgroup = selectEdificioEl.querySelector('optgroup[label="Facción"]');
      if (oldOptgroup) oldOptgroup.remove();

      // Crear nuevo grupo de facción
      const optgroupFaction = document.createElement('optgroup');
      optgroupFaction.label = "Facción";
      let factionOptionsAdded = false;

      // Añadir edificios específicos según casa y estado
       if (jugador.casa === 'Arryn') {
           // Atalaya: ¿Límite por territorio o global? Asumiendo global por ahora
           if (jugador.puedeConstruirAtalaya) { // Necesita este estado en gameState
                optgroupFaction.appendChild(new Option('Atalaya', 'Atalaya'));
                factionOptionsAdded = true;
           }
           if (!jugador.academiaConstruida) { // Solo si no tiene la academia (asumiendo 1 global)
               optgroupFaction.appendChild(new Option('Academia de Caballería', 'Academia de Caballería'));
               factionOptionsAdded = true;
           }
       } else if (jugador.casa === 'Lannister') {
           if (!jugador.armeriaConstruida) { // Asumiendo 1 global
               optgroupFaction.appendChild(new Option('Armería', 'Armería'));
               factionOptionsAdded = true;
           }
       } else if (jugador.casa === 'Tully') {
            // Asumiendo 1 arquería global
           if (!jugador.arqueriaConstruida) { // Necesita este estado
                optgroupFaction.appendChild(new Option('Arquería', 'Arquería'));
                factionOptionsAdded = true;
           }
           // Asumiendo 1 puerto fluvial global
           if (!jugador.puertoFluvialConstruido) { // Necesita este estado
               optgroupFaction.appendChild(new Option('Puerto Fluvial', 'Puerto Fluvial'));
               factionOptionsAdded = true;
           }
       } else if (jugador.casa === 'Tyrell') {
           if (!jugador.septoConstruido) { // Asumiendo 1 global
                optgroupFaction.appendChild(new Option('Septo', 'Septo'));
                factionOptionsAdded = true;
           }
       }
       // ... Añadir lógica para OTRAS CASAS ...

      if (factionOptionsAdded) {
          selectEdificioEl.appendChild(optgroupFaction);
      }
      selectEdificioEl.value = ""; // Reset selection
      actualizarCostoConstruir(); // Update cost
}
function actualizarCostoConstruir() {
     if (!gameState || !gameState.territorios || !gameState.jugadores[nombre]) return;
     const selectTerritorioEl = document.getElementById('select-territorio-construir');
     const selectEdificioEl = document.getElementById('select-edificio-construir');
     const costoValorEl = document.getElementById('costo-construir-valor');
     const limiteActualEl = document.getElementById('limite-construir-actual');
     const limiteMaximoEl = document.getElementById('limite-construir-maximo');
     const limiteInfoEl = document.getElementById('limite-construccion-info');

     const nombreTerritorio = selectTerritorioEl.value;
     const tipoEdificio = selectEdificioEl.value; // Este es el 'value' del option
     const territorio = gameState.territorios[nombreTerritorio];
     const jugador = gameState.jugadores[nombre];

     if (!tipoEdificio || !territorio || !jugador) {
         if(costoValorEl) costoValorEl.textContent = '--';
         if(limiteInfoEl) limiteInfoEl.style.display = 'none';
         return;
     }

     // Buscar costo base usando el 'value'
     let costoBase = COSTOS_BASE_UI[tipoEdificio.toLowerCase().replace(/ /g,'')] ?? 0;
     if(costoBase === 0) { // Probar con el texto si el value no coincide
         costoBase = COSTOS_BASE_UI[tipoEdificio] ?? 0;
     }

     // Calcular descuento Cantera
     let descuento = territorio.edificios.includes('Cantera') ? 5 : 0;
     const costoTotal = Math.max(0, costoBase - descuento);
      if(costoValorEl) costoValorEl.textContent = costoTotal;

     // Actualizar info límite
     const maxConstruccion = (jugador.casa === 'Targaryen') ? 2 : 1;
      if(limiteActualEl) limiteActualEl.textContent = jugador.edificiosConstruidosTurno ?? 0;
      if(limiteMaximoEl) limiteMaximoEl.textContent = maxConstruccion;
      if(limiteInfoEl) limiteInfoEl.style.display = 'block';
}
function confirmarConstruir() {
    const territorio = document.getElementById('select-territorio-construir').value;
    const tipoEdificio = document.getElementById('select-edificio-construir').value; // El 'value' del select

    if (!territorio || !tipoEdificio) {
        alert("Por favor, selecciona territorio y edificio.");
        return;
    }
    console.log(`[Construir] Emitiendo: ${tipoEdificio} en ${territorio}`);
    socket.emit('solicitud-construccion', { partida, nombre, territorio, tipoEdificio });
    cerrarModal('modal-construir');
}

// --- Lógica Modal Mis Territorios ---
function abrirModalMisTerritorios() {
     if (!gameState || !gameState.territorios || !gameState.jugadores[nombre]) {
        // Intentar abrir el modal incluso sin datos para mostrar "Cargando..."
        const modalEl = document.getElementById('modal-mis-territorios');
        const listaUl = document.getElementById('lista-mis-territorios');
        if(modalEl && listaUl) {
             listaUl.innerHTML = '<li>Cargando datos del servidor...</li>';
             abrirModal('modal-mis-territorios');
        }
        return;
     }
     const modalEl = document.getElementById('modal-mis-territorios');
     const listaUl = document.getElementById('lista-mis-territorios');
     const contadorSpan = document.getElementById('contador-territorios');
     const oroSpan = document.getElementById('oro-generado-territorios');
     if (!modalEl || !listaUl || !contadorSpan || !oroSpan) return console.error("Elementos modal 'Mis Territorios' no encontrados.");

     listaUl.innerHTML = ''; let contador = 0; let oroTotalTurno = 0;
     const misTerritoriosFiltrados = Object.values(gameState.territorios).filter(t => t.propietario === casa);

     if (misTerritoriosFiltrados.length > 0) {
         // Función helper para iconos (simplifica el código)
         const getIconoEdificio = (ed) => {
             const iconos = { Mina: '⛏️', Aserradero: '🪵', Granja: '🌾', Cantera: '🪨', Puerto: '⚓', Castillo: '🏰', 'Taller de maquinaria de asedio': '🛠️', 'Academia de Caballería': '🏫', 'Armería': '⚔️', 'Arquería': '🏹', 'Septo': '🙏', 'Atalaya': '🔭', 'Puerto Fluvial': '⚓'};
             return iconos[ed] || `(${ed.slice(0,3)})`; // Icono o abreviatura
         };
         const getIconoTropa = (tr) => {
              const iconos = { regulares: '🛡️', caballeros: '🐎', barco: '⛵', torreAsedio: '🗼', catapulta: '💣', escorpion: '🦂', sacerdoteLuz: '🔥', barbaros: '🪓', caballerosAguila: '🦅', caballerosRosa: '🌹', caballerosVenado: '🦌', martilladores: '🔨', guardiaAlba: '☀️', guardiaReal: '👑', murcielagosGigantes: '🦇', huargos: '🐺', unicornios: '🦄', militantes: '✊'};
              return iconos[tr] || `(${tr.slice(0,3)})`;
         };

         misTerritoriosFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(t => {
             const li = document.createElement('li');
             // Calcular ingresos de este territorio
             let ingresoTerritorio = t.oroBase;
             let edificiosTexto = '';
             (t.edificios || []).forEach(edificio => {
                 edificiosTexto += ` <span title="${edificio}">${getIconoEdificio(edificio)}</span>`;
                 if (edificio === 'Mina') ingresoTerritorio += (casa === 'Lannister' ? 20 : 10);
                 else if (edificio === 'Aserradero') ingresoTerritorio += 5;
                 else if (edificio === 'Granja') ingresoTerritorio += (casa === 'Tully' ? 10 : 5);
                 else if (edificio === 'Cantera') ingresoTerritorio += 5;
                 else if (edificio === 'Puerto') ingresoTerritorio += 10;
                  // Añadir ingresos de edificios de facción si los hay
                 else if (edificio === 'Puesto Aduanero' && casa === 'Tully') ingresoTerritorio += 20;
             });

             // Calcular tropas en este territorio
             let tropasTexto = '';
             if (t.tropas && Object.keys(t.tropas).length > 0) {
                 for(const tipoTropa in t.tropas) {
                     if(t.tropas[tipoTropa] > 0) {
                         tropasTexto += ` <span title="${tipoTropa}">${getIconoTropa(tipoTropa)} ${t.tropas[tipoTropa]}</span>`;
                     }
                 }
             } else {
                 tropasTexto = ' (Vacío)';
             }

             li.innerHTML = `<b>${t.nombre}</b> (+${ingresoTerritorio}💰)${edificiosTexto}<br><small style="margin-left: 10px;">Tropas:${tropasTexto}</small>`;
             listaUl.appendChild(li);
             contador++;
             oroTotalTurno += ingresoTerritorio;
         });

         // Añadir ingreso por comercio (si tiene puerto)
         let ingresoComercioTotal = 0;
         const tienePuerto = misTerritoriosFiltrados.some(t => t.edificios?.includes('Puerto'));
         if (tienePuerto) {
             let numEdificiosProduccion = 0;
             Object.values(gameState.territorios).forEach(tPropio => { // Contar en TODOS los territorios propios
                  if(tPropio.propietario === casa) {
                      numEdificiosProduccion += (tPropio.edificios || []).filter(e => EDIFICIOS_PRODUCCION.includes(e)).length;
                  }
             });
             ingresoComercioTotal = numEdificiosProduccion * 10;
             oroTotalTurno += ingresoComercioTotal;
             if (ingresoComercioTotal > 0) {
                 const liComercio = document.createElement('li');
                 liComercio.style.cssText = 'font-style: italic; border-top: 1px dashed #556677; padding-top: 8px; margin-top: 5px;';
                 liComercio.innerHTML = `Ingreso Comercio Total: +${ingresoComercioTotal}💰 (por ${numEdificiosProduccion} edif. prod.)`;
                 listaUl.appendChild(liComercio);
             }
         }
          // Añadir ingreso extra de rumor Martell (Secta Pentos) si aplica
         if (casa === 'Martell' && gameState.jugadores[nombre]?.rumoresDesbloqueados.includes('Secta Pentos')) {
              let recursosComerciados = 0; // Necesitaría una forma de trackear esto...
              // Simplificación: Sumamos +10 por edificio de producción como bonus
              let bonusMartell = 0;
               Object.values(gameState.territorios).forEach(tPropio => {
                  if(tPropio.propietario === casa) {
                      bonusMartell += (tPropio.edificios || []).filter(e => EDIFICIOS_PRODUCCION.includes(e)).length * 10;
                  }
               });
               oroTotalTurno += bonusMartell;
               const liMartell = document.createElement('li');
               liMartell.style.cssText = 'font-style: italic; color: #FFD700;'; // Dorado
               liMartell.innerHTML = `Bonus Secta Pentos: +${bonusMartell}💰`;
               listaUl.appendChild(liMartell);
         }


     } else {
         listaUl.innerHTML = '<li>Aún no posees territorios.</li>';
     }
     contadorSpan.textContent = contador;
     oroSpan.textContent = oroTotalTurno; // Muestra el total calculado para el turno
     abrirModal('modal-mis-territorios');
}

// =============================================
// PARTE 3: DOMContentLoaded - INICIALIZACIÓN Y LISTENERS
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("==========================================");
    console.log("DOM Cargado. Iniciando scriptjuego.js...");

    // 1. Validar Datos Iniciales (nombre, casa, partida)
    if (!nombre || !casa || !partida) {
        console.error("¡CRÍTICO! Faltan datos URL (nombre, casa, partida). Redirigiendo a inicio.");
        alert("Error: Faltan datos esenciales para iniciar el juego.");
        window.location.href = 'index.html';
        return;
    }
    console.log(`Datos OK: Jugador=${nombre}, Casa=${casa}, Partida=${partida}`);

    // 2. Configurar UI Inicial básica (fondo, logo)
    try {
        setFondoPorCasa(casa);
        setLogoPorCasa(casa);
        document.getElementById('turno-jugador').textContent = 'Cargando...';
        document.getElementById('accion-jugador').textContent = '';
        console.log("[Init] UI Inicial OK.");
    } catch (e) { console.error("[Init] Error UI inicial:", e); return; }

     // 3. Ocultar elementos hasta recibir estado
     document.getElementById('oro-jugador').style.display = 'none';
     document.getElementById('tropas-jugador').style.display = 'none';
     document.getElementById('boton-accion').style.display = 'none';
     deshabilitarBotonesAccion(true); // Deshabilitar botones de acción al inicio

    // 4. Añadir TODOS los Event Listeners
    console.log("[Init] Añadiendo listeners...");
    let listenersOk = true;
    try {
        // Helper para añadir listeners y verificar existencia del elemento
        const setupListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
                console.log(`  -> Listener '${event}' añadido a #${id}`);
            } else {
                console.warn(`WARN: Elemento #${id} no encontrado para añadir listener '${event}'.`);
                listenersOk = false; // Marcar que algo falló, pero continuar
            }
        };

        // Botones barra superior y principal
        setupListener('logo-casa-container', 'click', abrirModalMisTerritorios);
        setupListener('boton-accion', 'click', siguienteAccion);

        // Botones de Acción específica
        setupListener('btn-batalla', 'click', () => { poblarTerritoriosAtacables(); abrirModal('modal-batalla'); });
        setupListener('btn-reclutar', 'click', () => { poblarTerritoriosReclutar(); poblarUnidadesReclutar(); abrirModal('modal-reclutar'); });
        setupListener('btn-construir', 'click', () => { poblarTerritoriosConstruir(); poblarEdificiosConstruir(); abrirModal('modal-construir'); });
        setupListener('btn-mover', 'click', () => terminarAccionEspecifica('Mover/Atacar')); // Acción simplificada
        setupListener('btn-reorganizar', 'click', () => terminarAccionEspecifica('Reorganizar')); // Acción simplificada

        // --- Listeners para Modal Batalla ---
        setupListener('btn-cerrar-modal-batalla', 'click', () => cerrarModal('modal-batalla'));
        setupListener('btn-confirmar-batalla', 'click', confirmarBatalla);
        setupListener('btn-cancelar-batalla', 'click', () => cerrarModal('modal-batalla'));
        setupListener('btn-restar-perdidas-atacante', 'click', () => ajustarPerdidas('input-perdidas-atacante', -1));
        setupListener('btn-sumar-perdidas-atacante', 'click', () => ajustarPerdidas('input-perdidas-atacante', 1));
        setupListener('btn-restar-perdidas-defensor', 'click', () => ajustarPerdidas('input-perdidas-defensor', -1));
        setupListener('btn-sumar-perdidas-defensor', 'click', () => ajustarPerdidas('input-perdidas-defensor', 1));

        // --- Listeners para Modal Reclutar ---
        // (Los botones +/- ahora llaman directamente a ajustarCantidadReclutar en el HTML)
         setupListener('select-territorio-reclutar', 'change', actualizarCostoReclutar);
         setupListener('select-unidad-reclutar', 'change', actualizarCostoReclutar);
         setupListener('input-cantidad-reclutar', 'input', actualizarCostoReclutar);
         setupListener('btn-confirmar-reclutar', 'click', confirmarReclutar);
         // (El botón cancelar llama a cerrarModal en el HTML)

        // --- Listeners para Modal Construir ---
         setupListener('select-territorio-construir', 'change', actualizarCostoConstruir);
         setupListener('select-edificio-construir', 'change', actualizarCostoConstruir);
         setupListener('btn-confirmar-construir', 'click', confirmarConstruir);
         // (El botón cancelar llama a cerrarModal en el HTML)

        // --- Listeners para Modal Mis Territorios ---
        setupListener('btn-cerrar-modal-territorios', 'click', () => cerrarModal('modal-mis-territorios'));
        setupListener('btn-ok-modal-territorios', 'click', () => cerrarModal('modal-mis-territorios'));


        if (!listenersOk) console.error("¡¡ ALGUNOS LISTENERS NO SE PUDIERON AÑADIR !! Revisa warnings.");
        else console.log("[Init] Listeners añadidos OK.");

    } catch (e) {
        console.error("¡¡ ERROR CRÍTICO añadiendo listeners !!", e);
        alert("Error inicializando controles de la página.");
        return; // Detener ejecución si falla aquí
    }

    // 5. Esperar conexión y solicitar estado inicial (manejado por socket.on('connect'))
    console.log("Esperando conexión al servidor para unirse a la sala y recibir estado...");

    console.log("==========================================");
    console.log("Inicialización del cliente de juego COMPLETADA.");
}); // Fin DOMContentLoaded

// =============================================
// PARTE 4: LISTENERS DE SOCKET.IO
// =============================================
// (Estos se definen fuera de DOMContentLoaded para estar siempre activos)

socket.on('connect', () => {
    console.log(`[Juego ${nombre}] Conectado al servidor con ID: ${socket.id}`);
    // Solicitar unirse a la sala específica del juego
    if (partida && nombre) {
        console.log(`[${nombre}] Conectado. Emitiendo 'unirse-sala-juego' a ${partida}`);
        socket.emit('unirse-sala-juego', { partida, nombre });
        // El servidor responderá con 'actualizar-estado-juego' si la unión es exitosa
    } else {
        console.error("Error crítico: Falta 'partida' o 'nombre' al conectar.");
        alert("Error de conexión: Faltan datos de la partida.");
    }
});

socket.on('disconnect', (reason) => {
    console.warn(`[Juego ${nombre}] Desconectado: ${reason}`);
    alert("¡Desconectado del servidor! Intenta recargar la página.");
    // Deshabilitar UI para evitar acciones inválidas
    deshabilitarBotonesAccion(true);
    document.getElementById('turno-jugador').textContent = 'Desconectado';
    document.getElementById('accion-jugador').textContent = '';
});

socket.on('error', (mensaje) => {
    console.error(`[Juego ${nombre}] Error del servidor: ${mensaje}`);
    alert(`Error del servidor: ${mensaje}`);
});

socket.on('error-accion', (mensaje) => {
    console.warn(`[Juego ${nombre}] Acción inválida recibida: ${mensaje}`);
    alert(`Acción inválida: ${mensaje}`);
    // Reactivar botones si el jugador estaba esperando y la acción falló
    if (gameState && gameState.jugadoresAccionTerminada && !gameState.jugadoresAccionTerminada.includes(nombre)) {
        deshabilitarBotonesAccion(false); // Habilitar de nuevo
        actualizarTurnoAccionUI(); // Restaurar texto/estado del botón principal
    }
});

socket.on('avanzar-accion', (nuevoEstado) => {
    console.log(`[${nombre}] Recibido 'avanzar-accion'`, nuevoEstado);
    if (gameState && nuevoEstado) {
        // Actualizar solo las propiedades relevantes del avance
        gameState.turno = nuevoEstado.turno;
        gameState.accion = nuevoEstado.accion;
        gameState.fase = nuevoEstado.fase;
        gameState.jugadoresAccionTerminada = []; // Todos empiezan sin haber terminado
    } else if(nuevoEstado){
        console.warn("Recibido 'avanzar-accion' pero gameState local es nulo. Esperando estado completo.");
        // Podríamos almacenar temporalmente nuevoEstado y aplicarlo cuando llegue gameState
    }
    // Actualizar UI y reactivar botones (si no es Fase Neutral)
    actualizarTurnoAccionUI();
    deshabilitarBotonesAccion(gameState?.fase === 'Neutral');
    console.log(`[${nombre}] Avanzado localmente a T${gameState?.turno}, A${gameState?.accion}, F:${gameState?.fase}`);
});

socket.on('estado-espera-jugadores', (mensaje) => {
    const estadoTurnoEl = document.getElementById('estado-turno');
    // Mostrar mensaje de espera solo si este jugador *no* ha terminado su acción aún
     if (estadoTurnoEl && gameState && gameState.fase === 'Accion' && !gameState.jugadoresAccionTerminada?.includes(nombre)) {
        estadoTurnoEl.textContent = mensaje;
     } else if (estadoTurnoEl) {
         estadoTurnoEl.textContent = ""; // Limpiar en otros casos
     }
});

// Listener PRINCIPAL para recibir y aplicar el estado del juego
socket.on('actualizar-estado-juego', (estadoRecibido) => {
    console.log("[Cliente] Recibido 'actualizar-estado-juego'");
    // console.log(estadoRecibido); // Descomentar para depurar el estado recibido

    if (!estadoRecibido || typeof estadoRecibido !== 'object') {
        console.error("Estado recibido inválido o vacío.");
        return;
    }

    // --- Estrategia de Actualización: Reemplazo Completo ---
    // Por simplicidad y robustez inicial, reemplazamos todo el gameState local.
    // Más adelante se podría optimizar para fusionar solo cambios.
    gameState = estadoRecibido;
    console.log("   -> GameState local actualizado completamente.");

    // Validar que el gameState recibido es usable
    if (!gameState.jugadores || !gameState.territorios || !gameState.jugadores[nombre]) {
        console.error("El estado recibido no contiene la información mínima necesaria (jugadores, territorios, datos propios).");
        // Podríamos intentar solicitar de nuevo el estado o mostrar un error grave.
        alert("Error al sincronizar con el servidor. Intenta recargar.");
        return;
    }

    // --- Actualizar TODA la UI basada en el nuevo gameState ---
    try {
        actualizarInfoJugador();
        actualizarTurnoAccionUI();
        actualizarInfoAdicional();
        // Habilitar/Deshabilitar botones según la fase actual y si el jugador ya terminó
        deshabilitarBotonesAccion(gameState.fase === 'Neutral' || gameState.jugadoresAccionTerminada?.includes(nombre));

        console.log("   -> UI actualizada correctamente.");
    } catch (error) {
        console.error("Error al actualizar la UI con el nuevo estado:", error);
        // Intentar continuar, pero loguear el error.
    }
});

// Listener para cuando otro jugador se desconecta (opcional)
socket.on('jugador-desconectado', (nombreDesconectado) => {
    console.log(`[Juego] Jugador ${nombreDesconectado} se ha desconectado.`);
    alert(`Jugador ${nombreDesconectado} se ha desconectado.`);
    // La UI de espera se actualizará automáticamente si afecta al avance del turno
});

// --- FIN DEL SCRIPT ---