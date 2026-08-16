import { RealmProgressionSimulator } from './RealmProgressionSimulator.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { XPCalculator } from './XPCalculator.js';
import { timegateLength, VIRYA_SCENARIO_ORDER, REALM_ORDER_MINOR } from '../utilities/gameData.js';
import { ViryaRules } from '../engine/ViryaRules.js';
import { Progression } from '../engine/Progression.js';
import { nextMajor as nextMajorOf } from '../domain/realms.js';

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
            // Fall back to deriving both path totals from the player state.
            const bonus = ViryaCalculator.detectScenario(playerData).absorptionBonus;
            this.mainPathDailyXPBase = Progression.dailyXPForPath(playerData, 'main', bonus);
            this.secondaryPathDailyXPBase = Progression.dailyXPForPath(playerData, 'secondary', bonus);
        }
        
        // Bonuses and expiry both come from the rule table.
        this.scenarioBonus = Object.fromEntries(
            ViryaRules.tierOrder().map((tier) => [tier, ViryaRules.bonusFor(tier)])
        );

        // A carried bonus expires once the player reaches the first minor stage
        // it no longer covers.
        this.bonusEndConditions = Object.fromEntries(
            ViryaRules.tierOrder().map((tier) => {
                const carries = REALM_ORDER_MINOR.filter((minor) => ViryaRules.isCarriedBonusActive(tier, minor));
                const expiresAt = REALM_ORDER_MINOR[carries.length];
                return [tier, { endsAt: expiresAt ? `Next Major ${expiresAt}` : 'Immediately' }];
            })
        );

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
    
    /**
     * XP banked by pursuing a tier and then switching to main path focus:
     * the overflow accumulated while waiting out the current timegate, plus
     * whatever the next realm yields before its own timegate ends.
     *
     * The XP spent *reaching* the tier is reported separately rather than
     * counted here.
     */
    calculateOverflowXPForScenario(targetScenario, totalDays) {
        const currentBonus = ViryaCalculator.detectScenario(this.playerData).absorptionBonus;

        const walk = Progression.simulateToBreakthrough({
            playerData: this.playerData,
            targetTier: targetScenario,
            mainDailyXP: Progression.dailyXPForPath(this.playerData, 'main', currentBonus),
            secondaryDailyXP: Progression.dailyXPForPath(this.playerData, 'secondary', currentBonus)
        });

        if (!walk.ok) {
            return { overflowXP: 0, totalXP: 0, xpRequiredToReach: 0 };
        }

        const { daysToReach, phase2XP, daysAvailableForOverflow, breakthroughPlayerData, nextMajor } = walk;

        // The XP cost of reaching the tier, reported but not counted as banked.
        const xpRequiredToReach = ViryaCalculator.calculateDaysToScenario(
            targetScenario, this.playerData,
            Progression.dailyXPForPath(this.playerData, 'main', currentBonus),
            Progression.dailyXPForPath(this.playerData, 'secondary', currentBonus)
        )?.xpNeeded || 0;

        // A tier that cannot be reached before the whole window closes banks nothing.
        if (daysToReach >= totalDays) {
            return { overflowXP: 0, totalXP: 0, xpRequiredToReach };
        }

        let xpInNextRealm = 0;
        if (daysAvailableForOverflow > 0) {
            const carriedBonus = ViryaRules.carriedBonusAt(targetScenario, 'Early');
            const endCondition = this.bonusEndConditions[targetScenario] ?? null;

            const dailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(breakthroughPlayerData, carriedBonus);
            const simulator = new RealmProgressionSimulator(breakthroughPlayerData, dailyXP, 'overflow-next-realm');

            xpInNextRealm = simulator.simulateDays(
                daysAvailableForOverflow,
                carriedBonus,
                carriedBonus > 0 ? endCondition : null,
                `${nextMajor} Late`
            ).totalXP;
        }

        const overflowXP = phase2XP + xpInNextRealm;
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
    
    getTotalDaysUntilNextTimegateEnd() {
        const currentMajor = this.playerData.mainPathRealmMajor;
        const nextMajor = this.getNextMajorRealm(currentMajor);
        const currentTimegateDays = this.playerData.timegateDays || 0;
        const nextTimegateLength = this.timegateLengths[nextMajor] || 0;
        const totalDays = currentTimegateDays + nextTimegateLength;
        
        return totalDays;
    }
    
    getNextMajorRealm(currentMajor) {
        return nextMajorOf(currentMajor);
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
