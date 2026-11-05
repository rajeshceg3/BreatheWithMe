# Archived sources (not part of the build)

These files are preserved for reference only. Nothing in the app, the
vite build, or any config references them.

- `style.scss`, `_responsive.scss`: last edited 2026-03-04. They describe
  an older design generation than the served `style.css`, which has been
  edited directly since and is the authoritative stylesheet. Do not
  compile these over `style.css`; doing so would regress the live site.
- `sw.js`: stale root copy of the service worker. The deployed worker is
  `public/sw.js`.
