// public/modules/ubicacion/js/ubicacion-detail.js

import { tachoLocations } from '../../config/ubicacion.js'; // Ruta ajustada

const detailContainer = document.getElementById('detailContainer');
const notFoundMessage = document.getElementById('notFoundMessage');

// Obtener el deviceId de la URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('deviceId');

// Variables para el carrusel (se inicializarán después de cargar los datos)
let carouselSlides;
let totalSlides;
let currentIndex = 0;
let thumbnails;
let carouselDotsContainer;

// Funciones del carrusel
function showSlide(index) {
    if (!carouselSlides) return; // Asegurarse de que el carrusel esté inicializado

    if (index >= totalSlides) {
        currentIndex = 0;
    } else if (index < 0) {
        currentIndex = totalSlides - 1;
    } else {
        currentIndex = index;
    }

    // Desplaza el contenedor de slides al slide actual
    carouselSlides.scrollTo({
        left: carouselSlides.clientWidth * currentIndex,
        behavior: 'smooth'
    });

    // Actualiza el estado activo de las miniaturas
    if (thumbnails) { // Verificar si las miniaturas están cargadas
        thumbnails.forEach((thumb, i) => {
            if (i === currentIndex) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    // Actualiza el estado activo de los puntos
    updateDots();
}

function nextSlide() {
    showSlide(currentIndex + 1);
}

function prevSlide() {
    showSlide(currentIndex - 1);
}

// Generar puntos de navegación
function createDots() {
    if (!carouselDotsContainer) return; // Asegurarse de que el contenedor de puntos esté inicializado

    carouselDotsContainer.innerHTML = ''; // Limpia los puntos existentes
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.classList.add('carousel-dot');
        dot.dataset.index = i;
        dot.addEventListener('click', () => showSlide(i));
        carouselDotsContainer.appendChild(dot);
    }
    updateDots();
}

// Actualizar el estado activo de los puntos
function updateDots() {
    // Es importante seleccionar los puntos DESPUÉS de que se hayan creado
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
        if (i === currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// --- Funcionalidad de Deslizamiento Táctil (Swipe) ---
let touchStartX = 0;
let touchEndX = 0;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].clientX;
    handleSwipe();
}

function handleSwipe() {
    const swipeThreshold = 50; // Distancia mínima para considerar un swipe

    if (touchEndX < touchStartX - swipeThreshold) {
        // Deslizar a la izquierda (ir a la siguiente imagen)
        nextSlide();
    } else if (touchEndX > touchStartX + swipeThreshold) {
        // Deslizar a la derecha (ir a la imagen anterior)
        prevSlide();
    }
}


const loadTachoDetail = () => {
    if (!deviceId) {
        detailContainer.style.display = 'none';
        notFoundMessage.textContent = 'Error: No se especificó un ID de tacho.';
        notFoundMessage.style.display = 'block';
        return;
    }

    const tachoInfo = tachoLocations[deviceId];

    if (!tachoInfo) {
        detailContainer.style.display = 'none';
        notFoundMessage.textContent = `No se encontró información de ubicación para el tacho: ${deviceId}`;
        notFoundMessage.style.display = 'block';
        return;
    }

    // Actualizar el título de la página
    document.title = `FlotaBin IA - Ubicación: ${tachoInfo.name}`;

    // Construir los slides del carrusel
    const carouselSlidesHtml = tachoInfo.images.map(imgSrc => `
        <div class="carousel-slide">
            <img src="${imgSrc}" alt="Imagen del Tacho">
        </div>
    `).join('');

    // Construir la galería de miniaturas
    const thumbnailsHtml = tachoInfo.images.map((imgSrc, index) => `
        <img src="${imgSrc}" alt="Miniatura Tacho ${deviceId} imagen ${index + 1}" class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
    `).join('');


    detailContainer.innerHTML = `
        <div class="info-section">
            <h2>${tachoInfo.name} (${deviceId})</h2>
            <p><strong>Descripción:</strong> ${tachoInfo.description}</p>
            <p><strong>Ubicación Exacta:</strong> ${tachoInfo.exactLocation}</p>
            <p><strong>Coordenadas:</strong> Lat: ${tachoInfo.coordinates.lat}, Lng: ${tachoInfo.coordinates.lng}</p>
        </div>

        <div class="image-gallery">
            <div class="carousel-container">
                <div class="carousel-slides" id="carouselSlides">
                    ${carouselSlidesHtml}
                </div>
                <button class="carousel-nav-button prev" id="carouselPrev">❮</button>
                <button class="carousel-nav-button next" id="carouselNext">❯</button>
            </div>
            <div class="carousel-dots" id="carouselDots">
                </div>
            <div class="thumbnail-container" id="thumbnailContainer">
                ${thumbnailsHtml}
            </div>
        </div>

        <div class="map-section">
            ${tachoInfo.mapIframe || '<p>Mapa no disponible.</p>'} 
            </div>
    `;

    detailContainer.style.display = 'grid'; // Mostrar el contenedor de detalle
    notFoundMessage.style.display = 'none'; // Ocultar mensaje de no encontrado

    // --- Inicializar el carrusel DESPUÉS de que el HTML sea inyectado ---
    carouselSlides = document.getElementById('carouselSlides');
    totalSlides = tachoInfo.images.length;
    thumbnails = document.querySelectorAll('.thumbnail'); // Re-seleccionar miniaturas
    carouselDotsContainer = document.getElementById('carouselDots');
    const prevButton = document.getElementById('carouselPrev');
    const nextButton = document.getElementById('carouselNext');

    // Event Listeners para botones de navegación del carrusel
    prevButton.addEventListener('click', prevSlide);
    nextButton.addEventListener('click', nextSlide);

    // Event Listeners para miniaturas (ahora controlan el carrusel)
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', () => {
            const index = parseInt(thumbnail.dataset.index);
            showSlide(index);
        });
    });

    // Event Listeners para el deslizamiento táctil
    carouselSlides.addEventListener('touchstart', handleTouchStart);
    carouselSlides.addEventListener('touchend', handleTouchEnd);


    // Inicializar los puntos y mostrar el primer slide
    createDots();
    showSlide(0);

    // Opcional: Asegurarse de que el carrusel se reposicione correctamente al redimensionar la ventana
    window.addEventListener('resize', () => {
        showSlide(currentIndex); // Vuelve a posicionar el slide actual
    });
};

document.addEventListener('DOMContentLoaded', loadTachoDetail);