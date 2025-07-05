class AudioManager {
    constructor() {
        this.audioContext = null;
        this.soundEnabled = true; // Assuming sound is enabled by default
        this.currentOscillator = null;
        this.gainNode = null; // Keep a reference to gainNode for volume control if needed later
    }

    initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API not supported", e); // AUDIO_001
            this.soundEnabled = false;
        }
    }

    _createTone(frequency, durationSeconds, type = 'sine', startFrequency = null) {
        if (!this.audioContext || !this.soundEnabled) {
            return;
        }

        // Stop and disconnect any existing oscillator
        if (this.currentOscillator) {
            try {
                this.currentOscillator.stop();
                this.currentOscillator.disconnect();
                if (this.gainNode) {
                    this.gainNode.disconnect();
                }
            } catch (e) {
                // Ignore errors if stop is called on an already stopped oscillator
            }
            this.currentOscillator = null;
            this.gainNode = null;
        }

        const now = this.audioContext.currentTime;

        this.currentOscillator = this.audioContext.createOscillator();
        this.gainNode = this.audioContext.createGain();

        this.currentOscillator.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);

        this.currentOscillator.type = type;

        if (startFrequency !== null) {
            this.currentOscillator.frequency.setValueAtTime(startFrequency, now);
            this.currentOscillator.frequency.linearRampToValueAtTime(frequency, now + durationSeconds);
        } else {
            this.currentOscillator.frequency.setValueAtTime(frequency, now);
        }

        // Fade in and out
        this.gainNode.gain.setValueAtTime(0.0001, now); // Start silent
        this.gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.1); // Quick fade-in to 0.3 volume
        // Ensure fade out doesn't start before fade in completes, especially for short sounds.
        const fadeOutStartTime = Math.max(now + 0.1, now + durationSeconds - 0.1);
        this.gainNode.gain.setValueAtTime(0.3, fadeOutStartTime -0.001); // ensure it's at 0.3 before fadeout if duration is very short
        this.gainNode.gain.exponentialRampToValueAtTime(0.0001, fadeOutStartTime + 0.1 > now + durationSeconds ? now + durationSeconds : fadeOutStartTime +0.1);


        try {
            this.currentOscillator.start(now);
            this.currentOscillator.stop(now + durationSeconds);
        } catch (e) {
            console.error("Error starting/stopping oscillator:", e);
        }

        // Clean up reference after sound is supposed to have stopped
        // This was causing issues by nullifying too early if another sound was played quickly.
        // Let the next call to _createTone or stopSound handle cleanup.
    }

    playInhaleSound(durationSeconds = 4) {
        if (!this.soundEnabled || !this.audioContext) return;
        this._createTone(880, durationSeconds, 'sine', 440); // Ascending 440Hz to 880Hz
    }

    playExhaleSound(durationSeconds = 6) {
        if (!this.soundEnabled || !this.audioContext) return;
        this._createTone(440, durationSeconds, 'sine', 880); // Descending 880Hz to 440Hz
    }

    setEnabled(enabled) {
        this.soundEnabled = enabled;
        if (!enabled) {
            this.stopSound();
        }
    }

    stopSound() {
        if (this.currentOscillator) {
            try {
                // Attempt to apply a quick fade-out before stopping
                const now = this.audioContext.currentTime;
                if (this.gainNode) {
                    this.gainNode.gain.cancelScheduledValues(now);
                    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now); // Capture current gain
                    this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05); // Quick fade out
                    this.currentOscillator.stop(now + 0.05);
                } else {
                    this.currentOscillator.stop(now);
                }

                // Disconnection will happen when next sound plays or explicitly
            } catch (e) {
                // console.warn("Error stopping current oscillator:", e);
            } finally {
                this.currentOscillator = null;
                this.gainNode = null; // also clear gainNode
            }
        }
    }

    getIsEnabled() {
        return this.soundEnabled;
    }
}
