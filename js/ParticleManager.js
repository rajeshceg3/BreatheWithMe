
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

        const color1 = c1 || { r: 154, g: 140, b: 152 }; // Default to Mauve
        const color2 = c2 || { r: 136, g: 172, b: 169 }; // Default to Sage

        return Math.random() > 0.5 ? color1 : color2;
    }

    setPhase(phase) {
        this.phase = phase;

        const isDark = this.theme === 'dark';

        if (phase === 'inhale') {
            this.state = 'gathering';
            this.phaseColorOverlay = isDark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(230, 210, 230, 0.4)'; // Gold/Mauve
            this.phaseColorStrength = 0.6;
        } else if (phase === 'exhale') {
            this.state = 'dispersing';
            this.phaseColorOverlay = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(200, 230, 201, 0.4)'; // Sky/Sage
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
        const radius = Math.random() * 2 + 0.5; // Finer particles

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
            opacitySpeed: (Math.random() * 0.005) + 0.001,
            life: Math.random() * 1000
        };
        this.particles.push(particle);
    }

    init(count = 200) { // Increased count for "Supreme" density
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

        this.time += 0.003; // Slower time for more "graceful" noise

        this.particles.forEach(p => {
            this.updateParticle(p);
            this.drawParticle(p);
        });
    }

    updateParticle(p) {
        // Opacity Breathing
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.7 || p.opacity < 0.1) {
            p.opacitySpeed *= -1;
        }

        // Color transition
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
        p.rgb.r = lerp(p.rgb.r, p.targetRGB.r, 0.03);
        p.rgb.g = lerp(p.rgb.g, p.targetRGB.g, 0.03);
        p.rgb.b = lerp(p.rgb.b, p.targetRGB.b, 0.03);

        // -- FLOW FIELD LOGIC --
        // A more organic flow field using sine waves
        const scale = 0.002;
        const angle = (Math.cos(p.x * scale + this.time) + Math.sin(p.y * scale + this.time)) * Math.PI;

        // Base ambient motion
        let forceX = Math.cos(angle) * 0.15;
        let forceY = Math.sin(angle) * 0.15;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // -- STATE BEHAVIOR --
        if (this.state === 'gathering') {
            // Spiral In (Golden Ratio-ish)
            const spiralAngle = Math.atan2(dy, dx) + 0.5; // Offset angle for spiral
            forceX += Math.cos(spiralAngle) * 0.6;
            forceY += Math.sin(spiralAngle) * 0.6;
            forceX += (dx / dist) * 0.3; // Direct pull

        } else if (this.state === 'dispersing') {
            // Radiant Out
             const pushX = p.x - centerX;
             const pushY = p.y - centerY;
             const pushDist = Math.sqrt(pushX*pushX + pushY*pushY);

            if (pushDist > 1) {
                forceX += (pushX / pushDist) * 0.7;
                forceY += (pushY / pushDist) * 0.7;
            }
        } else if (this.state === 'floating') {
            // Anti-gravity float
            forceY -= 0.3;
            // Slight jitter
            forceX += (Math.random() - 0.5) * 0.2;
        }

        // Mouse Interaction (Magnetic Repulsion)
        if (this.mouse.x !== null) {
            const mDx = p.x - this.mouse.x;
            const mDy = p.y - this.mouse.y;
            const mDist = Math.sqrt(mDx*mDx + mDy*mDy);
            if (mDist < this.mouse.radius) {
                const f = (this.mouse.radius - mDist) / this.mouse.radius;
                forceX += (mDx/mDist) * f * 2.5;
                forceY += (mDy/mDist) * f * 2.5;
            }
        }

        // Apply Force to Velocity
        p.vx += forceX * 0.04;
        p.vy += forceY * 0.04;

        // Friction/Damping
        p.vx *= 0.95;
        p.vy *= 0.95;

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
             const bloomSize = p.radius * 4;
             // Using a radial gradient for the bloom is expensive, let's use a larger low-alpha circle
             this.ctx.fillStyle = this.phaseColorOverlay.replace(/[\d\.]+\)$/g, `${this.phaseColorStrength * p.opacity * 0.3})`);
             this.ctx.beginPath();
             this.ctx.arc(p.x, p.y, bloomSize, 0, Math.PI * 2);
             this.ctx.fill();
        }
    }
}
