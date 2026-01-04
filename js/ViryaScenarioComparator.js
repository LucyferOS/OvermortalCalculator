import { RealmProgressionSimulator } from './RealmProgressionSimulator.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { XPCalculator } from './XPCalculator.js';
import { XPData, timegateLength, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, Realms } from './gameData.js';

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
        const totalDays = this.getTotalDaysUntilNextTimegateEnd();
        
        const scenario1Result = this.calculateScenarioTotalXP(scenario1, 'Scenario1');
        const scenario2Result = this.calculateScenarioTotalXP(scenario2, 'Scenario2');
        
        // Calculate overflow XP for both scenarios (XP if switching to main path focus for overflow)
        const scenario1Overflow = this.calculateOverflowXPForScenario(scenario1, totalDays);
        const scenario2Overflow = this.calculateOverflowXPForScenario(scenario2, totalDays);
        
        const difference = scenario2Result.totalXP - scenario1Result.totalXP;
        const percentage = scenario1Result.totalXP > 0 ? (difference / scenario1Result.totalXP) * 100 : 0;
        
        
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
        
        const currentScenario = ViryaCalculator.detectScenario(this.playerData).scenario;
        const currentBonus = this.scenarioBonus[currentScenario] || 0;
        const totalAnalysisDays = this.getTotalDaysUntilNextTimegateEnd();
        
        const currentIndex = this.scenarioOrder.indexOf(currentScenario);
        const targetIndex = this.scenarioOrder.indexOf(targetScenario);
        
        let result;
        if (targetIndex <= currentIndex) {
            // Already at or beyond this scenario
            result = this.calculateXPForCurrentScenario(targetScenario, totalAnalysisDays);
        } else {
            // Need to work towards this scenario
            result = this.calculateXPForFutureScenario(currentScenario, targetScenario, totalAnalysisDays);
        }
        
        return result;
    }
    
    calculateOverflowXPForScenario(targetScenario, totalDays) {
        
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
            
            if (daysToReach >= totalDays || daysToReach === Infinity) {
                // Cannot reach scenario before next timegate ends
                return { overflowXP: 0, totalXP: 0, xpRequiredToReach: xpRequiredToReach };
            }
        } else {
            // Already at or past scenario
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
        let phase2Result = null; // Store Phase 2 result to use overflow conversion in Phase 3
        
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
            phase2Result = phase2Simulator.simulateDays(
                daysAfterScenarioUntilBreakthrough,
                targetScenarioBonus,
                null, // No bonus end condition during this phase (we're at max realm, just overflowing)
                currentLateRealm // Max realm is current Late (can't progress further, just overflow)
            );
            
            xpAfterScenarioUntilBreakthrough = phase2Result.totalXP;
        } else {
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
        } else {
            // Reach scenario after timegate ends, break through immediately
            // Some days of next timegate already used
            const daysUsedInNextTimegate = daysToReach - currentTimegateDays;
            daysAvailableForOverflow = Math.max(0, nextTimegateLength - daysUsedInNextTimegate);
        }
        
        let xpInNextRealmUntilTimegate = 0;
        
        if (daysAvailableForOverflow > 0) {
            // Create player data at breakthrough state
            // IMPORTANT: If Phase 2 had overflow XP, the simulator converts it to next realm progress
            // We should use the converted state from Phase 2, not start at 0% Early
            let breakthroughPlayerData;
            let phase2OverflowConverted = false;
            
            if (xpAfterScenarioUntilBreakthrough > 0 && phase2Result) {
                // Check if Phase 2 resulted in overflow conversion to next realm
                const phase2FinalRealm = phase2Result.finalRealm || '';
                const phase2FinalProgress = phase2Result.finalProgress || 0;
                
                // If Phase 2 ended in the next major realm (overflow was converted), use that state
                if (phase2FinalRealm.startsWith(nextMajor)) {
                    const [major, minor] = phase2FinalRealm.split(' ');
                    const phase2FinalRealmXP = Realms[phase2FinalRealm]?.xp || 0;
                    const phase2FinalExp = (phase2FinalRealmXP * phase2FinalProgress) / 100;
                    
                    breakthroughPlayerData = {
                        ...this.playerData,
                        mainPathRealm: phase2FinalRealm,
                        mainPathRealmMajor: major,
                        mainPathRealmMinor: minor,
                        mainPathProgress: phase2FinalProgress,
                        mainPathExp: phase2FinalExp,
                        cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
                    };
                    phase2OverflowConverted = true;
                } else {
                    // Phase 2 didn't convert to next realm (no overflow or still in current realm)
                    breakthroughPlayerData = {
                        ...this.playerData,
                        mainPathRealm: `${nextMajor} Early`,
                        mainPathRealmMajor: nextMajor,
                        mainPathRealmMinor: 'Early',
                        mainPathProgress: 0,
                        mainPathExp: 0,
                        cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
                    };
                }
            } else {
                // No Phase 2 XP, start at 0% Early
                breakthroughPlayerData = {
                    ...this.playerData,
                    mainPathRealm: `${nextMajor} Early`,
                    mainPathRealmMajor: nextMajor,
                    mainPathRealmMinor: 'Early',
                    mainPathProgress: 0,
                    mainPathExp: 0,
                    cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
                };
            }
            
            // Calculate daily XP at breakthrough state (next major Early) for the simulator
            // The absorption bonus at breakthrough depends on the scenario reached
            // IMPORTANT: Eminence bonus expires at the start of Early, so NO bonus in Early
            // Perfect bonus is active in Early, Half-Step bonus is active in Early and Mid
            let breakthroughAbsorptionBonus = 0;
            if (targetScenario === SCENARIO_PERFECT) {
                breakthroughAbsorptionBonus = 0.2; // "Had Virya last realm" bonus - active in Early
            } else if (targetScenario === SCENARIO_HALF_STEP) {
                breakthroughAbsorptionBonus = 0.4; // "Had Virya last realm" bonus - active in Early and Mid
            }
            // Eminence: bonus expires at start of Early, so breakthroughAbsorptionBonus = 0
            // Completion: no bonus, so breakthroughAbsorptionBonus = 0
            
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
            
            // Eminence bonus expires at the start of Early, so no bonus during Phase 3
            // Perfect bonus is active in Early, expires at Mid
            // Half-Step bonus is active in Early and Mid, expires at Late
            if (targetScenario === SCENARIO_PERFECT) {
                hadViryaBonus = 0.2;
                bonusEndCondition = { endsAt: 'Next Major Mid' }; // Expires at Mid
            } else if (targetScenario === SCENARIO_HALF_STEP) {
                hadViryaBonus = 0.4;
                bonusEndCondition = { endsAt: 'Next Major Late' }; // Expires at Late
            }
            // Eminence: hadViryaBonus = 0 (bonus expires at start of Early)
            // Completion: hadViryaBonus = 0 (no bonus)
            
            // Calculate max realm: next major Late (100%)
            const maxRealm = `${nextMajor} Late`;
            
            // Simulate overflow XP gain for the available days
            const phase3Result = overflowSimulator.simulateDays(daysAvailableForOverflow, hadViryaBonus, bonusEndCondition, maxRealm);
            
            xpInNextRealmUntilTimegate = phase3Result.totalXP;
        } else {
        }
        
        // ===== Calculate total overflow XP =====
        // Overflow XP = Phase 2 + Phase 3 (excludes Phase 1)
        const overflowXP = xpAfterScenarioUntilBreakthrough + xpInNextRealmUntilTimegate;
        
        return { overflowXP, totalXP: overflowXP, xpRequiredToReach };
    }
    
    calculateXPForCurrentScenario(scenario, totalDays) {
        
        const bonus = this.scenarioBonus[scenario] || 0;
        const endCondition = this.bonusEndConditions[scenario];
        
        // Calculate maximum reachable realm during this period
        const maxRealm = this.getMaximumReachableRealmForScenario(scenario, totalDays, bonus);
        
        // Calculate XP with bonus end condition checking during simulation
        const result = this.simulator.simulateDays(totalDays, bonus, endCondition, maxRealm);
        
        return {
            totalXP: result.totalXP,
            reachedBeforeTimegate: true,
            daysToReach: 0
        };
    }
    
    calculateXPForFutureScenario(currentScenario, targetScenario, totalDays) {
        
        const currentBonus = this.scenarioBonus[currentScenario] || 0;
        const targetBonus = this.scenarioBonus[targetScenario] || 0;
        
        // Calculate days needed to reach target scenario using both path daily XP values
        const daysToReachInfo = ViryaCalculator.calculateDaysToScenario(targetScenario, this.playerData, this.mainPathDailyXPBase, this.secondaryPathDailyXPBase);
        const daysToReach = daysToReachInfo?.daysNeeded || Infinity;
        
        if (daysToReach >= totalDays || daysToReach === Infinity) {
            // Cannot reach scenario before timegate ends
            const maxRealm = this.getMaximumReachableRealmForScenario(currentScenario, totalDays, currentBonus);
            const currentEndCondition = this.bonusEndConditions[currentScenario];
            const xp = this.simulatePeriod(totalDays, currentBonus, `Stuck in ${currentScenario}`, currentEndCondition, maxRealm);
            
            
            return {
                totalXP: xp,
                reachedBeforeTimegate: false,
                daysToReach: daysToReach,
                xpLostDuringFocus: 0  // No transition occurred, so no XP lost
            };
        }
        
        // We can reach the scenario
        const daysRemaining = totalDays - daysToReach;
        
        // Calculate max realm for the entire period
        const maxRealm = this.getMaximumReachableRealmForScenario(targetScenario, totalDays, targetBonus);
        
        const currentEndCondition = this.bonusEndConditions[currentScenario];
        
        // Period 1: Before reaching scenario (with current bonus)
        // Assume optimal path focus for reaching the target scenario
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
        
        // Period 2: After reaching scenario
        // After reaching any scenario (including Half-Step), always assume main path focus
        // This is because after reaching the scenario, we want to maximize main path XP with the bonus
        
        const xpPeriod2 = this.calculateXPForCurrentScenario(targetScenario, daysRemaining);
        
        
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
        
        return {
            totalXP: totalXP,
            reachedBeforeTimegate: true,
            daysToReach: daysToReach,
            xpLostDuringFocus: xpLostDuringTransition
        };
    }
    
    simulatePeriod(days, absorptionBonus, label = 'Period', bonusEndCondition = null, maxRealm = null) {
        if (days <= 0) {
            return 0;
        }
        
        const result = this.simulator.simulateDays(days, absorptionBonus, bonusEndCondition, maxRealm);
        
        return result.totalXP;
    }
    
    calculateDaysUntilBonusEnds(scenario, absorptionBonus, maxDays) {
        
        const endCondition = this.bonusEndConditions[scenario];
        
        if (endCondition.endsAt === 'Immediately') {
            return 0;
        }
        
        if (endCondition.endsAt === 'Next Major Early') {
            // Find next major realm
            const currentMajor = this.playerData.mainPathRealmMajor;
            const nextMajor = this.getNextMajorRealm(currentMajor);
            
            if (!nextMajor) {
                return maxDays;
            }
            
            const targetRealm = `${nextMajor} Early`;
            const daysToReach = this.simulator.calculateDaysToReachRealm(targetRealm, 100, absorptionBonus);
            
            return Math.min(daysToReach, maxDays);
        }
        
        if (endCondition.endsAt === 'Next Major Mid') {
            const currentMajor = this.playerData.mainPathRealmMajor;
            const nextMajor = this.getNextMajorRealm(currentMajor);
            
            if (!nextMajor) {
                return maxDays;
            }
            
            const targetRealm = `${nextMajor} Mid`;
            const daysToReach = this.simulator.calculateDaysToReachRealm(targetRealm, 100, absorptionBonus);
            
            return Math.min(daysToReach, maxDays);
        }
        
        if (endCondition.endsAt === 'Next Major Late') {
            const currentMajor = this.playerData.mainPathRealmMajor;
            const nextMajor = this.getNextMajorRealm(currentMajor);
            
            if (!nextMajor) {
                return maxDays;
            }
            
            const targetRealm = `${nextMajor} Late`;
            const daysToReach = this.simulator.calculateDaysToReachRealm(targetRealm, 100, absorptionBonus);
            
            return Math.min(daysToReach, maxDays);
        }
        
        return maxDays;
    }
    
    getTotalDaysUntilNextTimegateEnd() {
        const currentMajor = this.playerData.mainPathRealmMajor;
        const nextMajor = this.getNextMajorRealm(currentMajor);
        const currentTimegateDays = this.playerData.timegateDays || 0;
        const nextTimegateLength = this.timegateLengths[nextMajor] || 0;
        const totalDays = currentTimegateDays + nextTimegateLength;
        
        return totalDays;
    }
    
    getNextMajorRealm(currentMajor) {
        const realmOrder = ['Nascent', 'Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        const currentIndex = realmOrder.indexOf(currentMajor);
        const nextMajor = currentIndex < realmOrder.length - 1 ? realmOrder[currentIndex + 1] : null;
        
        return nextMajor;
    }
    
    getMaximumReachableRealmForScenario(scenario, totalDays, absorptionBonus) {
        
        // Get realm at breakthrough (end of current timegate)
        const currentTimegateDays = this.playerData.timegateDays || 0;
        const breakthroughResult = this.simulator.getRealmAtBreakthrough(currentTimegateDays, absorptionBonus);
        const realmAtBreakthrough = breakthroughResult.finalRealm;
        const progressAtBreakthrough = breakthroughResult.finalProgress;
        
        // Calculate maximum reachable realm during next timegate period
        // The totalDays includes both current timegate remaining and next timegate
        // So we need to calculate from breakthrough state with remaining days
        const nextMajor = this.getNextMajorRealm(this.playerData.mainPathRealmMajor);
        const nextTimegateLength = this.timegateLengths[nextMajor] || 0;
        const daysInNextTimegate = totalDays - currentTimegateDays;
        
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
        
        return maxRealm;
    }
}

export { ViryaScenarioComparator };
