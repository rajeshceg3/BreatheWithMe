export default class Visualizer {
    static generateTrendChart(data, width = 300, height = 150) {
        // data format: [{ date: '...', value: 2 }, ...] where value is stress reduction
        if (!data || data.length < 2) {
            return `<div class="empty-chart">Start a session to track your journey.</div>`;
        }

        const padding = 25; // More breathing room
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);

        // Find min/max for scaling
        const values = data.map(d => d.value);
        const minVal = Math.min(...values, 0);
        const maxVal = Math.max(...values, 1);

        const range = maxVal - minVal;

        // Helper to scale X and Y
        const getX = (index) => padding + (index / (data.length - 1)) * chartWidth;
        const getY = (value) => height - padding - ((value - minVal) / (range || 1)) * chartHeight;

        // Build points for the curved line (Catmull-Rom or Cubic Bezier ideally, but simple L is fine for now, let's try smooth curve)
        // Simple smoothing: Control points at midpoints
        let d = `M ${getX(0)} ${getY(data[0].value)}`;

        for (let i = 0; i < data.length - 1; i++) {
            const x1 = getX(i);
            const y1 = getY(data[i].value);
            const x2 = getX(i + 1);
            const y2 = getY(data[i + 1].value);

            // Midpoint control for simple curve
            const midX = (x1 + x2) / 2;
            d += ` Q ${midX} ${y1}, ${midX} ${(y1 + y2) / 2} T ${x2} ${y2}`;
        }

        // Fallback if curve logic is buggy (it's tricky without a library), let's stick to straight lines but add a subtle area fill?
        // Actually, let's do straight lines but with a nice gradient stroke.
        let pathD = `M ${getX(0)} ${getY(data[0].value)}`;
        data.forEach((point, i) => {
            if (i === 0) return;
            pathD += ` L ${getX(i)} ${getY(point.value)}`;
        });

        // Build area path (for gradient fill under the line)
        const areaPathD = `${pathD} L ${getX(data.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`;

        // Build points for dots
        let dots = '';
        data.forEach((point, i) => {
            dots += `<circle cx="${getX(i)}" cy="${getY(point.value)}" r="4" class="chart-dot" data-value="${point.value}" fill="var(--text-primary)" />`;
        });

        // Zero line
        let zeroLine = '';
        if (minVal < 0 && maxVal > 0) {
            const zeroY = getY(0);
            zeroLine = `<line x1="${padding}" y1="${zeroY}" x2="${width - padding}" y2="${zeroY}" class="chart-zero-line" />`;
        }

        return `
            <svg viewBox="0 0 ${width} ${height}" class="trend-chart" aria-label="Stress reduction trend chart" style="overflow: visible;">
                <defs>
                    <linearGradient id="line-gradient" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stop-color="var(--particle-color-1)" stop-opacity="0.8"/>
                        <stop offset="100%" stop-color="var(--particle-color-2)" stop-opacity="0.8"/>
                    </linearGradient>
                     <linearGradient id="area-gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="var(--particle-color-1)" stop-opacity="0.2"/>
                        <stop offset="100%" stop-color="var(--particle-color-2)" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
                ${zeroLine}
                <!-- Area Fill -->
                <path d="${areaPathD}" fill="url(#area-gradient)" stroke="none" />
                <!-- Line -->
                <path d="${pathD}" fill="none" stroke="url(#line-gradient)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                ${dots}
            </svg>
        `;
    }
}
