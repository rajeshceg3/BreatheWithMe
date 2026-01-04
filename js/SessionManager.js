/**
 * Manages the breathing session state, timing, and lifecycle.
 */
class SessionManager {
    /**
     * @param {Object} dependencies - The dependencies for the session manager.
     * @param {AudioManager} dependencies.audioManager - Manages audio playback.
     * @param {AnimationManager} dependencies.animationManager - Manages breathing animations.
     * @param {RegimentManager} dependencies.regimentManager - Manages breathing patterns.
     * @param {ParticleManager} dependencies.particleManager - Manages background particles.
     * @param {UIMediator} dependencies.uiMediator - Manages UI updates.
     * @param {AnalyticsManager} dependencies.analyticsManager - Manages session logging.
     */
    constructor({ audioManager, animationManager, regimentManager, particleManager, uiMediator, analyticsManager }) {
        this.audioManager = audioManager;
        this.animationManager = animationManager;
        this.regimentManager = regimentManager;
        this.particleManager = particleManager;
        this.uiMediator = uiMediator;
        this.analyticsManager = analyticsManager;

        this.soundSyncTimeoutId = null;
        this.sessionEndTimerId = null;
        this.controlsFadeTimeoutId = null;

        this.sessionEndTime = null;
        this.pauseTime = null;
        this.currentSessionData = {
            startTime: null,
            preStress: null
        };
        this.currentPhaseForResume = 'inhale';
        this.animationWasActiveBeforeBlur = false;

        // Sequence State
        this.isSequenceActive = false;
        this.sequenceQueue = [];
        this.sequenceCurrentIndex = 0;

        this.SESSION_DURATIONS = {
            '3': 3 * 60 * 1000,
            '5': 5 * 60 * 1000,
            '10': 10 * 60 * 1000,
            '15': 15 * 60 * 1000
        };
        this.currentSessionDuration = this.SESSION_DURATIONS['5'];

        this.loadDurationPreference();
    }

    loadDurationPreference() {
        const savedDurationKey = localStorage.getItem('sessionDuration');
        if (savedDurationKey && this.SESSION_DURATIONS[savedDurationKey]) {
            this.currentSessionDuration = this.SESSION_DURATIONS[savedDurationKey];
            const select = document.getElementById('session-duration');
            if (select) select.value = savedDurationKey;
        }
    }

    setDuration(key) {
        if (this.SESSION_DURATIONS[key]) {
            this.currentSessionDuration = this.SESSION_DURATIONS[key];
            localStorage.setItem('sessionDuration', key);
        }
    }

    startSessionRoutine() {
        this.uiMediator.toggleStressModal(true);
    }

    actuallyStartSession() {
        this.ensureAudioInitialized();
        localStorage.setItem('lastUsed', new Date().toISOString());

        this.currentSessionData.startTime = Date.now();
        // preStress is already set by modal handler calling this

        const currentReg = this.regimentManager.getCurrentRegiment();

        if (currentReg.isSequence) {
             // Initialize Sequence Mode
             this.isSequenceActive = true;
             this.sequenceQueue = [...currentReg.sequence];
             this.sequenceCurrentIndex = 0;
             this.startSequencePhase();

             if (this.animationManager.prefersReducedMotion) {
                this.uiMediator.updateInstructionText("Mission Reset sequence started.");
            }

             this.animationManager.play();
             this.uiMediator.updateSessionButton(true);
             this.uiMediator.toggleFadeOverlay(false);
             this.hideControlsAfterDelay();

        } else {
             // Standard Mode
             this.isSequenceActive = false;

             if (this.animationManager.prefersReducedMotion) {
                this.uiMediator.updateInstructionText("Breathing guidance started (animations reduced).");
            }
             this.animationManager.play();
             this.uiMediator.updateSessionButton(true);
             this.startSoundCycle('inhale');

             clearTimeout(this.sessionEndTimerId);
             this.sessionEndTime = Date.now() + this.currentSessionDuration;
             this.uiMediator.toggleFadeOverlay(false);
             this.sessionEndTimerId = setTimeout(() => {
                 this.endSessionRoutine(true);
             }, this.currentSessionDuration);

             this.hideControlsAfterDelay();
        }
    }

