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
-   **Testing:** Jest (Unit Tests), Playwright (E2E Verification)
-   **Linting:** ESLint, Prettier

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

3.  **Build Styles:**
    ```bash
    npm run build
    ```

4.  **Run Development Server:**
    ```bash
    npm start
    ```
    Open `http://127.0.0.1:8080` in your browser.

## Testing

Run unit tests:
```bash
npm test
```

## Production Deployment

This application is a static site. You can deploy it to any static host (Netlify, Vercel, GitHub Pages).

1.  Run `npm run build` to ensure the latest CSS is generated.
2.  Deploy the root directory (ensure `index.html`, `style.css`, `js/`, `manifest.json`, and `sw.js` are included).

## License

MIT
