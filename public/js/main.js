// js/main.js

import { connectWebSocket } from './websocket.js';
import {
    updatePredictionDisplay,
    updateSensorData,
    updateTrashCanVisual,
    displayRecommendation,
    animateAudioIcon
} from './ui.js';
import {
    registerState,
    fullTimes, // Este fullTimes aún es global, lo ajustaremos
    calculateAdaptiveAverage,
    getSmartRecommendation
} from './state.js';
import {
    initializeAudio,
    playSequentialAudios,
    stopAudio,
    isAudioPlaying
} from './audio.js';

// --- NUEVA LÍNEA: Define el ID del tacho que este frontend debe monitorear ---
const TARGET_DEVICE_ID = "Tacho-01"; // <--- ¡Define el ID del tacho aquí!
// Si en el futuro quieres que sea dinámico desde la URL, lo veríamos después.

// --- NUEVO: Estructura para almacenar el estado de UN ÚNICO tacho en el frontend ---
// Estos serán los datos específicos del TACHO-01
let currentDeviceState = {
    estadoActual: "",
    inicioEstado: null,
    tiemposEstados: [],
    fullTimes: [], // Esto es crucial, ahora fullTimes es específico para el tacho objetivo
    averageFillTime: null // Para almacenar el promedio calculado para este tacho
};


// Inicializa el reproductor y la animación del ícono
document.addEventListener('DOMContentLoaded', () => {
    // Aquí puedes actualizar el título o algún elemento para mostrar qué tacho se está monitoreando
    const h2Element = document.getElementById("h2e");
    if (h2Element) {
        h2Element.textContent = `FlotaBin IA - ${TARGET_DEVICE_ID}`;
    }

    initializeAudio();
    animateAudioIcon();
});

// Lógica principal al recibir datos del WebSocket
const handleWebSocketMessage = (data) => {
    // --- FILTRADO DE MENSAJES: Solo procesar datos para el tacho objetivo ---
    if (data.deviceId !== TARGET_DEVICE_ID) {
        // console.log(`Ignorando datos de ${data.deviceId}. Solo procesando ${TARGET_DEVICE_ID}.`);
        return; // Ignorar si no es el tacho que queremos mostrar
    }

    // A partir de aquí, 'data' contiene los datos del Tacho-01
    // Y utilizaremos 'currentDeviceState' para almacenar su historial.

    // 1. Actualiza los datos visibles en el UI con los datos recibidos
    updateSensorData(data); // `data` ya tiene `estado`, `distancia`, `timestamp`

    // 2. Actualiza la visualización del tacho (nivel de llenado)
    updateTrashCanVisual(data.estado);

    // 3. Registra el estado para este tacho específico
    // Necesitamos pasar el 'currentDeviceState' a una versión modificada de registerState
    registerSpecificState(data.estado, data.timestamp, currentDeviceState);


    // 4. Cálculo adaptativo para este tacho
    // calculateAdaptiveAverage y getSmartRecommendation ahora usarán el fullTimes del tacho específico
    currentDeviceState.averageFillTime = calculateAdaptiveAverage(currentDeviceState.fullTimes);


    // 5. Actualiza predicción y recomendación en el UI
    updatePredictionDisplay(currentDeviceState.averageFillTime);
    displayRecommendation(getSmartRecommendation(currentDeviceState.fullTimes));


    // 6. Control del audio según el estado
    // Asegúrate de que el audio solo se active para este tacho si es 'Lleno'
    if (data.estado === "Lleno" && !isAudioPlaying()) {
        playSequentialAudios(data.estado);
    } else if (data.estado !== "Lleno" && isAudioPlaying()) {
        stopAudio();
    }
};

// --- NUEVA FUNCIÓN: registerSpecificState (similar a registerState pero para un objeto de estado) ---
// La lógica de `registerState` se adapta para trabajar con un objeto de estado pasado como argumento.
const registerSpecificState = (estado, sensorTimestamp, deviceState) => {
    const displayTimestamp = new Date().toLocaleString(); // Usar la fecha/hora actual del frontend para la tabla

    if (estado !== deviceState.estadoActual) {
        const finEstado = new Date();
        if (deviceState.estadoActual !== "") {
            const duracion = (finEstado - deviceState.inicioEstado) / 1000;
            deviceState.tiemposEstados.push({ estado: deviceState.estadoActual, duracion });

            if (estado === "Lleno") {
                deviceState.fullTimes.push(finEstado.toISOString()); // Almacenar el tiempo exacto en ISO string
            }

            // Aquí se actualiza la tabla. Asegúrate de que el HTML tiene el <tbody> con id="estadoTable"
            const row = `<tr><td>${deviceState.estadoActual}</td><td>${displayTimestamp}</td><td>${duracion.toFixed(2)} s</td></tr>`;
            const estadoTable = document.getElementById("estadoTable");
            if (estadoTable) {
                // Opcional: Limitar el número de filas en la tabla para evitar sobrecarga del DOM
                const MAX_TABLE_ROWS = 10;
                if (estadoTable.rows.length >= MAX_TABLE_ROWS) {
                    estadoTable.deleteRow(0); // Eliminar la fila más antigua
                }
                estadoTable.innerHTML += row;
            }
        }
        deviceState.estadoActual = estado;
        deviceState.inicioEstado = new Date();
    }
};


// Conexión al WebSocket
connectWebSocket(
    handleWebSocketMessage,
    (error) => console.error("Error de conexión WebSocket:", error),
    () => console.log("Conexión WebSocket cerrada desde main.js")
);