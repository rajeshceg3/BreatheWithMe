import { describe, it, expect, beforeEach } from 'vitest';
import RegimentManager from '../js/RegimentManager.js';

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

describe('RegimentManager', () => {
    let manager;

    beforeEach(() => {
        manager = new RegimentManager();
    });

    it('should initialize with default regiments', () => {
        const regiments = manager.getRegiments();
        expect(regiments.length).toBeGreaterThan(0);
        expect(manager.getCurrentRegiment().id).toBe('coherence');
    });

    it('should set regiment by id', () => {
        const regiment = manager.setRegiment('4-7-8');
        expect(regiment).toBeDefined();
        expect(regiment.id).toBe('4-7-8');
        expect(manager.getCurrentRegiment().id).toBe('4-7-8');
    });

    it('should return null for invalid regiment id', () => {
        const regiment = manager.setRegiment('invalid-id');
        expect(regiment).toBeNull();
        // Should remain on previous
        expect(manager.getCurrentRegiment().id).toBe('coherence');
    });

    it('should update custom regiment', () => {
        const newPattern = { inhale: 10, hold1: 10, exhale: 10, hold2: 10 };
        manager.updateCustomRegiment(newPattern);

        const custom = manager.getRegiment('custom');
        expect(custom.pattern).toEqual(newPattern);
    });
});
