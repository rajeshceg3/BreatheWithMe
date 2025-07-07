class AudioManager {
    constructor() {
        this.audioContext = null;
        this.soundEnabled = true;
        this.inhaleAudio = new Audio('audio/inhale.mp3');
        this.exhaleAudio = new Audio('audio/exhale.mp3');
        this.ambientAudio = new Audio('audio/ambient.mp3');
        this.ambientAudio.loop = true;
    }

    initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.ambientAudio.play();
        } catch (e) {
            console.error("Web Audio API not supported", e);
            this.soundEnabled = false;
        }
    }

    playInhaleSound() {
        if (!this.soundEnabled) return;
        this.inhaleAudio.play();
    }

    playExhaleSound() {
        if (!this.soundEnabled) return;
        this.exhaleAudio.play();
    }

    setEnabled(enabled) {
        this.soundEnabled = enabled;
        if (enabled) {
            this.ambientAudio.play();
        } else {
            this.ambientAudio.pause();
            this.inhaleAudio.pause();
            this.exhaleAudio.pause();
        }
    }

    stopSound() {
        this.inhaleAudio.pause();
        this.exhaleAudio.pause();
        this.inhaleAudio.currentTime = 0;
        this.exhaleAudio.currentTime = 0;
    }

    getIsEnabled() {
        return this.soundEnabled;
    }
}
