// public/modules/ubicacion/js/ubicacion.js

import { tachoLocations } from '../../config/ubicacion.js'; // Ruta ajustada

const ubicacionGrid = document.getElementById('ubicacionGrid');
const ubicacionSearchInput = document.getElementById('ubicacionSearchInput');
const noResultsMessage = document.getElementById('noResultsMessage');

// Función para renderizar todas las tarjetas de ubicación
const renderUbicacionCards = (filterText = '') => {
    ubicacionGrid.innerHTML = ''; // Limpiar el grid
    let anyVisible = false;
    const lowerCaseFilter = filterText.toLowerCase();

    for (const deviceId in tachoLocations) {
        const tachoInfo = tachoLocations[deviceId];
        const cardName = tachoInfo.name.toLowerCase();
        const cardDescription = tachoInfo.description.toLowerCase();
        const cardLocation = tachoInfo.exactLocation.toLowerCase();

        // Aplicar filtro de búsqueda
        if (
            filterText === '' ||
            deviceId.toLowerCase().includes(lowerCaseFilter) ||
            cardName.includes(lowerCaseFilter) ||
            cardDescription.includes(lowerCaseFilter) ||
            cardLocation.includes(lowerCaseFilter)
        ) {
            const card = document.createElement('div');
            card.classList.add('ubicacion-card');
            card.dataset.deviceId = deviceId; // Guardar el deviceId para la navegación

            const imageUrl = tachoInfo.images && tachoInfo.images.length > 0
                ? tachoInfo.images[0] // Mostrar la primera imagen como preview
                : '../../images/Robot.png'; // Imagen por defecto si no hay

            card.innerHTML = `
                <img src="${imageUrl}" alt="Imagen de ${tachoInfo.name}" class="tacho-image-preview" />
                <h3>${tachoInfo.name} (${deviceId})</h3>
                <p>${tachoInfo.description}</p>
                <p>Ubicación: ${tachoInfo.exactLocation}</p>
                <button onclick="window.location.href='detail.html?deviceId=${deviceId}'">Ver en Mapa</button>
            `;
            ubicacionGrid.appendChild(card);
            anyVisible = true;
        }
    }

    // Mostrar/ocultar mensaje de no resultados
    if (!anyVisible && Object.keys(tachoLocations).length > 0) {
        noResultsMessage.textContent = `No se encontraron tachos que coincidan con "${filterText}".`;
        noResultsMessage.style.display = 'block';
    } else if (Object.keys(tachoLocations).length === 0) {
        noResultsMessage.textContent = 'No hay información de ubicación configurada para ningún tacho.';
        noResultsMessage.style.display = 'block';
    } else {
        noResultsMessage.style.display = 'none';
    }
};

// Event listener para la barra de búsqueda
ubicacionSearchInput.addEventListener('input', (event) => {
    renderUbicacionCards(event.target.value);
});

// Renderizar las tarjetas al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderUbicacionCards();
});