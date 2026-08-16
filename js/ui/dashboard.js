
// The dashboard: path progress, fruit displays, timegate info and focus
// indicators. Delegates the Virya table and analytics to their own modules.

import { PATH_MAIN, PATH_SECONDARY, REALM_ORDER_MAJOR, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_HALF_STEP, SCENARIO_PERFECT, timegateLength } from '../utilities/gameData.js';
import { AnalyticsView } from './analyticsView.js';
import { CalculatorUtils } from '../utilities/utils.js';
import { Dom } from './dom.js';
import { ViewState } from './viewState.js';
import { ViryaTable } from './viryaTable.js';

class Dashboard {
    static updateDashboard(results, playerData) {
        // Update Virya display - this is the main display that shows the virya scenario and the bonus.
        if (results.virya) {
            ViryaTable.updateViryaDisplay(results.virya, playerData, results.dailyXP, results.mainPathDailyXPBase, results.secondaryPathDailyXPBase);
        }
        
        // Update basic path information
        Dom.updateElementText('main-path-realm-display', playerData.mainPathRealm);
        Dom.updateElementText('main-path-progress-display', `${playerData.mainPathProgress.toFixed(1)}%`);
        Dom.updateElementText('secondary-path-realm-display', playerData.secondaryPathRealm);
        Dom.updateElementText('secondary-path-progress-display', `${playerData.secondaryPathProgress.toFixed(1)}%`);
        Dom.updateElementText('path-focus-display', playerData.pathFocus);
        
        // Update path focus indicators
        this.updatePathFocusIndicators(playerData.pathFocus);
        
        // Update main path results
        if (results.realmProgression?.mainPath) {
            this.updatePathResults('main', results.realmProgression.mainPath, playerData.pathFocus === PATH_MAIN);
        }

        // Update secondary path results
        if (results.realmProgression?.secondaryPath) {
            this.updatePathResults('secondary', results.realmProgression.secondaryPath, playerData.pathFocus === PATH_SECONDARY);
        }

        this.updateFruitDisplays(results);
        this.updateMaxFruitDisplays(results);
        this.updateFruitRecommendations(results);
        
        // Update Virya comparison cells
        if (results.scenarioComparisons) {
            ViryaTable.updateViryaComparisonCells(results.scenarioComparisons);
        }
        
        // Update timegate information
        this.updateTimegateInfo(playerData);
        
        // Store latest values for red pills calculator
        ViewState.latestResults = results;
        ViewState.latestPlayerData = playerData;
        
        // Update analytics
        AnalyticsView.updateAnalytics(results, playerData);
    }

    static updatePathResults(prefix, pathData, isFocused = false) {
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;

        // Minor realm
        if (pathData.progressPercentMinor >= 100) {
            Dom.updateElementText(`${prefix}-minor-time-display`, 'At or beyond 100%');
            Dom.updateElementText(`${prefix}-minor-date-display`, '--');
        } else {
            Dom.updateElementText(`${prefix}-minor-time-display`, format(pathData.timeToNextMinor));
            Dom.updateElementText(`${prefix}-minor-date-display`, `Estimated: ${formatDate(pathData.timeToNextMinor)}`);
        }
        Dom.updateProgressBar(`${prefix}-minor-progress-display`, pathData.progressPercentMinor);
        
        // Add focus indicator to minor result box
        const minorResultBox = document.querySelector(`#${prefix}-minor-time-display`)?.closest('.result-box');
        if (minorResultBox) {
            if (isFocused) {
                minorResultBox.classList.add('path-focused');
            } else {
                minorResultBox.classList.remove('path-focused');
            }
        }

        // Major realm
        if (pathData.progressPercentMajor >= 100) {
            Dom.updateElementText(`${prefix}-major-time-display`, 'At or beyond 100%');
            Dom.updateElementText(`${prefix}-major-date-display`, '--');
        } else {
            Dom.updateElementText(`${prefix}-major-time-display`, format(pathData.timeToNextMajor));
            Dom.updateElementText(`${prefix}-major-date-display`, `Estimated: ${formatDate(pathData.timeToNextMajor)}`);
        }
        Dom.updateProgressBar(`${prefix}-major-progress-display`, pathData.progressPercentMajor);
        
        // Add focus indicator to major result box
        const majorResultBox = document.querySelector(`#${prefix}-major-time-display`)?.closest('.result-box');
        if (majorResultBox) {
            if (isFocused) {
                majorResultBox.classList.add('path-focused');
            } else {
                majorResultBox.classList.remove('path-focused');
            }
        }
    }

