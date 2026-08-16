// Invariants the calculator must satisfy.
//
// Each group here guards a specific bug the codebase has already had once: a
// cached derived value that swallowed the absorption bonus, a secondary path
// costed at the main path's absorption, stale written-back state leaking into
// hypothetical futures, and three copies of the pill maths that disagreed.
// These tests were written before those fixes and failed against the code as it
// then stood, so they are targeted regression tests rather than general
// coverage — treat a failure here as a returning bug, not a new one.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { PLAYERS, makePlayer } from './fixtures.js';
import { XPCalculator } from '../js/calculators/XPCalculator.js';
import { FruitCalculator } from '../js/calculators/FruitCalculator.js';
import { ViryaCalculator } from '../js/calculators/ViryaCalculator.js';
import { ViryaRules } from '../js/engine/ViryaRules.js';
import { Progression } from '../js/engine/Progression.js';
import {
    SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE,
    SCENARIO_PERFECT, SCENARIO_HALF_STEP, Realms
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

describe('Immortal World mechanics', () => {
    const at = (overrides) => makePlayer({
        mainPathRealm: 'Nirvana Mid', mainPathProgress: 50,
        goldPill: 10, purplePill: 10, bluePill: 10, ...overrides
    });

    // Mini World and Five Asthenia are Abode Aura percentages, so Easy Mode's
    // typed-in Abode Aura total subsumes them exactly like the other sources.
    for (const field of ['abodeBonusMiniWorld', 'abodeBonusFiveAsthenia']) {
        test(`${field} adds to the Abode Aura bonus total`, () => {
            const base = XPCalculator.calculateTotalAbodeBonus(at({}));
            assert.equal(XPCalculator.calculateTotalAbodeBonus(at({ [field]: 12 })), base + 12);
        });

        test(`${field} raises daily XP in detailed mode`, () => {
            const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({}), 0);
            const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ [field]: 12 }), 0);
            assert.ok(some > none, `${field} was ignored: ${some} === ${none}`);
        });

        test(`${field} is ignored in Easy Mode`, () => {
            const easy = { abodeEasyMode: true, abodeAuraEasyValue: 480, absorptionEasyValue: 2.9 };
            const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(at(easy), 0);
            const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ ...easy, [field]: 12 }), 0);
            assert.equal(some, none, 'the typed-in Abode Aura total must subsume it');
        });
    }

    // Answered by the maintainer: two bonuses to the same pill are percentages
    // of the same stat, so they sum into one multiplier rather than compounding.
    const stacking = [
        ['goldPills', 'pillBonusNirvanaChariotMansion', 'pillBonusGlittedLotusThrone', 14.5, 28],
        ['purplePills', 'pillBonusNirvanaTurtleBeakMansion', 'pillBonusGlittedLotusSeed', 12.2, 40]
    ];

    for (const [pill, mansionField, lotusField, mansionMax, lotusMax] of stacking) {
        test(`${pill}: ${lotusField} adds to ${mansionField} rather than compounding`, () => {
            const plain = XPCalculator.calculatePillXPBreakdown(at({}))[pill];
            const both = XPCalculator.calculatePillXPBreakdown(
                at({ [mansionField]: mansionMax, [lotusField]: lotusMax })
            )[pill];

            const added = plain * (1 + ((mansionMax + lotusMax) / 100));
            const compounded = plain * (1 + (mansionMax / 100)) * (1 + (lotusMax / 100));

            assert.ok(Math.abs(both - added) < 1e-6, `expected ${added}, got ${both}`);
            assert.ok(compounded > added, 'the two stacking rules must actually differ');
        });

        test(`${pill}: the Glitted Lotus bonus still applies in Easy Mode`, () => {
            const easy = { abodeEasyMode: true, abodeAuraEasyValue: 480, absorptionEasyValue: 2.9 };
            const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(at(easy), 0);
            const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ ...easy, [lotusField]: lotusMax }), 0);
            assert.ok(some > none, `${lotusField} was ignored in Easy Mode: ${some} === ${none}`);
        });
    }
});

