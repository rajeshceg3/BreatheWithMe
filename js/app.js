document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const breathingCircle = document.getElementById('breathing-circle');
    const paceRadios = document.querySelectorAll('input[name="breathing-pace"]');
    const sessionDurationSelect = document.getElementById('session-duration');
    const customPaceInputs = document.getElementById('custom-pace-inputs');
    const customInhale = document.getElementById('custom-inhale');
    const customExhale = document.getElementById('custom-exhale');
    const customHold = document.getElementById('custom-hold');

    // Managers
    const audioManager = new AudioManager();
    const themeManager = new ThemeManager();
    const particleManager = new ParticleManager('particle-canvas');
    const uiMediator = new UIMediator();
    const animationManager = new AnimationManager(breathingCircle);
    const regimentManager = new RegimentManager();
    const analyticsManager = new AnalyticsManager();

    // App State
    let soundSyncTimeoutId = null;
    let audioInitialized = false;
    let animationWasActiveBeforeBlur = false;
    let currentPhaseForResume = 'inhale';
    let previouslyFocusedElement = null;
    let sessionCount = 0;
    let sessionIncrementedThisPageLoad = false;
    let sessionEndTimerId = null;
    let controlsFadeTimeoutId = null;
    let sessionEndTime = null;
    let pauseTime = null;

    // Session Data State
    let currentSessionData = {
        startTime: null,
        preStress: null
    };

    // BREATHING_PACES removed in favor of RegimentManager

    const SESSION_DURATIONS = { // Values in milliseconds
        '3': 3 * 60 * 1000,
        '5': 5 * 60 * 1000,
        '10': 10 * 60 * 1000,
        '15': 15 * 60 * 1000
    };
    let currentSessionDuration = SESSION_DURATIONS['5']; // Default to 5 minutes

    // --- Initialization ---
    function initialize() {
        themeManager.initialize('light');
        particleManager.init();

        // Initialize Audio State (default off until user interaction)
        const savedSoundState = localStorage.getItem('soundEnabled') === 'true';
        audioManager.setEnabled(savedSoundState);
        uiMediator.updateSoundButton(savedSoundState);
        if (uiMediator.soundToggleButton) {
             uiMediator.soundToggleButton.disabled = false;
        }

        uiMediator.updateThemeButton(themeManager.getTheme());
        loadDurationPreference();
        // Initialize Regiment
        const savedRegiment = localStorage.getItem('regimentId');
        if (savedRegiment) {
            regimentManager.setRegiment(savedRegiment);
            if (regimentSelect) regimentSelect.value = savedRegiment;
        }
        updatePaceUIFromRegiment(regimentManager.getCurrentRegiment());
        welcomeMessage();
    }

    function welcomeMessage() {
        updateInstructionText('Welcome.');
        setTimeout(() => {
            uiMediator.instructionText.style.opacity = '0';
            setTimeout(() => {
                const regiment = regimentManager.getCurrentRegiment();
                updateInstructionText(`Tap Begin to start. (${regiment.name})`);
                uiMediator.instructionText.style.opacity = '1';
            }, 1000);
        }, 2000);
    }

    function updateInstructionText(newText, isSessionCompletion = false) {
        if (!uiMediator.instructionText) return;

        uiMediator.instructionText.classList.add('text-fade-out');

        setTimeout(() => {
            uiMediator.instructionText.textContent = newText;
            uiMediator.instructionText.classList.remove('text-fade-out'); // Fade in
            if (isSessionCompletion) {
                uiMediator.instructionText.classList.add('session-complete-effect');
                uiMediator.instructionText.addEventListener('animationend', () => {
                    uiMediator.instructionText.classList.remove('session-complete-effect');
                }, { once: true });
            }
        }, 400); // Match CSS transition duration
    }

    function ensureAudioInitialized() {
        if (!audioInitialized && audioManager) {
            // AudioContext must be resumed/created after a user gesture
            audioManager.initialize();
            audioInitialized = true;
        }
    }

    // --- Focus Trap Function for Settings Panel ---
    function trapFocus(event) {
        if (!uiMediator.settingsPanel || !uiMediator.settingsPanel.classList.contains('visible')) return;

        if (event.key === 'Escape') {
            if (uiMediator.closeSettingsButton) uiMediator.closeSettingsButton.click();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusableElements = Array.from(uiMediator.settingsPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
        if (!focusableElements.length) return;
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus(); event.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusableElement) {
                firstFocusableElement.focus(); event.preventDefault();
            }
        }
    }

    // --- Settings Panel Logic ---
    if (uiMediator.settingsToggleButton && uiMediator.settingsPanel && uiMediator.closeSettingsButton) {
        uiMediator.settingsToggleButton.addEventListener('click', () => {
            previouslyFocusedElement = document.activeElement;
            uiMediator.toggleSettingsPanel(true);
            clearTimeout(controlsFadeTimeoutId);
            // No need for complex focus trapping for now, standard tab behavior is acceptable in this context
        });

        uiMediator.closeSettingsButton.addEventListener('click', () => {
            uiMediator.toggleSettingsPanel(false);
            if (previouslyFocusedElement) previouslyFocusedElement.focus();
            if (breathingCircle && breathingCircle.style.animationPlayState === 'running') {
                hideControlsAfterDelay();
            }
        });
    }

    if (uiMediator.closeSettingsButtonText) {
        uiMediator.closeSettingsButtonText.addEventListener('click', () => {
            if (uiMediator.closeSettingsButton) uiMediator.closeSettingsButton.click();
        });
    }

    // --- Analytics Panel Logic ---
    if (uiMediator.analyticsToggleButton && uiMediator.analyticsPanel && uiMediator.closeAnalyticsButton) {
        uiMediator.analyticsToggleButton.addEventListener('click', () => {
            uiMediator.updateAnalyticsUI(analyticsManager.getStats(), analyticsManager.getHistory());
            uiMediator.toggleAnalyticsPanel(true);
            clearTimeout(controlsFadeTimeoutId);
        });

        uiMediator.closeAnalyticsButton.addEventListener('click', () => {
            uiMediator.toggleAnalyticsPanel(false);
            if (breathingCircle && breathingCircle.style.animationPlayState === 'running') {
                hideControlsAfterDelay();
            }
        });
    }

    // --- Breathing Regiment Logic ---
    function updatePaceUIFromRegiment(regiment) {
        // Update Animation
        animationManager.setAnimationPace(regiment.pattern);

        // Update UI (Radios) - assuming we map new radios to regiments or create a new selector
        // For now, let's keep the custom inputs updated if it's custom
        if (regiment.id === 'custom') {
            customPaceInputs.classList.remove('hidden');
            customInhale.value = regiment.pattern.inhale;
            customExhale.value = regiment.pattern.exhale;
            customHold.value = regiment.pattern.hold1; // Assuming symmetric hold for simplicity in old UI
        } else {
            customPaceInputs.classList.add('hidden');
        }

        // Logic to update active radio button would go here if we were keeping radio buttons
        // But we are moving to a new selector.
    }

    function applyRegiment(regimentId) {
        const regiment = regimentManager.setRegiment(regimentId);
        if (!regiment) return;

        // Update Audio Settings
        if (regiment.audio) {
            audioManager.setFrequencies(regiment.audio.baseFreq, regiment.audio.binauralBeat);
        }

        localStorage.setItem('regimentId', regimentId);
        updatePaceUIFromRegiment(regiment);

        const isPlaying = breathingCircle && breathingCircle.style.animationPlayState === 'running';
        if (isPlaying) {
            animationManager.reset();
            startSoundCycle('inhale');
        } else {
             updateInstructionText(`${regiment.name} selected.`);
        }
    }

    // New Event Listener for Regiment Selection (We need to add this to the HTML)
    const regimentSelect = document.getElementById('regiment-select');
    if (regimentSelect) {
        regimentSelect.addEventListener('change', (e) => {
            applyRegiment(e.target.value);
        });
    }

    // Support for Custom Pace Inputs
    [customInhale, customExhale, customHold].forEach(input => {
        input.addEventListener('change', () => {
            const pattern = {
                inhale: parseInt(customInhale.value, 10),
                hold1: parseInt(customHold.value, 10),
                exhale: parseInt(customExhale.value, 10),
                hold2: parseInt(customHold.value, 10)
            };
            regimentManager.updateCustomRegiment(pattern);
            localStorage.setItem('customInhale', customInhale.value);
            localStorage.setItem('customExhale', customExhale.value);
            localStorage.setItem('customHold', customHold.value);
            applyRegiment('custom');
        });
    });

    function loadDurationPreference() {
        const savedDurationKey = localStorage.getItem('sessionDuration');
        if (savedDurationKey && SESSION_DURATIONS[savedDurationKey]) {
            currentSessionDuration = SESSION_DURATIONS[savedDurationKey];
            if (sessionDurationSelect) {
                sessionDurationSelect.value = savedDurationKey;
            }
        } else {
            if (sessionDurationSelect) {
                sessionDurationSelect.value = Object.keys(SESSION_DURATIONS).find(key => SESSION_DURATIONS[key] === currentSessionDuration) || '5';
            }
        }
    }

    // --- Session Duration Logic ---

    if (sessionDurationSelect) {
        sessionDurationSelect.addEventListener('change', (event) => {
            const selectedDurationKey = event.target.value;
            if (SESSION_DURATIONS[selectedDurationKey]) {
                currentSessionDuration = SESSION_DURATIONS[selectedDurationKey];
                localStorage.setItem('sessionDuration', selectedDurationKey);
            }
        });
    }

    // --- Sound Cycle and Animation Control ---
    function startSoundCycle(phase = 'inhale') {
        currentPhaseForResume = phase;

        const isEffectivelyPlaying = (animationManager.prefersReducedMotion && uiMediator.sessionButton.textContent === 'End') ||
                                   (!animationManager.prefersReducedMotion && breathingCircle && breathingCircle.style.animationPlayState === 'running');

        if (!isEffectivelyPlaying) {
            clearTimeout(soundSyncTimeoutId); return;
        }

        clearTimeout(soundSyncTimeoutId);
        const regiment = regimentManager.getCurrentRegiment();
        const paceSettings = regiment.pattern;

        // Sync Audio with Breath
        if (audioManager.getIsEnabled()) {
            // Determine duration based on phase
            const duration = paceSettings[phase];
            if (duration > 0) {
                 audioManager.syncWithBreath(phase, duration);
            }
        }

        if (phase === 'inhale') {
            updateInstructionText(`Breathe In (${paceSettings.inhale}s)...`);
            particleManager.setState('gathering');
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold1'), paceSettings.inhale * 1000);
        } else if (phase === 'hold1') {
            if (paceSettings.hold1 > 0) {
                updateInstructionText(`Hold (${paceSettings.hold1}s)...`);
                particleManager.setState('idle');
                soundSyncTimeoutId = setTimeout(() => startSoundCycle('exhale'), paceSettings.hold1 * 1000);
            } else {
                startSoundCycle('exhale'); // Skip hold if 0
            }
        } else if (phase === 'exhale') {
            updateInstructionText(`Breathe Out (${paceSettings.exhale}s)...`);
            particleManager.setState('dispersing');
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold2'), paceSettings.exhale * 1000);
        } else if (phase === 'hold2') {
             if (paceSettings.hold2 > 0) {
                updateInstructionText(`Hold (${paceSettings.hold2}s)...`);
                particleManager.setState('idle');
                soundSyncTimeoutId = setTimeout(() => startSoundCycle('inhale'), paceSettings.hold2 * 1000);
             } else {
                startSoundCycle('inhale'); // Skip hold if 0
             }
        }
    }

    // --- Controls Fade Logic ---
    function hideControlsAfterDelay() {
        clearTimeout(controlsFadeTimeoutId);
        controlsFadeTimeoutId = setTimeout(() => {
            uiMediator.toggleControls(false);
        }, 3000);
    }

    function showControls() {
        uiMediator.toggleControls(true);
        clearTimeout(controlsFadeTimeoutId);
    }

    document.body.addEventListener('mousemove', () => {
        if ((breathingCircle && breathingCircle.style.animationPlayState === 'running') ||
           (animationManager.prefersReducedMotion && uiMediator.sessionButton.textContent === 'End')) {
            showControls();
            hideControlsAfterDelay();
        }
    });

    // --- Session Control Logic with Stress Check-in ---
    function startSessionRoutine() {
        // Show stress check-in before starting
        uiMediator.toggleStressModal(true);
        // We'll wait for the user to interact with the modal to actually start
    }

    function actuallyStartSession() {
        ensureAudioInitialized();
        localStorage.setItem('lastUsed', new Date().toISOString());

        currentSessionData.startTime = Date.now();
        // preStress is already set by modal

        if (animationManager.prefersReducedMotion) {
            updateInstructionText("Breathing guidance started (animations reduced).");
        }
        animationManager.play();
        uiMediator.updateSessionButton(true);
        startSoundCycle('inhale');

        // Session end timer
        clearTimeout(sessionEndTimerId);
        sessionEndTime = Date.now() + currentSessionDuration;
        uiMediator.toggleFadeOverlay(false);
        sessionEndTimerId = setTimeout(() => {
            endSessionRoutine(true); // Completed
        }, currentSessionDuration);

        hideControlsAfterDelay();
    }

    function endSessionRoutine(completed = false) {
        animationManager.pause();
        audioManager.stopSound(); // Ensure sound stops
        uiMediator.updateSessionButton(false);
        clearTimeout(soundSyncTimeoutId);
        clearTimeout(sessionEndTimerId);

        if (completed) {
            uiMediator.toggleFadeOverlay(true);
            setTimeout(() => {
                 // Post Session Stress Check
                uiMediator.toggleStressModal(true);
                // The modal handler will finalize the log
            }, 1500);
        } else {
             // Paused/Aborted manually
             const currentPaceSettings = regimentManager.getCurrentRegiment().pattern;
             updateInstructionText(`Paused. Resume with Begin (${currentPaceSettings.inhale}s)...`);
             sessionEndTime = null;
             pauseTime = null;
             uiMediator.toggleFadeOverlay(false);
             showControls();
        }
    }

    // --- Stress Modal Handlers ---
    if (uiMediator.submitStressButton) {
        uiMediator.submitStressButton.addEventListener('click', () => {
            const value = parseInt(uiMediator.stressSlider.value, 10);
            uiMediator.toggleStressModal(false);

            if (currentSessionData.startTime === null) {
                // This was a pre-check
                currentSessionData.preStress = value;
                actuallyStartSession();
            } else {
                // This was a post-check
                // Log the session
                analyticsManager.logSession({
                    date: new Date().toISOString(),
                    duration: currentSessionData.startTime ? (Date.now() - currentSessionData.startTime) : 0,
                    regimentId: regimentManager.currentRegimentId,
                    preStress: currentSessionData.preStress,
                    postStress: value
                });

                // Reset session state
                currentSessionData = { startTime: null, preStress: null };
                updateInstructionText("Session complete. Mission accomplished.", true);
                setTimeout(() => uiMediator.toggleFadeOverlay(false), 2000);
                showControls();
            }
        });
    }

    if (uiMediator.skipStressButton) {
        uiMediator.skipStressButton.addEventListener('click', () => {
            uiMediator.toggleStressModal(false);

             if (currentSessionData.startTime === null) {
                // Skipped pre-check
                currentSessionData.preStress = null;
                actuallyStartSession();
            } else {
                // Skipped post-check
                analyticsManager.logSession({
                    date: new Date().toISOString(),
                    duration: currentSessionData.startTime ? (Date.now() - currentSessionData.startTime) : 0,
                    regimentId: regimentManager.currentRegimentId,
                    preStress: currentSessionData.preStress,
                    postStress: null
                });
                currentSessionData = { startTime: null, preStress: null };
                updateInstructionText("Session complete.", true);
                setTimeout(() => uiMediator.toggleFadeOverlay(false), 2000);
                showControls();
            }
        });
    }

    if (uiMediator.sessionButton) {
        uiMediator.sessionButton.addEventListener('click', () => {
            const isPlaying = (breathingCircle && breathingCircle.style.animationPlayState === 'running') ||
                              (animationManager.prefersReducedMotion && uiMediator.sessionButton.textContent === 'End');
            if (isPlaying) {
                endSessionRoutine(false); // Manual pause/stop
            } else {
                startSessionRoutine();
            }
        });
    }

    if (uiMediator.soundToggleButton) {
        uiMediator.soundToggleButton.addEventListener('click', () => {
            const currentSoundState = audioManager.getIsEnabled();
            audioManager.setEnabled(!currentSoundState);
            localStorage.setItem('soundEnabled', audioManager.getIsEnabled().toString());
            uiMediator.updateSoundButton(audioManager.getIsEnabled());
            if (audioManager.getIsEnabled() && !audioInitialized) {
                audioManager.initialize();
                audioInitialized = true;
            }
        });
    }

    if (uiMediator.themeToggleButton) {
        uiMediator.themeToggleButton.addEventListener('click', () => {
            const newTheme = themeManager.toggleTheme();
            uiMediator.updateThemeButton(newTheme);
        });
    }

    // --- Tab Visibility Handling ---
    document.addEventListener('visibilitychange', () => {
        if (!breathingCircle) return;
        const isEffectivelyPlaying = (animationManager.prefersReducedMotion && uiMediator.sessionButton.textContent === 'End') ||
                                   (!animationManager.prefersReducedMotion && breathingCircle && breathingCircle.style.animationPlayState === 'running');

        if (document.hidden) {
            if (isEffectivelyPlaying) {
                animationWasActiveBeforeBlur = true;
                animationManager.pause();
                clearTimeout(soundSyncTimeoutId);
                audioManager.stopSound();
                uiMediator.updateSessionButton(false);
                updateInstructionText('Paused (Tab Hidden)');
                clearTimeout(sessionEndTimerId);
                pauseTime = Date.now(); // Record the time when tab was hidden
                showControls();
            } else {
                animationWasActiveBeforeBlur = false;
            }
        } else { // Tab is visible
            if (animationWasActiveBeforeBlur) {
                if (pauseTime && sessionEndTime) {
                    const pauseDuration = Date.now() - pauseTime;
                    sessionEndTime += pauseDuration; // Extend the end time by the pause duration
                    const timeRemaining = sessionEndTime - Date.now();

                    if (timeRemaining > 0) {
                        sessionEndTimerId = setTimeout(() => {
                            uiMediator.toggleFadeOverlay(true);
                            setTimeout(() => {
                                if ((breathingCircle && breathingCircle.style.animationPlayState === 'running') ||
                                    (animationManager.prefersReducedMotion && uiMediator.sessionButton.textContent === 'End')) {
                                    uiMediator.sessionButton.click();
                                }
                                updateInstructionText("Session complete. Well done!", true);
                                setTimeout(() => uiMediator.toggleFadeOverlay(false), 3000);
                                sessionIncrementedThisPageLoad = false;
                                showControls();
                            }, 1500);
                        }, timeRemaining);
                    }
                }

                animationManager.play();
                uiMediator.updateSessionButton(true);
                startSoundCycle(currentPhaseForResume);
                animationWasActiveBeforeBlur = false;
                hideControlsAfterDelay();
            }
        }
    });

    initialize();
});
