
// Perlin Noise implementation (Simplex Noise 2D would be better, but a simple noise function suffices for flow fields)
// Using a simple pseudo-random gradient noise for this scale.

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
        this.state = 'idle'; // 'idle', 'gathering', 'dispersing', 'floating'
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
            // Check if it's RGB format (e.g., "100, 200, 255")
            if (val.includes(',')) {
                const parts = val.split(',').map(n => parseInt(n.trim(), 10));
                if (parts.length >= 3) {
                    return { r: parts[0], g: parts[1], b: parts[2] };
                }
            }
            // Check if it's Hex format (e.g., "#ABCDEF")
            else if (val.startsWith('#')) {
                 const hex = val.slice(1);
                 const bigint = parseInt(hex, 16);
                 const r = (bigint >> 16) & 255;
                 const g = (bigint >> 8) & 255;
                 const b = bigint & 255;
                 return { r, g, b };
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

        const color1 = c1 || { r: 236, g: 72, b: 153 }; // Default Pink
        const color2 = c2 || { r: 45, g: 212, b: 191 }; // Default Teal

        return Math.random() > 0.5 ? color1 : color2;
    }

    setPhase(phase) {
        this.phase = phase;
        const isDark = this.theme === 'dark';

        if (phase === 'inhale') {
            this.state = 'gathering';
            // Soft overlay
            this.phaseColorOverlay = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(236, 72, 153, 0.3)';
            this.phaseColorStrength = 0.5;
        } else if (phase === 'exhale') {
            this.state = 'dispersing';
            this.phaseColorOverlay = isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(45, 212, 191, 0.3)';
            this.phaseColorStrength = 0.5;
        } else if (phase === 'hold') {
             this.state = 'floating';
             // Intensity ramps up
             this.phaseColorStrength = 0.8;
        } else {
            this.state = 'idle';
            this.phaseColorStrength = 0;
        }
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 3.0 + 1.0; // Larger "Bokeh" particles

        const colorRGB = this.getParticleColorRGB();

        const particle = {
            x,
            y,
            radius,
            vx: 0,
            vy: 0,
            rgb: { ...colorRGB },
            targetRGB: colorRGB,
            opacity: Math.random() * 0.4 + 0.1,
            opacitySpeed: (Math.random() * 0.005) + 0.002,
            trail: [], // For trailing effect
            life: Math.random() * 1000
        };
        this.particles.push(particle);
    }

    init(count = 200) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.createParticle();
        }
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    animate() {
        if (document.hidden) {
             this.animationFrameId = requestAnimationFrame(() => this.animate());
             return;
        }

        this.animationFrameId = requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.time += 0.002;

        // Draw connections first (behind particles)
        if (this.state === 'floating') {
            this.drawConnections();
        }

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

        // Store history for trails
        if (this.state === 'dispersing') {
            p.trail.push({ x: p.x, y: p.y, opacity: p.opacity });
            if (p.trail.length > 10) p.trail.shift();
        } else {
            if (p.trail.length > 0) p.trail.shift();
        }

        // -- FLOW FIELD LOGIC (SUPREME LIQUID) --
        const scale = 0.0012;
        // Layer 1: Base flow
        let angle = (Math.cos(p.x * scale + this.time) + Math.sin(p.y * scale + this.time)) * Math.PI;
        // Layer 2: Detail turbulence
        angle += (Math.sin(p.x * 0.01 - this.time * 2) * 0.6);

        let forceX = Math.cos(angle) * 0.25;
        let forceY = Math.sin(angle) * 0.25;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // -- STATE BEHAVIOR --
        if (this.state === 'gathering') {
            // Logarithmic Spiral In
            const spiralAngle = Math.atan2(dy, dx) + 0.6;
            forceX += Math.cos(spiralAngle) * 0.9;
            forceY += Math.sin(spiralAngle) * 0.9;
            forceX += (dx / dist) * 0.5;

        } else if (this.state === 'dispersing') {
            // Radiant Out with Curl
             const pushX = p.x - centerX;
             const pushY = p.y - centerY;

            // Repel from center strongly
            if (dist < 400) {
                const repelAngle = Math.atan2(pushY, pushX);
                forceX += Math.cos(repelAngle) * 1.2;
                forceY += Math.sin(repelAngle) * 1.2;
            }

        } else if (this.state === 'floating') {
            // Anti-gravity float - suspended animation
            forceX *= 0.1;
            forceY *= 0.1;
            forceY -= 0.1; // Gentle rise
        }

        // Mouse Interaction
        if (this.mouse.x !== null) {
            const mDx = p.x - this.mouse.x;
            const mDy = p.y - this.mouse.y;
            const mDist = Math.sqrt(mDx*mDx + mDy*mDy);
            if (mDist < this.mouse.radius) {
                const f = (this.mouse.radius - mDist) / this.mouse.radius;
                forceX += (mDx/mDist) * f * 3.5;
                forceY += (mDy/mDist) * f * 3.5;
            }
        }

        p.vx += forceX * 0.04;
        p.vy += forceY * 0.04;

        p.vx *= 0.95; // Friction
        p.vy *= 0.95;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        const buffer = 50;
        if (p.x < -buffer) p.x = this.canvas.width + buffer;
        if (p.x > this.canvas.width + buffer) p.x = -buffer;
        if (p.y < -buffer) p.y = this.canvas.height + buffer;
        if (p.y > this.canvas.height + buffer) p.y = -buffer;
    }

    drawConnections() {
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            // Only check a subset to save performance
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 100) {
                    const opacity = (1 - dist / 100) * 0.15;
                    this.ctx.strokeStyle = `rgba(${p1.rgb.r}, ${p1.rgb.g}, ${p1.rgb.b}, ${opacity})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
    }

    drawParticle(p) {
        const r = Math.round(p.rgb.r);
        const g = Math.round(p.rgb.g);
        const b = Math.round(p.rgb.b);

        // Draw Trail
        if (p.trail.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
                this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.5})`;
            this.ctx.lineWidth = p.radius * 0.5;
            this.ctx.stroke();
        }

        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Bloom if Phase Active
        if (this.phaseColorStrength > 0 && this.phaseColorOverlay) {
             const bloomSize = p.radius * 8; // Deep bloom
             this.ctx.fillStyle = this.phaseColorOverlay.replace(/[\d\.]+\)$/g, `${this.phaseColorStrength * p.opacity * 0.3})`);
             this.ctx.beginPath();
             this.ctx.arc(p.x, p.y, bloomSize, 0, Math.PI * 2);
             this.ctx.fill();
        }
    }
}
