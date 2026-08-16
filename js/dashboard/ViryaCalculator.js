import { GameConstants, Realms, RealmMajorTotalXP, timegateLength, REALM_ORDER_MAJOR, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, PERCENTAGE_COMPLETE, PATH_MAIN, PATH_SECONDARY, XPData } from '../utilities/gameData.js';
import { ViryaRules } from '../engine/ViryaRules.js';
import { xpBetween } from '../domain/realms.js';
import { RealmCalculator } from './RealmCalculator.js';
import { RealmProgressionSimulator } from './RealmProgressionSimulator.js';
import { XPCalculator } from './XPCalculator.js';
// Labels shown for "what comes next" once a tier is held. Display only.
const NEXT_TIER_LABEL = {
    [SCENARIO_NO_VIRYA]: 'N/A',
    [SCENARIO_COMPLETION]: 'Eminence',
    [SCENARIO_EMINENCE]: 'Perfect',
    [SCENARIO_PERFECT]: 'Half-Step',
    [SCENARIO_HALF_STEP]: "Next major's Late"
};

class ViryaCalculator {
    /**
     * The player's tier, read from the rule table rather than a chain of exact
     * stage matches. Requirements are thresholds, so a secondary path that has
     * moved past a rung still satisfies it.
     */
    static detectScenario(playerData) {
        const scenario = ViryaRules.detectTierForPlayer(playerData);
        return {
            scenario,
            absorptionBonus: ViryaRules.bonusFor(scenario),
            isActive: scenario !== SCENARIO_NO_VIRYA,
            bonusEndsAt: NEXT_TIER_LABEL[scenario] ?? 'N/A'
        };
    }
    static calculateDaysToScenario(targetScenario, playerData, mainPathDailyXP, secondaryPathDailyXP) {
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= PERCENTAGE_COMPLETE;
        const currentScenarioInfo = this.detectScenario(playerData);
        const currentScenario = currentScenarioInfo.scenario;

        // Define scenario order including "No Virya"
        const currentIndex = VIRYA_SCENARIO_ORDER.indexOf(currentScenario);
        const targetIndex = VIRYA_SCENARIO_ORDER.indexOf(targetScenario);


        // Check if target is already achieved or passed
        if (targetIndex <= currentIndex) {
            // Determine required path focus for the scenario
            let requiredPathFocus = PATH_MAIN;
            if (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) {
                requiredPathFocus = PATH_SECONDARY;
            }
            return { daysNeeded: 0, xpNeeded: 0, requiredPathFocus };
        }

        // Determine which path needs to be focused for this scenario
        let requiredPathFocus = PATH_MAIN;
        let dailyXPToUse = mainPathDailyXP || 0;
        
        
        if (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) {
            requiredPathFocus = PATH_SECONDARY;
            // For secondary path scenarios in Virya table, use mainPathDailyXP to match Completion
            // This ensures Completion and Eminence show the same time when they should match
            dailyXPToUse = mainPathDailyXP || 0;
        } else {
        }


        // Special handling for "No Virya" to "Completion" transition
        if (currentScenario === SCENARIO_NO_VIRYA && targetScenario === SCENARIO_COMPLETION) {
            // Need to calculate XP for main path to reach 100% Late
            const xpNeeded = this.calculateXPForCompletion(playerData);
            
            if (dailyXPToUse <= 0) {
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus: PATH_MAIN };
            }
            
            const daysNeeded = xpNeeded / dailyXPToUse;
            return { daysNeeded, xpNeeded, requiredPathFocus: PATH_MAIN };
        }

        // For other transitions, check if we have the required daily XP
        if (dailyXPToUse <= 0) {
            return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
        }

        // Ensure main path is at 100% Late for all virya scenarios (Eminence, Perfect, Half-Step)
        // Completion is required first for these scenarios
        if ((targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) && !isMainPath100Late) {
            // The calculateXPFor* functions already include Completion XP, so we can proceed
            // But we should log this requirement
        }

        // Calculate XP needed based on target scenario
        let xpNeeded = 0;

