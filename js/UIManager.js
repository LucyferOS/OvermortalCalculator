import { CalculatorUtils } from './utils.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { Logger } from './Logger.js';
import { Realms, XPData, GameConstants, RealmMajorTotalXP, timegateLength } from './gameData.js';

class UIManager {
    static updateDashboard(results, playerData) {
        Logger.group('🖥️ UI MANAGER - UPDATING DASHBOARD', Logger.INFO);
        
        Logger.debug('DEBUG updateDashboard - results.virya:', results.virya);
        Logger.debug('DEBUG updateDashboard - results.virya.scenario:', results.virya?.scenario);
        
        // Update Virya display
        if (results.virya) {
            Logger.debug('DEBUG: Calling updateViryaDisplay with:', results.virya.scenario);
            this.updateViryaDisplay(results.virya, playerData, results.dailyXP);
        } else {
            Logger.warn('DEBUG: results.virya is falsy!');
        }
        
        // Update basic path information
        this.updateElementText('main-path-realm-display', playerData.mainPathRealm);
        const displayProgress = playerData.mainPathProgress > 100 ? '100%+' : `${playerData.mainPathProgress.toFixed(1)}%`;
        this.updateElementText('main-path-progress-display', displayProgress);
        this.updateElementText('secondary-path-realm-display', playerData.secondaryPathRealm);
        this.updateElementText('secondary-path-progress-display', `${playerData.secondaryPathProgress.toFixed(1)}%`);
        this.updateElementText('path-focus-display', playerData.pathFocus);
        
        const fruitXPTotal = results.fruitXPTotal || 0;
        
        // Update main path results
        if (results.realmProgression?.mainPath) {
            this.updatePathResults('main', results.realmProgression.mainPath);
        }

        // Update secondary path results
        if (results.realmProgression?.secondaryPath) {
            this.updatePathResults('secondary', results.realmProgression.secondaryPath);
        }

        this.updateFruitDisplays(results, playerData);
        this.updateFruitRecommendations(results);
        
        // Update Virya display (already done above, but ensure)
        if (results.virya) {
            this.updateViryaDisplay(results.virya, playerData, results.dailyXP);
        }
        
        // Update Virya comparison cells
        if (results.scenarioComparisons) {
            this.updateViryaComparisonCells(results.scenarioComparisons);
        }
        
        Logger.success('Dashboard update complete');
        Logger.groupEnd();
    }

