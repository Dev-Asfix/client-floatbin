// public/modules/js/dashboard.js

import { connectWebSocket } from './websocket.js';
import { formatTiempo } from './state.js'; // Importar formatTiempo desde state.js

// Objeto para almacenar el estado de cada tacho por su deviceId
// Cada propiedad será un deviceId, y su valor será un objeto con los últimos datos de ese tacho
const allBinStates = {};

const tachoGrid = document.getElementById('tachoGrid');
const noDataMessage = document.getElementById('noDataMessage');
const searchInput = document.getElementById('searchInput');

// --- Función para generar colores HSL aleatorios ---
function getRandomHSLColors() {
    const hue = Math.floor(Math.random() * 360); // Tono aleatorio (0-359)
    const saturationBase = 80; // % - para colores vibrantes
    const lightnessBase = 60; // % - para buena visibilidad

    // Genera ligeras variaciones para el gradiente y el brillo
    const s1 = saturationBase + Math.random() * 10 - 5; // +/- 5% de saturación
    const l1 = lightnessBase + Math.random() * 10 - 5; // +/- 5% de luminosidad
    const s2 = saturationBase + Math.random() * 10 - 5;
    const l2 = lightnessBase + Math.random() * 10 - 5;

    // Colores para el gradiente principal del relleno (HSLA con transparencia)
    const color1 = `hsla(${hue}, ${s1}%, ${l1}%, 0.6)`;
    const color2 = `hsla(${hue}, ${s2}%, ${l2}%, 0.8)`;

    // Color para el brillo inicial y la lava (más saturado y un poco más claro)
    const glowColor = `hsla(${hue}, ${saturationBase + 10}%, ${lightnessBase + 10}%, 0.8)`;
    const lavaCenterColor = `hsla(${hue}, ${saturationBase + 5}%, ${lightnessBase}%, 0.6)`;
    const lavaEdgeColor = `hsla(${hue}, ${saturationBase}%, ${lightnessBase - 15}%, 0.3)`;


    // Genera 4 pasos de color para la animación de cambio de color
    // Ajusta el 'hue' ligeramente para que la animación parezca un "resplandor" o "flujo" en el color
    const stepHueDelta = 60; // Un delta de 60 grados para cada paso crea una bonita progresión de color
    const stepHue1 = (hue + stepHueDelta) % 360;
    const stepHue2 = (hue + stepHueDelta * 2) % 360;
    const stepHue3 = (hue + stepHueDelta * 3) % 360;
    const stepHue4 = (hue + stepHueDelta * 4) % 360;

    return {
        '--color-base-1': color1,
        '--color-base-2': color2,
        '--glow-color': glowColor,
        '--color-lava-center': lavaCenterColor,
        '--color-lava-edge': lavaEdgeColor,

        // Colores para los pasos de la animación cambioColor
        // Mantén la misma saturación y luminosidad base, solo cambia el tono para la animación
        '--color-step1-1': `hsla(${stepHue1}, ${s1}%, ${l1}%, 0.8)`,
        '--color-step1-2': `hsla(${stepHue1}, ${s2}%, ${l2}%, 1)`,
        '--glow-step1': `hsla(${stepHue1}, ${saturationBase + 10}%, ${lightnessBase + 10}%, 0.8)`,

        '--color-step2-1': `hsla(${stepHue2}, ${s1}%, ${l1}%, 0.8)`,
        '--color-step2-2': `hsla(${stepHue2}, ${s2}%, ${l2}%, 1)`,
        '--glow-step2': `hsla(${stepHue2}, ${saturationBase + 10}%, ${lightnessBase + 10}%, 0.8)`,

        '--color-step3-1': `hsla(${stepHue3}, ${s1}%, ${l1}%, 0.8)`,
        '--color-step3-2': `hsla(${stepHue3}, ${s2}%, ${l2}%, 1)`,
        '--glow-step3': `hsla(${stepHue3}, ${saturationBase + 10}%, ${lightnessBase + 10}%, 0.8)`,

        '--color-step4-1': `hsla(${stepHue4}, ${s1}%, ${l1}%, 0.8)`,
        '--color-step4-2': `hsla(${stepHue4}, ${s2}%, ${l2}%, 1)`,
        '--glow-step4': `hsla(${stepHue4}, ${saturationBase + 10}%, ${lightnessBase + 10}%, 0.8)`,
    };
}