    startSequencePhase() {
        if (this.sequenceCurrentIndex >= this.sequenceQueue.length) {
            this.endSessionRoutine(true); // Sequence Complete
            return;
        }

        const phase = this.sequenceQueue[this.sequenceCurrentIndex];
        const regiment = this.regimentManager.getRegiment(phase.id);
        const duration = phase.durationMinutes * 60 * 1000;

        this.uiMediator.updateInstructionText(`Phase ${this.sequenceCurrentIndex + 1}/${this.sequenceQueue.length}: ${regiment.name}`);

        if (regiment.audio) {
            this.audioManager.setFrequencies(regiment.audio.baseFreq, regiment.audio.binauralBeat);
        }

        // We need to update animation pace here
        this.animationManager.setAnimationPace(regiment.pattern);
        this.animationManager.reset(); // Reset animation for new pace
        this.startSoundCycle('inhale');

        clearTimeout(this.sessionEndTimerId);
        this.sessionEndTime = Date.now() + duration;
        this.sessionEndTimerId = setTimeout(() => {
            this.sequenceCurrentIndex++;
            this.startSequencePhase(); // Recursively start next phase
        }, duration);
    }

    endSessionRoutine(completed = false) {
        this.animationManager.pause();
        this.audioManager.stopSound();
        this.uiMediator.updateSessionButton(false);
        clearTimeout(this.soundSyncTimeoutId);
        clearTimeout(this.sessionEndTimerId);

        if (completed) {
            this.uiMediator.toggleFadeOverlay(true);
            setTimeout(() => {
                this.uiMediator.toggleStressModal(true);
            }, 1500);
        } else {
             const currentPaceSettings = this.regimentManager.getCurrentRegiment().pattern;
             // If in sequence, might want to show which phase paused, but simple is fine
             this.uiMediator.updateInstructionText(`Paused. Resume with Begin (${currentPaceSettings.inhale}s)...`);
             this.sessionEndTime = null;
             this.pauseTime = null;
             this.uiMediator.toggleFadeOverlay(false);
             this.showControls();
        }
    }

    startSoundCycle(phase = 'inhale') {
        this.currentPhaseForResume = phase;

        const isEffectivelyPlaying = (this.animationManager.prefersReducedMotion && this.uiMediator.sessionButton.textContent === 'End') ||
                                   (!this.animationManager.prefersReducedMotion && this.animationManager.breathingCircle && this.animationManager.breathingCircle.style.animationPlayState === 'running');

        if (!isEffectivelyPlaying) {
            clearTimeout(this.soundSyncTimeoutId);
            return;
        }

        clearTimeout(this.soundSyncTimeoutId);
        // In sequence mode, we need the CURRENT regiment (phase), not necessarily the top level one if it is a sequence container
        // However, RegimentManager.getCurrentRegiment() returns the selected regiment.
        // If it's a sequence, we are running sub-regiments.
        // But startSequencePhase updates the animation manager.
        // We need to get the pattern from the CURRENT phase regiment if we are in a sequence.

        let paceSettings;
        if (this.isSequenceActive && this.sequenceQueue.length > 0) {
             const phase = this.sequenceQueue[this.sequenceCurrentIndex];
             if (phase) {
                 const regiment = this.regimentManager.getRegiment(phase.id);
                 paceSettings = regiment.pattern;
             } else {
                 // Fallback or end
                 return;
             }
        } else {
             const regiment = this.regimentManager.getCurrentRegiment();
             paceSettings = regiment.pattern;
        }

        if (this.audioManager.getIsEnabled()) {
            const duration = paceSettings[phase];
            if (duration > 0) {
                 this.audioManager.syncWithBreath(phase, duration);
            }
        }

        if (phase === 'inhale') {
            this.uiMediator.updateInstructionText(`Breathe In (${paceSettings.inhale}s)...`);
            this.particleManager.setPhase('inhale');
            this.soundSyncTimeoutId = setTimeout(() => this.startSoundCycle('hold1'), paceSettings.inhale * 1000);
        } else if (phase === 'hold1') {
            if (paceSettings.hold1 > 0) {
                this.uiMediator.updateInstructionText(`Hold (${paceSettings.hold1}s)...`);
                this.particleManager.setPhase('idle');
                this.soundSyncTimeoutId = setTimeout(() => this.startSoundCycle('exhale'), paceSettings.hold1 * 1000);
            } else {
                this.startSoundCycle('exhale');
            }
        } else if (phase === 'exhale') {
            this.uiMediator.updateInstructionText(`Breathe Out (${paceSettings.exhale}s)...`);
            this.particleManager.setPhase('exhale');
            this.soundSyncTimeoutId = setTimeout(() => this.startSoundCycle('hold2'), paceSettings.exhale * 1000);
        } else if (phase === 'hold2') {
             if (paceSettings.hold2 > 0) {
                this.uiMediator.updateInstructionText(`Hold (${paceSettings.hold2}s)...`);
                this.particleManager.setPhase('idle');
                this.soundSyncTimeoutId = setTimeout(() => this.startSoundCycle('inhale'), paceSettings.hold2 * 1000);
             } else {
                this.startSoundCycle('inhale');
             }
        }
    }

