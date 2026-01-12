
// Perlin Noise implementation (Simplex Noise 2D would be better, but a simple noise function suffices for flow fields)
// Using a simple pseudo-random gradient noise for this scale.

class Noise {
    constructor(seed = Math.random()) {
        this.perm = new Uint8Array(512);
        this.gradP = new Float32Array(512);
        // ... simplified noise generator for brevity
        // Actually, let's just use Math.sin/cos combinations for a "pseudo-flow field"
        // which is much lighter weight and sufficient for "Supreme" aesthetic without a heavy library.
    }

    // Simple 2D noise function
    noise2D(x, y, time) {
        return Math.sin(x * 0.01 + time * 0.5) * Math.cos(y * 0.01 + time * 0.3) * 2;
    }
}

export default class ParticleManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error("Canvas element not found!");
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationFrameId = null;
        this.state = 'idle'; // 'idle', 'gathering', 'dispersing'
        this.theme = 'light';
        this.mouse = { x: null, y: null, radius: 300 };
        this.phase = 'idle';

        this.time = 0; // Global time for noise

        // Dynamic colors for breathing phases
        this.phaseColorOverlay = null;
        this.phaseColorStrength = 0;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('mousemove', (event) => {
            this.mouse.x = event.clientX;
            this.mouse.y = event.clientY;
        });
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });

        // Listen for theme changes
        new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    this.theme = document.documentElement.getAttribute('data-theme') || 'light';
                    this.updateThemeColors();
                }
            });
        }).observe(document.documentElement, { attributes: true });

        // Initial theme set
        this.theme = document.documentElement.getAttribute('data-theme') || 'light';
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    getCSSColor(variableName) {
        const val = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        if (val) {
            const parts = val.split(',').map(n => parseInt(n.trim(), 10));
            if (parts.length === 3) {
                return { r: parts[0], g: parts[1], b: parts[2] };
            }
        }
        // Fallback for hex colors or other formats if needed, but we stick to RGB format in CSS var for now
        // Or if it's a hex string (which it might be now with new CSS vars), we need to parse it.
        // My new CSS vars are Hex codes (e.g. #FDFCF8).
        // I need to update this function to handle Hex.

        if (val && val.startsWith('#')) {
             const r = parseInt(val.slice(1, 3), 16);
             const g = parseInt(val.slice(3, 5), 16);
             const b = parseInt(val.slice(5, 7), 16);
             return { r, g, b };
        }

        return null;
    }

    updateThemeColors() {
        this.particles.forEach(p => {
             p.targetRGB = this.getParticleColorRGB();
        });
    }

    getParticleColorRGB() {
        const c1 = this.getCSSColor('--particle-color-1');
        const c2 = this.getCSSColor('--particle-color-2');

        const color1 = c1 || { r: 167, g: 139, b: 250 }; // Default to Violet
        const color2 = c2 || { r: 52, g: 211, b: 153 }; // Default to Emerald

        return Math.random() > 0.5 ? color1 : color2;
    }

    setPhase(phase) {
        this.phase = phase;

        const isDark = this.theme === 'dark';

        // Colors updated to match new SASS variables
        if (phase === 'inhale') {
            this.state = 'gathering';
            this.phaseColorOverlay = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(167, 139, 250, 0.4)'; // Sky/Violet
            this.phaseColorStrength = 0.6;
        } else if (phase === 'exhale') {
            this.state = 'dispersing';
            this.phaseColorOverlay = isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(52, 211, 153, 0.4)'; // Purple/Green
            this.phaseColorStrength = 0.6;
        } else if (phase === 'hold') {
             this.state = 'floating';
             this.phaseColorStrength = 0.8; // Intensify color on hold
        } else {
            this.state = 'idle';
            this.phaseColorStrength = 0;
        }
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 2.5 + 0.8; // Slightly larger for "Bokeh" feel

        const colorRGB = this.getParticleColorRGB();

        const particle = {
            x,
            y,
            radius,
            vx: 0,
            vy: 0,
            rgb: { ...colorRGB }, // Clone to allow individual transition
            targetRGB: colorRGB,
            opacity: Math.random() * 0.4 + 0.1,
            opacitySpeed: (Math.random() * 0.005) + 0.002,
            life: Math.random() * 1000
        };
        this.particles.push(particle);
    }

    init(count = 250) { // Increased count for dense atmosphere
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.createParticle();
        }
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    animate() {
        // Performance optimization: stop when page hidden
        if (document.hidden) {
             this.animationFrameId = requestAnimationFrame(() => this.animate());
             return;
        }

        this.animationFrameId = requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.time += 0.002; // Slower, more hypnotic time scale

        this.particles.forEach(p => {
            this.updateParticle(p);
            this.drawParticle(p);
        });
    }

    updateParticle(p) {
        // Opacity Breathing
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.6 || p.opacity < 0.1) {
            p.opacitySpeed *= -1;
        }

        // Color transition
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
        p.rgb.r = lerp(p.rgb.r, p.targetRGB.r, 0.02);
        p.rgb.g = lerp(p.rgb.g, p.targetRGB.g, 0.02);
        p.rgb.b = lerp(p.rgb.b, p.targetRGB.b, 0.02);

        // -- FLOW FIELD LOGIC (SUPREME) --
        // A more organic flow field using multi-layered sine waves for "Liquid" feel
        const scale = 0.0015;
        // Layer 1: Base flow
        let angle = (Math.cos(p.x * scale + this.time) + Math.sin(p.y * scale + this.time)) * Math.PI;
        // Layer 2: Detail turbulence
        angle += (Math.sin(p.x * 0.01 - this.time * 2) * 0.5);

        // Base ambient motion
        let forceX = Math.cos(angle) * 0.2;
        let forceY = Math.sin(angle) * 0.2;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // -- STATE BEHAVIOR --
        if (this.state === 'gathering') {
            // Logarithmic Spiral In
            const spiralAngle = Math.atan2(dy, dx) + 0.8; // Offset angle for spiral
            forceX += Math.cos(spiralAngle) * 0.8;
            forceY += Math.sin(spiralAngle) * 0.8;
            forceX += (dx / dist) * 0.4; // Direct pull

        } else if (this.state === 'dispersing') {
            // Radiant Out with Curl
             const pushX = p.x - centerX;
             const pushY = p.y - centerY;
             const pushDist = Math.sqrt(pushX*pushX + pushY*pushY);

            if (pushDist > 1) {
                const repelAngle = Math.atan2(pushY, pushX) - 0.2;
                forceX += Math.cos(repelAngle) * 0.9;
                forceY += Math.sin(repelAngle) * 0.9;
            }
        } else if (this.state === 'floating') {
            // Anti-gravity float with vertical drift
            forceY -= 0.4;
            forceX += (Math.random() - 0.5) * 0.3;
        }

        // Mouse Interaction (Magnetic Repulsion)
        if (this.mouse.x !== null) {
            const mDx = p.x - this.mouse.x;
            const mDy = p.y - this.mouse.y;
            const mDist = Math.sqrt(mDx*mDx + mDy*mDy);
            if (mDist < this.mouse.radius) {
                const f = (this.mouse.radius - mDist) / this.mouse.radius;
                forceX += (mDx/mDist) * f * 3.0;
                forceY += (mDy/mDist) * f * 3.0;
            }
        }

        // Apply Force to Velocity
        p.vx += forceX * 0.03;
        p.vy += forceY * 0.03;

        // Friction/Damping
        p.vx *= 0.96;
        p.vy *= 0.96;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around with buffer
        const buffer = 50;
        if (p.x < -buffer) p.x = this.canvas.width + buffer;
        if (p.x > this.canvas.width + buffer) p.x = -buffer;
        if (p.y < -buffer) p.y = this.canvas.height + buffer;
        if (p.y > this.canvas.height + buffer) p.y = -buffer;
    }

    drawParticle(p) {
        // Soft Glow Drawing
        const r = Math.round(p.rgb.r);
        const g = Math.round(p.rgb.g);
        const b = Math.round(p.rgb.b);

        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;

        // Draw Core
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Bloom if Phase Active
        if (this.phaseColorStrength > 0 && this.phaseColorOverlay) {
             const bloomSize = p.radius * 6; // Larger bloom
             this.ctx.fillStyle = this.phaseColorOverlay.replace(/[\d\.]+\)$/g, `${this.phaseColorStrength * p.opacity * 0.25})`);
             this.ctx.beginPath();
             this.ctx.arc(p.x, p.y, bloomSize, 0, Math.PI * 2);
             this.ctx.fill();
        }
    }
}
