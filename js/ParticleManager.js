
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
        this.mouse = { x: null, y: null, radius: 350 }; // Increased radius
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
             // Handle comma-separated RGB (old style) or just let it fail if it's hex
            const parts = val.split(',').map(n => parseInt(n.trim(), 10));
            if (parts.length === 3) {
                return { r: parts[0], g: parts[1], b: parts[2] };
            }
        }
        return null;
    }

    // Helper to hex to rgb
    hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    updateThemeColors() {
        this.particles.forEach(p => {
             p.targetRGB = this.getParticleColorRGB();
        });
    }

    getParticleColorRGB() {
        // Try getting new CSS vars which might be hex now
        let c1Str = getComputedStyle(document.documentElement).getPropertyValue('--particle-color-1').trim();
        let c2Str = getComputedStyle(document.documentElement).getPropertyValue('--particle-color-2').trim();

        // If they are RGB lists (old way)
        let c1 = null, c2 = null;

        if (c1Str.includes(',')) {
             const parts = c1Str.split(',').map(n => parseInt(n.trim(), 10));
             c1 = { r: parts[0], g: parts[1], b: parts[2] };
        } else {
             c1 = this.hexToRgb(c1Str);
        }

        if (c2Str.includes(',')) {
             const parts = c2Str.split(',').map(n => parseInt(n.trim(), 10));
             c2 = { r: parts[0], g: parts[1], b: parts[2] };
        } else {
             c2 = this.hexToRgb(c2Str);
        }

        // Fallbacks
        const color1 = c1 || { r: 196, g: 181, b: 253 }; // Violet 300
        const color2 = c2 || { r: 110, g: 231, b: 183 }; // Emerald 300

        return Math.random() > 0.5 ? color1 : color2;
    }

    setPhase(phase) {
        this.phase = phase;

        const isDark = this.theme === 'dark';

        // Updated colors for Ethereal theme interaction
        if (phase === 'inhale') {
            this.state = 'gathering';
            // Inhale: Cool, Fresh (Blue/Teal)
            this.phaseColorOverlay = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(125, 211, 252, 0.3)';
            this.phaseColorStrength = 0.5;
        } else if (phase === 'exhale') {
            this.state = 'dispersing';
            // Exhale: Warm, Release (Purple/Rose)
            this.phaseColorOverlay = isDark ? 'rgba(192, 132, 252, 0.4)' : 'rgba(244, 114, 182, 0.3)';
            this.phaseColorStrength = 0.5;
        } else if (phase === 'hold') {
             this.state = 'floating';
             this.phaseColorStrength = 0.7; // Glow intensifies
        } else {
            this.state = 'idle';
            this.phaseColorStrength = 0;
        }
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 3.0 + 1.0; // Larger for "Bokeh"

        const colorRGB = this.getParticleColorRGB();

        const particle = {
            x,
            y,
            radius,
            vx: 0,
            vy: 0,
            rgb: { ...colorRGB },
            targetRGB: colorRGB,
            opacity: Math.random() * 0.5 + 0.1,
            opacitySpeed: (Math.random() * 0.005) + 0.002,
            life: Math.random() * 1000,
            isSparkle: Math.random() > 0.95, // 5% chance to be a sparkle
            sparklePhase: Math.random() * Math.PI
        };
        this.particles.push(particle);
    }

    init(count = 300) { // Denser atmosphere
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

        this.time += 0.0015; // Slow, hypnotic time

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
        p.rgb.r = lerp(p.rgb.r, p.targetRGB.r, 0.02);
        p.rgb.g = lerp(p.rgb.g, p.targetRGB.g, 0.02);
        p.rgb.b = lerp(p.rgb.b, p.targetRGB.b, 0.02);

        // -- ETHEREAL FLOW LOGIC --
        // Layered Sine waves for organic fluid motion
        const scale = 0.0012; // Zoomed out for larger currents

        // Base Flow
        let angle = (Math.cos(p.x * scale + this.time) + Math.sin(p.y * scale + this.time)) * Math.PI;

        // Turbulence
        angle += (Math.sin(p.x * 0.005 - this.time * 2) * 0.3);

        let forceX = Math.cos(angle) * 0.15;
        let forceY = Math.sin(angle) * 0.15;

        // Gravity/Buoyancy
        forceY -= 0.05; // Slight upward drift (Heat rising / Bubbles)

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // -- STATE BEHAVIOR --
        if (this.state === 'gathering') {
            // Logarithmic Spiral In
            const spiralAngle = Math.atan2(dy, dx) + 0.6; // Soft spiral
            const pullStrength = (dist / (this.canvas.width/2)) * 0.5; // Stronger at edges
            forceX += Math.cos(spiralAngle) * 0.6;
            forceY += Math.sin(spiralAngle) * 0.6;
            forceX += (dx / dist) * 0.2; // Direct centering

        } else if (this.state === 'dispersing') {
            // Radiant Out with Curl
             const pushX = p.x - centerX;
             const pushY = p.y - centerY;
             // const pushDist = Math.sqrt(pushX*pushX + pushY*pushY);

             const repelAngle = Math.atan2(pushY, pushX) - 0.3;
             forceX += Math.cos(repelAngle) * 0.7;
             forceY += Math.sin(repelAngle) * 0.7;

        } else if (this.state === 'floating') {
            // Suspended animation
            forceY -= 0.2;
            forceX += (Math.random() - 0.5) * 0.1;
        }

        // Mouse Interaction (Liquid Displacement)
        if (this.mouse.x !== null) {
            const mDx = p.x - this.mouse.x;
            const mDy = p.y - this.mouse.y;
            const mDist = Math.sqrt(mDx*mDx + mDy*mDy);
            if (mDist < this.mouse.radius) {
                const f = (this.mouse.radius - mDist) / this.mouse.radius;
                // Soft repulsion
                forceX += (mDx/mDist) * f * 2.5;
                forceY += (mDy/mDist) * f * 2.5;
            }
        }

        // Apply Force
        p.vx += forceX * 0.03;
        p.vy += forceY * 0.03;

        // Damping (Water resistance)
        p.vx *= 0.97;
        p.vy *= 0.97;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        const buffer = 100;
        if (p.x < -buffer) p.x = this.canvas.width + buffer;
        if (p.x > this.canvas.width + buffer) p.x = -buffer;
        if (p.y < -buffer) p.y = this.canvas.height + buffer;
        if (p.y > this.canvas.height + buffer) p.y = -buffer;

        // Sparkle Logic
        if (p.isSparkle) {
            p.sparklePhase += 0.1;
        }
    }

    drawParticle(p) {
        const r = Math.round(p.rgb.r);
        const g = Math.round(p.rgb.g);
        const b = Math.round(p.rgb.b);

        let opacity = p.opacity;

        // Sparkle effect
        if (p.isSparkle) {
            opacity += Math.sin(p.sparklePhase) * 0.3;
            if (opacity > 1) opacity = 1;
            if (opacity < 0) opacity = 0;
        }

        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        // Draw Core
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Bloom if Phase Active
        if (this.phaseColorStrength > 0 && this.phaseColorOverlay) {
             const bloomSize = p.radius * 8; // Deep atmosphere
             // Parse overlay color to apply alpha
             // Quick hack: replace alpha in rgba string
             const alpha = this.phaseColorStrength * opacity * 0.2;
             this.ctx.fillStyle = this.phaseColorOverlay.replace(/[\d\.]+\)$/g, `${alpha})`);

             this.ctx.beginPath();
             this.ctx.arc(p.x, p.y, bloomSize, 0, Math.PI * 2);
             this.ctx.fill();
        }
    }
}
