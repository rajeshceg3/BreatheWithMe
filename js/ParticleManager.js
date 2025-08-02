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

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

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
        p.color = `rgba(${baseColor}, ${Math.random() * 0.5 + 0.2})`;
        p.shadowColor = `rgba(${baseColor}, 0.5)`;
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 2.5 + 1;
        const velocity = {
            x: (Math.random() - 0.5) * 0.3,
            y: (Math.random() - 0.5) * 0.3
        };
        const particle = { x, y, radius, velocity, originalVelocity: { ...velocity }, wanderAngle: Math.random() * 2 * Math.PI };
        this.setParticleAppearance(particle);
        this.particles.push(particle);
    }

    init(count = 75) { // Reduced count for a cleaner look
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
            const wanderSpeed = 0.05;
            p.wanderAngle += (Math.random() - 0.5) * 0.5;
            p.velocity.x = Math.cos(p.wanderAngle) * wanderSpeed;
            p.velocity.y = Math.sin(p.wanderAngle) * wanderSpeed;
        }

        // Apply velocity
        p.x += p.velocity.x;
        p.y += p.velocity.y;

        // Reset particle if it goes too far off-screen
        if (p.x < -10 || p.x > this.canvas.width + 10 || p.y < -10 || p.y > this.canvas.height + 10) {
            if (this.state === 'dispersing') {
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
        this.ctx.shadowColor = p.shadowColor;
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Reset shadow blur for other elements
    }

    setState(newState) {
        if (this.state === 'dispersing' && newState !== 'dispersing') {
            // When dispersing ends, re-initialize particles for a smooth transition
            setTimeout(() => this.init(), 500);
        }
        this.state = newState;
    }
}
