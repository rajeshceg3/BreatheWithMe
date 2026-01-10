
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

        const color1 = c1 || { r: 128, g: 90, b: 213 };
        const color2 = c2 || { r: 49, g: 151, b: 149 };

        return Math.random() > 0.5 ? color1 : color2;
    }

    setPhase(phase) {
        this.phase = phase;

        if (phase === 'inhale') {
            this.state = 'gathering';
            const isDark = this.theme === 'dark';
            this.phaseColorOverlay = isDark ? 'rgba(180, 220, 255, 0.5)' : 'rgba(255, 220, 180, 0.5)';
            this.phaseColorStrength = 0.5;
        } else if (phase === 'exhale') {
            this.state = 'dispersing';
             const isDark = this.theme === 'dark';
            this.phaseColorOverlay = isDark ? 'rgba(100, 150, 255, 0.5)' : 'rgba(200, 250, 255, 0.5)';
            this.phaseColorStrength = 0.5;
        } else {
            this.state = 'idle';
            this.phaseColorStrength = 0;
        }
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 2.5 + 0.5; // Finer particles

        const colorRGB = this.getParticleColorRGB();

        const particle = {
            x,
            y,
            radius,
            vx: 0,
            vy: 0,
            rgb: colorRGB,
            targetRGB: colorRGB,
            opacity: Math.random() * 0.5 + 0.1,
            opacitySpeed: (Math.random() * 0.005) + 0.001,
            life: Math.random() * 1000
        };
        this.particles.push(particle);
    }

    init(count = 150) { // More particles
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.createParticle();
        }
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.time += 0.005;

        this.particles.forEach(p => {
            this.updateParticle(p);
            this.drawParticle(p);
        });
    }

    updateParticle(p) {
        // Opacity Breathing
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.8 || p.opacity < 0.1) {
            p.opacitySpeed *= -1;
        }

        // Color transition
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
        p.rgb.r = lerp(p.rgb.r, p.targetRGB.r, 0.02);
        p.rgb.g = lerp(p.rgb.g, p.targetRGB.g, 0.02);
        p.rgb.b = lerp(p.rgb.b, p.targetRGB.b, 0.02);

        // -- FLOW FIELD LOGIC --
        // Calculate noise-based angle
        const angle = (Math.cos(p.x * 0.005 + this.time) + Math.sin(p.y * 0.005 + this.time)) * Math.PI;

        let forceX = Math.cos(angle) * 0.2;
        let forceY = Math.sin(angle) * 0.2;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // -- STATE BEHAVIOR --
        if (this.state === 'gathering') {
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Vortex In
            const spiralAngle = Math.atan2(dy, dx) + (Math.PI / 2) * 0.5; // Spiral
            forceX += Math.cos(spiralAngle) * 0.5;
            forceY += Math.sin(spiralAngle) * 0.5;

            forceX += (dx / dist) * 0.5; // Pull in
            forceY += (dy / dist) * 0.5;

        } else if (this.state === 'dispersing') {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Explode Out
            if (dist > 1) {
                forceX += (dx / dist) * 0.8;
                forceY += (dy / dist) * 0.8;
            }
        }

        // Mouse Interaction
        if (this.mouse.x !== null) {
            const dx = p.x - this.mouse.x;
            const dy = p.y - this.mouse.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < this.mouse.radius) {
                const f = (this.mouse.radius - dist) / this.mouse.radius;
                forceX += (dx/dist) * f * 2;
                forceY += (dy/dist) * f * 2;
            }
        }

        // Apply Force to Velocity (Physics)
        p.vx += forceX * 0.05;
        p.vy += forceY * 0.05;

        // Friction/Damping
        p.vx *= 0.96;
        p.vy *= 0.96;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -50) p.x = this.canvas.width + 50;
        if (p.x > this.canvas.width + 50) p.x = -50;
        if (p.y < -50) p.y = this.canvas.height + 50;
        if (p.y > this.canvas.height + 50) p.y = -50;
    }

    drawParticle(p) {
        const fillStyle = `rgba(${Math.round(p.rgb.r)}, ${Math.round(p.rgb.g)}, ${Math.round(p.rgb.b)}, ${p.opacity})`;
        this.ctx.fillStyle = fillStyle;

        // Phase Overlay
        if (this.phaseColorStrength > 0 && this.phaseColorOverlay) {
             // Simply draw a second circle with the overlay color for "bloom" effect
             // This creates a nice color mixing without complex blend modes
             this.ctx.fillStyle = this.phaseColorOverlay.replace(/[\d\.]+\)$/g, `${this.phaseColorStrength * p.opacity})`);
        }

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    setState(newState) {
        this.state = newState;
    }
}
