
// The Virya scenario table: current tier, per-tier time estimates, the
// scenario comparison cells and the recommendation beneath them.

import { PATH_MAIN, PATH_SECONDARY, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_HALF_STEP, SCENARIO_NO_VIRYA, SCENARIO_PERFECT, VIRYA_SCENARIO_ORDER } from '../utilities/gameData.js';
import { CalculatorUtils } from '../utilities/utils.js';
import { Dom } from './dom.js';
import { ViryaCalculator } from '../dashboard/ViryaCalculator.js';

class ViryaTable {
    static updateViryaDisplay(viryaInfo, playerData, dailyXP = 0, mainPathDailyXPBase = 0, secondaryPathDailyXPBase = 0) {
        
        // Update status bar
        Dom.updateElementText('current-virya-scenario', viryaInfo.scenario);
        
        // Set background color based on scenario
        const scenarioBadge = document.getElementById('current-virya-scenario');
        if (scenarioBadge) {
            switch(viryaInfo.scenario) {
                case SCENARIO_EMINENCE:
                    scenarioBadge.style.background = '#C8A2C8';
                    break;
                case SCENARIO_PERFECT:
                    scenarioBadge.style.background = '#daa520';
                    break;
                case SCENARIO_HALF_STEP:
                    scenarioBadge.style.background = '#990000';
                    break;
                default:
                    scenarioBadge.style.background = '';
            }
        }
        
        // Only show bonus if it's a bonus scenario (not No Virya or Completion)
        const bonusText = viryaInfo.scenario === SCENARIO_NO_VIRYA || viryaInfo.scenario === SCENARIO_COMPLETION 
            ? 'No Bonus' 
            : `+${(viryaInfo.absorptionBonus || 0).toFixed(1)} absorption`;
        Dom.updateElementText('current-virya-bonus', bonusText);
        
        // Update table rows and progress bars
        const scenarios = [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
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
            
            // Update time estimates with both path daily XP values
            this.updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo, mainPathDailyXPBase, secondaryPathDailyXPBase);
        });
        
    }

    static updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo, mainPathDailyXPBase = 0, secondaryPathDailyXPBase = 0) {
        
        // Add null/undefined check for viryaInfo
        if (!viryaInfo) {
            Dom.updateElementText(`virya-${scenarioKey}-time`, 'Error: No Virya Info');
            Dom.updateElementText(`virya-${scenarioKey}-date`, '--');
            return;
        }
        
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;
        
        const timeId = `virya-${scenarioKey}-time`;
        const dateId = `virya-${scenarioKey}-date`;
        const focusId = `virya-${scenarioKey}-focus`;
        const nextRealmId = `virya-${scenarioKey}-next-realm`;
        
        // Check if this is the current scenario
        if (scenario === viryaInfo.scenario) {
            Dom.updateElementText(timeId, ' Active Now');
            Dom.updateElementText(dateId, '--');
            // Determine required path focus for current scenario
            let requiredPathFocus = PATH_MAIN;
            if (scenario === SCENARIO_EMINENCE || scenario === SCENARIO_PERFECT || scenario === SCENARIO_HALF_STEP) {
                requiredPathFocus = PATH_SECONDARY;
            }
            Dom.updateElementText(focusId, requiredPathFocus);
            
            // Calculate max next realm scenario for current scenario
            try {
                const maxNextRealm = ViryaCalculator.calculateMaxNextRealmScenario(
                    scenario,
                    playerData,
                    mainPathDailyXPBase,
                    secondaryPathDailyXPBase
                );
                Dom.updateElementText(nextRealmId, maxNextRealm || '--');
                
                // Check if Completion cannot be reached and highlight row red
                // Note: maxNextRealm may be a string indicating unreachability (not an error)
                this.updateRowHighlighting(scenarioKey, maxNextRealm);
            } catch (error) {
                // This is a calculation error, not an unreachable scenario
                Dom.updateElementText(nextRealmId, 'Error');
                // Clear highlighting on calculation error (don't highlight for errors)
                this.updateRowHighlighting(scenarioKey, null);
            }
            
            return;
        }
        
        // Define scenario order to check if we're already beyond this scenario
        const currentIndex = VIRYA_SCENARIO_ORDER.indexOf(viryaInfo.scenario);
        const targetIndex = VIRYA_SCENARIO_ORDER.indexOf(scenario);
        
        // If we're already beyond this scenario (e.g., at Half-Step but looking at Eminence)
        if (currentIndex > targetIndex) {
            Dom.updateElementText(timeId, ' Already Passed');
            Dom.updateElementText(dateId, '--');
            // Determine required path focus for this scenario
            let requiredPathFocus = PATH_MAIN;
            if (scenario === SCENARIO_EMINENCE || scenario === SCENARIO_PERFECT || scenario === SCENARIO_HALF_STEP) {
                requiredPathFocus = PATH_SECONDARY;
            }
            Dom.updateElementText(focusId, requiredPathFocus);
            
            // Calculate max next realm scenario for this scenario
            try {
                const maxNextRealm = ViryaCalculator.calculateMaxNextRealmScenario(
                    scenario,
                    playerData,
                    mainPathDailyXPBase,
                    secondaryPathDailyXPBase
                );
                Dom.updateElementText(nextRealmId, maxNextRealm || '--');
                
                // Check if Completion cannot be reached and highlight row red
                // Note: maxNextRealm may be a string indicating unreachability (not an error)
                this.updateRowHighlighting(scenarioKey, maxNextRealm);
            } catch (error) {
                // This is a calculation error, not an unreachable scenario
                Dom.updateElementText(nextRealmId, 'Error');
                // Clear highlighting on calculation error (don't highlight for errors)
                this.updateRowHighlighting(scenarioKey, null);
            }
            
            return;
        }
        
        // Calculate days needed to reach this scenario using both path daily XP values
        // For all scenarios, use base values (full XP including elixir/benediction) for Virya table
        // This ensures consistent calculations regardless of path focus
        // If both paths are at the same realm, use the same base XP for consistency
        // Otherwise, Completion uses main path base XP, secondary path scenarios use secondary path base XP
        const arePathsAtSameRealm = playerData.mainPathRealmMajor === playerData.secondaryPathRealmMajor;
        let mainPathXPForScenario = mainPathDailyXPBase;
        // If paths are at same realm, use main path base XP for both to ensure consistency
        // Otherwise, use secondary path base XP for secondary path scenarios
        let secondaryPathXPForScenario = arePathsAtSameRealm ? mainPathDailyXPBase : secondaryPathDailyXPBase;
        
        
        const scenarioInfo = ViryaCalculator.calculateDaysToScenario(scenario, playerData, mainPathXPForScenario, secondaryPathXPForScenario);
        const daysToReach = scenarioInfo?.daysNeeded;
        const requiredPathFocus = scenarioInfo?.requiredPathFocus || PATH_MAIN;
        
        
        // Update required path focus display
        Dom.updateElementText(focusId, requiredPathFocus);
        
        if (daysToReach === 0) {
            Dom.updateElementText(timeId, ' Already Met');
            Dom.updateElementText(dateId, '--');
        } else if (daysToReach === Infinity || isNaN(daysToReach) || daysToReach > 36500) {
            
            // Check why it's not reachable
            let reason = 'Not reachable';
            if (daysToReach > 36500) {
                reason = 'Too far away';
            } else if (requiredPathFocus === PATH_SECONDARY && secondaryPathDailyXPBase <= 0) {
                reason = 'Need secondary path XP';
            } else if (requiredPathFocus === PATH_MAIN && mainPathDailyXPBase <= 0) {
                reason = 'Need main path XP';
            }
            
            Dom.updateElementText(timeId, reason);
            Dom.updateElementText(dateId, '--');
        } else if (daysToReach < 0) {
            Dom.updateElementText(timeId, 'Error');
            Dom.updateElementText(dateId, '--');
        } else {
            Dom.updateElementText(timeId, format(daysToReach));
            Dom.updateElementText(dateId, `Est: ${formatDate(daysToReach)}`);
        }
        
        // Calculate max next realm scenario for this scenario
        try {
            const maxNextRealm = ViryaCalculator.calculateMaxNextRealmScenario(
                scenario,
                playerData,
                mainPathDailyXPBase,
                secondaryPathDailyXPBase
            );
            Dom.updateElementText(nextRealmId, maxNextRealm || '--');
            
            // Check if Completion cannot be reached and highlight row red
            this.updateRowHighlighting(scenarioKey, maxNextRealm);
        } catch (error) {
            Dom.updateElementText(nextRealmId, '--');
            // Clear highlighting on error
            this.updateRowHighlighting(scenarioKey, null);
        }
        
    }

    static updateRowHighlighting(scenarioKey, maxNextRealmResult) {
        // Map scenario keys to row IDs
        const rowIdMap = {
            'completion': 'virya-row-completion',
            'eminence': 'virya-row-eminence',
            'perfect': 'virya-row-perfect',
            'halfstep': 'virya-row-halfstep'
        };
        
        const rowId = rowIdMap[scenarioKey];
        if (!rowId) {
            return;
        }
        
        const row = document.getElementById(rowId);
        if (!row) {
            return;
        }
        
        // Check if Completion cannot be reached
        // Unreachable scenarios return specific strings, not errors
        const unreachableStrings = [
            'Cannot reach Completion',
            'Cannot reach scenario',
            'Next realm not implemented yet'
        ];
        
        const isUnreachable = unreachableStrings.includes(maxNextRealmResult) || 
                             maxNextRealmResult === null ||
                             maxNextRealmResult === '--';
        
        if (isUnreachable) {
            // Highlight row red to indicate Completion cannot be reached
            row.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
            row.style.borderLeft = '4px solid rgba(255, 0, 0, 0.8)';
        } else {
            // Clear highlighting - scenario is reachable
            row.style.backgroundColor = '';
            row.style.borderLeft = '';
        }
    }

    static updateViryaComparisonCells(scenarioComparisons) {
        
        // Format large numbers for display
        const format = CalculatorUtils.formatLargeNumber;
        const formatTime = CalculatorUtils.formatTimeDays;
        
        // Helper function to parse percentage string (e.g., "15.30%" -> 15.30)
        const parsePercentage = (percStr) => {
            if (!percStr || percStr === '--') return 0;
            return parseFloat(percStr.replace('%', '').replace('+', ''));
        };
        
        // Function to update overflow XP comparison cell with two-line format
        const updateOverflowCell = (scenario, comp, cellId) => {
            if (!comp) {
                Dom.updateElementText(cellId, '--');
                return;
            }
            
            const scenarioOverflowXP = comp.scenario2.overflowXP || 0;
            const completionOverflowXP = comp.scenario1.overflowXP || 0;
            const overflowDiff = scenarioOverflowXP - completionOverflowXP;
            
            const scenarioXPRequired = comp.scenario2.xpRequiredToReach || 0;
            const completionXPRequired = comp.scenario1.xpRequiredToReach || 0;
            const requiredDiff = scenarioXPRequired - completionXPRequired;
            
            // Line 1: Overflow XP comparison (as percentage)
            let overflowText = 'Overflow XP: ';
            if (completionOverflowXP > 0) {
                // Calculate percentage difference
                const overflowPercent = (overflowDiff / completionOverflowXP) * 100;
                if (overflowPercent > 0) {
                    overflowText += `+${overflowPercent.toFixed(2)}%\n`;
                } else if (overflowPercent < 0) {
                    overflowText += `${overflowPercent.toFixed(2)}%\n`;
                } else {
                    overflowText += `0.00%\n`;
                }
                overflowText += `(${format(scenarioOverflowXP)} vs ${format(completionOverflowXP)})`;
            } else {
                // Fallback to raw value if completion overflow is 0
                if (overflowDiff > 0) {
                    overflowText += `+${format(overflowDiff)} XP\n`;
                } else if (overflowDiff < 0) {
                    overflowText += `${format(overflowDiff)} XP\n`;
                } else {
                    overflowText += `0 XP\n`;
                }
                overflowText += `(${format(scenarioOverflowXP)} vs ${format(completionOverflowXP)})`;
            }
            
            // Line 2: XP to reach (just the value, not comparison)
            overflowText += `\n\nXP to reach: `;
            if (scenarioXPRequired > 0) {
                overflowText += `${format(scenarioXPRequired)} XP`;
            } else {
                overflowText += `0 XP (already at scenario)`;
            }
            
            Dom.updateElementText(cellId, overflowText);
            
            const cell = document.getElementById(cellId);
            if (cell) {
                cell.style.whiteSpace = 'pre-line';
                cell.style.lineHeight = '1.4';
                cell.style.padding = '8px 4px';
                cell.style.fontSize = '0.9em';
                
                // Color code based on overflow XP difference (positive = good, negative = bad)
                if (overflowDiff > 0) {
                    cell.style.color = 'var(--success)';
                } else if (overflowDiff < 0) {
                    cell.style.color = 'var(--accent)';
                } else {
                    cell.style.color = 'var(--text)';
                }
                
                cell.title = `Overflow XP: Main path XP gained after reaching scenario until timegate (excludes XP needed to reach scenario), compared to Completion.\nXP to reach: XP needed to reach this scenario from current state.`;
            }
        };
        
        // Function to update a comparison cell with percentage, XP diff, total XP, and days
        const updateComparisonCell = (scenario, comp, cellId) => {
            if (!comp) {
                Dom.updateElementText(cellId, '--\n--\n--\n--');
                return;
            }
            
            // Get raw values
            const scenario1TotalXP = comp.scenario1.totalXP;
            const scenario2TotalXP = comp.scenario2.totalXP;
            const scenario1XPLost = comp.scenario1.xpLostDuringFocus || 0;
            const scenario2XPLost = comp.scenario2.xpLostDuringFocus || 0;
            
            // Compare total XP directly - no need to subtract "lost XP" as it's already accounted for
            // The totalXP already reflects the actual XP gained (including 0 XP during transition if focusing secondary path)
            // The comparison should be: scenario2TotalXP vs scenario1TotalXP
            // xpLostDuringFocus is just informational and should NOT be subtracted from totalXP
            const scenario1NetXP = scenario1TotalXP; // Completion's total XP (no transition, so no loss)
            const scenario2NetXP = scenario2TotalXP; // Other scenario's total XP (already accounts for transition)
            
            // Calculate difference using total XP values directly
            const netDiff = scenario2NetXP - scenario1NetXP;
            const netPercentage = scenario1NetXP > 0 ? (netDiff / scenario1NetXP) * 100 : 0;
            
            const daysToReach = comp.scenario2.daysToReach;
            const reachedBeforeTimegate = comp.scenario2.reachedBeforeTimegate;
            const totalDaysUntilNextTimegateEnd = comp.comparison.totalDaysUntilNextTimegateEnd || 0;
            
            // Use net values for display
            const totalXP = scenario2NetXP;
            
            let percentageText = '';
            let xpDiffText = '';
            let totalXPText = '';
            let daysText = '';
            let title = '';
            
            if (netDiff > 0) {
                // This scenario is better than Completion (after accounting for transition cost)
                percentageText = `+${Math.abs(netPercentage).toFixed(2)}%`;
                xpDiffText = `+${format(netDiff)} XP`;
                title = `${scenario} yields ${Math.abs(netPercentage).toFixed(2)}% more main path XP than Completion (after transition cost)`;
            } else if (netDiff < 0) {
                // Completion is better than this scenario (after accounting for transition cost)
                percentageText = `${netPercentage.toFixed(2)}%`;
                xpDiffText = `${format(netDiff)} XP`;
                title = `${scenario} yields ${Math.abs(netPercentage).toFixed(2)}% LESS main path XP than Completion (after transition cost)`;
            } else {
                percentageText = `0%`;
                xpDiffText = `0 XP`;
                title = `${scenario} yields the same main path XP as Completion (after transition cost)`;
            }
            
            // Add total XP information (net after subtracting transition cost)
            totalXPText = `Total: ${format(totalXP)} XP`;
            
            // Add days to reach information
            // Check if scenario cannot be reached by next realm timegate
            const cannotReachByTimegate = daysToReach === Infinity || 
                                         !reachedBeforeTimegate || 
                                         (daysToReach > 0 && totalDaysUntilNextTimegateEnd > 0 && daysToReach > totalDaysUntilNextTimegateEnd);
            
            if (daysToReach === 0) {
                daysText = `Already reached`;
            } else if (cannotReachByTimegate) {
                daysText = `Not reachable by next realm timegate`;
            } else {
                daysText = `Days to reach: ${formatTime(daysToReach)}`;
            }
            
            // Combine all information
            const fullText = `${percentageText}\n${xpDiffText}\n${totalXPText}\n${daysText}`;
            
            Dom.updateElementText(cellId, fullText);
            
            // Color code the cell based on whether it's better
            const cell = document.getElementById(cellId);
            if (cell) {
                // Check if scenario cannot be reached by timegate first (highest priority)
                if (cannotReachByTimegate) {
                    cell.style.color = 'var(--accent)';
                    cell.style.fontWeight = '600';
                } else if (netDiff > 0) {
                    cell.style.color = 'var(--success)';
                    cell.style.fontWeight = '600';
                } else if (netDiff < 0) {
                    cell.style.color = 'var(--accent)';
                    cell.style.fontWeight = '600';
                } else {
                    cell.style.color = 'var(--text)';
                }
                cell.title = title;
                
                // Add styling for multi-line content
                cell.style.whiteSpace = 'pre-line';
                cell.style.lineHeight = '1.2';
                cell.style.padding = '8px 4px';
                cell.style.fontSize = '0.9em'; // Slightly smaller font for more content
            }
        };
        
        // Eminence comparison - use overflow XP format for "XP compared to overflow" column
        if (scenarioComparisons[SCENARIO_EMINENCE]) {
            const comp = scenarioComparisons[SCENARIO_EMINENCE];
            updateOverflowCell(SCENARIO_EMINENCE, comp, 'virya-eminence-xp');
        } else {
            Dom.updateElementText('virya-eminence-xp', '--');
        }
        
        // Perfect comparison - use overflow XP format for "XP compared to overflow" column
        if (scenarioComparisons[SCENARIO_PERFECT]) {
            const comp = scenarioComparisons[SCENARIO_PERFECT];
            updateOverflowCell(SCENARIO_PERFECT, comp, 'virya-perfect-xp');
        } else {
            Dom.updateElementText('virya-perfect-xp', '--');
        }
        
        // Half-Step comparison - use overflow XP format for "XP compared to overflow" column
        if (scenarioComparisons[SCENARIO_HALF_STEP]) {
            const comp = scenarioComparisons[SCENARIO_HALF_STEP];
            updateOverflowCell(SCENARIO_HALF_STEP, comp, 'virya-halfstep-xp');
        } else {
            Dom.updateElementText('virya-halfstep-xp', '--');
        }
        
        // Also update Completion baseline information if we have it
        // We need to get the Completion total XP from the first comparison
        if (scenarioComparisons[SCENARIO_EMINENCE]) {
            const comp = scenarioComparisons[SCENARIO_EMINENCE];
            const totalXP = comp.scenario1.totalXP;
            const xpLostDuringFocus = comp.scenario1.xpLostDuringFocus || 0;
            const daysToReach = comp.scenario1.daysToReach;
            const completionOverflowXP = comp.scenario1.overflowXP || 0;
            
            // Subtract XP lost during focus from the displayed total
            const netTotalXP = totalXP - xpLostDuringFocus;
            
            const completionXPRequired = comp.scenario1.xpRequiredToReach || 0;
            
            // Display Completion baseline with two-line format matching other scenarios
            let completionText = 'Overflow XP: ';
            completionText += `${format(completionOverflowXP)} XP\n`;
            completionText += `(Completion baseline)`;
            
            completionText += `\n\nXP to reach: `;
            if (completionXPRequired > 0) {
                completionText += `${format(completionXPRequired)} XP`;
            } else {
                completionText += `0 XP (already at Completion)`;
            }
            
            Dom.updateElementText('virya-completion-xp', completionText);
            
            const cell = document.getElementById('virya-completion-xp');
            if (cell) {
                cell.style.whiteSpace = 'pre-line';
                cell.style.lineHeight = '1.4';
                cell.style.padding = '8px 4px';
                cell.style.fontSize = '0.9em';
                cell.style.color = 'var(--text)';
                cell.title = 'Completion scenario baseline values:\nOverflow XP: Main path XP gained after reaching Completion until timegate.\nXP to reach: XP needed to reach Completion from current state.';
            }
        }
        
        // Update overflow XP cells (these are in the fruits table, but we'll update them here for virya scenarios)
        if (scenarioComparisons[SCENARIO_EMINENCE]) {
            updateOverflowCell(SCENARIO_EMINENCE, scenarioComparisons[SCENARIO_EMINENCE], 'eminence-overflow-xp');
        }
        if (scenarioComparisons[SCENARIO_PERFECT]) {
            updateOverflowCell(SCENARIO_PERFECT, scenarioComparisons[SCENARIO_PERFECT], 'perfect-overflow-xp');
        }
        if (scenarioComparisons[SCENARIO_HALF_STEP]) {
            updateOverflowCell(SCENARIO_HALF_STEP, scenarioComparisons[SCENARIO_HALF_STEP], 'halfstep-overflow-xp');
        }
        if (scenarioComparisons[SCENARIO_EMINENCE]) {
            const comp = scenarioComparisons[SCENARIO_EMINENCE];
            const completionOverflowXP = comp.scenario1.overflowXP || 0;
            Dom.updateElementText('completion-overflow-xp', format(completionOverflowXP));
        }
        
        // Update the recommendation display in the status bar
        this.updateViryaRecommendation(scenarioComparisons);
        
    }

    static updateViryaRecommendation(scenarioComparisons) {
        const recommendationElement = document.getElementById('virya-recommendation-display');
        if (!recommendationElement) {
            return;
        }
        
        
        // Helper function to parse percentage string
        const parsePercentage = (percStr) => {
            if (!percStr || percStr === '--') return 0;
            return parseFloat(percStr.replace('%', '').replace('+', ''));
        };
        
        // Find the best scenario, but only consider scenarios that are reachable before the next timegate
        let bestScenario = SCENARIO_COMPLETION;
        let bestDiff = 0;
        let bestPerc = 0;
        
        if (scenarioComparisons[SCENARIO_EMINENCE]) {
            // Check if Eminence is reachable before the next realm timegate
            const isReachable = scenarioComparisons[SCENARIO_EMINENCE].scenario2.reachedBeforeTimegate;
            
            if (isReachable) {
                const diff = scenarioComparisons[SCENARIO_EMINENCE].comparison.difference;
                const percStr = scenarioComparisons[SCENARIO_EMINENCE].comparison.percentage;
                const percValue = parsePercentage(percStr);
                
                if (diff > bestDiff) {
                    bestDiff = diff;
                    bestScenario = SCENARIO_EMINENCE;
                    bestPerc = percValue;
                }
            } else {
            }
        }
        
        if (scenarioComparisons[SCENARIO_PERFECT]) {
            // Check if Perfect is reachable before the next realm timegate
            const isReachable = scenarioComparisons[SCENARIO_PERFECT].scenario2.reachedBeforeTimegate;
            
            if (isReachable) {
                const diff = scenarioComparisons[SCENARIO_PERFECT].comparison.difference;
                const percStr = scenarioComparisons[SCENARIO_PERFECT].comparison.percentage;
                const percValue = parsePercentage(percStr);
                
                if (diff > bestDiff) {
                    bestDiff = diff;
                    bestScenario = SCENARIO_PERFECT;
                    bestPerc = percValue;
                }
            } else {
            }
        }
        
        if (scenarioComparisons[SCENARIO_HALF_STEP]) {
            // Check if Half-Step is reachable before the next realm timegate
            const isReachable = scenarioComparisons[SCENARIO_HALF_STEP].scenario2.reachedBeforeTimegate;
            
            if (isReachable) {
                const diff = scenarioComparisons[SCENARIO_HALF_STEP].comparison.difference;
                const percStr = scenarioComparisons[SCENARIO_HALF_STEP].comparison.percentage;
                const percValue = parsePercentage(percStr);
                
                if (diff > bestDiff) {
                    bestDiff = diff;
                    bestScenario = SCENARIO_HALF_STEP;
                    bestPerc = percValue;
                }
            } else {
            }
        }
        
        // Generate recommendation text
        let recommendationText = '';
        if (bestScenario === SCENARIO_COMPLETION) {
            recommendationText = 'Focus on main path - higher Virya scenarios yield less main path XP or are not reachable before the next realm timegate.';
        } else if (bestDiff > 0) {
            recommendationText = `Consider pursuing ${bestScenario} - yields ${Math.abs(bestPerc).toFixed(2)}% more main path XP than Completion.`;
        } else if (bestDiff < 0) {
            recommendationText = `Stick with Completion - higher scenarios yield ${Math.abs(bestPerc).toFixed(2)}% LESS main path XP.`;
        } else {
            recommendationText = 'All scenarios yield similar XP - choose based on other factors.';
        }
        
        recommendationElement.textContent = recommendationText;
    }

}

export { ViryaTable };
