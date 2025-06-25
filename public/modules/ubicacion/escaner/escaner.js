// public/modules/ubicacion/escaner/escaner.js

import { connectWebSocket, getSocket } from '../../js/websocket.js';
import { tachoLocations } from '../../config/ubicacion.js'; // Asegúrate de que esta ruta sea correcta

// --- Clave de API de Openrouteservice ---
const OPENROUTESERVICE_API_KEY = '5b3ce3597851110001cf6248ca8440daba174527a9f1c8c34691c5dc'; // ¡REEMPLAZA ESTO CON TU CLAVE REAL DE ORS!
const ORS_MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car'; // Endpoint para matriz de distancias/duraciones

// --- Elementos del DOM ---
const toggleScanBtn = document.getElementById('toggleScanBtn');
const toggleFullscreenBtn = document.getElementById('toggleFullscreenBtn');
const generateRouteBtn = document.getElementById('generateRouteBtn');
const scannerCard = document.getElementById('scannerCard');
const realtimeMapDiv = document.getElementById('realtimeMap');
const tachosLiveStatusDiv = document.getElementById('tachosLiveStatus');
const connectionStatusSpan = document.getElementById('connectionStatus').querySelector('.status-text');
const connectionStatusIndicator = document.getElementById('connectionStatus').querySelector('.status-indicator');
const noTachosMessage = document.getElementById('noTachosMessage');
const routeAnalysisContainer = document.querySelector('.route-analysis-container');
const routeAnalysisContentDiv = document.getElementById('routeAnalysisContent');
const routeSummaryDiv = document.getElementById('routeSummary');
const userLocationDisplay = document.getElementById('userLocationDisplay');
const mainHeader = document.getElementById('mainHeader');

// --- Nuevos elementos para el registro de recolección ---
const collectionRegisterContainer = document.getElementById('collectionRegisterContainer');
const collectionRegisterContentDiv = document.getElementById('collectionRegisterContent');


// --- Elementos para la selección manual en el mapa y la entrada de texto
const userLocationInput = document.getElementById('userLocationInput');
const setUserLocationBtn = document.getElementById('setUserLocationBtn');
const selectOnMapBtn = document.getElementById('selectOnMapBtn');
const locationMessage = document.getElementById('locationMessage');

// --- Variables de Estado ---
let isScanning = false;
let realtimeMap = null;
const tachoMarkers = {}; // Almacena los marcadores de los tachos
const tachoData = {}; // Almacena los datos en tiempo real de los tachos

let routeControl = null; // Control de la ruta de Leaflet
let userLocationMarker = null; // Marcador de la ubicación del usuario
let userCurrentLatLng = null; // Ubicación obtenida por geolocalización automática
let watchId = null; // ID para el watchPosition de geolocalización

let manualLocation = null; // Ubicación establecida por el usuario (manual o por clic)
let tempLocationMarker = null; // Marcador temporal para la selección en el mapa
let isSelectingLocation = false; // Bandera para el modo de selección en el mapa

// Variable para almacenar la última ruta optimizada generada
let lastOptimizedRouteTachos = [];

// --- Ubicación por Defecto (Paita, Perú) ---
const DEFAULT_LAT = -5.0874;
const DEFAULT_LNG = -81.1278;
const DEFAULT_ZOOM = 14;

// --- Orden de prioridad para estados de tacho ---
const TACHO_STATUS_ORDER = {
    'Lleno': 1,
    'Alto': 2,
    'Medio': 3,
    'Bajo': 4,
    'Vacio': 5,
    'Desconocido': 6
};

// --- Funciones de Inicialización ---

/**
 * Inicializa el mapa de Leaflet.
 */
function initMap() {
    if (realtimeMap) {
        realtimeMap.remove();
    }
    realtimeMap = L.map('realtimeMap').setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(realtimeMap);

    // Iniciar la búsqueda automática de ubicación al cargar, si no hay una manual
    if (!manualLocation) {
        startWatchingUserLocation();
    } else {
        // Si hay una ubicación manual guardada, la usamos
        updateUserLocationMarker(manualLocation, 'Tu Ubicación');
        userLocationDisplay.textContent = `Tu Ubicación: Lat ${manualLocation.lat.toFixed(5)}, Lng ${manualLocation.lng.toFixed(5)} (Manual)`;
        realtimeMap.setView(manualLocation, DEFAULT_ZOOM);
    }

    // Listener para la selección en el mapa
    realtimeMap.on('click', onMapClick);
}

/**
 * Función para manejar el clic en el mapa para selección de ubicación.
 */
function onMapClick(e) {
    if (isSelectingLocation) {
        const { lat, lng } = e.latlng;

        if (tempLocationMarker) {
            realtimeMap.removeLayer(tempLocationMarker);
        }

        // Crear un marcador temporal con un popup de confirmación
        tempLocationMarker = L.marker([lat, lng]).addTo(realtimeMap)
            .bindPopup(`
                <div class="location-confirm-popup">
                    <p>¿Usar esta ubicación?</p>
                    <p>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</p>
                    <div class="popup-actions">
                        <button id="confirmLocationBtn" class="popup-btn confirm">Sí</button>
                        <button id="cancelLocationBtn" class="popup-btn cancel">No</button>
                    </div>
                </div>
            `)
            .openPopup();

        // Asignar eventos a los botones dentro del popup
        document.getElementById('confirmLocationBtn').onclick = () => confirmSelectedLocation(lat, lng);
        document.getElementById('cancelLocationBtn').onclick = cancelSelectedLocation;
    }
}

/**
 * Confirma la ubicación seleccionada en el mapa.
 */
