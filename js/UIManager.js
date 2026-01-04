import { CalculatorUtils } from './utils.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { Logger } from './Logger.js';
import { Realms, XPData, GameConstants, RealmMajorTotalXP, timegateLength, PATH_MAIN, PATH_SECONDARY, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, REALM_ORDER_MAJOR } from './gameData.js';
import { Analytics } from './Analytics.js';

class UIManager {
    // Store latest values for red pills calculator
    static latestResults = null;
    static latestPlayerData = null;
    static latestAbsorptionBonus = 0;
    
    static updateDashboard(results, playerData) {
        Logger.group('🖥️ UI MANAGER - UPDATING DASHBOARD', Logger.INFO);
        
        Logger.debug('DEBUG updateDashboard - results.virya:', results.virya);
        Logger.debug('DEBUG updateDashboard - results.virya.scenario:', results.virya?.scenario);
        
        // Update Virya display
        if (results.virya) {
            Logger.debug('DEBUG: Calling updateViryaDisplay with:', results.virya.scenario);
            this.updateViryaDisplay(results.virya, playerData, results.dailyXP, results.mainPathDailyXPBase, results.secondaryPathDailyXPBase);
        } else {
            Logger.warn('DEBUG: results.virya is falsy!');
        }
        
        // Update basic path information
        this.updateElementText('main-path-realm-display', playerData.mainPathRealm);
        this.updateElementText('main-path-progress-display', `${playerData.mainPathProgress.toFixed(1)}%`);
        this.updateElementText('secondary-path-realm-display', playerData.secondaryPathRealm);
        this.updateElementText('secondary-path-progress-display', `${playerData.secondaryPathProgress.toFixed(1)}%`);
        this.updateElementText('path-focus-display', playerData.pathFocus);
        
        // Update path focus indicators
        this.updatePathFocusIndicators(playerData.pathFocus);
        
        const fruitXPTotal = results.fruitXPTotal || 0;
        
        // Update main path results
        if (results.realmProgression?.mainPath) {
            this.updatePathResults('main', results.realmProgression.mainPath, playerData.pathFocus === PATH_MAIN);
        }

        // Update secondary path results
        if (results.realmProgression?.secondaryPath) {
            this.updatePathResults('secondary', results.realmProgression.secondaryPath, playerData.pathFocus === PATH_SECONDARY);
        }

        this.updateFruitDisplays(results, playerData);
        this.updateMaxFruitDisplays(results, playerData);
        this.updateFruitRecommendations(results);
        
        // Update Virya comparison cells
        if (results.scenarioComparisons) {
            this.updateViryaComparisonCells(results.scenarioComparisons);
        }
        
        // Update timegate information
        this.updateTimegateInfo(playerData);
        
        // Store latest values for red pills calculator
        UIManager.latestResults = results;
        UIManager.latestPlayerData = playerData;
        
        // Update analytics
        this.updateAnalytics(results, playerData);
        
        Logger.success('Dashboard update complete');
        Logger.groupEnd();
    }

    static updatePathResults(prefix, pathData, isFocused = false) {
        Logger.debug(`Updating ${prefix} path results`, pathData);
        
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;

        // Minor realm
        if (pathData.progressPercentMinor >= 100) {
            this.updateElementText(`${prefix}-minor-time-display`, 'At or beyond 100%');
            this.updateElementText(`${prefix}-minor-date-display`, '--');
        } else {
            this.updateElementText(`${prefix}-minor-time-display`, format(pathData.timeToNextMinor));
            this.updateElementText(`${prefix}-minor-date-display`, `Estimated: ${formatDate(pathData.timeToNextMinor)}`);
        }
        this.updateProgressBar(`${prefix}-minor-progress-display`, pathData.progressPercentMinor);
        
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
            this.updateElementText(`${prefix}-major-time-display`, 'At or beyond 100%');
            this.updateElementText(`${prefix}-major-date-display`, '--');
        } else {
            this.updateElementText(`${prefix}-major-time-display`, format(pathData.timeToNextMajor));
            this.updateElementText(`${prefix}-major-date-display`, `Estimated: ${formatDate(pathData.timeToNextMajor)}`);
        }
        this.updateProgressBar(`${prefix}-major-progress-display`, pathData.progressPercentMajor);
        
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
            