        try {
            switch(targetScenario) {
                case SCENARIO_COMPLETION:
                    xpNeeded = this.calculateXPForCompletion(playerData);
                    break;
                case SCENARIO_EMINENCE:
                    xpNeeded = this.calculateXPForEminence(playerData);
                    break;
                case SCENARIO_PERFECT:
                    xpNeeded = this.calculateXPForPerfect(playerData);
                    break;
                case SCENARIO_HALF_STEP:
                    xpNeeded = this.calculateXPForHalfStep(playerData);
                    break;
                default:
                    return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }


            if (xpNeeded <= 0) {
                return { daysNeeded: 0, xpNeeded: 0, requiredPathFocus };
            }

            // For secondary path scenarios, calculate days stage-by-stage with proper virya bonuses
            // However, if the secondary path requirement is already met, we only need main path progression,
            // so use simple calculation
            let daysNeeded;
            let isSecondaryRequirementMet = false;
            if (targetScenario === SCENARIO_EMINENCE) {
                // Eminence requirement met if XP equals Completion XP
                isSecondaryRequirementMet = xpNeeded === this.calculateXPForCompletion(playerData);
            } else if (targetScenario === SCENARIO_PERFECT) {
                // Perfect requirement met if XP equals Eminence XP
                isSecondaryRequirementMet = xpNeeded === this.calculateXPForEminence(playerData);
            } else if (targetScenario === SCENARIO_HALF_STEP) {
                // Half-Step requirement met if XP equals Perfect XP
                isSecondaryRequirementMet = xpNeeded === this.calculateXPForPerfect(playerData);
            }
            
            if (requiredPathFocus === PATH_SECONDARY && (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) && !isSecondaryRequirementMet) {
                daysNeeded = this.calculateDaysToScenarioWithBonuses(targetScenario, currentScenario, playerData, xpNeeded, mainPathDailyXP, secondaryPathDailyXP);
            } else {
                daysNeeded = xpNeeded / dailyXPToUse;
            }
            

            // Safety checks
            if (isNaN(daysNeeded)) {
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }

            if (!isFinite(daysNeeded)) {
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }

            return { daysNeeded, xpNeeded, requiredPathFocus };

        } catch (error) {
            return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
        }
    }
    /**
     * XP the main path still needs to reach 100% of its major realm's Late
     * stage. Every Virya tier requires this first.
     */
    static calculateXPForCompletion(playerData) {
        return xpBetween(
            playerData.mainPathRealm, playerData.mainPathProgress,
            `${playerData.mainPathRealmMajor} Late`, PERCENTAGE_COMPLETE
        );
    }

    /**
     * Total XP needed to reach a tier from the player's current position:
     * whatever the main path still owes for Completion, plus whatever the
     * secondary path still owes to satisfy the tier's requirement.
     *
     * Because requirements are positions on a single ordered ladder, the walk
     * from the secondary path's current position to the target requirement
     * already passes through every lower tier's requirement. There is no need
     * to accumulate the tiers separately.
     */
    static calculateXPForTier(tierName, playerData) {
        const currentTier = ViryaRules.detectTierForPlayer(playerData);
        if (ViryaRules.tierRank(currentTier) >= ViryaRules.tierRank(tierName)) {
            return 0;
        }

        const completionXP = this.calculateXPForCompletion(playerData);

        const requirement = ViryaRules.requirementFor(tierName, playerData.mainPathRealmMajor);
        const secondaryXP = requirement
            ? xpBetween(
                playerData.secondaryPathRealm, playerData.secondaryPathProgress,
                requirement.realm, requirement.progress
            )
            : 0;

        return completionXP + secondaryXP;
    }

    static calculateXPForEminence(playerData) {
        return this.calculateXPForTier(SCENARIO_EMINENCE, playerData);
    }

    static calculateXPForPerfect(playerData) {
        return this.calculateXPForTier(SCENARIO_PERFECT, playerData);
    }

    static calculateXPForHalfStep(playerData) {
        return this.calculateXPForTier(SCENARIO_HALF_STEP, playerData);
    }

    /**
     * XP still needed to travel between two positions on the realm ladder.
     * Delegates to the domain helper; kept as a static so existing call sites
     * and any saved bookmarks into this class keep working.
     */
    static calculateXPToReach(currentRealm, currentProgress, targetRealm, targetProgress) {
        return xpBetween(currentRealm, currentProgress, targetRealm, targetProgress);
    }

    static calculateMaxNextRealmScenario(targetScenario, playerData, mainPathDailyXPBase, secondaryPathDailyXPBase) {
        const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
        
        // Safety check: Validate current major is in the realm order
        if (currentMajorIndex === -1) {
            return 'Invalid current realm';
        }
        
        // Safety check: Ensure we only calculate for the immediate next realm (exactly one step ahead)
        const nextMajorIndex = currentMajorIndex + 1;
        if (nextMajorIndex >= REALM_ORDER_MAJOR.length) {
            return 'Next realm not implemented yet';
        }
        
        const nextMajor = REALM_ORDER_MAJOR[nextMajorIndex];
        
        // Safety check: Verify nextMajor is exactly one step ahead
        if (nextMajorIndex !== currentMajorIndex + 1) {
            return 'Realm progression error';
        }
        
        // ===== Use overflow calculation logic to determine breakthrough timing =====
        // Recalculate daily XP values based on current player state
        const currentViryaInfo = this.detectScenario(playerData);
        const currentMainPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(playerData, currentViryaInfo.absorptionBonus);
        
        // Calculate secondary path daily XP based on current player state
        let currentSecondaryPathDailyXP = 0;
        if (playerData.secondaryPathRealm && playerData.secondaryPathRealmMajor) {
            const realmXPKey = playerData.secondaryPathRealmMajor + "XP";
            if (XPData[realmXPKey]) {
                const secondaryPathPlayerData = {
                    ...playerData,
                    mainPathRealm: playerData.secondaryPathRealm,
                    mainPathRealmMajor: playerData.secondaryPathRealmMajor,
                    mainPathRealmMinor: playerData.secondaryPathRealmMinor
                };
                currentSecondaryPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, currentViryaInfo.absorptionBonus);
            }
        }
        
        const currentScenario = currentViryaInfo.scenario;
        const currentIndex = VIRYA_SCENARIO_ORDER.indexOf(currentScenario);
        const targetIndex = VIRYA_SCENARIO_ORDER.indexOf(targetScenario);
        
        // Get timegate information
        const currentTimegateDays = playerData.timegateDays || 0;
        const nextTimegateLength = timegateLength[nextMajor] || 0;
        
        if (nextTimegateLength <= 0) {
            return '--';
        }
        
        // Calculate days to reach scenario (Phase 1 from overflow calculation)
        let daysToReach = 0;
        if (targetIndex > currentIndex) {
            const daysToReachInfo = this.calculateDaysToScenario(targetScenario, playerData, currentMainPathDailyXP, currentSecondaryPathDailyXP);
            daysToReach = daysToReachInfo?.daysNeeded || Infinity;
            
            if (daysToReach === Infinity) {
                return 'Cannot reach scenario';
            }
        } else {
            // Already at or past scenario
            daysToReach = 0;
        }
        
        // Breakthrough happens when BOTH conditions are met: scenario reached AND timegate ended
        // Breakthrough time = max(daysToReach, currentTimegateDays)
        const breakthroughTime = Math.max(daysToReach, currentTimegateDays);
        const daysAvailableInNextRealm = nextTimegateLength;
        
        // ===== Simulate Phase 2: XP after reaching scenario until breakthrough =====
        // This is needed to get the overflow conversion state (Phase 2 overflow XP converts to next realm progress)
        let phase2Result = null;
        let phase2OverflowConverted = false;
        
        // Calculate days available after reaching scenario until breakthrough
        const daysAfterScenarioUntilBreakthrough = targetIndex > currentIndex 
            ? Math.max(0, breakthroughTime - daysToReach)
            : Math.max(0, breakthroughTime);
        
        if (daysAfterScenarioUntilBreakthrough > 0) {
            // Determine Phase 2 starting state (at 100% Late in current major)
            const currentLateRealm = `${playerData.mainPathRealmMajor} Late`;
            const currentLateRealmXP = Realms[currentLateRealm]?.xp || 0;
            
            const phase2PlayerData = {
                ...playerData,
                mainPathRealm: currentLateRealm,
                mainPathRealmMajor: playerData.mainPathRealmMajor,
                mainPathRealmMinor: 'Late',
                mainPathProgress: 100,
                mainPathExp: currentLateRealmXP,
                cosmoapsisValue: undefined
            };
            
            const targetScenarioBonus = ViryaRules.bonusFor(targetScenario);
            const phase2DailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(phase2PlayerData, targetScenarioBonus);
            
            // Simulate Phase 2 (overflow XP in current realm)
            const phase2Simulator = new RealmProgressionSimulator(phase2PlayerData, phase2DailyXP, 'max-next-realm-phase2');
            phase2Result = phase2Simulator.simulateDays(
                daysAfterScenarioUntilBreakthrough,
                targetScenarioBonus,
                null, // No bonus end condition during overflow
                currentLateRealm // Max realm is current Late (just overflow)
            );
            
            // Check if Phase 2 overflow was converted to next realm
            if (phase2Result.finalRealm && phase2Result.finalRealm.startsWith(nextMajor)) {
                phase2OverflowConverted = true;
            }
        }
        
        // Where the secondary path sits once the target tier is reached: at the
        // tier's requirement, or wherever it already is if that is further on.
        const secondaryPathAtScenario = ViryaRules.secondaryPositionAtTier(
            targetScenario,
            playerData.mainPathRealmMajor,
            {
                realm: playerData.secondaryPathRealm,
                major: playerData.secondaryPathRealmMajor,
                minor: playerData.secondaryPathRealmMinor,
                progress: playerData.secondaryPathProgress
            }
        );

        // Simulate player state at breakthrough after reaching target scenario
        // IMPORTANT: If Phase 2 had overflow XP, the simulator converts it to next realm progress
        // We should use the converted state from Phase 2, not start at 0% Early
        let breakthroughPlayerData;
        
        if (phase2OverflowConverted && phase2Result) {
            // Phase 2 overflow was converted to next realm - use that state
            const phase2FinalRealm = phase2Result.finalRealm;
            const phase2FinalProgress = phase2Result.finalProgress;
            const [major, minor] = phase2FinalRealm.split(' ');
            const phase2FinalRealmXP = Realms[phase2FinalRealm]?.xp || 0;
            const phase2FinalExp = (phase2FinalRealmXP * phase2FinalProgress) / 100;
            
            breakthroughPlayerData = {
                ...playerData,
                mainPathRealm: phase2FinalRealm,
                mainPathRealmMajor: major,
                mainPathRealmMinor: minor,
                mainPathProgress: phase2FinalProgress,
                mainPathExp: phase2FinalExp,
                secondaryPathRealm: secondaryPathAtScenario.realm,
                secondaryPathRealmMajor: secondaryPathAtScenario.major,
                secondaryPathRealmMinor: secondaryPathAtScenario.minor,
                secondaryPathProgress: secondaryPathAtScenario.progress,
                cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
            };
        } else {
            // No Phase 2 overflow conversion - start at 0% Early
            breakthroughPlayerData = {
                ...playerData,
                mainPathRealm: `${nextMajor} Early`,
                mainPathRealmMajor: nextMajor,
                mainPathRealmMinor: 'Early',
                mainPathProgress: 0,
                mainPathExp: 0,
                secondaryPathRealm: secondaryPathAtScenario.realm,
                secondaryPathRealmMajor: secondaryPathAtScenario.major,
                secondaryPathRealmMinor: secondaryPathAtScenario.minor,
                secondaryPathProgress: secondaryPathAtScenario.progress,
                cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
            };
        }
        
        // Safety check: Verify breakthrough state is set to the immediate next realm only
        const breakthroughMajorIndex = REALM_ORDER_MAJOR.indexOf(breakthroughPlayerData.mainPathRealmMajor);
        if (breakthroughMajorIndex !== nextMajorIndex) {
            return 'Breakthrough state validation error';
        }
        
        // Safety check: Verify breakthrough realm is in next major (can be Early, Mid, or Late if overflow converted)
        if (!breakthroughPlayerData.mainPathRealm.startsWith(nextMajor)) {
            return 'Breakthrough realm validation error';
        }
        
        // Daily XP just after breaking through, at the next major's Early stage.
        // Whether the tier just earned still helps here comes from the rule
        // table: Eminence does not carry forward at all, Perfect carries
        // through Early, Half-Step through Early and Mid.
        const earlyBonus = ViryaRules.carriedBonusAt(targetScenario, 'Early');

        const breakthroughMainPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: `${nextMajor} Early`, mainPathRealmMinor: 'Early' },
            earlyBonus
        );
        
        // Calculate secondary path daily XP at breakthrough state
        const secondaryPathPlayerData = {
            ...breakthroughPlayerData,
            mainPathRealm: breakthroughPlayerData.secondaryPathRealm,
            mainPathRealmMajor: breakthroughPlayerData.secondaryPathRealmMajor,
            mainPathRealmMinor: breakthroughPlayerData.secondaryPathRealmMinor,
            mainPathProgress: breakthroughPlayerData.secondaryPathProgress
        };
        const breakthroughSecondaryPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, 0);
        
        // Check scenarios in ascending order
        const scenariosToCheck = [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
        let highestReachable = null;
        
        for (const scenario of scenariosToCheck) {
            
            // Safety check: Verify breakthrough player data is still at the correct realm before each calculation
            if (breakthroughPlayerData.mainPathRealmMajor !== nextMajor) {
                return 'Realm validation error during scenario check';
            }
            
            // Calculate time needed to reach this scenario from breakthrough state
            // Note: We pass a copy to prevent calculateDaysToScenario from modifying the original
            const daysNeededInfo = this.calculateDaysToScenario(
                scenario,
                { ...breakthroughPlayerData }, // Pass a copy to prevent mutation
                breakthroughMainPathDailyXP,
                breakthroughSecondaryPathDailyXP
            );
            
            const daysNeeded = daysNeededInfo?.daysNeeded || Infinity;
            
            
            // Safety check: Verify the calculation didn't modify the breakthrough state
            if (breakthroughPlayerData.mainPathRealmMajor !== nextMajor) {
                return 'Realm modified during calculation';
            }
            
            if (daysNeeded !== Infinity && daysNeeded <= daysAvailableInNextRealm) {
                // Scenario is reachable
                highestReachable = scenario;
            } else {
                // Cannot reach this scenario within timegate - stop checking
                break;
            }
        }
        
        if (highestReachable === null) {
            // Cannot reach even Completion
            return 'Cannot reach Completion';
        }
        
        // Final safety check: Verify we're still at the correct realm after all calculations
        if (breakthroughPlayerData.mainPathRealmMajor !== nextMajor) {
            return 'Realm validation error';
        }
        
        return highestReachable;
    }
    
    /**
     * Days to reach a tier, walked one tier at a time so that each leg is
     * costed at the absorption bonus actually in effect during it.
     *
     * The legs come from the rule table rather than being spelled out per
     * target scenario: reaching Half-Step means passing the Eminence
     * requirement (no bonus), then the Perfect requirement (Eminence's bonus
     * now active), then Half-Step's own (Perfect's bonus active).
     */
    static calculateDaysToScenarioWithBonuses(targetScenario, currentScenario, playerData, totalXPNeeded, mainPathDailyXP, baseSecondaryPathDailyXP) {
        if (baseSecondaryPathDailyXP <= 0) {
            return Infinity;
        }

        let totalDays = 0;

        // The main path has to finish its own realm first, and that leg needs
        // main path focus rather than secondary.
        if (!ViryaRules.isMainPathComplete(playerData.mainPathRealmMinor, playerData.mainPathProgress)
            && mainPathDailyXP > 0
            && this.calculateXPForCompletion(playerData) > 0) {
            totalDays += this.calculateDaysForMainPathStage(
                playerData.mainPathRealm,
                playerData.mainPathProgress,
                `${playerData.mainPathRealmMajor} Late`,
                PERCENTAGE_COMPLETE,
                playerData
            );
        }

        // Then walk the secondary path through each tier requirement in turn.
        const order = ViryaRules.tierOrder();
        const targetRank = ViryaRules.tierRank(targetScenario);
        const startRank = Math.max(ViryaRules.tierRank(currentScenario), ViryaRules.tierRank(SCENARIO_COMPLETION));

        let legRealm = playerData.secondaryPathRealm;
        let legProgress = playerData.secondaryPathProgress;
        let bonusInEffect = 0;

        for (let rank = startRank + 1; rank <= targetRank; rank++) {
            const tier = order[rank];
            const requirement = ViryaRules.requirementFor(tier, playerData.mainPathRealmMajor);
            if (!requirement) continue;

            const legXP = xpBetween(legRealm, legProgress, requirement.realm, requirement.progress);
            if (legXP > 0) {
                totalDays += this.calculateDaysForStage(
                    legRealm, legProgress,
                    requirement.realm, requirement.progress,
                    bonusInEffect, playerData, true, mainPathDailyXP
                );
                legRealm = requirement.realm;
                legProgress = requirement.progress;
            }

            // Holding this tier means its bonus applies to the next leg.
            bonusInEffect = ViryaRules.bonusFor(tier);
        }

        return totalDays;
    }

    static calculateDaysForStage(startRealm, startProgress, endRealm, endProgress, bonusActive, playerData, useMainPathDailyXP = false, mainPathDailyXP = null) {
        // Calculate days needed for a single stage (secondary path), accounting for realm progression
        // Uses average of daily XP at start and end of stage
        // For Perfect and Half-Step, use mainPathDailyXP instead of calculating from secondary path
        
        let averageDailyXP;
        if (useMainPathDailyXP && mainPathDailyXP !== null) {
            // Use mainPathDailyXP for Perfect and Half-Step scenarios
            averageDailyXP = mainPathDailyXP;
        } else {
            // Calculate daily XP from secondary path realm progression
            const [startMajor, startMinor] = startRealm.split(' ');
            const startPlayerData = {
                ...playerData,
                mainPathRealm: startRealm,
                mainPathRealmMajor: startMajor,
                mainPathRealmMinor: startMinor,
                mainPathProgress: startProgress
            };
            const startDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(startPlayerData, bonusActive);
            
            const [endMajor, endMinor] = endRealm.split(' ');
            const endPlayerData = {
                ...playerData,
                mainPathRealm: endRealm,
                mainPathRealmMajor: endMajor,
                mainPathRealmMinor: endMinor,
                mainPathProgress: endProgress
            };
            const endDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(endPlayerData, bonusActive);
            
            // Average accounts for daily XP increasing as realm progresses
            averageDailyXP = (startDailyXP + endDailyXP) / 2;
        }
        
        if (averageDailyXP <= 0) {
            return Infinity;
        }
        
        const stageXP = this.calculateXPToReach(startRealm, startProgress, endRealm, endProgress);
        return stageXP / averageDailyXP;
    }
    
    static calculateDaysForMainPathStage(startRealm, startProgress, endRealm, endProgress, playerData) {
        // Calculate days needed for a main path stage, accounting for realm progression
        // Uses average of daily XP at start and end of stage
        
        const [startMajor, startMinor] = startRealm.split(' ');
        const startPlayerData = {
            ...playerData,
            mainPathRealm: startRealm,
            mainPathRealmMajor: startMajor,
            mainPathRealmMinor: startMinor,
            mainPathProgress: startProgress
        };
        const viryaInfo = this.detectScenario(startPlayerData);
        const startDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(startPlayerData, viryaInfo.absorptionBonus);
        
        const [endMajor, endMinor] = endRealm.split(' ');
        const endPlayerData = {
            ...playerData,
            mainPathRealm: endRealm,
            mainPathRealmMajor: endMajor,
            mainPathRealmMinor: endMinor,
            mainPathProgress: endProgress
        };
        const endViryaInfo = this.detectScenario(endPlayerData);
        const endDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(endPlayerData, endViryaInfo.absorptionBonus);
        
        // Average accounts for daily XP increasing as realm progresses
        const averageDailyXP = (startDailyXP + endDailyXP) / 2;
        
        if (averageDailyXP <= 0) {
            return Infinity;
        }
        
        const stageXP = this.calculateXPToReach(startRealm, startProgress, endRealm, endProgress);
        return stageXP / averageDailyXP;
    }
}

export { ViryaCalculator };
