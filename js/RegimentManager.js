export default class RegimentManager {
    constructor() {
        this.regiments = {
            'box-breathing': {
                id: 'box-breathing',
                name: 'Tactical Calm (Box Breathing)',
                description: 'Used by Navy SEALs for stress reduction and focus.',
                pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
                benefits: ['Stress Reduction', 'Mental Clarity', 'Focus'],
                audio: { baseFreq: 200, binauralBeat: 6 } // Theta (6Hz) for deep relaxation/focus
            },
            '4-7-8': {
                id: '4-7-8',
                name: 'Sleep Aid (4-7-8)',
                description: 'Dr. Andrew Weil\'s technique for relaxation and sleep.',
                pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
                benefits: ['Sleep Aid', 'Anxiety Relief'],
                audio: { baseFreq: 150, binauralBeat: 3 } // Delta (3Hz) for sleep
            },
            'physiological-sigh': {
                id: 'physiological-sigh',
                name: 'Panic Reset (Physiological Sigh)',
                description: 'Double inhale, long exhale to offload CO2.',
                pattern: { inhale: 2, hold1: 0, exhale: 6, hold2: 1 }, // simplified simulation
                benefits: ['Instant Calm', 'CO2 Balance'],
                audio: { baseFreq: 250, binauralBeat: 10 } // Alpha (10Hz) for reset/calm
            },
            'coherence': {
                id: 'coherence',
                name: 'Heart Coherence',
                description: 'Balances heart rate variability (HRV).',
                pattern: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 },
                benefits: ['HRV Balance', 'Emotional Stability'],
                audio: { baseFreq: 220, binauralBeat: 10 } // Alpha (10Hz) for coherence
            },
            'custom': {
                id: 'custom',
                name: 'Custom Regiment',
                description: 'User defined pattern.',
                pattern: { inhale: 4, hold1: 1, exhale: 6, hold2: 1 },
                benefits: ['Personalized'],
                audio: { baseFreq: 220, binauralBeat: 8 } // Low Alpha default
            }
        };
        this.currentRegimentId = 'coherence'; // Default

        // Restore custom profile from memory if available
        this.loadCustomProfile();
    }

    loadCustomProfile() {
        const stored = localStorage.getItem('breath_custom_profiles');
        if (stored) {
             try {
                 const profiles = JSON.parse(stored);
                 // Assuming single custom profile for now or just taking the last active one logic
                 // For now, let's see if we have saved custom values in individual keys as per app.js
                 // Actually app.js saves to 'customInhale', etc.
                 // We should respect that legacy or check if we want to use the new storage.
                 // Let's stick to what app.js writes for now to be safe.
             } catch (e) {
                 console.warn("Failed to parse custom profiles", e);
             }
        }

        // Check for individual keys (legacy/current app.js behavior)
        const inhale = parseInt(localStorage.getItem('customInhale'));
        const exhale = parseInt(localStorage.getItem('customExhale'));
        const hold = parseInt(localStorage.getItem('customHold'));

        if (!isNaN(inhale) && !isNaN(exhale)) {
            this.updateCustomRegiment({
                inhale: inhale,
                exhale: exhale,
                hold1: isNaN(hold) ? 0 : hold,
                hold2: isNaN(hold) ? 0 : hold
            });
        }
    }

    getRegiments() {
        return Object.values(this.regiments);
    }

    getRegiment(id) {
        return this.regiments[id];
    }

    setRegiment(id) {
        if (this.regiments[id]) {
            this.currentRegimentId = id;
            return this.regiments[id];
        }
        return null;
    }

    getCurrentRegiment() {
        return this.regiments[this.currentRegimentId];
    }

    updateCustomRegiment(pattern) {
        this.regiments['custom'].pattern = pattern;
    }
}