function confirmSelectedLocation(lat, lng) {
    manualLocation = L.latLng(lat, lng); // Establece la ubicación manual
    userCurrentLatLng = null; // Reinicia la ubicación automática para dar prioridad a la manual
    stopLocationSelection(); // Desactivar modo de selección
    updateUserLocationMarker(manualLocation, 'Ubicación Manual');
    userLocationDisplay.textContent = `Tu Ubicación: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)} (Manual)`;
    locationMessage.textContent = 'Ubicación establecida desde el mapa.'; // Limpiar mensaje
    if (tempLocationMarker) {
        realtimeMap.removeLayer(tempLocationMarker);
        tempLocationMarker = null;
    }
    realtimeMap.panTo(manualLocation);
    // Si hay una ruta activa, regenerarla
    if (routeControl) {
        generateCollectionRoute();
    }
    // Detener la observación de geolocalización para que la manual prevalezca
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

/**
 * Cancela la selección de ubicación en el mapa.
 */
function cancelSelectedLocation() {
    if (tempLocationMarker) {
        realtimeMap.removeLayer(tempLocationMarker);
        tempLocationMarker = null;
    }
    stopLocationSelection(); // Desactivar modo de selección
    locationMessage.textContent = 'Selección de ubicación cancelada.';

    // Si no había una ubicación manual previa, o si se canceló la selección,
    // reanudar la búsqueda automática si es posible.
    if (!manualLocation) {
        startWatchingUserLocation();
    } else {
        // Si ya había una ubicación manual, volvemos a mostrarla
        updateUserLocationMarker(manualLocation, 'Ubicación Manual');
        userLocationDisplay.textContent = `Tu Ubicación: Lat ${manualLocation.lat.toFixed(5)}, Lng ${manualLocation.lng.toFixed(5)} (Manual)`;
        realtimeMap.panTo(manualLocation);
    }
}

/**
 * Activa el modo de selección de ubicación en el mapa.
 */
function startLocationSelection() {
    isSelectingLocation = true;
    locationMessage.textContent = 'Haz clic en el mapa para seleccionar tu ubicación. Luego, confirma o cancela en el popup.';
    // Detener la geolocalización automática mientras el usuario selecciona manualmente
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (userLocationMarker) {
        // Ocultar el marcador actual o removerlo si es necesario,
        // aunque ahora lo vamos a reemplazar con el marcador manual una vez confirmado.
        // Por ahora, solo nos aseguramos de que no haya un tempLocationMarker activo.
        if (tempLocationMarker) {
            realtimeMap.removeLayer(tempLocationMarker);
            tempLocationMarker = null;
        }
    }
}

/**
 * Desactiva el modo de selección de ubicación en el mapa.
 */
function stopLocationSelection() {
    isSelectingLocation = false;
    locationMessage.textContent = ''; // Limpiar mensaje
    if (tempLocationMarker) {
        realtimeMap.removeLayer(tempLocationMarker);
        tempLocationMarker = null;
    }
}

/**
 * Actualiza o crea el marcador de la ubicación del usuario.
 */
function updateUserLocationMarker(latlng, labelText) {
    const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="marker-pin user-location-pin"></div><div class="marker-label">Tú Aquí</div>',
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });

    if (userLocationMarker) {
        userLocationMarker.setLatLng(latlng);
        userLocationMarker.getPopup().setContent(`<b>${labelText}</b><br>Lat: ${latlng.lat.toFixed(5)}, Lng: ${latlng.lng.toFixed(5)}`);
    } else {
        userLocationMarker = L.marker(latlng, {
            icon: userIcon,
            title: 'Tu Ubicación'
        }).addTo(realtimeMap);
        userLocationMarker.bindPopup(`<b>${labelText}</b><br>Lat: ${latlng.lat.toFixed(5)}, Lng ${latlng.lng.toFixed(5)}`).openPopup();
    }
    realtimeMap.panTo(latlng); // Centrar el mapa en la nueva ubicación
}


/**
 * Función para iniciar la observación continua de la ubicación del usuario.
 */
function startWatchingUserLocation() {
    if (isSelectingLocation || manualLocation) return; // No iniciar si estamos en modo de selección manual o ya hay una ubicación manual

    if ("geolocation" in navigator) {
        userLocationDisplay.textContent = 'Tu Ubicación: Buscando...';
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                const newLatLng = L.latLng(latitude, longitude);

                // Si ya tenemos una ubicación manual establecida, no la sobrescribimos con la automática
                if (manualLocation) {
                    // Si la ubicación automática es muy similar a la manual, no hacer nada
                    if (manualLocation.distanceTo(newLatLng) < 10) { // Menos de 10 metros de diferencia
                        return;
                    }
                    // Si la ubicación automática es significativamente diferente, alertar/preguntar?
                    // Por ahora, simplemente ignoramos si manualLocation ya está establecida.
                    return;
                }

                // Solo actualizar si la ubicación ha cambiado significativamente o es la primera vez
                if (!userCurrentLatLng || !userCurrentLatLng.equals(newLatLng)) {
                    userCurrentLatLng = newLatLng;
                    updateUserLocationMarker(userCurrentLatLng, `Precisión: ±${accuracy.toFixed(0)}m`);
                    userLocationDisplay.textContent = `Tu Ubicación: Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)} (±${accuracy.toFixed(0)}m)`;
                    console.log(`Ubicación del usuario actualizada: Lat ${latitude}, Lng ${longitude}, Precisión: ${accuracy}m`);

                    // Si hay una ruta activa, intentar recalcularla para incluir la nueva ubicación de inicio
                    // Solo recalcular si la ubicación automática cambió y no hay una manual definida
                    if (routeControl && !manualLocation) {
                        generateCollectionRoute(); // Regenerar ruta con la nueva ubicación inicial
                    }
                }
            },
            (error) => {
                let errorMessage = 'Error al obtener tu ubicación.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permiso denegado para acceder a tu ubicación. Por favor, habilítalo.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Ubicación no disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tiempo de espera agotado.';
                        break;
                    default:
                        errorMessage = `Error desconocido: ${error.message}`;
                        break;
                }
                console.error(errorMessage, error);
                userLocationDisplay.textContent = `Tu Ubicación: ${errorMessage}`;
                // Si falla y no hay ubicación manual ni marcador, muestra la ubicación por defecto
                if (!manualLocation && !userLocationMarker) {
                    updateUserLocationMarker(L.latLng(DEFAULT_LAT, DEFAULT_LNG), 'Ubicación Central (Paita)');
                    userLocationDisplay.textContent = `Tu Ubicación: Lat ${DEFAULT_LAT.toFixed(5)}, Lng ${DEFAULT_LNG.toFixed(5)} (Por Defecto)`;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000, // Aumentar el tiempo de espera
                maximumAge: 0
            }
        );
    } else {
        userLocationDisplay.textContent = 'Tu Ubicación: Geolocalización no soportada por este navegador.';
        console.log("Geolocalización no soportada por este navegador.");
        if (!manualLocation && !userLocationMarker) {
            updateUserLocationMarker(L.latLng(DEFAULT_LAT, DEFAULT_LNG), 'Ubicación Central (Paita)');
            userLocationDisplay.textContent = `Tu Ubicación: Lat ${DEFAULT_LAT.toFixed(5)}, Lng ${DEFAULT_LNG.toFixed(5)} (Por Defecto)`;
        }
    }
}

