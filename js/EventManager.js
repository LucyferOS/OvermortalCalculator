import { DataManager } from './DataManager.js';
import { CalculatorUtils } from './utils.js';

class EventManager {
    constructor(app) {
        this.app = app;
        this.dataManager = new DataManager();
        this.saveTimeout = null;
    }

    setupEventListeners() {
        // Calculation and reset
        document.getElementById('calculate-btn').addEventListener('click', () => 
            this.app.calculateAndUpdateUI()
        );
        
        document.getElementById('reset-btn').addEventListener('click', () => 
            this.app.resetToDefaults()
        );

        // Local storage management
        this.setupLocalStorageListeners();
        
        // Data import/export
        document.getElementById('export-data-btn').addEventListener('click', () => 
            this.handleExport()
        );
        
        document.getElementById('import-data-btn').addEventListener('click', () => 
            document.getElementById('import-file-input').click()
        );
        
        document.getElementById('import-file-input').addEventListener('change', (event) => 
            this.handleFileImport(event)
        );
        
        document.getElementById('clear-storage-btn').addEventListener('click', () => 
            this.handleClearStorage()
        );

        // Navigation
        this.setupNavigation();
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
            }
        });

        // Save on calculate button click
        document.getElementById('calculate-btn').addEventListener('click', () => {
            this.dataManager.saveToLocalStorage();
        });
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
        document.getElementById(sectionId).classList.add('active');
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
}

export { EventManager };