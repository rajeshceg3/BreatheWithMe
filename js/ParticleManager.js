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
        this.mouse = { x: null, y: null, radius: 80 }; // Mouse interaction properties

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
                    this.particles.forEach(p => this.setParticleAppearance(p));
                }
            });
        }).observe(document.documentElement, { attributes: true });
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setParticleAppearance(p) {
        const isDark = this.theme === 'dark';
        const baseColor = isDark ? '173, 216, 230' : '255, 182, 193'; // Light Blue or Light Pink
        p.color = `rgba(${baseColor}, ${Math.random() * 0.6 + 0.2})`; // Slightly more vibrant
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 1.5 + 1; // Smaller particles
        const velocity = {
            x: (Math.random() - 0.5) * 0.3,
            y: (Math.random() - 0.5) * 0.3
        };
        const particle = { x, y, radius, velocity, originalVelocity: { ...velocity }, wanderAngle: Math.random() * 2 * Math.PI };
        this.setParticleAppearance(particle);
        this.particles.push(particle);
    }

    init(count = 100) { // Increased count for a fuller effect
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

        // Use a semi-transparent fill to create trails
        const trailColor = this.theme === 'dark' ? 'rgba(35, 37, 38, 0.15)' : 'rgba(253, 234, 221, 0.15)';
        this.ctx.fillStyle = trailColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(p => {
            this.updateParticle(p);
            this.drawParticle(p);
        });
    }

    updateParticle(p) {
        // Mouse interaction
        if (this.mouse.x !== null && this.mouse.y !== null) {
            const dxMouse = p.x - this.mouse.x;
            const dyMouse = p.y - this.mouse.y;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            if (distMouse < this.mouse.radius) {
                const forceDirectionX = dxMouse / distMouse;
                const forceDirectionY = dyMouse / distMouse;
                const force = (this.mouse.radius - distMouse) / this.mouse.radius;
                const maxForce = 1.5;
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
            const attractionRadius = 150;
            if (dist > attractionRadius) {
                p.velocity.x = (p.velocity.x * 0.98) + (dx / dist) * 0.5;
                p.velocity.y = (p.velocity.y * 0.98) + (dy / dist) * 0.5;
            }
        } else if (this.state === 'dispersing') {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.canvas.width) { // Disperse until off-screen
                p.velocity.x += dx / dist * (Math.random() * 0.4);
                p.velocity.y += dy / dist * (Math.random() * 0.4);
            }
        } else { // idle
            // Wander behavior
            const wanderSpeed = 0.1; // Slightly faster wander
            p.wanderAngle += (Math.random() - 0.5) * 0.5;
            p.velocity.x += Math.cos(p.wanderAngle) * wanderSpeed;
            p.velocity.y += Math.sin(p.wanderAngle) * wanderSpeed;

            // Apply some friction/damping to the idle wander to prevent runaway speeds
            p.velocity.x *= 0.98;
            p.velocity.y *= 0.98;
        }

        // Apply velocity
        p.x += p.velocity.x;
        p.y += p.velocity.y;

        // Reset particle if it goes too far off-screen
        if (p.x < -10 || p.x > this.canvas.width + 10 || p.y < -10 || p.y > this.canvas.height + 10) {
            if (this.state !== 'idle') { // In gathering or dispersing, reset them
                 Object.assign(p, this.resetParticle(p));
            } else {
                // Wall bounce for idle state
                if (p.x < 0 || p.x > this.canvas.width) p.velocity.x *= -1;
                if (p.y < 0 || p.y > this.canvas.height) p.velocity.y *= -1;
            }
        }
    }

    resetParticle(p) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = -5; y = Math.random() * this.canvas.height; } // left
        else if (side === 1) { x = this.canvas.width + 5; y = Math.random() * this.canvas.height; } // right
        else if (side === 2) { y = -5; x = Math.random() * this.canvas.width; } // top
        else { y = this.canvas.height + 5; x = Math.random() * this.canvas.width; } // bottom
        p.x = x;
        p.y = y;
        return p;
    }

    drawParticle(p) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
    }

    setState(newState) {
        if (this.state === 'dispersing' && newState !== 'dispersing') {
            // When dispersing ends, re-initialize particles for a smooth transition
            setTimeout(() => this.init(), 500);
        }
        this.state = newState;
    }
}
