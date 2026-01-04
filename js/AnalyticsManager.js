/**
 * Manages the recording and retrieval of session analytics data.
 */
class AnalyticsManager {
    constructor() {
        this.storageKey = 'breath_analytics_data';
        this.data = this.loadData();
    }

    /**
     * Loads data from local storage.
     * @returns {Object} The stored data or a default object.
     */
    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : { sessions: [] };
    }

    /**
     * Saves the current data to local storage.
     */
    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    /**
     * Logs a completed session.
     * @param {Object} sessionData - The session data to log.
     * @param {string} sessionData.date - ISO date string.
     * @param {number} sessionData.duration - Duration in milliseconds.
     * @param {string} sessionData.regimentId - ID of the regiment used.
     * @param {number} [sessionData.preStress] - Pre-session stress level (1-10).
     * @param {number} [sessionData.postStress] - Post-session stress level (1-10).
     */
    logSession(sessionData) {
        // sessionData: { date, duration, regimentId, preStress, postStress }
        this.data.sessions.push(sessionData);
        this.saveData();
    }

    /**
     * Calculates statistics from the session history.
     * @returns {Object} Stats object containing totalSessions, totalMinutes, and avgStressReduction.
     */
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

    /**
     * Retrieves the most recent sessions.
     * @param {number} limit - The maximum number of sessions to return.
     * @returns {Array} List of recent session objects.
     */
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
