// Reading of the Virya rule table.
//
// Everything here is a pure function of a player position. No caching, no
// reliance on fields written elsewhere.

import { VIRYA_TIERS, VIRYA_TIER_ORDER, REQUIREMENT_SHIFT, HAD_VIRYA_OPTION_TO_TIER } from '../data/viryaRules.js';
import { realmIndex, realmAt, realmOf, majorIndex, isAtOrBeyond, splitRealm } from '../domain/realms.js';
import { REALM_ORDER_MAJOR, PERCENTAGE_COMPLETE, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION } from '../utilities/gameData.js';

const TIER_BY_NAME = new Map(VIRYA_TIERS.map((tier) => [tier.name, tier]));

/** The absorption bonus a tier grants while it is active. */
export function bonusFor(tierName) {
    return TIER_BY_NAME.get(tierName)?.bonus ?? 0;
}

/** Tier names ordered lowest to highest, with "No Virya" at the bottom. */
export function tierOrder() {
    return [SCENARIO_NO_VIRYA, ...VIRYA_TIER_ORDER];
}

/** Rank of a tier, for "have I already passed this?" comparisons. */
export function tierRank(tierName) {
    return tierOrder().indexOf(tierName);
}

/**
 * Is a bonus carried from the previous realm still active at this minor stage?
 * Eminence carries through nothing, Perfect through Early, Half-Step through
 * Early and Mid.
 */
export function isCarriedBonusActive(tierName, minorStage) {
    return (TIER_BY_NAME.get(tierName)?.carriesThrough ?? []).includes(minorStage);
}

/** The bonus still in effect at a minor stage, for a tier earned last realm. */
export function carriedBonusAt(tierName, minorStage) {
    return isCarriedBonusActive(tierName, minorStage) ? bonusFor(tierName) : 0;
}

/**
 * Where the secondary path must reach for a tier, given the main path's major
 * realm. Returns null when the tier has no requirement (Completion) or when the
 * requirement falls off the bottom of the ladder.
 */
export function requirementFor(tierName, mainMajor) {
    const tier = TIER_BY_NAME.get(tierName);
    if (!tier || !tier.requirement) return null;

    const { majorDelta, minor, minProgress, shiftable } = tier.requirement;
    const targetMajor = REALM_ORDER_MAJOR[majorIndex(mainMajor) + majorDelta];
    if (!targetMajor) return null;

    const baseIndex = realmIndex(realmOf(targetMajor, minor));
    if (baseIndex === -1) return null;

    const shift = shiftable ? (REQUIREMENT_SHIFT[mainMajor] ?? 0) : 0;
    const realm = realmAt(baseIndex + shift);
    if (!realm) return null;

    return { realm, progress: minProgress };
}

/**
 * Translate a "Did you have Virya last realm?" dropdown value into a tier name,
 * or null for "No". The dropdown's spellings differ from the tier constants.
 */
export function tierFromHadViryaOption(optionValue) {
    return HAD_VIRYA_OPTION_TO_TIER[optionValue] ?? null;
}

/** True when the main path is at 100% of its major realm's Late stage. */
export function isMainPathComplete(mainMinor, mainProgress) {
    return mainMinor === 'Late' && mainProgress >= PERCENTAGE_COMPLETE;
}

/**
 * The player's current tier: the highest one whose secondary path requirement
 * is satisfied, or "No Virya" when the main path is not yet complete.
 *
 * @param {{major: string, minor: string, progress: number}} mainPath
 * @param {{realm: string, progress: number}} secondaryPath
 */
export function detectTier(mainPath, secondaryPath) {
    if (!isMainPathComplete(mainPath.minor, mainPath.progress)) {
        return SCENARIO_NO_VIRYA;
    }

    for (let i = VIRYA_TIERS.length - 1; i >= 0; i--) {
        const tier = VIRYA_TIERS[i];
        const requirement = requirementFor(tier.name, mainPath.major);

        if (!requirement) {
            // Completion has no requirement; a tier whose requirement falls off
            // the ladder is simply unavailable at this realm.
            if (tier.requirement === null) return tier.name;
            continue;
        }

        if (isAtOrBeyond(secondaryPath.realm, secondaryPath.progress, requirement.realm, requirement.progress)) {
            return tier.name;
        }
    }

    return SCENARIO_COMPLETION;
}

/** Convenience wrapper for the playerData shape used across the app. */
export function detectTierForPlayer(playerData) {
    return detectTier(
        {
            major: playerData.mainPathRealmMajor,
            minor: playerData.mainPathRealmMinor,
            progress: playerData.mainPathProgress
        },
        {
            realm: playerData.secondaryPathRealm,
            progress: playerData.secondaryPathProgress
        }
    );
}

/**
 * Where the secondary path sits once a tier has just been reached: at the
 * tier's requirement, unless the player is already past it.
 */
export function secondaryPositionAtTier(tierName, mainMajor, currentSecondary) {
    const requirement = requirementFor(tierName, mainMajor);
    if (!requirement) return { ...currentSecondary };

    if (isAtOrBeyond(currentSecondary.realm, currentSecondary.progress, requirement.realm, requirement.progress)) {
        return { ...currentSecondary };
    }

    const { major, minor } = splitRealm(requirement.realm);
    return { realm: requirement.realm, major, minor, progress: requirement.progress };
}

export const ViryaRules = {
    bonusFor,
    tierOrder,
    tierRank,
    isCarriedBonusActive,
    carriedBonusAt,
    requirementFor,
    tierFromHadViryaOption,
    isMainPathComplete,
    detectTier,
    detectTierForPlayer,
    secondaryPositionAtTier
};
