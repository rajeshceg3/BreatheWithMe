/**
 * MotionUtils.js
 * A utility class for advanced UI interactions: Magnetic Buttons and Parallax Tilt.
 */

export default class MotionUtils {
    constructor() {
        this.magneticElements = [];
        this.init();
    }

    init() {
        // Initialize magnetic effect on all elements with 'data-magnetic' or specific classes
        this.addMagneticEffect('.icon-button');
        this.addMagneticEffect('#session-button');
        this.addMagneticEffect('.primary-button');
        this.addMagneticEffect('.secondary-button');
        this.addMagneticEffect('.stat-card');
    }

    addMagneticEffect(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.addEventListener('mousemove', (e) => this.handleMagneticMove(e, el));
            el.addEventListener('mouseleave', (e) => this.handleMagneticLeave(e, el));
            // Add hint for browser optimization
            el.style.willChange = 'transform';
        });
    }

    handleMagneticMove(e, el) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate distance from center
        const x = e.clientX - centerX;
        const y = e.clientY - centerY;

        // Strength of the magnetic pull
        const strength = 0.4;
        const tiltStrength = 0.15;

        // Temporarily speed up transition for the magnetic effect to feel responsive
        // We preserve other transitions but override transform transition
        el.style.transition = 'transform 0.1s linear, box-shadow 0.3s ease';

        // 3D Tilt Calculation
        // Rotate X is based on Y position (tilt up/down)
        // Rotate Y is based on X position (tilt left/right)
        const rotateX = -y * tiltStrength;
        const rotateY = x * tiltStrength;

        // Apply transform with Tilt and Scale
        el.style.transform = `
            translate(${x * strength}px, ${y * strength}px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale(1.05)
        `;

        // Parallax for child elements (Text/Icon)
        const child = el.querySelector('svg') || el.querySelector('span') || el.querySelector('.icon');
        if (child) {
            child.style.transition = 'transform 0.1s linear';
            child.style.transform = `translate(${x * strength * 0.3}px, ${y * strength * 0.3}px)`;
        }
    }

    handleMagneticLeave(e, el) {
        // Restore transition for a smooth snap back with elastic bounce
        el.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.6s ease';

        // Snap back to center
        el.style.transform = 'translate(0, 0) rotateX(0) rotateY(0) scale(1)';

        const child = el.querySelector('svg') || el.querySelector('span') || el.querySelector('.icon');
        if (child) {
            child.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            child.style.transform = '';
        }

        // Clean up inline styles after the snap back animation completes
        setTimeout(() => {
            el.style.transition = '';
            if (child) child.style.transition = '';
        }, 800);
    }

    // Ripple Effect
    createRipple(e, el) {
        const circle = document.createElement('span');
        const diameter = Math.max(el.clientWidth, el.clientHeight);
        const radius = diameter / 2;

        const rect = el.getBoundingClientRect();

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - rect.left - radius}px`;
        circle.style.top = `${e.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');

        // Check if existing ripple needs removal
        const existingRipple = el.getElementsByClassName('ripple')[0];
        if (existingRipple) {
            existingRipple.remove();
        }

        el.appendChild(circle);

        // Auto remove after animation
        setTimeout(() => {
            circle.remove();
        }, 1000);
    }
}