    static updatePathResults(prefix, pathData) {
        Logger.debug(`Updating ${prefix} path results`, pathData);
        
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
    
    static updateFruitDisplays(results, playerData) {
        Logger.debug('Updating fruit displays');
        
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;
        
        const fruitXPTotal = results.fruitXPTotal || 0;
        const dailyXP = results.dailyXP || 0;
        
        // Only calculate if we have fruit XP and daily XP
        if (fruitXPTotal > 0 && dailyXP > 0) {
            // Calculate days saved from fruits
            const daysSaved = fruitXPTotal / dailyXP;
            
            // Update main path fruit displays
            if (results.realmProgression?.mainPath) {
                const mainPath = results.realmProgression.mainPath;
                
                // Minor realm with fruits
                const minorTimeWithFruits = Math.max(0, mainPath.timeToNextMinor - daysSaved);
                if (minorTimeWithFruits === 0) {
                    this.updateElementText('fruits-minor-main-time-display', "You can reach the next realm!");
                    this.updateElementText('fruits-minor-main-date-display', '');
                } else {
                    this.updateElementText('fruits-minor-main-time-display', format(minorTimeWithFruits));
                    this.updateElementText('fruits-minor-main-date-display', `Estimated: ${formatDate(minorTimeWithFruits)}`);
                }
                
                // Major realm with fruits
                const majorTimeWithFruits = Math.max(0, mainPath.timeToNextMajor - daysSaved);
                if (majorTimeWithFruits === 0) {
                    this.updateElementText('fruits-major-main-time-display', "You can reach the next realm!");
                    this.updateElementText('fruits-major-main-date-display', '');
                } else {
                    this.updateElementText('fruits-major-main-time-display', format(majorTimeWithFruits));
                    this.updateElementText('fruits-major-main-date-display', `Estimated: ${formatDate(majorTimeWithFruits)}`);
                }
            }
            
            // Update secondary path fruit displays
            if (results.realmProgression?.secondaryPath) {
                const secondaryPath = results.realmProgression.secondaryPath;
                
                // Minor realm with fruits
                const minorTimeWithFruits = Math.max(0, secondaryPath.timeToNextMinor - daysSaved);
                if (minorTimeWithFruits === 0) {
                    this.updateElementText('fruits-minor-secondary-time-display', "You can reach the next realm!");
                    this.updateElementText('fruits-minor-secondary-date-display', '');
                } else {
                    this.updateElementText('fruits-minor-secondary-time-display', format(minorTimeWithFruits));
                    this.updateElementText('fruits-minor-secondary-date-display', `Estimated: ${formatDate(minorTimeWithFruits)}`);
                }
                
                // Major realm with fruits
                const majorTimeWithFruits = Math.max(0, secondaryPath.timeToNextMajor - daysSaved);
                if (majorTimeWithFruits === 0) {
                    this.updateElementText('fruits-major-secondary-time-display', "You can reach the next realm!");
                    this.updateElementText('fruits-major-secondary-date-display', '');
                } else {
                    this.updateElementText('fruits-major-secondary-time-display', format(majorTimeWithFruits));
                    this.updateElementText('fruits-major-secondary-date-display', `Estimated: ${formatDate(majorTimeWithFruits)}`);
                }
            }
            
            Logger.debug('Fruit calculations complete', {
                'Fruit XP Total': fruitXPTotal.toLocaleString(),
                'Daily XP': dailyXP.toLocaleString(),
                'Days Saved': daysSaved.toFixed(2)
            });
        } else {
            Logger.debug('No fruits or no daily XP, showing original times');
            // No fruits or no daily XP, show original times
            if (results.realmProgression?.mainPath) {
                const mainPath = results.realmProgression.mainPath;
                this.updateElementText('fruits-minor-main-time-display', format(mainPath.timeToNextMinor));
                this.updateElementText('fruits-major-main-time-display', format(mainPath.timeToNextMajor));
            }
            if (results.realmProgression?.secondaryPath) {
                const secondaryPath = results.realmProgression.secondaryPath;
                this.updateElementText('fruits-minor-secondary-time-display', format(secondaryPath.timeToNextMinor));
                this.updateElementText('fruits-major-secondary-time-display', format(secondaryPath.timeToNextMajor));
            }
        }
    }
    
    static updateViryaDisplay(viryaInfo, playerData, dailyXP = 0) {
        Logger.group('👑 VIRYA DISPLAY UPDATE', Logger.DEBUG);
        Logger.info('Updating Virya display with scenario:', viryaInfo.scenario);
        
        // Update status bar
        this.updateElementText('current-virya-scenario', viryaInfo.scenario);
        
        // Set background color based on scenario
        const scenarioBadge = document.getElementById('current-virya-scenario');
        if (scenarioBadge) {
            switch(viryaInfo.scenario) {
                case 'Eminence':
                    scenarioBadge.style.background = '#C8A2C8';
                    break;
                case 'Perfect':
                    scenarioBadge.style.background = '#daa520';
                    break;
                case 'Half-Step':
                    scenarioBadge.style.background = '#990000';
                    break;
                default:
                    scenarioBadge.style.background = '';
            }
        }
        
        // Only show bonus if it's a bonus scenario (not No Virya or Completion)
        const bonusText = viryaInfo.scenario === 'No Virya' || viryaInfo.scenario === 'Completion' 
            ? 'No Bonus' 
            : `+${(viryaInfo.absorptionBonus || 0).toFixed(1)} absorption`;
        this.updateElementText('current-virya-bonus', bonusText);
        
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
                    Logger.debug(`Highlighting active row: ${scenario}`);
                }
            }
            
