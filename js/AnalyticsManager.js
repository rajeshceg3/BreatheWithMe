class AnalyticsManager {
    constructor() {
        this.storageKey = 'breath_analytics_data';
        this.data = this.loadData();
    }

    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : { sessions: [] };
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    logSession(sessionData) {
        // sessionData: { date, duration, regimentId, preStress, postStress }
        this.data.sessions.push(sessionData);
        this.saveData();
    }

    getStats() {
        const sessions = this.data.sessions;
        const totalSessions = sessions.length;
        const totalMinutes = sessions.reduce((acc, curr) => acc + (curr.duration / 60000), 0);

        let avgStressReduction = 0;
        let stressDataCount = 0;

        sessions.forEach(s => {
            if (s.preStress !== null && s.postStress !== null) {
                avgStressReduction += (s.preStress - s.postStress);
                stressDataCount++;
            }
        });

        if (stressDataCount > 0) {
            avgStressReduction = avgStressReduction / stressDataCount;
        }

        return {
            totalSessions,
            totalMinutes: Math.round(totalMinutes),
            avgStressReduction: avgStressReduction.toFixed(1)
        };
    }

    getHistory(limit = 5) {
        return this.data.sessions.slice().reverse().slice(0, limit);
    }

    getTrendData(limit = 10) {
        // Returns last N sessions with stress reduction data
        return this.data.sessions
            .filter(s => s.preStress !== null && s.postStress !== null)
            .slice(-limit) // Get last N
            .map(s => ({
                date: s.date,
                value: s.preStress - s.postStress
            }));
    }
}
