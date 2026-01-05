# BreatheWithMe

A production-ready breathing exercise web application designed to reduce stress and improve focus through guided breathing techniques.

## Features

-   **Multiple Breathing Regiments:** Box Breathing, 4-7-8, Physiological Sigh, Heart Coherence, and Mission Reset (Sequence).
-   **Visual Guidance:** Glassmorphism UI with particle effects that synchronize with your breath.
-   **Audio Guidance:** Binaural beats and ambient sounds generated via Web Audio API.
-   **Session Tracking:** Analytics to track minutes breathed and stress reduction.
-   **Trend Analysis:** Visual charts to monitor stress trends over time.
-   **PWA Ready:** Installable on mobile and desktop devices.
-   **Offline Capable:** Works without an internet connection after initial load.
-   **Themes:** Includes "Ethereal Dawn" (Day) and "Midnight Aurora" (Night) pastel glassmorphism themes.

## Technology Stack

-   **Frontend:** Vanilla JavaScript (ES6+), SASS
-   **Architecture:** Component-based with Manager pattern (SessionManager, RegimentManager, etc.)
-   **Styling:** SCSS with responsive design and glassmorphism aesthetic
-   **Testing:** Vitest (Unit Tests), Playwright (E2E Verification)
-   **Linting:** ESLint, Prettier
-   **Bundler:** Vite

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/breathe-with-me.git
    cd breathe-with-me
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` (or the URL provided) in your browser.

4.  **Build for Production:**
    ```bash
    npm run build
    ```
    The output will be in the `dist/` directory.

## Testing

Run unit tests:
```bash
npm test
```

## License

MIT
