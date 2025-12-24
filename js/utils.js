// Utility functions
class CalculatorUtils {
    static formatTimeDays(days) {
        if (days === undefined || days === null || isNaN(days) || days <= 0) {
            return 'Calculating...';
        }
        if (days === Infinity) {
            return '∞ (Never)';
        }

        const totalMinutes = days * 24 * 60;

        if (totalMinutes < 60) {
            return `${Math.ceil(totalMinutes)}m`;
        }

        const totalHours = days * 24;

        if (totalHours < 24) {
            const fullHours = Math.floor(totalHours);
            const remainingMinutes = Math.ceil((totalHours - fullHours) * 60);

            if (remainingMinutes === 0) {
                return `${fullHours}h`;
            } else {
                return `${fullHours}h ${remainingMinutes}m`;
            }
        }

        const fullDays = Math.floor(days);
        const remainingHours = Math.round((days - fullDays) * 24);

        if (remainingHours === 0) {
            return `${fullDays}d`;
        } else {
            return `${fullDays}d ${remainingHours}h`;
        }
    }

    static formatDateFromDays(days) {
        if (!days || days <= 0) return '--';
        const date = new Date();
        date.setDate(date.getDate() + Math.ceil(days));
        return date.toLocaleDateString();
    }

    static formatLargeNumber(xp) {
        if (xp >= 1e12) {
            return (xp / 1e12).toFixed(2) + 'T';
        } else if (xp >= 1e9) {
            return (xp / 1e9).toFixed(2) + 'B';
        } else if (xp >= 1e6) {
            return (xp / 1e6).toFixed(2) + 'M';
        } else if (xp >= 1e3) {
            return (xp / 1e3).toFixed(2) + 'K';
        }
        return Math.round(xp).toString();
    }

    static getNumberValue(elementId, defaultValue = 0) {
        const element = document.getElementById(elementId);
        const value = parseFloat(element?.value);
        return isNaN(value) ? defaultValue : value;
    }

    static getStringValue(elementId) {
        return document.getElementById(elementId)?.value || '';
    }

    static getIntegerValue(elementId, defaultValue = 0) {
        const element = document.getElementById(elementId);
        const value = parseInt(element?.value);
        return isNaN(value) ? defaultValue : value;
    }

    static debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    static splitRealmString(realmString) {
        const spaceIndex = realmString.indexOf(' ');
        if (spaceIndex === -1) return { major: realmString, minor: '' };
        
        return {
            major: realmString.substring(0, spaceIndex),
            minor: realmString.substring(spaceIndex + 1)
        };
    }
}

export { CalculatorUtils };