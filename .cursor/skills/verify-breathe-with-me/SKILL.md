---
name: verify-breathe-with-me
description: "Drive the Breathe With Me web app like a user and prove session-lifecycle, motion-mode, history, and settings behavior with captured evidence. Use before any merge to main and after any production deploy of rajeshceg3/BreatheWithMe."
---

# Verify Breathe With Me

Static Vite app (no backend). State lives in `localStorage` (`breath_analytics_data`, `sessionDuration`, theme, sound). All assertions must drive the real UI and observe runtime state, never internal setters.

## Launch

Local: `npm install && npx vite --port 5199` from the repo root. Ready when vite prints `Local: http://localhost:5199/`. Teardown: kill the vite process you started (by PID, never by name).
Production: `https://breathe-with-me.vercel.app/` - nothing to launch; Doctor is mandatory.

## Doctor

Read-only, run first whenever anything looks off:
```
node .cursor/skills/verify-breathe-with-me/helpers/drive.mjs doctor --base <URL>
```
Passes when the page loads, `#session-button` exists, the module bundle (`/assets/index-*.js`) returns 200, and no pageerror fires during load.

## Drive

Harness: `helpers/drive.mjs` (Node 18+, `puppeteer-core`, system Chrome at `$CHROME_PATH` or `/usr/bin/google-chrome`). Install once with `npm install` (puppeteer-core is a devDependency).

```
node .cursor/skills/verify-breathe-with-me/helpers/drive.mjs lifecycle  --base <URL> [--reduced] [--mobile] [--out DIR]
node .cursor/skills/verify-breathe-with-me/helpers/drive.mjs completion --base <URL> [--reduced] [--virtual-minutes N] [--out DIR]
```

- `lifecycle`: Begin -> pre-check Continue -> mid-session assertions -> End (pause) -> Begin (resume, no new check-in) -> End.
- `completion`: full natural completion. Against production this takes the selected real duration (default 3 min). For local runs only, scaffold speed by temporarily patching `SESSION_DURATIONS['3']` in `js/SessionManager.js` to `8 * 1000`, and REVERT before committing; never ship the patch. Against production there is no shortcut: run the real duration (3 min is shortest). At least one real-time full-duration production walk is required before closing a lifecycle-affecting change.
- `--reduced` launches Chrome with `--force-prefers-reduced-motion`.
- `--mobile` uses a 390x844 viewport.

Stable selectors (use these, not coordinates): `#session-button`, `#submit-stress-button`, `#skip-stress-button`, `#stress-modal`, `#fade-overlay`, `#instruction-text`, `#breathing-circle`.

## Evidence

JSON to stdout plus screenshots in `--out` (default `.verification-evidence/`, gitignored). A passing proof must show the ACTION and the RESULTING STATE:
- mid-session: button text `End`, `::after` animationPlayState `running` (normal) / animationName `none` (reduced), phase instruction text
- resume: no check-in modal, session continues
- completion: modal visible AND `#fade-overlay` not covering it (elementFromPoint on `#submit-stress-button` returns the button), then after Continue: instruction `Session complete. A beautiful journey.`, `breath_analytics_data.sessions` grew by 1, overlay off
- zero pageerrors in every journey
Screenshots survive teardown; never delete `.verification-evidence/` during cleanup.

## Cleanup

Kill only the vite PID you started. Browser processes are child-reaped by the script. Evidence stays on disk.

## Helpers

`helpers/drive.mjs` - see Drive. Invocation examples above; `--help` prints the same.
