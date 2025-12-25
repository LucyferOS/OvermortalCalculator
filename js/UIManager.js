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
		
		// Only show bonus if it's a bonus scenario (not No Virya or Completion)
		const bonusText = viryaInfo.scenario === 'No Virya' || viryaInfo.scenario === 'Completion' 
			? 'No Bonus' 
			: `+${(viryaInfo.absorptionBonus || 0).toFixed(1)} absorption`;
		this.updateElementText('current-virya-bonus', bonusText);
		
		// this.updateElementText('current-virya-ends', viryaInfo.bonusEndsAt || 'N/A');
		
		// Update table rows and progress bars
		const scenarios = ['Completion', 'Eminence', 'Perfect', 'Half-Step'];
		scenarios.forEach(scenario => {
			const scenarioKey = scenario.toLowerCase().replace('-', '');
			const rowId = `virya-row-${scenarioKey}`;
			
			// Highlight active row (skip highlighting for "No Virya")
			const row = document.getElementById(rowId);
			if (row) {
				row.classList.remove('active');
				if (scenario === viryaInfo.scenario) {
					row.classList.add('active');
				}
			}
			
			// Update time estimates
			this.updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo);
		});
	}


	static updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo) {
		console.group(`⏱️ Updating time for ${scenario}`);
		console.log('Inputs:', {
			scenario,
			scenarioKey,
			playerData: {
				mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
				secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`,
				pathFocus: playerData.pathFocus
			},
			dailyXP,
			currentViryaScenario: viryaInfo.scenario
		});
		
		const format = CalculatorUtils.formatTimeDays;
		const formatDate = CalculatorUtils.formatDateFromDays;
		
		const timeId = `virya-${scenarioKey}-time`;
		const dateId = `virya-${scenarioKey}-date`;
		
		// If this is the current scenario
		if (scenario === viryaInfo.scenario) {
			console.log(`Scenario ${scenario} is currently active`);
			this.updateElementText(timeId, '✅ Active Now');
			this.updateElementText(dateId, '--');
			console.groupEnd();
			return;
		}
		
		const daysToReach = ViryaCalculator.calculateDaysToScenario(scenario, playerData, dailyXP);
		
		console.log('Days to reach scenario:', daysToReach);
		
		if (daysToReach === 0) {
			console.log('Scenario already achieved');
			this.updateElementText(timeId, '✅ Already Met');
			this.updateElementText(dateId, '--');
		} else if (daysToReach === Infinity || isNaN(daysToReach) || daysToReach > 36500) {
			console.log('Scenario not reachable');
			
			// Provide more specific reason
			let reason = 'Not reachable';
			if (dailyXP <= 0) {
				reason = 'No secondary path XP';
			} else if (daysToReach > 36500) {
				reason = 'Too far away';
			}
			
			this.updateElementText(timeId, reason);
			this.updateElementText(dateId, '--');
		} else if (daysToReach < 0) {
			console.log('Invalid negative days');
			this.updateElementText(timeId, 'Error');
			this.updateElementText(dateId, '--');
		} else {
			console.log('Valid time calculated');
			this.updateElementText(timeId, format(daysToReach));
			this.updateElementText(dateId, `Est: ${formatDate(daysToReach)}`);
		}
		
		console.groupEnd();
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