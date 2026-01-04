import Visualizer from './Visualizer.js';

export default class UIMediator {
    constructor() {
        this.sessionButton = document.getElementById('session-button');
        this.instructionText = document.getElementById('instruction-text');
        this.soundToggleButton = document.getElementById('sound-toggle-button');
        this.themeToggleButton = document.getElementById('theme-toggle-button');
        this.settingsPanel = document.getElementById('settings-panel');
        this.settingsToggleButton = document.getElementById('settings-toggle-button');
        this.closeSettingsButton = document.getElementById('close-settings-button');

        // Handle potential multiple close buttons in new design
        this.closeSettingsButtons = document.querySelectorAll('.close-settings-trigger, #close-settings-button');

        // New UI Elements
        this.analyticsToggleButton = document.getElementById('analytics-toggle-button');
        this.analyticsPanel = document.getElementById('analytics-panel');
        this.closeAnalyticsButton = document.getElementById('close-analytics-button');

        this.stressModal = document.getElementById('stress-modal');
        this.stressSlider = document.getElementById('stress-slider');
        this.stressValueDisplay = document.getElementById('stress-value');
        this.submitStressButton = document.getElementById('submit-stress-button');
        this.skipStressButton = document.getElementById('skip-stress-button');

        this.statTotalSessions = document.getElementById('stat-total-sessions');
        this.statTotalMinutes = document.getElementById('stat-total-minutes');
        this.statStressDelta = document.getElementById('stat-stress-delta');
        this.historyList = document.getElementById('history-list');
        this.trendChartContainer = document.getElementById('trend-chart-container');

        this.fadeOverlay = document.getElementById('fade-overlay');
        this.topBar = document.getElementById('top-bar');
        this.bottomBar = document.getElementById('bottom-bar');

        // Initialize Stress Slider Listener
        if (this.stressSlider && this.stressValueDisplay) {
            this.stressSlider.addEventListener('input', (e) => {
                this.stressValueDisplay.textContent = e.target.value;
            });
        }
    }

    updateSessionButton(isPlaying) {
        if (this.sessionButton) {
            this.sessionButton.textContent = isPlaying ? 'End' : 'Begin';
            this.sessionButton.setAttribute('aria-label', isPlaying ? 'End breathing session' : 'Begin breathing session');
        }
    }

    updateInstructionText(text, isSessionCompletion = false) {
        if (!this.instructionText) return;

        this.instructionText.classList.add('text-fade-out');

        setTimeout(() => {
            this.instructionText.textContent = text;
            this.instructionText.classList.remove('text-fade-out'); // Fade in
            if (isSessionCompletion) {
                this.instructionText.classList.add('session-complete-effect');
                this.instructionText.addEventListener('animationend', () => {
                    this.instructionText.classList.remove('session-complete-effect');
                }, { once: true });
            }
        }, 400); // Match CSS transition duration
    }

    updateSoundButton(isEnabled) {
        if (this.soundToggleButton) {
            this.soundToggleButton.innerHTML = isEnabled
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
            this.soundToggleButton.setAttribute('aria-pressed', isEnabled.toString());
            this.soundToggleButton.setAttribute('aria-label', isEnabled ? 'Mute sound' : 'Unmute sound');
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

    toggleAnalyticsPanel(visible) {
        if (this.analyticsPanel) {
             // Because of the 'hidden' utility class which overrides display,
            // we must also toggle it off when showing the modal
            this.analyticsPanel.classList.toggle('hidden', !visible);

            if (visible) {
                requestAnimationFrame(() => {
                    this.analyticsPanel.classList.add('visible');
                });
            } else {
                this.analyticsPanel.classList.remove('visible');
            }
        }
    }

    toggleStressModal(visible) {
        if (this.stressModal) {
            // Because of the 'hidden' utility class which overrides display,
            // we must also toggle it off when showing the modal
            this.stressModal.classList.toggle('hidden', !visible);

            // Allow a small tick for the display change to register before fading in
            if (visible) {
                requestAnimationFrame(() => {
                    this.stressModal.classList.add('visible');
                });
            } else {
                this.stressModal.classList.remove('visible');
            }
        }
    }

    updateAnalyticsUI(stats, history) {
        if (this.statTotalSessions) this.statTotalSessions.textContent = stats.totalSessions;
        if (this.statTotalMinutes) this.statTotalMinutes.textContent = stats.totalMinutes;
        if (this.statStressDelta) this.statStressDelta.textContent = stats.avgStressReduction; //  > 0 is good

        if (this.historyList) {
            this.historyList.innerHTML = '';
            history.forEach(session => {
                const li = document.createElement('li');
                const date = new Date(session.date).toLocaleDateString();
                const reduction = (session.preStress !== null && session.postStress !== null)
                    ? `<span style="color: ${session.preStress - session.postStress > 0 ? '#4caf50' : 'inherit'}">-${session.preStress - session.postStress} Stress</span>`
                    : '<span>--</span>';

                li.innerHTML = `<span>${date}</span> ${reduction}`;
                this.historyList.appendChild(li);
            });
        }

        // Render Chart
        if (this.trendChartContainer && typeof Visualizer !== 'undefined') {
            const chartData = history.map(s => {
                let val = 0;
                if (s.preStress !== null && s.postStress !== null) {
                    val = s.preStress - s.postStress;
                }
                return { date: s.date, value: val };
            }).reverse(); // Visualizer expects oldest to newest left to right

            this.trendChartContainer.innerHTML = Visualizer.generateTrendChart(chartData, this.trendChartContainer.offsetWidth || 300, 150);
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
