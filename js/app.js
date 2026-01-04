import AudioManager from './AudioManager.js';
import ThemeManager from './ThemeManager.js';
import ParticleManager from './ParticleManager.js';
import UIMediator from './UIMediator.js';
import AnimationManager from './AnimationManager.js';
import RegimentManager from './RegimentManager.js';
import AnalyticsManager from './AnalyticsManager.js';
import SessionManager from './SessionManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const breathingCircle = document.getElementById('breathing-circle');
    const customPaceInputs = document.getElementById('custom-pace-inputs');
    const customInhale = document.getElementById('custom-inhale');
    const customExhale = document.getElementById('custom-exhale');
    const customHold = document.getElementById('custom-hold');
    const sessionDurationSelect = document.getElementById('session-duration');

    // Managers
    const audioManager = new AudioManager();
    const themeManager = new ThemeManager();
    const particleManager = new ParticleManager('particle-canvas');
    const uiMediator = new UIMediator();
    const animationManager = new AnimationManager(breathingCircle);
    const regimentManager = new RegimentManager();
    const analyticsManager = new AnalyticsManager();

    // Initialize SessionManager with dependencies
    const sessionManager = new SessionManager({
        audioManager,
        animationManager,
        regimentManager,
        particleManager,
        uiMediator,
        analyticsManager
    });

    // App State
    let previouslyFocusedElement = null;

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

        // Regiment Initialization
        const savedRegiment = localStorage.getItem('regimentId');
        if (savedRegiment) {
            regimentManager.setRegiment(savedRegiment);
            const regimentSelect = document.getElementById('regiment-select');
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

    // --- Focus Trap Function for Settings Panel ---
    function trapFocus(event) {
        if (!uiMediator.settingsPanel || !uiMediator.settingsPanel.classList.contains('visible')) return;

        if (event.key === 'Escape') {
            if (uiMediator.closeSettingsButton) uiMediator.closeSettingsButton.click();
            if (uiMediator.closeSettingsButtons) {
                uiMediator.closeSettingsButtons.forEach(btn => btn.click());
            }
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
    if (uiMediator.settingsToggleButton && uiMediator.settingsPanel) {
        uiMediator.settingsToggleButton.addEventListener('click', () => {
            previouslyFocusedElement = document.activeElement;
            uiMediator.toggleSettingsPanel(true);
            sessionManager.hideControlsAfterDelay();
        });

        const closeSettingsHandler = () => {
            uiMediator.toggleSettingsPanel(false);
            if (previouslyFocusedElement) previouslyFocusedElement.focus();
            if (breathingCircle && breathingCircle.style.animationPlayState === 'running') {
                sessionManager.hideControlsAfterDelay();
            }
        };

        if (uiMediator.closeSettingsButton) {
            uiMediator.closeSettingsButton.addEventListener('click', closeSettingsHandler);
        }
        if (uiMediator.closeSettingsButtons) {
            uiMediator.closeSettingsButtons.forEach(btn => btn.addEventListener('click', closeSettingsHandler));
        }
    }

    // --- Analytics Panel Logic ---
    if (uiMediator.analyticsToggleButton && uiMediator.analyticsPanel && uiMediator.closeAnalyticsButton) {
        uiMediator.analyticsToggleButton.addEventListener('click', () => {
            uiMediator.updateAnalyticsUI(analyticsManager.getStats(), analyticsManager.getHistory());
            uiMediator.toggleAnalyticsPanel(true);
            sessionManager.hideControlsAfterDelay();
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
        // Update Animation Pace in Manager
        animationManager.setAnimationPace(regiment.pattern);

        if (regiment.id === 'custom') {
            if (customPaceInputs) customPaceInputs.classList.remove('hidden');
            if (customInhale) customInhale.value = regiment.pattern.inhale;
            if (customExhale) customExhale.value = regiment.pattern.exhale;
            if (customHold) customHold.value = regiment.pattern.hold1;
        } else {
            if (customPaceInputs) customPaceInputs.classList.add('hidden');
        }
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
            // Restart sequence/cycle with new regiment if playing
            animationManager.reset();
            sessionManager.startSoundCycle('inhale');
        } else {
             uiMediator.updateInstructionText(`${regiment.name} selected.`);
        }
    }

    const regimentSelect = document.getElementById('regiment-select');
    if (regimentSelect) {
        regimentSelect.addEventListener('change', (e) => {
            applyRegiment(e.target.value);
        });
    }

    // Support for Custom Pace Inputs
    if (customInhale && customExhale && customHold) {
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
    }

    // --- Session Duration Logic ---
    if (sessionDurationSelect) {
        sessionDurationSelect.addEventListener('change', (event) => {
            sessionManager.setDuration(event.target.value);
        });
    }

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
                // Skipped pre-check
                sessionManager.currentSessionData.preStress = null;
                sessionManager.actuallyStartSession();
            } else {
                // Skipped post-check
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
                sessionManager.endSessionRoutine(false); // Manual pause/stop
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
});
