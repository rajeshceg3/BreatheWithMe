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
            const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.8 1.41 1.41 1.8-1.79zm-1.8 15.1l1.41 1.41 1.79-1.8-1.41-1.41-1.8 1.79zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.8-1.79-1.42-1.41-1.79 1.8z"/></svg>`;
            const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 11.807A9.002 9.002 0 0 1 10.049 2a9.942 9.942 0 0 0-8.3 9.951A10 10 0 0 0 12 22a9.94 9.94 0 0 0 9.951-8.3A9.002 9.002 0 0 1 12 11.807z"/></svg>`;

            if (themeName === 'dark') {
                this.themeToggleButton.innerHTML = sunIcon;
                this.themeToggleButton.setAttribute('aria-label', 'Switch to light theme');
            } else {
                this.themeToggleButton.innerHTML = moonIcon;
                this.themeToggleButton.setAttribute('aria-label', 'Switch to dark theme');
            }
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
