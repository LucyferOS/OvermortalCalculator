// Test fixtures: build playerData objects equivalent to what
// Calculator.updateFromInputs() produces from the DOM, without needing a DOM.
//
// Keep this in sync with Calculator.initializePlayerData() and the
// update*Inputs() methods — the derived fields (pillBonus, respiraAttemptsTotal,
// respiraBonusTotal, mainPathExp) are computed here the same way.

import { Realms, PATH_MAIN, BASE_RESPIRA_ATTEMPTS, PERCENTAGE_COMPLETE, GameConstants } from '../js/utilities/gameData.js';
import { CalculatorUtils } from '../js/utilities/utils.js';

const BASE = {
    mainPathRealm: 'Incarnation Early',
    mainPathProgress: 0.0,
    secondaryPathRealm: 'Incarnation Early',
    secondaryPathProgress: 0.0,
    pathFocus: PATH_MAIN,
    timegateDays: 30,
    timegate: 30,
    hadViryaLastRealm: 'No',

    vaseStars: '0 star',
    vaseSkin: 'No',
    mirrorStars: '0 star',
    mirrorSkin: 'No',
    tokenStars: '0 star',
    tokenSkin: 'No',
    pearlStars: 'No artifact',

    goldPill: 0.0,
    purplePill: 0.0,
    bluePill: 20.0,
    elixir: 0.0,
    elixirConsumed: 0.0,
    benediction: 0.0,
    benedictionConsumed: 0.0,
    currentRedPills: 0,

    gemQuality: 'Common',
    baseAbodeAura: GameConstants.abodeBase,

    abodeEasyMode: false,
    abodeAuraEasyValue: 130.0,
    absorptionEasyValue: 0.317,

    abodeBonusCurio: 0,
    abodeBonusTechnique: 0,
    abodeBonusSectLevel: 0,
    abodeBonusSectBarrier: 0,
    abodeBonusCelestialSpring: 0,
    abodeBonusEnergyArray: 0,
    abodeBonusSwordArray: 0,
    abodeBonusHeavenGate: 0,
    abodeBonusWholenessCitta: 0,
    abodeBonusPerfectionWorldRift: 0,
    abodeBonusNirvanaPathofAscension: 0,
    abodeBonusNirvanaHornMansion: 0,
    abodeBonusNirvanaNeckMansion: 0,
    abodeTemperAuraCurio: 0,

    respiraAttemptsImmortalFriend: 0,
    respiraAttemptsTechnique: 0,
    respiraAttemptsCurio: 0,
    respiraBonusImmortalFriend: 0,
    respiraBonusTechnique: 0,
    respiraBonusCurio: 0,
    respiraNirvanaDipperMansion: 0,

    pillBonusNirvanaChariotMansion: 0,
    pillBonusNirvanaGhostMansion: 0,
    pillBonusNirvanaTurtleBeakMansion: 0,
    pillBonusCurio: 0,
    pillBonusImmortalFriends: 0,
    pillBonusTechnique: 0,
    pillAttemptsTechnique: 0,
    pillAttemptsImmortalFriends: 0,

    fruitsCount: 0,
    weeklyFruits: 0,
    fruitsUsage: 'current',
    extractorRank: 'common',
    extractorXPLevel: 0,
    extractorQualityLevel: 0,
    extractorGushLevel: 0
};

/**
 * Build a complete playerData object, applying overrides and then recomputing
 * every derived field so the result is internally consistent.
 */
export function makePlayer(overrides = {}) {
    const p = { ...BASE, ...overrides };

    const main = CalculatorUtils.splitRealmString(p.mainPathRealm);
    p.mainPathRealmMajor = main.major;
    p.mainPathRealmMinor = main.minor;
    p.mainPathExp = (Realms[p.mainPathRealm]?.xp ?? 0) * (p.mainPathProgress / PERCENTAGE_COMPLETE);

    const secondary = CalculatorUtils.splitRealmString(p.secondaryPathRealm);
    p.secondaryPathRealmMajor = secondary.major;
    p.secondaryPathRealmMinor = secondary.minor;
    p.secondaryPathExp = (Realms[p.secondaryPathRealm]?.xp ?? 0) * (p.secondaryPathProgress / PERCENTAGE_COMPLETE);

    p.pillBonus = 1 + ((p.pillBonusCurio + p.pillBonusImmortalFriends + p.pillBonusTechnique) / PERCENTAGE_COMPLETE);

    p.respiraAttemptsTotal = BASE_RESPIRA_ATTEMPTS
        + p.respiraAttemptsImmortalFriend + p.respiraAttemptsCurio + p.respiraAttemptsTechnique;
    p.respiraBonusTotal = 1 + ((p.respiraBonusCurio + p.respiraBonusImmortalFriend + p.respiraBonusTechnique) / PERCENTAGE_COMPLETE);

    return p;
}

/**
 * Named player states covering the cases that matter for Virya:
 * mid-realm, at the Completion threshold, each tier, and the Voidbreak
 * special case.
 */
