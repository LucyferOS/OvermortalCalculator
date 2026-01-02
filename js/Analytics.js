import { XPCalculator } from './XPCalculator.js';
import { FruitCalculator } from './FruitCalculator.js';
import { recommendations } from './Recommendations.js';
import { GameConstants, XPData } from './gameData.js';
import { CalculatorUtils } from './utils.js';

class Analytics {
    /**
     * Calculate individual pill XP breakdown
     * @param {Object} playerData - Player data object
     * @returns {Object} Object with individual pill XP values
     */
    static calculatePillXPBreakdown(playerData) {
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        if (!realmXP) {
            return {
                goldPills: 0,
                purplePills: 0,
                bluePills: 0,
                elixir: 0,
                benediction: 0,
                redPills: 0
            };
        }

        const goldPillXP = realmXP.gold 
            * (1 + (playerData.pillBonusNirvanaChariotMansion / 100)) 
            * playerData.goldPill;
        
        const purplePillXP = realmXP.purple 
            * (1 + (playerData.pillBonusNirvanaTurtleBeakMansion / 100)) 
            * playerData.purplePill;
        
        const bluePillXP = realmXP.blue 
            * (1 + (playerData.pillBonusNirvanaGhostMansion / 100)) 
            * playerData.bluePill;
        
        const elixirXP = XPCalculator.calculateElixirXPWithEfficiency(playerData, playerData.elixir || 0);
        
        const benedictionXP = XPCalculator.calculateBenedictionXPWithEfficiency(playerData, playerData.benediction || 0);
        
        const numRedPills = XPCalculator.calculateRedPills(playerData);
        const redPillXP = realmXP.red * (1 + GameConstants.vaseBonus[playerData.vaseStars]) * numRedPills;
        
        // Apply pill bonus multiplier (pillBonus is already a multiplier like 1.XX)
        // The total is multiplied by pillBonus * 1000, so apply the same to each component
        const pillBonus = playerData.pillBonus || 1;
        const multiplier = pillBonus * 1000;

        return {
            goldPills: goldPillXP * multiplier,
            purplePills: purplePillXP * multiplier,
            bluePills: bluePillXP * multiplier,
            elixir: elixirXP * multiplier,
            benediction: benedictionXP * multiplier,
            redPills: redPillXP * multiplier
        };
    }

    /**
     * Calculate the breakdown of daily XP by source
     * @param {Object} playerData - Player data object
     * @param {number} absorptionBonus - Absorption bonus from Virya (0-0.4)
     * @returns {Object} Object with abodeAura, gemBonus, individual pill types, respira, and total
     */
    static calculateDailyXPBreakdown(playerData, absorptionBonus) {
        const abodeAura = XPCalculator.calculateAbodeAuraXP(playerData, absorptionBonus);
        const gemBonus = abodeAura * (GameConstants.gemQuality[playerData.gemQuality] || 0);
        
        // Get individual pill breakdown
        const pillBreakdown = this.calculatePillXPBreakdown(playerData);
        
        const respira = XPCalculator.calculateRespiraXP(playerData);
        
        // Calculate total pills XP
        const totalPills = pillBreakdown.goldPills + pillBreakdown.purplePills + 
                          pillBreakdown.bluePills + pillBreakdown.elixir + 
                          pillBreakdown.benediction + pillBreakdown.redPills;
        
        const total = abodeAura + gemBonus + totalPills + respira;

        return {
            abodeAura,
            gemBonus,
            ...pillBreakdown,
            respira,
            total
        };
    }

    /**
     * Calculate comparison between current and max extractor fruit XP
     * @param {Object} playerData - Player data object
     * @returns {Object} Object with current and max fruit XP values
     */
    static calculateExtractorComparison(playerData) {
        // Current extractor fruit XP (per fruit)
        const currentFruitXP = FruitCalculator.fruitXP(playerData);
        
        // Max extractor fruit XP (level 30)
        const maxExtractorResult = recommendations.calculateMaxLevelXP(playerData, 30);
        const maxFruitXP = maxExtractorResult.fruitXPSingle;

        return {
            current: currentFruitXP,
            max: maxFruitXP
        };
    }