            // Update days saved display
            this.updateElementText('fruits-days-saved-display', format(daysSaved));
            
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
            this.updateElementText('fruits-days-saved-display', '0d');
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
    
    static updateMaxFruitDisplays(results, playerData) {
        Logger.debug('Updating max fruit displays');
        
        const format = CalculatorUtils.formatTimeDays;
        const formatDate = CalculatorUtils.formatDateFromDays;
        
        const fruitXPTotalMax = results.fruitXPTotalMax || 0;
        const dailyXP = results.dailyXP || 0;
        
        // Only calculate if we have fruit XP and daily XP
        if (fruitXPTotalMax > 0 && dailyXP > 0) {
            // Calculate days saved from fruits
            const daysSaved = fruitXPTotalMax / dailyXP;
            
            // Update days saved display
            this.updateElementText('fruits-max-days-saved-display', format(daysSaved));
            
            // Update main path fruit displays
            if (results.realmProgression?.mainPath) {
                const mainPath = results.realmProgression.mainPath;
                
                // Minor realm with fruits
                const minorTimeWithFruits = Math.max(0, mainPath.timeToNextMinor - daysSaved);
                if (minorTimeWithFruits === 0) {
                    this.updateElementText('fruits-max-minor-main-time-display', "You can reach the next realm!");
                    this.updateElementText('fruits-max-minor-main-date-display', '');
                } else {
                    this.updateElementText('fruits-max-minor-main-time-display', format(minorTimeWithFruits));
                    this.updateElementText('fruits-max-minor-main-date-display', `Estimated: ${formatDate(minorTimeWithFruits)}`);
                }
                
                // Major realm with fruits
                const majorTimeWithFruits = Math.max(0, mainPath.timeToNextMajor - daysSaved);
                if (majorTimeWithFruits === 0) {
                    this.updateElementText('fruits-max-major-main-time-display', "You can reach the next realm!");
                    this.updateElementText('fruits-max-major-main-date-display', '');
                } else {
                    this.updateElementText('fruits-max-major-main-time-display', format(majorTimeWithFruits));
                    this.updateElementText('fruits-max-major-main-date-display', `Estimated: ${formatDate(majorTimeWithFruits)}`);
                }
            }
            
            // Update secondary path fruit displays
            if (results.realmProgression?.secondaryPath) {
                const secondaryPath = results.realmProgression.secondaryPath;
                
                // Minor realm with fruits
                const minorTimeWithFruits = Math.max(0, secondaryPath.timeToNextMinor - daysSaved);
                if (minorTimeWithFruits === 0) {
                    this.updateElementText('fruits-max-minor-secondary-time-display', "You can reach the next realm!");
                    this.updateElementText('fruits-max-minor-secondary-date-display', '');
                } else {
                    this.updateElementText('fruits-max-minor-secondary-time-display', format(minorTimeWithFruits));
                    this.updateElementText('fruits-max-minor-secondary-date-display', `Estimated: ${formatDate(minorTimeWithFruits)}`);
                }
                
                // Major realm with fruits
                const majorTimeWithFruits = Math.max(0, secondaryPath.timeToNextMajor - daysSaved);
                if (majorTimeWithFruits === 0) {
                    this.updateElementText('fruits-max-major-secondary-time-display', "You can reach the next realm!");
                    this.updateElementText('fruits-max-major-secondary-date-display', '');
                } else {
                    this.updateElementText('fruits-max-major-secondary-time-display', format(majorTimeWithFruits));
                    this.updateElementText('fruits-max-major-secondary-date-display', `Estimated: ${formatDate(majorTimeWithFruits)}`);
                }
            }
            
            Logger.debug('Max fruit calculations complete', {
                'Fruit XP Total Max': fruitXPTotalMax.toLocaleString(),
                'Daily XP': dailyXP.toLocaleString(),
                'Days Saved': daysSaved.toFixed(2)
            });
        } else {
            Logger.debug('No max fruits or no daily XP, showing original times');
            // No fruits or no daily XP, show original times
            this.updateElementText('fruits-max-days-saved-display', '0d');
            if (results.realmProgression?.mainPath) {
                const mainPath = results.realmProgression.mainPath;
                this.updateElementText('fruits-max-minor-main-time-display', format(mainPath.timeToNextMinor));
                this.updateElementText('fruits-max-major-main-time-display', format(mainPath.timeToNextMajor));
            }
            if (results.realmProgression?.secondaryPath) {
                const secondaryPath = results.realmProgression.secondaryPath;
                this.updateElementText('fruits-max-minor-secondary-time-display', format(secondaryPath.timeToNextMinor));
                this.updateElementText('fruits-max-major-secondary-time-display', format(secondaryPath.timeToNextMajor));
            }
        }
    }
    