    /**
     * The four breakthroughs the fruit cards show. All four are measured
     * against the same fruit stock - the one the player will hold when the
     * current timegate lifts - so they no longer carry a per-row projection.
     *
     * `rate` names the daily XP the saving is quoted at. These are the *base*
     * rates, not the focus-dependent ones: what a fruit is worth does not
     * change because the player pointed their focus elsewhere, and using the
     * focus-dependent rate made the unfocused path's saving explode.
     */
    static FRUIT_ROWS = [
        { path: 'mainPath', time: 'timeToNextMinor', rate: 'mainPathDailyXPBase', suffix: 'minor-main' },
        { path: 'mainPath', time: 'timeToNextMajor', rate: 'mainPathDailyXPBase', suffix: 'major-main' },
        { path: 'secondaryPath', time: 'timeToNextMinor', rate: 'secondaryPathDailyXPBase', suffix: 'minor-secondary' },
        { path: 'secondaryPath', time: 'timeToNextMajor', rate: 'secondaryPathDailyXPBase', suffix: 'major-secondary' }
    ];

    static updateFruitDisplays(results) {
        this.renderFruitCard(results, { prefix: 'fruits', xpKey: 'fruitXPTotal' });
    }

    static updateMaxFruitDisplays(results) {
        this.renderFruitCard(results, { prefix: 'fruits-max', xpKey: 'fruitXPTotalMax' });
    }

    /**
     * Renders one of the two fruit cards. They differ only in which extractor
     * the fruit XP was costed at and which element ids they write to.
     */
    static renderFruitCard(results, { prefix, xpKey }) {
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;

        // One stock, one XP total: every row is measured against the fruits the
        // player will hold when the timegate lifts.
        const fruitXP = results.fruitProjection?.[xpKey] || 0;
        const daysSavedAt = (dailyXP) => ((fruitXP > 0 && dailyXP > 0) ? fruitXP / dailyXP : 0);

        // The headline is the main path's saving.
        const headlineSaved = daysSavedAt(results.mainPathDailyXPBase || 0);
        Dom.updateElementText(`${prefix}-days-saved-display`, headlineSaved > 0 ? format(headlineSaved) : '0d');

        for (const { path, time, rate, suffix } of Dashboard.FRUIT_ROWS) {
            const pathData = results.realmProgression?.[path];
            if (!pathData) continue;

            const daysSaved = daysSavedAt(results[rate] || 0);
            const timeWithFruits = Math.max(0, pathData[time] - daysSaved);

            if (daysSaved > 0 && timeWithFruits === 0) {
                Dom.updateElementText(`${prefix}-${suffix}-time-display`, 'You can reach the next realm!');
                Dom.updateElementText(`${prefix}-${suffix}-date-display`, '');
            } else {
                Dom.updateElementText(`${prefix}-${suffix}-time-display`, format(timeWithFruits));
                Dom.updateElementText(`${prefix}-${suffix}-date-display`, timeWithFruits > 0 ? `Estimated: ${formatDate(timeWithFruits)}` : '');
            }
        }
    }

