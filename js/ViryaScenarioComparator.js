import { RealmProgressionSimulator } from './RealmProgressionSimulator.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { timegateLength } from './gameData.js';
import { Logger } from './Logger.js';

class ViryaScenarioComparator {
    constructor(playerData, dailyXP, comparatorId = 'default') {
        this.playerData = { ...playerData };
        this.dailyXP = dailyXP;
        this.comparatorId = comparatorId;
        this.simulator = new RealmProgressionSimulator(playerData, dailyXP, `${comparatorId}-sim`);
        this.timegateLengths = timegateLength;
        
        // Define scenario bonuses
        this.scenarioBonus = {
            'No Virya': 0.0,
            'Completion': 0.0,
            'Eminence': 0.2,
            'Perfect': 0.2,
            'Half-Step': 0.4
        };
        
        // Define when each bonus ends
        this.bonusEndConditions = {
            'Completion': { endsAt: 'Immediately' },
            'Eminence': { endsAt: 'Next Major Early' },
            'Perfect': { endsAt: 'Half-Step' },
            'Half-Step': { endsAt: 'Next Major Late' }
        };
        
        // Scenario order for progression
        this.scenarioOrder = ['No Virya', 'Completion', 'Eminence', 'Perfect', 'Half-Step'];
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
        
        const scenario1Result = this.calculateScenarioTotalXP(scenario1, 'Scenario1');
        const scenario2Result = this.calculateScenarioTotalXP(scenario2, 'Scenario2');
        
        const difference = scenario2Result.totalXP - scenario1Result.totalXP;
        const percentage = scenario1Result.totalXP > 0 ? (difference / scenario1Result.totalXP) * 100 : 0;
        const totalDays = this.getTotalDaysUntilNextTimegateEnd();
        
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
                xpLostDuringFocus: scenario1Result.xpLostDuringFocus || 0
            },
            scenario2: {
                name: scenario2,
                totalXP: scenario2Result.totalXP,
                daysToReach: scenario2Result.daysToReach || 0,
                bonus: this.scenarioBonus[scenario2] || 0,
                reachedBeforeTimegate: scenario2Result.reachedBeforeTimegate || false,
                xpLostDuringFocus: scenario2Result.xpLostDuringFocus || 0
            },
            comparison: {
                betterScenario: difference > 0 ? scenario2 : (difference < 0 ? scenario1 : 'Equal'),
                difference: difference,
                percentage: `${difference >= 0 ? '+' : ''}${percentage.toFixed(2)}%`,
                rawPercentage: percentage,
                totalDaysUntilNextTimegateEnd: totalDays,
                recommendation: difference > 0 ? scenario2 : scenario1
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
        
        let daysWithBonus = 0;
        let daysWithoutBonus = 0;
        
        if (endCondition.endsAt === 'Immediately') {
            daysWithBonus = 0;
            daysWithoutBonus = totalDays;
            Logger.info('Bonus ends immediately, no bonus period');
        } else {
            // Calculate days until bonus ends
            const daysUntilBonusEnds = this.calculateDaysUntilBonusEnds(scenario, bonus, totalDays);
            daysWithBonus = Math.min(daysUntilBonusEnds, totalDays);
            daysWithoutBonus = Math.max(0, totalDays - daysWithBonus);
            
            Logger.info('Bonus duration analysis:', {
                'Days with bonus': daysWithBonus.toFixed(2),
                'Days without bonus': daysWithoutBonus.toFixed(2),
                'Bonus coverage': `${((daysWithBonus / totalDays) * 100).toFixed(1)}% of total period`
            });
        }
        
        // Calculate XP for both periods
        Logger.debug('Simulating XP periods...');
        const xpWithBonus = this.simulatePeriod(daysWithBonus, bonus, `With Bonus (${bonus * 100}%)`);
        const xpWithoutBonus = this.simulatePeriod(daysWithoutBonus, 0, 'Without Bonus');
        
        const totalXP = xpWithBonus + xpWithoutBonus;
        
        Logger.success(`Period breakdown for ${scenario}:`, {
            'XP with bonus': xpWithBonus.toLocaleString(),
            'XP without bonus': xpWithoutBonus.toLocaleString(),
            'Total XP': totalXP.toLocaleString(),
            'Average daily XP': totalDays > 0 ? (totalXP / totalDays).toLocaleString() : 'N/A'
        });
        
        Logger.groupEnd();
        
        return {
            totalXP,
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
        
        // Calculate days needed to reach target scenario
        const secondaryDailyXP = this.playerData.pathFocus === 'Secondary Path' ? this.dailyXP : 0;
        Logger.debug('Secondary path analysis:', {
            'Path Focus': this.playerData.pathFocus,
            'Secondary Daily XP': secondaryDailyXP.toLocaleString(),
            'Can progress secondary': secondaryDailyXP > 0 ? '✓' : '✗'
        });
        
        const daysToReachInfo = ViryaCalculator.calculateDaysToScenario(targetScenario, this.playerData, secondaryDailyXP);
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
            const xp = this.simulatePeriod(totalDays, currentBonus, `Stuck in ${currentScenario}`);
            
            Logger.groupEnd();
            return {
                totalXP: xp,
                reachedBeforeTimegate: false,
                daysToReach: daysToReach
            };
        }
        
        // We can reach the scenario
        const daysRemaining = totalDays - daysToReach;
        Logger.success(`Can reach ${targetScenario} in ${daysToReach.toFixed(2)} days`, {
            'Days remaining after reaching': daysRemaining.toFixed(2),
            'Time spent on transition': `${((daysToReach / totalDays) * 100).toFixed(1)}%`,
            'Time with target bonus': `${((daysRemaining / totalDays) * 100).toFixed(1)}%`
        });
        
        // Period 1: Before reaching scenario (with current bonus)
        Logger.group('📅 PERIOD 1: Working towards target scenario', Logger.DEBUG);
        const xpPeriod1 = this.simulatePeriod(daysToReach, currentBonus, `Transition period (${currentScenario})`);
        Logger.groupEnd();
        
        // Period 2: After reaching scenario
        Logger.group('📅 PERIOD 2: After reaching target scenario', Logger.DEBUG);
        const xpPeriod2 = this.calculateXPForCurrentScenario(targetScenario, daysRemaining);
        Logger.groupEnd();
        
        const totalXP = xpPeriod1 + xpPeriod2.totalXP;
        
        Logger.success(`Transition complete - ${currentScenario} → ${targetScenario}:`, {
            'XP during transition (Period 1)': xpPeriod1.toLocaleString(),
            'XP after transition (Period 2)': xpPeriod2.totalXP.toLocaleString(),
            'Total XP': totalXP.toLocaleString(),
            'Transition cost (XP lost)': xpPeriod1.toLocaleString(),
            'Net gain from transition': (totalXP - this.simulatePeriod(totalDays, currentBonus, 'If stayed')).toLocaleString()
        });
        
        Logger.groupEnd();
        
        return {
            totalXP: totalXP,
            reachedBeforeTimegate: true,
            daysToReach: daysToReach,
            xpLostDuringFocus: xpPeriod1
        };
    }
    
    simulatePeriod(days, absorptionBonus, label = 'Period') {
        if (days <= 0) {
            Logger.debug(`Skipping ${label} - 0 days`);
            return 0;
        }
        
        Logger.debug(`Simulating ${label} (${days.toFixed(2)} days, ${absorptionBonus * 100}% bonus)`);
        const result = this.simulator.simulateDays(days, absorptionBonus);
        
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
        
        if (endCondition.endsAt === 'Half-Step') {
            // Half-Step ends when both paths are 100% Late in current major
            const targetRealm = `${this.playerData.mainPathRealmMajor} Late`;
            const daysToReach = this.simulator.calculateDaysToReachRealm(targetRealm, 100, absorptionBonus);
            
            Logger.info(`Bonus ends at Half-Step (${targetRealm}):`, {
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
}

export { ViryaScenarioComparator };