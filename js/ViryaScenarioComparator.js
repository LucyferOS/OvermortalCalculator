import { RealmProgressionSimulator } from './RealmProgressionSimulator.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { XPCalculator } from './XPCalculator.js';
import { XPData, timegateLength, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, Realms } from './gameData.js';
import { Logger } from './Logger.js';

class ViryaScenarioComparator {
    constructor(playerData, dailyXP, comparatorId = 'default', mainPathDailyXPBase = null, secondaryPathDailyXPBase = null) {
        this.playerData = { ...playerData };
        this.dailyXP = dailyXP;
        this.comparatorId = comparatorId;
        this.simulator = new RealmProgressionSimulator(playerData, dailyXP, `${comparatorId}-sim`);
        this.timegateLengths = timegateLength;
        
        // Calculate or use provided path daily XP values
        if (mainPathDailyXPBase !== null && secondaryPathDailyXPBase !== null) {
            this.mainPathDailyXPBase = mainPathDailyXPBase;
            this.secondaryPathDailyXPBase = secondaryPathDailyXPBase;
        } else {
            // Calculate both path daily XP values if not provided
            // This is a fallback for backward compatibility
            const viryaInfo = ViryaCalculator.detectScenario(playerData);
            this.mainPathDailyXPBase = XPCalculator.calculateDailyXPWithAbsorptionBonus(playerData, viryaInfo.absorptionBonus);
            
            // Calculate secondary path daily XP
            let secondaryXP = 0;
            if (playerData.secondaryPathRealm && playerData.secondaryPathRealmMajor) {
                const realmXPKey = playerData.secondaryPathRealmMajor + "XP";
                if (XPData[realmXPKey]) {
                    const secondaryPathPlayerData = {
                        ...playerData,
                        mainPathRealm: playerData.secondaryPathRealm,
                        mainPathRealmMajor: playerData.secondaryPathRealmMajor,
                        mainPathRealmMinor: playerData.secondaryPathRealmMinor
                    };
                    secondaryXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, viryaInfo.absorptionBonus);
                }
            }
            this.secondaryPathDailyXPBase = secondaryXP;
        }
        
        // Define scenario bonuses
        this.scenarioBonus = {
            [SCENARIO_NO_VIRYA]: 0.0,
            [SCENARIO_COMPLETION]: 0.0,
            [SCENARIO_EMINENCE]: 0.2,
            [SCENARIO_PERFECT]: 0.2,
            [SCENARIO_HALF_STEP]: 0.4
        };
        
        // Define when each bonus ends
        this.bonusEndConditions = {
            [SCENARIO_COMPLETION]: { endsAt: 'Immediately' },
            [SCENARIO_EMINENCE]: { endsAt: 'Next Major Early' },
            [SCENARIO_PERFECT]: { endsAt: 'Next Major Mid' },
            [SCENARIO_HALF_STEP]: { endsAt: 'Next Major Late' }
        };
        
