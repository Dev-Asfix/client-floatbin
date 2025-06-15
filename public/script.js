
//const ws = new WebSocket("ws://192.168.18.20:3000");
// Conexión WebSocket al servidor
//const socket = new WebSocket("ws://192.168.18.20:3000");

const ws = new WebSocket("ws://192.168.18.21:3000");
// Conexión WebSocket al servidor
const socket = new WebSocket("ws://192.168.18.21:3000");

let estadoActual = "";
let inicioEstado;
let tiemposEstados = [];
let audioIndex = 0;
let audioPlaying = false;

const audios = [
    "audios/audio1.mp3",
    "audios/audio2.mp3",
    "audios/audio3.mp3",
    "audios/audio4.mp3",
    "audios/audio5.mp3",
    "audios/audio6.mp3",
    "audios/audio7.mp3",
    "audios/audio8.mp3",
    "audios/audio9.mp3",
    "audios/audio10.mp3",
    "audios/audio11.mp3",
    "audios/audio12.mp3",
    "audios/audio13.mp3",
    "audios/audio14.mp3",
    "audios/audio15.mp3",
    "audios/audio16.mp3",
    "audios/audio17.mp3",
    "audios/audio18.mp3",
    "audios/audio19.mp3",
    "audios/audio20.mp3",
    "audios/audio21.mp3",
    "audios/audio22.mp3",
    "audios/audio23.mp3",
    "audios/audio24.mp3",
    "audios/audio25.mp3",
    "audios/audio26.mp3",
    "audios/audio27.mp3",
    "audios/audio28.mp3",
];

// Evento cuando se recibe un mensaje del WebSocket
socket.onmessage = function (event) {
    console.log("Datos recibidos:", event.data);
    const data = JSON.parse(event.data);

    const prediccionElement = document.getElementById("prediccionLlenado");
    const waterEffect = document.getElementById("waterEffect");
    const sparksEffect = document.getElementById("sparksEffect");

    // Si se recibe una predicción de tiempo de llenado, actualizar el texto y detener animación
    if (data.predictedFillTime) {
        applyNoBackgroundStyle();
        const predictedTimeSeconds = (data.predictedFillTime / 1000).toFixed(
            2
        ); // Convertir a segundos
        prediccionElement.textContent = `Tiempo estimado para llenarse: ${predictedTimeSeconds} segundos`;
        waterEffect.classList.remove("filling"); // Detener animación de agua
        sparksEffect.innerHTML = ""; // Eliminar chispas
    } else {
        applyBackgroundStyle();
        prediccionElement.textContent = `Alimentando redes neuronales...`;
        waterEffect.classList.add("filling"); // Activar animación de agua
        generateSparks(); // Generar chispas
    }
};

const prediccionElement = document.getElementById("prediccionLlenado");
// Función para aplicar el estilo con fondo
function applyBackgroundStyle() {
    prediccionElement.classList.add("with-background");
    prediccionElement.classList.remove("no-background");
    prediccionElement.classList.add("flickering"); // Activar animación de parpadeo
}

// Función para aplicar el estilo sin fondo
function applyNoBackgroundStyle() {
    prediccionElement.classList.add("no-background");
    prediccionElement.classList.remove("with-background");
    prediccionElement.classList.remove("flickering"); // Desactivar animación de parpadeo
}

// Función para generar chispas
function generateSparks() {
    const sparksEffect = document.getElementById("sparksEffect");
    sparksEffect.innerHTML = ""; // Limpiar chispas existentes
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
}

// Evento para manejar errores en la conexión
socket.onerror = function (error) {
    console.error("WebSocket Error: ", error);
};

// Evento cuando el WebSocket se cierra
socket.onclose = function () {
    console.log("Conexión WebSocket cerrada");
};

function activateStyles() {
    element.style.color = "#00ffcc";
    element.style.textShadow = "0px 0px 10px #00ffcc";
    element.style.background = "rgba(0, 255, 255, 0.2)";
}

// Desactivar estilos
function deactivateStyles() {
    element.style.color = "";
    element.style.textShadow = "";
    element.style.background = "";
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    document.getElementById("estado").innerText = `Estado: ${data.estado}`;
    document.getElementById(
        "distancia"
    ).innerText = `Distancia: ${data.distancia} cm`;
    document.getElementById(
        "fecha"
    ).innerText = `Fecha y Hora: ${data.timestamp}`;
    document.getElementById("averageFillTime").innerText = `Promedio: ${data.averageFillTime || "--"
        } segundos`;

    if (data.alert) {
        document.getElementById("alerta").innerText = data.alert;
    }

    actualizarTacho(data.estado);
    registrarEstado(data.estado, data.timestamp);
    calcularPromedioLlenado();

    mostrarRecomendacion(data.averageFillTime);

    // Reproducir o detener audio si el estado es "Lleno"
    if (data.estado === "Lleno" && !audioPlaying) {
        reproducirAudiosSecuenciales();
    } else if (data.estado !== "Lleno" && audioPlaying) {
        detenerAudio();
    }
};

