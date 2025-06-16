// js/state.js
export let estadoActual = "";
export let inicioEstado;
export const tiemposEstados = [];

export const registerState = (estado, timestamp) => {
    if (estado !== estadoActual) {
        const finEstado = new Date();
        if (estadoActual !== "") {
            const duracion = (finEstado - inicioEstado) / 1000;
            const row = `<tr><td>${estadoActual}</td><td>${timestamp}</td><td>${duracion.toFixed(2)} s</td></tr>`;
            const estadoTable = document.getElementById("estadoTable");
            if (estadoTable) { // Añadir verificación para asegurar que el elemento existe
                estadoTable.innerHTML += row;
            }
            tiemposEstados.push({ estado: estadoActual, duracion: duracion });
        }
        estadoActual = estado;
        inicioEstado = new Date();
    }
};

/**
 * Calcula el tiempo promedio de llenado.
 * @param {Array} currentFullTimes - El array de timestamps de "Lleno" desde el backend (o gestionado localmente).
 * @returns {number | null} El promedio en milisegundos o null si no hay suficientes datos.
 */
export const calculateAverageFillTime = (currentFullTimes) => {
    // Necesitamos al menos 3 registros de "Lleno" para calcular el promedio
    if (!currentFullTimes || currentFullTimes.length < 3) {
        // Asegúrate de que document.getElementById("averageFillTime") exista
        const avgDisplay = document.getElementById("averageFillTime");
        if (avgDisplay) {
            avgDisplay.innerText = `Promedio: -- segundos`; // Resetear si no hay suficientes datos
        }
        return null; // No hay suficientes datos para un promedio significativo
    }

    // Calcula la duración del llenado entre cada evento "Lleno"
    let totalDurations = 0;
    let validDurationsCount = 0;

    for (let i = 1; i < currentFullTimes.length; i++) {
        const time1 = new Date(currentFullTimes[i - 1]).getTime();
        const time2 = new Date(currentFullTimes[i]).getTime();
        // Asegúrate de que las fechas sean válidas y la diferencia sea positiva
        if (!isNaN(time1) && !isNaN(time2) && time2 > time1) {
            totalDurations += (time2 - time1); // Duración en milisegundos
            validDurationsCount++;
        }
    }

    if (validDurationsCount === 0) {
        const avgDisplay = document.getElementById("averageFillTime");
        if (avgDisplay) {
            avgDisplay.innerText = `Promedio: -- segundos`;
        }
        return null; // No se pudieron calcular duraciones válidas
    }

    const promedio = totalDurations / validDurationsCount;
    const avgDisplay = document.getElementById("averageFillTime");
    if (avgDisplay) {
        // Asegúrate que esto se actualice correctamente en el display principal de "Promedio"
        avgDisplay.innerText = `Promedio: ${(promedio / 1000).toFixed(2)} segundos`;
    }
    return promedio; // Retornar el promedio en milisegundos
};


export const getRecommendationMessage = (averageFillTime) => {
    const promedioNum = parseFloat(averageFillTime);
    let mensaje = "";

    if (typeof promedioNum === 'number' && !isNaN(promedioNum) && promedioNum > 0) {
        let recommendations;
        // Ajusta los umbrales de promedio según tus necesidades (en milisegundos)
        const SECONDS_10 = 10 * 1000;
        const SECONDS_20 = 20 * 1000;

        if (promedioNum < SECONDS_10) {
            recommendations = [
                "El tacho se está llenando rápidamente. Planifica vaciados frecuentes.",
                "El tiempo de llenado es corto. Vigílalo de cerca."
            ];
        } else if (promedioNum < SECONDS_20) {
            recommendations = [
                "El tiempo de llenado es moderado. Ajusta la planificación si es necesario.",
                "El tiempo de llenado es aceptable. Considera un monitoreo periódico."
            ];
        } else {
            recommendations = [
                "El tacho se llena lentamente. Revisa que todo funcione bien.",
                "El llenado es prolongado. Considera revisar el sistema."
            ];
        }
        mensaje = getRandomRecommendation(recommendations);
    } else {
        mensaje = "No hay datos suficientes para proporcionar una recomendación.";
    }
    return mensaje;
};

const getRandomRecommendation = (recommendations) => {
    const index = Math.floor(Math.random() * recommendations.length);
    return recommendations[index];
};

// Función para simular la detección del sensor (mantener si es necesario para pruebas)
export const sensorDetectsFull = () => {
    return Math.random() > 0.5;
};