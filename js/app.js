// Main application JavaScript file
console.log("App started");

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const breathingCircle = document.getElementById('breathing-circle');
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const instructionText = document.getElementById('instruction-text');
    const soundToggleButton = document.getElementById('sound-toggle-button');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsToggleButton = document.getElementById('settings-toggle-button');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const paceRadios = document.querySelectorAll('input[name="breathing-pace"]');
    const sessionDurationSelect = document.getElementById('session-duration'); // New session duration select
    const fadeOverlay = document.getElementById('fade-overlay'); // New overlay element
    const topBar = document.getElementById('top-bar');
    const bottomBar = document.getElementById('bottom-bar');


    // Managers
    const audioManager = new AudioManager();
    const themeManager = new ThemeManager();

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

    const SESSION_DURATIONS = { // Values in milliseconds
        '3': 3 * 60 * 1000,
        '5': 5 * 60 * 1000,
        '10': 10 * 60 * 1000,
        '15': 15 * 60 * 1000
    };
    let currentSessionDuration = SESSION_DURATIONS['5']; // Default to 5 minutes


    const BREATHING_PACES = {
        slow: { inhale: 6, hold1: 1, exhale: 8, hold2: 1, label: 'Slow' },
        normal: { inhale: 4, hold1: 1, exhale: 6, hold2: 1, label: 'Normal' },
        fast: { inhale: 3, hold1: 1, exhale: 4, hold2: 1, label: 'Fast' }
    };
    let currentPace = 'normal';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Initialization ---
    themeManager.initialize('light');
    let initialSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    audioManager.setEnabled(initialSoundEnabled);

    sessionCount = parseInt(localStorage.getItem('sessionCount')) || 0; // Load session count

    loadPacePreference();
    loadDurationPreference(); // Load duration preference
    updateSoundButtonText();
    updateThemeButtonText();

    if (instructionText && BREATHING_PACES[currentPace]) {
        const initialPaceSettings = BREATHING_PACES[currentPace];
        instructionText.textContent = `Tap Play to Begin. (Pace: ${initialPaceSettings.inhale}s In, ${initialPaceSettings.exhale}s Out)`;
    }

    // --- UI Update Functions ---
    function updateSoundButtonText() {
        if (soundToggleButton) {
            const isEnabled = audioManager.getIsEnabled();
            soundToggleButton.textContent = isEnabled ? 'Sound: On' : 'Sound: Off';
            soundToggleButton.setAttribute('aria-pressed', isEnabled.toString());
        }
    }

    function updateThemeButtonText() {
        if (themeToggleButton) {
            const themeName = themeManager.getTheme();
            themeToggleButton.textContent = `Theme: ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`;
        }
    }

    function updatePlayPauseButtonsState(isPlaying) {
        if (playButton && pauseButton) {
            if (isPlaying) {
                playButton.classList.add('hidden');
                pauseButton.classList.remove('hidden');
            } else {
                playButton.classList.remove('hidden');
                pauseButton.classList.add('hidden');
            }
        }
    }

    function ensureAudioInitialized() {
        if (!audioInitialized && audioManager) {
            if (audioManager.getIsEnabled()) {
                audioManager.initialize();
            }
            audioInitialized = true;
        }
    }

    // --- Focus Trap Function for Settings Panel ---
    function trapFocus(event) {
        if (!settingsPanel || !settingsPanel.classList.contains('visible')) return;

        if (event.key === 'Escape') {
            if (closeSettingsButton) closeSettingsButton.click();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusableElements = Array.from(settingsPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
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
    if (settingsToggleButton && settingsPanel && closeSettingsButton) {
        settingsToggleButton.addEventListener('click', () => {
            previouslyFocusedElement = document.activeElement;
            settingsPanel.classList.add('visible');
            settingsToggleButton.setAttribute('aria-expanded', 'true');
            // Show controls when settings panel is open
            if(topBar) topBar.classList.remove('controls-hidden');
            if(bottomBar) bottomBar.classList.remove('controls-hidden');
            clearTimeout(controlsFadeTimeoutId);

            const focusableElements = Array.from(settingsPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
            if (focusableElements.length) {
                let focused = false;
                const checkedRadio = settingsPanel.querySelector('input[name="breathing-pace"]:checked');
                if (checkedRadio) { checkedRadio.focus(); focused = true; }
                else if (focusableElements.length > 1) { focusableElements[0].focus(); focused = true; }
                if(!focused && focusableElements.length > 0){ focusableElements[0].focus(); }
            }
            document.addEventListener('keydown', trapFocus);
        });

        closeSettingsButton.addEventListener('click', () => {
            settingsPanel.classList.remove('visible');
            settingsToggleButton.setAttribute('aria-expanded', 'false');
            document.removeEventListener('keydown', trapFocus);
            if (previouslyFocusedElement) previouslyFocusedElement.focus();
            // Re-hide controls if animation is running
            if (breathingCircle && breathingCircle.style.animationPlayState === 'running') {
                hideControlsAfterDelay();
            }
        });
    }

    // --- Breathing Pace Logic ---
    function applyPaceToAnimationAndAudio(paceName) {
        if (!BREATHING_PACES[paceName]) return;
        const paceSettings = BREATHING_PACES[paceName];
        currentPace = paceName;

        document.documentElement.style.setProperty('--inhale-duration', paceSettings.inhale + 's');
        document.documentElement.style.setProperty('--hold1-duration', paceSettings.hold1 + 's');
        document.documentElement.style.setProperty('--exhale-duration', paceSettings.exhale + 's');
        document.documentElement.style.setProperty('--hold2-duration', paceSettings.hold2 + 's');

        const isPlaying = breathingCircle && breathingCircle.style.animationPlayState === 'running';
        if (isPlaying && !prefersReducedMotion) {
            breathingCircle.style.animationName = 'none';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    breathingCircle.style.animationName = 'breathe';
                    breathingCircle.style.animationPlayState = 'running';
                    startSoundCycle('inhale');
                });
            });
        } else if (isPlaying && prefersReducedMotion) {
             startSoundCycle('inhale');
        } else {
            if (instructionText && (!playButton || !playButton.classList.contains('hidden'))) {
                 instructionText.textContent = `Breathe In (${paceSettings.inhale}s)...`;
            } else if (instructionText && playButton && playButton.classList.contains('hidden') && breathingCircle && breathingCircle.style.animationPlayState !== 'running') {
                 instructionText.textContent = `Breathe In (${paceSettings.inhale}s)...`;
            }
        }
    }

    function loadPacePreference() {
        const savedPace = localStorage.getItem('breathingPace');
        if (savedPace && BREATHING_PACES[savedPace]) {
            currentPace = savedPace;
        }
        const currentPaceRadio = document.querySelector(`input[name="breathing-pace"][value="${currentPace}"]`);
        if (currentPaceRadio) currentPaceRadio.checked = true;
        applyPaceToAnimationAndAudio(currentPace);
    }

    if (paceRadios.length) {
        paceRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                const newPace = event.target.value;
                localStorage.setItem('breathingPace', newPace);
                applyPaceToAnimationAndAudio(newPace);
            });
        });
    }

    // --- Session Duration Logic ---
    function loadDurationPreference() {
        const savedDurationKey = localStorage.getItem('sessionDuration');
        if (savedDurationKey && SESSION_DURATIONS[savedDurationKey]) {
            currentSessionDuration = SESSION_DURATIONS[savedDurationKey];
            if (sessionDurationSelect) {
                sessionDurationSelect.value = savedDurationKey;
            }
        } else {
            // Default is already set, ensure select matches if it exists
            if (sessionDurationSelect) {
                sessionDurationSelect.value = Object.keys(SESSION_DURATIONS).find(key => SESSION_DURATIONS[key] === currentSessionDuration) || '5';
            }
        }
    }

    if (sessionDurationSelect) {
        sessionDurationSelect.addEventListener('change', (event) => {
            const selectedDurationKey = event.target.value;
            if (SESSION_DURATIONS[selectedDurationKey]) {
                currentSessionDuration = SESSION_DURATIONS[selectedDurationKey];
                localStorage.setItem('sessionDuration', selectedDurationKey);
                // Optional: Update instruction text or provide feedback
                // console.log(`Session duration set to ${selectedDurationKey} minutes.`);
            }
        });
    }

    // --- Sound Cycle and Animation Control ---
    function startSoundCycle(phase = 'inhale') {
        currentPhaseForResume = phase;

        let isEffectivelyPlaying;
        if (prefersReducedMotion) {
            // If prefersReducedMotion is true, "playing" means the playButton is hidden (so pauseButton is visible).
            isEffectivelyPlaying = playButton && playButton.classList.contains('hidden');
        } else {
            // Otherwise, "playing" means the animation is running.
            isEffectivelyPlaying = breathingCircle && breathingCircle.style.animationPlayState === 'running';
        }

        if (!isEffectivelyPlaying) {
            clearTimeout(soundSyncTimeoutId); return;
        }

        clearTimeout(soundSyncTimeoutId);
        const paceSettings = BREATHING_PACES[currentPace];

        if (phase === 'inhale') {
            instructionText.textContent = `Breathe In (${paceSettings.inhale}s)...`;
            if (audioManager.getIsEnabled()) {
                audioManager.playInhaleSound(paceSettings.inhale);
            }
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold1'), paceSettings.inhale * 1000);
        } else if (phase === 'hold1') {
            instructionText.textContent = `Hold (${paceSettings.hold1}s)...`;
            if (audioManager.getIsEnabled()) {
                audioManager.stopSound();
            }
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('exhale'), paceSettings.hold1 * 1000);
        } else if (phase === 'exhale') {
            instructionText.textContent = `Breathe Out (${paceSettings.exhale}s)...`;
            if (audioManager.getIsEnabled()) {
                audioManager.playExhaleSound(paceSettings.exhale);
            }
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold2'), paceSettings.exhale * 1000);
        } else if (phase === 'hold2') {
            instructionText.textContent = `Hold (${paceSettings.hold2}s)...`;
            if (audioManager.getIsEnabled()) {
                audioManager.stopSound();
            }
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('inhale'), paceSettings.hold2 * 1000);
        }
    }

    // --- Controls Fade Logic ---
    function hideControlsAfterDelay() {
        clearTimeout(controlsFadeTimeoutId);
        controlsFadeTimeoutId = setTimeout(() => {
            if(topBar) topBar.classList.add('controls-hidden');
            if(bottomBar) bottomBar.classList.add('controls-hidden');
        }, 3000); // 3 seconds delay
    }

    function showControls() {
        if(topBar) topBar.classList.remove('controls-hidden');
        if(bottomBar) bottomBar.classList.remove('controls-hidden');
        clearTimeout(controlsFadeTimeoutId);
    }

    document.body.addEventListener('mousemove', () => {
        if (breathingCircle && breathingCircle.style.animationPlayState === 'running' ||
           (prefersReducedMotion && playButton && playButton.classList.contains('hidden'))) { // Active session
            showControls();
            hideControlsAfterDelay();
        }
    });


    // --- Event Listeners for Controls ---
    if (playButton) {
        playButton.addEventListener('click', () => {
            ensureAudioInitialized();
            localStorage.setItem('lastUsed', new Date().toISOString());
            if (!sessionIncrementedThisPageLoad) {
                sessionCount++;
                localStorage.setItem('sessionCount', sessionCount.toString());
                sessionIncrementedThisPageLoad = true;
            }

            if (prefersReducedMotion) {
                if (instructionText) instructionText.textContent = "Breathing guidance started (animations reduced).";
            }
            if (breathingCircle && !prefersReducedMotion) {
                 breathingCircle.style.animationPlayState = 'running';
            }
            updatePlayPauseButtonsState(true);
            startSoundCycle('inhale');

            // Session end timer
            clearTimeout(sessionEndTimerId);
            if (fadeOverlay) fadeOverlay.classList.remove('visible'); // Ensure overlay is hidden at start
            sessionEndTimerId = setTimeout(() => {
                if (fadeOverlay) fadeOverlay.classList.add('visible');
                setTimeout(() => {
                    if (breathingCircle && (breathingCircle.style.animationPlayState === 'running' || (prefersReducedMotion && playButton && playButton.classList.contains('hidden')))) {
                        if(pauseButton) pauseButton.click();
                    }
                    if (instructionText) instructionText.textContent = "Session complete. Well done!";
                    if (fadeOverlay) { // Keep overlay for a bit longer or until next action
                        setTimeout(() => fadeOverlay.classList.remove('visible'), 3000); // Auto-remove after 3s
                    }
                    sessionIncrementedThisPageLoad = false; // Reset flag for next session
                    showControls(); // Ensure controls are visible at session end
                }, 1500);
            }, currentSessionDuration); // Use variable session duration

            hideControlsAfterDelay(); // Start controls fade-out timer
        });
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            if (breathingCircle && !prefersReducedMotion) {
                breathingCircle.style.animationPlayState = 'paused';
            }
            updatePlayPauseButtonsState(false);
            const currentPaceSettings = BREATHING_PACES[currentPace];
            if (instructionText) instructionText.textContent = `Paused. Resume with Breathe In (${currentPaceSettings.inhale}s)...`;
            clearTimeout(soundSyncTimeoutId);
            if (audioManager) audioManager.stopSound();
            clearTimeout(sessionEndTimerId); // Stop session end timer
            if (fadeOverlay) fadeOverlay.classList.remove('visible'); // Remove overlay if active
            sessionIncrementedThisPageLoad = false; // Reset flag for next session
            showControls(); // Ensure controls are visible when paused
        });
    }

    if (soundToggleButton) {
        soundToggleButton.addEventListener('click', () => {
            let currentSoundState = audioManager.getIsEnabled();
            audioManager.setEnabled(!currentSoundState);
            localStorage.setItem('soundEnabled', audioManager.getIsEnabled().toString());
            updateSoundButtonText();
            if (audioManager.getIsEnabled() && !audioInitialized) {
                 audioManager.initialize(); audioInitialized = true;
            }
        });
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            themeManager.toggleTheme(); updateThemeButtonText();
        });
    }

    // --- Tab Visibility Handling ---
    document.addEventListener('visibilitychange', () => {
        if (!breathingCircle) return;
        let isEffectivelyPlaying;
        if (prefersReducedMotion) {
            // If prefersReducedMotion is true, "playing" means the playButton is hidden (so pauseButton is visible).
            isEffectivelyPlaying = playButton && playButton.classList.contains('hidden');
        } else {
            // Otherwise, "playing" means the animation is running.
            isEffectivelyPlaying = breathingCircle && breathingCircle.style.animationPlayState === 'running';
        }

        if (document.hidden) {
            if (isEffectivelyPlaying) {
                animationWasActiveBeforeBlur = true;
                if (!prefersReducedMotion) breathingCircle.style.animationPlayState = 'paused';
                clearTimeout(soundSyncTimeoutId); audioManager.stopSound();
                updatePlayPauseButtonsState(false);
                if (instructionText) instructionText.textContent = 'Paused (Tab Hidden)';
                clearTimeout(sessionEndTimerId); // Pause session timer
                showControls(); // Show controls when tab is hidden and was playing
            } else {
                animationWasActiveBeforeBlur = false;
            }
        } else { // Tab is visible
            if (animationWasActiveBeforeBlur) {
                if (!prefersReducedMotion) breathingCircle.style.animationPlayState = 'running';
                updatePlayPauseButtonsState(true);
                startSoundCycle(currentPhaseForResume);
                animationWasActiveBeforeBlur = false;
                // Resume session end timer - this is complex, for now, it effectively restarts the 5min timer if user manually plays again
                // Or, if play was auto-resumed, restart the sessionEndTimer from scratch or remaining time
                // For simplicity, let play button click restart the 5-min timer.
                // If auto-resuming here, we might not want to restart the main 5-min timer unless play is explicitly clicked.
                // Let's assume the 5-min timer is only set on explicit play clicks.
                // If it was running, it was cleared. If it wasn't, this visibility change won't start it.
                 hideControlsAfterDelay(); // Re-hide controls after delay
            }
        }
    });

    if (breathingCircle) {
        breathingCircle.addEventListener('animationiteration', () => {
            // This is mostly for visual sync debugging if needed.
            // The sound cycle is driven by its own setTimeout chain.
        });
    }
});
