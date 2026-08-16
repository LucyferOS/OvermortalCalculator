// Invariants the calculator must satisfy.
//
// Each group here corresponds to a defect from REFACTOR_PLAN.md. They were
// written before the fixes, failed against the original code, and now pass —
// so they are the regression tests for those defects specifically, not just
// general coverage.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { PLAYERS, makePlayer } from './fixtures.js';
import { XPCalculator } from '../js/dashboard/XPCalculator.js';
import { ViryaCalculator } from '../js/dashboard/ViryaCalculator.js';
import { ViryaRules } from '../js/engine/ViryaRules.js';
import {
    SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE,
    SCENARIO_PERFECT, SCENARIO_HALF_STEP
} from '../js/utilities/gameData.js';

const entries = Object.entries(PLAYERS);

describe('absorption bonus', () => {
    // Defect 1: a cached cosmoapsisValue made the bonus argument a no-op.
    // Easy mode is excluded: it takes the player's absorption as a typed-in
    // total, so by design no bonus is layered on top of it.
    for (const [name, player] of entries.filter(([, p]) => !p.abodeEasyMode)) {
        test(`${name}: a higher bonus yields strictly more daily XP`, () => {
            const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(player, 0);
            const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(player, 0.4);
            assert.ok(some > none, `expected bonus 0.4 (${some}) > bonus 0 (${none})`);
        });

        test(`${name}: the bonus survives a pre-computed cosmoapsisValue`, () => {
            // The app writes cosmoapsisValue onto playerData before calculating.
            // That must not cause later calls to ignore their bonus argument.
            const cached = {
                ...player,
                cosmoapsisValue: XPCalculator.calculateCosmoapsisValue(player, 0)
            };
            const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(cached, 0);
            const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(cached, 0.4);
            assert.ok(some > none, `cached state discarded the bonus: ${some} === ${none}`);
        });
    }

    test('easy mode pins absorption, so the bonus does not apply', () => {
        const p = PLAYERS.easyMode;
        const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(p, 0);
        const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(p, 0.4);
        assert.equal(some, none, 'easy mode absorption is entered directly and must be used as-is');
    });
});

describe('path independence', () => {
    // Defect 2: the secondary path was costed at the main path's absorption.
    test('secondary path XP does not depend on where the main path is', () => {
        const secondary = { secondaryPathRealm: 'Incarnation Late', secondaryPathProgress: 40 };
        const lowMain = makePlayer({ mainPathRealm: 'Incarnation Early', mainPathProgress: 0, ...secondary });
        const highMain = makePlayer({ mainPathRealm: 'Nirvana Late', mainPathProgress: 90, ...secondary });

        const xpFor = (p) => XPCalculator.calculateDailyXPWithAbsorptionBonus(
            {
                ...p,
                mainPathRealm: p.secondaryPathRealm,
                mainPathRealmMajor: p.secondaryPathRealmMajor,
                mainPathRealmMinor: p.secondaryPathRealmMinor,
                cosmoapsisValue: XPCalculator.calculateCosmoapsisValue(p, 0)
            },
            0
        );

        assert.equal(
            Math.round(xpFor(lowMain)),
            Math.round(xpFor(highMain)),
            'secondary path XP leaked main-path state'
        );
    });
});

describe('purity', () => {
    for (const [name, player] of entries) {
        test(`${name}: detectScenario does not mutate its argument`, () => {
            const before = JSON.stringify(player);
            ViryaCalculator.detectScenario(player);
            assert.equal(JSON.stringify(player), before);
        });

        test(`${name}: daily XP is deterministic`, () => {
            const a = XPCalculator.calculateDailyXPWithAbsorptionBonus(player, 0.2);
            const b = XPCalculator.calculateDailyXPWithAbsorptionBonus(player, 0.2);
            assert.equal(a, b);
        });
    }
});

