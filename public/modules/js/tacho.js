// public/modules/js/tacho.js

import { connectWebSocket } from './websocket.js'; // Ruta ajustada
import {
    updatePredictionDisplay,
    updateSensorData,
    updateTrashCanVisual,
    displayRecommendation,
    animateAudioIcon
} from './ui.js'; // Ruta ajustada
import {
    registerStateForDevice, // Importa la función que acepta deviceState
    calculateAdaptiveAverage,
    getSmartRecommendation
} from './state.js'; // Ruta ajustada
import {
    initializeAudio,
    playSequentialAudios,
    stopAudio,
    isAudioPlaying
} from './audio.js'; // Ruta ajustada

// --- CAMBIO CLAVE: Obtener el deviceId de la URL ---
const urlParams = new URLSearchParams(window.location.search);
const TARGET_DEVICE_ID = urlParams.get('deviceId');

// Objeto para almacenar el estado de UN ÚNICO tacho en el frontend
let currentDeviceState = {
    estadoActual: "",
    inicioEstado: null,
    tiemposEstados: [],
    fullTimes: [],
    averageFillTime: null
};

// Si no hay deviceId en la URL, redirigir al dashboard o mostrar un error
if (!TARGET_DEVICE_ID) {
    alert("No se especificó un ID de tacho. Redirigiendo al dashboard.");
    window.location.href = 'dashboard.html'; // Redirige a la página principal del módulo
}

// Inicializa el reproductor y la animación del ícono
document.addEventListener('DOMContentLoaded', () => {
    const h2Element = document.getElementById("h2e");
    if (h2Element) {
        h2Element.textContent = `FlotaBin IA - ${TARGET_DEVICE_ID}`;
    }

    initializeAudio();
    animateAudioIcon();
});

// Lógica principal al recibir datos del WebSocket
const handleWebSocketMessage = (data) => {
    // Filtrar mensajes: solo procesar datos para el tacho objetivo
    if (data.deviceId !== TARGET_DEVICE_ID) {
        // console.log(`Ignorando datos de ${data.deviceId}. Solo procesando ${TARGET_DEVICE_ID}.`);
        return; // Ignorar si no es el tacho que queremos mostrar
    }

    // A partir de aquí, 'data' contiene los datos del tacho objetivo
    // Y utilizaremos 'currentDeviceState' para almacenar su historial.

    // 1. Actualiza los datos visibles en el UI con los datos recibidos
    updateSensorData(data); // `data` ya tiene `estado`, `distancia`, `timestamp`
    updateTrashCanVisual(data.estado);

    // 2. Registra el estado para este tacho específico
    registerStateForDevice(data.estado, data.timestamp, currentDeviceState); // Pasa currentDeviceState

    // 3. Cálculo adaptativo para este tacho
    currentDeviceState.averageFillTime = calculateAdaptiveAverage(currentDeviceState.fullTimes);

    // 4. Actualiza predicción y recomendación
    updatePredictionDisplay(currentDeviceState.averageFillTime);
    displayRecommendation(getSmartRecommendation(currentDeviceState.fullTimes));

    // 5. Control del audio según el estado
    if (data.estado === "Lleno" && !isAudioPlaying()) {
        playSequentialAudios(data.estado);
    } else if (data.estado !== "Lleno" && isAudioPlaying()) {
        stopAudio();
    }
};

// Conexión al WebSocket
connectWebSocket(
    handleWebSocketMessage,
    (error) => console.error("Error de conexión WebSocket en tacho.js:", error),
    () => console.log("Conexión WebSocket cerrada desde tacho.js")
);