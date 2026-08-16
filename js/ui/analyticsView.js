
// The analytics tab: the daily XP chart, the extractor comparison and the
// red-pill breakthrough calculator.

import { Analytics } from '../analytics/Analytics.js';
import { CalculatorUtils } from '../utilities/utils.js';
import { Dom } from './dom.js';
import { ViewState } from './viewState.js';

class AnalyticsView {
    static updateAnalytics(results, playerData) {
        
        try {
            // get the absorption bonus from the virya scenario
            const absorptionBonus = results.virya?.absorptionBonus || 0;
            
            // Calculate daily XP breakdown - this should match playerData.dailyXP
            // this is the main function that calculates the daily XP breakdown for the main path and the secondary path.
            const breakdown = Analytics.calculateDailyXPBreakdown(playerData, absorptionBonus);
            
            // Render daily XP pie chart
            Analytics.renderDailyXPChart('daily-xp-chart', breakdown);
            
            // Calculate extractor comparison
            const extractorComparison = Analytics.calculateExtractorComparison(playerData);
            
            // Render extractor comparison bar chart
            Analytics.renderExtractorChart('extractor-comparison-chart', extractorComparison);

            // Render the same comparison for the whole projected fruit stock
            const fruitTotals = Analytics.calculateFruitTotals(results);
            Analytics.renderFruitTotalChart('fruit-total-chart', fruitTotals);
            Dom.updateElementText('fruit-total-chart-note', this.describeFruitTotals(fruitTotals));

            // Update red pills calculator
            this.updateRedPillsCalculator(playerData, results, absorptionBonus);
            
        } catch (error) {
            console.error('Analytics update error:', error);
        }
        
    }

    /**
     * Spells out where the projected fruit count came from, so the bar heights
     * are not a number the player cannot account for.
     */
    static describeFruitTotals(totals) {
        if (totals.fruits <= 0) return 'No fruits projected by your next major breakthrough.';

        const horizon = CalculatorUtils.formatTimeDays(totals.horizonDays);
        const when = totals.horizonDays > 0 ? `in ${horizon} (${CalculatorUtils.formatDateFromDays(totals.horizonDays)})` : 'right now';
        const tokens = totals.tokens > 0 ? `, including ${totals.tokens} token${totals.tokens === 1 ? '' : 's'} spent` : '';

        return `${totals.fruits} fruits${tokens}, by your next major breakthrough ${when}.`;
    }

    static updateRedPillsCalculator(playerData, results, absorptionBonus) {

        try {
            // Store latest values
            ViewState.latestResults = results;
            ViewState.latestPlayerData = playerData;
            ViewState.latestAbsorptionBonus = absorptionBonus;
            
            // Get base time to next major realm - try both progression and realmProgression
            const baseTimeToNextMajor = results.realmProgression?.mainPath?.timeToNextMajor || 
                                        results.progression?.mainPath?.timeToNextMajor || 0;
            
            // Get slider element - try multiple times if not found
            let slider = document.getElementById('time-adjustment-slider');
            if (!slider) {
                // Try again after a short delay in case DOM isn't ready
                setTimeout(() => {
                    slider = document.getElementById('time-adjustment-slider');
                    if (slider) {
                        AnalyticsView.initializeSlider(slider, baseTimeToNextMajor, playerData, results, absorptionBonus);
                    }
                }, 100);
                return;
            }
            
            // Initialize or update slider
            this.initializeSlider(slider, baseTimeToNextMajor, playerData, results, absorptionBonus);
            
            // Set up event listener for current red pills input
            this.setupCurrentRedPillsListener();
            
        } catch (error) {
            console.error('Red pills calculator update error:', error);
        }
        
    }

