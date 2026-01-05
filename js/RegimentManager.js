/**
 * Manages breathing patterns (regiments) and their configurations.
 */
export default class RegimentManager {
    constructor() {
        this.storageKey = 'breath_custom_profiles';
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
            },
            'mission-reset': {
                id: 'mission-reset',
                name: 'Mission Reset (Sequence)',
                description: 'Tactical Decompression Protocol: Sigh -> Box -> Coherence.',
                isSequence: true,
                sequence: [
                    { id: 'physiological-sigh', durationMinutes: 1 },
                    { id: 'box-breathing', durationMinutes: 3 },
                    { id: 'coherence', durationMinutes: 2 }
                ],
                benefits: ['Full Decompression', 'Focus Recovery'],
                audio: { baseFreq: 200, binauralBeat: 8 }
            }
        };

        this.loadCustomProfiles();
        this.currentRegimentId = 'coherence'; // Default

        // Also load basic custom regiment config if available (legacy support)
        this.loadCustomRegimentConfig();
    }

    /**
     * Loads custom profiles from local storage and adds them to the regiments list.
     */
    loadCustomProfiles() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const profiles = JSON.parse(stored);
                profiles.forEach(profile => {
                    this.regiments[profile.id] = profile;
                });
            } catch (e) {
                console.error("Failed to load custom profiles", e);
            }
        }
    }

    loadCustomRegimentConfig() {
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

    /**
     * Saves a new custom profile (Mission Profile).
     * @param {string} name - The name of the profile.
     * @param {Array} sequence - The sequence of steps.
     * @returns {string} The new profile ID.
     */
    createProfile(name, sequence) {
        const id = 'profile-' + Date.now();
        const profile = {
            id: id,
            name: name,
            description: 'Custom Operational Protocol',
            isSequence: true,
            sequence: sequence, // [{ id: 'regiment_id', durationMinutes: 5 }]
            benefits: ['Custom Protocol', 'Operational Specific'],
            audio: { baseFreq: 200, binauralBeat: 8 }, // Default
            isCustom: true
        };

        this.regiments[id] = profile;
        this.saveProfilesToStorage();
        return id;
    }

    /**
     * Deletes a custom profile.
     * @param {string} id - The ID of the profile to delete.
     */
    deleteProfile(id) {
        if (this.regiments[id] && this.regiments[id].isCustom) {
            delete this.regiments[id];
            this.saveProfilesToStorage();
            return true;
        }
        return false;
    }

    /**
     * Persists all custom profiles to localStorage.
     */
    saveProfilesToStorage() {
        const customProfiles = Object.values(this.regiments).filter(r => r.isCustom);
        localStorage.setItem(this.storageKey, JSON.stringify(customProfiles));
    }

    /**
     * Returns an array of all available regiments.
     * @returns {Array} List of regiment objects.
     */
    getRegiments() {
        return Object.values(this.regiments);
    }

    /**
     * Retrieves a specific regiment by ID.
     * @param {string} id - The ID of the regiment.
     * @returns {Object|undefined} The regiment object.
     */
    getRegiment(id) {
        return this.regiments[id];
    }

    /**
     * Sets the current active regiment.
     * @param {string} id - The ID of the regiment to activate.
     * @returns {Object|null} The activated regiment or null if not found.
     */
    setRegiment(id) {
        if (this.regiments[id]) {
            this.currentRegimentId = id;
            return this.regiments[id];
        }
        return null;
    }

    /**
     * Gets the currently active regiment.
     * @returns {Object} The active regiment object.
     */
    getCurrentRegiment() {
        return this.regiments[this.currentRegimentId];
    }

    /**
     * Updates the pattern for the custom regiment.
     * @param {Object} pattern - The new breathing pattern.
     */
    updateCustomRegiment(pattern) {
        this.regiments['custom'].pattern = pattern;
    }
}
