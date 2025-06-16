// js/websocket.js
const WS_URL = "wss://server-floatbin.onrender.com"; // URL del servidor WebSocket

let socket; // Declarar socket aquí para que sea accesible

export const connectWebSocket = (onMessageCallback, onErrorCallback, onCloseCallback) => {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("Conexión WebSocket establecida.");
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessageCallback(data);
        } catch (error) {
            console.error("Error al parsear el mensaje WebSocket:", error);
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket Error: ", error);
        if (onErrorCallback) onErrorCallback(error);
    };

    socket.onclose = () => {
        console.log("Conexión WebSocket cerrada.");
        if (onCloseCallback) onCloseCallback();
    };
};

// Puedes exportar el socket si necesitas acceder a él desde otros módulos (ej. para enviar mensajes)
export const getSocket = () => socket;
