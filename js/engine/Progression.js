// Progression through a breakthrough.
//
// Two callers used to carry near-identical ~200 line copies of this:
// ViryaCalculator.calculateMaxNextRealmScenario, asking "which tier could I
// reach in the next realm", and ViryaScenarioComparator.calculateOverflowXPForScenario,
// asking "how much XP would I bank". They differ only in what they do with the
// result, so the walk to the breakthrough lives here once.
//
// The walk has three legs:
//
//   1. Reach the target tier.                       (daysToReach)
//   2. Sit at 100% Late banking overflow XP until   (phase2XP)
//      the current timegate ends. Breaking through
//      early is not possible.
//   3. Progress through the next realm.             (left to the caller)

import { RealmProgressionSimulator } from '../calculators/RealmProgressionSimulator.js';
import { XPCalculator } from '../calculators/XPCalculator.js';
import { ViryaCalculator } from '../calculators/ViryaCalculator.js';
import { ViryaRules } from './ViryaRules.js';
import { nextMajor as nextMajorOf, realmXP, splitRealm } from '../domain/realms.js';
import { XPData, timegateLength, PERCENTAGE_COMPLETE } from '../utilities/gameData.js';

/**
 * Daily XP for one of the player's two paths.
 *
 * This replaces the "spread playerData and overwrite the mainPath fields"
 * pattern that was copied into five places, each with slightly different ideas
 * about which fields to carry across. Progress is always carried, and no
 * derived value is inherited.
 *
 * @param {Object} playerData
 * @param {'main'|'secondary'} path
 * @param {number} absorptionBonus
 */
export function dailyXPForPath(playerData, path, absorptionBonus) {
    const state = asPathPlayerData(playerData, path);
    if (!state) return 0;
    return XPCalculator.calculateDailyXPWithAbsorptionBonus(state, absorptionBonus);
}

/**
 * Re-point a playerData object so that the XP calculators, which only know how
 * to read the `mainPath*` fields, see the requested path.
 *
 * Returns null when the path cannot be costed, either because it is unset or
 * because its major realm has no XP table.
 */
export function asPathPlayerData(playerData, path) {
    if (path === 'main') return playerData;

    if (!playerData.secondaryPathRealm || !playerData.secondaryPathRealmMajor) return null;
    if (!XPData[`${playerData.secondaryPathRealmMajor}XP`]) return null;

    return {
        ...playerData,
        mainPathRealm: playerData.secondaryPathRealm,
        mainPathRealmMajor: playerData.secondaryPathRealmMajor,
        mainPathRealmMinor: playerData.secondaryPathRealmMinor,
        mainPathProgress: playerData.secondaryPathProgress
    };
}

/** Player state positioned at 100% of the current major realm's Late stage. */
function atCompletion(playerData) {
    const realm = `${playerData.mainPathRealmMajor} Late`;
    return {
        ...playerData,
        mainPathRealm: realm,
        mainPathRealmMinor: 'Late',
        mainPathProgress: PERCENTAGE_COMPLETE,
        mainPathExp: realmXP(realm)
    };
}

/**
 * Walk the player to the moment they break through into the next major realm
 * having reached a given tier.
 *
 * @returns {Object} An outcome with `ok: false` and a `reason` when the walk
 *   cannot be made, otherwise the breakthrough state and the XP banked getting
 *   there.
 */
export function simulateToBreakthrough({ playerData, targetTier, mainDailyXP, secondaryDailyXP }) {
    const currentMajor = playerData.mainPathRealmMajor;
    const nextMajor = nextMajorOf(currentMajor);

    if (!nextMajor) {
        return { ok: false, reason: 'Next realm not implemented yet' };
    }

    const nextTimegateLength = timegateLength[nextMajor] || 0;
    if (nextTimegateLength <= 0) {
        return { ok: false, reason: '--' };
    }

    const currentTier = ViryaCalculator.detectScenario(playerData).scenario;
    const needsToAdvance = ViryaRules.tierRank(targetTier) > ViryaRules.tierRank(currentTier);

    // Leg 1: reach the tier.
    let daysToReach = 0;
    if (needsToAdvance) {
        const info = ViryaCalculator.calculateDaysToScenario(
            targetTier, playerData, mainDailyXP, secondaryDailyXP
        );
        daysToReach = info?.daysNeeded ?? Infinity;
        if (!Number.isFinite(daysToReach)) {
            return { ok: false, reason: 'Cannot reach scenario' };
        }
    }

    // Leg 2: bank overflow at 100% Late until the timegate lets us through.
    const currentTimegateDays = playerData.timegateDays || 0;
    const breakthroughTime = Math.max(daysToReach, currentTimegateDays);
    const overflowDays = needsToAdvance
        ? Math.max(0, breakthroughTime - daysToReach)
        : Math.max(0, breakthroughTime);

    const tierBonus = ViryaRules.bonusFor(targetTier);
    const currentLateRealm = `${currentMajor} Late`;

    let phase2XP = 0;
    let phase2Result = null;

    if (overflowDays > 0) {
        const overflowState = atCompletion(playerData);
        const overflowDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(overflowState, tierBonus);
        const simulator = new RealmProgressionSimulator(overflowState, overflowDailyXP, 'breakthrough-overflow');

        phase2Result = simulator.simulateDays(overflowDays, tierBonus, null, currentLateRealm);
        phase2XP = phase2Result.totalXP;
    }

    // Where the secondary path stands once the tier is held.
    const secondaryAtTier = ViryaRules.secondaryPositionAtTier(targetTier, currentMajor, {
        realm: playerData.secondaryPathRealm,
        major: playerData.secondaryPathRealmMajor,
        minor: playerData.secondaryPathRealmMinor,
        progress: playerData.secondaryPathProgress
    });

    // Enough banked overflow carries the player past the breakthrough itself,
    // so they may already be some way into the next realm.
    const carriedInto = phase2Result?.finalRealm?.startsWith(nextMajor) ? phase2Result : null;
    const mainRealm = carriedInto ? carriedInto.finalRealm : `${nextMajor} Early`;
    const mainProgress = carriedInto ? carriedInto.finalProgress : 0;
    const { major, minor } = splitRealm(mainRealm);

    const breakthroughPlayerData = {
        ...playerData,
        mainPathRealm: mainRealm,
        mainPathRealmMajor: major,
        mainPathRealmMinor: minor,
        mainPathProgress: mainProgress,
        mainPathExp: realmXP(mainRealm) * (mainProgress / PERCENTAGE_COMPLETE),
        secondaryPathRealm: secondaryAtTier.realm,
        secondaryPathRealmMajor: secondaryAtTier.major,
        secondaryPathRealmMinor: secondaryAtTier.minor,
        secondaryPathProgress: secondaryAtTier.progress
    };

    if (breakthroughPlayerData.mainPathRealmMajor !== nextMajor) {
        return { ok: false, reason: 'Breakthrough state validation error' };
    }

    // Leg 3 budget. Reaching the tier after the timegate has already expired
    // eats into the next realm's timegate.
    const daysAvailableForOverflow = daysToReach <= currentTimegateDays
        ? nextTimegateLength
        : Math.max(0, nextTimegateLength - (daysToReach - currentTimegateDays));

    return {
        ok: true,
        nextMajor,
        daysToReach,
        breakthroughTime,
        phase2XP,
        nextTimegateLength,
        daysAvailableForOverflow,
        breakthroughPlayerData
    };
}

export const Progression = { dailyXPForPath, asPathPlayerData, simulateToBreakthrough };
