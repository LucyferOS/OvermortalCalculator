import { CalculatorUtils } from './utils.js';

class DataManager {
    constructor(storageKey = 'overmortal_calculator_data') {
        this.storageKey = storageKey;
    }

    saveToLocalStorage() {
        try {
            const formData = {};
            
            // Get all input fields
            const inputs = document.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
            inputs.forEach(input => {
                if (input.id) {
                    formData[input.id] = input.value;
                }
            });
            
            // Get all select elements
            const selects = document.querySelectorAll('select');
            selects.forEach(select => {
                if (select.id) {
                    formData[select.id] = select.value;
                }
            });
            
            localStorage.setItem(this.storageKey, JSON.stringify(formData));
            console.log('Data saved to localStorage');
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) {
                const formData = JSON.parse(savedData);
                
                // Restore all saved values
                Object.keys(formData).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) {
                        element.value = formData[key];
                        
                        // Trigger change event for select elements
                        if (element.tagName === 'SELECT') {
                            element.dispatchEvent(new Event('change'));
                        }
                    }
                });
                
                console.log('Data loaded from localStorage');
                return true;
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
        return false;
    }

    clearLocalStorage() {
        localStorage.removeItem(this.storageKey);
        console.log('LocalStorage cleared');
        return true;
    }

    exportData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                // Create a prettified JSON string
                const jsonData = JSON.stringify(JSON.parse(data), null, 2);
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `overmortal-settings-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error exporting data:', error);
            return false;
        }
    }

    importData(jsonString) {
        try {
            const importedData = JSON.parse(jsonString);
            localStorage.setItem(this.storageKey, JSON.stringify(importedData));
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

export { DataManager };