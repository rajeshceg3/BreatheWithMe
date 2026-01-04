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
            this.breathingCircle.style.animationPlayState = 'running';
        }
    }

    pause() {
        if (this.breathingCircle && !this.prefersReducedMotion) {
            this.breathingCircle.style.animationPlayState = 'paused';
        }
    }

    reset() {
        if (this.breathingCircle && !this.prefersReducedMotion) {
            // By setting the animationName to none and then removing the property,
            // the browser will re-apply the animations defined in the CSS,
            // which are 'breathe-core' and 'breathe-glow' for the pseudo-elements.
            this.breathingCircle.style.animationName = 'none';
            requestAnimationFrame(() => {
                // This little delay is crucial to ensure the browser has time to process the 'none' value.
                setTimeout(() => {
                    this.breathingCircle.style.animationName = '';
                }, 0);
            });
        }
    }
}
