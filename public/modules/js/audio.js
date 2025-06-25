// js/audio.js
const audios = [
    "audios/audio1.mp3", "audios/audio2.mp3", "audios/audio3.mp3",
    "audios/audio4.mp3", "audios/audio5.mp3", "audios/audio6.mp3",
    "audios/audio7.mp3", "audios/audio8.mp3", "audios/audio9.mp3",
    "audios/audio10.mp3", "audios/audio11.mp3", "audios/audio12.mp3",
    "audios/audio13.mp3", "audios/audio14.mp3", "audios/audio15.mp3",
    "audios/audio16.mp3", "audios/audio17.mp3", "audios/audio18.mp3",
    "audios/audio19.mp3", "audios/audio20.mp3", "audios/audio21.mp3",
    "audios/audio22.mp3", "audios/audio23.mp3", "audios/audio24.mp3",
    "audios/audio25.mp3", "audios/audio26.mp3", "audios/audio27.mp3",
    "audios/audio28.mp3",
];

let audioIndex = 0;
let audioPlaying = false;
let audioPlayer;
let audioContainer;

export const initializeAudio = () => {
    audioPlayer = document.getElementById("audioPlayer");
    audioContainer = document.getElementById("audioContainer");
};

export const playSequentialAudios = (estadoActual) => {
    if (!audioPlayer || !audioContainer) {
        console.error("Audio player or container not found.");
        return;
    }

    if (!audioPlaying) {
        audioPlaying = true;
        audioIndex = Math.floor(Math.random() * audios.length); // Random start
        audioPlayer.src = audios[audioIndex];
        audioPlayer.play().catch(e => console.error("Error playing audio:", e));
        audioContainer.classList.add("playing");

        audioPlayer.onended = () => {
            if (estadoActual === "Lleno") {
                audioIndex = (audioIndex + 1) % audios.length;
                audioPlayer.src = audios[audioIndex];
                audioPlayer.play().catch(e => console.error("Error playing audio:", e));
            } else {
                stopAudio();
            }
        };

        audioPlayer.onerror = (e) => {
            console.error("Error al reproducir el audio:", e);
            stopAudio();
        };
    }
};

export const stopAudio = () => {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }
    audioPlaying = false;
    if (audioContainer) {
        audioContainer.classList.remove("playing");
        audioContainer.classList.add("stopped");
    }
};

export const isAudioPlaying = () => audioPlaying;