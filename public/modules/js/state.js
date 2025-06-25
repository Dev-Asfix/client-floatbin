// public/modules/js/state.js

/**
 * Registra el estado actual de un tacho específico, calcula la duración y actualiza la tabla.
 * Ahora recibe un 'deviceState' específico para el tacho.
 * @param {string} estado - El estado actual (ej., "Vacio", "Lleno").
 * @param {number} sensorTimestamp - El timestamp del sensor (millis() del ESP32).
 * @param {object} deviceState - El objeto de estado para el dispositivo específico (contiene estadoActual, inicioEstado, fullTimes, etc.).
 */
export const registerStateForDevice = (estado, sensorTimestamp, deviceState) => {
    // Convertir el timestamp del sensor (millis del ESP32) a una fecha legible
    // Para la visualización en la UI, es mejor usar la fecha/hora local del cliente.
    const displayTimestamp = new Date().toLocaleString();

    if (estado !== deviceState.estadoActual) {
        const finEstado = new Date(); // Hora actual para el fin del estado
        if (deviceState.estadoActual !== "") {
            const duracion = (finEstado - deviceState.inicioEstado) / 1000; // Duración en segundos
            deviceState.tiemposEstados.push({ estado: deviceState.estadoActual, duracion });

            // Solo registra los eventos de llenado completo para el cálculo de fullTimes
            // Si el estado actual (el nuevo estado) es "Lleno", significa que acaba de llenarse.
            // Registramos el timestamp exacto en que se "Lleno".
            if (estado === "Lleno") {
                deviceState.fullTimes.push(finEstado.toISOString()); // Almacena la hora exacta en formato ISO string
            }

            // Aquí se actualiza la tabla. El HTML de tacho.html tiene el <tbody> con id="estadoTable"
            const row = `<tr><td>${deviceState.estadoActual}</td><td>${displayTimestamp}</td><td>${duracion.toFixed(2)} s</td></tr>`;
            const estadoTable = document.getElementById("estadoTable"); // Esto sigue siendo un ID global para la tabla en tacho.html
            if (estadoTable) {
                // Opcional: Limitar el número de filas en la tabla para evitar sobrecarga del DOM
                const MAX_TABLE_ROWS = 10; // Por ejemplo, mantener solo las últimas 10 entradas
                if (estadoTable.rows.length >= MAX_TABLE_ROWS) {
                    estadoTable.deleteRow(0); // Eliminar la fila más antigua
                }
                estadoTable.innerHTML += row;
            }
        }
        deviceState.estadoActual = estado;
        deviceState.inicioEstado = new Date(); // Inicia el nuevo estado con la hora actual
    }
};

/**
 * Formatea un tiempo dado en milisegundos a la unidad más comprensible.
 * @param {number} ms - Tiempo en milisegundos.
 * @returns {string} Cadena de tiempo formateada.
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
 * Calcula el tiempo promedio de llenado utilizando eventos recientes para un tacho específico.
 * Ahora recibe el array 'fullTimes' del dispositivo como argumento.
 * @param {string[]} fullTimes - Array de timestamps en formato ISO string cuando el tacho estuvo lleno.
 * @returns {number|null} El tiempo promedio de llenado en milisegundos, o null si no hay datos suficientes.
 */
export function calculateAdaptiveAverage(fullTimes) {
    // Se necesitan al menos 2 tiempos de llenado para calcular un intervalo
    if (fullTimes.length < 2) {
        // La actualización del DOM para averageFillTime ahora se maneja en tacho.js o dashboard.js
        return null;
    }

    // Considerar un número razonable de eventos recientes para el promedio (ej., los últimos 5)
    // Ajusta la cantidad de elementos a cortar según cuántos eventos recientes quieras ponderar más.
    const recentEventsToConsider = 5;
    const recent = fullTimes.slice(-recentEventsToConsider); // Los últimos 'recentEventsToConsider' eventos

    let totalDiff = 0;
    for (let i = 1; i < recent.length; i++) {
        const t1 = new Date(recent[i - 1]).getTime();
        const t2 = new Date(recent[i]).getTime();
        const diff = t2 - t1;
        totalDiff += diff;
    }

    const averageMs = totalDiff / (recent.length - 1);

    // No se actualiza el DOM aquí, se retorna el valor
    return averageMs;
}

/**
 * Detecta si ha ocurrido un cambio brusco reciente en el patrón de llenado para un tacho específico.
 * Ahora recibe el array 'fullTimes' del dispositivo como argumento.
 * @param {string[]} fullTimes - Array de timestamps en formato ISO string cuando el tacho estuvo lleno.
 * @param {number} threshold - El umbral de diferencia porcentual (ej., 0.4 para 40%).
 * @returns {boolean} True si se detecta un cambio drástico, false en caso contrario.
 */
export function detectCambioBrusco(fullTimes, threshold = 0.4) {
    // Se necesitan suficientes puntos de datos para comparar promedios "recientes" vs "antiguos"
    const eventsForComparison = 8; // ej., 4 recientes, 4 antiguos para comparación
    if (fullTimes.length < eventsForComparison) return false;

    const recentSlice = fullTimes.slice(-4); // Últimos 4 eventos
    const oldSlice = fullTimes.slice(0, fullTimes.length - 4); // Todos los eventos excepto los últimos 4

    // Calcular promedio para datos recientes
    let recentTotal = 0;
    for (let i = 1; i < recentSlice.length; i++) {
        const t1 = new Date(recentSlice[i - 1]).getTime();
        const t2 = new Date(recentSlice[i]).getTime();
        recentTotal += (t2 - t1);
    }
    const recentAvg = recentTotal / (recentSlice.length - 1);

    // Calcular promedio para datos antiguos
    let oldTotal = 0;
    for (let i = 1; i < oldSlice.length; i++) {
        const t1 = new Date(oldSlice[i - 1]).getTime();
        const t2 = new Date(oldSlice[i]).getTime();
        oldTotal += (t2 - t1);
    }
    const oldAvg = oldTotal / (oldSlice.length - 1);

    // Evitar división por cero o promedios inválidos
    if (isNaN(recentAvg) || isNaN(oldAvg) || oldAvg === 0) return false;

    const diff = Math.abs(recentAvg - oldAvg) / oldAvg;
    return diff > threshold;
}

/**
 * Genera una recomendación adaptativa basada en el tiempo promedio de llenado y cambios recientes para un tacho específico.
 * Ahora recibe el array 'fullTimes' del dispositivo como argumento.
 * @param {string[]} fullTimes - Array de timestamps en formato ISO string cuando el tacho estuvo lleno.
 * @returns {string} El mensaje de recomendación inteligente.
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
 * Opción básica para recomendaciones con umbrales fijos (útil como respaldo).
 * @param {number|null} averageFillTime - El tiempo promedio de llenado en milisegundos.
 * @returns {string} El mensaje de recomendación basado en umbrales fijos.
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
 * Simulación para pruebas sin hardware real. (No se usa directamente en este contexto, pero se mantiene por completitud)
 */
export const sensorDetectsFull = () => {
    return Math.random() > 0.5;
};