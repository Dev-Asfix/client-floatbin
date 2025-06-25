// public/modules/graficos/js/graficos.js

import { connectWebSocket } from '../../js/websocket.js';
import { showNotification } from './notifications.js';
import { formatTiempo } from '../../js/state.js';

// Register Chart.js zoom plugin
Chart.register(ChartZoom);

// --- Variables para los gráficos (Ahora serán instancias que pueden ser destruidas/recreadas) ---
let fillFrequencyChartInstance = null;
let statusDistributionChartInstance = null;
let distanceHistoryChartInstance = null;

// Objeto para almacenar el estado de CADA tacho
const allBinsData = {}; // { deviceId: { estado: 'Lleno', distancia: 10, timestamp: '...', history: [{ts, dist, time}], lastStatus: '...' }, ... }

// Elementos del DOM
const urgentBinsList = document.getElementById('urgentBinsList');
const allActiveBinsList = document.getElementById('allActiveBinsList');
const statusFilter = document.getElementById('statusFilter');
const dateFilter = document.getElementById('dateFilter');
const noDataChartsMessage = document.getElementById('noDataChartsMessage');

// Configuración para el historial de datos
const MAX_HISTORY_POINTS = 60;
const UPDATE_INTERVAL_MS = 500;

let updateTimer = null;
let userInteractedWithZoom = false;

// Función auxiliar para obtener un color aleatorio consistente
function getOrCreateChartColor(deviceId) {
    if (!allBinsData[deviceId].chartColor) {
        allBinsData[deviceId].chartColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    }
    return allBinsData[deviceId].chartColor;
}

