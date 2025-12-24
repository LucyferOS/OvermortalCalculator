import { CalculatorUtils } from './utils.js';
import { ViryaCalculator } from './ViryaCalculator.js';

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
            this.updateViryaDisplay(results.virya, playerData, results.dailyXP);
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

    static updateViryaDisplay(viryaInfo, playerData, dailyXP = 0) {
        // Update status bar
        this.updateElementText('current-virya-scenario', viryaInfo.scenario || 'None');
        this.updateElementText('current-virya-bonus', `+${(viryaInfo.absorptionBonus || 0).toFixed(1)} absorption`);
        this.updateElementText('current-virya-ends', viryaInfo.bonusEndsAt || 'N/A');
        
        // Update requirements display
        this.updateRequirementsDisplay(playerData, viryaInfo);
        
        // Update table rows and progress bars
        const scenarios = ['Completion', 'Eminence', 'Perfection', 'Half-Step'];
        scenarios.forEach(scenario => {
            const scenarioKey = scenario.toLowerCase().replace('-', '');
            const rowId = `virya-row-${scenarioKey}`;
            
            // Highlight active row
            const row = document.getElementById(rowId);
            if (row) {
                row.classList.remove('active');
                if (scenario === viryaInfo.scenario) {
                    row.classList.add('active');
                }
            }
            
            // Update progress bars
            this.updateViryaProgress(scenario, rowId, playerData, viryaInfo);
            
            // Update time estimates
            this.updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo);
        });
    }

    static updateRequirementsDisplay(playerData, viryaInfo) {
        const requirementsElement = document.getElementById('virya-requirements-display');
        if (!requirementsElement) return;
        
        const requirements = ViryaCalculator.checkRequirements(playerData);
        
        let html = '<div class="requirements-list">';
        html += '<strong>Virya Requirements Status:</strong><br>';
        
        requirements.forEach(req => {
            const statusClass = req.met ? 'requirement-met' : 'requirement-not-met';
            const checkIcon = req.icon || (req.met ? '✅' : '❌');
            
            html += `<div class="requirement-item ${statusClass}">`;
            html += `<span class="requirement-icon">${checkIcon}</span> `;
            html += `<span class="requirement-desc">${req.description}</span><br>`;
            
            if (req.current) {
                html += `<span class="requirement-current">${req.current}</span><br>`;
            }
            
            if (req.required && req.required !== 'N/A') {
                html += `<span class="requirement-needed">${req.required}</span><br>`;
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        requirementsElement.innerHTML = html;
    }

    static updateViryaProgress(scenario, rowId, playerData, viryaInfo) {
        const progressInfo = ViryaCalculator.calculateScenarioProgress(playerData, scenario);
        const progressPercent = progressInfo.progress;
        
        // Update progress bar
        const progressBar = document.getElementById(`${rowId}-progress`);
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, progressPercent)}%`;
            progressBar.textContent = `${Math.round(progressPercent)}%`;
            
            // Add tooltip with details
            progressBar.title = progressInfo.details || `Progress toward ${scenario}`;
        }
    }

    static updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo) {
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;
        
        const timeId = `virya-${scenarioKey}-time`;
        const dateId = `virya-${scenarioKey}-date`;
        
        if (scenario === viryaInfo.scenario) {
            // Current scenario
            this.updateElementText(timeId, '✅ Active Now');
            this.updateElementText(dateId, '--');
        } else {
            // Calculate time to reach this scenario
            // We need secondary path daily XP, not main path daily XP
            let secondaryDailyXP = 0;
            if (playerData.pathFocus === 'Secondary Path') {
                secondaryDailyXP = dailyXP;
            } else {
                // When focusing on main path, secondary gets only abode aura XP
                // This is a simplification - in reality it would need full calculation
                secondaryDailyXP = dailyXP * 0.3; // Estimate: 30% of daily XP goes to secondary
            }
            
            const daysToReach = ViryaCalculator.calculateDaysToScenario(scenario, playerData, secondaryDailyXP);
            
            if (daysToReach === 0) {
                this.updateElementText(timeId, '✅ Already Met');
                this.updateElementText(dateId, '--');
            } else if (daysToReach === Infinity || daysToReach > 36500) {
                this.updateElementText(timeId, 'Not Reachable');
                this.updateElementText(dateId, '--');
            } else {
                this.updateElementText(timeId, format(daysToReach));
                this.updateElementText(dateId, `Est: ${formatDate(daysToReach)}`);
            }
        }
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