export const PLAYERS = {
    fresh: makePlayer(),

    midIncarnation: makePlayer({
        mainPathRealm: 'Incarnation Mid', mainPathProgress: 42,
        secondaryPathRealm: 'Incarnation Early', secondaryPathProgress: 10
    }),

    // Main at 100% Late — the precondition for every Virya tier
    completionWholeness: makePlayer({
        mainPathRealm: 'Wholeness Late', mainPathProgress: 100,
        secondaryPathRealm: 'Incarnation Early', secondaryPathProgress: 0
    }),

    eminenceWholeness: makePlayer({
        mainPathRealm: 'Wholeness Late', mainPathProgress: 100,
        secondaryPathRealm: 'Voidbreak Mid', secondaryPathProgress: 0
    }),

    perfectWholeness: makePlayer({
        mainPathRealm: 'Wholeness Late', mainPathProgress: 100,
        secondaryPathRealm: 'Wholeness Early', secondaryPathProgress: 0
    }),

    // The gap case from the audit: secondary at same major Mid.
    // Past the Perfect requirement, so this should read as Perfect.
    sameMajorMid: makePlayer({
        mainPathRealm: 'Wholeness Late', mainPathProgress: 100,
        secondaryPathRealm: 'Wholeness Mid', secondaryPathProgress: 30
    }),

    // Second gap case: same major Late but not yet 100% — Perfect, not Half-Step.
    sameMajorLatePartial: makePlayer({
        mainPathRealm: 'Wholeness Late', mainPathProgress: 100,
        secondaryPathRealm: 'Wholeness Late', secondaryPathProgress: 60
    }),

    halfStepWholeness: makePlayer({
        mainPathRealm: 'Wholeness Late', mainPathProgress: 100,
        secondaryPathRealm: 'Wholeness Late', secondaryPathProgress: 100
    }),

    // Voidbreak shifts the Eminence/Perfect requirements up one minor stage
    voidbreakEminence: makePlayer({
        mainPathRealm: 'Voidbreak Late', mainPathProgress: 100,
        secondaryPathRealm: 'Incarnation Late', secondaryPathProgress: 0
    }),

    voidbreakPerfect: makePlayer({
        mainPathRealm: 'Voidbreak Late', mainPathProgress: 100,
        secondaryPathRealm: 'Voidbreak Mid', secondaryPathProgress: 0
    }),

    // Voidbreak Early does NOT meet Voidbreak's Perfect requirement (Mid), but
    // does meet its Eminence requirement (Incarnation Late)
    voidbreakEarlySecondary: makePlayer({
        mainPathRealm: 'Voidbreak Late', mainPathProgress: 100,
        secondaryPathRealm: 'Voidbreak Early', secondaryPathProgress: 50
    }),

    // A geared player, to exercise artifacts, pearl, elixir and respira bonuses
    geared: makePlayer({
        mainPathRealm: 'Nirvana Mid', mainPathProgress: 55,
        secondaryPathRealm: 'Perfection Late', secondaryPathProgress: 80,
        vaseStars: '5 stars', vaseSkin: 'Yes',
        mirrorStars: '5 stars', mirrorSkin: 'Yes',
        tokenStars: '3 stars', tokenSkin: 'No',
        pearlStars: '4 stars',
        gemQuality: 'Mythic',
        goldPill: 5, purplePill: 10, bluePill: 30,
        elixir: 3, elixirConsumed: 55,
        benediction: 2, benedictionConsumed: 30,
        abodeBonusSectLevel: 40, abodeBonusCelestialSpring: 25, abodeBonusCurio: 15,
        respiraAttemptsCurio: 4, respiraBonusTechnique: 20,
        pillBonusCurio: 12, pillBonusTechnique: 8,
        extractorRank: 'epic', extractorXPLevel: 18, extractorQualityLevel: 20, extractorGushLevel: 16,
        fruitsCount: 40
    }),

    // Strong enough to actually clear a major realm inside its timegate, so the
    // "highest tier reachable next realm" column has something to report. The
    // weaker fixtures above correctly report that they cannot.
    strongHalfStep: makePlayer({
        mainPathRealm: 'Wholeness Late', mainPathProgress: 100,
        secondaryPathRealm: 'Wholeness Late', secondaryPathProgress: 100,
        vaseStars: '5 stars', vaseSkin: 'Yes',
        mirrorStars: '5 stars', mirrorSkin: 'Yes',
        tokenStars: '5 stars', tokenSkin: 'Yes',
        pearlStars: '5 stars',
        gemQuality: 'Mythic',
        goldPill: 30, purplePill: 40, bluePill: 60, elixir: 5,
        abodeBonusSectLevel: 120, abodeBonusCelestialSpring: 60,
        abodeBonusCurio: 40, abodeBonusEnergyArray: 50,
        respiraAttemptsCurio: 8, respiraBonusTechnique: 40,
        pillBonusCurio: 25, pillBonusTechnique: 20,
        timegateDays: 10
    }),

    easyMode: makePlayer({
        mainPathRealm: 'Celestial Early', mainPathProgress: 20,
        secondaryPathRealm: 'Nirvana Late', secondaryPathProgress: 90,
        abodeEasyMode: true,
        abodeAuraEasyValue: 480,
        absorptionEasyValue: 2.9
    })
};

/** Every realm name, in ladder order. */
export const ALL_REALMS = Object.keys(Realms);
