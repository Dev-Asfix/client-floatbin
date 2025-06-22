// js/state.js

export let estadoActual = "";
export let inicioEstado; // Will store a Date object
export const tiemposEstados = []; // Stores { estado, duracion }
export const fullTimes = []; // Stores ISO strings of fill times

/**
 * Registers the current state of the bin, calculates duration, and updates the table.
 * @param {string} estado - The current state (e.g., "Vacio", "Lleno").
 * @param {number} sensorTimestamp - The timestamp from the sensor (ESP32's millis()).
 */
export const registerState = (estado, sensorTimestamp) => {
    // Convert sensor timestamp to a readable date string for the table
    // Note: This timestamp is from ESP32's millis(), not a universal time.
    // For display in UI, it's often better to use a local Date.
    const displayTimestamp = new Date().toLocaleString();

    if (estado !== estadoActual) {
        const finEstado = new Date(); // Current time for state end
        if (estadoActual !== "") {
            const duracion = (finEstado - inicioEstado) / 1000; // Duration in seconds
            tiemposEstados.push({ estado: estadoActual, duracion });

            // Only record full fill events for fullTimes calculation
            // The check is for the *previous* state becoming "Lleno" before changing
            // This logic assumes 'estadoActual' was the state that just ended.
            // If the current 'estado' is 'Lleno', it means it just BECAME full.
            // We record the timestamp when it *becomes* full.
            if (estado === "Lleno") {
                fullTimes.push(finEstado.toISOString()); // Store the exact time it became 'Lleno'
            }

            const row = `<tr><td>${estadoActual}</td><td>${displayTimestamp}</td><td>${duracion.toFixed(2)} s</td></tr>`;
            const estadoTable = document.getElementById("estadoTable");
            if (estadoTable) estadoTable.innerHTML += row;
        }
        estadoActual = estado;
        inicioEstado = new Date(); // Start new state with current time
    }
};

/**
 * Formats a given time in milliseconds to the most understandable unit.
 * @param {number} ms - Time in milliseconds.
 * @returns {string} Formatted time string.
 */
