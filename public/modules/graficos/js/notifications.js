// public/modules/graficos/js/notifications.js

const notificationContainer = document.getElementById('notificationContainer');

/**
 * Muestra una notificación flotante.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - 'urgent' para alertas rojas, 'warning' para amarillas, o cualquier otra cosa para el estilo por defecto.
 * @param {number} duration - Duración en milisegundos antes de que desaparezca (por defecto 5000).
 */
export const showNotification = (message, type = '', duration = 5000) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    if (type === 'urgent') {
        notification.classList.add('urgent');
    } else if (type === 'warning') {
        // Podrías añadir una clase 'warning' y sus estilos en CSS
        notification.style.backgroundColor = '#4d3e1a'; // Naranja oscuro
        notification.style.borderColor = '#ffcc00'; // Naranja
        notification.style.boxShadow = '0 0 20px rgba(255, 204, 0, 0.9)';
    }

    notification.innerHTML = `
        <span>${message}</span>
        <button class="close-btn">&times;</button>
    `;

    notificationContainer.appendChild(notification);

    // Permitir cerrar manualmente
    notification.querySelector('.close-btn').addEventListener('click', () => {
        notification.remove();
    });

    // Desaparecer automáticamente después de la duración
    setTimeout(() => {
        notification.remove();
    }, duration);
};