    static updateFruitRecommendations(results) {
        
        const scenarios = [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
        
        scenarios.forEach(scenario => {
            const scenarioKey = scenario.toLowerCase().replace('-', '');
            const fruitResult = results.scenarioFruitResults?.[scenario];
            const xpNeeded = results.scenarioXPNeeded?.[scenario];
            const row = document.getElementById(`fruits-row-${scenarioKey}`);
            
            if (!fruitResult) {
                // No fruit result for this scenario
                Dom.updateCell(`${scenarioKey}-gush`, '--');
                Dom.updateCell(`${scenarioKey}-xp`, '--');
                Dom.updateCell(`${scenarioKey}-quality`, '--');
                Dom.updateCell(`${scenarioKey}-min-xp`, '--');
                Dom.updateCell(`${scenarioKey}-max-xp`, '--');
                Dom.updateCell(`${scenarioKey}-overflow-xp`, '--');
                
                if (row) {
                    row.classList.remove('achievable', 'not-achievable');
                    row.classList.add('not-applicable');
                    row.title = `No fruit recommendation available for ${scenario}`;
                }
                return;
            }
            
            if (fruitResult.recommendedSolution) {
                const rec = fruitResult.recommendedSolution;
                const max = fruitResult.maxLevelComparison;
                const comparison = fruitResult.comparison;
                
                // Update level cells with color coding based on efficiency
                Dom.updateCell(`${scenarioKey}-gush`, rec.gushLevel);
                Dom.updateCell(`${scenarioKey}-xp`, rec.xpLevel);
                Dom.updateCell(`${scenarioKey}-quality`, rec.qualityLevel);
                
                // Update XP cells (formatted)
                const minXPFormatted = CalculatorUtils.formatLargeNumber(rec.fruitXPTotal);
                const maxXPFormatted = CalculatorUtils.formatLargeNumber(max.fruitXPTotal);
                
                Dom.updateCell(`${scenarioKey}-min-xp`, minXPFormatted);
                Dom.updateCell(`${scenarioKey}-max-xp`, maxXPFormatted);
                
                // Calculate if we can reach the scenario
                const canReach = rec.fruitXPTotal >= (xpNeeded || Infinity);
                
                // Update overflow/efficiency cell
                let efficiencyText;
                if (canReach) {
                    if (xpNeeded > 0) {
                        const excess = rec.fruitXPTotal - xpNeeded;
                        const excessPercent = (excess / rec.fruitXPTotal * 100).toFixed(1);
                        efficiencyText = `${comparison.singleXPPercentOfMax} of max`;
                        if (excess > 0) {
                            efficiencyText += ` (+${CalculatorUtils.formatLargeNumber(excess)} XP)`;
                        }
                    } else {
                        efficiencyText = `${comparison.singleXPPercentOfMax} of max`;
                    }
                } else {
                    const deficit = xpNeeded - rec.fruitXPTotal;
                    efficiencyText = `${comparison.singleXPPercentOfMax} of max (need ${CalculatorUtils.formatLargeNumber(deficit)} more)`;
                }
                
                Dom.updateCell(`${scenarioKey}-overflow-xp`, efficiencyText);
                
                // Style the row
                if (row) {
                    row.classList.remove('not-achievable', 'not-applicable');
                    
                    if (canReach) {
                        row.classList.add('achievable');
                        row.title = `Using ${rec.totalLevels} total levels, you can reach ${scenario} with current fruits`;
                    } else {
                        row.classList.add('not-achievable');
                        row.title = `Cannot reach ${scenario} even with current fruits at max extractor levels`;
                    }
                    
                    // Add tooltip with more details
                    if (rec.alreadyMeetsTarget) {
                        row.classList.add('already-met');
                        row.title = `Already meets ${scenario} requirements with current fruits`;
                    }
                }
            } else {
                // No solution found (can't reach scenario even with fruits)
                Dom.updateCell(`${scenarioKey}-gush`, 'N/A');
                Dom.updateCell(`${scenarioKey}-xp`, 'N/A');
                Dom.updateCell(`${scenarioKey}-quality`, 'N/A');
                Dom.updateCell(`${scenarioKey}-min-xp`, 'Cannot reach');
                
                const maxXP = fruitResult.maxLevelComparison?.fruitXPTotal || 0;
                Dom.updateCell(`${scenarioKey}-max-xp`, CalculatorUtils.formatLargeNumber(maxXP));
                
                // Show how far we are from target
                if (xpNeeded > 0 && xpNeeded !== Infinity) {
                    const deficit = xpNeeded - maxXP;
                    if (deficit > 0) {
                        Dom.updateCell(`${scenarioKey}-overflow-xp`, `Need ${CalculatorUtils.formatLargeNumber(deficit)} more XP`);
                    } else {
                        Dom.updateCell(`${scenarioKey}-overflow-xp`, 'Cannot calculate');
                    }
                } else {
                    Dom.updateCell(`${scenarioKey}-overflow-xp`, '--');
                }
                
                if (row) {
                    row.classList.remove('achievable', 'not-applicable');
                    row.classList.add('not-achievable');
                    row.title = `Cannot reach ${scenario} even with max extractor levels`;
                }
            }
        });
        
    }

    static updateTimegateInfo(playerData) {
        
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;
        
        // Calculate time to current timegate
        const currentTimegateDays = playerData.timegateDays || 0;
        
        // Calculate time to next realm timegate
        const currentMajor = playerData.mainPathRealmMajor;
        const currentIndex = REALM_ORDER_MAJOR.indexOf(currentMajor);
        const nextMajor = currentIndex < REALM_ORDER_MAJOR.length - 1 ? REALM_ORDER_MAJOR[currentIndex + 1] : null;
        const nextTimegateLength = nextMajor ? (timegateLength[nextMajor] || 0) : 0;
        const totalDaysToNextTimegate = currentTimegateDays + nextTimegateLength;
        
        // Update current timegate display
        if (currentTimegateDays > 0) {
            Dom.updateElementText('timegate-current-time', format(currentTimegateDays));
            Dom.updateElementText('timegate-current-date', `Est: ${formatDate(currentTimegateDays)}`);
        } else {
            Dom.updateElementText('timegate-current-time', 'N/A');
            Dom.updateElementText('timegate-current-date', '--');
        }
        
        // Update next realm timegate display
        if (nextMajor && totalDaysToNextTimegate > 0) {
            Dom.updateElementText('timegate-next-time', format(totalDaysToNextTimegate));
            Dom.updateElementText('timegate-next-date', `Est: ${formatDate(totalDaysToNextTimegate)}`);
        } else {
            Dom.updateElementText('timegate-next-time', nextMajor ? 'N/A' : 'Last realm');
            Dom.updateElementText('timegate-next-date', '--');
        }
        
    }

    static updatePathFocusIndicators(pathFocus) {
        const mainPathSection = document.getElementById('main-path-section');
        const secondaryPathSection = document.getElementById('secondary-path-section');
        const mainPathBadge = document.getElementById('main-path-focus-badge');
        const secondaryPathBadge = document.getElementById('secondary-path-focus-badge');
        
        // Update main path input section
        if (mainPathSection && mainPathBadge) {
            if (pathFocus === PATH_MAIN) {
                mainPathSection.classList.add('focused');
                mainPathBadge.classList.add('focused');
                mainPathBadge.textContent = 'Focused';
            } else {
                mainPathSection.classList.remove('focused');
                mainPathBadge.classList.remove('focused');
                mainPathBadge.textContent = 'Not Focused';
            }
        }
        
        // Update secondary path input section
        if (secondaryPathSection && secondaryPathBadge) {
            if (pathFocus === PATH_SECONDARY) {
                secondaryPathSection.classList.add('focused');
                secondaryPathBadge.classList.add('focused');
                secondaryPathBadge.textContent = 'Focused';
            } else {
                secondaryPathSection.classList.remove('focused');
                secondaryPathBadge.classList.remove('focused');
                secondaryPathBadge.textContent = 'Not Focused';
            }
        }
        
        // Update dashboard path realm displays with focus indicators
        const mainPathRealmDisplay = document.getElementById('main-path-realm-display');
        const secondaryPathRealmDisplay = document.getElementById('secondary-path-realm-display');
        
        if (mainPathRealmDisplay) {
            // Get the base text without focus indicator (handle both textContent and innerHTML)
            let baseText = mainPathRealmDisplay.textContent.replace(/\s● Focused$/, '').trim();
            if (pathFocus === PATH_MAIN) {
                mainPathRealmDisplay.innerHTML = `${baseText} <span style="color: var(--success); font-size: 0.85em; margin-left: 8px;">● Focused</span>`;
            } else {
                mainPathRealmDisplay.textContent = baseText;
            }
        }
        
        if (secondaryPathRealmDisplay) {
            // Get the base text without focus indicator
            let baseText = secondaryPathRealmDisplay.textContent.replace(/\s● Focused$/, '').trim();
            if (pathFocus === PATH_SECONDARY) {
                secondaryPathRealmDisplay.innerHTML = `${baseText} <span style="color: var(--success); font-size: 0.85em; margin-left: 8px;">● Focused</span>`;
            } else {
                secondaryPathRealmDisplay.textContent = baseText;
            }
        }
        
        // Update all dashboard result boxes with data-path attributes to show focus
        const mainResultBoxes = document.querySelectorAll(`.result-box[data-path="${PATH_MAIN}"]`);
        const secondaryResultBoxes = document.querySelectorAll(`.result-box[data-path="${PATH_SECONDARY}"]`);
        
        mainResultBoxes.forEach((box) => {
            if (pathFocus === PATH_MAIN) {
                box.classList.add('focused');
            } else {
                box.classList.remove('focused');
            }
        });
        
        secondaryResultBoxes.forEach((box) => {
            if (pathFocus === PATH_SECONDARY) {
                box.classList.add('focused');
            } else {
                box.classList.remove('focused');
            }
        });
    }

    static updateAbodeEasyModeVisibility() {
        const easyModeSelect = document.getElementById('abode-easy-mode');
        const isEasyMode = easyModeSelect?.value === 'Yes';

        const easyFields = document.getElementById('abode-easy-fields');
        if (easyFields) {
            easyFields.classList.toggle('hidden', !isEasyMode);
        }

        const stageSpecificCard = document.getElementById('stage-specific-mechanics-card');
        if (stageSpecificCard) {
            stageSpecificCard.classList.toggle('hidden', isEasyMode);
        }

        ['abode-aura-technique', 'abode-aura-curio'].forEach((fieldId) => {
            const inputGroup = document.getElementById(fieldId)?.closest('.input-group');
            if (inputGroup) {
                inputGroup.classList.toggle('hidden', isEasyMode);
            }
        });
    }

}

export { Dashboard };
