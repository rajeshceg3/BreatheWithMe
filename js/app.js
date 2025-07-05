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

    // Managers
    const audioManager = new AudioManager();
    const themeManager = new ThemeManager();

    // App State
    let soundSyncTimeoutId = null;
    let audioInitialized = false;

    const BREATHING_PACES = {
        slow: { inhale: 6, hold1: 1, exhale: 8, hold2: 1, label: 'Slow' },
        normal: { inhale: 4, hold1: 1, exhale: 6, hold2: 1, label: 'Normal' },
        fast: { inhale: 3, hold1: 1, exhale: 4, hold2: 1, label: 'Fast' }
    };
    let currentPace = 'normal'; // Default, will be updated from localStorage

    // --- Initialization ---
    themeManager.initialize('light');
    let initialSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    audioManager.setEnabled(initialSoundEnabled);

    loadPacePreference();
    updateSoundButtonText();
    updateThemeButtonText();

    // --- UI Update Functions ---
    function updateSoundButtonText() {
        if (soundToggleButton) {
            soundToggleButton.textContent = audioManager.getIsEnabled() ? 'Sound: On' : 'Sound: Off';
        }
    }

    function updateThemeButtonText() {
        if (themeToggleButton) {
            const themeName = themeManager.getTheme();
            themeToggleButton.textContent = `Theme: ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`;
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

    // --- Settings Panel Logic ---
    if (settingsToggleButton) {
        settingsToggleButton.addEventListener('click', () => {
            if (settingsPanel) settingsPanel.classList.add('visible');
        });
    }
    if (closeSettingsButton) {
        closeSettingsButton.addEventListener('click', () => {
            if (settingsPanel) settingsPanel.classList.remove('visible');
        });
    }

    // --- Breathing Pace Logic ---
    function applyPaceToAnimationAndAudio(paceName) {
        if (!BREATHING_PACES[paceName]) return;
        const paceSettings = BREATHING_PACES[paceName];
        currentPace = paceName; // Update currentPace global

        // Update CSS variables for animation keyframe percentages
        document.documentElement.style.setProperty('--inhale-duration', paceSettings.inhale + 's');
        document.documentElement.style.setProperty('--hold1-duration', paceSettings.hold1 + 's');
        document.documentElement.style.setProperty('--exhale-duration', paceSettings.exhale + 's');
        document.documentElement.style.setProperty('--hold2-duration', paceSettings.hold2 + 's');

        // The animation-duration on breathingCircle will automatically update due to var(--total-animation-duration)
        // No need to set breathingCircle.style.animationDuration if it uses the CSS var.
        // Check style.css: #breathing-circle { animation-duration: var(--total-animation-duration); }
        // This was set correctly in the CSS.

        // If animation is active, restart it to pick up new timings and also restart sound cycle
        if (breathingCircle && breathingCircle.style.animationPlayState === 'running') {
            breathingCircle.style.animationName = 'none'; // Remove animation to reset
            requestAnimationFrame(() => { // Wait for 'none' to apply
                requestAnimationFrame(() => { // Wait again before re-applying
                    breathingCircle.style.animationName = 'breathe'; // Re-apply animation
                    breathingCircle.style.animationPlayState = 'running'; // Ensure it continues playing
                    startSoundCycle('inhale'); // Restart sound cycle with new timings
                });
            });
        } else {
            // If paused or not started, update instruction text for the first phase based on new pace
            if (instructionText) {
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
        if (currentPaceRadio) {
            currentPaceRadio.checked = true;
        }
        applyPaceToAnimationAndAudio(currentPace); // Apply the loaded or default pace
    }

    paceRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const newPace = event.target.value;
            localStorage.setItem('breathingPace', newPace);
            applyPaceToAnimationAndAudio(newPace);
            // Close settings panel after selection (optional UX improvement)
            // if (settingsPanel) settingsPanel.classList.remove('visible');
        });
    });

    // --- Sound Cycle and Animation Control ---
    function startSoundCycle(phase = 'inhale') {
        if (!breathingCircle || breathingCircle.style.animationPlayState !== 'running') {
            clearTimeout(soundSyncTimeoutId); // Clear any pending sound timeouts
            return;
        }

        clearTimeout(soundSyncTimeoutId);
        const paceSettings = BREATHING_PACES[currentPace];

        if (!audioManager.getIsEnabled()) {
            if (phase === 'inhale') {
                instructionText.textContent = `Breathe In (${paceSettings.inhale}s)...`;
                soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold1'), paceSettings.inhale * 1000);
            } else if (phase === 'hold1') {
                instructionText.textContent = `Hold (${paceSettings.hold1}s)...`;
                soundSyncTimeoutId = setTimeout(() => startSoundCycle('exhale'), paceSettings.hold1 * 1000);
            } else if (phase === 'exhale') {
                instructionText.textContent = `Breathe Out (${paceSettings.exhale}s)...`;
                soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold2'), paceSettings.exhale * 1000);
            } else if (phase === 'hold2') {
                instructionText.textContent = `Hold (${paceSettings.hold2}s)...`;
                soundSyncTimeoutId = setTimeout(() => startSoundCycle('inhale'), paceSettings.hold2 * 1000);
            }
            return;
        }

        // Sound is enabled
        if (phase === 'inhale') {
            audioManager.playInhaleSound(paceSettings.inhale);
            instructionText.textContent = `Breathe In (${paceSettings.inhale}s)...`;
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold1'), paceSettings.inhale * 1000);
        } else if (phase === 'hold1') {
            audioManager.stopSound();
            instructionText.textContent = `Hold (${paceSettings.hold1}s)...`;
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('exhale'), paceSettings.hold1 * 1000);
        } else if (phase === 'exhale') {
            audioManager.playExhaleSound(paceSettings.exhale);
            instructionText.textContent = `Breathe Out (${paceSettings.exhale}s)...`;
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('hold2'), paceSettings.exhale * 1000);
        } else if (phase === 'hold2') {
            audioManager.stopSound();
            instructionText.textContent = `Hold (${paceSettings.hold2}s)...`;
            soundSyncTimeoutId = setTimeout(() => startSoundCycle('inhale'), paceSettings.hold2 * 1000);
        }
    }

    // --- Event Listeners for Controls ---
    if (playButton) {
        playButton.addEventListener('click', () => {
            ensureAudioInitialized();
            if (breathingCircle) breathingCircle.style.animationPlayState = 'running';
            if (playButton) playButton.classList.add('hidden');
            if (pauseButton) pauseButton.classList.remove('hidden');
            startSoundCycle('inhale');
        });
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            if (breathingCircle) breathingCircle.style.animationPlayState = 'paused';
            if (pauseButton) pauseButton.classList.add('hidden');
            if (playButton) playButton.classList.remove('hidden');
            if (instructionText) { // Update text based on current pace's inhale for when resuming
                const currentPaceSettings = BREATHING_PACES[currentPace];
                instructionText.textContent = `Paused. Resume with Breathe In (${currentPaceSettings.inhale}s)...`;
            }
            clearTimeout(soundSyncTimeoutId);
            if (audioManager) audioManager.stopSound();
        });
    }

    if (soundToggleButton) {
        soundToggleButton.addEventListener('click', () => {
            let currentSoundState = audioManager.getIsEnabled();
            audioManager.setEnabled(!currentSoundState);
            localStorage.setItem('soundEnabled', audioManager.getIsEnabled().toString());
            updateSoundButtonText();

            if (audioManager.getIsEnabled() && !audioInitialized) {
                 audioManager.initialize();
                 audioInitialized = true;
            }
            // If animation is running and sound is toggled on, restart current phase sound
            if (breathingCircle.style.animationPlayState === 'running' && audioManager.getIsEnabled()) {
                // This is tricky; for now, let the cycle handle it or call startSoundCycle with current phase
                // To avoid complexity, current implementation will pick up sound at next phase.
                // Or, force a restart of the current sound phase (needs phase tracking)
            }
        });
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            themeManager.toggleTheme();
            updateThemeButtonText();
        });
    }

    // Optional: Resync on animation iteration if needed, though setTimeout chain should manage.
    if (breathingCircle) {
        breathingCircle.addEventListener('animationiteration', () => {
            console.log("Animation iteration. Current pace: " + currentPace);
            // This can be a fallback if the setTimeout chain drifts.
            // For now, relying on the setTimeout chain initiated by startSoundCycle.
            // If animation is running, the sound cycle should already be looping.
            // If it was paused and an iteration completes (e.g. due to external change), this might be useful.
            if (breathingCircle.style.animationPlayState === 'running') {
                 // startSoundCycle('inhale'); // Potentially call to resync, but could cause double triggers.
            }
        });
    }

    // Initial instruction text based on loaded pace
    if (instructionText) {
        const initialPaceSettings = BREATHING_PACES[currentPace];
        instructionText.textContent = `Tap Play to Begin. (Pace: ${initialPaceSettings.inhale}s In, ${initialPaceSettings.exhale}s Out)`;
    }

});
