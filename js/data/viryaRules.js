// The Virya rule table.
//
// This is the single source of truth for what each tier requires, what bonus it
// grants, and how far that bonus carries into the next realm. Previously this
// information was spread across eight bonus tables and eighteen inline
// 'Voidbreak' branches; anything that needs it should read it from here.
//
// A tier is available only when the main path is at 100% of its major realm's
// Late stage. Given that, the player's tier is the highest one whose secondary
// path requirement is satisfied — requirements are thresholds, so a secondary
// path that has moved past a rung still satisfies it.

import { SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP } from '../utilities/gameData.js';

/**
 * Ordered from lowest to highest. Each requirement names a position relative to
 * the main path's major realm:
 *
 *   majorDelta   0 is the main path's own major, -1 the one below it
 *   minor        the minor stage within that major
 *   minProgress  progress required at that stage
 *   shiftable    whether REQUIREMENT_SHIFT applies to this tier
 *
 * carriesThrough lists the minor stages of the *next* major realm at which the
 * bonus is still active after breaking through. Eminence carries through
 * nothing: it applies to the realm it was earned in only.
 */
export const VIRYA_TIERS = [
    {
        name: SCENARIO_COMPLETION,
        bonus: 0.0,
        requirement: null,
        carriesThrough: []
    },
    {
        name: SCENARIO_EMINENCE,
        bonus: 0.2,
        requirement: { majorDelta: -1, minor: 'Mid', minProgress: 0, shiftable: true },
        carriesThrough: []
    },
    {
        name: SCENARIO_PERFECT,
        bonus: 0.2,
        requirement: { majorDelta: 0, minor: 'Early', minProgress: 0, shiftable: true },
        carriesThrough: ['Early']
    },
    {
        name: SCENARIO_HALF_STEP,
        bonus: 0.4,
        requirement: { majorDelta: 0, minor: 'Late', minProgress: 100, shiftable: false },
        carriesThrough: ['Early', 'Mid']
    }
];

/**
 * Major realms whose Eminence and Perfect requirements sit one minor stage
 * higher than the general rule. Voidbreak is the only known case; if this turns
 * out to be "the first major realm that has Virya" rather than Voidbreak
 * specifically, this is the only place that needs to change.
 */
export const REQUIREMENT_SHIFT = {
    Voidbreak: 1
};

/** Tier names, lowest first. */
export const VIRYA_TIER_ORDER = VIRYA_TIERS.map((tier) => tier.name);

/**
 * The "Did you have Virya last realm?" dropdown uses its own spellings, which
 * predate the tier constants. Saved player data and exported JSON store the raw
 * option values, so the option values stay as they are and are translated here
 * at the boundary instead. Internally there is one vocabulary.
 */
export const HAD_VIRYA_OPTION_TO_TIER = {
    'No': null,
    'Eminence': SCENARIO_EMINENCE,
    'Perfection': SCENARIO_PERFECT,
    'Halfstep': SCENARIO_HALF_STEP
};
