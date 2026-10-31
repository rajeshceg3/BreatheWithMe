# Session lifecycle

The core loop: check-in, guided breathing, pause/resume, natural completion, post check-in, history entry.

## Sub-features
- Begin with pre-session check-in (slider + Continue or Skip)
- Guided session (phase instruction text, breathing bloom animation, end timer)
- Manual pause via End, true resume via Begin without a new check-in
- Natural completion: fade transition, post-session check-in, completion message, confetti, history write

## How to get to it (user POV)
Open the app, press BEGIN, answer or skip "How are you feeling right now?", breathe. Press END to pause, BEGIN to resume. Let the timer run out for natural completion.

## Driving it with drive.mjs
`lifecycle` covers begin/pause/resume. `completion` covers natural completion end to end (see SKILL.md for the local speed scaffold).

## Gotchas
- `#fade-overlay` (z-index 200) must never sit above `#stress-modal` (z-index 100) when the modal is shown; completion regressed exactly this way (Oct 2026): modal visible in DOM but hidden and unclickable, session never loggable. The completion journey asserts elementFromPoint hits the real button.
- Post-check submit must grow `breath_analytics_data.sessions` by 1 and show "Session complete. A beautiful journey." - stale phase text after completion means the post branch never ran.
- Resume must NOT reopen the check-in modal.
- A new session always opens the pre-check; a resumed one never does.