// Función para actualizar o crear la tarjeta de un tacho
const updateBinCard = (data) => {
    const { deviceId, estado, distancia, timestamp, averageFillTime } = data;

    // Actualiza el estado en nuestro objeto global
    allBinStates[deviceId] = {
        estado,
        distancia,
        timestamp: new Date(timestamp).toLocaleString(), // Formatear para visualización
        averageFillTime
    };

    let card = document.getElementById(`card-${deviceId}`);
    if (!card) {
        // Crear una nueva tarjeta si no existe
        card = document.createElement('div');
        card.id = `card-${deviceId}`;
        card.classList.add('tacho-card');

        card.innerHTML = `
            <h3>${deviceId}</h3>
            <div class="tacho-visual">
                <div class="tacho-fill"></div>
            </div>
            <p>Estado: <span class="status-text" id="estado-${deviceId}"></span></p>
            <p>Distancia: <span id="distancia-${deviceId}"></span> cm</p>
            <p>Promedio Llenado: <span id="promedio-${deviceId}"></span></p>
            <button onclick="window.location.href='tacho.html?deviceId=${deviceId}'">Abrir Tacho</button>
            <button onclick="window.location.href='ubicacion/detail.html?deviceId=${deviceId}'" style="margin-top: 10px;">Ver Ubicación</button>
        `;
        tachoGrid.appendChild(card);

        // --- APLICAR COLORES ALEATORIOS SOLO CUANDO LA TARJETA SE CREA POR PRIMERA VEZ ---
        const tachoFill = card.querySelector('.tacho-fill');
        const randomColors = getRandomHSLColors();
        for (const prop in randomColors) {
            tachoFill.style.setProperty(prop, randomColors[prop]);
        }
        // --- FIN APLICACIÓN DE COLORES ALEATORIOS ---

    }

    // Actualizar los datos de la tarjeta
    document.getElementById(`estado-${deviceId}`).textContent = estado;
    document.getElementById(`distancia-${deviceId}`).textContent = distancia.toFixed(2);
    // Asegurarse de que averageFillTime sea un número válido antes de formatear
    document.getElementById(`promedio-${deviceId}`).textContent = formatTiempo(averageFillTime);


    // Actualizar el visual del tacho
    const fillElement = card.querySelector('.tacho-fill');
    let porcentaje = 0;
    switch (estado) {
        case "Vacio": porcentaje = 0; break;
        case "Bajo": porcentaje = 25; break;
        case "Medio": porcentaje = 50; break;
        case "Alto": porcentaje = 75; break;
        case "Lleno": porcentaje = 100; break;
        default: porcentaje = 0;
    }
    fillElement.style.height = `${porcentaje}%`;

    // Si hay datos, ocultar el mensaje de "No Data"
    noDataMessage.style.display = 'none';
};

// Función para filtrar los tachos mostrados
const filterBins = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const cards = tachoGrid.children;

    let anyVisible = false;
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const deviceIdElement = card.querySelector('h3');
        if (deviceIdElement) { // Asegurarse de que el elemento existe
            const deviceId = deviceIdElement.textContent.toLowerCase();
            if (deviceId.includes(searchTerm)) {
                card.style.display = 'flex'; // Mostrar la tarjeta
                anyVisible = true;
            } else {
                card.style.display = 'none'; // Ocultar la tarjeta
            }
        }
    }

    // Mostrar mensaje si no hay resultados visibles
    if (!anyVisible && Object.keys(allBinStates).length > 0) {
        noDataMessage.textContent = `No se encontraron tachos con el nombre "${searchInput.value}".`;
        noDataMessage.style.display = 'block';
    } else if (Object.keys(allBinStates).length === 0) {
        noDataMessage.textContent = 'No se han recibido datos de ningún tacho aún. Asegúrate de que tus dispositivos estén enviando información.';
        noDataMessage.style.display = 'block';
    } else {
        noDataMessage.style.display = 'none'; // Ocultar si hay resultados o datos iniciales
    }
};

// Lógica principal al recibir datos del WebSocket
// Esta función necesita ser mejorada en el servidor para que el servidor mantenga el estado de los tachos
// y envíe un "estado inicial" a los nuevos clientes, además de las actualizaciones en tiempo real.
// Por ahora, solo actualiza las tarjetas con los mensajes que llegan.
const handleWebSocketMessage = (data) => {
    // Aquí no filtramos por deviceId, queremos ver TODOS los tachos
    updateBinCard(data);
    filterBins(); // Volver a aplicar el filtro cada vez que llega un nuevo dato
};

// Conexión al WebSocket
// Aquí la URL debe apuntar a la raíz del servidor WebSocket, no a un archivo JS específico.
connectWebSocket(
    handleWebSocketMessage,
    (error) => console.error("Error de conexión WebSocket en Dashboard:", error),
    () => console.log("Conexión WebSocket cerrada desde dashboard.js")
);

// Listener para el campo de búsqueda
searchInput.addEventListener('input', filterBins);

// Mostrar el mensaje inicial si no hay tachos
document.addEventListener('DOMContentLoaded', () => {
    if (Object.keys(allBinStates).length === 0) {
        noDataMessage.style.display = 'block';
    }
});