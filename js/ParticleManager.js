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
        this.mouse = { x: null, y: null, radius: 250 }; // Increased interaction radius
        this.phase = 'idle';

        // Dynamic colors for breathing phases
        this.phaseColorOverlay = null; // rgba string
        this.phaseColorStrength = 0; // 0 to 1

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

    // New Helper to parse CSS Variables
    getCSSColor(variableName) {
        const val = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        // Assume format is "r, g, b"
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
        // Read from CSS vars dynamically
        const c1 = this.getCSSColor('--particle-color-1');
        const c2 = this.getCSSColor('--particle-color-2');

        // Fallback if CSS vars fail (shouldn't happen if sass compiles right)
        const color1 = c1 || { r: 128, g: 90, b: 213 }; // Default Purple
        const color2 = c2 || { r: 49, g: 151, b: 149 }; // Default Teal

        return Math.random() > 0.5 ? color1 : color2;
    }

    /**
     * Updates the particle system state based on the breathing phase.
     * @param {string} phase - 'inhale', 'exhale', 'hold1', 'hold2', 'idle'
     */
    setPhase(phase) {
        this.phase = phase;
        // Inhale: Warm/Core color (Purple/Gold hint)
        // Exhale: Cool/Outer color (Teal/Blue hint)
        // We will stick to the theme particle colors but increase intensity/overlay

        if (phase === 'inhale') {
            this.state = 'gathering';
            // Use CSS var for dynamic overlay logic if we wanted, but simple tinting is fine
            // Serenity Inhale: Soft warm tint
            // Midnight Inhale: Lighter tint
            const isDark = this.theme === 'dark';
            this.phaseColorOverlay = isDark ? 'rgba(200, 230, 255, 0.4)' : 'rgba(255, 240, 200, 0.4)';
            this.phaseColorStrength = 0.4;
        } else if (phase === 'exhale') {
            this.state = 'dispersing';
             const isDark = this.theme === 'dark';
            this.phaseColorOverlay = isDark ? 'rgba(100, 180, 255, 0.4)' : 'rgba(200, 250, 255, 0.4)';
            this.phaseColorStrength = 0.4;
        } else {
            this.state = 'idle';
            this.phaseColorStrength = 0;
        }
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 3 + 1; // Varied sizes for depth
        const velocity = {
            x: (Math.random() - 0.5) * 0.3,
            y: (Math.random() - 0.5) * 0.3
        };

        const colorRGB = this.getParticleColorRGB();

        const particle = {
            x,
            y,
            radius,
            velocity,
            originalVelocity: { ...velocity },
            wanderAngle: Math.random() * 2 * Math.PI,
            rgb: colorRGB,
            targetRGB: colorRGB,
            opacity: Math.random() * 0.6 + 0.1,
            opacitySpeed: (Math.random() * 0.008) + 0.002
        };
        this.particles.push(particle);
    }

    init(count = 120) { // Slight increase for fullness
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

        this.particles.forEach(p => {
            this.updateParticle(p);
            this.drawParticle(p);
        });
    }

    updateParticle(p) {
        // Opacity Twinkle (Organic)
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.7 || p.opacity < 0.15) {
            p.opacitySpeed *= -1;
        }

        // Smooth Color Transition
        // We move p.rgb towards p.targetRGB slowly
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
        p.rgb.r = lerp(p.rgb.r, p.targetRGB.r, 0.05);
        p.rgb.g = lerp(p.rgb.g, p.targetRGB.g, 0.05);
        p.rgb.b = lerp(p.rgb.b, p.targetRGB.b, 0.05);

        // Mouse interaction (Gentle push/attract)
        if (this.mouse.x !== null && this.mouse.y !== null) {
            const dxMouse = p.x - this.mouse.x;
            const dyMouse = p.y - this.mouse.y;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

            if (distMouse < this.mouse.radius) {
                const forceDirectionX = dxMouse / distMouse;
                const forceDirectionY = dyMouse / distMouse;
                const force = (this.mouse.radius - distMouse) / this.mouse.radius;
                const maxForce = 0.6; // Gentler force

                // Repel slightly
                p.velocity.x += forceDirectionX * force * maxForce * 0.08;
                p.velocity.y += forceDirectionY * force * maxForce * 0.08;
            }
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        if (this.state === 'gathering') {
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const angle = Math.atan2(dy, dx);
            const orbitSpeed = 0.02; // Slower, more hypnotic

            // Spiral in
            p.velocity.x += Math.cos(angle + Math.PI/2) * orbitSpeed;
            p.velocity.y += Math.sin(angle + Math.PI/2) * orbitSpeed;
            p.velocity.x += (dx / dist) * 0.06;
            p.velocity.y += (dy / dist) * 0.06;

        } else if (this.state === 'dispersing') {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Explode out gently
            if (dist > 1) {
                p.velocity.x += (dx / dist) * 0.12;
                p.velocity.y += (dy / dist) * 0.12;
            }

        } else { // idle
            // Organic Wander
            p.wanderAngle += (Math.random() - 0.5) * 0.08;
            const wanderForce = 0.003;
            p.velocity.x += Math.cos(p.wanderAngle) * wanderForce;
            p.velocity.y += Math.sin(p.wanderAngle) * wanderForce;

            // Return to original speed (damping)
            p.velocity.x = p.velocity.x * 0.98 + p.originalVelocity.x * 0.02;
            p.velocity.y = p.velocity.y * 0.98 + p.originalVelocity.y * 0.02;
        }

        // Apply velocity
        p.x += p.velocity.x;
        p.y += p.velocity.y;

        // Wrap around screen
        if (p.x < -30) p.x = this.canvas.width + 30;
        if (p.x > this.canvas.width + 30) p.x = -30;
        if (p.y < -30) p.y = this.canvas.height + 30;
        if (p.y > this.canvas.height + 30) p.y = -30;
    }

    drawParticle(p) {
        // Base Color from theme
        let fillStyle = `rgba(${Math.round(p.rgb.r)}, ${Math.round(p.rgb.g)}, ${Math.round(p.rgb.b)}, ${p.opacity})`;

        this.ctx.fillStyle = fillStyle;

        // Subtle glow - performance heavy, so keep radius low
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = `rgba(${Math.round(p.rgb.r)}, ${Math.round(p.rgb.g)}, ${Math.round(p.rgb.b)}, ${p.opacity * 0.6})`;

        // Overlay Color for Phase Indication
        if (this.phaseColorStrength > 0 && this.phaseColorOverlay) {
             this.ctx.fillStyle = this.phaseColorOverlay.replace(/[\d\.]+\)$/g, `${this.phaseColorStrength * p.opacity})`);
             this.ctx.fill();
             this.ctx.fillStyle = fillStyle;
        }

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
    }

    setState(newState) {
        this.state = newState;
    }
}
