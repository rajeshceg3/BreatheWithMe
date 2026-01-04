const fs = require('fs');
const path = require('path');

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

const analyticsManagerCode = fs.readFileSync(path.resolve(__dirname, '../js/AnalyticsManager.js'), 'utf8');
const evalScript = analyticsManagerCode + '; window.AnalyticsManager = AnalyticsManager;';
eval(evalScript);

describe('AnalyticsManager', () => {
    let manager;

    beforeEach(() => {
        window.localStorage.clear();
        manager = new window.AnalyticsManager();
    });

    test('should initialize with empty data', () => {
        const stats = manager.getStats();
        expect(stats.totalSessions).toBe(0);
        expect(stats.totalMinutes).toBe(0);
    });

    test('should log a session and update stats', () => {
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

    test('should persist data to localStorage', () => {
        const sessionData = {
            date: new Date().toISOString(),
            duration: 60000,
            regimentId: 'box',
            preStress: 5,
            postStress: 2
        };

        manager.logSession(sessionData);

        // Simulate new instance reloading data
        const newManager = new window.AnalyticsManager();
        expect(newManager.getStats().totalSessions).toBe(1);
    });

    test('should retrieve trend data', () => {
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