    static initializeSlider(slider, baseTimeToNextMajor, playerData, results, absorptionBonus) {
        // Update slider max to match base time to next realm (always update this)
        if (baseTimeToNextMajor > 0) {
            slider.max = baseTimeToNextMajor;
            slider.disabled = false;
            slider.readOnly = false;
            slider.style.pointerEvents = 'auto';
            slider.style.opacity = '1';
            slider.style.cursor = 'pointer';
            slider.style.userSelect = 'none';
            slider.style.webkitUserSelect = 'none';
            slider.setAttribute('tabindex', '0'); // Make it focusable
            slider.removeAttribute('readonly');
            
            // Ensure current value doesn't exceed new max
            const currentValue = parseFloat(slider.value) || 0;
            if (currentValue > baseTimeToNextMajor) {
                slider.value = baseTimeToNextMajor;
            }
        } else {
            // If base time is 0, check if it's because player is at max realm or no daily XP
            // Allow slider to work with a reasonable default for testing purposes
            const hasDailyXP = playerData.dailyXP > 0;
            const isMaxRealm = playerData.mainPathRealmMajor === 'Supreme' && 
                              playerData.mainPathRealmMinor === 'Late' && 
                              playerData.mainPathProgress >= 100;
            
            if (isMaxRealm) {
                // Player is at max realm - show message
                slider.max = 0;
                slider.disabled = true;
            } else if (!hasDailyXP) {
                // No daily XP - slider can't calculate
                slider.max = 1000;
                slider.disabled = true;
            } else {
                // Unknown reason for 0 - enable with default max for testing
                slider.max = 1000;
                slider.disabled = false;
            }
        }
            
        // Initialize slider event listener if not already set
        if (!slider.dataset.initialized) {
            slider.dataset.initialized = 'true';
            
            // Handler for slider updates - use arrow function to preserve context
            const handleSliderUpdate = (e) => {
                try {
                    // Get the slider value
                    const sliderElement = e.target;
                    const timeReduction = parseFloat(sliderElement.value) || 0;
                    
                    // Use stored latest values
                    const currentResults = ViewState.latestResults;
                    const currentPlayerData = ViewState.latestPlayerData;
                    const currentAbsorptionBonus = ViewState.latestAbsorptionBonus;
                    
                    if (!currentResults || !currentPlayerData) {
                        return;
                    }
                    
                    const currentBaseTime = currentResults.realmProgression?.mainPath?.timeToNextMajor || 
                                           currentResults.progression?.mainPath?.timeToNextMajor || 0;
                    const adjustedTime = Math.max(0, currentBaseTime - timeReduction);
                    
                    AnalyticsView.calculateAndDisplayRedPills(
                        currentPlayerData, 
                        currentBaseTime, 
                        adjustedTime, 
                        timeReduction, 
                        currentAbsorptionBonus
                    );
                } catch (error) {
                    console.error('Slider handler error:', error);
                }
            };
            
            // Update on input (while dragging) for real-time feedback
            slider.addEventListener('input', handleSliderUpdate);
            
            // Update on change (when released) to ensure final calculation
            slider.addEventListener('change', handleSliderUpdate);
            
            // Also listen for mousedown to ensure interaction works
            slider.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent event bubbling
            });
            