/**
 * Conecta el WebSocket y maneja los mensajes entrantes.
 */
function startWebSocketScanner() {
    connectionStatusIndicator.className = 'status-indicator connecting';
    connectionStatusSpan.textContent = 'Conectando...';
    console.log("Intentando conectar WebSocket para el escáner...");

    connectWebSocket(
        (data) => {
            handleWebSocketMessage(data);
            connectionStatusIndicator.className = 'status-indicator connected';
            connectionStatusSpan.textContent = 'Conectado';

            // Si hay una ruta optimizada previa, actualiza el registro de recolección en tiempo real
            if (lastOptimizedRouteTachos.length > 0) {
                updateCollectionRegister(lastOptimizedRouteTachos);
            } else {
                collectionRegisterContentDiv.innerHTML = '<p class="info-message">Genera una ruta para ver el registro de recolección.</p>';
            }
        },
        (error) => {
            console.error("Error en la conexión WebSocket:", error);
            connectionStatusIndicator.className = 'status-indicator disconnected';
            connectionStatusSpan.textContent = 'Desconectado (Error)';
            stopScanning();
        },
        () => {
            console.log("Conexión WebSocket cerrada inesperadamente.");
            connectionStatusIndicator.className = 'status-indicator disconnected';
            connectionStatusSpan.textContent = 'Desconectado';
            stopScanning();
        }
    );
}

/**
 * Procesa los mensajes recibidos del WebSocket.
 * @param {Object} data - Los datos del tacho recibidos.
 */
function handleWebSocketMessage(data) {
    const { deviceId, estado, distancia, timestamp } = data;

    if (!tachoLocations[deviceId]) {
        console.warn(`Datos recibidos para un tacho desconocido: ${deviceId}`);
        return;
    }

    const tachoInfo = tachoLocations[deviceId];
    const { name, coordinates } = tachoInfo;
    const { lat, lng } = coordinates;

    // Almacenar o actualizar los datos del tacho
    tachoData[deviceId] = {
        name,
        estado,
        distancia,
        timestamp,
        lat,
        lng,
        lastUpdate: new Date(timestamp).toLocaleTimeString(),
        exactLocation: tachoInfo.exactLocation || 'Ubicación no especificada',
        description: tachoInfo.description || 'Sin descripción',
        images: tachoInfo.images || [],
        mapUrl: tachoInfo.mapUrl || '#'
    };

    updateMapMarker(deviceId, name, lat, lng, estado);
    updateTachosLiveStatus();

    if (Object.keys(tachoData).length > 0) {
        generateRouteBtn.disabled = false;
        noTachosMessage.style.display = 'none';
    }

    // Actualizar el registro de recolección si ya se ha generado una ruta
    if (lastOptimizedRouteTachos.length > 0) {
        updateCollectionRegister(lastOptimizedRouteTachos);
    }
}

/**
 * Actualiza o crea un marcador en el mapa.
 * @param {string} deviceId - ID del dispositivo.
 * @param {string} name - Nombre del tacho.
 * @param {number} lat - Latitud.
 * @param {number} lng - Longitud.
 * @param {string} estado - Estado actual del tacho.
 */
