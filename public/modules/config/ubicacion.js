// public/modules/config/ubicacion.js

export const tachoLocations = {
    "Tacho-01": {
        name: "Tacho Principal - Patio Central",
        description: "Contenedor de residuos generales para el área de descanso del personal.",
        coordinates: { lat: -5.0874, lng: -81.1278 }, // Paita, Perú
        exactLocation: "Esquina de Calle Real y Grau, frente a la plaza.",
        images: [
            "/public/modules/ubicacion/images/tacho-01-img1.webp",
            "/public/modules/ubicacion/images/tacho-01-img2.jpeg",
            "/public/modules/ubicacion/images/tacho-01-img3.webp",
            "/public/modules/ubicacion/images/tacho-01-img4.jpg"
        ],
        // Opcional: una URL para un mapa interactivo (ej. Google Maps con las coordenadas)
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0874,-81.1278",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d7948.222468847738!2d-81.12806609669896!3d-5.085708455021872!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zNcKwMDUnMTQuNiJTIDgxwrAwNyc0MC4xIlc!5e0!3m2!1ses!2spe!4v1750723824351!5m2!1ses!2spe" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    },
    "Tacho-02": {
        name: "Tacho Reciclaje - Área de Oficinas",
        description: "Contenedor dedicado a plásticos y papeles en la zona administrativa.",
        coordinates: { lat: -5.0885, lng: -81.1295 },
        exactLocation: "Frente al Mercado Central de Paita, entrada principal.",
        images: [
            "/public/modules/ubicacion/images/tacho-01-img1.webp",
            "/public/modules/ubicacion/images/tacho-01-img2.jpeg",
            "/public/modules/ubicacion/images/tacho-01-img3.webp",
            "/public/modules/ubicacion/images/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0885,-81.1295",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3974.0939977932676!2d-81.1295!3d-5.0885!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zNcKwMDUnMTguNiJTIDgxwrAwNyc0Ni4yIlc!5e0!3m2!1ses!2spe!4v1750723986517!5m2!1ses!2spe" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'

    },
    "Tacho-03": {
        name: "Tacho Biológico - Comedor",
        description: "Para residuos orgánicos del área de comedor y cocina.",
        coordinates: { lat: -5.0850, lng: -81.1260 },
        exactLocation: "Al lado del Colegio Nacional, cerca de la cancha.",
        images: [
            "/public/modules/ubicacion/images/tacho-01-img1.webp",
            "/public/modules/ubicacion/images/tacho-01-img2.jpeg",
            "/public/modules/ubicacion/images/tacho-01-img3.webp",
            "/public/modules/ubicacion/images/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0850,-81.1260",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3974.115607338454!2d-81.12599999999999!3d-5.085!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zNcKwMDUnMDYuMCJTIDgxwrAwNyczMy42Ilc!5e0!3m2!1ses!2spe!4v1750724008784!5m2!1ses!2spe" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'

    },
    "Tacho-04": {
        name: "Tacho Exterior - Zona de Carga",
        description: "Contenedor de gran capacidad para desechos de la zona de carga y descarga.",
        coordinates: { lat: -5.0890, lng: -81.1250 },
        exactLocation: "Cerca de la zona de pescadores del malecón.",
        images: [
            "/public/modules/ubicacion/images/tacho-01-img1.webp",
            "/public/modules/ubicacion/images/tacho-01-img2.jpeg",
            "/public/modules/ubicacion/images/tacho-01-img3.webp",
            "/public/modules/ubicacion/images/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0890,-81.1250",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3974.090909504803!2d-81.125!3d-5.0889999999999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zNcKwMDUnMjAuNCJTIDgxwrAwNyczMC4wIlc!5e0!3m2!1ses!2spe!4v1750724029969!5m2!1ses!2spe" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    },
    "Tacho-05": {
        name: "Tacho Emergencia - Almacén Químicos",
        description: "Tacho de seguridad para derrames y residuos químicos no peligrosos.",
        coordinates: { lat: -5.0830, lng: -81.1290 },
        exactLocation: "Entrada principal del Hospital de Paita.",
        images: [
            "/public/modules/ubicacion/images/tacho-01-img1.webp",
            "/public/modules/ubicacion/images/tacho-01-img2.jpeg",
            "/public/modules/ubicacion/images/tacho-01-img3.webp",
            "/public/modules/ubicacion/images/tacho-01-img4.jpg"
        ],
        mapUrl: "https://www.google.com/maps/search/?api=1&query=-5.0830,-81.1290",
        mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3974.1279489917783!2d-81.12899999999999!3d-5.083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zNcKwMDQnNTguOCJTIDgxwrAwNyc0NC40Ilc!5e0!3m2!1ses!2spe!4v1750724048060!5m2!1ses!2spe" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'

    }
};

