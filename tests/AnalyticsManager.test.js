import { describe, it, expect, beforeEach, vi } from 'vitest';
import AnalyticsManager from '../js/AnalyticsManager.js';

// Mock localStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem(key) {
            return store[key] || null;
        },
        setItem(key, value) {
            store[key] = value.toString();
        },
        clear() {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('AnalyticsManager', () => {
    let manager;

    beforeEach(() => {
        window.localStorage.clear();
        manager = new AnalyticsManager();
    });

    it('should initialize with empty data', () => {
        const stats = manager.getStats();
        expect(stats.totalSessions).toBe(0);
        expect(stats.totalMinutes).toBe(0);
    });

    it('should log a session and update stats', () => {
        const sessionData = {
            date: new Date().toISOString(),
            duration: 300000, // 5 mins
            regimentId: 'coherence',
            preStress: 8,
            postStress: 4
        };

        manager.logSession(sessionData);

        const stats = manager.getStats();
        expect(stats.totalSessions).toBe(1);
        expect(stats.totalMinutes).toBe(5);
        expect(stats.avgStressReduction).toBe("4.0");
    });

    it('should persist data to localStorage', () => {
        const sessionData = {
            date: new Date().toISOString(),
            duration: 60000,
            regimentId: 'box',
            preStress: 5,
            postStress: 2
        };

        manager.logSession(sessionData);

        // Simulate new instance reloading data
        const newManager = new AnalyticsManager();
        expect(newManager.getStats().totalSessions).toBe(1);
    });
});
