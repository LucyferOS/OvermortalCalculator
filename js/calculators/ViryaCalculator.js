import { VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, PERCENTAGE_COMPLETE, PATH_MAIN, PATH_SECONDARY } from '../utilities/gameData.js';
import { ViryaRules } from '../engine/ViryaRules.js';
import { Progression } from '../engine/Progression.js';
import { splitRealm, xpBetween } from '../domain/realms.js';

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

        // Determine which path needs to be focused for this scenario.
        //
        // The rate below is the main path's either way. That is not a shortcut:
        // it is only ever used for targets whose secondary path requirement is
        // already satisfied, where the entire remaining cost is the main path
        // reaching Completion. Anything with real secondary path distance left
        // goes through calculateDaysToScenarioWithBonuses(), which derives the
        // secondary path's own rate per leg.
        let requiredPathFocus = PATH_MAIN;
        const dailyXPToUse = mainPathDailyXP || 0;

        if (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) {
            requiredPathFocus = PATH_SECONDARY;
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

    /**
     * The highest tier the player could hold in the *next* major realm, if they
     * pursue `targetScenario` in this one.
     *
     * The walk to the breakthrough is shared with the scenario comparator; all
     * that differs here is the question asked afterwards, which is how far up
     * the tier ladder the next realm's timegate allows.
     *
     * @returns {string} A tier name, or a message explaining why none is reachable.
     */
    static calculateMaxNextRealmScenario(targetScenario, playerData, mainPathDailyXPBase, secondaryPathDailyXPBase) {
        const currentBonus = this.detectScenario(playerData).absorptionBonus;

        const walk = Progression.simulateToBreakthrough({
            playerData,
            targetTier: targetScenario,
            mainDailyXP: Progression.dailyXPForPath(playerData, 'main', currentBonus),
            secondaryDailyXP: Progression.dailyXPForPath(playerData, 'secondary', currentBonus)
        });

        if (!walk.ok) {
            return walk.reason;
        }

        const { breakthroughPlayerData, nextMajor, nextTimegateLength } = walk;

        // A tier earned last realm may still be helping at the next realm's
        // Early stage, which is where the tier hunt restarts.
        const carriedBonus = ViryaRules.carriedBonusAt(targetScenario, 'Early');
        const mainDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: `${nextMajor} Early`, mainPathRealmMinor: 'Early' },
            carriedBonus
        );
        const secondaryDailyXP = Progression.dailyXPForPath(breakthroughPlayerData, 'secondary', 0);

        // Climb the ladder and stop at the first rung the timegate puts out of reach.
        let highestReachable = null;
        for (const tier of VIRYA_SCENARIO_ORDER.filter((t) => t !== SCENARIO_NO_VIRYA)) {
            const { daysNeeded } = this.calculateDaysToScenario(
                tier, breakthroughPlayerData, mainDailyXP, secondaryDailyXP
            );
            if (!Number.isFinite(daysNeeded) || daysNeeded > nextTimegateLength) break;
            highestReachable = tier;
        }

        return highestReachable ?? 'Cannot reach Completion';
    }

    /**
     * The absorption bonus a path is getting right now: the tier currently held
     * if there is one, otherwise whatever a tier held last realm still carries
     * into the given minor stage. Mirrors
     * `Calculator.calculatePathAbsorptionBonuses()`, which is what the rates
     * handed to this class were computed with.
     */
    static currentBonusAt(playerData, currentScenario, minorStage) {
        const held = ViryaRules.bonusFor(currentScenario);
        if (held > 0) return held;

        const carriedTier = ViryaRules.tierFromHadViryaOption(playerData.hadViryaLastRealm);
        return ViryaRules.carriedBonusAt(carriedTier, minorStage);
    }

    /**
     * Days to reach a tier, walked one leg at a time so that each leg is costed
     * at the absorption bonus actually in effect during it.
     *
     * The legs come from the rule table rather than being spelled out per
     * target scenario: reaching Half-Step means passing the Eminence
     * requirement, then the Perfect requirement (Eminence's bonus now active),
     * then Half-Step's own (Perfect's bonus active).
     */
    static calculateDaysToScenarioWithBonuses(targetScenario, currentScenario, playerData, totalXPNeeded, mainPathDailyXP, baseSecondaryPathDailyXP) {
        if (baseSecondaryPathDailyXP <= 0) {
            return Infinity;
        }

        // The main path has to finish its own realm first, and that leg needs
        // main path focus rather than secondary.
        //
        // It is quoted at exactly the figure the Completion row shows, and it
        // has to stay exactly that: every tier requires Completion, so a leg
        // priced any other way makes a tier read as arriving before the thing
        // it depends on. It used to be walked by its own averaged-rate helper,
        // which left out elixir, ignored the bonus carried from last realm, and
        // priced half the run at a tier the player only earns once the leg is
        // finished. The three-way gap was papered over with a max() against the
        // Completion figure afterwards; making the leg *be* that figure means
        // there is nothing left to clamp.
        const completionXP = this.calculateXPForCompletion(playerData);
        const mainPathDays = (completionXP > 0 && mainPathDailyXP > 0)
            ? completionXP / mainPathDailyXP
            : 0;

        let totalDays = mainPathDays;

        // Wisdom Confluence's Aux Cultivation share pays into the secondary path
        // on every day, the ones spent finishing the main path realm included,
        // so the secondary path is already part of the way along by the time the
        // focus switches. (The Daily EXP share needs no credit here: it feeds the
        // main path, so it is already inside the mainPathDailyXP above.)
        const mainLegBonus = this.currentBonusAt(playerData, currentScenario, playerData.mainPathRealmMinor);
        let confluenceCredit = mainPathDays * XPCalculator.calculateWisdomConfluenceAuxXP(playerData, mainLegBonus);

        // Then walk the secondary path through each tier requirement in turn.
        const order = ViryaRules.tierOrder();
        const targetRank = ViryaRules.tierRank(targetScenario);
        const startRank = Math.max(ViryaRules.tierRank(currentScenario), ViryaRules.tierRank(SCENARIO_COMPLETION));

        let legRealm = playerData.secondaryPathRealm;
        let legProgress = playerData.secondaryPathProgress;
        let tierBonus = ViryaRules.bonusFor(currentScenario);

        for (let rank = startRank + 1; rank <= targetRank; rank++) {
            const tier = order[rank];
            const requirement = ViryaRules.requirementFor(tier, playerData.mainPathRealmMajor);
            if (!requirement) continue;

            const legXP = xpBetween(legRealm, legProgress, requirement.realm, requirement.progress);
            if (legXP > 0) {
                // Spend whatever the Confluence banked during the main path leg
                // before charging any days for this one.
                const alreadyCovered = Math.min(confluenceCredit, legXP);
                confluenceCredit -= alreadyCovered;

                // A tier reached earlier in this walk is live for the rest of
                // it, and a tier held last realm may still be carrying at the
                // stage this leg starts from - whichever is larger.
                const legBonus = Math.max(
                    tierBonus,
                    this.currentBonusAt(playerData, currentScenario, splitRealm(legRealm).minor)
                );

                totalDays += this.daysForSecondaryXP(legXP - alreadyCovered, playerData, legBonus);
                legRealm = requirement.realm;
                legProgress = requirement.progress;
            }

            // Holding this tier means its bonus applies to the next leg.
            tierBonus = Math.max(tierBonus, ViryaRules.bonusFor(tier));
        }

        return totalDays;
    }

    /**
     * Daily XP the secondary path fills at on a day spent focusing it, at a
     * given absorption bonus.
     *
     * The character's rate is set by the **main** path's realm - re-pointing to
     * the stage's own realm would price a secondary path stage at the secondary
     * path's (lower) rates - and on top of it come the two sources only the
     * secondary path collects: benediction, and Wisdom Confluence's Aux
     * Cultivation share.
     *
     * It used to take a precomputed rate to use in place of the character's
     * own. That rate was the *main* path's, so every secondary path leg was
     * walked with the main path's elixir instead of its own benediction, and
     * because the number was already fixed the `bonusActive` argument reached
     * nothing but the Confluence - the tiers passed on the way granted their
     * absorption to no part of the walk.
     */
    static secondaryPathRate(playerData, bonusActive) {
        return Progression.secondaryPathDailyXPBase(playerData, bonusActive);
    }

    /**
     * Days for the secondary path to cover a given amount of XP at the bonus in
     * effect while it does so.
     */
    static daysForSecondaryXP(xpNeeded, playerData, bonusActive) {
        if (xpNeeded <= 0) {
            return 0;
        }

        const dailyXP = this.secondaryPathRate(playerData, bonusActive);
        return dailyXP > 0 ? xpNeeded / dailyXP : Infinity;
    }
}

export { ViryaCalculator };
