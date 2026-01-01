class RegimentManager {
    constructor() {
        this.regiments = {
            'box-breathing': {
                id: 'box-breathing',
                name: 'Tactical Calm (Box Breathing)',
                description: 'Used by Navy SEALs for stress reduction and focus.',
                pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
                benefits: ['Stress Reduction', 'Mental Clarity', 'Focus']
            },
            '4-7-8': {
                id: '4-7-8',
                name: 'Sleep Aid (4-7-8)',
                description: 'Dr. Andrew Weil\'s technique for relaxation and sleep.',
                pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
                benefits: ['Sleep Aid', 'Anxiety Relief']
            },
            'physiological-sigh': {
                id: 'physiological-sigh',
                name: 'Panic Reset (Physiological Sigh)',
                description: 'Double inhale, long exhale to offload CO2.',
                pattern: { inhale: 2, hold1: 0, exhale: 6, hold2: 1 }, // simplified simulation
                benefits: ['Instant Calm', 'CO2 Balance']
            },
            'coherence': {
                id: 'coherence',
                name: 'Heart Coherence',
                description: 'Balances heart rate variability (HRV).',
                pattern: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 },
                benefits: ['HRV Balance', 'Emotional Stability']
            },
            'custom': {
                id: 'custom',
                name: 'Custom Regiment',
                description: 'User defined pattern.',
                pattern: { inhale: 4, hold1: 1, exhale: 6, hold2: 1 },
                benefits: ['Personalized']
            }
        };
        this.currentRegimentId = 'coherence'; // Default
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
