document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const audioToggleButton = document.getElementById('audio-toggle');
    const audioRecorderDiv = document.getElementById('audio-recorder');
    const serverStatusElement = document.getElementById('server-status');
    const recordingAnimation = document.getElementById('recording-animation');
    const transcriptionTextElement = document.getElementById('transcription-text'); // Nuevo elemento para la transcripción
    const toggleBotAudioButton = document.getElementById('toggle-bot-audio'); // Nuevo botón de audio del bot
    const cancelRecordingButton = document.getElementById('cancel-recording'); // Nuevo botón de cancelar grabación

    const chatOptionsContainer = document.querySelector('.chat-options');
    const optionsWrapper = document.getElementById('options-wrapper');
    const optionsLeftArrow = document.getElementById('options-left-arrow');
    const optionsRightArrow = document.getElementById('options-right-arrow');

    const cameraToggleButton = document.getElementById('camera-toggle');
    const cameraCaptureArea = document.getElementById('camera-capture-area');
    const videoPreview = document.getElementById('video-preview');
    const photoCanvas = document.getElementById('photo-canvas');
    const startCameraButton = document.getElementById('start-camera');
    const takePhotoButton = document.getElementById('take-photo');
    const startVideoRecordingButton = document.getElementById('start-video-recording');
    const stopVideoRecordingButton = document.getElementById('stop-video-recording');
    const sendMediaButton = document.getElementById('send-media');
    const cancelMediaButton = document.getElementById('cancel-media');

    let conversationContext = [];
    let currentOptions = [];
    let currentOptionPageIndex = 0;
    const OPTIONS_PER_PAGE = 3;

    let cameraStream;
    let mediaRecorderVideo;
    let videoChunks = [];
    let capturedMediaBlob = null;

    let recognition; // Variable para la API de reconocimiento de voz
    let isRecordingAudio = false; // Estado para saber si el micrófono está activo
    let botAudioEnabled = true; // Estado para el audio del bot

    // Variable para controlar si el bot está hablando actualmente
    let isBotSpeaking = false;
    let currentUtterance = null; // Para guardar la referencia a la síntesis de voz actual

    const BACKEND_URL = 'http://localhost:3000'; // Asegúrate de que esta URL sea correcta

    // --- Nueva función para detener la voz del bot ---
    function stopBotSpeech() {
        if (isBotSpeaking && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            isBotSpeaking = false; // Resetear el estado
            currentUtterance = null; // Limpiar la referencia
            console.log('Voz del bot interrumpida.');
        }
    }

    // Función para añadir un mensaje al chat
    function addMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${type}-message`);

        const avatarImg = document.createElement('img');
        avatarImg.classList.add('message-avatar');
        avatarImg.src = type === 'bot' ? 'img/anime-girl6.gif' : 'img/vtuber.png';
        avatarImg.alt = type === 'bot' ? 'Bot Avatar' : 'User Avatar';

        const messageContentDiv = document.createElement('div');
        messageContentDiv.classList.add('message-content');

        if (type === 'audio') {
            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            audioElement.src = message;
            messageContentDiv.appendChild(audioElement);
        } else if (type === 'image' || type === 'video') {
            if (type === 'image') {
                const imgElement = document.createElement('img');
                imgElement.src = message;
                imgElement.classList.add('chat-media');
                messageContentDiv.appendChild(imgElement);
            } else {
                const videoElement = document.createElement('video');
                videoElement.src = message;
                videoElement.controls = true;
                videoElement.classList.add('chat-media');
                messageContentDiv.appendChild(videoElement);
            }
        } else {
            const tempDiv = document.createElement('div');
            let formattedMessage = message;

            formattedMessage = formattedMessage.replace(/!\[.*?\]\((.*?)\)/g, (match, url) => {
                return `<img src="${url}" alt="Imagen del tacho" class="chat-image">`;
            });

            formattedMessage = formattedMessage.replace(/```html(.*?)```/gs, (match, htmlContent) => {
                const cleanHtml = htmlContent.replace(/\s*[\r\n]+\s*/g, '');
                return `<div class="map-responsive">${cleanHtml}</div>`;
            });

            formattedMessage = formattedMessage.replace(/(^|\n)\*\s+(.*?)(\n|$)/g, '$1<li>$2</li>$3');
            formattedMessage = formattedMessage.replace(/(^|\n)-\s+(.*?)(\n|$)/g, '$1<li>$2</li>$3');
            formattedMessage = formattedMessage.replace(/(^|\n)\d+\.\s+(.*?)(\n|$)/g, '$1<li>$2</li>$3');

            if (formattedMessage.includes('<li>')) {
                formattedMessage = formattedMessage.replace(/((?:<li>.*?<\/li>\s*)+)/gs, (match) => {
                    if (match.match(/^\s*\d+\./m)) {
                        return `<ol>${match}</ol>`;
                    }
                    return `<ul>${match}</ul>`;
                });
            }

            formattedMessage = formattedMessage
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/_(.*?)_/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');

            tempDiv.innerHTML = formattedMessage;
            messageContentDiv.appendChild(tempDiv);
        }

        if (type === 'user' || type === 'audio' || type === 'image' || type === 'video') {
            messageDiv.appendChild(messageContentDiv);
            messageDiv.appendChild(avatarImg);
        } else {
            messageDiv.appendChild(avatarImg);
            messageDiv.appendChild(messageContentDiv);
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Función para renderizar las opciones dinámicas
    function renderOptions() {
        optionsWrapper.innerHTML = '';
        const start = currentOptionPageIndex * OPTIONS_PER_PAGE;
        const end = start + OPTIONS_PER_PAGE;
        const optionsToShow = currentOptions.slice(start, end);

        optionsToShow.forEach(optionText => {
            const button = document.createElement('button');
            button.classList.add('option-button');
            button.textContent = optionText;
            button.addEventListener('click', () => {
                sendMessageToBot(optionText);
            });
            optionsWrapper.appendChild(button);
        });

        optionsLeftArrow.disabled = currentOptionPageIndex === 0;
        optionsRightArrow.disabled = end >= currentOptions.length;

        if (currentOptions.length > 0) {
            chatOptionsContainer.classList.remove('hidden');
        } else {
            chatOptionsContainer.classList.add('hidden');
        }
    }

    // Navegación de opciones
    optionsLeftArrow.addEventListener('click', () => {
        if (currentOptionPageIndex > 0) {
            currentOptionPageIndex--;
            renderOptions();
        }
    });

    optionsRightArrow.addEventListener('click', () => {
        if ((currentOptionPageIndex + 1) * OPTIONS_PER_PAGE < currentOptions.length) {
            currentOptionPageIndex++;
            renderOptions();
        }
    });

    // Función para enviar mensajes al chatbot del backend
    async function sendMessageToBot(message) {
        // --- Detener la voz del bot antes de enviar un nuevo mensaje ---
        stopBotSpeech();

        try {
            addMessage(message, 'user');
            userInput.value = '';

            currentOptions = [];
            renderOptions();

            const typingMessageDiv = document.createElement('div');
            typingMessageDiv.classList.add('message', 'bot-message', 'typing-indicator');
            typingMessageDiv.innerHTML = '<img src="img/anime-girl6.gif" alt="Bot Avatar" class="message-avatar"><div class="message-content"><p>...</p></div>';
            chatMessages.appendChild(typingMessageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            const historyForBackend = conversationContext.map(entry => ({
                role: entry.role,
                parts: [{ text: entry.parts[0].text }]
            }));

            const response = await fetch(`${BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    context: historyForBackend
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Algo salió mal en el servidor.');
            }

            const data = await response.json();

            typingMessageDiv.remove();

            // Añadir el mensaje tal cual para que se muestre con formato Markdown
            addMessage(data.response, 'bot');

            // --- INICIO: Limpiar el texto para la voz del bot ---
            let textToSpeak = data.response;

            // 1. Eliminar Markdown de negritas y cursivas (**, *, _)
            textToSpeak = textToSpeak.replace(/\*\*(.*?)\*\*|\*(.*?)\*|_(.*?)_/g, '$1$2$3');

            // 2. Eliminar bloques de código (```)
            textToSpeak = textToSpeak.replace(/```.*?```/gs, '');

            // 3. Eliminar código inline (`)
            textToSpeak = textToSpeak.replace(/`(.*?)`/g, '$1');

            // 4. Eliminar enlaces de imagen ![alt](url)
            textToSpeak = textToSpeak.replace(/!\[.*?\]\(.*?\)/g, '');

            // 5. Eliminar elementos de lista de Markdown (*, -, números seguidos de punto)
            textToSpeak = textToSpeak.replace(/(\*|\-|\d+\.)\s+/g, '');

            // 6. Limpiar espacios extra y saltos de línea (opcional, si causa pausas raras)
            textToSpeak = textToSpeak.replace(/\s+/g, ' ').trim();
            // --- FIN: Limpiar el texto para la voz del bot ---

            // Reproducir la respuesta del bot con Text-to-Speech si está activado
            if (botAudioEnabled && 'speechSynthesis' in window) {
                currentUtterance = new SpeechSynthesisUtterance(textToSpeak); // Usar el texto LIMPIO
                currentUtterance.lang = 'es-ES'; // Configura el idioma a español
                currentUtterance.onstart = () => { isBotSpeaking = true; };
                currentUtterance.onend = () => { isBotSpeaking = false; currentUtterance = null; };
                currentUtterance.onerror = (event) => {
                    console.error('Error en síntesis de voz:', event.error);
                    isBotSpeaking = false;
                    currentUtterance = null;
                };
                window.speechSynthesis.speak(currentUtterance);
            }

            if (data.options && Array.isArray(data.options) && data.options.length > 0) {
                currentOptions = data.options;
                currentOptionPageIndex = 0;
                renderOptions();
            } else {
                currentOptions = [];
                renderOptions();
            }

            conversationContext = data.context;

        } catch (error) {
            console.error('Error al enviar mensaje al chatbot:', error);
            const lastTypingIndicator = chatMessages.querySelector('.typing-indicator');
            if (lastTypingIndicator) {
                lastTypingIndicator.remove();
            }
            addMessage('Lo siento, el ChatBot está **fuera de línea** o hay un problema de conexión. Inténtalo de nuevo más tarde.', 'bot');
            updateServerStatus(false);
            currentOptions = [];
            renderOptions();
        }
    }


    // Función para verificar el estado del servidor
    async function checkServerStatus() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/status`);
            if (response.ok) {
                updateServerStatus(true);
            } else {
                updateServerStatus(false);
            }
        } catch (error) {
            console.error('Error al verificar el estado del servidor:', error);
            updateServerStatus(false);
        }
    }

    // Función para actualizar el texto de estado del servidor
    function updateServerStatus(isOnline) {
        if (isOnline) {
            serverStatusElement.textContent = 'En línea';
            serverStatusElement.style.color = '#80DEEA';
            serverStatusElement.style.fontWeight = 'bold';

        } else {
            serverStatusElement.textContent = 'Fuera de línea';
            serverStatusElement.style.color = '#F44336';
            serverStatusElement.style.fontWeight = 'bold';
            serverStatusElement.style.textShadow = '0 0 8px rgba(255, 100, 100, 0.2)';


        }
    }

    sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            sendMessageToBot(message);
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendButton.click();
        }
    });

    // --- Funcionalidad de reconocimiento de voz (Transcripción en tiempo real) ---

    // Inicializar SpeechRecognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'es-ES'; // Idioma para el reconocimiento
        recognition.interimResults = true; // Resultados provisionales mientras se habla
        recognition.continuous = true; // Reconocimiento continuo

        recognition.onstart = () => {
            isRecordingAudio = true;
            recordingAnimation.classList.remove('hidden');
            transcriptionTextElement.textContent = 'Escuchando...';
            audioToggleButton.innerHTML = '<i class="fas fa-microphone-slash"></i>'; // Cambia el ícono a micrófono tachado
            cancelRecordingButton.classList.remove('hidden'); // Muestra el botón de cancelar
            userInput.value = ''; // Limpia el input de texto
            userInput.placeholder = 'Habla ahora...';
            userInput.readOnly = true; // Deshabilita la entrada de texto manual
            sendButton.disabled = true; // Deshabilita el botón de enviar
            stopBotSpeech(); // Detener la voz del bot cuando el usuario empieza a grabar
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            transcriptionTextElement.textContent = interimTranscript; // Muestra la transcripción en tiempo real

            if (finalTranscript) {
                // Si hay un resultado final, se envía al bot y se reinicia el reconocimiento
                transcriptionTextElement.textContent = finalTranscript; // Asegurarse de mostrar el resultado final
                recognition.stop(); // Detener el reconocimiento actual para procesar el mensaje
                sendMessageToBot(finalTranscript); // Enviar el texto transcrito al bot
                resetAudioInput(); // Resetear la UI del audio después de enviar
            }
        };

        recognition.onerror = (event) => {
            console.error('Error de reconocimiento de voz:', event.error);
            transcriptionTextElement.textContent = 'Error de audio. Intenta de nuevo.';
            if (event.error === 'not-allowed' || event.error === 'Permission denied') {
                alert('Permiso de micrófono denegado. Por favor, habilítalo en la configuración de tu navegador.');
            }
            resetAudioInput();
        };

        recognition.onend = () => {
            // Este `onend` se dispara cuando el reconocimiento se detiene, ya sea por `recognition.stop()`
            // o por inactividad/silencio. Queremos que solo se reinicie si el usuario sigue en modo de grabación
            // y no se ha enviado un mensaje final.
            if (isRecordingAudio && transcriptionTextElement.textContent === 'Escuchando...') {
                console.log('Reconocimiento terminado por silencio o inactividad, intentando reiniciar...');
                // Intenta reiniciar solo si sigue en "Escuchando..." y no hay un mensaje final.
                // Esto ayuda a manejar pausas largas pero permite el reinicio.
                // Sin embargo, para la interrupción de la voz del bot, la clave es `stopBotSpeech()`.
                // No necesitamos `recognition.start()` aquí, ya que el ciclo se maneja cuando se presiona el botón.
                // La idea es que `onresult` con `isFinal` o `cancelRecordingButton` detengan y resetee.
                // Si llega aquí por silencio, el `resetAudioInput` lo limpiará.
            } else if (isRecordingAudio && transcriptionTextElement.textContent.trim() !== '' && !transcriptionTextElement.textContent.startsWith('Error') && !window.speechSynthesis.speaking) {
                // Si el reconocimiento terminó, hay texto, no es un error, y el bot no está hablando (aún),
                // esto podría ser un caso donde se necesita enviar el mensaje final.
                // La lógica actual ya lo envía en `onresult` para `isFinal`.
                // Si no hay `isFinal` y `onend` se dispara, lo que haya en `transcriptionTextElement` se podría enviar.
                // Esto podría llevar a mensajes parciales si el usuario está en una pausa larga.
                // Por simplicidad y para evitar envíos no deseados, nos basaremos principalmente en `isFinal`.
                // Si el usuario quiere enviar lo que lleva, debería presionar Enter o el botón.
            }
            // Asegurarse de resetear si el reconocimiento finaliza por cualquier razón
            resetAudioInput(); // Esto se encarga de la UI y los estados.
        };

    } else {
        audioToggleButton.disabled = true;
        alert('Lo siento, tu navegador no soporta la API de reconocimiento de voz.');
    }

    // Función para activar/desactivar la grabación de audio
    audioToggleButton.addEventListener('click', () => {
        if (isRecordingAudio) {
            stopAudioRecording();
        } else {
            startAudioRecording();
        }
    });

    // Función para iniciar la grabación de audio (reconocimiento de voz)
    function startAudioRecording() {
        if (recognition) {
            audioRecorderDiv.classList.remove('hidden');
            cancelRecordingButton.classList.remove('hidden'); // Mostrar botón de cancelar
            userInput.classList.add('hidden'); // Ocultar input normal
            sendButton.classList.add('hidden'); // Ocultar botón de enviar normal
            cameraCaptureArea.classList.add('hidden'); // Asegurarse de que la cámara esté oculta
            stopCamera(); // Detener la cámara si está activa
            resetCameraUI(); // Resetear la UI de la cámara
            recognition.start();
            stopBotSpeech(); // Asegurar que el bot no hable al iniciar grabación
        }
    }

    // Función para detener la grabación de audio (reconocimiento de voz)
    function stopAudioRecording() {
        if (recognition && isRecordingAudio) { // Asegúrate de que solo intentas detener si está activo
            recognition.stop(); // Esto disparará `onend`
        }
        // resetAudioInput() se llama dentro de `onend` o aquí si la detención es manual
        // para asegurar que la UI se actualice correctamente.
        resetAudioInput();
    }

    // Función para resetear la interfaz de usuario del input de audio
    function resetAudioInput() {
        isRecordingAudio = false;
        recordingAnimation.classList.add('hidden');
        transcriptionTextElement.textContent = '';
        audioRecorderDiv.classList.add('hidden');
        userInput.classList.remove('hidden'); // Mostrar input normal
        sendButton.classList.remove('hidden'); // Mostrar botón de enviar normal
        cancelRecordingButton.classList.add('hidden'); // Ocultar botón de cancelar
        audioToggleButton.innerHTML = '<i class="fas fa-microphone"></i>'; // Restaurar ícono de micrófono
        userInput.placeholder = 'Escribe un mensaje...';
        userInput.readOnly = false; // Habilitar la entrada de texto manual
        sendButton.disabled = false; // Habilitar el botón de enviar
    }

    // Manejar el botón de cancelar grabación
    cancelRecordingButton.addEventListener('click', () => {
        stopAudioRecording(); // Detiene el reconocimiento de voz y resetea la UI
    });


    // --- Funcionalidad de audio del bot (Text-to-Speech) ---
    toggleBotAudioButton.addEventListener('click', () => {
        botAudioEnabled = !botAudioEnabled;
        if (botAudioEnabled) {
            toggleBotAudioButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        } else {
            toggleBotAudioButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
            window.speechSynthesis.cancel(); // Detener cualquier reproducción en curso inmediatamente
            isBotSpeaking = false; // Actualizar el estado
            currentUtterance = null;
        }
    });

    // --- Funcionalidad de la cámara (sin cambios significativos en esta sección) ---

    cameraToggleButton.addEventListener('click', () => {
        cameraCaptureArea.classList.toggle('hidden');
        userInput.classList.toggle('hidden');
        sendButton.classList.toggle('hidden');
        audioToggleButton.classList.toggle('hidden');
        cancelRecordingButton.classList.add('hidden'); // Asegurarse de ocultar el botón de cancelar grabación de audio

        if (!audioRecorderDiv.classList.contains('hidden')) {
            stopAudioRecording(); // Detener la grabación de audio si está activa
        }
        stopBotSpeech(); // Detener la voz del bot al abrir/cerrar la cámara

        if (cameraCaptureArea.classList.contains('hidden')) {
            stopCamera();
            resetCameraUI();
        } else {
            resetCameraUI();
        }
    });

    startCameraButton.addEventListener('click', async () => {
        stopBotSpeech(); // Detener la voz del bot al iniciar la cámara
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoPreview.srcObject = cameraStream;
            videoPreview.play();

            startCameraButton.classList.add('hidden');
            takePhotoButton.classList.remove('hidden');
            startVideoRecordingButton.classList.remove('hidden');
            cancelMediaButton.classList.remove('hidden');
        } catch (err) {
            console.error('Error al acceder a la cámara:', err);
            alert('No se pudo acceder a la cámara. Asegúrate de haber dado los permisos.');
        }
    });

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            videoPreview.srcObject = null;
            cameraStream = null;
        }
        if (mediaRecorderVideo && mediaRecorderVideo.state !== 'inactive') {
            mediaRecorderVideo.stop();
        }
    }

    function resetCameraUI() {
        videoPreview.classList.remove('hidden');
        photoCanvas.classList.add('hidden');
        sendMediaButton.classList.add('hidden');
        startCameraButton.classList.remove('hidden');
        takePhotoButton.classList.add('hidden');
        startVideoRecordingButton.classList.add('hidden');
        stopVideoRecordingButton.classList.add('hidden');
        cancelMediaButton.classList.remove('hidden'); // Asegúrate de que este botón sea visible para cancelar cámara
        capturedMediaBlob = null;
        videoChunks = [];
        sendMediaButton.textContent = 'Enviar';
        takePhotoButton.disabled = false; // Habilitar después de un reinicio
        startVideoRecordingButton.disabled = false; // Habilitar después de un reinicio
    }

    takePhotoButton.addEventListener('click', () => {
        stopBotSpeech(); // Detener la voz del bot al tomar foto
        photoCanvas.width = videoPreview.videoWidth;
        photoCanvas.height = videoPreview.videoHeight;
        const context = photoCanvas.getContext('2d');
        context.drawImage(videoPreview, 0, 0, photoCanvas.width, photoCanvas.height);

        videoPreview.classList.add('hidden');
        photoCanvas.classList.remove('hidden');
        sendMediaButton.classList.remove('hidden');
        sendMediaButton.textContent = 'Enviar Foto';
        photoCanvas.toBlob((blob) => {
            capturedMediaBlob = blob;
        }, 'image/png');

        takePhotoButton.disabled = true;
        startVideoRecordingButton.disabled = true;
    });

    startVideoRecordingButton.addEventListener('click', () => {
        stopBotSpeech(); // Detener la voz del bot al iniciar grabación de video
        videoChunks = [];
        mediaRecorderVideo = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });

        mediaRecorderVideo.ondataavailable = (event) => {
            if (event.data.size > 0) {
                videoChunks.push(event.data);
            }
        };

        mediaRecorderVideo.onstop = () => {
            capturedMediaBlob = new Blob(videoChunks, { type: 'video/webm' });
            const videoURL = URL.createObjectURL(capturedMediaBlob);
            videoPreview.src = videoURL;
            videoPreview.controls = true;
            videoPreview.play();

            sendMediaButton.classList.remove('hidden');
            sendMediaButton.textContent = 'Enviar Video';

            takePhotoButton.disabled = true;
            startVideoRecordingButton.disabled = true;
        };

        mediaRecorderVideo.start();
        startVideoRecordingButton.classList.add('hidden');
        stopVideoRecordingButton.classList.remove('hidden');
        takePhotoButton.disabled = true;
    });

    stopVideoRecordingButton.addEventListener('click', () => {
        stopBotSpeech(); // Detener la voz del bot al detener grabación de video
        if (mediaRecorderVideo && mediaRecorderVideo.state === 'recording') {
            mediaRecorderVideo.stop();
            stopVideoRecordingButton.classList.add('hidden');
            startVideoRecordingButton.classList.remove('hidden');
            takePhotoButton.disabled = false;
        }
    });

    sendMediaButton.addEventListener('click', async () => {
        if (capturedMediaBlob) {
            const type = capturedMediaBlob.type.startsWith('image') ? 'image' : 'video';
            addMessage(URL.createObjectURL(capturedMediaBlob), type);

            // En un escenario real, enviarías `capturedMediaBlob` al backend aquí
            // Por ahora, simula una respuesta del bot
            setTimeout(() => {
                addMessage('Contenido multimedia enviado. Actualmente, solo proceso texto. ¡Gracias por compartir!', 'bot');
            }, 1000);

            stopCamera();
            cameraCaptureArea.classList.add('hidden');
            userInput.classList.remove('hidden');
            sendButton.classList.remove('hidden');
            audioToggleButton.classList.remove('hidden');
            resetCameraUI();
        } else {
            alert('No hay contenido para enviar.');
        }
    });

    cancelMediaButton.addEventListener('click', () => {
        stopBotSpeech(); // Detener la voz del bot al cancelar medios
        stopCamera();
        cameraCaptureArea.classList.add('hidden');
        userInput.classList.remove('hidden');
        sendButton.classList.remove('hidden');
        audioToggleButton.classList.remove('hidden');
        resetCameraUI();
    });

    checkServerStatus();
    setInterval(checkServerStatus, 30000);
});