describe('no hidden state', () => {
    // Defect 3: XP-to-tier read playerData.viryaScenario, a field written as a
    // side effect elsewhere, so results changed depending on call order.
    for (const [name, player] of entries) {
        test(`${name}: XP to each tier ignores any pre-set viryaScenario`, () => {
            const tiers = [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
            const clean = { ...player };
            delete clean.viryaScenario;

            for (const stale of [SCENARIO_NO_VIRYA, SCENARIO_HALF_STEP]) {
                const tainted = { ...clean, viryaScenario: stale };
                for (const tier of tiers) {
                    const dailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(clean, 0);
                    const a = ViryaCalculator.calculateDaysToScenario(tier, clean, dailyXP, dailyXP);
                    const b = ViryaCalculator.calculateDaysToScenario(tier, tainted, dailyXP, dailyXP);
                    assert.equal(
                        a.xpNeeded, b.xpNeeded,
                        `${tier}: a stale "${stale}" tag changed XP needed (${a.xpNeeded} vs ${b.xpNeeded})`
                    );
                }
            }
        });
    }
});

describe('analytics agree with the calculator', () => {
    // The pill maths used to exist in three places with three formulas, so the
    // chart, the daily XP total and the red-pill analytic could disagree.
    for (const [name, player] of entries) {
        test(`${name}: the XP breakdown sums to the daily XP total`, async () => {
            const { Analytics } = await import('../js/analytics/Analytics.js');
            const breakdown = Analytics.calculateDailyXPBreakdown(player, 0);
            const total = XPCalculator.calculateDailyXPWithAbsorptionBonus(player, 0);
            assert.ok(
                Math.abs(breakdown.total - total) < 1e-6,
                `breakdown ${breakdown.total} != daily XP ${total}`
            );
        });

        test(`${name}: the red-pill analytic values a pill the same as daily XP does`, async () => {
            const { Analytics } = await import('../js/analytics/Analytics.js');
            const analytic = Analytics.calculateRedPillsForBreakthrough(player, 10, 10, 0);
            assert.equal(analytic.redPillXPPerPill, XPCalculator.redPillXPPerPill(player));
        });
    }
});

describe('no XP source is counted twice', () => {
    // The main path's daily XP total added elixir on top of a pill total that
    // already contained it, inflating the headline figure by one day's elixirs.
    for (const [name, player] of entries.filter(([, p]) => p.elixir > 0)) {
        test(`${name}: the daily XP total counts elixir exactly once`, () => {
            const breakdown = XPCalculator.calculatePillXPBreakdown(player);
            const total = XPCalculator.calculateDailyXPWithAbsorptionBonus(player, 0);

            const withoutElixir = XPCalculator.calculateDailyXPWithAbsorptionBonus(
                { ...player, elixir: 0 }, 0
            );

            assert.ok(breakdown.elixir > 0, 'fixture should have elixir XP to test');
            assert.ok(
                Math.abs((total - withoutElixir) - breakdown.elixir) < 1e-6,
                `elixir contributes ${total - withoutElixir} but breakdown says ${breakdown.elixir}`
            );
        });
    }
});

describe('tier detection', () => {
    // The tier is the highest one whose secondary-path requirement is met.
    // Requirements are thresholds, not exact stage matches.
    const cases = [
        ['fresh', SCENARIO_NO_VIRYA],
        ['midIncarnation', SCENARIO_NO_VIRYA],
        ['completionWholeness', SCENARIO_COMPLETION],
        ['eminenceWholeness', SCENARIO_EMINENCE],
        ['perfectWholeness', SCENARIO_PERFECT],
        // Answered by the maintainer: secondary at same major Mid is Perfect.
        ['sameMajorMid', SCENARIO_PERFECT],
        // Same major Late but short of 100% is past Perfect, short of Half-Step.
        ['sameMajorLatePartial', SCENARIO_PERFECT],
        ['halfStepWholeness', SCENARIO_HALF_STEP],
        // Voidbreak shifts Eminence and Perfect up one minor stage.
        ['voidbreakEminence', SCENARIO_EMINENCE],
        ['voidbreakPerfect', SCENARIO_PERFECT],
        ['voidbreakEarlySecondary', SCENARIO_EMINENCE]
    ];

    for (const [name, expected] of cases) {
        test(`${name} is ${expected}`, () => {
            assert.equal(ViryaCalculator.detectScenario(PLAYERS[name]).scenario, expected);
        });
    }

    test('a tier is never reported without the main path at 100% Late', () => {
        const p = makePlayer({
            mainPathRealm: 'Wholeness Mid', mainPathProgress: 99,
            secondaryPathRealm: 'Wholeness Late', secondaryPathProgress: 100
        });
        assert.equal(ViryaCalculator.detectScenario(p).scenario, SCENARIO_NO_VIRYA);
    });

    test('tier rises monotonically as the secondary path advances', () => {
        const order = [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
        const ladder = [
            ['Incarnation Early', 0],
            ['Voidbreak Early', 0],
            ['Voidbreak Mid', 0],
            ['Voidbreak Late', 50],
            ['Wholeness Early', 0],
            ['Wholeness Mid', 50],
            ['Wholeness Late', 50],
            ['Wholeness Late', 100]
        ];

        let previous = -1;
        for (const [realm, progress] of ladder) {
            const p = makePlayer({
                mainPathRealm: 'Wholeness Late', mainPathProgress: 100,
                secondaryPathRealm: realm, secondaryPathProgress: progress
            });
            const index = order.indexOf(ViryaCalculator.detectScenario(p).scenario);
            assert.ok(
                index >= previous,
                `tier went backwards at ${realm} ${progress}% (index ${index} after ${previous})`
            );
            previous = index;
        }
    });
});

describe('carried Virya bonus', () => {
    // Answered by the maintainer: Eminence applies to the current realm only
    // and does not carry into the next realm at all. Perfect carries through
    // Early; Half-Step carries through Early and Mid.
    const expected = {
        [SCENARIO_COMPLETION]: { Early: false, Mid: false, Late: false },
        [SCENARIO_EMINENCE]: { Early: false, Mid: false, Late: false },
        [SCENARIO_PERFECT]: { Early: true, Mid: false, Late: false },
        [SCENARIO_HALF_STEP]: { Early: true, Mid: true, Late: false }
    };

    for (const [tier, stages] of Object.entries(expected)) {
        for (const [stage, active] of Object.entries(stages)) {
            test(`${tier} carried into ${stage} is ${active ? 'active' : 'expired'}`, () => {
                assert.equal(ViryaRules.isCarriedBonusActive(tier, stage), active);
            });
        }
    }
});
