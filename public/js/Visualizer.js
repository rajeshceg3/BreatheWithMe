class Visualizer {
    static generateTrendChart(data, width = 300, height = 150) {
        // data format: [{ date: '...', value: 2 }, ...] where value is stress reduction
        if (!data || data.length < 2) {
            return `<div class="empty-chart">Not enough data to visualize trends.</div>`;
        }

        const padding = 20;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);

        // Find min/max for scaling
        const values = data.map(d => d.value);
        const minVal = Math.min(...values, 0); // anchor at 0 usually
        const maxVal = Math.max(...values, 1); // ensure at least some range

        const range = maxVal - minVal;

        // Helper to scale X and Y
        const getX = (index) => padding + (index / (data.length - 1)) * chartWidth;
        const getY = (value) => height - padding - ((value - minVal) / (range || 1)) * chartHeight;

        // Build points for the line
        let pathD = `M ${getX(0)} ${getY(data[0].value)}`;
        data.forEach((point, i) => {
            if (i === 0) return;
            pathD += ` L ${getX(i)} ${getY(point.value)}`;
        });

        // Build points for dots
        let dots = '';
        data.forEach((point, i) => {
            dots += `<circle cx="${getX(i)}" cy="${getY(point.value)}" r="3" class="chart-dot" data-value="${point.value}" />`;
        });

        // Zero line (if relevant)
        let zeroLine = '';
        if (minVal < 0 && maxVal > 0) {
            const zeroY = getY(0);
            zeroLine = `<line x1="${padding}" y1="${zeroY}" x2="${width - padding}" y2="${zeroY}" class="chart-zero-line" />`;
        }

        return `
            <svg viewBox="0 0 ${width} ${height}" class="trend-chart" aria-label="Stress reduction trend chart">
                <defs>
                    <linearGradient id="line-gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.8)"/>
                        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.2)"/>
                    </linearGradient>
                </defs>
                ${zeroLine}
                <path d="${pathD}" fill="none" stroke="url(#line-gradient)" stroke-width="2" />
                ${dots}
            </svg>
        `;
    }
}
