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
        this.mouse = { x: null, y: null, radius: 150 }; // Larger mouse radius for gentle influence

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

    updateThemeColors() {
        this.particles.forEach(p => {
             p.targetColor = this.getParticleColor();
        });
    }

    getParticleColor() {
        const isDark = this.theme === 'dark';
        if (isDark) {
             // Night theme: Star-like, cool blues and purples
             return `rgba(${150 + Math.random() * 50}, ${200 + Math.random() * 55}, 255, ${Math.random() * 0.4 + 0.1})`;
        } else {
             // Day theme: Warm, soft sun motes
             return `rgba(255, ${230 + Math.random() * 25}, ${200 + Math.random() * 55}, ${Math.random() * 0.3 + 0.1})`;
        }
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 2 + 0.5; // Varied sizes
        const velocity = {
            x: (Math.random() - 0.5) * 0.15, // Very slow drift
            y: (Math.random() - 0.5) * 0.15
        };

        const particle = {
            x,
            y,
            radius,
            velocity,
            originalVelocity: { ...velocity },
            wanderAngle: Math.random() * 2 * Math.PI,
            color: this.getParticleColor(),
            targetColor: this.getParticleColor(),
            opacity: Math.random(),
            opacitySpeed: (Math.random() * 0.01) + 0.002
        };
        this.particles.push(particle);
    }

    init(count = 150) { // High count for immersion
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
            return; // Skip rendering when hidden to save battery
        }

        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // Clear with fade for trails? No, for this style, clean clear is better for "floating dust"
        // But let's verify if trails are desired. The prompt asks for "magical".
        // A very slight trail can be nice.
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(p => {
            this.updateParticle(p);
            this.drawParticle(p);
        });
    }

    updateParticle(p) {
        // Opacity Twinkle
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.8 || p.opacity < 0.1) {
            p.opacitySpeed *= -1;
        }

        // Mouse interaction (Gentle push)
        if (this.mouse.x !== null && this.mouse.y !== null) {
            const dxMouse = p.x - this.mouse.x;
            const dyMouse = p.y - this.mouse.y;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            if (distMouse < this.mouse.radius) {
                const forceDirectionX = dxMouse / distMouse;
                const forceDirectionY = dyMouse / distMouse;
                const force = (this.mouse.radius - distMouse) / this.mouse.radius;
                const maxForce = 0.5; // Gentle push
                p.velocity.x += forceDirectionX * force * maxForce;
                p.velocity.y += forceDirectionY * force * maxForce;
            }
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        if (this.state === 'gathering') {
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Orbit effect
            const angle = Math.atan2(dy, dx);
            const orbitSpeed = 0.02;

            p.velocity.x += Math.cos(angle + Math.PI/2) * orbitSpeed; // Perpendicular force
            p.velocity.y += Math.sin(angle + Math.PI/2) * orbitSpeed;
            p.velocity.x += (dx / dist) * 0.05; // Gentle center pull
            p.velocity.y += (dy / dist) * 0.05;

        } else if (this.state === 'dispersing') {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            p.velocity.x += dx / dist * 0.1;
            p.velocity.y += dy / dist * 0.1;

        } else { // idle
            // Organic Wander
            p.wanderAngle += (Math.random() - 0.5) * 0.2;
            const wanderForce = 0.005;
            p.velocity.x += Math.cos(p.wanderAngle) * wanderForce;
            p.velocity.y += Math.sin(p.wanderAngle) * wanderForce;

            // Return to original speed (damping)
            p.velocity.x = p.velocity.x * 0.99 + p.originalVelocity.x * 0.01;
            p.velocity.y = p.velocity.y * 0.99 + p.originalVelocity.y * 0.01;
        }

        // Apply velocity
        p.x += p.velocity.x;
        p.y += p.velocity.y;

        // Wrap around screen instead of bounce for a continuous flow feel
        if (p.x < -20) p.x = this.canvas.width + 20;
        if (p.x > this.canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = this.canvas.height + 20;
        if (p.y > this.canvas.height + 20) p.y = -20;
    }

    drawParticle(p) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        // Parse the color string to inject opacity
        // Assuming color format is rgba(r, g, b, a)
        // actually I stored it as the full string, let's just use the calculated opacity override
        // A better way is to store r,g,b separate.
        // Let's parse it quickly or reconstruct it.

        // Hacky but fast:
        // p.color is "rgba(r, g, b, a)"
        // I want to use p.opacity for the alpha.
        const rgb = p.color.substring(p.color.indexOf('(') + 1, p.color.lastIndexOf(','));
        this.ctx.fillStyle = `rgba(${rgb}, ${p.opacity})`;

        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = `rgba(${rgb}, 0.5)`;
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Reset
    }

    setState(newState) {
        this.state = newState;
    }
}