function actualizarTacho(estado) {
    const nivel = document.getElementById("nivel");
    let porcentaje = 0;
    switch (estado) {
        case "Vacio":
            porcentaje = 0;
            break;
        case "Bajo":
            porcentaje = 25;
            break;
        case "Medio":
            porcentaje = 50;
            break;
        case "Alto":
            porcentaje = 75;
            break;
        case "Lleno":
            porcentaje = 100;
            break;
    }
    nivel.style.height = `${porcentaje}%`;
}

function registrarEstado(estado, timestamp) {
    if (estado !== estadoActual) {
        const finEstado = new Date();
        if (estadoActual !== "") {
            const duracion = (finEstado - inicioEstado) / 1000;
            const row = `<tr><td>${estadoActual}</td><td>${timestamp}</td><td>${duracion.toFixed(
                2
            )} s</td></tr>`;
            document.getElementById("estadoTable").innerHTML += row;
            tiemposEstados.push({ estado: estadoActual, duracion: duracion });
        }
        estadoActual = estado;
        inicioEstado = new Date();
    }
}

function calcularPromedioLlenado() {
    if (tiemposEstados.length === 0) return;

    const duraciones = tiemposEstados
        .filter((te) => te.estado !== "Vacio" && te.estado !== "Lleno")
        .map((te) => te.duracion);
    if (duraciones.length === 0) return;

    const promedio =
        duraciones.reduce((a, b) => a + b, 0) / duraciones.length;
    document.getElementById(
        "averageFillTime"
    ).innerText = `Promedio: ${promedio.toFixed(2)} segundos`;
}

function calcularTiempoLlenado(distancia) {
    const umbral = 3; // Distancia mínima para considerarlo lleno
    const tasaCambio = 5; // Ejemplo de tasa de cambio de nivel por segundo
    if (distancia < umbral) return "Inminente"; // Relleno en curso
    return ((distancia - umbral) / tasaCambio).toFixed(2);
}

function mostrarRecomendacion(promedio) {
    const promedioNum = parseFloat(promedio);
    let mensaje = "";

    if (!isNaN(promedioNum)) {
        if (promedioNum < 10) {
            mensaje = getRandomRecommendation([
                "El tiempo de llenado es moderado. Ajusta la planificación si es necesario.",
                "El tiempo de llenado es aceptable. Considera un monitoreo periódico.",
                "El llenado es estable. Mantén el sistema bajo observación.",
                "El tacho se está llenando rápidamente. Planifica vaciados frecuentes.",
                "El tiempo de llenado es corto. Vigílalo de cerca.",
                "El tacho se llena lentamente. Revisa que todo funcione bien.",
                "El llenado es prolongado. Considera revisar el sistema.",
                "El tacho se llena en poco tiempo. Ajusta los tiempos de vigilancia.",
                "El llenado parece más lento de lo normal. Revisa el proceso.",
                "El llenado es estable. Mantén una observación periódica.",
            ]);
        } else if (promedioNum < 20) {
            mensaje = getRandomRecommendation([
                "El tiempo de llenado es moderado. Ajusta la planificación si es necesario.",
                "El tiempo de llenado es aceptable. Considera un monitoreo periódico.",
                "El llenado es estable. Mantén el sistema bajo observación.",
                "El tacho se está llenando rápidamente. Planifica vaciados frecuentes.",
                "El tiempo de llenado es corto. Vigílalo de cerca.",
                "El tacho se llena lentamente. Revisa que todo funcione bien.",
                "El llenado es prolongado. Considera revisar el sistema.",
                "El tacho se llena en poco tiempo. Ajusta los tiempos de vigilancia.",
                "El llenado parece más lento de lo normal. Revisa el proceso.",
                "El llenado es estable. Mantén una observación periódica.",
            ]);
        } else {
            mensaje = getRandomRecommendation([
                "El tiempo de llenado es moderado. Ajusta la planificación si es necesario.",
                "El tiempo de llenado es aceptable. Considera un monitoreo periódico.",
                "El llenado es estable. Mantén el sistema bajo observación.",
                "El tacho se está llenando rápidamente. Planifica vaciados frecuentes.",
                "El tiempo de llenado es corto. Vigílalo de cerca.",
                "El tacho se llena lentamente. Revisa que todo funcione bien.",
                "El llenado es prolongado. Considera revisar el sistema.",
                "El tacho se llena en poco tiempo. Ajusta los tiempos de vigilancia.",
                "El llenado parece más lento de lo normal. Revisa el proceso.",
                "El llenado es estable. Mantén una observación periódica.",
            ]);
        }
    } else {
        mensaje =
            "No hay datos suficientes para proporcionar una recomendación.";
    }

    document.getElementById("mensajeRecomendacion").innerText = mensaje;
}