    /**
     * Render daily XP sources pie chart
     * @param {string} canvasId - ID of the canvas element
     * @param {Object} breakdown - Breakdown object from calculateDailyXPBreakdown
     */
    static renderDailyXPChart(canvasId, breakdown) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id "${canvasId}" not found`);
            return;
        }

        // Destroy existing chart if it exists
        if (window[`${canvasId}Chart`]) {
            window[`${canvasId}Chart`].destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Prepare data with individual pill types
        const dataSources = [
            { label: 'Abode Aura', value: breakdown.abodeAura, color: '--primary' },
            { label: 'Gem Bonus', value: breakdown.gemBonus, color: '--secondary' },
            { label: 'Gold Pills', value: breakdown.goldPills || 0, color: '#FFD700' },
            { label: 'Purple Pills', value: breakdown.purplePills || 0, color: '#9D4EDD' },
            { label: 'Blue Pills', value: breakdown.bluePills || 0, color: '#4361EE' },
            { label: 'Elixir', value: breakdown.elixir || 0, color: '#06FFA5' },
            { label: 'Blessing Pills', value: breakdown.benediction || 0, color: '#FF9F00' },
            { label: 'Red Pills', value: breakdown.redPills || 0, color: '#E63946' },
            { label: 'Respira', value: breakdown.respira, color: '--accent' }
        ];
        
        // Filter out zero values
        const validSources = dataSources.filter(source => source.value > 0);
        
        const data = validSources.map(source => source.value);
        const labels = validSources.map(source => source.label);
        
        // Store the mapping of labels to values for calculating modified total
        const labelToValueMap = {};
        validSources.forEach(source => {
            labelToValueMap[source.label] = source.value;
        });
        
        // Colors - use custom colors for pills, CSS variables for others
        const colors = validSources.map(source => {
            if (source.color.startsWith('--')) {
                return getComputedStyle(document.documentElement).getPropertyValue(source.color).trim() || '#2A3B47';
            }
            return source.color;
        });

        // Create chart - use window.Chart if Chart is not available in module scope
        const ChartConstructor = typeof Chart !== 'undefined' ? Chart : (typeof window !== 'undefined' ? window.Chart : null);
        if (!ChartConstructor) {
            console.error('Chart.js is not available');
            return;
        }
        
        // Create chart
        let chart;
        try {
            chart = new ChartConstructor(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            font: {
                                size: 14
                            }
                        },
                        onClick: (e, legendItem, legend) => {
                            // Get the chart instance
                            const chart = legend.chart;
                            // Get the index of the clicked legend item
                            const index = legendItem.datasetIndex;
                            const ci = chart.legend.legendItems[legendItem.index];
                            if (ci) {
                                // Toggle the visibility
                                const meta = chart.getDatasetMeta(0);
                                meta.data[legendItem.index].hidden = !meta.data[legendItem.index].hidden;
                                chart.update();
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                try {
                                    const label = context.label || '';
                                    // For doughnut charts in Chart.js v4, try multiple ways to access value
                                    let value = 0;
                                    if (context.parsed !== undefined && typeof context.parsed === 'number') {
                                        value = context.parsed;
                                    } else if (context.raw !== undefined && typeof context.raw === 'number') {
                                        value = context.raw;
                                    } else if (context.dataset && context.dataset.data && context.dataIndex !== undefined) {
                                        value = context.dataset.data[context.dataIndex] || 0;
                                    }
                                    const total = breakdown.total;
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
                                    return `${label}: ${CalculatorUtils.formatLargeNumber(value)} (${percentage}%)`;
                                } catch (error) {
                                    return context.label || '';
                                }
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    const chartArea = chart.chartArea;
                    const total = breakdown.total;
                    
                    // Check if any element is active (hovered)
                    const activeElements = chart.getActiveElements();
                    if (activeElements.length === 0 && total > 0) {
                        // Calculate modified total by checking which segments are hidden
                        const meta = chart.getDatasetMeta(0);
                        let modifiedTotal = total;
                        let hasHiddenItems = false;
                        
                        // Check each data point to see if it's hidden
                        meta.data.forEach((element, index) => {
                            if (element.hidden) {
                                const label = chart.data.labels[index];
                                const value = labelToValueMap[label] || 0;
                                modifiedTotal -= value;
                                hasHiddenItems = true;
                            }
                        });
                        
                        ctx.save();
                        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2A3B47';
                        ctx.font = 'bold 24px Inter, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        const centerX = (chartArea.left + chartArea.right) / 2;
                        const centerY = (chartArea.top + chartArea.bottom) / 2;
                        
                        // Show "Modified Daily XP" if items are hidden, otherwise "Total Daily XP"
                        const labelText = hasHiddenItems ? 'Modified Daily XP' : 'Total Daily XP';
                        ctx.fillText(labelText, centerX, centerY - 15);
                        
                        ctx.font = 'bold 20px Inter, sans-serif';
                        ctx.fillText(CalculatorUtils.formatLargeNumber(modifiedTotal), centerX, centerY + 15);
                        
                        ctx.restore();
                    }
                }
            }]
            });
        } catch (error) {
            console.error('Error creating chart:', error);
            return;
        }

        // Store chart reference
        window[`${canvasId}Chart`] = chart;
    }

    /**
     * Render extractor comparison horizontal bar chart
     * @param {string} canvasId - ID of the canvas element
     * @param {Object} comparison - Comparison object from calculateExtractorComparison
     */
    static renderExtractorChart(canvasId, comparison) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id "${canvasId}" not found`);
            return;
        }

        // Destroy existing chart if it exists
        if (window[`${canvasId}Chart`]) {
            window[`${canvasId}Chart`].destroy();
        }

        const ctx = canvas.getContext('2d');

        // Create chart
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Current Extractor', 'Max Extractor (Level 30)'],
                datasets: [{
                    label: 'Fruit XP per Fruit',
                    data: [comparison.current, comparison.max],
                    backgroundColor: [
                        getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#5A7684',
                        getComputedStyle(document.documentElement).getPropertyValue('--success').trim() || '#4A8B6E'
                    ],
                    borderColor: [
                        getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2A3B47',
                        getComputedStyle(document.documentElement).getPropertyValue('--success').trim() || '#4A8B6E'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Fruit XP: ${CalculatorUtils.formatLargeNumber(context.parsed.x)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return CalculatorUtils.formatLargeNumber(value);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Fruit XP per Fruit',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });

        // Store chart reference
        window[`${canvasId}Chart`] = chart;
    }
}

export { Analytics };