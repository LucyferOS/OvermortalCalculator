import { DataManager } from './DataManager.js';
import { CalculatorUtils } from './utils.js';
import { UIManager } from './UIManager.js';
import { InputLimits } from '../ui/inputLimits.js';
import { PATH_MAIN, PATH_SECONDARY } from './gameData.js';
    // all of the functions here are used to set up the event listeners for the app, theres a few for handling the data and some for handling the UI.
class EventManager {
    constructor(app) {
        this.app = app;
        this.dataManager = new DataManager();
        this.saveTimeout = null;
    }

    setupEventListeners() {
        // Calculation
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => 
                this.app.calculateAndUpdateUI()
            );
        }

        // Local storage management
        this.setupLocalStorageListeners();
        
        // Data import/export
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => 
                this.handleExport()
            );
        }
        
        const importBtn = document.getElementById('import-data-btn');
        const importFileInput = document.getElementById('import-file-input');
        if (importBtn && importFileInput) {
            importBtn.addEventListener('click', () => 
                importFileInput.click()
            );
        }
        
        if (importFileInput) {
            importFileInput.addEventListener('change', (event) => 
                this.handleFileImport(event)
            );
        }
        
        const clearStorageBtn = document.getElementById('clear-storage-btn');
        if (clearStorageBtn) {
            clearStorageBtn.addEventListener('click', () => 
                this.handleClearStorage()
            );
        }

        // Debug toggle button
        const debugToggleBtn = document.getElementById('debug-toggle-btn');
        if (debugToggleBtn) {
            debugToggleBtn.addEventListener('click', () => 
                this.handleDebugToggle()
            );
        }

        // Navigation
        this.setupNavigation();
        
        // Path focus switching
        this.setupPathFocusListeners();

        // Abode Aura / Absorption easy mode toggle
        this.setupAbodeEasyModeListener();
    }

    setupAbodeEasyModeListener() {
        const easyModeSelect = document.getElementById('abode-easy-mode');
        if (easyModeSelect) {
            easyModeSelect.addEventListener('change', () => {
                UIManager.updateAbodeEasyModeVisibility();
                this.app.calculateAndUpdateUI();
            });
        }
    }
    
    setupPathFocusListeners() {
        const mainPathSection = document.getElementById('main-path-section');
        const secondaryPathSection = document.getElementById('secondary-path-section');
        const pathFocusSelect = document.getElementById('path-focus');
        
        if (mainPathSection) {
            mainPathSection.addEventListener('click', (e) => {
                // Don't trigger if clicking on input/select elements
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.closest('input, select')) {
                    return;
                }
                this.switchPathFocus(PATH_MAIN, pathFocusSelect);
            });
        }
        
        if (secondaryPathSection) {
            secondaryPathSection.addEventListener('click', (e) => {
                // Don't trigger if clicking on input/select elements
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.closest('input, select')) {
                    return;
                }
                this.switchPathFocus(PATH_SECONDARY, pathFocusSelect);
            });
        }
        
        // Add click handlers for dashboard result boxes
        this.setupDashboardPathSwitching();
    }
    
    setupDashboardPathSwitching() {
        // Use event delegation on the dashboard to handle clicks on result boxes
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.addEventListener('click', (e) => {
                // Find the closest result-box with data-path attribute
                const resultBox = e.target.closest('.result-box[data-path]');
                if (resultBox) {
                    const path = resultBox.getAttribute('data-path');
                    if (path === PATH_MAIN || path === PATH_SECONDARY) {
                        this.app.switchPathFocus(path);
                    }
                }
            });
        }
    }
    
    switchPathFocus(newFocus, pathFocusSelect) {
        if (pathFocusSelect) {
            pathFocusSelect.value = newFocus;
            // Trigger change event to save and recalculate
            pathFocusSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Update UI immediately
        this.app.calculateAndUpdateUI();
    }

    setupLocalStorageListeners() {
        // Debounced save on input
        const debouncedSave = CalculatorUtils.debounce(() => 
            this.dataManager.saveToLocalStorage(), 2000);
        
        document.addEventListener('input', (event) => {
            if (event.target.matches('input, select, textarea')) {
                debouncedSave();
            }
        });

        // Immediate save on select change
        document.addEventListener('change', (event) => {
            if (event.target.matches('select')) {
                this.dataManager.saveToLocalStorage();
                
                // If path focus changed, recalculate
                if (event.target.id === 'path-focus') {
                    this.app.calculateAndUpdateUI();
                }
            }
        });

        // Save on calculate button click
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.dataManager.saveToLocalStorage();
            });
        }
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.switchSection(item));
        });
    }

    switchSection(navItem) {
        // Remove active class from all nav items and sections
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        // Activate clicked nav item and corresponding section
        navItem.classList.add('active');
        const sectionId = navItem.getAttribute('data-section');
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            
            // If switching to analytics section, ensure red pills calculator is initialized
            if (sectionId === 'analytics') {
                // Trigger a recalculation to ensure slider is initialized
                setTimeout(() => {
                    if (this.app && this.app.calculator) {
                        const results = this.app.calculator.getResults();
                        const playerData = this.app.calculator.getPlayerData();
                        if (results && playerData) {
                            const absorptionBonus = results.virya?.absorptionBonus || 0;
                            UIManager.updateRedPillsCalculator(playerData, results, absorptionBonus);
                        }
                    }
                }, 100);
            }
        }
    }

    handleExport() {
        if (this.dataManager.exportData()) {
            this.app.showNotification('Data exported successfully!');
        } else {
            this.app.showNotification('No data to export', true);
        }
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.dataManager.importData(e.target.result)) {
                this.app.showNotification('Data imported successfully!');
                this.dataManager.loadFromLocalStorage();
                // An imported file can carry anything, including values from a
                // save made before the limits were enforced.
                InputLimits.enforceAll();
                this.app.calculateAndUpdateUI();
            } else {
                this.app.showNotification('Invalid file format', true);
            }
        };
        reader.readAsText(file);
        
        event.target.value = ''; // Reset file input
    }

    handleClearStorage() {
        if (!confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
            return;
        }

        this.dataManager.clearLocalStorage();
        this.app.resetToDefaults();
        this.app.showNotification('Saved data cleared');
    }

    handleDebugToggle() {
        const enabled = this.app.calculator.toggleDebug();
        const button = document.getElementById('debug-toggle-btn');
        if (button) {
            if (enabled) {
                button.innerHTML = '<i class="fas fa-bug"></i> Debug ON';
                button.style.backgroundColor = 'var(--success)';
            } else {
                button.innerHTML = '<i class="fas fa-bug"></i> Toggle Debug';
                button.style.backgroundColor = 'var(--warning)';
            }
        }
        
        // Show/hide debug menu item
        UIManager.updateDebugMenuVisibility(enabled);
        
        this.app.showNotification(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
        
        // Update debug display if enabled
        if (enabled) {
            const results = this.app.calculator.getResults();
            const playerData = this.app.calculator.getPlayerData();
            if (results && playerData) {
                UIManager.updateDebugDisplay(playerData, results);
            }
        }
    }
}

export { EventManager };