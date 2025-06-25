document.addEventListener('mousemove', function (e) {
    var img = document.getElementById('img-ff');

    // Obtiene las dimensiones de la imagen
    var rect = img.getBoundingClientRect();
    var centerX = rect.left + rect.width / 10;
    var centerY = rect.top + rect.height / 10;

    // Calcula las distancias relativas desde el centro de la imagen
    var deltaX = e.clientX - centerX;
    var deltaY = e.clientY - centerY;

    // Ajusta la rotación según el movimiento del mouse
    var rotationX = deltaY / 40; // Ajusta el factor de rotación en el eje X
    var rotationY = -deltaX / 40; // Ajusta el factor de rotación en el eje Y

    // Aplica el movimiento dinámico
    img.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg) scale(1.05)`; // Escala ligeramente la imagen
});

