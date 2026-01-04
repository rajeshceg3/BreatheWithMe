class ThemeManager {
    constructor() {
        this.currentTheme = 'light'; // Default, will be overridden
        this.rootElement = document.documentElement;
    }

    initialize(defaultTheme = 'light') {
        const savedTheme = localStorage.getItem('theme');
        this.currentTheme = savedTheme || defaultTheme;
        this.applyTheme();
    }

    setTheme(themeName) {
        this.currentTheme = themeName;
        localStorage.setItem('theme', themeName);
        this.applyTheme();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme; // Return the new theme name
    }

    applyTheme() {
        this.rootElement.setAttribute('data-theme', this.currentTheme);
    }

    getTheme() {
        return this.currentTheme;
    }
}