// --- Función ÚNICA para Crear/Actualizar Gráficos ---
// Esta función reemplaza a initializeCharts y updateCharts en su propósito de gráficos
const renderOrUpdateAllCharts = () => {
    const deviceIds = Object.keys(allBinsData);

    if (deviceIds.length === 0) {
        noDataChartsMessage.style.display = 'block';
        // Destruir todas las instancias de gráficos si no hay datos
        if (fillFrequencyChartInstance) { fillFrequencyChartInstance.destroy(); fillFrequencyChartInstance = null; }
        if (statusDistributionChartInstance) { statusDistributionChartInstance.destroy(); statusDistributionChartInstance = null; }
        if (distanceHistoryChartInstance) { distanceHistoryChartInstance.destroy(); distanceHistoryChartInstance = null; }
        return;
    } else {
        noDataChartsMessage.style.display = 'none';
    }

    // --- GRÁFICO 1: Frecuencia de Llenado (Barras) ---
    const fillFreqCtx = document.getElementById('fillFrequencyChart').getContext('2d');
    const fillLabels = [];
    const fillData = [];
    deviceIds.forEach(id => {
        const bin = allBinsData[id];
        if (bin.averageFillTime !== null && bin.averageFillTime > 0) {
            fillLabels.push(id);
            fillData.push(bin.averageFillTime / 1000); // Convertir a segundos
        }
    });

    if (fillFrequencyChartInstance) {
        // Si el gráfico ya existe, actualiza sus datos
        fillFrequencyChartInstance.data.labels = fillLabels;
        fillFrequencyChartInstance.data.datasets[0].data = fillData;
        fillFrequencyChartInstance.update('none');
    } else {
        // Si no existe, créalo
        fillFrequencyChartInstance = new Chart(fillFreqCtx, {
            type: 'bar',
            data: {
                labels: fillLabels,
                datasets: [{
                    label: 'Promedio de Llenado (segundos)',
                    data: fillData,
                    backgroundColor: 'rgba(0, 255, 204, 0.7)',
                    borderColor: 'rgba(0, 255, 204, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Tiempo Promedio (segundos)', color: '#00ffff' },
                        ticks: { color: '#b3e0ff' },
                        grid: { color: 'rgba(0, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#b3e0ff' },
                        grid: { color: 'rgba(0, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#00ffcc' } },
                    title: { display: false }
                },
                animation: { duration: 500, easing: 'easeInOutQuad' }
            }
        });
    }

    // --- GRÁFICO 2: Distribución por Estado (Dona) ---
    const statusDistCtx = document.getElementById('statusDistributionChart').getContext('2d');
    const statusCounts = { "Vacio": 0, "Bajo": 0, "Medio": 0, "Alto": 0, "Lleno": 0 };
    deviceIds.forEach(id => {
        const bin = allBinsData[id];
        if (statusCounts.hasOwnProperty(bin.estado)) {
            statusCounts[bin.estado]++;
        }
    });

    const statusLabelsOrder = ['Vacio', 'Bajo', 'Medio', 'Alto', 'Lleno'];
    const statusDataForChart = statusLabelsOrder.map(status => statusCounts[status]);
    const backgroundColors = [
        'rgba(204, 204, 204, 0.7)', // Vacio (Gris)
        'rgba(153, 255, 51, 0.7)',  // Bajo (Verde Claro)
        'rgba(0, 204, 255, 0.7)',   // Medio (Azul Claro)
        'rgba(255, 204, 0, 0.7)',   // Alto (Naranja)
        'rgba(255, 0, 102, 0.7)'    // Lleno (Rojo/Rosa)
    ];
    const borderColors = [
        'rgba(204, 204, 204, 1)',
        'rgba(153, 255, 51, 1)',
        'rgba(0, 204, 255, 1)',
        'rgba(255, 204, 0, 1)',
        'rgba(255, 0, 102, 1)'
    ];

    if (statusDistributionChartInstance) {
        // Actualiza los datos de la dona
        statusDistributionChartInstance.data.datasets[0].data = statusDataForChart;
        statusDistributionChartInstance.update('none');
    } else {
        // Crea la dona
        statusDistributionChartInstance = new Chart(statusDistCtx, {
            type: 'doughnut',
            data: {
                labels: statusLabelsOrder,
                datasets: [{
                    data: statusDataForChart,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors, // Usar los colores de borde definidos
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#00ffcc' } },
                    title: { display: false }
                },
                animation: { duration: 500, easing: 'easeInOutQuad' }
            }
        });
    }

    // --- GRÁFICO 3: Historial de Distancia (Línea) ---
    const distanceHistoryCtx = document.getElementById('distanceHistoryChart').getContext('2d');
    let allTimestamps = new Set();
    deviceIds.forEach(id => {
        const bin = allBinsData[id];
        bin.history.slice(-MAX_HISTORY_POINTS).forEach(item => {
            allTimestamps.add(item.time);
        });
    });
    const historyLabels = Array.from(allTimestamps).sort();

    let distanceDatasets = [];
    deviceIds.forEach(id => {
        const bin = allBinsData[id];
        const dataPoints = bin.history.slice(-MAX_HISTORY_POINTS);

        const chartData = historyLabels.map(label => {
            const point = dataPoints.find(item => item.time === label);
            return point ? point.dist : null;
        });

        // Asegúrate de que el color se genera una sola vez por tacho
        const color = getOrCreateChartColor(id);

        const dataset = {
            label: id,
            data: chartData,
            borderColor: color,
            backgroundColor: color.replace('0.7)', '0.2)').replace('70%', '50%'), // Ajusta la transparencia y luminosidad para el fondo
            fill: false,
            tension: 0.2,
            spanGaps: true
        };
        distanceDatasets.push(dataset);
    });

    if (distanceHistoryChartInstance) {
        // Actualiza los datos del historial
        distanceHistoryChartInstance.data.labels = historyLabels;
        distanceHistoryChartInstance.data.datasets = distanceDatasets;
        if (!userInteractedWithZoom) {
            distanceHistoryChartInstance.update('none');
            distanceHistoryChartInstance.resetZoom();
        } else {
            distanceHistoryChartInstance.update('none');
        }
    } else {
        // Crea el gráfico de historial
        distanceHistoryChartInstance = new Chart(distanceHistoryCtx, {
            type: 'line',
            data: {
                labels: historyLabels,
                datasets: distanceDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        reverse: true, // Distancia más baja = más lleno
                        title: { display: true, text: 'Distancia al Sensor (cm)', color: '#00ffff' },
                        ticks: { color: '#b3e0ff' },
                        grid: { color: 'rgba(0, 255, 255, 0.1)' }
                    },
                    x: {
                        title: { display: true, text: 'Tiempo', color: '#00ffff' },
                        ticks: { color: '#b3e0ff' },
                        grid: { color: 'rgba(0, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#00ffcc' } },
                    title: { display: false },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            onPanStart: () => { userInteractedWithZoom = true; },
                            onPanComplete: () => { userInteractedWithZoom = true; }
                        },
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'x',
                            onZoomStart: () => { userInteractedWithZoom = true; },
                            onZoomComplete: ({ chart }) => { userInteractedWithZoom = true; }
                        }
                    }
                },
                animation: { duration: 500, easing: 'easeInOutQuad' }
            }
        });
    }
};