    ensureAudioInitialized() {
        if (this.audioManager && !this.audioManager.audioInitialized) {
             this.audioManager.initialize();
             this.audioManager.audioInitialized = true;
        }
    }

    hideControlsAfterDelay() {
        clearTimeout(this.controlsFadeTimeoutId);
        this.controlsFadeTimeoutId = setTimeout(() => {
            this.uiMediator.toggleControls(false);
        }, 3000);
    }

    showControls() {
        this.uiMediator.toggleControls(true);
        clearTimeout(this.controlsFadeTimeoutId);
    }

    handleVisibilityChange() {
        const circle = this.animationManager.breathingCircle;
        if (!circle) return;

        const isEffectivelyPlaying = (this.animationManager.prefersReducedMotion && this.uiMediator.sessionButton.textContent === 'End') ||
                                   (!this.animationManager.prefersReducedMotion && circle.style.animationPlayState === 'running');

        if (document.hidden) {
            if (isEffectivelyPlaying) {
                this.animationWasActiveBeforeBlur = true;
                this.animationManager.pause();
                clearTimeout(this.soundSyncTimeoutId);
                this.audioManager.stopSound();
                this.uiMediator.updateSessionButton(false);
                this.uiMediator.updateInstructionText('Paused (Tab Hidden)');
                clearTimeout(this.sessionEndTimerId);
                this.pauseTime = Date.now();
                this.showControls();
            } else {
                this.animationWasActiveBeforeBlur = false;
            }
        } else {
            if (this.animationWasActiveBeforeBlur) {
                if (this.pauseTime && this.sessionEndTime) {
                    const pauseDuration = Date.now() - this.pauseTime;
                    this.sessionEndTime += pauseDuration;
                    const timeRemaining = this.sessionEndTime - Date.now();

                    if (timeRemaining > 0) {
                        this.sessionEndTimerId = setTimeout(() => {
                            if (this.isSequenceActive) {
                                // Logic to resume sequence timer/next phase?
                                // For simplicity, we just resume the current phase timer.
                                // If it was a sequence, we need to handle phase transition.
                                // This simple restoration might be enough for current phase.
                                this.sequenceCurrentIndex++;
                                this.startSequencePhase();
                            } else {
                                this.uiMediator.toggleFadeOverlay(true);
                                setTimeout(() => {
                                    if ((circle.style.animationPlayState === 'running') ||
                                        (this.animationManager.prefersReducedMotion && this.uiMediator.sessionButton.textContent === 'End')) {
                                        this.uiMediator.sessionButton.click();
                                    }
                                    this.uiMediator.updateInstructionText("Session complete. Well done!", true);
                                    setTimeout(() => this.uiMediator.toggleFadeOverlay(false), 3000);
                                    this.showControls();
                                }, 1500);
                            }
                        }, timeRemaining);
                    }
                }

                this.animationManager.play();
                this.uiMediator.updateSessionButton(true);
                this.startSoundCycle(this.currentPhaseForResume);
                this.animationWasActiveBeforeBlur = false;
                this.hideControlsAfterDelay();
            }
        }
    }
}