function getRandomRecommendation(recommendations) {
    const index = Math.floor(Math.random() * recommendations.length);
    return recommendations[index];
}

// Función para reproducir audios secuenciales mientras el estado es "Lleno"

function reproducirAudiosSecuenciales() {
    const audioPlayer = document.getElementById("audioPlayer");
    const audioContainer = document.getElementById("audioContainer");

    // Solo reproducir el audio si no está ya reproduciéndose
    if (!audioPlaying) {
        audioPlaying = true;

        // Seleccionar un audio aleatorio al inicio
        audioIndex = Math.floor(Math.random() * audios.length); // Aleatorio al iniciar

        audioPlayer.src = audios[audioIndex];
        audioPlayer.play();
        audioContainer.classList.add("playing");

        audioPlayer.onended = () => {
            // Cuando termina el audio, verificar si el estado sigue siendo 'Lleno'
            if (estadoActual === "Lleno") {
                // Seleccionar otro audio aleatorio
                audioIndex = (audioIndex + 1) % audios.length; // Aleatorio cada vez

                audioPlayer.src = audios[audioIndex];
                audioPlayer.play();
            } else {
                detenerAudio(); // Detener si el estado cambia
            }
        };

        audioPlayer.onerror = () => {
            console.error("Error al reproducir el audio.");
            detenerAudio();
        };
    }
}

// Función para detener el audio si el estado cambia
function detenerAudio() {
    const audioPlayer = document.getElementById("audioPlayer");
    const audioContainer = document.getElementById("audioContainer");
    audioPlayer.pause();
    audioPlayer.currentTime = 0; // Reiniciar el tiempo del audio
    audioPlaying = false;
    audioContainer.classList.remove("playing");
    audioContainer.classList.add("stopped");
}

// Función que verifica el estado del sensor
function verificarEstadoDelSensor() {
    if (sensorDetectaLleno()) {
        if (estadoActual !== "Lleno") {
            estadoActual = "Lleno";
            reproducirAudiosSecuenciales(); // Reproduce el audio solo cuando cambia a "Lleno"
        }
    } else {
        if (estadoActual === "Lleno") {
            estadoActual = "Vacio"; // O cualquier otro estado que definas
            detenerAudio(); // Detener el audio si ya no está "Lleno"
        }
    }
}

// Simular función de detección del sensor
function sensorDetectaLleno() {
    // Aquí va tu lógica para detectar si el tacho está lleno
    // Deberías retornar true si el sensor detecta que está en el rango de lleno
    return Math.random() > 0.5; // Simulación (50% de probabilidad de estar lleno)
}

const image = document.querySelector(".audio-icon"); // Selecciona el ícono del audio

let angleX = 0;
let angleY = 0;
let directionX = 1; // Dirección de rotación en X
let directionY = 1; // Dirección de rotación en Y

// Animación automática
setInterval(() => {
    // Verifica si el contenedor del ícono tiene la clase "playing"
    const isPlaying = image
        .closest(".audio-container")
        ?.classList.contains("playing");

    // Ajusta los límites de rotación dependiendo de si está en "playing" o no
    if (isPlaying) {
        // Lógica cuando está en estado "playing"
        angleX += directionX * 0.5; // Rotación más suave
        angleY += directionY * 1.5;

        // Limita la rotación en menor rango cuando está en "playing"
        if (angleX > 15 || angleX < -10) {
            directionX *= -1; // Cambia de dirección en X
        }
        if (angleY > 20 || angleY < -20) {
            directionY *= -1; // Cambia de dirección en Y
        }
    } else {
        // Lógica cuando NO está en estado "playing"
        angleX += directionX; // Mantener una rotación más sutil
        angleY += directionY;

        // Limita la rotación en mayor rango
        if (angleX > 35 || angleX < -10) {
            directionX *= -1; // Cambia de dirección en X
        }
        if (angleY > 30 || angleY < -30) {
            directionY *= -1; // Cambia de dirección en Y
        }
    }

    // Aplica la rotación a la imagen
    image.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg)`;
}, 100); // Velocidad de animación (ajustado a 100 ms para mayor fluidez)
