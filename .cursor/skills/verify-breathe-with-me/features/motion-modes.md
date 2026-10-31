# Motion modes

Normal mode animates; the OS reduced-motion setting must make the app still.

## Sub-features
- Breathing bloom (`#breathing-circle::before/::after` animations `breathe-aura`/`breathe-core`)
- Background gradient drift and particle canvas
- Reduced-motion gates every source of motion while controls stay usable

## How to get to it (user POV)
OS/browser setting "reduce motion". No in-app toggle.

## Driving it with drive.mjs
Run `lifecycle --reduced` and compare with a normal run. Reduced evidence: `::after` computed animationName `none`, near-zero requestAnimationFrame at idle, session lifecycle still fully usable.

## Gotchas
- Pseudo-elements do NOT inherit animation-play-state from the parent; the `.playing` class on `#breathing-circle` gates them. Assert computed style on the pseudo-element, never the parent.
- A frozen bloom looks identical to a slow one in a screenshot; assert runtime animation state or time-separated frames, not a still image.
