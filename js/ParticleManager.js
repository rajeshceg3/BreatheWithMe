class ParticleManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationFrameId = null;
        this.state = 'idle'; // 'idle', 'gathering', 'dispersing'

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const radius = Math.random() * 2 + 1;
        const color = 'rgba(255, 255, 255, 0.5)';
        const velocity = {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5
        };
        this.particles.push({ x, y, radius, color, velocity });
    }

    init(count = 100) {
        for (let i = 0; i < count; i++) {
            this.createParticle();
        }
        this.animate();
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
        if (this.state === 'gathering') {
            const dx = this.canvas.width / 2 - p.x;
            const dy = this.canvas.height / 2 - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 100) {
                p.x += dx / dist;
                p.y += dy / dist;
            }
        } else if (this.state === 'dispersing') {
            p.x += p.velocity.x * 5;
            p.y += p.velocity.y * 5;
        } else { // idle
            p.x += p.velocity.x;
            p.y += p.velocity.y;
        }

        // Wall collision
        if (p.x < 0 || p.x > this.canvas.width) p.velocity.x *= -1;
        if (p.y < 0 || p.y > this.canvas.height) p.velocity.y *= -1;
    }

    drawParticle(p) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
    }

    setState(newState) {
        this.state = newState;
    }
}
