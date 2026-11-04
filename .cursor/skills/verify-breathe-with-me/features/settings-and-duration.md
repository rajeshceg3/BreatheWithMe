# Settings and duration

Session length, sound, and theme.

## Sub-features
- Duration select (3/5/10/15 min, default 5) persisted as `sessionDuration`
- Sound toggle persisted as `soundEnabled`
- Light/dark theme toggle persisted

## How to get to it (user POV)
Gear icon (top bar) opens the settings panel; speaker and moon icons are direct top-bar toggles.

## Driving it with drive.mjs
Run `settings` at desktop and mobile widths. It opens preferences, selects five minutes, closes preferences, toggles theme and sound through visible controls, reloads, and asserts duration, theme and enabled sound state persist. Audible quality is not checked.

## Gotchas
- The settings panel shares z-index 100 with modals; the fade overlay (200) must not be left on over it.
- Durations map lives in `js/SessionManager.js` `SESSION_DURATIONS`; the completion speed scaffold patches only this map locally and must be reverted.
