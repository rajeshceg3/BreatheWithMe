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
    const regimentSelect = document.getElementById('regiment-select');
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
    let pendingProfileStages = [];

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

        // Populate Regiment Dropdown with custom profiles
        updateRegimentDropdown();

        // Regiment Initialization
        const savedRegiment = localStorage.getItem('regimentId');
        if (savedRegiment && regimentManager.getRegiment(savedRegiment)) {
            regimentManager.setRegiment(savedRegiment);
            if (regimentSelect) regimentSelect.value = savedRegiment;
        }

        // Handle initial load if it's a sequence
        const currentReg = regimentManager.getCurrentRegiment();
        if (currentReg && currentReg.isSequence) {
             if (sessionDurationSelect) sessionDurationSelect.disabled = true;
             uiMediator.updateInstructionText(`${currentReg.name} ready.`);
        } else {
             updatePaceUIFromRegiment(currentReg || regimentManager.getRegiment('coherence'));
        }

        welcomeMessage();
    }

    function updateRegimentDropdown() {
        if (!regimentSelect) return;

        // Save current selection
        const currentVal = regimentSelect.value;

        // Clear existing options
        regimentSelect.innerHTML = '';

        // Add standard regiments and custom profiles
        const regiments = regimentManager.getRegiments();

        // Standard first
        regiments.filter(r => !r.isCustom).forEach(r => {
            const option = document.createElement('option');
            option.value = r.id;
            option.textContent = r.name;
            regimentSelect.appendChild(option);
        });

        // Separator
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '--- Mission Profiles ---';
        regimentSelect.appendChild(separator);

        // Custom Profiles
        regiments.filter(r => r.isCustom).forEach(r => {
            const option = document.createElement('option');
            option.value = r.id;
            option.textContent = r.name;
            regimentSelect.appendChild(option);
        });

        // Restore selection if it still exists
        if (regimentManager.getRegiment(currentVal)) {
            regimentSelect.value = currentVal;
        } else {
             regimentSelect.value = 'coherence';
             regimentManager.setRegiment('coherence');
        }
    }

    function welcomeMessage() {
        uiMediator.updateInstructionText('Welcome.');
        setTimeout(() => {
            if (uiMediator.instructionText) {
                uiMediator.instructionText.style.opacity = '0';
                setTimeout(() => {
                    const regiment = regimentManager.getCurrentRegiment();
                    uiMediator.updateInstructionText(`Tap Begin to start. (${regiment.name})`);
                    uiMediator.instructionText.style.opacity = '1';
                }, 1000);
            }
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
            uiMediator.updateAnalyticsUI(
                analyticsManager.getStats(),
                analyticsManager.getHistory(),
                analyticsManager.getTrendData()
            );
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

    // --- Mission Profile Editor Logic ---
    if (uiMediator.createProfileButton) {
        uiMediator.createProfileButton.addEventListener('click', () => {
            openProfileEditor();
        });
    }

    if (uiMediator.cancelProfileButton) {
        uiMediator.cancelProfileButton.addEventListener('click', () => {
            uiMediator.toggleProfileEditor(false);
        });
    }

    if (uiMediator.saveProfileButton) {
        uiMediator.saveProfileButton.addEventListener('click', () => {
            const name = uiMediator.profileNameInput.value.trim();
            if (!name) {
                alert('Please name your protocol.');
                return;
            }
            if (pendingProfileStages.length === 0) {
                alert('Please add at least one phase.');
                return;
            }

            const newId = regimentManager.createProfile(name, pendingProfileStages);
            updateRegimentDropdown();
            regimentSelect.value = newId;
            applyRegiment(newId);

            uiMediator.toggleProfileEditor(false);
            uiMediator.toggleSettingsPanel(false); // Close settings to show it active
            uiMediator.updateInstructionText(`${name} engaged.`);
        });
    }

    if (uiMediator.addStageButton) {
        uiMediator.addStageButton.addEventListener('click', () => {
            const regId = uiMediator.stageRegimentSelect.value;
            const duration = parseInt(uiMediator.stageDurationInput.value, 10);

            if (!regId || isNaN(duration) || duration <= 0) return;

            const regiment = regimentManager.getRegiment(regId);
            pendingProfileStages.push({
                id: regId,
                durationMinutes: duration,
                name: regiment.name // Store for display
            });
            renderProfileStages();
        });
    }

    function openProfileEditor() {
        pendingProfileStages = [];
        uiMediator.profileNameInput.value = '';
        uiMediator.stageDurationInput.value = 2;
        renderProfileStages();

        // Populate stage selector with non-sequence regiments
        uiMediator.stageRegimentSelect.innerHTML = '';
        regimentManager.getRegiments()
            .filter(r => !r.isSequence && r.id !== 'custom') // Exclude sequences and custom ephemeral
            .forEach(r => {
                const option = document.createElement('option');
                option.value = r.id;
                option.textContent = r.name;
                uiMediator.stageRegimentSelect.appendChild(option);
            });

        uiMediator.toggleProfileEditor(true);
    }

    function renderProfileStages() {
        uiMediator.profileStagesList.innerHTML = '';
        pendingProfileStages.forEach((stage, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${stage.name} (${stage.durationMinutes}m)</span>
                <button class="icon-button small delete-stage" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            `;
            uiMediator.profileStagesList.appendChild(li);
        });

        // Add delete listeners
        const deleteButtons = uiMediator.profileStagesList.querySelectorAll('.delete-stage');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                pendingProfileStages.splice(idx, 1);
                renderProfileStages();
            });
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

        localStorage.setItem('regimentId', regimentId);

        if (regiment.isSequence) {
             if (sessionDurationSelect) sessionDurationSelect.disabled = true;
             uiMediator.updateInstructionText(`${regiment.name} engaged.`);
        } else {
             if (sessionDurationSelect) sessionDurationSelect.disabled = false;
             if (regiment.audio) {
                 audioManager.setFrequencies(regiment.audio.baseFreq, regiment.audio.binauralBeat);
             }
             updatePaceUIFromRegiment(regiment);
        }

        const isPlaying = breathingCircle && breathingCircle.style.animationPlayState === 'running';
        if (isPlaying) {
            sessionManager.endSessionRoutine(false);
            sessionManager.startSessionRoutine();
        } else if (!regiment.isSequence) {
             uiMediator.updateInstructionText(`${regiment.name} selected.`);
        }
    }

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
