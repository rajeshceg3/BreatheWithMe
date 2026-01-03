import { describe, it, expect } from 'vitest';
import RegimentManager from '../js/RegimentManager.js';

describe('RegimentManager', () => {
    const regimentManager = new RegimentManager();

    it('should return default regiment initially', () => {
        expect(regimentManager.getCurrentRegiment().id).toBe('coherence');
    });

    it('should change regiment correctly', () => {
        regimentManager.setRegiment('box-breathing');
        expect(regimentManager.getCurrentRegiment().id).toBe('box-breathing');
    });

    it('should return null for invalid regiment', () => {
        const result = regimentManager.setRegiment('invalid-id');
        expect(result).toBeNull();
        expect(regimentManager.getCurrentRegiment().id).not.toBe('invalid-id');
    });

    it('should update custom regiment', () => {
        const customPattern = { inhale: 10, hold1: 0, exhale: 10, hold2: 0 };
        regimentManager.updateCustomRegiment(customPattern);
        const customRegiment = regimentManager.getRegiment('custom');
        expect(customRegiment.pattern).toEqual(customPattern);
    });
});
