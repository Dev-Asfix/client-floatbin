// public/modules/config/ubicacion.js
// CAMBIAR A COMMONJS PARA SER IMPORTADO EN EL BACKEND

const tachoLocations = {
    "Tacho-01": {
        name: "Tacho Principal - Patio Central",
        description: "Contenedor de residuos generales para el área de descanso del personal.",
        coordinates: { lat: -5.0874, lng: -81.1278 }, // Paita, Perú
        exactLocation: "Esquina de Calle Real y Grau, frente a la plaza.",
        images: [
            "/img/tacho-01-img1.webp", // Ajusta la ruta si tus imágenes no están directamente en /public/img
            "/img/tacho-01-img2.jpeg",
            "/img/tacho-01-img3.webp",
            "/img/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0874,-81.1278", // URL real de Google Maps
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15764.577239063384!2d-81.13098734999999!3d-5.086389749999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x902e8d2e8b2c5e53%3A0x6b4c1a4b4c1a4b4c!2sPaita%2C%20Peru!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    },
    "Tacho-02": {
        name: "Tacho Reciclaje - Área de Oficinas",
        description: "Contenedor dedicado a plásticos y papeles en la zona administrativa.",
        coordinates: { lat: -5.0885, lng: -81.1295 },
        exactLocation: "Frente al Mercado Central de Paita, entrada principal.",
        images: [
            "/img/tacho-01-img1.webp",
            "/img/tacho-01-img2.jpeg",
            "/img/tacho-01-img3.webp",
            "/img/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0885,-81.1295",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15764.577239063384!2d-81.13098734999999!3d-5.086389749999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x902e8d2e8b2c5e53%3A0x6b4c1a4b4c1a4b4c!2sPaita%2C%20Peru!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    },
    // ... (Mantén los demás tachos como están, pero asegúrate de ajustar las rutas de las imágenes y las URLs de los mapas)
    "Tacho-03": {
        name: "Tacho Biológico - Comedor",
        description: "Para residuos orgánicos del área de comedor y cocina.",
        coordinates: { lat: -5.0850, lng: -81.1260 },
        exactLocation: "Al lado del Colegio Nacional, cerca de la cancha.",
        images: [
            "/img/tacho-01-img1.webp",
            "/img/tacho-01-img2.jpeg",
            "/img/tacho-01-img3.webp",
            "/img/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0850,-81.1260",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15764.577239063384!2d-81.13098734999999!3d-5.086389749999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x902e8d2e8b2c5e53%3A0x6b4c1a4b4c1a4b4c!2sPaita%2C%20Peru!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    },
    "Tacho-04": {
        name: "Tacho Exterior - Zona de Carga",
        description: "Contenedor de gran capacidad para desechos de la zona de carga y descarga.",
        coordinates: { lat: -5.0890, lng: -81.1250 },
        exactLocation: "Cerca de la zona de pescadores del malecón.",
        images: [
            "/img/tacho-01-img1.webp",
            "/img/tacho-01-img2.jpeg",
            "/img/tacho-01-img3.webp",
            "/img/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0890,-81.1250",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15764.577239063384!2d-81.13098734999999!3d-5.086389749999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x902e8d2e8b2c5e53%3A0x6b4c1a4b4c1a4b4c!2sPaita%2C%20Peru!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    },
    "Tacho-05": {
        name: "Tacho Emergencia - Almacén Químicos",
        description: "Tacho de seguridad para derrames y residuos químicos no peligrosos.",
        coordinates: { lat: -5.0830, lng: -81.1290 },
        exactLocation: "Entrada principal del Hospital de Paita.",
        images: [
            "/img/tacho-01-img1.webp",
            "/img/tacho-01-img2.jpeg",
            "/img/tacho-01-img3.webp",
            "/img/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0830,-81.1290",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15764.577239063384!2d-81.13098734999999!3d-5.086389749999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x902e8d2e8b2c5e53%3A0x6b4c1a4b4c1a4b4c!2sPaita%2C%20Peru!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    }
};

module.exports = { tachoLocations }; // Exportar como CommonJS