import { describe, it, expect, beforeEach } from 'vitest';
import AnalyticsManager from '../js/AnalyticsManager.js';

describe('AnalyticsManager', () => {
    let analyticsManager;

    beforeEach(() => {
        // Mock localStorage
        global.localStorage = {
            store: {},
            getItem(key) { return this.store[key] || null; },
            setItem(key, value) { this.store[key] = value.toString(); },
            clear() { this.store = {}; }
        };
        analyticsManager = new AnalyticsManager();
    });

    it('should initialize with empty data if no storage exists', () => {
        expect(analyticsManager.data.sessions).toEqual([]);
    });

    it('should log a session correctly', () => {
        const session = {
            date: new Date().toISOString(),
            duration: 300000,
            regimentId: 'box-breathing',
            preStress: 8,
            postStress: 4
        };
        analyticsManager.logSession(session);
        expect(analyticsManager.data.sessions.length).toBe(1);
        expect(analyticsManager.data.sessions[0]).toEqual(session);
    });

    it('should calculate stats correctly', () => {
        analyticsManager.logSession({ duration: 60000, preStress: 8, postStress: 6 }); // Delta 2
        analyticsManager.logSession({ duration: 60000, preStress: 5, postStress: 2 }); // Delta 3

        const stats = analyticsManager.getStats();
        expect(stats.totalSessions).toBe(2);
        expect(stats.totalMinutes).toBe(2); // 120000 / 60000
        expect(stats.avgStressReduction).toBe('2.5');
    });
});
