// js/main.js
import { connectWebSocket } from './websocket.js';
import { updatePredictionDisplay, updateSensorData, updateTrashCanVisual, displayRecommendation, animateAudioIcon } from './ui.js';
import { estadoActual, registerState, calculateAverageFillTime, getRecommendationMessage } from './state.js';
import { initializeAudio, playSequentialAudios, stopAudio, isAudioPlaying } from './audio.js';

// Inicializar el audio player y el contenedor al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeAudio();
    animateAudioIcon(); // Iniciar la animación del ícono de audio
});

const handleWebSocketMessage = (data) => {
    // Lógica para la actualización de datos del sensor
    updateSensorData(data);
    updateTrashCanVisual(data.estado);
    registerState(data.estado, data.timestamp); // Registra el estado para la tabla

    // El backend ya calcula y envía 'averageFillTime'.
    // Pasamos este valor directamente a la función de display.
    const averageTime = data.averageFillTime;

    // La función 'updatePredictionDisplay' en ui.js es la que decide qué mensaje mostrar
    // en la sección de "predicciones" basado en si 'averageTime' es > 0 o no.
    updatePredictionDisplay(averageTime);

    // Muestra la recomendación basada en el promedio.
    displayRecommendation(getRecommendationMessage(averageTime));

    // Lógica para reproducir/detener audio
    if (data.estado === "Lleno" && !isAudioPlaying()) {
        playSequentialAudios(data.estado);
    } else if (data.estado !== "Lleno" && isAudioPlaying()) {
        stopAudio();
    }
};

// Conectar el WebSocket al cargar la página
connectWebSocket(
    handleWebSocketMessage,
    (error) => { console.error("Error de conexión WebSocket:", error); },
    () => { console.log("Conexión WebSocket cerrada desde main.js"); }
);