// js/ui.js
import { formatTiempo } from './state.js'; // Import formatTiempo from state.js

export const updatePredictionDisplay = (averageFillTime) => {
    const prediccionElement = document.getElementById("prediccionLlenado");
    const waterEffect = document.getElementById("waterEffect");
    const sparksEffect = document.getElementById("sparksEffect");

    if (typeof averageFillTime === 'number' && averageFillTime > 0) {
        applyNoBackgroundStyle(prediccionElement);
        prediccionElement.textContent = `Llenado estimado en ${formatTiempo(averageFillTime)}.`;
        waterEffect.classList.remove("filling");
        sparksEffect.innerHTML = ""; // Clear sparks when there's data
    } else {
        applyBackgroundStyle(prediccionElement);
        prediccionElement.textContent = `Se necesitan al menos 2 llenados para calcular el promedio.`; // Changed from 3 to 2 for consistency with calculateAdaptiveAverage
        waterEffect.classList.add("filling");
        generateSparks(sparksEffect);
    }
};

const applyBackgroundStyle = (element) => {
    element.classList.add("with-background");
    element.classList.remove("no-background");
    element.classList.add("flickering");
};

const applyNoBackgroundStyle = (element) => {
    element.classList.add("no-background");
    element.classList.remove("with-background");
    element.classList.remove("flickering");
};

const generateSparks = (sparksEffect) => {
    sparksEffect.innerHTML = "";
    for (let i = 0; i < 100; i++) {
        const spark = document.createElement("div");
        spark.classList.add("spark");
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const animationDelay = Math.random() * 2;
        const size = Math.random() * 5 + 2;
        spark.style.left = `${x}%`;
        spark.style.top = `${y}%`;
        spark.style.width = `${size}px`;
        spark.style.height = `${size}px`;
        spark.style.animationDelay = `-${animationDelay}s`;
        sparksEffect.appendChild(spark);
    }
};

/**
 * Updates the sensor data display in the UI.
 * @param {object} data - Object containing sensor data (estado, distancia, timestamp).
 */
export const updateSensorData = (data) => {
    const localDate = new Date().toLocaleString(); // Use current local time for display
    document.getElementById("estado").innerText = `Estado: ${data.estado}`;
    document.getElementById("distancia").innerText = `Distancia: ${data.distancia} cm`;
    document.getElementById("fecha").innerText = `Fecha y Hora: ${localDate}`; // Display local date/time
    // Note: averageFillTime is updated by calculateAdaptiveAverage, not here directly.
    // document.getElementById("averageFillTime").innerText = `Promedio: --`; // This line should be removed or handled by calculateAdaptiveAverage directly

    if (data.alert) {
        document.getElementById("alerta").innerText = data.alert;
    }
};

export const updateTrashCanVisual = (estado) => {
    const nivel = document.getElementById("nivel");
    let porcentaje = 0;
    switch (estado) {
        case "Vacio": porcentaje = 0; break;
        case "Bajo": porcentaje = 25; break;
        case "Medio": porcentaje = 50; break;
        case "Alto": porcentaje = 75; break;
        case "Lleno": porcentaje = 100; break;
        default: porcentaje = 0;
    }
    nivel.style.height = `${porcentaje}%`;
};

export const displayRecommendation = (message) => {
    document.getElementById("mensajeRecomendacion").innerText = message;
};

export const activateElementStyles = (element) => {
    element.style.color = "#00ffcc";
    element.style.textShadow = "0px 0px 10px #00ffcc";
    element.style.background = "rgba(0, 255, 255, 0.2)";
};

export const deactivateElementStyles = (element) => {
    element.style.color = "";
    element.style.textShadow = "";
    element.style.background = "";
};

export const animateAudioIcon = () => {
    const image = document.querySelector(".audio-icon");
    if (!image) return;

    let angleX = 0;
    let angleY = 0;
    let directionX = 1;
    let directionY = 1;

    setInterval(() => {
        const isPlaying = image.closest(".audio-container")?.classList.contains("playing");

        if (isPlaying) {
            angleX += directionX * 0.5;
            angleY += directionY * 1.5;
            if (angleX > 15 || angleX < -10) directionX *= -1;
            if (angleY > 20 || angleY < -20) directionY *= -1;
        } else {
            angleX += directionX;
            angleY += directionY;
            if (angleX > 35 || angleX < -10) directionX *= -1;
            if (angleY > 30 || angleY < -30) directionY *= -1;
        }

        image.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg)`;
    }, 100);
};