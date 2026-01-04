export default class AudioManager {
    constructor() {
        this.soundEnabled = false;
        this.audioContext = null;
        this.masterGain = null;

        // Oscillators for Binaural Beats
        this.leftOsc = null;
        this.rightOsc = null;
        this.leftGain = null;
        this.rightGain = null;

        // Configuration
        this.baseFreq = 220; // Default A3
        this.binauralBeat = 10; // Default Alpha
    }

    initialize() {
        if (this.audioContext) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Master Gain (Volume Control)
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.masterGain.connect(this.audioContext.destination);

            // Create Stereo Merger
            const merger = this.audioContext.createChannelMerger(2);
            merger.connect(this.masterGain);

            // Left Channel
            this.leftOsc = this.audioContext.createOscillator();
            this.leftOsc.type = 'sine';
            this.leftGain = this.audioContext.createGain();
            this.leftGain.gain.value = 0.5; // Balance
            this.leftOsc.connect(this.leftGain);
            this.leftGain.connect(merger, 0, 0); // Connect to Left Input of Merger
            this.leftOsc.start();

            // Right Channel
            this.rightOsc = this.audioContext.createOscillator();
            this.rightOsc.type = 'sine';
            this.rightGain = this.audioContext.createGain();
            this.rightGain.gain.value = 0.5; // Balance
            this.rightOsc.connect(this.rightGain);
            this.rightGain.connect(merger, 0, 1); // Connect to Right Input of Merger
            this.rightOsc.start();

            this.updateFrequencies();
        } catch (e) {
            console.error('Web Audio API not supported', e);
            this.soundEnabled = false;
        }
    }

    setFrequencies(baseFreq, beatFreq) {
        this.baseFreq = baseFreq;
        this.binauralBeat = beatFreq;
        if (this.audioContext) {
            this.updateFrequencies();
        }
    }

    updateFrequencies() {
        if (!this.leftOsc || !this.rightOsc) return;

        const now = this.audioContext.currentTime;
        // Left Ear: Base Frequency
        this.leftOsc.frequency.setTargetAtTime(this.baseFreq, now, 0.1);
        // Right Ear: Base + Beat Frequency
        this.rightOsc.frequency.setTargetAtTime(this.baseFreq + this.binauralBeat, now, 0.1);
    }

    setEnabled(enabled) {
        this.soundEnabled = enabled;
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (!enabled && this.masterGain) {
            // Cut volume immediately if disabled
            const now = this.audioContext.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(0, now);
        }
    }

    getIsEnabled() {
        return this.soundEnabled;
    }

    /**
     * Synchronizes audio volume with the breathing phase.
     * @param {string} phase - 'inhale', 'exhale', 'hold1', 'hold2'
     * @param {number} duration - Duration of the phase in seconds
     */
    syncWithBreath(phase, duration) {
        if (!this.soundEnabled || !this.audioContext || !this.masterGain) return;

        const now = this.audioContext.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);

        // Max volume for the session
        const maxVol = 0.3;
        const minVol = 0.05; // Background hum

        if (phase === 'inhale') {
            // Swell up
            this.masterGain.gain.setValueAtTime(minVol, now);
            this.masterGain.gain.linearRampToValueAtTime(maxVol, now + duration);
        } else if (phase === 'exhale') {
            // Fade down
            this.masterGain.gain.setValueAtTime(maxVol, now);
            this.masterGain.gain.linearRampToValueAtTime(minVol, now + duration);
        } else if (phase === 'hold1') {
            // Sustain high
            this.masterGain.gain.setValueAtTime(maxVol, now);
            this.masterGain.gain.setValueAtTime(maxVol, now + duration);
        } else if (phase === 'hold2') {
            // Sustain low
            this.masterGain.gain.setValueAtTime(minVol, now);
            this.masterGain.gain.setValueAtTime(minVol, now + duration);
        }
    }

    stopSound() {
        if (this.masterGain && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setTargetAtTime(0, now, 0.5); // Smooth fade out
        }
    }
}
