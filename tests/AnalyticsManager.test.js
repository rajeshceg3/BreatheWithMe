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

    it('should retrieve trend data', () => {
        const session1 = {
            date: '2023-01-01T10:00:00.000Z',
            duration: 60000,
            regimentId: 'box',
            preStress: 8,
            postStress: 5 // delta 3
        };
        const session2 = {
            date: '2023-01-02T10:00:00.000Z',
            duration: 60000,
            regimentId: 'box',
            preStress: 6,
            postStress: 2 // delta 4
        };
        const sessionNoStress = {
             date: '2023-01-03T10:00:00.000Z',
             duration: 60000,
             regimentId: 'box',
             preStress: null,
             postStress: null
        };

        manager.logSession(session1);
        manager.logSession(session2);
        manager.logSession(sessionNoStress);

        const trend = manager.getTrendData();
        expect(trend.length).toBe(2); // Should filter out the one without stress data
        expect(trend[0].value).toBe(3);
        expect(trend[1].value).toBe(4);
    });
});