function updateMapMarker(deviceId, name, lat, lng, estado) {
    const iconClass = `status-${estado.replace(/\s/g, '')}`;
    const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin ${iconClass}"></div><div class="marker-label">${name}</div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });

    const tachoDetails = tachoData[deviceId]; // Obtener los detalles completos del tacho

    // Construir contenido HTML para el popup mejorado
    let popupContent = `
        <div class="tacho-popup-content">
            <h3>${tachoDetails.name}</h3>
            <p><strong>Estado:</strong> <span class="status-text ${iconClass}">${tachoDetails.estado}</span></p>
            <p><strong>Distancia:</strong> ${tachoDetails.distancia.toFixed(2)} cm</p>
            <p><strong>Última Actualización:</strong> ${tachoDetails.lastUpdate}</p>
            <p><strong>Ubicación Exacta:</strong> ${tachoDetails.exactLocation}</p>
            <p><strong>Descripción:</strong> ${tachoDetails.description}</p>
    `;

    if (tachoDetails.images && tachoDetails.images.length > 0) {
        popupContent += `<div class="tacho-images">`;
        tachoDetails.images.slice(0, 2).forEach(imgSrc => { // Mostrar hasta 2 imágenes
            popupContent += `<img src="${imgSrc}" alt="Imagen de ${tachoDetails.name}" onerror="this.onerror=null;this.src='../ubicacion/images/placeholder.webp';">`;
        });
        if (tachoDetails.images.length > 2) {
            popupContent += `<span class="more-images-count">+${tachoDetails.images.length - 2}</span>`;
        }
        popupContent += `</div>`;
    }

    if (tachoDetails.mapUrl && tachoDetails.mapUrl !== '#') {
        popupContent += `<p><a href="${tachoDetails.mapUrl}" target="_blank" class="map-link">Ver en Google Maps</a></p>`;
    }
    popupContent += `</div>`;


    if (tachoMarkers[deviceId]) {
        tachoMarkers[deviceId].setLatLng([lat, lng]);
        tachoMarkers[deviceId].setPopupContent(popupContent);
        tachoMarkers[deviceId].setIcon(customIcon);
    } else {
        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(realtimeMap);
        marker.bindPopup(popupContent);
        tachoMarkers[deviceId] = marker;
    }
}

/**
 * Actualiza la lista de estado de tachos en la UI.
 */
function updateTachosLiveStatus() {
    tachosLiveStatusDiv.innerHTML = '';
    if (Object.keys(tachoData).length === 0) {
        tachosLiveStatusDiv.innerHTML = '<p>No hay tachos activos detectados.</p>';
        noTachosMessage.style.display = 'block';
        return;
    }

    noTachosMessage.style.display = 'none';

    const sortedTachos = Object.values(tachoData).sort((a, b) => {
        const orderA = TACHO_STATUS_ORDER[a.estado] || TACHO_STATUS_ORDER['Desconocido'];
        const orderB = TACHO_STATUS_ORDER[b.estado] || TACHO_STATUS_ORDER['Desconocido'];
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
    });

    sortedTachos.forEach(tacho => {
        const item = document.createElement('div');
        item.className = 'tacho-status-item';
        const statusIndicatorClass = `status-${tacho.estado.replace(/\s/g, '')}`;

        item.innerHTML = `
            <div>
                <span class="status-indicator ${statusIndicatorClass}"></span>
                <strong>${tacho.name}</strong>
            </div>
            <div>
                <span>Estado: <span class="${statusIndicatorClass} status-text">${tacho.estado}</span></span> |
                <span>Distancia: ${tacho.distancia.toFixed(2)} cm</span> |
                <span>Últ. Act: ${tacho.lastUpdate}</span>
            </div>
        `;
        tachosLiveStatusDiv.appendChild(item);
    });
}

/**
 * Obtiene la matriz de distancias y duraciones de Openrouteservice.
 * @param {Array<L.LatLng>} locations - Array de objetos L.LatLng.
 * @returns {Promise<Object>} Un objeto con matrices de duraciones y distancias.
 */
