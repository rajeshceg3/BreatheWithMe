export default class AnimationManager {
    constructor(breathingCircle) {
        this.breathingCircle = breathingCircle;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    setAnimationPace(paceSettings) {
        const durations = ['inhale', 'hold1', 'exhale', 'hold2'].map((k) => Number(paceSettings?.[k]));
        if (durations.some((d) => !Number.isFinite(d) || d < 0)) {
            return; // keep the stylesheet defaults on malformed settings
        }
        const [inhale, hold1, exhale, hold2] = durations;
        const total = inhale + hold1 + exhale + hold2;
        if (total <= 0) {
            return;
        }

        document.documentElement.style.setProperty('--inhale-duration', inhale + 's');
        document.documentElement.style.setProperty('--hold1-duration', hold1 + 's');
        document.documentElement.style.setProperty('--exhale-duration', exhale + 's');
        document.documentElement.style.setProperty('--hold2-duration', hold2 + 's');

        // The static stylesheet keyframes hardcode the 4-1-6-1 phase boundaries
        // (33.3% / 41.7% / 91.7%), so any other regimen's visual phases drifted
        // from its instruction timing. Derive the boundaries from the same
        // paceSettings the session timers use so visual and label stay in sync.
        const pct = (seconds) => +(((seconds / total) * 100).toFixed(4));
        const inhaleEnd = pct(inhale);
        const hold1End = pct(inhale + hold1);
        const exhaleEnd = pct(inhale + hold1 + exhale);

        let styleEl = document.getElementById('dynamic-breathe-keyframes');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-breathe-keyframes';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent =
            `@keyframes breathe-core{` +
            `0%{transform:scale(0.5);opacity:.8}` +
            `${inhaleEnd}%{transform:scale(var(--circle-scale-max));opacity:1}` +
            `${hold1End}%{transform:scale(var(--circle-scale-max));opacity:1}` +
            `${exhaleEnd}%{transform:scale(0.5);opacity:.8}` +
            `100%{transform:scale(0.5);opacity:.8}}` +
            `@keyframes breathe-aura{` +
            `0%{transform:scale(0.8);opacity:.4;filter:blur(20px)}` +
            `${inhaleEnd}%{transform:scale(calc(var(--circle-scale-max) * 1.2));opacity:.8;filter:blur(40px)}` +
            `${hold1End}%{transform:scale(calc(var(--circle-scale-max) * 1.2));opacity:.8;filter:blur(40px)}` +
            `${exhaleEnd}%{transform:scale(0.8);opacity:.4;filter:blur(20px)}` +
            `100%{transform:scale(0.8);opacity:.4;filter:blur(20px)}}`;
    }

    play() {
        if (this.breathingCircle && !this.prefersReducedMotion) {
            this.breathingCircle.style.animationPlayState = 'running'; // state marker read elsewhere
            this.breathingCircle.classList.add('playing'); // actually drives the pseudo-element animations
        }
    }

    pause() {
        if (this.breathingCircle && !this.prefersReducedMotion) {
            this.breathingCircle.style.animationPlayState = 'paused';
            this.breathingCircle.classList.remove('playing');
        }
    }

    reset() {
        if (this.breathingCircle && !this.prefersReducedMotion) {
            // Restart the pseudo-element animations by toggling the driving class.
            // (Inline animationName/animationPlayState on the parent never reached the pseudos.)
            const wasPlaying = this.breathingCircle.style.animationPlayState === 'running';
            this.breathingCircle.classList.remove('playing');
            void this.breathingCircle.offsetWidth; // force reflow so the animation restarts
            if (wasPlaying) {
                this.breathingCircle.classList.add('playing');
            }
        }
    }

}