            // Prevent any parent elements from blocking interaction
            slider.addEventListener('mousemove', (e) => {
                if (e.buttons === 1) { // Left mouse button is pressed
                    e.stopPropagation();
                }
            });
            

        }
        
        // Initial calculation
        const timeReduction = parseFloat(slider.value) || 0;
        const adjustedTime = Math.max(0, baseTimeToNextMajor - timeReduction);
        this.calculateAndDisplayRedPills(playerData, baseTimeToNextMajor, adjustedTime, timeReduction, absorptionBonus);
    }

    static calculateAndDisplayRedPills(playerData, baseTimeToNextMajor, adjustedTime, timeReduction, absorptionBonus) {
        const format = CalculatorUtils.formatLargeNumber;
        
        // Calculate red pills needed
        const calculation = Analytics.calculateRedPillsForBreakthrough(
            playerData, 
            baseTimeToNextMajor, 
            adjustedTime, 
            absorptionBonus
        );
        
        // Update base time display
        Dom.updateElementText('base-time-display', baseTimeToNextMajor.toFixed(1));
        
        // Update adjusted time display
        Dom.updateElementText('adjusted-time-display', adjustedTime.toFixed(1));
        
        // Update slider value display (show reduction amount)
        const sliderValueDisplay = document.getElementById('time-adjustment-value');
        if (sliderValueDisplay) {
            sliderValueDisplay.textContent = timeReduction.toFixed(1);
        }
        
        // Update results
        Dom.updateElementText('red-pills-xp-needed', format(calculation.xpNeeded));
        Dom.updateElementText('red-pills-xp-gained', format(calculation.xpGained));
        Dom.updateElementText('red-pills-xp-deficit', format(calculation.xpDeficit));
        Dom.updateElementText('red-pills-xp-per-pill', format(calculation.redPillXPPerPill));
        Dom.updateElementText('red-pills-current', (calculation.currentRedPills || 0).toLocaleString());
        Dom.updateElementText('red-pills-needed', calculation.redPillsNeeded.toLocaleString());
        
        // Highlight if red pills are needed
        const redPillsNeededElement = document.getElementById('red-pills-needed');
        if (redPillsNeededElement) {
            if (calculation.redPillsNeeded > 0) {
                redPillsNeededElement.style.color = 'var(--accent)';
                redPillsNeededElement.style.fontWeight = 'bold';
            } else {
                redPillsNeededElement.style.color = 'var(--success)';
                redPillsNeededElement.style.fontWeight = 'normal';
            }
        }
    }

    static setupCurrentRedPillsListener() {
        const currentRedPillsInput = document.getElementById('current-red-pills');
        if (!currentRedPillsInput) {
            return;
        }
        
        // Remove existing listener if any (by cloning and replacing)
        const newInput = currentRedPillsInput.cloneNode(true);
        currentRedPillsInput.parentNode.replaceChild(newInput, currentRedPillsInput);
        
        // Add event listener if not already initialized
        if (!newInput.dataset.redPillsListenerInitialized) {
            newInput.dataset.redPillsListenerInitialized = 'true';
            
            const handleCurrentRedPillsUpdate = () => {
                try {
                    // Use stored latest values
                    const currentResults = ViewState.latestResults;
                    const currentPlayerData = ViewState.latestPlayerData;
                    const currentAbsorptionBonus = ViewState.latestAbsorptionBonus;
                    
                    if (!currentResults || !currentPlayerData) {
                        return;
                    }
                    
                    // Update playerData with new current red pills value
                    const updatedPlayerData = {
                        ...currentPlayerData,
                        currentRedPills: parseFloat(newInput.value) || 0
                    };
                    
                    const currentBaseTime = currentResults.realmProgression?.mainPath?.timeToNextMajor || 
                                           currentResults.progression?.mainPath?.timeToNextMajor || 0;
                    
                    // Get current slider value
                    const slider = document.getElementById('time-adjustment-slider');
                    const timeReduction = slider ? (parseFloat(slider.value) || 0) : 0;
                    const adjustedTime = Math.max(0, currentBaseTime - timeReduction);
                    
                    AnalyticsView.calculateAndDisplayRedPills(
                        updatedPlayerData,
                        currentBaseTime,
                        adjustedTime,
                        timeReduction,
                        currentAbsorptionBonus
                    );
                } catch (error) {
                    console.error('Current red pills handler error:', error);
                }
            };
            
            // Update on input (while typing) for real-time feedback
            newInput.addEventListener('input', handleCurrentRedPillsUpdate);
            
            // Update on change (when focus is lost) to ensure final calculation
            newInput.addEventListener('change', handleCurrentRedPillsUpdate);
            
        }
    }

}

export { AnalyticsView };
