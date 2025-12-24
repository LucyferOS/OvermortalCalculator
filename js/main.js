import { OvermortalCalculator } from './Calculator.js';
import { EventManager } from './EventManager.js';
import { UIManager } from './UIManager.js';
import { DebugManager } from './DebugManager.js';

class OvermortalApp {
    constructor() {
        this.calculator = new OvermortalCalculator();
        this.eventManager = new EventManager(this);
        this.originalCalculateBtnText = '';
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => this.onDOMContentLoaded());
    }

    onDOMContentLoaded() {
        this.originalCalculateBtnText = document.getElementById('calculate-btn').innerHTML;
        this.eventManager.setupEventListeners();
        this.loadSavedData();
        this.calculateAndUpdateUI();
    }

    loadSavedData() {
        if (this.calculator.loadSavedData()) {
            UIManager.showNotification('Settings loaded from previous session');
        }
    }

    calculateAndUpdateUI() {
        UIManager.showLoading('calculate-btn');
        
        setTimeout(() => {
            try {
                const results = this.calculator.calculateAll();
                const playerData = this.calculator.getPlayerData();
                UIManager.updateDashboard(results, playerData);
                
                // Update debug information
                DebugManager.updateDebugInfo(this.calculator);
                
                UIManager.showNotification('Calculation complete! Results updated.');
            } catch (error) {
                console.error('Calculation error:', error);
                UIManager.showNotification('Error during calculation: ' + error.message, true);
            } finally {
                UIManager.hideLoading('calculate-btn', this.originalCalculateBtnText);
            }
        }, 100);
    }

    resetToDefaults() {
        if (!confirm('Are you sure you want to reset all inputs to default values?')) {
            return;
        }

        this.calculator.initializePlayerData();
        this.syncInputsToCalculator();
        this.calculateAndUpdateUI();
        UIManager.showNotification('Reset to default values complete.');
    }

    syncInputsToCalculator() {
        const p = this.calculator.getPlayerData();
        const inputs = {
            'main-path-realm': p.mainPathRealm,
            'main-path-progress': p.mainPathProgress,
            'secondary-path-realm': p.secondaryPathRealm,
            'secondary-path-progress': p.secondaryPathProgress,
            'path-focus': p.pathFocus,
            'timegate-days': p.timegateDays,
            'vase-stars': p.vaseStars,
            'mirror-stars': p.mirrorStars,
            'token-stars': p.tokenStars,
            'gold-pill': p.goldPill,
            'purple-pill': p.purplePill,
            'blue-pill': p.bluePill,
            'elixir': p.elixir,
            'fruits-count': p.fruitsCount,
            'weekly-fruits': p.weeklyFruits,
            'fruits-usage': p.fruitsUsage
        };

        Object.entries(inputs).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });
    }

    showNotification(message, isError = false) {
        UIManager.showNotification(message, isError);
    }
}

// Initialize the application
const app = new OvermortalApp();
app.init();

// Make debug manager available globally for testing
window.DebugManager = DebugManager;
window.CalculatorUtils = CalculatorUtils;