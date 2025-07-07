class UIMediator {
    constructor() {
        this.sessionButton = document.getElementById('session-button');
        this.instructionText = document.getElementById('instruction-text');
        this.soundToggleButton = document.getElementById('sound-toggle-button');
        this.themeToggleButton = document.getElementById('theme-toggle-button');
        this.settingsPanel = document.getElementById('settings-panel');
        this.settingsToggleButton = document.getElementById('settings-toggle-button');
        this.closeSettingsButton = document.getElementById('close-settings-button');
        this.fadeOverlay = document.getElementById('fade-overlay');
        this.topBar = document.getElementById('top-bar');
        this.bottomBar = document.getElementById('bottom-bar');
    }

    updateSessionButton(isPlaying) {
        if (this.sessionButton) {
            this.sessionButton.textContent = isPlaying ? 'End' : 'Begin';
            this.sessionButton.setAttribute('aria-label', isPlaying ? 'End breathing session' : 'Begin breathing session');
        }
    }

    updateInstructionText(text) {
        if (this.instructionText) {
            this.instructionText.textContent = text;
        }
    }

    updateSoundButton(isEnabled) {
        if (this.soundToggleButton) {
            this.soundToggleButton.textContent = isEnabled ? 'Sound: On' : 'Sound: Off';
            this.soundToggleButton.setAttribute('aria-pressed', isEnabled.toString());
        }
    }

    updateThemeButton(themeName) {
        if (this.themeToggleButton) {
            this.themeToggleButton.textContent = `Theme: ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`;
        }
    }

    toggleSettingsPanel(visible) {
        if (this.settingsPanel) {
            this.settingsPanel.classList.toggle('visible', visible);
            this.settingsToggleButton.setAttribute('aria-expanded', visible.toString());
        }
    }

    toggleFadeOverlay(visible) {
        if (this.fadeOverlay) {
            this.fadeOverlay.classList.toggle('visible', visible);
        }
    }

    toggleControls(visible) {
        if (this.topBar && this.bottomBar) {
            this.topBar.classList.toggle('controls-hidden', !visible);
            this.bottomBar.classList.toggle('controls-hidden', !visible);
        }
    }
}
