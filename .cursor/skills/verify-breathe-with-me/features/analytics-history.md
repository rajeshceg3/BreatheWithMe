# Analytics history

Completed sessions are logged and shown in the analytics panel.

## Sub-features
- Session record: date, duration, regiment, pre/post stress
- Stats: total sessions, minutes, average stress reduction

## How to get to it (user POV)
Bar-chart icon (top bar) opens the analytics panel after at least one completed session.

## Driving it with drive.mjs
The `completion` journey asserts `breath_analytics_data.sessions` grew by exactly 1 after the post check-in. It also opens analytics and asserts the panel renders. Specific per-record fields, calculated totals and trends still need manual checking.

## Gotchas
- History writes happen ONLY in the post-check branch (Continue or Skip). If the modal cannot be submitted (see session-lifecycle gotchas), history silently stays empty.
- Records persist in localStorage only; clearing site data erases history by design.
