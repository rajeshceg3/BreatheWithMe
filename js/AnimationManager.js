class AnimationManager {
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
            this.breathingCircle.style.animationName = 'none';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.breathingCircle.style.animationName = 'breathe';
                });
            });
        }
    }
}
