/**
 * MotionUtils.js
 * A utility class for advanced UI interactions: Magnetic Buttons and Parallax Tilt.
 */

export default class MotionUtils {
    constructor() {
        this.magneticElements = new WeakMap(); // Store listeners to remove them later if needed
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

    /**
     * Attaches magnetic effect to elements matching the selector.
     * Can be called repeatedly; checks for existing listeners are implicit via WeakMap logic if extended,
     * but here we just add listeners. To avoid duplicates on re-runs, we should be careful.
     * Better to use specific element attachment for dynamic items.
     */
    addMagneticEffect(target) {
        let elements;
        if (typeof target === 'string') {
            elements = document.querySelectorAll(target);
        } else if (target instanceof HTMLElement) {
            elements = [target];
        } else {
            return;
        }

        elements.forEach(el => {
            // Avoid double binding (basic check)
            if (el.dataset.magneticBound) return;
            el.dataset.magneticBound = 'true';

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
        const tiltStrength = 0.12; // Slightly reduced for elegance

        // Incorporate the "Lift" effect (previously CSS translateY(-6px))
        // We add a negative Y offset to simulate the lift while hovering
        const liftY = -6;

        // Temporarily speed up transition for the magnetic effect to feel responsive
        // We preserve other transitions but override transform transition
        el.style.transition = 'transform 0.1s linear, box-shadow 0.3s ease';

        // 3D Tilt Calculation
        // Rotate X is based on Y position (tilt up/down)
        // Rotate Y is based on X position (tilt left/right)
        const rotateX = (-y * tiltStrength).toFixed(2);
        const rotateY = (x * tiltStrength).toFixed(2);

        // Apply transform with Tilt, Scale, and Lift
        el.style.transform = `
            translate(${x * strength}px, ${(y * strength) + liftY}px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale(1.05)
        `;

        // Parallax for child elements (Text/Icon)
        // We query every time to ensure we get the content if it changed,
        // though caching in the WeakMap would be faster.
        const child = el.querySelector('svg') || el.querySelector('span') || el.querySelector('.icon');
        if (child) {
            child.style.transition = 'transform 0.1s linear';
            child.style.transform = `translate(${x * strength * 0.25}px, ${y * strength * 0.25}px)`;
        }
    }

    handleMagneticLeave(e, el) {
        // Restore transition for a smooth snap back with elastic bounce
        el.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.6s ease';

        // Snap back to center (0,0) - removing the lift and tilt
        el.style.transform = 'translate(0, 0) rotateX(0) rotateY(0) scale(1)';

        const child = el.querySelector('svg') || el.querySelector('span') || el.querySelector('.icon');
        if (child) {
            child.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            child.style.transform = '';
        }

        // Clean up inline styles after the snap back animation completes
        // This returns control to CSS for standard hover effects (though mouse is gone)
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
