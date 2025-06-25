document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const audioToggleButton = document.getElementById('audio-toggle');
    const audioRecorderDiv = document.getElementById('audio-recorder');
    const serverStatusElement = document.getElementById('server-status');
    const recordingAnimation = document.getElementById('recording-animation');
    const transcriptionTextElement = document.getElementById('transcription-text');
    const toggleBotAudioButton = document.getElementById('toggle-bot-audio');
    const cancelRecordingButton = document.getElementById('cancel-recording');

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

    // --- Variables para el arrastre (swipe) de opciones ---
    let isDown = false;
    let startX;
    let scrollLeft;

    // --- Eventos de ratón para el arrastre (swipe) de opciones ---
    optionsWrapper.addEventListener('mousedown', (e) => {
        isDown = true;
        optionsWrapper.classList.add('active-drag');
        startX = e.pageX - optionsWrapper.offsetLeft;
        scrollLeft = optionsWrapper.scrollLeft;
    });

    optionsWrapper.addEventListener('mouseleave', () => {
        isDown = false;
        optionsWrapper.classList.remove('active-drag');
    });

    optionsWrapper.addEventListener('mouseup', () => {
        isDown = false;
        optionsWrapper.classList.remove('active-drag');
    });

    optionsWrapper.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - optionsWrapper.offsetLeft;
        const walk = (x - startX) * 1.5;
        optionsWrapper.scrollLeft = scrollLeft - walk;
    });

    // --- Funcionalidad táctil para dispositivos móviles (arrastre de opciones) ---
    optionsWrapper.addEventListener('touchstart', (e) => {
        isDown = true;
        optionsWrapper.classList.add('active-drag');
        startX = e.touches[0].pageX - optionsWrapper.offsetLeft;
        scrollLeft = optionsWrapper.scrollLeft;
    }, { passive: true });

    optionsWrapper.addEventListener('touchend', () => {
        isDown = false;
        optionsWrapper.classList.remove('active-drag');
    });

    optionsWrapper.addEventListener('touchcancel', () => {
        isDown = false;
        optionsWrapper.classList.remove('active-drag');
    });

    optionsWrapper.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - optionsWrapper.offsetLeft;
        const walk = (x - startX) * 1.5;
        optionsWrapper.scrollLeft = scrollLeft - walk;
    }, { passive: true });


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
    let lastFinalTranscript = ''; // Almacenará el último transcrito final para un solo envío
    let botAudioEnabled = true; // Estado para el audio del bot

    // Variable para controlar si el bot está hablando actualmente
    let isBotSpeaking = false;
    let currentUtterance = null; // Para guardar la referencia a la síntesis de voz actual

    const BACKEND_URL = 'https://server-floatbin.onrender.com'; // Asegúrate de que esta URL sea correcta

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

            // Reemplazo para listas (viñetas y numeradas)
            formattedMessage = formattedMessage.replace(/(^|\n)\*\s+(.*?)(\n|$)/g, '$1<li>$2</li>$3');
            formattedMessage = formattedMessage.replace(/(^|\n)-\s+(.*?)(\n|$)/g, '$1<li>$2</li>$3');
            formattedMessage = formattedMessage.replace(/(^|\n)\d+\.\s+(.*?)(\n|$)/g, '$1<li>$2</li>$3');

            if (formattedMessage.includes('<li>')) {
                formattedMessage = formattedMessage.replace(/((?:<li>.*?<\/li>\s*)+)/gs, (match) => {
                    // Si el primer elemento de la lista parece numerado, usa <ol>
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
                .replace(/\n/g, '<br>'); // Mantener saltos de línea como <br>

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

    // --- Funcionalidad de reconocimiento de voz (Transcripción de una sola vez) ---

    // Initial setup of SpeechRecognition (call this once on DOMContentLoaded)
    function setupSpeechRecognition() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = 'es-ES'; // Idioma para el reconocimiento
            recognition.interimResults = true; // Resultados provisionales mientras se habla
            // **CRITICAL CHANGE**: Set continuous to false for a single final result per 'start'
            recognition.continuous = false; // Set to false to get a single, consolidated result when user pauses.

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
                lastFinalTranscript = ''; // Reset the transcript for a new recording session
            };

            recognition.onresult = (event) => {
                let interimTranscript = '';
                let newFinalTranscriptPart = ''; // Capture only the *new* final part from this event

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcriptPart = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        newFinalTranscriptPart += transcriptPart; // Accumulate only final parts for this event
                    } else {
                        interimTranscript += transcriptPart;
                    }
                }

                // Update transcription display
                // If there's a new final part, update lastFinalTranscript and display it.
                // Otherwise, display the interim transcript.
                if (newFinalTranscriptPart) {
                    lastFinalTranscript += newFinalTranscriptPart;
                    transcriptionTextElement.textContent = lastFinalTranscript + interimTranscript; // Show current final + current interim
                } else {
                    transcriptionTextElement.textContent = lastFinalTranscript + interimTranscript; // Just show interim if no new final
                }

                // If a final result is present (meaning user paused or stopped sufficiently for the browser to finalize)
                // and it's not empty, we consider this the end of the user's speech for this session.
                if (event.results[event.results.length - 1].isFinal) {
                    // **CRITICAL**: If a final result is received, stop the recognition.
                    // This ensures onend is called properly and we don't get multiple results.
                    recognition.stop();
                    // The onend event will now handle sending the lastFinalTranscript.
                }
            };

            recognition.onerror = (event) => {
                console.error('Error de reconocimiento de voz:', event.error);
                transcriptionTextElement.textContent = 'Error de audio. Intenta de nuevo.';
                if (event.error === 'no-speech') {
                    transcriptionTextElement.textContent = 'No se detectó voz. Por favor, intenta de nuevo.';
                } else if (event.error === 'not-allowed' || event.error === 'Permission denied') {
                    alert('Permiso de micrófono denegado. Por favor, habilítalo en la configuración de tu navegador.');
                }
                // An error means recognition has stopped. Reset UI.
                // We don't send anything if there was an error without a final transcript.
                resetAudioInput();
            };

            recognition.onend = () => {
                console.log('Reconocimiento de voz finalizado.');
                // Only send the message if there was a final transcript recorded AND recording was active
                // The isRecordingAudio check here prevents sending if the user explicitly cancelled.
                if (lastFinalTranscript.trim() !== '' && isRecordingAudio) {
                    sendMessageToBot(lastFinalTranscript.trim());
                } else if (isRecordingAudio) { // If recording was active but no transcript, inform user
                    transcriptionTextElement.textContent = 'No se detectó voz.';
                }
                resetAudioInput(); // Always reset UI when recognition truly ends
            };

        } else {
            audioToggleButton.disabled = true;
            alert('Lo siento, tu navegador no soporta la API de reconocimiento de voz.');
        }
    }

    setupSpeechRecognition(); // Call once to set up the recognition object

    // Función para activar/desactivar la grabación de audio
    audioToggleButton.addEventListener('click', () => {
        if (isRecordingAudio) {
            stopAudioRecording(); // Esto detendrá explícitamente el reconocimiento y activará onend
        } else {
            startAudioRecording();
        }
    });

    // Función para iniciar la grabación de audio (reconocimiento de voz)
    function startAudioRecording() {
        if (recognition) {
            audioRecorderDiv.classList.remove('hidden');
            cancelRecordingButton.classList.remove('hidden');
            userInput.classList.add('hidden');
            sendButton.classList.add('hidden');
            cameraCaptureArea.classList.add('hidden');
            stopCamera();
            resetCameraUI();

            // IMPORTANTE: Llamar `abort()` antes de `start()` para limpiar cualquier estado anterior
            // y asegurar un inicio fresco, especialmente después de errores o cancelaciones.
            recognition.abort(); // Asegura que la sesión anterior esté realmente detenida.

            recognition.start();
            stopBotSpeech(); // Asegurar que el bot no hable al iniciar grabación
        }
    }

    // Función para detener la grabación de audio (reconocimiento de voz)
    function stopAudioRecording() {
        if (recognition && isRecordingAudio) {
            isRecordingAudio = false; // Establecer esto ANTES de detener el reconocimiento
            // para que onend sepa que fue una detención iniciada por el usuario.
            recognition.stop(); // Detener explícitamente el reconocimiento. Esto activará onend.
        }
    }

    // Función para resetear la interfaz de usuario del input de audio
    function resetAudioInput() {
        isRecordingAudio = false; // Importante: Establecer esto en falso cuando la grabación ha terminado o se canceló
        recordingAnimation.classList.add('hidden');
        transcriptionTextElement.textContent = '';
        audioRecorderDiv.classList.add('hidden');
        userInput.classList.remove('hidden');
        sendButton.classList.remove('hidden');
        cancelRecordingButton.classList.add('hidden');
        audioToggleButton.innerHTML = '<i class="fas fa-microphone"></i>';
        userInput.placeholder = 'Escribe un mensaje...';
        userInput.readOnly = false;
        sendButton.disabled = false;
        lastFinalTranscript = ''; // Limpiar el transcript acumulado al resetear
    }

    // Manejar el botón de cancelar grabación
    cancelRecordingButton.addEventListener('click', () => {
        // Cuando se cancela por el usuario, detener explícitamente el reconocimiento y forzar un reinicio completo de la UI.
        if (recognition && isRecordingAudio) {
            recognition.abort(); // Abortar es mejor para la cancelación inmediata sin enviar
            // ya que evita que onend intente enviar un resultado parcial.
        }
        resetAudioInput(); // Forzar un reinicio inmediatamente
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

    // --- Funcionalidad de la cámara ---

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
        cancelMediaButton.classList.remove('hidden');
        capturedMediaBlob = null;
        videoChunks = [];
        sendMediaButton.textContent = 'Enviar';
        takePhotoButton.disabled = false;
        startVideoRecordingButton.disabled = false;
    }

    takePhotoButton.addEventListener('click', () => {
        stopBotSpeech(); // Detener la voz del bot al tomar foto
        photoCanvas.width = videoPreview.videoWidth;
        photoCanvas.height = videoPreview.videoHeight;
        const context = photoCanvas.getContext('2d');
        context.drawImage(videoPreview, 0, 0, photoCanvas.width, photoCanvas.height);

        videoPreview.classList.add('hidden');
        photoCanvas.classList.remove('hidden');
        sendMediaButton.classList.remove('hidden'); // Mostrar el botón de enviar
        startVideoRecordingButton.classList.add('hidden'); // Ocultar grabar video
        takePhotoButton.classList.add('hidden'); // Ocultar tomar foto
        stopVideoRecordingButton.classList.add('hidden'); // Ocultar detener grabación
        cancelMediaButton.classList.remove('hidden'); // Asegurarse de que el botón de cancelar esté visible

        photoCanvas.toBlob((blob) => {
            capturedMediaBlob = blob;
            sendMediaButton.textContent = 'Enviar Foto';
        }, 'image/png');
    });

    startVideoRecordingButton.addEventListener('click', async () => {
        stopBotSpeech(); // Detener la voz del bot al iniciar grabación de video
        if (!cameraStream) {
            alert('Por favor, inicia la cámara primero.');
            return;
        }

        try {
            mediaRecorderVideo = new MediaRecorder(cameraStream);
            videoChunks = [];

            mediaRecorderVideo.ondataavailable = (event) => {
                videoChunks.push(event.data);
            };

            mediaRecorderVideo.onstop = () => {
                capturedMediaBlob = new Blob(videoChunks, { type: 'video/webm' });
                videoPreview.srcObject = null; // Detener la vista previa en vivo
                videoPreview.src = URL.createObjectURL(capturedMediaBlob); // Mostrar el video grabado
                videoPreview.controls = true;
                videoPreview.loop = true;
                videoPreview.play();

                sendMediaButton.textContent = 'Enviar Video';
                sendMediaButton.classList.remove('hidden');
                startVideoRecordingButton.classList.add('hidden');
                stopVideoRecordingButton.classList.add('hidden');
                takePhotoButton.classList.add('hidden'); // Ocultar tomar foto
                cancelMediaButton.classList.remove('hidden'); // Asegurarse de que el botón de cancelar esté visible
            };

            mediaRecorderVideo.start();
            startVideoRecordingButton.classList.add('hidden');
            takePhotoButton.classList.add('hidden'); // Ocultar botón de tomar foto
            stopVideoRecordingButton.classList.remove('hidden');
            stopVideoRecordingButton.disabled = false;
            sendMediaButton.classList.add('hidden'); // Ocultar el botón de enviar hasta que se grabe
            cancelMediaButton.classList.remove('hidden'); // Asegurarse de que el botón de cancelar esté visible
            console.log('Grabación de video iniciada.');
        } catch (err) {
            console.error('Error al iniciar la grabación de video:', err);
            alert('No se pudo iniciar la grabación de video.');
        }
    });

    stopVideoRecordingButton.addEventListener('click', () => {
        if (mediaRecorderVideo && mediaRecorderVideo.state === 'recording') {
            mediaRecorderVideo.stop();
            console.log('Grabación de video detenida.');
            stopVideoRecordingButton.disabled = true;
        }
    });

    sendMediaButton.addEventListener('click', async () => {
        if (capturedMediaBlob) {
            const formData = new FormData();
            formData.append('media', capturedMediaBlob);
            formData.append('type', capturedMediaBlob.type.startsWith('image') ? 'image' : 'video');

            addMessage(`Enviando ${capturedMediaBlob.type.startsWith('image') ? 'imagen' : 'video'}...`, 'user'); // Mensaje de feedback

            try {
                // Simulación de envío al backend (adapta esto a tu API real)
                console.log('Simulando envío de medios al backend...');
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simula un retraso

                // Añadir el mensaje visualmente como una burbuja de chat
                if (capturedMediaBlob.type.startsWith('image')) {
                    addMessage(URL.createObjectURL(capturedMediaBlob), 'image');
                } else {
                    addMessage(URL.createObjectURL(capturedMediaBlob), 'video');
                }

                // Aquí deberías hacer la llamada fetch real al backend
                // const response = await fetch(`${BACKEND_URL}/api/upload-media`, {
                //     method: 'POST',
                //     body: formData,
                // });
                // if (!response.ok) {
                //     throw new Error('Fallo al subir el medio.');
                // }
                // const data = await response.json();
                // addMessage(data.response || 'Medio recibido.', 'bot'); // Mensaje de confirmación del bot

            } catch (error) {
                console.error('Error al enviar el medio:', error);
                addMessage('Lo siento, hubo un error al enviar el medio.', 'bot');
            } finally {
                stopCamera();
                resetCameraUI();
                cameraCaptureArea.classList.add('hidden');
                userInput.classList.remove('hidden');
                sendButton.classList.remove('hidden');
                audioToggleButton.classList.remove('hidden');
            }
        }
    });

    cancelMediaButton.addEventListener('click', () => {
        stopCamera();
        resetCameraUI();
        cameraCaptureArea.classList.add('hidden');
        userInput.classList.remove('hidden');
        sendButton.classList.remove('hidden');
        audioToggleButton.classList.remove('hidden');
    });

    // Iniciar verificación de estado del servidor al cargar la página
    checkServerStatus();
    setInterval(checkServerStatus, 30000); // Verificar cada 30 segundos
});