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

    const BREATHING_PACES = {
        slow: { inhale: 6, hold1: 1, exhale: 8, hold2: 1, label: 'Slow' },
        normal: { inhale: 4, hold1: 1, exhale: 6, hold2: 1, label: 'Normal' },
        fast: { inhale: 3, hold1: 1, exhale: 4, hold2: 1, label: 'Fast' },
        custom: { inhale: 4, hold1: 1, exhale: 6, hold2: 1, label: 'Custom' }
    };
    let currentPace = 'normal';

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
        // Audio is disabled due to missing assets.
        audioManager.setEnabled(false);
        uiMediator.updateSoundButton(false);
        if (uiMediator.soundToggleButton) {
            uiMediator.soundToggleButton.disabled = true;
        }
        uiMediator.updateThemeButton(themeManager.getTheme());
        loadDurationPreference();
        loadPacePreference();
        welcomeMessage();
    }

    function welcomeMessage() {
        updateInstructionText('Welcome.');
        setTimeout(() => {
            uiMediator.instructionText.style.opacity = '0';
            setTimeout(() => {
                const paceSettings = BREATHING_PACES[currentPace];
                updateInstructionText(`Tap Begin to start. (Pace: ${paceSettings.inhale}s In, ${paceSettings.exhale}s Out)`);
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
        // Disabled due to missing audio assets.
        // if (!audioInitialized && audioManager) {
        //     if (audioManager.getIsEnabled()) {
        //         audioManager.initialize();
        //     }
        //     audioInitialized = true;
        // }
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

            const focusableElements = Array.from(uiMediator.settingsPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
            if (focusableElements.length) {
                let focused = false;
                const checkedRadio = uiMediator.settingsPanel.querySelector('input[name="breathing-pace"]:checked');
                if (checkedRadio) { checkedRadio.focus(); focused = true; }
                else if (focusableElements.length > 1) { focusableElements[0].focus(); focused = true; }
                if(!focused && focusableElements.length > 0){ focusableElements[0].focus(); }
            }
            document.addEventListener('keydown', trapFocus);
        });

        uiMediator.closeSettingsButton.addEventListener('click', () => {
            uiMediator.toggleSettingsPanel(false);
            document.removeEventListener('keydown', trapFocus);
            if (previouslyFocusedElement) previouslyFocusedElement.focus();
            if (breathingCircle && breathingCircle.style.animationPlayState === 'running') {
                hideControlsAfterDelay();
            }
        });
    }

    // --- Breathing Pace Logic ---
    function applyPaceToAnimationAndAudio(paceName) {
        if (paceName === 'custom') {
            BREATHING_PACES.custom.inhale = parseInt(customInhale.value, 10);
            BREATHING_PACES.custom.exhale = parseInt(customExhale.value, 10);
            BREATHING_PACES.custom.hold1 = parseInt(customHold.value, 10);
            BREATHING_PACES.custom.hold2 = parseInt(customHold.value, 10);
        }

        if (!BREATHING_PACES[paceName]) return;
        const paceSettings = BREATHING_PACES[paceName];
        currentPace = paceName;
        animationManager.setAnimationPace(paceSettings);

        const isPlaying = breathingCircle && breathingCircle.style.animationPlayState === 'running';
        if (isPlaying) {
            animationManager.reset();
            startSoundCycle('inhale');
        } else {
            updateInstructionText(`Breathe In (${paceSettings.inhale}s)...`);
        }
    }

    function loadPacePreference() {
        const savedPace = localStorage.getItem('breathingPace');
        if (savedPace && BREATHING_PACES[savedPace]) {
            currentPace = savedPace;
        }
        const currentPaceRadio = document.querySelector(`input[name="breathing-pace"][value="${currentPace}"]`);
        if (currentPaceRadio) currentPaceRadio.checked = true;

        if (currentPace === 'custom') {
            customPaceInputs.classList.remove('hidden');
            const savedCustomInhale = localStorage.getItem('customInhale');
            const savedCustomExhale = localStorage.getItem('customExhale');
            const savedCustomHold = localStorage.getItem('customHold');
            if (savedCustomInhale) customInhale.value = savedCustomInhale;
            if (savedCustomExhale) customExhale.value = savedCustomExhale;
            if (savedCustomHold) customHold.value = savedCustomHold;
        }

        applyPaceToAnimationAndAudio(currentPace);
    }

    if (paceRadios.length) {
        paceRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                const newPace = event.target.value;
                if (newPace === 'custom') {
                    customPaceInputs.classList.remove('hidden');
                } else {
                    customPaceInputs.classList.add('hidden');
                }
                localStorage.setItem('breathingPace', newPace);
                applyPaceToAnimationAndAudio(newPace);
            });
        });
    }

    [customInhale, customExhale, customHold].forEach(input => {
        input.addEventListener('change', () => {
            localStorage.setItem('customInhale', customInhale.value);
            localStorage.setItem('customExhale', customExhale.value);
            localStorage.setItem('customHold', customHold.value);
            applyPaceToAnimationAndAudio('custom');
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
        const paceSettings = BREATHING_PACES[currentPace];

        if (phase === 'inhale') {
            updateInstructionText(`Breathe In (${paceSettings.inhale}s)...`);
            particleManager.setState('gathering');
            // if (audioManager.getIsEnabled()) audioManager.playInhaleSound();
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold1'), paceSettings.inhale * 1000);
        } else if (phase === 'hold1') {
            updateInstructionText(`Hold (${paceSettings.hold1}s)...`);
            particleManager.setState('idle');
            // if (audioManager.getIsEnabled()) audioManager.stopSound();
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('exhale'), paceSettings.hold1 * 1000);
        } else if (phase === 'exhale') {
            updateInstructionText(`Breathe Out (${paceSettings.exhale}s)...`);
            particleManager.setState('dispersing');
            // if (audioManager.getIsEnabled()) audioManager.playExhaleSound();
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold2'), paceSettings.exhale * 1000);
        } else if (phase === 'hold2') {
            updateInstructionText(`Hold (${paceSettings.hold2}s)...`);
            particleManager.setState('idle');
            // if (audioManager.getIsEnabled()) audioManager.stopSound();
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('inhale'), paceSettings.hold2 * 1000);
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

    // --- Event Listeners for Controls ---
    if (uiMediator.sessionButton) {
        uiMediator.sessionButton.addEventListener('click', () => {
            const isPlaying = (breathingCircle && breathingCircle.style.animationPlayState === 'running') ||
                              (animationManager.prefersReducedMotion && uiMediator.sessionButton.textContent === 'End');
            if (isPlaying) {
                // End the session
                animationManager.pause();
                uiMediator.updateSessionButton(false);
                const currentPaceSettings = BREATHING_PACES[currentPace];
                updateInstructionText(`Paused. Resume with Begin (${currentPaceSettings.inhale}s)...`);
                clearTimeout(soundSyncTimeoutId);
                // if (audioManager) audioManager.stopSound();
                clearTimeout(sessionEndTimerId);
                sessionEndTime = null;
                pauseTime = null;
                uiMediator.toggleFadeOverlay(false);
                sessionIncrementedThisPageLoad = false;
                showControls();
            } else {
                // Begin the session
                // ensureAudioInitialized();
                localStorage.setItem('lastUsed', new Date().toISOString());
                if (!sessionIncrementedThisPageLoad) {
                    sessionCount++;
                    localStorage.setItem('sessionCount', sessionCount.toString());
                    sessionIncrementedThisPageLoad = true;
                }

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
                }, currentSessionDuration);

                hideControlsAfterDelay();
            }
        });
    }

    // if (uiMediator.soundToggleButton) {
    //     uiMediator.soundToggleButton.addEventListener('click', () => {
    //         const currentSoundState = audioManager.getIsEnabled();
    //         audioManager.setEnabled(!currentSoundState);
    //         localStorage.setItem('soundEnabled', audioManager.getIsEnabled().toString());
    //         uiMediator.updateSoundButton(audioManager.getIsEnabled());
    //         if (audioManager.getIsEnabled() && !audioInitialized) {
    //             audioManager.initialize();
    //             audioInitialized = true;
    //         }
    //     });
    // }

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
                // audioManager.stopSound();
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
