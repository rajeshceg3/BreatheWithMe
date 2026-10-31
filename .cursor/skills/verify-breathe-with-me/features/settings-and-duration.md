# Settings and duration

Session length, sound, and theme.

## Sub-features
- Duration select (3/5/10/15 min, default 5) persisted as `sessionDuration`
- Sound toggle persisted as `soundEnabled`
- Light/dark theme toggle persisted

## How to get to it (user POV)
Gear icon (top bar) opens the settings panel; speaker and moon icons are direct top-bar toggles.

## Driving it with drive.mjs
Doctor confirms controls render. Manual/spot verification: change duration, reload, confirm the select reflects the saved value; toggle theme and confirm `data-theme` flips and persists across reload.

## Gotchas
- The settings panel shares z-index 100 with modals; the fade overlay (200) must not be left on over it.
- Durations map lives in `js/SessionManager.js` `SESSION_DURATIONS`; the completion speed scaffold patches only this map locally and must be reverted.
