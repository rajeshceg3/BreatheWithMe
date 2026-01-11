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
        // Initialize magnetic effect on all elements with 'data-magnetic' or class 'icon-button'
        // We will target specific classes for now to be safe
        this.addMagneticEffect('.icon-button');
        this.addMagneticEffect('#session-button');
        this.addMagneticEffect('.primary-button');
        this.addMagneticEffect('.secondary-button');
    }

    addMagneticEffect(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.addEventListener('mousemove', (e) => this.handleMagneticMove(e, el));
            el.addEventListener('mouseleave', (e) => this.handleMagneticLeave(e, el));
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
        const strength = 0.35;

        // Temporarily speed up transition for the magnetic effect to feel responsive
        // We preserve other transitions but override transform transition
        el.style.transition = 'transform 0.1s linear, box-shadow 0.3s ease';

        // Apply transform
        el.style.transform = `translate(${x * strength}px, ${y * strength}px) scale(1.05)`;

        // Also move the child SVG or text slightly more for parallax if it exists
        const child = el.querySelector('svg') || el.querySelector('span');
        if (child) {
            child.style.transition = 'transform 0.1s linear';
            child.style.transform = `translate(${x * strength * 0.4}px, ${y * strength * 0.4}px)`;
        }
    }

    handleMagneticLeave(e, el) {
        // Restore transition for a smooth snap back
        el.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.6s ease';

        // Snap back to center
        el.style.transform = '';

        const child = el.querySelector('svg') || el.querySelector('span');
        if (child) {
            child.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            child.style.transform = '';
        }

        // Clean up inline styles after the snap back animation completes
        setTimeout(() => {
            el.style.transition = '';
            if (child) child.style.transition = '';
        }, 600);
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

        const ripple = el.getElementsByClassName('ripple')[0];

        if (ripple) {
            ripple.remove();
        }

        el.appendChild(circle);
    }
}
