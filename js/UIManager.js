import { CalculatorUtils } from './utils.js';

class UIManager {
    static updateDashboard(results, playerData) {
        // Update basic path information
        this.updateElementText('main-path-realm-display', playerData.mainPathRealm);
        const displayProgress = playerData.mainPathProgress > 100 ? '100%+' : `${playerData.mainPathProgress.toFixed(1)}%`;
        this.updateElementText('main-path-progress-display', displayProgress);
        this.updateElementText('secondary-path-realm-display', playerData.secondaryPathRealm);
        this.updateElementText('secondary-path-progress-display', `${playerData.secondaryPathProgress.toFixed(1)}%`);
        this.updateElementText('path-focus-display', playerData.pathFocus);

        // Update main path results
        if (results.realmProgression?.mainPath) {
            this.updatePathResults('main', results.realmProgression.mainPath);
        }

        // Update secondary path results
        if (results.realmProgression?.secondaryPath) {
            this.updatePathResults('secondary', results.realmProgression.secondaryPath);
        }

        // Update Virya display
        if (results.virya) {
            this.updateViryaDisplay(results.virya, playerData);
        }
    }

    static updatePathResults(prefix, pathData) {
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;

        // Minor realm
        this.updateElementText(`${prefix}-minor-time-display`, format(pathData.timeToNextMinor));
        this.updateElementText(`${prefix}-minor-date-display`, `Estimated: ${formatDate(pathData.timeToNextMinor)}`);
        this.updateProgressBar(`${prefix}-minor-progress-display`, pathData.progressPercentMinor);

        // Major realm
        this.updateElementText(`${prefix}-major-time-display`, format(pathData.timeToNextMajor));
        this.updateElementText(`${prefix}-major-date-display`, `Estimated: ${formatDate(pathData.timeToNextMajor)}`);
        this.updateProgressBar(`${prefix}-major-progress-display`, pathData.progressPercentMajor);
    }

    static updateViryaDisplay(viryaInfo, playerData) {
        // Update status bar
        this.updateElementText('current-virya-scenario', viryaInfo.scenario || 'None');
        this.updateElementText('current-virya-bonus', `+${(viryaInfo.absorptionBonus || 0).toFixed(1)} absorption`);
        this.updateElementText('current-virya-ends', viryaInfo.bonusEndsAt || 'N/A');
        
        // Update requirements display
        this.updateRequirementsDisplay(playerData, viryaInfo);
        
        // Update table rows
        const scenarios = ['Completion', 'Eminence', 'Perfection', 'Half-Step'];
        scenarios.forEach(scenario => {
            const rowId = `virya-row-${scenario.toLowerCase().replace('-', '')}`;
            const row = document.getElementById(rowId);
            
            if (row) {
                row.classList.remove('active');
                if (scenario === viryaInfo.scenario) {
                    row.classList.add('active');
                }
            }
        });
    }

    static updateRequirementsDisplay(playerData, viryaInfo) {
        const requirementsElement = document.getElementById('virya-requirements-display');
        if (!requirementsElement) return;
        
        // This would be populated by ViryaCalculator.checkRequirements
        // For now, show basic info
        let html = '<div class="requirements-list">';
        html += '<strong>Requirements Status:</strong><br>';
        html += `Main Path: ${playerData.mainPathProgress.toFixed(1)}% ${playerData.mainPathRealm}<br>`;
        html += `Secondary Path: ${playerData.secondaryPathProgress.toFixed(1)}% ${playerData.secondaryPathRealm}`;
        html += '</div>';
        
        requirementsElement.innerHTML = html;
    }

    static updateProgressBar(elementId, percent) {
        const progress = Math.min(100, percent);
        const element = document.getElementById(elementId);
        if (element) {
            element.style.width = `${progress}%`;
            element.textContent = `${Math.round(progress)}%`;
        }
    }

    static updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }

    static updateElementHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) element.innerHTML = html;
    }

    static showNotification(message, isError = false) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.simple-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `simple-notification ${isError ? 'error' : 'success'}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            background-color: ${isError ? 'var(--accent)' : 'var(--success)'};
            border-left: 4px solid ${isError ? '#A54545' : '#2E6B4F'};
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    static showLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            button.disabled = true;
        }
    }

    static hideLoading(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}

export { UIManager };