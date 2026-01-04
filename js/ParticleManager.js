class ParticleManager {
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
        this.mouse = { x: null, y: null, radius: 200 }; // Larger mouse radius for gentle influence

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
             p.targetColor = this.getParticleColorRGB();
        });
    }

    getParticleColorRGB() {
        // Read from CSS vars dynamically
        const c1 = this.getCSSColor('--particle-color-1');
        const c2 = this.getCSSColor('--particle-color-2');

        // Fallback if CSS vars fail (shouldn't happen if sass compiles right)
        const color1 = c1 || { r: 255, g: 255, b: 255 };
        const color2 = c2 || { r: 200, g: 200, b: 200 };

        return Math.random() > 0.5 ? color1 : color2;
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 2.5 + 0.5; // Slightly larger, more varied
        const velocity = {
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2
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
            opacity: Math.random() * 0.5 + 0.1,
            opacitySpeed: (Math.random() * 0.005) + 0.001
        };
        this.particles.push(particle);
    }

    init(count = 100) { // Reduced count for elegance, less noise
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
        // Opacity Twinkle (Slower, breathing)
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.6 || p.opacity < 0.1) {
            p.opacitySpeed *= -1;
        }

        // Color transition (if theme changed)
        // Simple lerp (could be smoother but fine for color swap)
        p.rgb = p.targetRGB;

        // Mouse interaction (Gentle push/attract)
        if (this.mouse.x !== null && this.mouse.y !== null) {
            const dxMouse = p.x - this.mouse.x;
            const dyMouse = p.y - this.mouse.y;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

            if (distMouse < this.mouse.radius) {
                const forceDirectionX = dxMouse / distMouse;
                const forceDirectionY = dyMouse / distMouse;
                const force = (this.mouse.radius - distMouse) / this.mouse.radius;
                const maxForce = 0.8;

                // Repel
                p.velocity.x += forceDirectionX * force * maxForce * 0.05;
                p.velocity.y += forceDirectionY * force * maxForce * 0.05;
            }
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        if (this.state === 'gathering') {
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const angle = Math.atan2(dy, dx);
            const orbitSpeed = 0.03;

            // Spiral in
            p.velocity.x += Math.cos(angle + Math.PI/2) * orbitSpeed;
            p.velocity.y += Math.sin(angle + Math.PI/2) * orbitSpeed;
            p.velocity.x += (dx / dist) * 0.08;
            p.velocity.y += (dy / dist) * 0.08;

        } else if (this.state === 'dispersing') {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Explode out gently
            if (dist > 1) { // Avoid divide by zero
                p.velocity.x += (dx / dist) * 0.15;
                p.velocity.y += (dy / dist) * 0.15;
            }

        } else { // idle
            // Organic Wander
            p.wanderAngle += (Math.random() - 0.5) * 0.1; // Smoother turns
            const wanderForce = 0.002;
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
        if (p.x < -20) p.x = this.canvas.width + 20;
        if (p.x > this.canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = this.canvas.height + 20;
        if (p.y > this.canvas.height + 20) p.y = -20;
    }

    drawParticle(p) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        this.ctx.fillStyle = `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${p.opacity})`;

        // Subtle glow
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${p.opacity * 0.8})`;

        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    setState(newState) {
        this.state = newState;
    }
}
