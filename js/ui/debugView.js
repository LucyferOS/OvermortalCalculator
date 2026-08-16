
// The debug tab: raw player data and calculation results.

import { GameConstants, RealmMajorTotalXP, Realms, XPData, timegateLength } from '../utilities/gameData.js';

class DebugView {
    static updateDebugMenuVisibility(enabled) {
        const debugNavItem = document.querySelector('.nav-item[data-section="debug"]');
        const debugSection = document.getElementById('debug');
        
        if (debugNavItem) {
            if (enabled) {
                // Show the menu item (restore flex display to match other nav items)
                debugNavItem.style.display = 'flex';
            } else {
                // Hide the menu item
                debugNavItem.style.display = 'none';
                
                // If debug section is currently active, switch to dashboard
                if (debugSection && debugSection.classList.contains('active')) {
                    const dashboardNavItem = document.querySelector('.nav-item[data-section="dashboard"]');
                    const dashboardSection = document.getElementById('dashboard');
                    if (dashboardNavItem && dashboardSection) {
                        // Remove active class from all nav items and sections
                        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                        // Activate dashboard
                        dashboardNavItem.classList.add('active');
                        dashboardSection.classList.add('active');
                    }
                }
            }
        }
    }

    static updateDebugDisplay(playerData, results) {
        let collapseCounter = 0;
        
        // Helper function to format a value for display
        const formatValue = (value, isNested = false) => {
            if (value === null) {
                return '<em style="color: #999;">null</em>';
            } else if (value === undefined) {
                return '<em style="color: #999;">undefined</em>';
            } else if (typeof value === 'number') {
                return value % 1 !== 0 
                    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : value.toLocaleString();
            } else if (typeof value === 'boolean') {
                return `<strong style="color: ${value ? '#4A8B6E' : '#C76B6B'}">${String(value)}</strong>`;
            } else if (typeof value === 'string') {
                return value;
            } else if (Array.isArray(value)) {
                if (value.length === 0) {
                    return '<em style="color: #999;">[]</em>';
                }
                // Format arrays as a collapsible nested table
                const collapseId = `collapse-${collapseCounter++}`;
                const itemCount = value.length;
                let arrayHtml = `<div class="debug-nested-wrapper" style="margin: 8px 0;">
                    <button class="debug-toggle-btn collapsed" onclick="this.classList.toggle('collapsed'); this.nextElementSibling.style.display = this.classList.contains('collapsed') ? 'none' : 'block';" aria-label="Toggle nested content">
                        <span class="debug-toggle-icon">▼</span>
                        <span class="debug-toggle-text">Array (${itemCount} items)</span>
                    </button>
                    <div class="debug-nested-content" style="display: none;">
                        <table class="debug-nested-table" style="width: 100%; border: 1px solid var(--border); border-radius: 4px; background-color: #f9f9f9;">
                            <thead><tr><th style="width: 60px; padding: 8px 12px;">Index</th><th style="padding: 8px 12px;">Value</th></tr></thead>
                            <tbody>`;
                value.forEach((item, index) => {
                    arrayHtml += `<tr><td style="padding: 8px 12px; font-weight: 500; color: var(--primary);">${index}</td><td style="padding: 8px 12px;">${formatValue(item, true)}</td></tr>`;
                });
                arrayHtml += `</tbody></table></div></div>`;
                return arrayHtml;
            } else if (typeof value === 'object') {
                // Format nested objects as collapsible nested tables
                const collapseId = `collapse-${collapseCounter++}`;
                const keyCount = Object.keys(value).length;
                let nestedHtml = `<div class="debug-nested-wrapper" style="margin: 8px 0;">
                    <button class="debug-toggle-btn collapsed" onclick="this.classList.toggle('collapsed'); this.nextElementSibling.style.display = this.classList.contains('collapsed') ? 'none' : 'block';" aria-label="Toggle nested content">
                        <span class="debug-toggle-icon">▼</span>
                        <span class="debug-toggle-text">Object (${keyCount} properties)</span>
                    </button>
                    <div class="debug-nested-content" style="display: none;">
                        <table class="debug-nested-table" style="width: 100%; border: 1px solid var(--border); border-radius: 4px; background-color: #f9f9f9;">
                            <thead><tr><th style="padding: 8px 12px;">Property</th><th style="padding: 8px 12px;">Value</th></tr></thead>
                            <tbody>`;
                for (const [nestedKey, nestedValue] of Object.entries(value)) {
                    nestedHtml += `<tr><td style="padding: 8px 12px; font-weight: 500;">${nestedKey}</td><td style="padding: 8px 12px;">${formatValue(nestedValue, true)}</td></tr>`;
                }
                nestedHtml += `</tbody></table></div></div>`;
                return nestedHtml;
            }
            return String(value);
        };

        // Helper function to format object as HTML table
        const formatObjectAsTable = (obj) => {
            if (!obj || typeof obj !== 'object') {
                return '<table><tbody><tr><td>No data available</td></tr></tbody></table>';
            }

            let html = '<table><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody>';
            
            for (const [key, value] of Object.entries(obj)) {
                html += `<tr><td><strong>${key}</strong></td><td>${formatValue(value)}</td></tr>`;
            }
            
            html += '</tbody></table>';
            return html;
        };

        // Prepare game data object
        const gameData = {
            Realms,
            XPData,
            GameConstants,
            RealmMajorTotalXP,
            timegateLength
        };

        // Update Game Data section
        const gameDataElement = document.getElementById('debug-game-data');
        if (gameDataElement) {
            gameDataElement.innerHTML = formatObjectAsTable(gameData);
        }

        // Update Player Input section
        const playerInputElement = document.getElementById('debug-player-input');
        if (playerInputElement) {
            if (playerData) {
                playerInputElement.innerHTML = formatObjectAsTable(playerData);
            } else {
                playerInputElement.innerHTML = '<p>Player data not available</p>';
            }
        }

        // Update Calculations section
        const calculationsElement = document.getElementById('debug-calculations');
        if (calculationsElement) {
            if (results) {
                calculationsElement.innerHTML = formatObjectAsTable(results);
            } else {
                calculationsElement.innerHTML = '<p>Calculation results not available</p>';
            }
        }
    }

}

export { DebugView };