// --- Manejo de mensajes WebSocket y control de actualizaciones ---
const handleWebSocketMessage = (data) => {
    const { deviceId, estado, distancia, timestamp } = data;

    if (!allBinsData[deviceId]) {
        allBinsData[deviceId] = {
            estado: '',
            distancia: 0,
            timestamp: 0,
            fullTimes: [],
            history: [],
            lastStatus: '',
            averageFillTime: null,
            chartColor: null // Se inicializa a null, se genera al dibujar el gráfico
        };
    }

    const bin = allBinsData[deviceId];

    // Lógica para fullTimes y averageFillTime
    const currentTimestampMs = new Date(timestamp).getTime();
    if (estado === "Lleno" && bin.lastStatus !== "Lleno") {
        bin.fullTimes.push(currentTimestampMs);
    }
    // Si el tacho ya no está lleno pero su último estado sí lo era, reseteamos `fullTimes`
    // para empezar a contar de nuevo cuando vuelva a llenarse.
    // Esto es importante para que el promedio refleje ciclos completos.
    if (estado !== "Lleno" && bin.lastStatus === "Lleno") {
        bin.fullTimes = []; // Opcional: limpiar al vaciar para calcular ciclos desde cero
    }

    bin.estado = estado;
    bin.distancia = distancia;
    bin.timestamp = timestamp;
    bin.history.push({
        ts: currentTimestampMs, // Usar timestamp numérico para ordenar si es necesario
        dist: distancia,
        time: new Date(timestamp).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    // Asegurarse de que el historial no exceda MAX_HISTORY_POINTS
    if (bin.history.length > MAX_HISTORY_POINTS) {
        bin.history.shift();
    }

    // Calcular el promedio de llenado
    bin.averageFillTime = calculateAverageFillTime(deviceId);

    // --- Notificaciones ---
    if (estado === "Lleno" && bin.lastStatus !== "Lleno") {
        showNotification(`${deviceId} está LLENO y necesita ser vaciado.`, 'urgent');
    } else if (estado === "Alto" && bin.lastStatus !== "Alto" && bin.lastStatus !== "Lleno") {
        showNotification(`${deviceId} está ALTO. Considera revisar pronto.`, 'warning');
    }
    bin.lastStatus = estado;

    // Usar un temporizador para debouncing las actualizaciones de UI
    if (updateTimer) {
        clearTimeout(updateTimer);
    }
    updateTimer = setTimeout(() => {
        renderOrUpdateAllCharts(); // LLAMADA CLAVE
        updateBinLists(statusFilter.value, dateFilter.value);
        updateTimer = null;
    }, UPDATE_INTERVAL_MS);
};

// --- Lógica de cálculo de promedio de llenado ---
// Mueve esta función aquí si no está ya
const calculateAverageFillTime = (deviceId) => {
    const bin = allBinsData[deviceId];
    if (!bin || !bin.fullTimes || bin.fullTimes.length < 2) {
        return null;
    }

    const recentEventsToConsider = 5; // Considera los últimos N eventos de llenado
    const recent = bin.fullTimes.slice(-recentEventsToConsider);

    let totalDiff = 0;
    for (let i = 1; i < recent.length; i++) {
        const t1 = recent[i - 1];
        const t2 = recent[i];
        totalDiff += (t2 - t1);
    }
    return totalDiff / (recent.length - 1);
};


// --- Lógica para la lista de Tachos Urgentes/Activos ---
const updateBinLists = (filterStatus = 'todos', filterDate = null) => {
    // ... (Tu código actual para updateBinLists - no necesita cambios mayores aquí) ...
    urgentBinsList.innerHTML = '';
    allActiveBinsList.innerHTML = '';

    let urgentFound = false;
    let activeFound = false;

    const sortedDeviceIds = Object.keys(allBinsData).sort((a, b) => {
        const statusOrder = { "Lleno": 0, "Alto": 1, "Medio": 2, "Bajo": 3, "Vacio": 4 };
        return statusOrder[allBinsData[a].estado] - statusOrder[allBinsData[b].estado];
    });

    sortedDeviceIds.forEach(id => {
        const bin = allBinsData[id];
        const binTimestamp = new Date(bin.timestamp);

        if (filterDate) {
            const filterDay = new Date(filterDate);
            if (binTimestamp.toDateString() !== filterDay.toDateString()) {
                return;
            }
        }

        if (filterStatus !== 'todos' && bin.estado !== filterStatus) {
            return;
        }

        const listItem = document.createElement('li');
        listItem.classList.add(`status-${bin.estado}`);

        listItem.innerHTML = `
            <div class="bin-info">
                <strong>${id}</strong> - <span class="bin-status">${bin.estado}</span><br>
                <small>Distancia: ${bin.distancia.toFixed(2)} cm</small><br>
                <small>Última actualización: ${binTimestamp.toLocaleTimeString()}</small>
                ${bin.averageFillTime !== null && bin.averageFillTime > 0 ? `<br><small>Promedio Llenado: ${formatTiempo(bin.averageFillTime)}</small>` : ''}
            </div>
            <div class="bin-actions">
                <button onclick="window.location.href='../tacho.html?deviceId=${id}'">Ver Detalles</button>
                <button onclick="window.location.href='../ubicacion/detail.html?deviceId=${id}'">Ubicación</button>
            </div>
        `;

        if (bin.estado === 'Lleno' || bin.estado === 'Alto') {
            urgentBinsList.appendChild(listItem);
            urgentFound = true;
        }
        allActiveBinsList.appendChild(listItem.cloneNode(true));
        activeFound = true;
    });

    if (!urgentFound) {
        urgentBinsList.innerHTML = '<li class="no-data">No hay tachos en alerta por ahora.</li>';
    }
    if (!activeFound) {
        allActiveBinsList.innerHTML = '<li class="no-data">Esperando datos de tachos...</li>';
    }
};

// --- Event Listeners para filtros ---
statusFilter.addEventListener('change', () => {
    updateBinLists(statusFilter.value, dateFilter.value);
});

dateFilter.addEventListener('change', () => {
    updateBinLists(statusFilter.value, dateFilter.value);
});

// Event listeners para detectar interacción del usuario con el gráfico de distancia
// Esto es importante para controlar `userInteractedWithZoom`
// NOTA: Es mejor usar los callbacks del plugin zoom como ya lo tienes configurado,
// pero dejo estos listeners como respaldo si los callbacks no son suficientes.
// Los callbacks onPanStart/onZoomStart son más precisos.
document.getElementById('distanceHistoryChart').addEventListener('mousedown', () => { userInteractedWithZoom = true; });
document.getElementById('distanceHistoryChart').addEventListener('touchstart', () => { userInteractedWithZoom = true; });
document.getElementById('distanceHistoryChart').addEventListener('wheel', () => { userInteractedWithZoom = true; });

// Un botón o acción para resetear el zoom si el usuario quiere volver a la vista predeterminada
window.resetHistoryChartZoom = () => {
    if (distanceHistoryChartInstance) { // Usar la nueva variable
        distanceHistoryChartInstance.resetZoom();
        userInteractedWithZoom = false; // Restablecer la bandera
        distanceHistoryChartInstance.update(); // Forzar actualización para aplicar reset
    }
};


// --- Inicialización al cargar la página ---
document.addEventListener('DOMContentLoaded', () => {
    // Ya no necesitas initializeCharts() aquí, renderOrUpdateAllCharts() lo maneja
    // initializeCharts(); // <--- ELIMINAR ESTA LÍNEA

    // Llamar a renderOrUpdateAllCharts al inicio para mostrar el mensaje de "no data" o gráficos vacíos
    renderOrUpdateAllCharts();
    updateBinLists(); // También actualizar las listas al inicio

    connectWebSocket(
        handleWebSocketMessage,
        (error) => console.error("Error de conexión WebSocket en graficos.js:", error),
        () => console.log("Conexión WebSocket cerrada desde graficos.js")
    );
});