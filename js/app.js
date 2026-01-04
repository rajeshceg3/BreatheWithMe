document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const breathingCircle = document.getElementById('breathing-circle');
    const sessionDurationSelect = document.getElementById('session-duration');
    const customPaceInputs = document.getElementById('custom-pace-inputs');
    const customInhale = document.getElementById('custom-inhale');
    const customExhale = document.getElementById('custom-exhale');
    const customHold = document.getElementById('custom-hold');
    const regimentSelect = document.getElementById('regiment-select');

    // Managers
    const audioManager = new AudioManager();
    const themeManager = new ThemeManager();
    const particleManager = new ParticleManager('particle-canvas');
    const uiMediator = new UIMediator();
    const animationManager = new AnimationManager(breathingCircle);
    const regimentManager = new RegimentManager();
    const analyticsManager = new AnalyticsManager();

    // Session Manager
    const sessionManager = new SessionManager({
        audioManager,
        animationManager,
        regimentManager,
        particleManager,
        uiMediator,
        analyticsManager
    });

    // --- Initialization ---
    function initialize() {
        themeManager.initialize('light');
        particleManager.init();

        // Initialize Audio State
        const savedSoundState = localStorage.getItem('soundEnabled') === 'true';
        audioManager.setEnabled(savedSoundState);
        uiMediator.updateSoundButton(savedSoundState);
        if (uiMediator.soundToggleButton) {
             uiMediator.soundToggleButton.disabled = false;
        }

        uiMediator.updateThemeButton(themeManager.getTheme());

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
        uiMediator.updateInstructionText('Welcome.');
        setTimeout(() => {
            uiMediator.instructionText.style.opacity = '0';
            setTimeout(() => {
                const regiment = regimentManager.getCurrentRegiment();
                uiMediator.updateInstructionText(`Tap Begin to start. (${regiment.name})`);
                uiMediator.instructionText.style.opacity = '1';
            }, 1000);
        }, 2000);
    }

    // --- Settings Panel Logic ---
    if (uiMediator.settingsToggleButton && uiMediator.settingsPanel && uiMediator.closeSettingsButton) {
        uiMediator.settingsToggleButton.addEventListener('click', () => {
            uiMediator.toggleSettingsPanel(true);
            clearTimeout(sessionManager.controlsFadeTimeoutId);
        });

        uiMediator.closeSettingsButton.addEventListener('click', () => {
            uiMediator.toggleSettingsPanel(false);
            if (breathingCircle && breathingCircle.style.animationPlayState === 'running') {
                sessionManager.hideControlsAfterDelay();
            }
        });
    }

    // --- Analytics Panel Logic ---
    if (uiMediator.analyticsToggleButton && uiMediator.analyticsPanel && uiMediator.closeAnalyticsButton) {
        uiMediator.analyticsToggleButton.addEventListener('click', () => {
            uiMediator.updateAnalyticsUI(analyticsManager.getStats(), analyticsManager.getHistory());
            uiMediator.toggleAnalyticsPanel(true);
            clearTimeout(sessionManager.controlsFadeTimeoutId);
        });

        uiMediator.closeAnalyticsButton.addEventListener('click', () => {
            uiMediator.toggleAnalyticsPanel(false);
            if (breathingCircle && breathingCircle.style.animationPlayState === 'running') {
                sessionManager.hideControlsAfterDelay();
            }
        });
    }

    // --- Breathing Regiment Logic ---
    function updatePaceUIFromRegiment(regiment) {
        animationManager.setAnimationPace(regiment.pattern);
        if (regiment.id === 'custom') {
            customPaceInputs.classList.remove('hidden');
            customInhale.value = regiment.pattern.inhale;
            customExhale.value = regiment.pattern.exhale;
            customHold.value = regiment.pattern.hold1;
        } else {
            customPaceInputs.classList.add('hidden');
        }
    }

    function applyRegiment(regimentId) {
        const regiment = regimentManager.setRegiment(regimentId);
        if (!regiment) return;

        if (regiment.audio) {
            audioManager.setFrequencies(regiment.audio.baseFreq, regiment.audio.binauralBeat);
        }

        localStorage.setItem('regimentId', regimentId);
        updatePaceUIFromRegiment(regiment);

        const isPlaying = breathingCircle && breathingCircle.style.animationPlayState === 'running';
        if (isPlaying) {
            animationManager.reset();
            sessionManager.startSoundCycle('inhale');
        } else {
             uiMediator.updateInstructionText(`${regiment.name} selected.`);
        }
    }

    if (regimentSelect) {
        regimentSelect.addEventListener('change', (e) => {
            applyRegiment(e.target.value);
        });
    }

    // Custom Pace Inputs
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

    // --- Session Duration Logic ---
    if (sessionDurationSelect) {
        sessionDurationSelect.addEventListener('change', (event) => {
            sessionManager.setDuration(event.target.value);
        });
    }

    // --- Mouse Move for Controls ---
    document.body.addEventListener('mousemove', () => {
        if ((breathingCircle && breathingCircle.style.animationPlayState === 'running') ||
           (animationManager.prefersReducedMotion && uiMediator.sessionButton.textContent === 'End')) {
            sessionManager.showControls();
            sessionManager.hideControlsAfterDelay();
        }
    });

    // --- Stress Modal Handlers ---
    if (uiMediator.submitStressButton) {
        uiMediator.submitStressButton.addEventListener('click', () => {
            const value = parseInt(uiMediator.stressSlider.value, 10);
            uiMediator.toggleStressModal(false);

            if (sessionManager.currentSessionData.startTime === null) {
                // Pre-check
                sessionManager.currentSessionData.preStress = value;
                sessionManager.actuallyStartSession();
            } else {
                // Post-check
                analyticsManager.logSession({
                    date: new Date().toISOString(),
                    duration: sessionManager.currentSessionData.startTime ? (Date.now() - sessionManager.currentSessionData.startTime) : 0,
                    regimentId: regimentManager.currentRegimentId,
                    preStress: sessionManager.currentSessionData.preStress,
                    postStress: value
                });
                // Reset
                sessionManager.currentSessionData = { startTime: null, preStress: null };
                uiMediator.updateInstructionText("Session complete. Mission accomplished.", true);
                setTimeout(() => uiMediator.toggleFadeOverlay(false), 2000);
                sessionManager.showControls();
            }
        });
    }

    if (uiMediator.skipStressButton) {
        uiMediator.skipStressButton.addEventListener('click', () => {
            uiMediator.toggleStressModal(false);

             if (sessionManager.currentSessionData.startTime === null) {
                sessionManager.currentSessionData.preStress = null;
                sessionManager.actuallyStartSession();
            } else {
                analyticsManager.logSession({
                    date: new Date().toISOString(),
                    duration: sessionManager.currentSessionData.startTime ? (Date.now() - sessionManager.currentSessionData.startTime) : 0,
                    regimentId: regimentManager.currentRegimentId,
                    preStress: sessionManager.currentSessionData.preStress,
                    postStress: null
                });
                sessionManager.currentSessionData = { startTime: null, preStress: null };
                uiMediator.updateInstructionText("Session complete.", true);
                setTimeout(() => uiMediator.toggleFadeOverlay(false), 2000);
                sessionManager.showControls();
            }
        });
    }

    if (uiMediator.sessionButton) {
        uiMediator.sessionButton.addEventListener('click', () => {
            const isPlaying = (breathingCircle && breathingCircle.style.animationPlayState === 'running') ||
                              (animationManager.prefersReducedMotion && uiMediator.sessionButton.textContent === 'End');
            if (isPlaying) {
                sessionManager.endSessionRoutine(false);
            } else {
                sessionManager.startSessionRoutine();
            }
        });
    }

    if (uiMediator.soundToggleButton) {
        uiMediator.soundToggleButton.addEventListener('click', () => {
            const currentSoundState = audioManager.getIsEnabled();
            audioManager.setEnabled(!currentSoundState);
            localStorage.setItem('soundEnabled', audioManager.getIsEnabled().toString());
            uiMediator.updateSoundButton(audioManager.getIsEnabled());
            if (audioManager.getIsEnabled() && !audioManager.audioInitialized) {
                audioManager.initialize();
                audioManager.audioInitialized = true;
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
        sessionManager.handleVisibilityChange();
    });

    initialize();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
});