export function formatTiempo(ms) {
    if (ms === null || isNaN(ms) || ms <= 0) return "--";
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)} segundos`;
    const m = s / 60;
    if (m < 60) return `${m.toFixed(1)} minutos`;
    const h = m / 60;
    if (h < 24) return `${h.toFixed(1)} horas`;
    const d = h / 24;
    return `${d.toFixed(1)} días`;
}

/**
 * Calculates the average fill time using recent events.
 * @param {string[]} fullTimes - Array of ISO string timestamps when the bin was full.
 * @returns {number|null} The average fill time in milliseconds, or null if insufficient data.
 */
export function calculateAdaptiveAverage(fullTimes) {
    // Use a minimum of 2 full times to calculate an interval
    if (fullTimes.length < 2) {
        const avgDisplay = document.getElementById("averageFillTime");
        if (avgDisplay) avgDisplay.innerText = `Promedio: ${formatTiempo(null)}`; // Display "--"
        return null;
    }

    // Consider a reasonable number of recent events for the average (e.g., last 5)
    // Adjust slice count based on how many recent events you want to weigh more heavily.
    const recentEventsToConsider = 5;
    const recent = fullTimes.slice(-recentEventsToConsider); // Last 'recentEventsToConsider' events

    let totalDiff = 0;
    for (let i = 1; i < recent.length; i++) {
        const t1 = new Date(recent[i - 1]).getTime();
        const t2 = new Date(recent[i]).getTime();
        const diff = t2 - t1;
        totalDiff += diff;
    }

    const averageMs = totalDiff / (recent.length - 1);

    const avgDisplay = document.getElementById("averageFillTime");
    if (avgDisplay) avgDisplay.innerText = `Promedio: ${formatTiempo(averageMs)}`;

    return averageMs;
}

/**
 * Detects if a recent abrupt change in filling pattern has occurred.
 * @param {string[]} fullTimes - Array of ISO string timestamps when the bin was full.
 * @param {number} threshold - The percentage difference threshold (e.g., 0.4 for 40%).
 * @returns {boolean} True if a drastic change is detected, false otherwise.
 */
export function detectCambioBrusco(fullTimes, threshold = 0.4) {
    // Need enough data points to compare "recent" vs "old" averages
    const eventsForComparison = 8; // e.g., 4 recent, 4 old
    if (fullTimes.length < eventsForComparison) return false;

    const recentSlice = fullTimes.slice(-4); // Last 4 events
    const oldSlice = fullTimes.slice(0, fullTimes.length - 4); // All but the last 4 events

    // Calculate average for recent data
    let recentTotal = 0;
    for (let i = 1; i < recentSlice.length; i++) {
        const t1 = new Date(recentSlice[i - 1]).getTime();
        const t2 = new Date(recentSlice[i]).getTime();
        recentTotal += (t2 - t1);
    }
    const recentAvg = recentTotal / (recentSlice.length - 1);

    // Calculate average for older data
    let oldTotal = 0;
    for (let i = 1; i < oldSlice.length; i++) {
        const t1 = new Date(oldSlice[i - 1]).getTime();
        const t2 = new Date(oldSlice[i]).getTime();
        oldTotal += (t2 - t1);
    }
    const oldAvg = oldTotal / (oldSlice.length - 1);

    if (isNaN(recentAvg) || isNaN(oldAvg) || oldAvg === 0) return false; // Avoid division by zero or invalid averages

    const diff = Math.abs(recentAvg - oldAvg) / oldAvg;
    return diff > threshold;
}

/**
 * Generates an adaptive recommendation based on the average fill time and recent changes.
 * @param {string[]} fullTimes - Array of ISO string timestamps when the bin was full.
 * @returns {string} The smart recommendation message.
 */
export function getSmartRecommendation(fullTimes) {
    const promedio = calculateAdaptiveAverage(fullTimes);
    const cambioBrusco = detectCambioBrusco(fullTimes);

    if (promedio === null) return "⏳ Datos insuficientes para inferencias.";

    const tiempoFormateado = formatTiempo(promedio);

    if (cambioBrusco) {
        return `⚠️ Cambio abrupto detectado. Nuevo patrón de llenado: ${tiempoFormateado}.`;
    }

    return `📡 Estimación IA: ${tiempoFormateado}. Operación estable.`;
}

/**
 * Basic option for recommendations with fixed thresholds (useful as fallback).
 * @param {number|null} averageFillTime - The average fill time in milliseconds.
 * @returns {string} The recommendation message based on fixed thresholds.
 */
export const getRecommendationMessage = (averageFillTime) => {
    if (averageFillTime === null || averageFillTime <= 0) {
        return "No hay datos suficientes para proporcionar una recomendación.";
    }

    let recommendations;
    const SECONDS_10 = 10 * 1000;
    const SECONDS_20 = 20 * 1000;

    if (averageFillTime < SECONDS_10) {
        recommendations = [
            "Alta frecuencia de llenado detectada. El sistema sugiere vaciados más frecuentes.",
            "¡El tacho se llena muy rápido! Considera aumentar la frecuencia de recolección."
        ];
    } else if (averageFillTime < SECONDS_20) {
        recommendations = [
            "Ritmo estable de llenado. No se detectan anomalías por ahora.",
            "El patrón de llenado es consistente. Todo bajo control."
        ];
    } else {
        recommendations = [
            "Llenado lento. Sistema operativo en fase pasiva. Vigilancia reducida recomendada.",
            "El tacho se llena lentamente. No requiere atención urgente."
        ];
    }
    return getRandomRecommendation(recommendations);
};

const getRandomRecommendation = (recommendations) => {
    const index = Math.floor(Math.random() * recommendations.length);
    return recommendations[index];
};

/**
 * Simulación para pruebas sin hardware real. (Not directly used in this context, but kept for completeness)
 */
export const sensorDetectsFull = () => {
    return Math.random() > 0.5;
};