    static updateViryaDisplay(viryaInfo, playerData, dailyXP = 0, mainPathDailyXPBase = 0, secondaryPathDailyXPBase = 0) {
        Logger.group('👑 VIRYA DISPLAY UPDATE', Logger.DEBUG);
        Logger.info('Updating Virya display with scenario:', viryaInfo.scenario);
        
        // Update status bar
        this.updateElementText('current-virya-scenario', viryaInfo.scenario);
        
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
        this.updateElementText('current-virya-bonus', bonusText);
        
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
                    Logger.debug(`Highlighting active row: ${scenario}`);
                }
            }
            
            // Update time estimates with both path daily XP values
            this.updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo, mainPathDailyXPBase, secondaryPathDailyXPBase);
        });
        
        Logger.success('Virya display updated');
        Logger.groupEnd();
    }

    static updateViryaTimeEstimate(scenario, scenarioKey, playerData, dailyXP, viryaInfo, mainPathDailyXPBase = 0, secondaryPathDailyXPBase = 0) {
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
        const focusId = `virya-${scenarioKey}-focus`;
        const nextRealmId = `virya-${scenarioKey}-next-realm`;
        
        // Check if this is the current scenario
        if (scenario === viryaInfo.scenario) {
            Logger.info(`Scenario ${scenario} is currently active`);
            this.updateElementText(timeId, ' Active Now');
            this.updateElementText(dateId, '--');
            // Determine required path focus for current scenario
            let requiredPathFocus = PATH_MAIN;
            if (scenario === SCENARIO_EMINENCE || scenario === SCENARIO_PERFECT || scenario === SCENARIO_HALF_STEP) {
                requiredPathFocus = PATH_SECONDARY;
            }
            this.updateElementText(focusId, requiredPathFocus);
            
            // Calculate max next realm scenario for current scenario
            try {
                const maxNextRealm = ViryaCalculator.calculateMaxNextRealmScenario(
                    scenario,
                    playerData,
                    mainPathDailyXPBase,
                    secondaryPathDailyXPBase
                );
                this.updateElementText(nextRealmId, maxNextRealm || '--');
                
                // Check if Completion cannot be reached and highlight row red
                // Note: maxNextRealm may be a string indicating unreachability (not an error)
                this.updateRowHighlighting(scenarioKey, maxNextRealm);
            } catch (error) {
                // This is a calculation error, not an unreachable scenario
                Logger.error('Error calculating max next realm scenario:', error);
                this.updateElementText(nextRealmId, 'Error');
                // Clear highlighting on calculation error (don't highlight for errors)
                this.updateRowHighlighting(scenarioKey, null);
            }
            
            Logger.groupEnd();
            return;
        }
        
        // Define scenario order to check if we're already beyond this scenario
        const currentIndex = VIRYA_SCENARIO_ORDER.indexOf(viryaInfo.scenario);
        const targetIndex = VIRYA_SCENARIO_ORDER.indexOf(scenario);
        
        // If we're already beyond this scenario (e.g., at Half-Step but looking at Eminence)
        if (currentIndex > targetIndex) {
            Logger.info(`Already beyond ${scenario} (currently at ${viryaInfo.scenario})`);
            this.updateElementText(timeId, ' Already Passed');
            this.updateElementText(dateId, '--');
            // Determine required path focus for this scenario
            let requiredPathFocus = PATH_MAIN;
            if (scenario === SCENARIO_EMINENCE || scenario === SCENARIO_PERFECT || scenario === SCENARIO_HALF_STEP) {
                requiredPathFocus = PATH_SECONDARY;
            }
            this.updateElementText(focusId, requiredPathFocus);
            
            // Calculate max next realm scenario for this scenario
            try {
                const maxNextRealm = ViryaCalculator.calculateMaxNextRealmScenario(
                    scenario,
                    playerData,
                    mainPathDailyXPBase,
                    secondaryPathDailyXPBase
                );
                this.updateElementText(nextRealmId, maxNextRealm || '--');
                
                // Check if Completion cannot be reached and highlight row red
                // Note: maxNextRealm may be a string indicating unreachability (not an error)
                this.updateRowHighlighting(scenarioKey, maxNextRealm);
            } catch (error) {
                // This is a calculation error, not an unreachable scenario
                Logger.error('Error calculating max next realm scenario:', error);
                this.updateElementText(nextRealmId, 'Error');
                // Clear highlighting on calculation error (don't highlight for errors)
                this.updateRowHighlighting(scenarioKey, null);
            }
            
            Logger.groupEnd();
            return;
        }
        
        // Calculate days needed to reach this scenario using both path daily XP values
        Logger.debug('Calculation parameters:', {
            'Scenario': scenario,
            'Main Path Daily XP Base': mainPathDailyXPBase,
            'Secondary Path Daily XP Base': secondaryPathDailyXPBase,
            'Current scenario': viryaInfo.scenario
        });
        
        // For Completion scenario, use mainPathDailyXPBase to match "Next Major Realm" calculation
        // (includes "had Virya last realm" bonus when applicable)
        // For secondary path scenarios (Eminence, Perfect, Half-Step), use secondaryPathDailyXPBase to match "Player Time to Cultivate" calculation
        // This ensures the Virya bonus is correctly applied to the secondary path
        // For other scenarios, use dailyXP (without temporary bonus) for time calculations
        let mainPathXPForScenario = (scenario === SCENARIO_COMPLETION) ? mainPathDailyXPBase : dailyXP;
        let secondaryPathXPForScenario = dailyXP;
        
        // For secondary path scenarios, use secondaryPathDailyXPBase to match "Player Time to Cultivate" calculation
        // This includes the correct Virya bonus for the secondary path realm
        if (scenario === SCENARIO_EMINENCE || scenario === SCENARIO_PERFECT || scenario === SCENARIO_HALF_STEP) {
            secondaryPathXPForScenario = secondaryPathDailyXPBase;
        }
        
        const scenarioInfo = ViryaCalculator.calculateDaysToScenario(scenario, playerData, mainPathXPForScenario, secondaryPathXPForScenario);
        const daysToReach = scenarioInfo?.daysNeeded;
        const requiredPathFocus = scenarioInfo?.requiredPathFocus || PATH_MAIN;
        
        Logger.debug('Days to reach scenario:', daysToReach);
        Logger.debug('Required path focus:', requiredPathFocus);
        
        // Update required path focus display
        this.updateElementText(focusId, requiredPathFocus);
        
        if (daysToReach === 0) {
            Logger.info('Scenario already achieved');
            this.updateElementText(timeId, ' Already Met');
            this.updateElementText(dateId, '--');
        } else if (daysToReach === Infinity || isNaN(daysToReach) || daysToReach > 36500) {
            Logger.warn('Scenario not reachable');
            
            // Check why it's not reachable
            let reason = 'Not reachable';
            if (daysToReach > 36500) {
                reason = 'Too far away';
            } else if (requiredPathFocus === PATH_SECONDARY && secondaryPathDailyXPBase <= 0) {
                reason = 'Need secondary path XP';
            } else if (requiredPathFocus === PATH_MAIN && mainPathDailyXPBase <= 0) {
                reason = 'Need main path XP';
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
                'Date': formatDate(daysToReach),
                'Required Focus': requiredPathFocus
            });
            this.updateElementText(timeId, format(daysToReach));
            this.updateElementText(dateId, `Est: ${formatDate(daysToReach)}`);
        }
        
        // Calculate max next realm scenario for this scenario
        try {
            const maxNextRealm = ViryaCalculator.calculateMaxNextRealmScenario(
                scenario,
                playerData,
                mainPathDailyXPBase,
                secondaryPathDailyXPBase
            );
            this.updateElementText(nextRealmId, maxNextRealm || '--');
            
            // Check if Completion cannot be reached and highlight row red
            this.updateRowHighlighting(scenarioKey, maxNextRealm);
        } catch (error) {
            Logger.error('Error calculating max next realm scenario:', error);
            this.updateElementText(nextRealmId, '--');
            // Clear highlighting on error
            this.updateRowHighlighting(scenarioKey, null);
        }
        
        Logger.groupEnd();
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
        
        console.log('Result boxes updated with focused class');
    }

    static updateProgressBar(elementId, percent) {
        const element = document.getElementById(elementId);
        if (element) {
            // Cap visual width at 100% to prevent overflow, but show actual percentage in text
            const visualWidth = Math.min(100, percent);
            element.style.width = `${visualWidth}%`;
            element.textContent = `${percent.toFixed(1)}%`;
            Logger.debug(`Updated progress bar ${elementId}: ${percent.toFixed(1)}% (visual: ${visualWidth}%)`);
        }
    }

    static updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            Logger.debug(`Updated element ${elementId}: "${text}"`);
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
        
        const scenarios = [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
        
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
        
        // Function to update overflow XP comparison cell with two-line format
        const updateOverflowCell = (scenario, comp, cellId) => {
            if (!comp) {
                this.updateElementText(cellId, '--');
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
            
            this.updateElementText(cellId, overflowText);
            
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
        
        // Eminence comparison - use overflow XP format for "XP compared to overflow" column
        if (scenarioComparisons[SCENARIO_EMINENCE]) {
            const comp = scenarioComparisons[SCENARIO_EMINENCE];
            updateOverflowCell(SCENARIO_EMINENCE, comp, 'virya-eminence-xp');
            Logger.debug('Updated Eminence overflow comparison cell');
        } else {
            this.updateElementText('virya-eminence-xp', '--');
            Logger.warn('No Eminence comparison data');
        }
        
        // Perfect comparison - use overflow XP format for "XP compared to overflow" column
        if (scenarioComparisons[SCENARIO_PERFECT]) {
            const comp = scenarioComparisons[SCENARIO_PERFECT];
            updateOverflowCell(SCENARIO_PERFECT, comp, 'virya-perfect-xp');
            Logger.debug('Updated Perfect overflow comparison cell');
        } else {
            this.updateElementText('virya-perfect-xp', '--');
            Logger.warn('No Perfect comparison data');
        }
        
        // Half-Step comparison - use overflow XP format for "XP compared to overflow" column
        if (scenarioComparisons[SCENARIO_HALF_STEP]) {
            const comp = scenarioComparisons[SCENARIO_HALF_STEP];
            updateOverflowCell(SCENARIO_HALF_STEP, comp, 'virya-halfstep-xp');
            Logger.debug('Updated Half-Step overflow comparison cell');
        } else {
            this.updateElementText('virya-halfstep-xp', '--');
            Logger.warn('No Half-Step comparison data');
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
            
            this.updateElementText('virya-completion-xp', completionText);
            
            const cell = document.getElementById('virya-completion-xp');
            if (cell) {
                cell.style.whiteSpace = 'pre-line';
                cell.style.lineHeight = '1.4';
                cell.style.padding = '8px 4px';
                cell.style.fontSize = '0.9em';
                cell.style.color = 'var(--text)';
                cell.title = 'Completion scenario baseline values:\nOverflow XP: Main path XP gained after reaching Completion until timegate.\nXP to reach: XP needed to reach Completion from current state.';
            }
            Logger.debug('Updated Completion baseline cell');
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
            this.updateElementText('completion-overflow-xp', format(completionOverflowXP));
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
                Logger.debug('Eminence is not reachable before next realm timegate - skipping from recommendations');
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
                Logger.debug('Perfect is not reachable before next realm timegate - skipping from recommendations');
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
                Logger.debug('Half-Step is not reachable before next realm timegate - skipping from recommendations');
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
        Logger.info('Virya recommendation updated:', recommendationText);
    }

    static updateTimegateInfo(playerData) {
        Logger.group('⏰ TIMEGATE INFO UPDATE', Logger.DEBUG);
        
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
        
        Logger.info('Timegate calculations:', {
            'Current timegate days': currentTimegateDays,
            'Current major realm': currentMajor,
            'Next major realm': nextMajor || 'N/A (Last realm)',
            'Next timegate length': nextTimegateLength,
            'Total days to next timegate': totalDaysToNextTimegate
        });
        
        // Update current timegate display
        if (currentTimegateDays > 0) {
            this.updateElementText('timegate-current-time', format(currentTimegateDays));
            this.updateElementText('timegate-current-date', `Est: ${formatDate(currentTimegateDays)}`);
        } else {
            this.updateElementText('timegate-current-time', 'N/A');
            this.updateElementText('timegate-current-date', '--');
        }
        
        // Update next realm timegate display
        if (nextMajor && totalDaysToNextTimegate > 0) {
            this.updateElementText('timegate-next-time', format(totalDaysToNextTimegate));
            this.updateElementText('timegate-next-date', `Est: ${formatDate(totalDaysToNextTimegate)}`);
        } else {
            this.updateElementText('timegate-next-time', nextMajor ? 'N/A' : 'Last realm');
            this.updateElementText('timegate-next-date', '--');
        }
        
        Logger.success('Timegate info updated');
        Logger.groupEnd();
    }

    static updateAnalytics(results, playerData) {
        Logger.group('📊 ANALYTICS UPDATE', Logger.DEBUG);
        
        try {
            // Use the dailyXP from playerData which includes the correct main path absorption bonus
            // (includes "had Virya last realm" bonus if active)
            // The breakdown will be calculated using the same values that produced playerData.dailyXP
            // For consistency, we'll use playerData.dailyXP and reverse-calculate the effective absorption bonus
            // Actually, let's just use the breakdown that matches playerData.dailyXP - use mainPathDailyXPBase logic
            // But we need the absorption bonus to calculate breakdown... let's use results.mainPathDailyXPBase if available
            // Actually, the analytics should match playerData.dailyXP, so let's calculate breakdown with the same absorption bonus
            // that was used to calculate playerData.dailyXP. Since playerData.dailyXP = mainPathDailyXPBase,
            // we should use the absorption bonus that gives us mainPathDailyXPBase.
            // For now, use playerData.dailyXP directly for the total, but we still need absorptionBonus for individual components
            // Let's use the virya absorption bonus as a fallback, but ideally we'd have mainPathAbsorptionBonus in results
            const absorptionBonus = results.virya?.absorptionBonus || 0;
            
            // Calculate daily XP breakdown - this should match playerData.dailyXP
            const breakdown = Analytics.calculateDailyXPBreakdown(playerData, absorptionBonus);
            Logger.debug('Daily XP breakdown:', breakdown);
            
            // Render daily XP pie chart
            Analytics.renderDailyXPChart('daily-xp-chart', breakdown);
            
            // Calculate extractor comparison
            const extractorComparison = Analytics.calculateExtractorComparison(playerData);
            Logger.debug('Extractor comparison:', extractorComparison);
            
            // Render extractor comparison bar chart
            Analytics.renderExtractorChart('extractor-comparison-chart', extractorComparison);
            
            // Update red pills calculator
            this.updateRedPillsCalculator(playerData, results, absorptionBonus);
            
            Logger.success('Analytics updated');
        } catch (error) {
            Logger.error('Error updating analytics:', error);
            console.error('Analytics update error:', error);
        }
        
        Logger.groupEnd();
    }

    static updateRedPillsCalculator(playerData, results, absorptionBonus) {
        Logger.group('🔴 RED PILLS CALCULATOR UPDATE', Logger.DEBUG);
        
        try {
            // Store latest values
            UIManager.latestResults = results;
            UIManager.latestPlayerData = playerData;
            UIManager.latestAbsorptionBonus = absorptionBonus;
            
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
                        UIManager.initializeSlider(slider, baseTimeToNextMajor, playerData, results, absorptionBonus);
                    }
                }, 100);
                Logger.warn('Slider element not found - will retry');
                Logger.groupEnd();
                return;
            }
            
            // Initialize or update slider
            this.initializeSlider(slider, baseTimeToNextMajor, playerData, results, absorptionBonus);
            
            // Set up event listener for current red pills input
            this.setupCurrentRedPillsListener();
            
            Logger.success('Red pills calculator updated');
        } catch (error) {
            Logger.error('Error updating red pills calculator:', error);
            console.error('Red pills calculator update error:', error);
        }
        
        Logger.groupEnd();
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
            
            Logger.debug('Slider max updated to match base time', { 
                baseTimeToNextMajor, 
                sliderMax: slider.max,
                currentValue: slider.value,
                disabled: slider.disabled
            });
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
                Logger.debug('Player is at maximum realm, slider disabled');
            } else if (!hasDailyXP) {
                // No daily XP - slider can't calculate
                slider.max = 1000;
                slider.disabled = true;
                Logger.debug('No daily XP available, slider disabled');
            } else {
                // Unknown reason for 0 - enable with default max for testing
                slider.max = 1000;
                slider.disabled = false;
                Logger.warn('Base time is 0 but daily XP exists - enabling slider with default max', {
                    dailyXP: playerData.dailyXP,
                    realm: playerData.mainPathRealm,
                    progression: results.realmProgression?.mainPath
                });
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
                    const currentResults = UIManager.latestResults;
                    const currentPlayerData = UIManager.latestPlayerData;
                    const currentAbsorptionBonus = UIManager.latestAbsorptionBonus;
                    
                    if (!currentResults || !currentPlayerData) {
                        Logger.warn('No current results or player data available for slider');
                        return;
                    }
                    
                    const currentBaseTime = currentResults.realmProgression?.mainPath?.timeToNextMajor || 
                                           currentResults.progression?.mainPath?.timeToNextMajor || 0;
                    const adjustedTime = Math.max(0, currentBaseTime - timeReduction);
                    
                    Logger.debug('Slider updated:', { 
                        timeReduction, 
                        adjustedTime, 
                        currentBaseTime,
                        eventType: e.type
                    });
                    
                    UIManager.calculateAndDisplayRedPills(
                        currentPlayerData, 
                        currentBaseTime, 
                        adjustedTime, 
                        timeReduction, 
                        currentAbsorptionBonus
                    );
                } catch (error) {
                    Logger.error('Error in slider handler:', error);
                    console.error('Slider handler error:', error);
                }
            };
            
            // Update on input (while dragging) for real-time feedback
            slider.addEventListener('input', handleSliderUpdate);
            
            // Update on change (when released) to ensure final calculation
            slider.addEventListener('change', handleSliderUpdate);
            
            // Also listen for mousedown to ensure interaction works
            slider.addEventListener('mousedown', (e) => {
                Logger.debug('Slider mousedown detected', { value: slider.value });
                e.stopPropagation(); // Prevent event bubbling
            });
            
            // Prevent any parent elements from blocking interaction
            slider.addEventListener('mousemove', (e) => {
                if (e.buttons === 1) { // Left mouse button is pressed
                    e.stopPropagation();
                }
            });
            
            Logger.debug('Slider event listeners initialized', { 
                sliderExists: !!slider,
                sliderValue: slider.value,
                sliderMax: slider.max,
                sliderMin: slider.min,
                disabled: slider.disabled
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
        this.updateElementText('base-time-display', baseTimeToNextMajor.toFixed(1));
        
        // Update adjusted time display
        this.updateElementText('adjusted-time-display', adjustedTime.toFixed(1));
        
        // Update slider value display (show reduction amount)
        const sliderValueDisplay = document.getElementById('time-adjustment-value');
        if (sliderValueDisplay) {
            sliderValueDisplay.textContent = timeReduction.toFixed(1);
        }
        
        // Update results
        this.updateElementText('red-pills-xp-needed', format(calculation.xpNeeded));
        this.updateElementText('red-pills-xp-gained', format(calculation.xpGained));
        this.updateElementText('red-pills-xp-deficit', format(calculation.xpDeficit));
        this.updateElementText('red-pills-xp-per-pill', format(calculation.redPillXPPerPill));
        this.updateElementText('red-pills-current', (calculation.currentRedPills || 0).toLocaleString());
        this.updateElementText('red-pills-needed', calculation.redPillsNeeded.toLocaleString());
        
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
                    const currentResults = UIManager.latestResults;
                    const currentPlayerData = UIManager.latestPlayerData;
                    const currentAbsorptionBonus = UIManager.latestAbsorptionBonus;
                    
                    if (!currentResults || !currentPlayerData) {
                        Logger.warn('No current results or player data available for current red pills update');
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
                    
                    Logger.debug('Current red pills updated:', {
                        currentRedPills: updatedPlayerData.currentRedPills,
                        adjustedTime
                    });
                    
                    UIManager.calculateAndDisplayRedPills(
                        updatedPlayerData,
                        currentBaseTime,
                        adjustedTime,
                        timeReduction,
                        currentAbsorptionBonus
                    );
                } catch (error) {
                    Logger.error('Error in current red pills handler:', error);
                    console.error('Current red pills handler error:', error);
                }
            };
            
            // Update on input (while typing) for real-time feedback
            newInput.addEventListener('input', handleCurrentRedPillsUpdate);
            
            // Update on change (when focus is lost) to ensure final calculation
            newInput.addEventListener('change', handleCurrentRedPillsUpdate);
            
            Logger.debug('Current red pills input listener initialized');
        }
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

export { UIManager };