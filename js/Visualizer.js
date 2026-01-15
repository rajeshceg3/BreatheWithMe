export default class Visualizer {
    static generateTrendChart(data, width = 300, height = 150) {
        // data format: [{ date: '...', value: 2 }, ...] where value is stress reduction
        if (!data || data.length < 2) {
            return `<div class="empty-chart" style="color: var(--text-secondary); text-align: center; font-size: 0.9rem;">Complete sessions to see your stress reduction trend.</div>`;
        }

        const padding = 20;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);

        // Find min/max for scaling
        const values = data.map(d => d.value);
        let minVal = Math.min(...values, 0);
        let maxVal = Math.max(...values, 1);

        // Add some headroom
        maxVal = maxVal + (maxVal * 0.1);

        const range = maxVal - minVal;

        // Helper to scale X and Y
        const getX = (index) => padding + (index / (data.length - 1)) * chartWidth;
        const getY = (value) => height - padding - ((value - minVal) / (range || 1)) * chartHeight;

        // Generate Path Data with Catmull-Rom Spline or similar smoothing
        // Since we are raw SVG, we can use simple cubic bezier for smoothing
        // or just straight lines if complex math is too much for a snippet.
        // Let's do a simple smooth curve approximation.

        let d = `M ${getX(0)} ${getY(data[0].value)}`;

        for (let i = 0; i < data.length - 1; i++) {
            const x1 = getX(i);
            const y1 = getY(data[i].value);
            const x2 = getX(i + 1);
            const y2 = getY(data[i+1].value);

            // Control points (simple smoothing)
            const c1x = x1 + (x2 - x1) * 0.5;
            const c1y = y1;
            const c2x = x1 + (x2 - x1) * 0.5;
            const c2y = y2;

            d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
        }

        // Close the path for area fill
        const areaD = `${d} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

        // Points (with staggered animation delay)
        let points = '';
        data.forEach((d, i) => {
            const x = getX(i);
            const y = getY(d.value);
            const delay = (i * 0.1) + 0.5; // Stagger start after line draws
            points += `<circle cx="${x}" cy="${y}" r="4" fill="var(--bloom-core)" stroke="var(--text-accent)" stroke-width="2" class="trend-point" style="animation-delay: ${delay}s" />`;
        });

        // Path total length approximation for dasharray animation (width * 1.5 usually safe)
        const pathLength = width * 2;

        return `
            <svg viewBox="0 0 ${width} ${height}" class="trend-chart" style="overflow: visible; width: 100%; height: 100%;">
                <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="var(--text-accent)" stop-opacity="0.5"/>
                        <stop offset="100%" stop-color="var(--text-accent)" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>

                <!-- Zero Line -->
                <line x1="${padding}" y1="${getY(0)}" x2="${width-padding}" y2="${getY(0)}" stroke="var(--text-secondary)" stroke-opacity="0.3" stroke-dasharray="4 4" />

                <!-- Area (Fade In) -->
                <path d="${areaD}" fill="url(#chartGradient)" class="trend-area" />

                <!-- Line (Draw In) -->
                <path d="${d}" fill="none" stroke="var(--text-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
                      class="trend-line"
                      stroke-dasharray="${pathLength}"
                      stroke-dashoffset="${pathLength}" />

                <!-- Points -->
                ${points}
            </svg>
        `;
    }
}
