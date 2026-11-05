import { describe, it, expect, beforeEach } from 'vitest';
import AnimationManager from '../js/AnimationManager.js';

function readDynamicKeyframes() {
    return document.getElementById('dynamic-breathe-keyframes')?.textContent || '';
}

describe('AnimationManager.setAnimationPace', () => {
    let manager;
    beforeEach(() => {
        window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
        document.head.innerHTML = '';
        document.documentElement.style.cssText = '';
        manager = new AnimationManager(document.createElement('div'));
    });

    it('derives keyframe boundaries from the pace settings (default 4-1-6-1)', () => {
        manager.setAnimationPace({ inhale: 4, hold1: 1, exhale: 6, hold2: 1 });
        const css = readDynamicKeyframes();
        expect(css).toContain('33.3333%{transform:scale(var(--circle-scale-max))');
        expect(css).toContain('41.6667%{transform:scale(var(--circle-scale-max))');
        expect(css).toContain('91.6667%{transform:scale(0.5)');
        expect(css).toContain('@keyframes breathe-aura');
    });

    it('aligns symmetric regimens to their real halves (5-0-5-0 zero hold)', () => {
        manager.setAnimationPace({ inhale: 5, hold1: 0, exhale: 5, hold2: 0 });
        const css = readDynamicKeyframes();
        expect(css).toContain('50%{transform:scale(var(--circle-scale-max))');
        expect(css).not.toContain('33.3333%');
    });

    it('keeps hold plateaus proportional (5-5-5-5)', () => {
        manager.setAnimationPace({ inhale: 5, hold1: 5, exhale: 5, hold2: 5 });
        const css = readDynamicKeyframes();
        expect(css).toContain('25%{transform:scale(var(--circle-scale-max))');
        expect(css).toContain('50%{transform:scale(var(--circle-scale-max))');
        expect(css).toContain('75%{transform:scale(0.5)');
    });

    it('updates the injected stylesheet on repeated calls', () => {
        manager.setAnimationPace({ inhale: 4, hold1: 1, exhale: 6, hold2: 1 });
        manager.setAnimationPace({ inhale: 5, hold1: 0, exhale: 5, hold2: 0 });
        const css = readDynamicKeyframes();
        expect(css).toContain('50%{transform:scale(var(--circle-scale-max))');
        expect(css).not.toContain('33.3333%');
        expect(document.querySelectorAll('#dynamic-breathe-keyframes').length).toBe(1);
    });

    it('sets the duration custom properties from the same settings', () => {
        manager.setAnimationPace({ inhale: 5, hold1: 0.5, exhale: 5, hold2: 0.5 });
        const s = document.documentElement.style;
        expect(s.getPropertyValue('--inhale-duration')).toBe('5s');
        expect(s.getPropertyValue('--hold1-duration')).toBe('0.5s');
        expect(s.getPropertyValue('--exhale-duration')).toBe('5s');
        expect(s.getPropertyValue('--hold2-duration')).toBe('0.5s');
    });

    it('ignores malformed settings and leaves no injected keyframes', () => {
        manager.setAnimationPace({ inhale: 'x', hold1: 1, exhale: 6, hold2: 1 });
        manager.setAnimationPace(null);
        manager.setAnimationPace({ inhale: 0, hold1: 0, exhale: 0, hold2: 0 });
        manager.setAnimationPace({ inhale: -4, hold1: 1, exhale: 6, hold2: 1 });
        expect(readDynamicKeyframes()).toBe('');
    });
});