async function getOrsDistanceMatrix(locations) {
    if (!OPENROUTESERVICE_API_KEY || OPENROUTESERVICE_API_KEY === 'TU_API_KEY_AQUI') {
        console.error('ERROR: Openrouteservice API Key no configurada. No se puede calcular la matriz de distancias.');
        document.getElementById('routeAnalysisContent').innerHTML = '<p class="error-message">Error: La clave API de Openrouteservice no está configurada o es incorrecta.</p>';
        document.getElementById('generateRouteBtn').disabled = false;
        return null;
    }

    // Convertir L.LatLng a formato [longitude, latitude] requerido por ORS
    const coordinates = locations.map(latlng => [latlng.lng, latlng.lat]);

    try {
        const response = await fetch(ORS_MATRIX_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json, application/gpx+xml, image/gif, image/jpeg, text/xml, application/xhtml+xml, text/html',
                'Content-Type': 'application/json',
                'Authorization': OPENROUTESERVICE_API_KEY
            },
            body: JSON.stringify({
                locations: coordinates,
                metrics: ["duration", "distance"], // Queremos ambos: tiempo y distancia
                units: "m" // Distancia en metros, duración en segundos
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Openrouteservice API Error (HTTP ${response.status}):`, errorText);
            throw new Error(`Error HTTP de Openrouteservice: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Respuesta de Openrouteservice (matriz):', data);
        return {
            durations: data.durations, // Matriz de tiempos en segundos
            distances: data.distances  // Matriz de distancias en metros
        };
    } catch (error) {
        console.error('Error al obtener la matriz de Openrouteservice:', error);
        alert('Error al calcular la ruta con Openrouteservice. Por favor, revisa la consola para más detalles.');
        document.getElementById('routeAnalysisContent').innerHTML = `<p class="error-message">Error al obtener datos de Openrouteservice: ${error.message}. Por favor, revisa la consola.</p>`;
        document.getElementById('generateRouteBtn').disabled = false;
        return null;
    }
}

/**
 * Genera una ruta de recolección en el mapa basada en los tachos detectados
 * utilizando Openrouteservice para distancias reales.
 */
async function generateCollectionRoute() {
    if (Object.keys(tachoData).length === 0) {
        alert('No hay tachos activos para generar una ruta.');
        return;
    }

    const relevantTachos = Object.values(tachoData).filter(tacho => TACHO_STATUS_ORDER[tacho.estado] <= TACHO_STATUS_ORDER['Medio']); // Considerar hasta "Medio" para recolección

    if (relevantTachos.length === 0) {
        alert('No hay tachos con niveles significativos (Lleno, Alto, Medio) para generar una ruta.');
        routeAnalysisContainer.style.display = 'none';
        collectionRegisterContainer.style.display = 'none'; // Ocultar si no hay ruta relevante
        return;
    }

    // Paso 1: Determinar el punto de inicio
    const startPoint = manualLocation || userCurrentLatLng || L.latLng(DEFAULT_LAT, DEFAULT_LNG);

    // Crear un array de LatLngs para la API de ORS (incluyendo el punto de inicio)
    // El índice 0 es siempre el startPoint
    const allPointsForOrs = [startPoint, ...relevantTachos.map(tacho => L.latLng(tacho.lat, tacho.lng))];

    // Paso 2: Obtener la matriz de distancias y duraciones de Openrouteservice
    routeAnalysisContentDiv.innerHTML = '<p class="info-message">Calculando distancias y tiempos reales con Openrouteservice...</p>';
    routeAnalysisContainer.style.display = 'block';
    collectionRegisterContainer.style.display = 'block'; // Mostrar contenedor del registro
    collectionRegisterContentDiv.innerHTML = '<p class="info-message">Calculando registro de recolección...</p>';
    generateRouteBtn.disabled = true; // Deshabilitar mientras se calcula

    const orsMatrix = await getOrsDistanceMatrix(allPointsForOrs);

    if (!orsMatrix) {
        routeAnalysisContentDiv.innerHTML = '<p class="error-message">No se pudo obtener la matriz de distancias de Openrouteservice. Por favor, inténtalo de nuevo.</p>';
        collectionRegisterContentDiv.innerHTML = '<p class="error-message">No se pudo generar el registro de recolección.</p>';
        generateRouteBtn.disabled = false;
        return;
    }

    const distances = orsMatrix.distances; // Usaremos las distancias para la optimización

    // Paso 3: Optimización de ruta (TSP aproximado - Vecino más cercano)
    const optimizedOrderIndices = [];
    const visitedIndices = new Set();

    let currentPointIndex = 0; // Siempre empezamos desde el punto de inicio (índice 0 en allPointsForOrs)
    optimizedOrderIndices.push(currentPointIndex);
    visitedIndices.add(currentPointIndex);

    const relevantTachosWithOrsIndex = relevantTachos.map((tacho, index) => ({
        ...tacho,
        orsIndex: index + 1 // +1 porque el índice 0 en allPointsForOrs es el startPoint
    }));

    // Ordenar los tachos relevantes por su prioridad de llenado.
    // Esto asegura que, cuando busquemos el "siguiente" tacho más cercano,
    // primero priorizaremos los más llenos, y entre ellos, el más cercano.
    relevantTachosWithOrsIndex.sort((a, b) => TACHO_STATUS_ORDER[a.estado] - TACHO_STATUS_ORDER[b.estado]);

    // **AÑADE ESTA LÍNEA AQUÍ:**
    let currentPriorityLevel = 0; // Inicializa con un valor que asegure que el primer tacho de alta prioridad sea elegido

    while (visitedIndices.size < allPointsForOrs.length) { // Incluir el punto de inicio si es el único restante
        let nextTachoOrsIndex = -1;
        let minDistance = Infinity;
        let foundCandidate = false;

        // Primero, intentar encontrar el más cercano de los tachos de mayor prioridad no visitados
        // Se establece el nivel de prioridad actual al nivel del primer tacho no visitado
        // que tenga la prioridad más alta (valor más bajo en TACHO_STATUS_ORDER).
        let highestPriorityYetToVisit = Infinity;
        for (const tacho of relevantTachosWithOrsIndex) {
            if (!visitedIndices.has(tacho.orsIndex)) {
                highestPriorityYetToVisit = Math.min(highestPriorityYetToVisit, TACHO_STATUS_ORDER[tacho.estado]);
            }
        }
        currentPriorityLevel = highestPriorityYetToVisit; // Establece el nivel de prioridad para esta iteración

        for (const tacho of relevantTachosWithOrsIndex) {
            if (!visitedIndices.has(tacho.orsIndex)) {
                if (TACHO_STATUS_ORDER[tacho.estado] === currentPriorityLevel) {
                    const dist = distances[currentPointIndex][tacho.orsIndex];
                    if (dist < minDistance) {
                        minDistance = dist;
                        nextTachoOrsIndex = tacho.orsIndex;
                        foundCandidate = true;
                    }
                }
            }
        }

        // Si no se encontró un tacho específico de alta prioridad, pero aún quedan tachos sin visitar
        // (esto puede ocurrir si el último punto de la ruta no es un tacho, sino el regreso al inicio)
        if (!foundCandidate && visitedIndices.size < allPointsForOrs.length - 1) {
            // Si todos los tachos de recolección están visitados, el siguiente es el punto de inicio (para cerrar la ruta)
            if (!visitedIndices.has(0) && allPointsForOrs.length > 1) { // Si el punto de inicio no ha sido visitado como "siguiente"
                nextTachoOrsIndex = 0; // Regresar al punto de inicio
            } else {
                break; // No hay más puntos que visitar
            }
        } else if (foundCandidate) {
            // Si se encontró un tacho candidato, añadirlo
            optimizedOrderIndices.push(nextTachoOrsIndex);
            visitedIndices.add(nextTachoOrsIndex);
            currentPointIndex = nextTachoOrsIndex;
        } else {
            // Si no se encontró ningún candidato y no estamos en el último paso (regresar al inicio)
            break;
        }
    }


    // Asegurarse de que la ruta termine en el punto de inicio si es un circuito
    // Solo si el último punto añadido no es ya el inicio y si tenemos más de un punto en la ruta
    if (optimizedOrderIndices.length > 1 && optimizedOrderIndices[optimizedOrderIndices.length - 1] !== 0) {
        // Asegúrate de que el punto de inicio (índice 0) no haya sido visitado como un tacho intermedio
        if (!visitedIndices.has(0)) {
            optimizedOrderIndices.push(0); // Regreso al inicio
            visitedIndices.add(0); // Marcarlo como visitado
        }
    }

    // Paso 4: Construir los waypoints para Leaflet Routing Machine
    const waypoints = optimizedOrderIndices.map((orsIndex, i) => {
        const latlng = allPointsForOrs[orsIndex];
        if (orsIndex === 0) {
            // Si es el punto de inicio o fin (que es el mismo punto)
            if (i === 0) {
                return L.Routing.waypoint(latlng, 'Inicio (Tu Ubicación/Central)');
            } else {
                return L.Routing.waypoint(latlng, 'Fin de Ruta (Regreso)');
            }
        } else {
            // Encuentra el tacho original usando el índice de ORS (restar 1 porque relevantTachos empieza en índice 0)
            const originalTacho = relevantTachosWithOrsIndex.find(t => t.orsIndex === orsIndex);
            return L.Routing.waypoint(latlng, originalTacho ? originalTacho.name : `Tacho desconocido ${orsIndex}`);
        }
    });

    if (routeControl) {
        realtimeMap.removeControl(routeControl);
    }

    try {
        routeControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            lineOptions: {
                styles: [{ color: '#6a5acd', weight: 6, opacity: 0.7 }]
            },
            altLineOptions: {
                styles: [{ color: '#0c1a28', weight: 6, opacity: 0.2 }]
            },
            createMarker: function (i, waypoint, n) {
                let label = '';
                if (i === 0) {
                    label = '🏠'; // Home icon for start
                } else if (i === n - 1) {
                    label = '🏁'; // Finish flag for end
                } else {
                    label = i.toString(); // Number for waypoints
                }
                const customRouteIcon = L.divIcon({
                    className: 'custom-route-icon',
                    html: `<div class="route-marker-label">${label}</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                return L.marker(waypoint.latLng, { icon: customRouteIcon });
            },
            collapsible: true,
            show: true,
            autoRoute: true,
            units: 'metric',
            language: 'es'
        });

        routeControl.on('routesfound', function (e) {
            const routes = e.routes;
            const summary = routes[0].summary;
            const totalDistanceKm = (summary.totalDistance / 1000).toFixed(2);
            const totalTimeMin = (summary.totalTime / 60).toFixed(0);

            routeControl.addTo(realtimeMap);

            console.log(`Ruta generada: ${totalDistanceKm} km en ${totalTimeMin} min.`);
            routeSummaryDiv.innerHTML = `**Distancia Total:** ${totalDistanceKm} km | **Tiempo Estimado:** ${totalTimeMin} min.`;

            // Mapear los índices optimizados a los objetos de tacho originales para la visualización de la tabla
            // Excluimos el punto de inicio/fin para el análisis de ruta y el registro.
            const finalOptimizedTachos = optimizedOrderIndices
                .filter(idx => idx !== 0)
                .map(idx => relevantTachosWithOrsIndex.find(t => t.orsIndex === idx));

            // Almacenar la última ruta optimizada
            lastOptimizedRouteTachos = finalOptimizedTachos;

            displayRouteAnalysis(routes[0].instructions, finalOptimizedTachos, startPoint);
            updateCollectionRegister(finalOptimizedTachos); // Llamar para actualizar el registro

            generateRouteBtn.disabled = false; // Habilitar de nuevo
        });

        routeControl.on('routingerror', function (e) {
            console.error('Error al calcular la ruta con L.Routing.control:', e.error.message);
            routeAnalysisContentDiv.innerHTML = `<p class="error-message"><strong>Error al calcular la ruta visual:</strong> ${e.error.message}. Asegúrate que los puntos sean accesibles o prueba otra vez.</p>`;
            routeSummaryDiv.innerHTML = '';
            generateRouteBtn.disabled = false; // Habilitar de nuevo
            collectionRegisterContentDiv.innerHTML = '<p class="error-message">No se pudo generar el registro de recolección debido a un error en la ruta.</p>';
            lastOptimizedRouteTachos = []; // Limpiar la ruta optimizada guardada
        });

    } catch (error) {
        console.error("Error al inicializar L.Routing.control o al generar ruta:", error);
        routeAnalysisContentDiv.innerHTML = `<p class="error-message">Ocurrió un error inesperado al intentar generar la ruta. Detalles: ${error.message}</p>`;
        routeSummaryDiv.innerHTML = '';
        generateRouteBtn.disabled = false; // Habilitar de nuevo
        collectionRegisterContentDiv.innerHTML = '<p class="error-message">Ocurrió un error al generar el registro de recolección.</p>';
        lastOptimizedRouteTachos = []; // Limpiar la ruta optimizada guardada
    }
}

/**
 * Muestra la tabla de análisis de ruta con el orden y detalles de cada tacho.
 */
function displayRouteAnalysis(routeInstructions, optimizedTachos, startPoint) {
    routeAnalysisContainer.style.display = 'block';

    let htmlContent = `
        <table class="analysis-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Punto</th>
                    <th>Estado</th>
                    <th>Ubicación Detallada</th>
                    <th>Distancia desde Inicio</th>
                    <th>Acción Recomendada</th>
                </tr>
            </thead>
            <tbody>
    `;

    const startLat = startPoint.lat.toFixed(5);
    const startLng = startPoint.lng.toFixed(5);
    htmlContent += `
        <tr>
            <td>1</td>
            <td><strong>Inicio</strong></td>
            <td>N/A</td>
            <td>Lat: ${startLat}, Lng: ${startLng}</td>
            <td>0 m</td>
            <td>Comenzar la ruta desde tu ubicación actual o punto central.</td>
        </tr>
    `;

    // Usamos `lastOptimizedRouteTachos` para asegurar que reflejamos la última ruta calculada,
    // y para poder re-renderizar esto si los datos del tacho cambian.
    // Aunque `optimizedTachos` es lo mismo aquí, lo hacemos consistente con el nuevo registro.
    lastOptimizedRouteTachos.forEach((tacho, index) => {
        // Asegúrate de usar los datos más recientes del tacho si están disponibles en `tachoData`
        const currentTachoState = tachoData[tacho.deviceId] ? tachoData[tacho.deviceId].estado : tacho.estado;
        const currentTachoDistance = tachoData[tacho.deviceId] ? tachoData[tacho.deviceId].distancia : tacho.distancia;

        const statusIndicatorClass = `status-${currentTachoState.replace(/\s/g, '')}`;
        const recommendation = getTachoRecommendation(currentTachoState);

        let distanceText = 'Ubicación Desconocida';
        if (startPoint) {
            const tachoLatLng = L.latLng(tacho.lat, tacho.lng);
            const distanceMeters = startPoint.distanceTo(tachoLatLng);
            // Mostrar la distancia en metros si es menor a 1 km, sino en km
            distanceText = distanceMeters < 1000 ? `${distanceMeters.toFixed(0)} m` : `${(distanceMeters / 1000).toFixed(2)} km`;
        }

        htmlContent += `
            <tr>
                <td>${index + 2}</td>
                <td><span class="status-indicator ${statusIndicatorClass}"></span> <strong>${tacho.name}</strong></td>
                <td>${currentTachoState} (${currentTachoDistance.toFixed(2)} cm)</td>
                <td>${tacho.exactLocation}</td>
                <td>${distanceText}</td>
                <td><span class="recommendation">${recommendation}</span></td>
            </tr>
        `;
    });

    htmlContent += `
        <tr>
            <td>${lastOptimizedRouteTachos.length + 2}</td>
            <td><strong>Fin de Ruta</strong> (Regreso al Inicio)</td>
            <td>N/A</td>
            <td>Lat: ${startLat}, Lng: ${startLng}</td>
            <td>0 m</td>
            <td>Regresar a la base o punto de inicio.</td>
        </tr>
    `;

    htmlContent += `
            </tbody>
        </table>
    `;

    routeAnalysisContentDiv.innerHTML = htmlContent;
}

/**
 * Genera y actualiza el "registro de tachos por recolectar"
 * basándose en la última ruta optimizada y los datos en tiempo real.
 * @param {Array} optimizedTachos - Array de tachos en el orden optimizado de la ruta.
 */
async function updateCollectionRegister(optimizedTachos) {
    collectionRegisterContainer.style.display = 'block';

    if (optimizedTachos.length === 0) {
        collectionRegisterContentDiv.innerHTML = '<p class="info-message">No hay tachos relevantes en la ruta actual.</p>';
        return;
    }

    let htmlContent = '';
    // Filtrar los tachos para mostrar solo los que tienen estado Lleno, Alto, Medio y están en la ruta optimizada.
    // También asegúrate de usar los datos en tiempo real de `tachoData`
    const relevantSortedForRegister = optimizedTachos
        .filter(tacho => {
            const currentStatus = tachoData[tacho.deviceId] ? tachoData[tacho.deviceId].estado : tacho.estado;
            return TACHO_STATUS_ORDER[currentStatus] <= TACHO_STATUS_ORDER['Medio'];
        })
        .map(tacho => {
            // Actualizar el objeto tacho con los últimos datos de tachoData
            return tachoData[tacho.deviceId] || tacho;
        });

    if (relevantSortedForRegister.length === 0) {
        collectionRegisterContentDiv.innerHTML = '<p class="info-message">Todos los tachos relevantes han sido recolectados o no hay ninguno en la ruta.</p>';
        return;
    }

    // Obtener la ubicación actual (manual o automática)
    const currentLocation = manualLocation || userCurrentLatLng;

    htmlContent += '<div class="collection-register-list">';
    for (const tacho of relevantSortedForRegister) {
        const statusIndicatorClass = `status-${tacho.estado.replace(/\s/g, '')}`;
        let distanceText = 'Distancia no disponible';

        if (currentLocation) {
            const tachoLatLng = L.latLng(tacho.lat, tacho.lng);
            const distanceMeters = currentLocation.distanceTo(tachoLatLng);
            // Mostrar la distancia en metros si es menor a 1 km, sino en km
            distanceText = distanceMeters < 1000 ? `${distanceMeters.toFixed(0)} m` : `${(distanceMeters / 1000).toFixed(2)} km`;
        }

        htmlContent += `
            <div class="collection-register-item">
                <span class="priority-number">${relevantSortedForRegister.indexOf(tacho) + 1}</span>
                <div class="tacho-info">
                    <strong>${tacho.name}</strong>
                    <span>Estado: <span class="${statusIndicatorClass} status-text">${tacho.estado}</span> | Distancia: ${distanceText}</span>
                </div>
            </div>
        `;
    }
    htmlContent += '</div>';

    collectionRegisterContentDiv.innerHTML = htmlContent;
}


/**
 * Obtiene una recomendación de acción basada en el estado del tacho.
 */
function getTachoRecommendation(estado) {
    switch (estado) {
        case 'Lleno':
            return 'Recolección Urgente: Vaciar completamente.';
        case 'Alto':
            return 'Recolección Prioritaria: Casi lleno, vaciar pronto.';
        case 'Medio':
            return 'Recolección Programada: Nivel significativo, considerar vaciar.';
        case 'Bajo':
            return 'Monitorear: Nivel bajo, no requiere vaciado inmediato.';
        case 'Vacio':
            return 'No requiere acción: Vacío o casi vacío.';
        case 'Desconocido':
        default:
            return 'Estado Desconocido: Verificar en sitio.';
    }
}

// --- Lógica del Botón de Escaneo ---
function toggleScan() {
    isScanning = !isScanning;
    if (isScanning) {
        toggleScanBtn.textContent = 'Detener Escaneo';
        toggleScanBtn.classList.add('active');
        startWebSocketScanner();
        noTachosMessage.style.display = 'block';
        routeAnalysisContainer.style.display = 'none';
        collectionRegisterContainer.style.display = 'none'; // Ocultar al iniciar escaneo
        routeSummaryDiv.innerHTML = '';
        routeAnalysisContentDiv.innerHTML = '<p class="info-message">No se ha generado ninguna ruta.</p>';
        collectionRegisterContentDiv.innerHTML = '<p class="info-message">Genera una ruta para ver el registro de recolección.</p>'; // Resetear
    } else {
        toggleScanBtn.textContent = 'Iniciar Escaneo';
        toggleScanBtn.classList.remove('active');
        stopScanning();
    }
}

function stopScanning() {
    isScanning = false;
    toggleScanBtn.textContent = 'Iniciar Escaneo';
    toggleScanBtn.classList.remove('active');
    connectionStatusIndicator.className = 'status-indicator disconnected';
    connectionStatusSpan.textContent = 'Desconectado';
    if (getSocket() && getSocket().readyState === WebSocket.OPEN) {
        getSocket().close();
    }
    for (const deviceId in tachoMarkers) {
        realtimeMap.removeLayer(tachoMarkers[deviceId]);
    }
    Object.keys(tachoMarkers).forEach(key => delete tachoMarkers[key]);
    Object.keys(tachoData).forEach(key => delete tachoData[key]);

    updateTachosLiveStatus();
    if (routeControl) {
        realtimeMap.removeControl(routeControl);
        routeControl = null;
    }
    generateRouteBtn.disabled = true;
    noTachosMessage.style.display = 'block';
    routeAnalysisContainer.style.display = 'none';
    collectionRegisterContainer.style.display = 'none'; // Ocultar al detener escaneo
    routeSummaryDiv.innerHTML = '';
    routeAnalysisContentDiv.innerHTML = '<p class="info-message">No se ha generado ninguna ruta.</p>';
    collectionRegisterContentDiv.innerHTML = '<p class="info-message">Genera una ruta para ver el registro de recolección.</p>'; // Resetear
    lastOptimizedRouteTachos = []; // Limpiar la ruta optimizada guardada
    // Reanudar la observación de la ubicación automática si no hay una manual establecida
    if (!manualLocation) {
        startWatchingUserLocation();
    }
}

// --- Lógica de Pantalla Completa ---
function toggleFullscreen() {
    scannerCard.classList.toggle('fullscreen');
    mainHeader.classList.toggle('hidden');

    if (scannerCard.classList.contains('fullscreen')) {
        toggleFullscreenBtn.textContent = 'Salir de Pantalla Completa';
    } else {
        toggleFullscreenBtn.textContent = 'Pantalla Completa';
    }
    setTimeout(() => {
        if (realtimeMap) {
            realtimeMap.invalidateSize();
            // Centrar el mapa en la ubicación del usuario si está disponible, sino en Paita
            const currentCenter = manualLocation || userCurrentLatLng || L.latLng(DEFAULT_LAT, DEFAULT_LNG);
            realtimeMap.setView(currentCenter, DEFAULT_ZOOM);

            // Ajustar el zoom para ver todos los marcadores si hay
            if (Object.keys(tachoMarkers).length > 0 || userLocationMarker) {
                const group = new L.featureGroup(Object.values(tachoMarkers));
                if (userLocationMarker) {
                    group.addLayer(userLocationMarker);
                }
                if (group.getLayers().length > 0) {
                    realtimeMap.fitBounds(group.getBounds().pad(0.1));
                }
            }
        }
    }, 100);
}

// Función para establecer la ubicación ingresada por el usuario (texto)
function setUserLocation() {
    const locationText = userLocationInput.value.trim();
    if (locationText) {
        const [lat, lng] = locationText.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) { // Validar rangos
            // Detener la geolocalización automática al establecer manualmente
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            userCurrentLatLng = null; // Reiniciar la ubicación automática
            manualLocation = L.latLng(lat, lng);
            updateUserLocationMarker(manualLocation, 'Ubicación Manual');
            userLocationDisplay.textContent = `Tu Ubicación: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)} (Manual)`;
            realtimeMap.setView(manualLocation, DEFAULT_ZOOM);
            locationMessage.textContent = 'Ubicación establecida manualmente.';
            // Si hay una ruta activa, regenerarla
            if (routeControl) {
                generateCollectionRoute();
            }
        } else {
            locationMessage.textContent = 'Formato inválido. Usa "latitud, longitud" (ej: -5.0874, -81.1278).';
        }
    } else {
        locationMessage.textContent = 'Por favor, introduce una ubicación.';
    }
}

// --- Event Listeners ---
toggleScanBtn.addEventListener('click', toggleScan);
toggleFullscreenBtn.addEventListener('click', toggleFullscreen);
generateRouteBtn.addEventListener('click', generateCollectionRoute);
setUserLocationBtn.addEventListener('click', setUserLocation);
selectOnMapBtn.addEventListener('click', startLocationSelection);


// --- Inicialización al cargar la página ---
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    updateTachosLiveStatus(); // Para asegurar que la lista de estados esté vacía al inicio si no hay datos
    generateRouteBtn.disabled = true; // Deshabilitar inicialmente si no hay tachos
    // Asegurarse de que los contenedores de análisis y registro estén ocultos al inicio
    routeAnalysisContainer.style.display = 'none';
    collectionRegisterContainer.style.display = 'none';
});