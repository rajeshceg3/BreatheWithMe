// Mocking localStorage for testing
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

const fs = require('fs');
const path = require('path');

// Read file content
const regimentManagerCode = fs.readFileSync(path.resolve(__dirname, '../js/RegimentManager.js'), 'utf8');

// Execute code in global scope
// We wrap it to ensure we capture the class
const evalScript = regimentManagerCode + '; window.RegimentManager = RegimentManager;';
eval(evalScript);

describe('RegimentManager', () => {
    let manager;

    beforeEach(() => {
        manager = new window.RegimentManager();
    });

    test('should initialize with default regiments', () => {
        const regiments = manager.getRegiments();
        expect(regiments.length).toBeGreaterThan(0);
        expect(manager.getCurrentRegiment().id).toBe('coherence');
    });

    test('should set regiment by id', () => {
        const regiment = manager.setRegiment('4-7-8');
        expect(regiment).toBeDefined();
        expect(regiment.id).toBe('4-7-8');
        expect(manager.getCurrentRegiment().id).toBe('4-7-8');
    });

    test('should return null for invalid regiment id', () => {
        const regiment = manager.setRegiment('invalid-id');
        expect(regiment).toBeNull();
        // Should remain on previous
        expect(manager.getCurrentRegiment().id).toBe('coherence');
    });

    test('should update custom regiment', () => {
        const newPattern = { inhale: 10, hold1: 10, exhale: 10, hold2: 10 };
        manager.updateCustomRegiment(newPattern);

        const custom = manager.getRegiment('custom');
        expect(custom.pattern).toEqual(newPattern);
    });
});
