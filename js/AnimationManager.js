export default class AnimationManager {
    constructor(breathingCircle) {
        this.breathingCircle = breathingCircle;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    setAnimationPace(paceSettings) {
        document.documentElement.style.setProperty('--inhale-duration', paceSettings.inhale + 's');
        document.documentElement.style.setProperty('--hold1-duration', paceSettings.hold1 + 's');
        document.documentElement.style.setProperty('--exhale-duration', paceSettings.exhale + 's');
        document.documentElement.style.setProperty('--hold2-duration', paceSettings.hold2 + 's');
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
