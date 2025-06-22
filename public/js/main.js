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
    fullTimes,
    calculateAdaptiveAverage,
    getSmartRecommendation
} from './state.js';
import {
    initializeAudio,
    playSequentialAudios,
    stopAudio,
    isAudioPlaying
} from './audio.js';

// Inicializa el reproductor y la animación del ícono
document.addEventListener('DOMContentLoaded', () => {
    initializeAudio();
    animateAudioIcon();
});

// Lógica principal al recibir datos del WebSocket
const handleWebSocketMessage = (data) => {
    // Actualiza los datos visibles
    updateSensorData(data);
    updateTrashCanVisual(data.estado);
    registerState(data.estado, data.timestamp);

    // Cálculo adaptativo desde frontend
    const averageTime = calculateAdaptiveAverage(fullTimes);

    // Actualiza predicción y recomendación
    updatePredictionDisplay(averageTime);
    displayRecommendation(getSmartRecommendation(fullTimes));

    // Control del audio según el estado
    if (data.estado === "Lleno" && !isAudioPlaying()) {
        playSequentialAudios(data.estado);
    } else if (data.estado !== "Lleno" && isAudioPlaying()) {
        stopAudio();
    }
};

// Conexión al WebSocket
connectWebSocket(
    handleWebSocketMessage,
    (error) => console.error("Error de conexión WebSocket:", error),
    () => console.log("Conexión WebSocket cerrada desde main.js")
);