describe('MonsterScape absorption bonus', () => {
    // Answered by the maintainer: MonsterScape multiplies the whole Absorption
    // stat, so it scales the realm base and the Virya bonus together.
    const at = (overrides) => makePlayer({
        mainPathRealm: 'Nirvana Mid', mainPathProgress: 50, ...overrides
    });

    test('it scales the realm base and the Virya bonus together', () => {
        const p = at({ absorptionBonusMonsterScape: 70 });
        const base = Realms['Nirvana Mid'].absorption;
        assert.ok(
            Math.abs(XPCalculator.calculateAbsorption(p, 0.4) - (base + 0.4) * 1.7) < 1e-12,
            'expected (realm base + Virya bonus) * 1.7'
        );
    });

    test('zero leaves absorption exactly as it was', () => {
        const p = at({ absorptionBonusMonsterScape: 0 });
        assert.equal(XPCalculator.calculateAbsorption(p, 0.4), Realms['Nirvana Mid'].absorption + 0.4);
    });

    test('a missing value is treated as zero', () => {
        const p = at({});
        delete p.absorptionBonusMonsterScape;
        assert.equal(XPCalculator.calculateAbsorption(p, 0.4), Realms['Nirvana Mid'].absorption + 0.4);
    });

    test('it raises daily XP in detailed mode', () => {
        const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ absorptionBonusMonsterScape: 0 }), 0);
        const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ absorptionBonusMonsterScape: 70 }), 0);
        assert.ok(some > none, `MonsterScape was ignored: ${some} === ${none}`);
    });

    test('easy mode ignores it, since the typed-in absorption already includes it', () => {
        const easy = { abodeEasyMode: true, abodeAuraEasyValue: 480, absorptionEasyValue: 2.9 };
        const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ ...easy, absorptionBonusMonsterScape: 0 }), 0);
        const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ ...easy, absorptionBonusMonsterScape: 70 }), 0);
        assert.equal(some, none, 'easy mode absorption is entered directly and must be used as-is');
    });
});