        // Scenario order for progression
        this.scenarioOrder = VIRYA_SCENARIO_ORDER;
    }
    
    compareScenarios(scenario1, scenario2) {
        Logger.group(`⚖️ VIRYA SCENARIO COMPARISON [${this.comparatorId}]`, Logger.INFO);
        Logger.section(`COMPARING: ${scenario1} vs ${scenario2}`, Logger.INFO);
        
        Logger.info('Player Information:', {
            'Main Path': `${this.playerData.mainPathRealm} (${this.playerData.mainPathProgress}%)`,
            'Secondary Path': `${this.playerData.secondaryPathRealm} (${this.playerData.secondaryPathProgress}%)`,
            'Path Focus': this.playerData.pathFocus,
            'Daily XP': this.dailyXP.toLocaleString(),
            'Timegate Days': this.playerData.timegateDays || 0
        });
        
        Logger.time('Total comparison time');
        
        const totalDays = this.getTotalDaysUntilNextTimegateEnd();
        
        const scenario1Result = this.calculateScenarioTotalXP(scenario1, 'Scenario1');
        const scenario2Result = this.calculateScenarioTotalXP(scenario2, 'Scenario2');
        
        // Calculate overflow XP for both scenarios (XP if switching to main path focus for overflow)
        const scenario1Overflow = this.calculateOverflowXPForScenario(scenario1, totalDays);
        const scenario2Overflow = this.calculateOverflowXPForScenario(scenario2, totalDays);
        
        const difference = scenario2Result.totalXP - scenario1Result.totalXP;
        const percentage = scenario1Result.totalXP > 0 ? (difference / scenario1Result.totalXP) * 100 : 0;
        
        Logger.section('COMPARISON RESULTS', Logger.INFO);
        Logger.table({
            'Metric': ['Total XP', 'Days to Reach', 'Reached Before Timegate', 'Bonus', 'XP Lost During Focus'],
            [scenario1]: [
                scenario1Result.totalXP.toLocaleString(),
                scenario1Result.daysToReach === Infinity ? '∞' : scenario1Result.daysToReach.toFixed(2),
                scenario1Result.reachedBeforeTimegate ? '✓' : '✗',
                `${(this.scenarioBonus[scenario1] * 100).toFixed(1)}%`,
                scenario1Result.xpLostDuringFocus ? scenario1Result.xpLostDuringFocus.toLocaleString() : '0'
            ],
            [scenario2]: [
                scenario2Result.totalXP.toLocaleString(),
                scenario2Result.daysToReach === Infinity ? '∞' : scenario2Result.daysToReach.toFixed(2),
                scenario2Result.reachedBeforeTimegate ? '✓' : '✗',
                `${(this.scenarioBonus[scenario2] * 100).toFixed(1)}%`,
                scenario2Result.xpLostDuringFocus ? scenario2Result.xpLostDuringFocus.toLocaleString() : '0'
            ]
        });
        
        Logger.info('Performance Metrics:', {
            'Total Analysis Period': `${totalDays.toFixed(1)} days`,
            'Difference (Scenario2 - Scenario1)': difference.toLocaleString(),
            'Percentage Difference': `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`,
            'Better Scenario': difference > 0 ? scenario2 : (difference < 0 ? scenario1 : 'Equal'),
            'Recommendation': difference > 0 ? 
                `Consider ${scenario2} (+${Math.abs(percentage).toFixed(2)}% more XP)` :
                difference < 0 ? 
                `Stick with ${scenario1} (${Math.abs(percentage).toFixed(2)}% more XP)` :
                'Both scenarios are equal'
        });
        
        Logger.timeEnd('Total comparison time');
        Logger.groupEnd();
        
        return {
            scenario1: {
                name: scenario1,
                totalXP: scenario1Result.totalXP,
                daysToReach: scenario1Result.daysToReach || 0,
                bonus: this.scenarioBonus[scenario1] || 0,
                reachedBeforeTimegate: scenario1Result.reachedBeforeTimegate || false,
                xpLostDuringFocus: scenario1Result.xpLostDuringFocus || 0,
                overflowXP: scenario1Overflow.overflowXP || 0,
                xpRequiredToReach: scenario1Overflow.xpRequiredToReach || 0
            },
            scenario2: {
                name: scenario2,
                totalXP: scenario2Result.totalXP,
                daysToReach: scenario2Result.daysToReach || 0,
                bonus: this.scenarioBonus[scenario2] || 0,
                reachedBeforeTimegate: scenario2Result.reachedBeforeTimegate || false,
                xpLostDuringFocus: scenario2Result.xpLostDuringFocus || 0,
                overflowXP: scenario2Overflow.overflowXP || 0,
                xpRequiredToReach: scenario2Overflow.xpRequiredToReach || 0
            },
            comparison: {
                betterScenario: difference > 0 ? scenario2 : (difference < 0 ? scenario1 : 'Equal'),
                difference: difference,
                percentage: `${difference >= 0 ? '+' : ''}${percentage.toFixed(2)}%`,
                rawPercentage: percentage,
                totalDaysUntilNextTimegateEnd: totalDays,
                recommendation: difference > 0 ? scenario2 : scenario1,
                overflowDifference: (scenario2Overflow.overflowXP || 0) - (scenario1Overflow.overflowXP || 0)
            }
        };
    }
    
    calculateScenarioTotalXP(targetScenario, label = 'Scenario') {
        Logger.group(`🧮 CALCULATING ${label}: ${targetScenario}`, Logger.DEBUG);
        
        const currentScenario = ViryaCalculator.detectScenario(this.playerData).scenario;
        const currentBonus = this.scenarioBonus[currentScenario] || 0;
        const totalAnalysisDays = this.getTotalDaysUntilNextTimegateEnd();
        
        Logger.info('Current State:', {
            'Current Scenario': currentScenario,
            'Current Bonus': `${currentBonus * 100}%`,
            'Target Scenario': targetScenario,
            'Target Bonus': `${(this.scenarioBonus[targetScenario] || 0) * 100}%`,
            'Total Analysis Period': `${totalAnalysisDays.toFixed(1)} days`
        });
        
        const currentIndex = this.scenarioOrder.indexOf(currentScenario);
        const targetIndex = this.scenarioOrder.indexOf(targetScenario);
        
        Logger.debug('Scenario progression:', {
            'Current Index': currentIndex,
            'Target Index': targetIndex,
            'Progress Needed': targetIndex > currentIndex ? `${targetIndex - currentIndex} steps` : 'None (already there)'
        });
        
        let result;
        if (targetIndex <= currentIndex) {
            // Already at or beyond this scenario
            Logger.info(`Already at or beyond target scenario ${targetScenario}`);
            result = this.calculateXPForCurrentScenario(targetScenario, totalAnalysisDays);
        } else {
            // Need to work towards this scenario
            Logger.info(`Need to progress to target scenario ${targetScenario}`);
            result = this.calculateXPForFutureScenario(currentScenario, targetScenario, totalAnalysisDays);
        }
        
        Logger.success(`Calculation complete for ${targetScenario}:`, {
            'Total XP': result.totalXP.toLocaleString(),
            'Days to Reach': result.daysToReach === Infinity ? '∞' : result.daysToReach.toFixed(2),
            'Reached Before Timegate': result.reachedBeforeTimegate ? '✓' : '✗',
            'XP Efficiency': totalAnalysisDays > 0 ? 
                `${(result.totalXP / totalAnalysisDays / 1000).toFixed(1)}K XP/day` : 'N/A'
        });
        
        Logger.groupEnd();
        return result;
    }
    
    calculateOverflowXPForScenario(targetScenario, totalDays) {
        Logger.group(`💎 CALCULATING OVERFLOW XP: ${targetScenario}`, Logger.DEBUG);
        
        // This calculates XP if we switch from virya focus to main path focus for overflow XP
        // The calculation now properly accounts for:
        // 1. Current player state (realm and XP)
        // 2. XP required to reach scenario (displayed separately)
        // 3. XP gained after reaching scenario until breakthrough (included in overflow)
        // 4. XP gained in next realm until timegate (included in overflow)
        // IMPORTANT: We cannot break through until the current timegate ends, even if we reach the scenario early
        
        // Recalculate daily XP values based on current player state (not the static constructor values)
        // This ensures the calculation accounts for the player's current realm and progression
        const currentViryaInfo = ViryaCalculator.detectScenario(this.playerData);
        const currentMainPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(this.playerData, currentViryaInfo.absorptionBonus);
        
        // Calculate secondary path daily XP based on current player state
        let currentSecondaryPathDailyXP = 0;
        if (this.playerData.secondaryPathRealm && this.playerData.secondaryPathRealmMajor) {
            const realmXPKey = this.playerData.secondaryPathRealmMajor + "XP";
            if (XPData[realmXPKey]) {
                const secondaryPathPlayerData = {
                    ...this.playerData,
                    mainPathRealm: this.playerData.secondaryPathRealm,
                    mainPathRealmMajor: this.playerData.secondaryPathRealmMajor,
                    mainPathRealmMinor: this.playerData.secondaryPathRealmMinor
                };
                currentSecondaryPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, currentViryaInfo.absorptionBonus);
            }
        }
        
        const currentScenario = currentViryaInfo.scenario;
        const currentIndex = this.scenarioOrder.indexOf(currentScenario);
        const targetIndex = this.scenarioOrder.indexOf(targetScenario);
        
        // Get timegate information
        const currentTimegateDays = this.playerData.timegateDays || 0;
        const currentMajor = this.playerData.mainPathRealmMajor;
        const realmOrder = ['Nascent', 'Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        const currentMajorIndex = realmOrder.indexOf(currentMajor);
        const nextMajor = currentMajorIndex < realmOrder.length - 1 ? realmOrder[currentMajorIndex + 1] : null;
        
        if (!nextMajor) {
            Logger.warn('No next major realm - cannot calculate overflow');
            Logger.groupEnd();
            return { overflowXP: 0, totalXP: 0, xpRequiredToReach: 0 };
        }
        
        const nextTimegateLength = this.timegateLengths[nextMajor] || 0;
        
        // ===== PHASE 1: Calculate XP required to reach scenario =====
        let xpRequiredToReach = 0;
        let daysToReach = 0;
        
        if (targetIndex > currentIndex) {
            // Need to reach scenario first
            const daysToReachInfo = ViryaCalculator.calculateDaysToScenario(targetScenario, this.playerData, currentMainPathDailyXP, currentSecondaryPathDailyXP);
            daysToReach = daysToReachInfo?.daysNeeded || Infinity;
            xpRequiredToReach = daysToReachInfo?.xpNeeded || 0;
            
            Logger.debug('Phase 1 - XP required to reach scenario:', {
                'XP needed': xpRequiredToReach.toLocaleString(),
                'Days needed': daysToReach === Infinity ? '∞' : daysToReach.toFixed(2)
            });
            
            if (daysToReach >= totalDays || daysToReach === Infinity) {
                // Cannot reach scenario before next timegate ends
                Logger.warn(`Cannot reach ${targetScenario} before next timegate ends - no overflow calculation`);
                Logger.groupEnd();
                return { overflowXP: 0, totalXP: 0, xpRequiredToReach: xpRequiredToReach };
            }
        } else {
            // Already at or past scenario
            Logger.debug('Phase 1 - Already at or past scenario, no XP required');
            xpRequiredToReach = 0;
            daysToReach = 0;
        }
        
        // ===== PHASE 2: Calculate XP after reaching scenario until breakthrough =====
        // Breakthrough happens when:
        // 1. We've reached the scenario (main path at 100% Late)
        // 2. AND the current timegate has ended (we cannot break through early)
        // So breakthrough happens at: max(daysToReach, currentTimegateDays)
        
        const daysUntilBreakthrough = Math.max(daysToReach, currentTimegateDays);
        let xpAfterScenarioUntilBreakthrough = 0;
        
        // Determine the state after reaching the scenario
        // For Completion, Eminence, Perfect, Half-Step: main path is at 100% Late in current major
        const currentLateRealm = `${currentMajor} Late`;
        const currentLateRealmXP = Realms[currentLateRealm]?.xp || 0;
        
        // Check if player is already at 100% Late
        const isAlreadyAt100Late = this.playerData.mainPathRealmMinor === 'Late' && this.playerData.mainPathProgress >= 100;
        
        // Calculate days available after reaching scenario (100% Late) until breakthrough
        let daysAfterScenarioUntilBreakthrough = 0;
        
        if (targetIndex > currentIndex) {
            // Need to reach scenario first
            // Days after scenario = days until breakthrough - days to reach scenario
            daysAfterScenarioUntilBreakthrough = Math.max(0, daysUntilBreakthrough - daysToReach);
        } else {
            // Already at or past scenario
            if (isAlreadyAt100Late) {
                // Already at 100% Late, so days after scenario = days until breakthrough
                daysAfterScenarioUntilBreakthrough = Math.max(0, daysUntilBreakthrough);
            } else {
                // At scenario but not yet at 100% Late - this shouldn't happen for most scenarios
                // but we'll handle it by calculating from current state
                daysAfterScenarioUntilBreakthrough = Math.max(0, daysUntilBreakthrough);
            }
        }
        
        if (daysAfterScenarioUntilBreakthrough > 0) {
            let phase2PlayerData;
            let phase2Simulator;
            
            if (targetIndex > currentIndex) {
                // Need to reach scenario first - Phase 2 starts from scenario completion (100% Late)
                phase2PlayerData = {
                    ...this.playerData,
                    mainPathRealm: currentLateRealm,
                    mainPathRealmMajor: currentMajor,
                    mainPathRealmMinor: 'Late',
                    mainPathProgress: 100,
                    mainPathExp: currentLateRealmXP,
                    cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
                };
            } else {
                // Already at scenario - use current player state (which should be at 100% Late or beyond)
                // This preserves any overflow XP the player already has
                phase2PlayerData = { 
                    ...this.playerData,
                    cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
                };
            }
            
            // Calculate daily XP with target scenario bonus (after reaching the scenario)
            // The target scenario's bonus should be active during Phase 2
            const targetScenarioBonus = this.scenarioBonus[targetScenario] || 0;
            
            const phase2DailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(phase2PlayerData, targetScenarioBonus);
            
            // Create simulator starting from appropriate state
            phase2Simulator = new RealmProgressionSimulator(
                phase2PlayerData,
                phase2DailyXP,
                'overflow-phase2'
            );
            
            // Determine bonus end condition for target scenario
            // The bonus from the target scenario is active during Phase 2, but may expire
            // However, since we're already at 100% Late and can't progress further,
            // the bonus end condition doesn't matter for Phase 2 (we're just gaining overflow XP)
            // But we should still use the correct bonus value
            const targetBonusEndCondition = this.bonusEndConditions[targetScenario];
            
            // Simulate XP gain until breakthrough
            // Since we're at or beyond 100% Late, we'll gain overflow XP (XP beyond 100%)
            // Use target scenario bonus (not current scenario bonus)
            const phase2Result = phase2Simulator.simulateDays(
                daysAfterScenarioUntilBreakthrough,
                targetScenarioBonus,
                null, // No bonus end condition during this phase (we're at max realm, just overflowing)
                currentLateRealm // Max realm is current Late (can't progress further, just overflow)
            );
            
            xpAfterScenarioUntilBreakthrough = phase2Result.totalXP;
            
            Logger.debug('Phase 2 - XP after scenario until breakthrough:', {
                'Starting from': targetIndex > currentIndex ? 'Scenario completion (100% Late)' : 'Current state',
                'Days after scenario until breakthrough': daysAfterScenarioUntilBreakthrough.toFixed(2),
                'Target scenario bonus': `${(targetScenarioBonus * 100).toFixed(1)}%`,
                'XP gained': xpAfterScenarioUntilBreakthrough.toLocaleString(),
                'Final progress': `${phase2Result.finalProgress.toFixed(2)}%`
            });
        } else {
            Logger.debug('Phase 2 - No days available after scenario until breakthrough');
        }
        
        // ===== PHASE 3: Calculate XP in next realm until timegate =====
        // Calculate days available in the next timegate for overflow XP
        // If we break through at timegate end (daysToReach <= currentTimegateDays):
        //   - We have the full nextTimegateLength days for overflow
        // If we break through after timegate ends (daysToReach > currentTimegateDays):
        //   - We've already used (daysToReach - currentTimegateDays) days of the next timegate
        //   - So we have (nextTimegateLength - (daysToReach - currentTimegateDays)) days for overflow
        
        let daysAvailableForOverflow = 0;
        if (daysToReach <= currentTimegateDays) {
            // Reach scenario before timegate ends, break through at timegate end
            // Full next timegate available for overflow
            daysAvailableForOverflow = nextTimegateLength;
            Logger.debug('Breakthrough timing:', {
                'Days to reach scenario': daysToReach.toFixed(2),
                'Current timegate days remaining': currentTimegateDays.toFixed(2),
                'Breakthrough happens': 'At current timegate end',
                'Days available for overflow': daysAvailableForOverflow.toFixed(2)
            });
        } else {
            // Reach scenario after timegate ends, break through immediately
            // Some days of next timegate already used
            const daysUsedInNextTimegate = daysToReach - currentTimegateDays;
            daysAvailableForOverflow = Math.max(0, nextTimegateLength - daysUsedInNextTimegate);
            Logger.debug('Breakthrough timing:', {
                'Days to reach scenario': daysToReach.toFixed(2),
                'Current timegate days remaining': currentTimegateDays.toFixed(2),
                'Breakthrough happens': `${daysUsedInNextTimegate.toFixed(2)} days into next timegate`,
                'Days available for overflow': daysAvailableForOverflow.toFixed(2)
            });
        }
        
        let xpInNextRealmUntilTimegate = 0;
        
        if (daysAvailableForOverflow > 0) {
            // Create player data at breakthrough state (next major Early, 0%)
            // The "had Virya last realm" bonus depends on the scenario we reached
            const breakthroughPlayerData = {
                ...this.playerData,
                mainPathRealm: `${nextMajor} Early`,
                mainPathRealmMajor: nextMajor,
                mainPathRealmMinor: 'Early',
                mainPathProgress: 0,
                mainPathExp: 0,
                cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
            };
            
            // Calculate daily XP at breakthrough state (next major Early) for the simulator
            // The absorption bonus at breakthrough depends on the scenario reached
            let breakthroughAbsorptionBonus = 0;
            if (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT) {
                breakthroughAbsorptionBonus = 0.2; // "Had Virya last realm" bonus
            } else if (targetScenario === SCENARIO_HALF_STEP) {
                breakthroughAbsorptionBonus = 0.4; // "Had Virya last realm" bonus
            }
            
            const breakthroughDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(breakthroughPlayerData, breakthroughAbsorptionBonus);
            
            // Create a temporary simulator for overflow calculation
            const overflowSimulator = new RealmProgressionSimulator(breakthroughPlayerData, breakthroughDailyXP, 'overflow-phase3');
            
            // Simulate main path progression with the "had Virya last realm" bonus
            // The bonus expires based on the scenario:
            // - Eminence: expires at Early (no bonus)
            // - Perfect: active in Early, expires at Mid
            // - Half-Step: active in Early and Mid, expires at Late
            // - Completion: no bonus
            
            let hadViryaBonus = 0;
            let bonusEndCondition = null;
            
            if (targetScenario === SCENARIO_EMINENCE) {
                hadViryaBonus = 0.2;
                bonusEndCondition = { endsAt: 'Next Major Early' }; // Expires immediately at Early
            } else if (targetScenario === SCENARIO_PERFECT) {
                hadViryaBonus = 0.2;
                bonusEndCondition = { endsAt: 'Next Major Mid' }; // Expires at Mid
            } else if (targetScenario === SCENARIO_HALF_STEP) {
                hadViryaBonus = 0.4;
                bonusEndCondition = { endsAt: 'Next Major Late' }; // Expires at Late
            }
            
            // Calculate max realm: next major Late (100%)
            const maxRealm = `${nextMajor} Late`;
            
            // Simulate overflow XP gain for the available days
            const phase3Result = overflowSimulator.simulateDays(daysAvailableForOverflow, hadViryaBonus, bonusEndCondition, maxRealm);
            
            xpInNextRealmUntilTimegate = phase3Result.totalXP;
            
            Logger.debug('Phase 3 - XP in next realm until timegate:', {
                'Days available for overflow': daysAvailableForOverflow.toFixed(2),
                'XP gained': xpInNextRealmUntilTimegate.toLocaleString(),
                'Final realm': phase3Result.finalRealm,
                'Final progress': `${phase3Result.finalProgress.toFixed(2)}%`
            });
        } else {
            Logger.warn('No days available for overflow XP - scenario reached too late');
        }
        
        // ===== Calculate total overflow XP =====
        // Overflow XP = Phase 2 + Phase 3 (excludes Phase 1)
        const overflowXP = xpAfterScenarioUntilBreakthrough + xpInNextRealmUntilTimegate;
        
        Logger.info('Overflow XP calculation summary:', {
            'Scenario': targetScenario,
            'XP required to reach scenario (Phase 1)': xpRequiredToReach.toLocaleString(),
            'XP after scenario until breakthrough (Phase 2)': xpAfterScenarioUntilBreakthrough.toLocaleString(),
            'XP in next realm until timegate (Phase 3)': xpInNextRealmUntilTimegate.toLocaleString(),
            'Total overflow XP (Phase 2 + Phase 3)': overflowXP.toLocaleString(),
            'Days to reach scenario': daysToReach === Infinity ? '∞' : daysToReach.toFixed(2),
            'Current timegate days remaining': currentTimegateDays.toFixed(2),
            'Days until breakthrough': daysUntilBreakthrough.toFixed(2),
            'Days available for overflow': daysAvailableForOverflow.toFixed(2)
        });
        
        Logger.groupEnd();
        return { overflowXP, totalXP: overflowXP, xpRequiredToReach };
    }
    
    calculateXPForCurrentScenario(scenario, totalDays) {
        Logger.group(`📈 CURRENT SCENARIO ANALYSIS: ${scenario}`, Logger.DEBUG);
        Logger.info(`Analyzing ${totalDays.toFixed(1)} days in ${scenario} scenario`);
        
        const bonus = this.scenarioBonus[scenario] || 0;
        const endCondition = this.bonusEndConditions[scenario];
        
        Logger.debug('Bonus details:', {
            'Bonus': `${bonus * 100}%`,
            'End Condition': endCondition.endsAt,
            'Total Days Available': totalDays.toFixed(1)
        });
        
        // Calculate maximum reachable realm during this period
        const maxRealm = this.getMaximumReachableRealmForScenario(scenario, totalDays, bonus);
        
        // Calculate XP with bonus end condition checking during simulation
        Logger.debug('Simulating with bonus end condition checking...');
        const result = this.simulator.simulateDays(totalDays, bonus, endCondition, maxRealm);
        
        Logger.success(`Period breakdown for ${scenario}:`, {
            'Total XP': result.totalXP.toLocaleString(),
            'Final Realm': result.finalRealm,
            'Final Progress': `${result.finalProgress.toFixed(2)}%`,
            'Average daily XP': totalDays > 0 ? (result.totalXP / totalDays).toLocaleString() : 'N/A'
        });
        
        Logger.groupEnd();
        
        return {
            totalXP: result.totalXP,
            reachedBeforeTimegate: true,
            daysToReach: 0
        };
    }
    
    calculateXPForFutureScenario(currentScenario, targetScenario, totalDays) {
        Logger.group(`🚀 FUTURE SCENARIO ANALYSIS: ${currentScenario} → ${targetScenario}`, Logger.DEBUG);
        
        const currentBonus = this.scenarioBonus[currentScenario] || 0;
        const targetBonus = this.scenarioBonus[targetScenario] || 0;
        
        Logger.info('Scenario transition details:', {
            'From': currentScenario,
            'To': targetScenario,
            'Bonus Change': `${currentBonus * 100}% → ${targetBonus * 100}%`,
            'Total Days Available': totalDays.toFixed(1)
        });
        
        // Calculate days needed to reach target scenario using both path daily XP values
        Logger.debug('Path daily XP analysis:', {
            'Path Focus': this.playerData.pathFocus,
            'Main Path Daily XP Base': this.mainPathDailyXPBase.toLocaleString(),
            'Secondary Path Daily XP Base': this.secondaryPathDailyXPBase.toLocaleString()
        });
        
        const daysToReachInfo = ViryaCalculator.calculateDaysToScenario(targetScenario, this.playerData, this.mainPathDailyXPBase, this.secondaryPathDailyXPBase);
        const daysToReach = daysToReachInfo?.daysNeeded || Infinity;
        
        Logger.info('Time to reach target scenario:', {
            'Days needed': daysToReach === Infinity ? '∞' : daysToReach.toFixed(2),
            'Total days available': totalDays.toFixed(2),
            'Can reach before end': daysToReach < totalDays ? '✓' : '✗',
            'Percentage of time needed': totalDays > 0 ? 
                `${((daysToReach / totalDays) * 100).toFixed(1)}%` : 'N/A'
        });
        
        if (daysToReach >= totalDays || daysToReach === Infinity) {
            // Cannot reach scenario before timegate ends
            Logger.warn(`Cannot reach ${targetScenario} before timegate ends`);
            const maxRealm = this.getMaximumReachableRealmForScenario(currentScenario, totalDays, currentBonus);
            const currentEndCondition = this.bonusEndConditions[currentScenario];
            const xp = this.simulatePeriod(totalDays, currentBonus, `Stuck in ${currentScenario}`, currentEndCondition, maxRealm);
            
            
            Logger.groupEnd();
            return {
                totalXP: xp,
                reachedBeforeTimegate: false,
                daysToReach: daysToReach,
                xpLostDuringFocus: 0  // No transition occurred, so no XP lost
            };
        }
        
        // We can reach the scenario
        const daysRemaining = totalDays - daysToReach;
        Logger.success(`Can reach ${targetScenario} in ${daysToReach.toFixed(2)} days`, {
            'Days remaining after reaching': daysRemaining.toFixed(2),
            'Time spent on transition': `${((daysToReach / totalDays) * 100).toFixed(1)}%`,
            'Time with target bonus': `${((daysRemaining / totalDays) * 100).toFixed(1)}%`
        });
        
        // Calculate max realm for the entire period
        const maxRealm = this.getMaximumReachableRealmForScenario(targetScenario, totalDays, targetBonus);
        
        const currentEndCondition = this.bonusEndConditions[currentScenario];
        
        // Period 1: Before reaching scenario (with current bonus)
        // Assume optimal path focus for reaching the target scenario
        Logger.group('📅 PERIOD 1: Working towards target scenario', Logger.DEBUG);
        const requiredPathFocusForTransition = daysToReachInfo?.requiredPathFocus || 'Main Path';
        
        // Calculate what main path XP would be gained if focusing on main path during transition
        const xpPeriod1IfMainPath = this.simulatePeriod(daysToReach, currentBonus, `Transition period (${currentScenario})`, currentEndCondition, maxRealm);
        
        // For comparison purposes, assume optimal path focus:
        // - Completion requires Main Path → gain XP during transition
        // - Eminence/Perfect/Half-Step require Secondary Path → no main path XP during transition (0)
        let xpPeriod1 = 0;
        if (requiredPathFocusForTransition === 'Main Path') {
            // If the required path is Main Path, we gain XP during transition
            xpPeriod1 = xpPeriod1IfMainPath;
        } else {
            // If the required path is Secondary Path, no main path XP is gained during transition
            xpPeriod1 = 0;
        }
        
        Logger.debug('Period 1 XP calculation:', {
            'Required path focus': requiredPathFocusForTransition,
            'XP if focusing main path': xpPeriod1IfMainPath.toLocaleString(),
            'Actual XP gained (Period 1)': xpPeriod1.toLocaleString()
        });
        Logger.groupEnd();
        
        // Period 2: After reaching scenario
        // After reaching any scenario (including Half-Step), always assume main path focus
        // This is because after reaching the scenario, we want to maximize main path XP with the bonus
        Logger.group('📅 PERIOD 2: After reaching target scenario', Logger.DEBUG);
        Logger.debug('Assuming main path focus for Period 2 (after reaching scenario)');
        
        const xpPeriod2 = this.calculateXPForCurrentScenario(targetScenario, daysRemaining);
        
        Logger.groupEnd();
        
        const totalXP = xpPeriod1 + xpPeriod2.totalXP;
        
        // Calculate lost XP: This should represent the opportunity cost of the transition
        // The key insight: We're comparing total XP directly, so "lost XP" should be 0
        // The comparison in the UI will handle the difference calculation
        // The real question is: what is the net benefit of transitioning vs staying?
        // We should NOT subtract opportunity cost from totalXP - that's double-counting
        // Instead, the comparison should be: totalXP (scenario) vs totalXP (Completion)
        // The "lost XP" field is just for informational purposes about the transition cost
        // For comparison purposes, we assume optimal path focus, so lost XP is always 0
        let xpLostDuringTransition = 0;
        
        // Get secondary path XP info for logging (if needed)
        // Determine which path daily XP to use based on required path focus
        const requiredPathFocus = requiredPathFocusForTransition;
        const dailyXPToUse = (requiredPathFocus === 'Secondary Path') ? this.secondaryPathDailyXPBase : this.mainPathDailyXPBase;
        const secondaryPathXPDuringTransition = (requiredPathFocus === 'Secondary Path') ? dailyXPToUse * daysToReach : 0;
        const secondaryPathXPNeeded = daysToReachInfo?.xpNeeded || 0;
        
        Logger.success(`Transition complete - ${currentScenario} → ${targetScenario}:`, {
            'XP during transition (Period 1)': xpPeriod1.toLocaleString(),
            'XP after transition (Period 2)': xpPeriod2.totalXP.toLocaleString(),
            'Total XP': totalXP.toLocaleString(),
            'Secondary path XP needed': secondaryPathXPNeeded > 0 ? secondaryPathXPNeeded.toLocaleString() : secondaryPathXPDuringTransition.toLocaleString(),
            'XP lost during transition (opportunity cost)': xpLostDuringTransition.toLocaleString(),
            'Net gain from transition': (totalXP - this.simulatePeriod(totalDays, currentBonus, 'If stayed')).toLocaleString()
        });
        
        Logger.groupEnd();
        
        return {
            totalXP: totalXP,
            reachedBeforeTimegate: true,
            daysToReach: daysToReach,
            xpLostDuringFocus: xpLostDuringTransition
        };
    }
    
    simulatePeriod(days, absorptionBonus, label = 'Period', bonusEndCondition = null, maxRealm = null) {
        if (days <= 0) {
            Logger.debug(`Skipping ${label} - 0 days`);
            return 0;
        }
        
        Logger.debug(`Simulating ${label} (${days.toFixed(2)} days, ${absorptionBonus * 100}% bonus)`);
        const result = this.simulator.simulateDays(days, absorptionBonus, bonusEndCondition, maxRealm);
        
        Logger.debug(`${label} results:`, {
            'XP gained': result.totalXP.toLocaleString(),
            'Final realm': result.finalRealm,
            'Final progress': `${result.finalProgress.toFixed(2)}%`,
            'Average daily XP': (result.totalXP / days).toLocaleString(),
            'Steps taken': result.steps
        });
        
        return result.totalXP;
    }
    
    calculateDaysUntilBonusEnds(scenario, absorptionBonus, maxDays) {
        Logger.group(`⏳ CALCULATING BONUS DURATION: ${scenario}`, Logger.DEBUG);
        
        const endCondition = this.bonusEndConditions[scenario];
        Logger.info('Bonus end condition:', endCondition);
        
        if (endCondition.endsAt === 'Immediately') {
            Logger.info('Bonus ends immediately');
            Logger.groupEnd();
            return 0;
        }
        
        if (endCondition.endsAt === 'Next Major Early') {
            // Find next major realm
            const currentMajor = this.playerData.mainPathRealmMajor;
            const nextMajor = this.getNextMajorRealm(currentMajor);
            
            if (!nextMajor) {
                Logger.warn('No next major realm found');
                Logger.groupEnd();
                return maxDays;
            }
            
            const targetRealm = `${nextMajor} Early`;
            const daysToReach = this.simulator.calculateDaysToReachRealm(targetRealm, 100, absorptionBonus);
            
            Logger.info(`Bonus ends at ${targetRealm}:`, {
                'Days to reach': daysToReach === Infinity ? '∞' : daysToReach.toFixed(2),
                'Max days available': maxDays,
                'Bonus duration': Math.min(daysToReach, maxDays).toFixed(2)
            });
            
            Logger.groupEnd();
            return Math.min(daysToReach, maxDays);
        }
        
        if (endCondition.endsAt === 'Next Major Mid') {
            const currentMajor = this.playerData.mainPathRealmMajor;
            const nextMajor = this.getNextMajorRealm(currentMajor);
            
            if (!nextMajor) {
                Logger.warn('No next major realm found');
                Logger.groupEnd();
                return maxDays;
            }
            
            const targetRealm = `${nextMajor} Mid`;
            const daysToReach = this.simulator.calculateDaysToReachRealm(targetRealm, 100, absorptionBonus);
            
            Logger.info(`Bonus ends at ${targetRealm}:`, {
                'Days to reach': daysToReach === Infinity ? '∞' : daysToReach.toFixed(2),
                'Max days available': maxDays,
                'Bonus duration': Math.min(daysToReach, maxDays).toFixed(2)
            });
            
            Logger.groupEnd();
            return Math.min(daysToReach, maxDays);
        }
        
        if (endCondition.endsAt === 'Next Major Late') {
            const currentMajor = this.playerData.mainPathRealmMajor;
            const nextMajor = this.getNextMajorRealm(currentMajor);
            
            if (!nextMajor) {
                Logger.warn('No next major realm found');
                Logger.groupEnd();
                return maxDays;
            }
            
            const targetRealm = `${nextMajor} Late`;
            const daysToReach = this.simulator.calculateDaysToReachRealm(targetRealm, 100, absorptionBonus);
            
            Logger.info(`Bonus ends at ${targetRealm}:`, {
                'Days to reach': daysToReach === Infinity ? '∞' : daysToReach.toFixed(2),
                'Max days available': maxDays,
                'Bonus duration': Math.min(daysToReach, maxDays).toFixed(2)
            });
            
            Logger.groupEnd();
            return Math.min(daysToReach, maxDays);
        }
        
        Logger.warn('Unknown end condition, using max days');
        Logger.groupEnd();
        return maxDays;
    }
    
    getTotalDaysUntilNextTimegateEnd() {
        const currentMajor = this.playerData.mainPathRealmMajor;
        const nextMajor = this.getNextMajorRealm(currentMajor);
        const currentTimegateDays = this.playerData.timegateDays || 0;
        const nextTimegateLength = this.timegateLengths[nextMajor] || 0;
        const totalDays = currentTimegateDays + nextTimegateLength;
        
        Logger.debug('Timegate calculation:', {
            'Current major': currentMajor,
            'Next major': nextMajor,
            'Current timegate days': currentTimegateDays,
            'Next timegate length': nextTimegateLength,
            'Total analysis period': `${totalDays} days`,
            'Weeks': `${(totalDays / 7).toFixed(1)}`,
            'Months': `${(totalDays / 30).toFixed(1)}`
        });
        
        return totalDays;
    }
    
    getNextMajorRealm(currentMajor) {
        const realmOrder = ['Nascent', 'Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        const currentIndex = realmOrder.indexOf(currentMajor);
        const nextMajor = currentIndex < realmOrder.length - 1 ? realmOrder[currentIndex + 1] : null;
        
        Logger.debug('Next major realm calculation:', {
            'Current major': currentMajor,
            'Current index': currentIndex,
            'Next major': nextMajor,
            'Is last realm': nextMajor === null
        });
        
        return nextMajor;
    }
    
    getMaximumReachableRealmForScenario(scenario, totalDays, absorptionBonus) {
        Logger.group(`🎯 CALCULATING MAX REACHABLE REALM FOR ${scenario}`, Logger.DEBUG);
        
        // Get realm at breakthrough (end of current timegate)
        const currentTimegateDays = this.playerData.timegateDays || 0;
        const breakthroughResult = this.simulator.getRealmAtBreakthrough(currentTimegateDays, absorptionBonus);
        const realmAtBreakthrough = breakthroughResult.finalRealm;
        const progressAtBreakthrough = breakthroughResult.finalProgress;
        
        Logger.info('Breakthrough state:', {
            'Realm': realmAtBreakthrough,
            'Progress': `${progressAtBreakthrough.toFixed(2)}%`,
            'Days to breakthrough': currentTimegateDays
        });
        
        // Calculate maximum reachable realm during next timegate period
        // The totalDays includes both current timegate remaining and next timegate
        // So we need to calculate from breakthrough state with remaining days
        const nextMajor = this.getNextMajorRealm(this.playerData.mainPathRealmMajor);
        const nextTimegateLength = this.timegateLengths[nextMajor] || 0;
        const daysInNextTimegate = totalDays - currentTimegateDays;
        
        Logger.info('Next timegate calculation:', {
            'Next major': nextMajor,
            'Next timegate length': nextTimegateLength,
            'Days in next timegate': daysInNextTimegate.toFixed(2),
            'Total analysis days': totalDays.toFixed(2)
        });
        
        // Create temporary player data at breakthrough state
        const breakthroughPlayerData = {
            ...this.playerData,
            mainPathRealm: realmAtBreakthrough,
            mainPathProgress: progressAtBreakthrough
        };
        const [major, minor] = realmAtBreakthrough.split(' ');
        breakthroughPlayerData.mainPathRealmMajor = major;
        breakthroughPlayerData.mainPathRealmMinor = minor;
        
        // Create temporary simulator for breakthrough state
        const breakthroughSimulator = new RealmProgressionSimulator(breakthroughPlayerData, this.dailyXP, 'breakthrough-sim');
        
        // Calculate maximum reachable realm from breakthrough
        // Check virya scenarios that might be reached
        
        const maxRealm = breakthroughSimulator.getMaximumReachableRealm(
            realmAtBreakthrough,
            progressAtBreakthrough,
            daysInNextTimegate,
            absorptionBonus
        );
        
        Logger.info('Maximum reachable realm:', {
            'Realm': maxRealm,
            'From breakthrough': realmAtBreakthrough,
            'With days': daysInNextTimegate.toFixed(2)
        });
        
        Logger.groupEnd();
        return maxRealm;
    }
}

export { ViryaScenarioComparator };