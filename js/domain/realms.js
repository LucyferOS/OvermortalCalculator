// Realm ladder maths.
//
// The realm ladder is a single ordered list: Nascent Early, Nascent Mid,
// Nascent Late, Incarnation Early, ... Supreme Late. Everything here is a pure
// function of a position on that ladder, expressed either as a realm name
// ("Wholeness Late") or as a name plus a progress percentage.
//
// Progress may exceed 100: a player who has overflowed past the end of a realm
// carries that surplus forward, and absoluteXP models it directly rather than
// through special cases.

import { Realms, REALM_ORDER_MAJOR, REALM_ORDER_MINOR, PERCENTAGE_COMPLETE } from '../utilities/gameData.js';

/** Every realm name in ladder order. */
export const REALM_LADDER = REALM_ORDER_MAJOR.flatMap(
    (major) => REALM_ORDER_MINOR.map((minor) => `${major} ${minor}`)
);

const INDEX_BY_REALM = new Map(REALM_LADDER.map((realm, index) => [realm, index]));

// XP required to travel from the very start of the ladder to the start of each
// realm. Precomputed so xpBetween is two lookups and a subtraction.
const XP_TO_START_OF = (() => {
    const totals = new Array(REALM_LADDER.length + 1).fill(0);
    REALM_LADDER.forEach((realm, index) => {
        totals[index + 1] = totals[index] + (Realms[realm]?.xp ?? 0);
    });
    return totals;
})();

/** Split "Wholeness Late" into its major and minor parts. */
export function splitRealm(realm) {
    const spaceIndex = String(realm ?? '').indexOf(' ');
    if (spaceIndex === -1) return { major: String(realm ?? ''), minor: '' };
    return {
        major: realm.substring(0, spaceIndex),
        minor: realm.substring(spaceIndex + 1)
    };
}

/** Position of a realm on the ladder, or -1 if the name is not a realm. */
export function realmIndex(realm) {
    return INDEX_BY_REALM.has(realm) ? INDEX_BY_REALM.get(realm) : -1;
}

/** The realm at a ladder position, or null if out of range. */
export function realmAt(index) {
    return REALM_LADDER[index] ?? null;
}

/** Build a realm name from a major realm and a minor stage. */
export function realmOf(major, minor) {
    return `${major} ${minor}`;
}

/** Total XP the realm itself requires. */
export function realmXP(realm) {
    return Realms[realm]?.xp ?? 0;
}

/** Base absorption of a realm, before any Virya bonus. */
export function realmAbsorption(realm) {
    return Realms[realm]?.absorption ?? 0;
}

/** The next realm on the ladder, crossing into the next major where needed. */
export function nextRealm(realm) {
    return realmAt(realmIndex(realm) + 1);
}

/** The major realm after this one, or null at the top of the ladder. */
export function nextMajor(major) {
    const index = REALM_ORDER_MAJOR.indexOf(major);
    if (index === -1 || index >= REALM_ORDER_MAJOR.length - 1) return null;
    return REALM_ORDER_MAJOR[index + 1];
}

/** The major realm before this one, or null at the bottom of the ladder. */
export function previousMajor(major) {
    const index = REALM_ORDER_MAJOR.indexOf(major);
    if (index <= 0) return null;
    return REALM_ORDER_MAJOR[index - 1];
}

/** Index of a major realm in the major ladder. */
export function majorIndex(major) {
    return REALM_ORDER_MAJOR.indexOf(major);
}

/**
 * Total XP earned from the very start of the ladder to a given position.
 * Progress above 100 is counted, so overflow carries forward naturally.
 */
export function absoluteXP(realm, progress = 0) {
    const index = realmIndex(realm);
    if (index === -1) return 0;
    return XP_TO_START_OF[index] + realmXP(realm) * (progress / PERCENTAGE_COMPLETE);
}

/**
 * Where a position lands after gaining a lump of XP: the inverse of absoluteXP.
 *
 * This is what lets a one-off XP source (a pile of fruits) be expressed as a
 * move along the ladder, so that everything downstream can go on reading a
 * plain realm-and-progress pair instead of learning about lump sums.
 *
 * At the top of the ladder there is nowhere left to advance to, so the surplus
 * is returned as progress above 100 on Supreme Late, the same way overflow is
 * represented everywhere else.
 */
export function advanceBy(realm, progress = 0, xp = 0) {
    const startIndex = realmIndex(realm);
    if (startIndex === -1) return { realm, progress };

    const target = absoluteXP(realm, progress) + Math.max(0, xp);

    // The landing realm is the last one the target reaches *past* the start of.
    // The comparison is strict on purpose: a position sitting exactly on a realm
    // boundary stays at 100% of the realm it filled rather than being normalised
    // into 0% of the next one. The two are the same point in absolute XP, but
    // "100% Late" is a state the Virya rules read directly - isMainPathComplete
    // tests the minor stage and the progress - so normalising it away would strip
    // a player of Completion, and advanceBy(x, 0) would not be a no-op.
    let index = startIndex;
    while (index + 1 < REALM_LADDER.length && XP_TO_START_OF[index + 1] < target) {
        index++;
    }

    const landed = REALM_LADDER[index];
    const size = realmXP(landed);
    if (size <= 0) return { realm: landed, progress: PERCENTAGE_COMPLETE };

    return {
        realm: landed,
        progress: ((target - XP_TO_START_OF[index]) / size) * PERCENTAGE_COMPLETE
    };
}

/**
 * XP still needed to travel from one position on the ladder to another.
 * Returns 0 when the start position is already at or past the target.
 */
export function xpBetween(fromRealm, fromProgress, toRealm, toProgress) {
    const needed = absoluteXP(toRealm, toProgress) - absoluteXP(fromRealm, fromProgress);
    return needed > 0 ? needed : 0;
}

/**
 * Compare two ladder positions.
 * Returns a negative number if a is behind b, 0 if level, positive if ahead.
 */
export function comparePositions(aRealm, aProgress, bRealm, bProgress) {
    return absoluteXP(aRealm, aProgress) - absoluteXP(bRealm, bProgress);
}

/** True when the first position has reached or passed the second. */
export function isAtOrBeyond(realm, progress, targetRealm, targetProgress) {
    return comparePositions(realm, progress, targetRealm, targetProgress) >= 0;
}