describe('non-Abode Nirvana mechanics', () => {
    // The Nirvana mansion bonuses split across two systems: Path of Ascension /
    // Horn / Neck feed Abode Aura, while Chariot / Turtle Beak / Ghost / Dipper
    // feed pill and Respira XP. Easy mode replaces only the Abode Aura and
    // Absorption totals, so the pill/Respira mansions must still apply.
    const withPills = { goldPill: 10, purplePill: 10, bluePill: 10 };

    const mansions = [
        ['pillBonusNirvanaChariotMansion', 'Gold pill Chariot Mansion'],
        ['pillBonusNirvanaTurtleBeakMansion', 'Purple pill Turtle Beak Mansion'],
        ['pillBonusNirvanaGhostMansion', 'Blue pill Ghost Mansion'],
        ['respiraNirvanaDipperMansion', 'Respira Dipper Mansion']
    ];

    for (const easyMode of [false, true]) {
        const label = easyMode ? 'easy mode' : 'detailed mode';

        for (const [field, name] of mansions) {
            test(`${label}: ${name} raises daily XP`, () => {
                const base = makePlayer({
                    mainPathRealm: 'Nirvana Mid', mainPathProgress: 50,
                    abodeEasyMode: easyMode, abodeAuraEasyValue: 480, absorptionEasyValue: 2.9,
                    ...withPills
                });
                const boosted = makePlayer({
                    mainPathRealm: 'Nirvana Mid', mainPathProgress: 50,
                    abodeEasyMode: easyMode, abodeAuraEasyValue: 480, absorptionEasyValue: 2.9,
                    ...withPills, [field]: 10
                });

                const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(base, 0);
                const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(boosted, 0);
                assert.ok(some > none, `${field} was ignored: ${some} === ${none}`);
            });
        }
    }

    test('easy mode still ignores the Abode Aura mansions', () => {
        const shared = {
            mainPathRealm: 'Nirvana Mid', mainPathProgress: 50,
            abodeEasyMode: true, abodeAuraEasyValue: 480, absorptionEasyValue: 2.9
        };
        const base = makePlayer(shared);
        const boosted = makePlayer({
            ...shared,
            abodeBonusNirvanaPathofAscension: 16,
            abodeBonusNirvanaHornMansion: 21.1,
            abodeBonusNirvanaNeckMansion: 21.1
        });

        assert.equal(
            XPCalculator.calculateDailyXPWithAbsorptionBonus(boosted, 0),
            XPCalculator.calculateDailyXPWithAbsorptionBonus(base, 0),
            'the typed-in Abode Aura total must subsume the Abode Aura mansions'
        );
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

describe('fruit projection', () => {
    // Wednesday 2026-08-19, so the weekday arithmetic is pinned rather than
    // depending on the day the suite happens to run.
    const WED = new Date('2026-08-19T12:00:00Z');
    const THU = new Date('2026-08-20T12:00:00Z');
    const TUE = new Date('2026-08-18T12:00:00Z');

    describe('weekly accruals', () => {
        test('today\'s payout is not counted again', () => {
            // Standing on a Wednesday, the next payout is a full week away.
            assert.equal(FruitCalculator.weeklyAccruals(6, WED), 0);
            assert.equal(FruitCalculator.weeklyAccruals(7, WED), 1);
        });

        test('it counts every Wednesday in the window', () => {
            assert.equal(FruitCalculator.weeklyAccruals(1, TUE), 1);
            assert.equal(FruitCalculator.weeklyAccruals(7, TUE), 1);
            assert.equal(FruitCalculator.weeklyAccruals(8, TUE), 2);
            // From a Thursday the first Wednesday is six days out.
            assert.equal(FruitCalculator.weeklyAccruals(5, THU), 0);
            assert.equal(FruitCalculator.weeklyAccruals(6, THU), 1);
            assert.equal(FruitCalculator.weeklyAccruals(13, THU), 2);
        });

        test('a horizon that never arrives accrues nothing', () => {
            for (const days of [0, -5, Infinity, NaN]) {
                assert.equal(FruitCalculator.weeklyAccruals(days, WED), 0, `days=${days}`);
            }
        });
    });

    describe('projected fruits', () => {
        const player = (overrides) => makePlayer({
            fruitsCount: 10, weeklyFruits: 4, tokensCount: 2, weeklyTokens: 1, ...overrides
        });

        test('weekly income is added to the current stock', () => {
            // 3 Wednesdays in 21 days from a Tuesday: 10 + 3*4
            assert.equal(FruitCalculator.projectedFruits(player(), 21, TUE), 22);
        });

        test('a same-day horizon is just the current stock', () => {
            assert.equal(FruitCalculator.projectedFruits(player(), 0, TUE), 10);
        });

        test('tokens are ignored unless they are being spent', () => {
            assert.equal(FruitCalculator.projectedFruits(player({ useTokens: false }), 21, TUE), 22);
        });

        test('each spent token is worth three fruits', () => {
            // tokens: 2 + 3*1 = 5, worth 15 fruits on top of the 22
            assert.equal(FruitCalculator.projectedFruits(player({ useTokens: true }), 21, TUE), 37);
            assert.equal(FruitCalculator.projectedTokens(player(), 21, TUE), 5);
        });

        test('missing fields are treated as zero', () => {
            const bare = makePlayer({ fruitsCount: 7 });
            delete bare.weeklyFruits;
            delete bare.tokensCount;
            delete bare.weeklyTokens;
            assert.equal(FruitCalculator.projectedFruits(bare, 21, TUE), 7);
        });

        test('more time means at least as many fruits', () => {
            const p = player({ useTokens: true });
            let previous = 0;
            for (let days = 0; days <= 120; days++) {
                const fruits = FruitCalculator.projectedFruits(p, days, TUE);
                assert.ok(fruits >= previous, `fruits fell from ${previous} to ${fruits} at ${days} days`);
                previous = fruits;
            }
        });
    });
});

describe('XP rates are a main path property', () => {
    // XP generation belongs to the character, set by the main path's realm, not
    // to the path the XP lands in. asPathPlayerData used to re-point the realm
    // fields, which priced every secondary path estimate off the secondary
    // path's (lower) realm - understating completionWholeness by 2.65x.

    test('the secondary rate does not move with the secondary realm', () => {
        // Moving the secondary path changes the size of the bar being filled,
        // never the speed it fills at.
        for (const [name, p] of entries) {
            if (!p.secondaryPathRealm) continue;

            const baseline = Progression.dailyXPForPath(p, 'secondary', 0);
            if (baseline <= 0) continue;

            for (const realm of ['Incarnation Early', 'Wholeness Mid', 'Celestial Late']) {
                const moved = makePlayer({ ...p, secondaryPathRealm: realm, secondaryPathProgress: 0 });
                assert.equal(
                    Progression.dailyXPForPath(moved, 'secondary', 0), baseline,
                    `${name}: secondary rate moved when the secondary path was put in ${realm}`
                );
            }
        }
    });

    test('both paths generate XP at the same rate before path-specific pills', () => {
        // Elixir (main) and benediction (secondary) are the only legitimate
        // per-path difference; the shared engine underneath must be identical.
        for (const [name, p] of entries) {
            if (!p.secondaryPathRealm) continue;
            assert.equal(
                Progression.dailyXPForPath(p, 'secondary', 0),
                Progression.dailyXPForPath(p, 'main', 0),
                `${name}: the two paths disagreed on the character's base rate`
            );
        }
    });

    test('a fruit is priced off the main path realm', () => {
        // geared has its two paths in different majors, so pricing a fruit
        // against anything but the main path realm would show up here.
        const p = PLAYERS.geared;
        assert.notEqual(p.mainPathRealmMajor, p.secondaryPathRealmMajor);

        const viaMain = FruitCalculator.fruitXP(p);
        const viaHelper = FruitCalculator.fruitXP(Progression.asPathPlayerData(p, 'secondary'));
        assert.ok(viaMain > 0);
        assert.equal(viaHelper, viaMain, 'a fruit changed value depending on which path ate it');
    });
});
