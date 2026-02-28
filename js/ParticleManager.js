
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

        // Emotional Resonance Scalars
        this.speedScalar = 0.5;
        this.turbulenceScalar = 1.0;

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

        // Enhance color by mixing slightly
        const baseColor = Math.random() > 0.5 ? color1 : color2;

        // Add subtle nuanced variation
        const variation = 20;
        return {
            r: Math.max(0, Math.min(255, baseColor.r + (Math.random() * variation * 2 - variation))),
            g: Math.max(0, Math.min(255, baseColor.g + (Math.random() * variation * 2 - variation))),
            b: Math.max(0, Math.min(255, baseColor.b + (Math.random() * variation * 2 - variation)))
        };
    }

    setPhase(phase) {
        this.phase = phase;
        const isDark = this.theme === 'dark';

        if (phase === 'inhale') {
            this.state = 'gathering';
            // Inhale: Gathering energy, chaotic but purposeful
            this.phaseColorOverlay = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(236, 72, 153, 0.3)';
            this.phaseColorStrength = 0.6;
            this.speedScalar = 1.8;
            this.turbulenceScalar = 1.5;

        } else if (phase === 'exhale') {
            this.state = 'dispersing';
            // Exhale: Release, flow, smooth
            this.phaseColorOverlay = isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(45, 212, 191, 0.3)';
            this.phaseColorStrength = 0.4;
            this.speedScalar = 1.0;
            this.turbulenceScalar = 0.8; // Smooth out

        } else if (phase === 'hold') {
             this.state = 'floating';
             // Hold: Suspension, stillness, tension
             this.phaseColorStrength = 0.8;
             this.speedScalar = 0.2; // Slow down significantly
             this.turbulenceScalar = 0.5;

        } else {
            this.state = 'idle';
            this.phaseColorStrength = 0;
            this.speedScalar = 0.5;
            this.turbulenceScalar = 1.0;
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
            opacitySpeed: (Math.random() * 0.002) + 0.001, // Smoother opacity transition
            maxSpeed: Math.random() * 1.5 + 0.5, // Natural flow limit
            trail: [], // For trailing effect
            life: Math.random() * 1000,
            phaseOffset: Math.random() * Math.PI * 2 // Personal sine wave offset
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

        // Store history for trails - Supreme Liquid trails everywhere, longer during disperse
        p.trail.push({ x: p.x, y: p.y, opacity: p.opacity });
        const maxTrail = this.state === 'dispersing' ? 15 : 6;
        if (p.trail.length > maxTrail) {
            p.trail.shift();
        }

        // -- FLOW FIELD LOGIC (SUPREME LIQUID) --
        const scale = 0.0012;
        // Layer 1: Base slow undulating flow
        let angle = (Math.cos(p.x * scale + this.time * 0.5) + Math.sin(p.y * scale + this.time * 0.5)) * Math.PI;

        // Layer 2: Multi-frequency turbulence for organic liquid feel
        angle += (Math.sin(p.x * 0.005 - this.time) * 0.4 * this.turbulenceScalar);
        angle += (Math.cos(p.y * 0.008 + this.time * 1.5) * 0.3 * this.turbulenceScalar);

        // Layer 3: Particle's unique oscillation
        angle += Math.sin(this.time * 2 + p.phaseOffset) * 0.15;

        let forceX = Math.cos(angle) * 0.3;
        let forceY = Math.sin(angle) * 0.3;

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

        // Mouse Interaction - Fluid Displacement
        if (this.mouse.x !== null) {
            const mDx = p.x - this.mouse.x;
            const mDy = p.y - this.mouse.y;
            const mDist = Math.sqrt(mDx*mDx + mDy*mDy);
            if (mDist < this.mouse.radius) {
                const f = Math.pow((this.mouse.radius - mDist) / this.mouse.radius, 2); // Smoother falloff

                // Add a swirl component
                const swirlAngle = Math.atan2(mDy, mDx) + Math.PI / 2;
                const swirlForce = f * 1.5;

                forceX += (mDx/mDist) * f * 2.0 + Math.cos(swirlAngle) * swirlForce;
                forceY += (mDy/mDist) * f * 2.0 + Math.sin(swirlAngle) * swirlForce;
            }
        }

        // Apply Speed Scalar to final velocity addition
        p.vx += forceX * 0.05 * this.speedScalar;
        p.vy += forceY * 0.05 * this.speedScalar;

        p.vx *= 0.94; // Friction
        p.vy *= 0.94;

        // Speed Limiting for organic feel
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const currentMax = p.maxSpeed * this.speedScalar * 2.5; // Allow bursts
        if (speed > currentMax) {
            p.vx = (p.vx / speed) * currentMax;
            p.vy = (p.vy / speed) * currentMax;
        }

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
        this.ctx.lineWidth = 0.6;
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            // Only check a subset to save performance
            for (let j = i + 1; j < this.particles.length; j += 2) {
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                const maxDist = 120;
                if (dist < maxDist) {
                    const opacity = Math.pow(1 - dist / maxDist, 2) * 0.2; // Quadratic fade for elegance

                    // Gradient connection
                    const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                    gradient.addColorStop(0, `rgba(${p1.rgb.r}, ${p1.rgb.g}, ${p1.rgb.b}, ${opacity})`);
                    gradient.addColorStop(1, `rgba(${p2.rgb.r}, ${p2.rgb.g}, ${p2.rgb.b}, ${opacity})`);

                    this.ctx.strokeStyle = gradient;
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