            // Update time estimates
            this.updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo);
        });
        
        Logger.success('Virya display updated');
        Logger.groupEnd();
    }

    static updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo) {
        Logger.group(`⏱️ Virya Time Estimate: ${scenario}`, Logger.DEBUG);
        
        // Add null/undefined check for viryaInfo
        if (!viryaInfo) {
            Logger.error('viryaInfo is undefined!');
            this.updateElementText(`virya-${scenarioKey}-time`, 'Error: No Virya Info');
            this.updateElementText(`virya-${scenarioKey}-date`, '--');
            Logger.groupEnd();
            return;
        }
        
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;
        
        const timeId = `virya-${scenarioKey}-time`;
        const dateId = `virya-${scenarioKey}-date`;
        
        // Check if this is the current scenario
        if (scenario === viryaInfo.scenario) {
            Logger.info(`Scenario ${scenario} is currently active`);
            this.updateElementText(timeId, ' Active Now');
            this.updateElementText(dateId, '--');
            Logger.groupEnd();
            return;
        }
        
        // Define scenario order to check if we're already beyond this scenario
        const scenarioOrder = ['No Virya', 'Completion', 'Eminence', 'Perfect', 'Half-Step'];
        const currentIndex = scenarioOrder.indexOf(viryaInfo.scenario);
        const targetIndex = scenarioOrder.indexOf(scenario);
        
        // If we're already beyond this scenario (e.g., at Half-Step but looking at Eminence)
        if (currentIndex > targetIndex) {
            Logger.info(`Already beyond ${scenario} (currently at ${viryaInfo.scenario})`);
            this.updateElementText(timeId, ' Already Passed');
            this.updateElementText(dateId, '--');
            Logger.groupEnd();
            return;
        }
        
        // Calculate days needed to reach this scenario
        // IMPORTANT: We should use 0 as secondaryDailyXP if player is focusing on main path
        // because the function will handle "already reached/passed" cases above
        const secondaryDailyXP = playerData.pathFocus === 'Secondary Path' ? dailyXP : 0;
        
        Logger.debug('Calculation parameters:', {
            'Scenario': scenario,
            'Player focus': playerData.pathFocus,
            'Secondary Daily XP': secondaryDailyXP,
            'Current scenario': viryaInfo.scenario
        });
        
        const scenarioInfo = ViryaCalculator.calculateDaysToScenario(scenario, playerData, secondaryDailyXP);
        const daysToReach = scenarioInfo?.daysNeeded;
        
        Logger.debug('Days to reach scenario:', daysToReach);
        
        if (daysToReach === 0) {
            Logger.info('Scenario already achieved');
            this.updateElementText(timeId, ' Already Met');
            this.updateElementText(dateId, '--');
        } else if (daysToReach === Infinity || isNaN(daysToReach) || daysToReach > 36500) {
            Logger.warn('Scenario not reachable');
            
            // Check why it's not reachable
            let reason = 'Not reachable';
            if (playerData.pathFocus === 'Main Path' && secondaryDailyXP === 0) {
                reason = 'Focus on main path';
            } else if (daysToReach > 36500) {
                reason = 'Too far away';
            }
            
            this.updateElementText(timeId, reason);
            this.updateElementText(dateId, '--');
        } else if (daysToReach < 0) {
            Logger.error('Invalid negative days');
            this.updateElementText(timeId, 'Error');
            this.updateElementText(dateId, '--');
        } else {
            Logger.info('Valid time calculated', {
                'Days': daysToReach.toFixed(2),
                'Formatted': format(daysToReach),
                'Date': formatDate(daysToReach)
            });
            this.updateElementText(timeId, format(daysToReach));
            this.updateElementText(dateId, `Est: ${formatDate(daysToReach)}`);
        }
        
        Logger.groupEnd();
    }

    static updateProgressBar(elementId, percent) {
        const progress = Math.min(100, percent);
        const element = document.getElementById(elementId);
        if (element) {
            element.style.width = `${progress}%`;
            element.textContent = `${Math.round(progress)}%`;
            Logger.debug(`Updated progress bar ${elementId}: ${progress}%`);
        }
    }

    static updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            Logger.debug(`Updated element ${elementId}: "${text}"`);
        }
    }

    static updateElementHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
            Logger.debug(`Updated element HTML ${elementId}`);
        }
    }

    static showNotification(message, isError = false) {
        Logger[isError ? 'error' : 'info'](`Notification: ${message}`);
        
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
            Logger.debug(`Showing loading on button ${buttonId}`);
        }
    }

    static hideLoading(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
            Logger.debug(`Hiding loading on button ${buttonId}`);
        }
    }

    static updateFruitRecommendations(results) {
        Logger.group('🍎 FRUIT RECOMMENDATIONS UPDATE', Logger.DEBUG);
        
        const scenarios = ['Completion', 'Eminence', 'Perfect', 'Half-Step'];
        
        scenarios.forEach(scenario => {
            const scenarioKey = scenario.toLowerCase().replace('-', '');
            const fruitResult = results.scenarioFruitResults?.[scenario];
            const xpNeeded = results.scenarioXPNeeded?.[scenario];
            const row = document.getElementById(`fruits-row-${scenarioKey}`);
            
            if (!fruitResult) {
                // No fruit result for this scenario
                Logger.debug(`No fruit result for ${scenario}`);
                this.updateCell(`${scenarioKey}-gush`, '--');
                this.updateCell(`${scenarioKey}-xp`, '--');
                this.updateCell(`${scenarioKey}-quality`, '--');
                this.updateCell(`${scenarioKey}-min-xp`, '--');
                this.updateCell(`${scenarioKey}-max-xp`, '--');
                this.updateCell(`${scenarioKey}-overflow-xp`, '--');
                
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
                
                Logger.debug(`Found fruit solution for ${scenario}:`, {
                    'Levels': `${rec.xpLevel}/${rec.gushLevel}/${rec.qualityLevel}`,
                    'Total levels': rec.totalLevels,
                    'Efficiency': comparison.singleXPPercentOfMax
                });
                
                // Update level cells with color coding based on efficiency
                this.updateCell(`${scenarioKey}-gush`, rec.gushLevel);
                this.updateCell(`${scenarioKey}-xp`, rec.xpLevel);
                this.updateCell(`${scenarioKey}-quality`, rec.qualityLevel);
                
                // Update XP cells (formatted)
                const minXPFormatted = CalculatorUtils.formatLargeNumber(rec.fruitXPTotal);
                const maxXPFormatted = CalculatorUtils.formatLargeNumber(max.fruitXPTotal);
                
                this.updateCell(`${scenarioKey}-min-xp`, minXPFormatted);
                this.updateCell(`${scenarioKey}-max-xp`, maxXPFormatted);
                
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
                
                this.updateCell(`${scenarioKey}-overflow-xp`, efficiencyText);
                
                // Style the row
                if (row) {
                    row.classList.remove('not-achievable', 'not-applicable');
                    
                    if (canReach) {
                        row.classList.add('achievable');
                        row.title = `Using ${rec.totalLevels} total levels, you can reach ${scenario} with current fruits`;
                        Logger.debug(`${scenario}: Achievable with current fruits`);
                    } else {
                        row.classList.add('not-achievable');
                        row.title = `Cannot reach ${scenario} even with current fruits at max extractor levels`;
                        Logger.warn(`${scenario}: Not achievable even with max levels`);
                    }
                    
                    // Add tooltip with more details
                    if (rec.alreadyMeetsTarget) {
                        row.classList.add('already-met');
                        row.title = `Already meets ${scenario} requirements with current fruits`;
                        Logger.info(`${scenario}: Already meets requirements`);
                    }
                }
            } else {
                // No solution found (can't reach scenario even with fruits)
                Logger.warn(`No fruit solution found for ${scenario}`);
                this.updateCell(`${scenarioKey}-gush`, 'N/A');
                this.updateCell(`${scenarioKey}-xp`, 'N/A');
                this.updateCell(`${scenarioKey}-quality`, 'N/A');
                this.updateCell(`${scenarioKey}-min-xp`, 'Cannot reach');
                
                const maxXP = fruitResult.maxLevelComparison?.fruitXPTotal || 0;
                this.updateCell(`${scenarioKey}-max-xp`, CalculatorUtils.formatLargeNumber(maxXP));
                
                // Show how far we are from target
                if (xpNeeded > 0 && xpNeeded !== Infinity) {
                    const deficit = xpNeeded - maxXP;
                    if (deficit > 0) {
                        this.updateCell(`${scenarioKey}-overflow-xp`, `Need ${CalculatorUtils.formatLargeNumber(deficit)} more XP`);
                    } else {
                        this.updateCell(`${scenarioKey}-overflow-xp`, 'Cannot calculate');
                    }
                } else {
                    this.updateCell(`${scenarioKey}-overflow-xp`, '--');
                }
                
                if (row) {
                    row.classList.remove('achievable', 'not-applicable');
                    row.classList.add('not-achievable');
                    row.title = `Cannot reach ${scenario} even with max extractor levels`;
                }
            }
        });
        
        Logger.success('Fruit recommendations updated');
        Logger.groupEnd();
    }

    // Helper method to update table cells
    static updateCell(cellId, value) {
        const element = document.getElementById(cellId);
        if (element) {
            element.textContent = value;
        }
    }
    
    // Update Virya comparison cells
    static updateViryaComparisonCells(scenarioComparisons) {
        Logger.group('📊 VIRYA COMPARISON CELLS UPDATE', Logger.DEBUG);
        Logger.info('Updating Virya comparison cells with:', scenarioComparisons);
        
        // Format large numbers for display
        const format = CalculatorUtils.formatLargeNumber;
        const formatTime = CalculatorUtils.formatTimeDays;
        
        // Helper function to parse percentage string (e.g., "15.30%" -> 15.30)
        const parsePercentage = (percStr) => {
            if (!percStr || percStr === '--') return 0;
            return parseFloat(percStr.replace('%', '').replace('+', ''));
        };
        
        // Function to update a comparison cell with percentage, XP diff, total XP, and days
        const updateComparisonCell = (scenario, comp, cellId) => {
            if (!comp) {
                Logger.warn(`No comparison data for ${scenario}`);
                this.updateElementText(cellId, '--\n--\n--\n--');
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
            
            this.updateElementText(cellId, fullText);
            
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
        
        // Eminence comparison
        if (scenarioComparisons['Eminence']) {
            const comp = scenarioComparisons['Eminence'];
            updateComparisonCell('Eminence', comp, 'virya-eminence-xp');
            Logger.debug('Updated Eminence comparison cell');
        } else {
            this.updateElementText('virya-eminence-xp', '--\n--\n--\n--');
            Logger.warn('No Eminence comparison data');
        }
        
        // Perfect comparison
        if (scenarioComparisons['Perfect']) {
            const comp = scenarioComparisons['Perfect'];
            updateComparisonCell('Perfect', comp, 'virya-perfect-xp');
            Logger.debug('Updated Perfect comparison cell');
        } else {
            this.updateElementText('virya-perfect-xp', '--\n--\n--\n--');
            Logger.warn('No Perfect comparison data');
        }
        
        // Half-Step comparison
        if (scenarioComparisons['Half-Step']) {
            const comp = scenarioComparisons['Half-Step'];
            updateComparisonCell('Half-Step', comp, 'virya-halfstep-xp');
            Logger.debug('Updated Half-Step comparison cell');
        } else {
            this.updateElementText('virya-halfstep-xp', '--\n--\n--\n--');
            Logger.warn('No Half-Step comparison data');
        }
        
        // Also update Completion baseline information if we have it
        // We need to get the Completion total XP from the first comparison
        if (scenarioComparisons['Eminence']) {
            const comp = scenarioComparisons['Eminence'];
            const totalXP = comp.scenario1.totalXP;
            const xpLostDuringFocus = comp.scenario1.xpLostDuringFocus || 0;
            const daysToReach = comp.scenario1.daysToReach;
            
            // Subtract XP lost during focus from the displayed total
            const netTotalXP = totalXP - xpLostDuringFocus;
            
            let completionText = `Baseline: ${format(netTotalXP)} XP\n`;
            if (daysToReach === 0) {
                completionText += `Already at Completion`;
            } else {
                completionText += `Days to reach: ${formatTime(daysToReach)}`;
            }
            
            this.updateElementText('virya-completion-xp', completionText);
            
            const cell = document.getElementById('virya-completion-xp');
            if (cell) {
                cell.style.whiteSpace = 'pre-line';
                cell.style.lineHeight = '1.2';
                cell.style.padding = '8px 4px';
                cell.style.fontSize = '0.9em';
                cell.title = 'Completion scenario baseline XP';
            }
            Logger.debug('Updated Completion baseline cell');
        }
        
        // Update the recommendation display in the status bar
        this.updateViryaRecommendation(scenarioComparisons);
        
        Logger.success('Virya comparison cells updated');
        Logger.groupEnd();
    }
    
    // Update the Virya recommendation in the status bar
    static updateViryaRecommendation(scenarioComparisons) {
        const recommendationElement = document.getElementById('virya-recommendation-display');
        if (!recommendationElement) {
            Logger.error('Virya recommendation element not found');
            return;
        }
        
        Logger.debug('Updating Virya recommendation');
        
        // Helper function to parse percentage string
        const parsePercentage = (percStr) => {
            if (!percStr || percStr === '--') return 0;
            return parseFloat(percStr.replace('%', '').replace('+', ''));
        };
        
        // Find the best scenario
        let bestScenario = 'Completion';
        let bestDiff = 0;
        let bestPerc = 0;
        
        if (scenarioComparisons['Eminence']) {
            const diff = scenarioComparisons['Eminence'].comparison.difference;
            const percStr = scenarioComparisons['Eminence'].comparison.percentage;
            const percValue = parsePercentage(percStr);
            
            if (diff > bestDiff) {
                bestDiff = diff;
                bestScenario = 'Eminence';
                bestPerc = percValue;
            }
        }
        
        if (scenarioComparisons['Perfect']) {
            const diff = scenarioComparisons['Perfect'].comparison.difference;
            const percStr = scenarioComparisons['Perfect'].comparison.percentage;
            const percValue = parsePercentage(percStr);
            
            if (diff > bestDiff) {
                bestDiff = diff;
                bestScenario = 'Perfect';
                bestPerc = percValue;
            }
        }
        
        if (scenarioComparisons['Half-Step']) {
            const diff = scenarioComparisons['Half-Step'].comparison.difference;
            const percStr = scenarioComparisons['Half-Step'].comparison.percentage;
            const percValue = parsePercentage(percStr);
            
            if (diff > bestDiff) {
                bestDiff = diff;
                bestScenario = 'Half-Step';
                bestPerc = percValue;
            }
        }
        
        // Generate recommendation text
        let recommendationText = '';
        if (bestScenario === 'Completion') {
            recommendationText = 'Focus on main path - higher Virya scenarios yield less main path XP.';
        } else if (bestDiff > 0) {
            recommendationText = `Consider pursuing ${bestScenario} - yields ${Math.abs(bestPerc).toFixed(2)}% more main path XP than Completion.`;
        } else if (bestDiff < 0) {
            recommendationText = `Stick with Completion - higher scenarios yield ${Math.abs(bestPerc).toFixed(2)}% LESS main path XP.`;
        } else {
            recommendationText = 'All scenarios yield similar XP - choose based on other factors.';
        }
        
        recommendationElement.textContent = recommendationText;
        Logger.info('Virya recommendation updated:', recommendationText);
    }

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
        // Helper function to format object as JSON with proper indentation
        const formatJSON = (obj) => {
            try {
                return JSON.stringify(obj, null, 2);
            } catch (e) {
                return String(obj);
            }
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
            gameDataElement.textContent = formatJSON(gameData);
            gameDataElement.style.whiteSpace = 'pre-wrap';
            gameDataElement.style.fontFamily = 'monospace';
            gameDataElement.style.fontSize = '0.9em';
            gameDataElement.style.background = '#f5f5f5';
            gameDataElement.style.padding = '10px';
            gameDataElement.style.borderRadius = '4px';
            gameDataElement.style.maxHeight = '400px';
            gameDataElement.style.overflow = 'auto';
        }

        // Update Player Input section
        const playerInputElement = document.getElementById('debug-player-input');
        if (playerInputElement) {
            if (playerData) {
                playerInputElement.textContent = formatJSON(playerData);
                playerInputElement.style.whiteSpace = 'pre-wrap';
                playerInputElement.style.fontFamily = 'monospace';
                playerInputElement.style.fontSize = '0.9em';
                playerInputElement.style.background = '#f5f5f5';
                playerInputElement.style.padding = '10px';
                playerInputElement.style.borderRadius = '4px';
                playerInputElement.style.maxHeight = '400px';
                playerInputElement.style.overflow = 'auto';
            } else {
                playerInputElement.textContent = 'Player data not available';
            }
        }

        // Update Calculations section
        const calculationsElement = document.getElementById('debug-calculations');
        if (calculationsElement) {
            if (results) {
                calculationsElement.textContent = formatJSON(results);
                calculationsElement.style.whiteSpace = 'pre-wrap';
                calculationsElement.style.fontFamily = 'monospace';
                calculationsElement.style.fontSize = '0.9em';
                calculationsElement.style.background = '#f5f5f5';
                calculationsElement.style.padding = '10px';
                calculationsElement.style.borderRadius = '4px';
                calculationsElement.style.maxHeight = '400px';
                calculationsElement.style.overflow = 'auto';
            } else {
                calculationsElement.textContent = 'Calculation results not available';
            }
        }
    }
}

export { UIManager };