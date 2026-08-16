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
import { OvermortalCalculator } from '../js/utilities/Calculator.js';
import { XPCalculator } from '../js/calculators/XPCalculator.js';
import { FruitCalculator } from '../js/calculators/FruitCalculator.js';
import { ViryaCalculator } from '../js/calculators/ViryaCalculator.js';
import { ViryaRules } from '../js/engine/ViryaRules.js';
import { Progression } from '../js/engine/Progression.js';
import {
    SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE,
    SCENARIO_PERFECT, SCENARIO_HALF_STEP, Realms, PATH_MAIN, PATH_SECONDARY
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
            // The chart draws the main path's day, so it is pinned to the same
            // helper Calculator books mainPathDailyXPBase with - character rate
            // plus elixir, exactly once.
            const { Analytics } = await import('../js/analytics/Analytics.js');
            const breakdown = Analytics.calculateDailyXPBreakdown(player, 0);
            const total = Progression.mainPathDailyXPBase(player, 0);
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

describe('Auraseep', () => {
    // A curio percentage that multiplies the aura gem's share of the Abode Aura
    // XP, and nothing else: 50% makes the gem worth 1.5x. The field was inert
    // for a while - stored and restored, but read by no calculation - so these
    // check it is actually wired up.
    const at = (overrides) => makePlayer({
        mainPathRealm: 'Nirvana Mid', mainPathProgress: 55,
        gemQuality: 'Epic', goldPill: 5, purplePill: 10, bluePill: 30,
        ...overrides
    });

    test('it multiplies the gem share by 1 + the percentage', () => {
        const plain = XPCalculator.calculateAuraGemXP(at({}), 0);
        assert.ok(plain > 0);

        for (const [percent, factor] of [[50, 1.5], [100, 2], [12.5, 1.125]]) {
            const boosted = XPCalculator.calculateAuraGemXP(at({ abodeTemperAuraCurio: percent }), 0);
            assert.ok(
                Math.abs(boosted - plain * factor) < 1e-6,
                `${percent}%: expected ${plain * factor}, got ${boosted}`
            );
        }
    });

    test('it boosts the gem only, not the Abode Aura XP itself', () => {
        const plain = at({});
        const boosted = at({ abodeTemperAuraCurio: 50 });

        assert.equal(
            XPCalculator.calculateAbodeAuraXP(boosted, 0),
            XPCalculator.calculateAbodeAuraXP(plain, 0),
            'Auraseep leaked into the Abode Aura XP'
        );
        assert.equal(
            XPCalculator.calculateAbodeXPTotal(boosted, 0) - XPCalculator.calculateAbodeXPTotal(plain, 0),
            XPCalculator.calculateAuraGemXP(boosted, 0) - XPCalculator.calculateAuraGemXP(plain, 0),
            'the abode total moved by more than the gem did'
        );
    });

    test('it raises daily XP', () => {
        const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ abodeTemperAuraCurio: 0 }), 0);
        const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ abodeTemperAuraCurio: 50 }), 0);
        assert.ok(some > none, `Auraseep was ignored: ${some} === ${none}`);
    });

    test('it still applies in easy mode', () => {
        // It is a gem bonus, not an Abode Aura one, so the typed-in Abode Aura
        // total does not subsume it - same rule as the pill and Respira bonuses.
        const easy = { abodeEasyMode: true, abodeAuraEasyValue: 480, absorptionEasyValue: 2.9 };
        const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ ...easy }), 0);
        const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ ...easy, abodeTemperAuraCurio: 50 }), 0);
        assert.ok(some > none, `Auraseep was swallowed by easy mode: ${some} === ${none}`);
    });

    test('with no aura gem there is nothing to multiply', () => {
        const none = XPCalculator.calculateDailyXPWithAbsorptionBonus(at({ gemQuality: 'No Aura' }), 0);
        const some = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            at({ gemQuality: 'No Aura', abodeTemperAuraCurio: 50 }), 0
        );
        assert.equal(some, none, 'Auraseep paid out without a gem to boost');
    });

    test('zero or missing leaves the gem exactly as it was', () => {
        const plain = XPCalculator.calculateAuraGemXP(at({ abodeTemperAuraCurio: 0 }), 0);

        const missing = at({});
        delete missing.abodeTemperAuraCurio;
        assert.equal(XPCalculator.calculateAuraGemXP(missing, 0), plain);
    });
});

describe('Wisdom Confluence', () => {
    // A share of the day's abode XP, paid into the secondary path. It is a
    // second bucket being filled, not a faster fill rate: folding it into the
    // shared daily total would speed the main path up too, and would break the
    // rule above that both paths generate XP at the same base rate.
    const PERCENT = 25;
    const at = (overrides) => makePlayer({
        mainPathRealm: 'Nirvana Mid', mainPathProgress: 55,
        secondaryPathRealm: 'Perfection Late', secondaryPathProgress: 80,
        gemQuality: 'Epic', goldPill: 5, purplePill: 10, bluePill: 30,
        ...overrides
    });

    const rates = (player) => {
        const calc = new OvermortalCalculator();
        calc.playerData = player;
        const bonuses = calc.calculatePathAbsorptionBonuses(ViryaCalculator.detectScenario(player));
        return calc.calculatePathDailyXP(
            bonuses.mainPathAbsorptionBonus, bonuses.secondaryPathAbsorptionBonus
        );
    };

    test('it pays the stated percentage of the day Abode Aura XP', () => {
        const player = at({ wisdomConfluenceCurio: PERCENT });
        const abodeAuraXP = XPCalculator.calculateAbodeAuraXP(player, 0);

        assert.ok(abodeAuraXP > 0, 'the fixture must actually earn Abode Aura XP');
        assert.equal(rates(player).wisdomConfluenceXP, abodeAuraXP * (PERCENT / 100));
    });

    test('the aura gem is excluded from what it draws on', () => {
        // The Confluence takes its cut of the aura itself, so neither the gem's
        // quality nor Auraseep may move it.
        const baseline = rates(at({ wisdomConfluenceCurio: PERCENT })).wisdomConfluenceXP;
        assert.ok(baseline > 0);

        for (const overrides of [{ gemQuality: 'Mythic' }, { gemQuality: 'No Aura' }, { abodeTemperAuraCurio: 80 }]) {
            assert.equal(
                rates(at({ wisdomConfluenceCurio: PERCENT, ...overrides })).wisdomConfluenceXP,
                baseline,
                `${JSON.stringify(overrides)} moved the Confluence, but the gem is not part of it`
            );
        }
    });

    test('it lands on the secondary path and nowhere else', () => {
        const without = rates(at({ wisdomConfluenceCurio: 0 }));
        const with_ = rates(at({ wisdomConfluenceCurio: PERCENT }));

        assert.ok(with_.wisdomConfluenceXP > 0);
        assert.equal(with_.mainPathDailyXPBase, without.mainPathDailyXPBase, 'the main path was credited');
        assert.equal(with_.mainPathDailyXP, without.mainPathDailyXP, 'the focused main path was credited');
        assert.equal(
            with_.secondaryPathDailyXPBase,
            without.secondaryPathDailyXPBase + with_.wisdomConfluenceXP,
            'the secondary path did not receive exactly the Confluence'
        );
    });

    test('it does not change the rate either path generates XP at', () => {
        // Guards the fold-it-into-the-daily-total mistake: the shared engine
        // must be untouched, or the main path speeds up too.
        const without = at({ wisdomConfluenceCurio: 0 });
        const with_ = at({ wisdomConfluenceCurio: PERCENT });

        for (const path of ['main', 'secondary']) {
            assert.equal(
                Progression.dailyXPForPath(with_, path, 0),
                Progression.dailyXPForPath(without, path, 0),
                `the ${path} path base rate moved with Wisdom Confluence`
            );
        }
    });

    test('it is earned whichever path is focused', () => {
        const onMain = rates(at({ wisdomConfluenceCurio: PERCENT, pathFocus: PATH_MAIN }));
        const onSecondary = rates(at({ wisdomConfluenceCurio: PERCENT, pathFocus: PATH_SECONDARY }));

        assert.equal(onMain.wisdomConfluenceXP, onSecondary.wisdomConfluenceXP);
        // The unfocused secondary path earns nothing but its path-specific
        // sources, so the Confluence is all of it here.
        assert.equal(
            rates(at({ wisdomConfluenceCurio: PERCENT, pathFocus: PATH_MAIN })).secondaryPathDailyXP,
            onMain.wisdomConfluenceXP,
            'a day spent on the main path must still pay the Confluence'
        );
    });

    test('it still applies in easy mode', () => {
        // Easy mode replaces the abode total with a typed-in one; it does not
        // stop the abode producing XP, so the Confluence takes its cut of that.
        const easy = { abodeEasyMode: true, abodeAuraEasyValue: 480, absorptionEasyValue: 2.9 };
        const without = rates(at({ ...easy, wisdomConfluenceCurio: 0 }));
        const with_ = rates(at({ ...easy, wisdomConfluenceCurio: PERCENT }));

        assert.ok(with_.wisdomConfluenceXP > 0, 'easy mode swallowed the Confluence');
        assert.equal(with_.secondaryPathDailyXPBase, without.secondaryPathDailyXPBase + with_.wisdomConfluenceXP);
    });

    test('zero or missing pays nothing', () => {
        assert.equal(rates(at({ wisdomConfluenceCurio: 0 })).wisdomConfluenceXP, 0);

        const missing = at({});
        delete missing.wisdomConfluenceCurio;
        assert.equal(rates(missing).wisdomConfluenceXP, 0);
    });
});

describe('Wisdom Confluence in the Virya table', () => {
    // The tier timings walk the secondary path, and the Confluence fills it, so
    // they have to credit it. They did not at first, which made every tier look
    // further off than it was for anyone holding the curio.
    const at = (overrides) => makePlayer({
        mainPathRealm: 'Nirvana Mid', mainPathProgress: 20,
        secondaryPathRealm: 'Perfection Early', secondaryPathProgress: 30,
        gemQuality: 'Epic', goldPill: 5, purplePill: 10, bluePill: 30,
        abodeBonusSectLevel: 40,
        ...overrides
    });

    const rateFor = (player) => XPCalculator.calculateDailyXPWithAbsorptionBonus(player, 0);
    const daysTo = (player, tier) => {
        const rate = rateFor(player);
        return ViryaCalculator.calculateDaysToScenario(tier, player, rate, rate).daysNeeded;
    };

    test('the walking rate is the character rate plus the Confluence', () => {
        const player = at({ wisdomConfluenceCurio: 30 });

        assert.equal(
            ViryaCalculator.secondaryPathRate(player, 0),
            rateFor(player)
                + Progression.benedictionXP(player)
                + XPCalculator.calculateWisdomConfluenceXP(player, 0)
        );
    });

    test('every tier that needs the secondary path arrives sooner', () => {
        const without = at({ wisdomConfluenceCurio: 0 });
        const with_ = at({ wisdomConfluenceCurio: 30 });

        for (const tier of [SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP]) {
            const slow = daysTo(without, tier);
            const fast = daysTo(with_, tier);
            assert.ok(Number.isFinite(slow) && slow > 0, `${tier}: fixture must have something to walk`);
            assert.ok(fast < slow, `${tier}: the Confluence did not speed the tier up (${fast} vs ${slow})`);
        }
    });

    test('Completion is untouched - the Confluence does not feed the main path', () => {
        assert.equal(
            daysTo(at({ wisdomConfluenceCurio: 30 }), SCENARIO_COMPLETION),
            daysTo(at({ wisdomConfluenceCurio: 0 }), SCENARIO_COMPLETION)
        );
    });

    test('the Confluence banked while finishing the main path counts toward the tier', () => {
        // Secondary short of the Eminence requirement (Perfection Mid for a
        // Nirvana main path) by less than the Confluence banks while the main
        // path finishes its realm. The requirement is therefore already covered
        // by the time the focus switches, and the tier costs nothing beyond
        // reaching Completion.
        const player = at({ secondaryPathProgress: 70, wisdomConfluenceCurio: 30 });

        const mainLegDays = ViryaCalculator.calculateXPForCompletion(player) / rateFor(player);
        const banked = mainLegDays * XPCalculator.calculateWisdomConfluenceXP(player, 0);
        const legXP = ViryaCalculator.calculateXPToReach(
            player.secondaryPathRealm, player.secondaryPathProgress, 'Perfection Mid', 0
        );
        assert.ok(banked > legXP, 'the fixture must bank more than the leg costs for this to be the case');

        assert.equal(
            daysTo(player, SCENARIO_EMINENCE),
            daysTo(player, SCENARIO_COMPLETION),
            'the days banked during the main path leg were not credited'
        );

        // Without the Confluence the same tier costs strictly more.
        const bare = at({ secondaryPathProgress: 70 });
        assert.ok(daysTo(bare, SCENARIO_EMINENCE) > daysTo(bare, SCENARIO_COMPLETION));
    });

    test('no tier ever lands before the Completion it requires', () => {
        // Every tier requires Completion first, so the walk's main path leg has
        // to be the Completion figure itself. It used to be averaged across the
        // stage instead, and a credit big enough to cover the secondary legs
        // outright exposed the gap: Eminence read as arriving weeks early.
        for (const [name, player] of entries) {
            for (const curio of [0, 30, 90]) {
                const p = makePlayer({ ...player, wisdomConfluenceCurio: curio });
                const completion = daysTo(p, SCENARIO_COMPLETION);
                if (!Number.isFinite(completion)) continue;

                for (const tier of [SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP]) {
                    const days = daysTo(p, tier);
                    if (!Number.isFinite(days)) continue;
                    assert.ok(
                        days >= completion - 1e-9,
                        `${name} at ${curio}%: ${tier} (${days}d) landed before Completion (${completion}d)`
                    );
                }
            }
        }
    });

    test('a player without the curio sees no change at all', () => {
        // The credit and the added rate must both vanish at zero, or this
        // becomes a silent rebalance for everyone else.
        for (const [name, player] of entries) {
            if (player.wisdomConfluenceCurio) continue;
            const rate = rateFor(player);
            const expected = rate + Progression.benedictionXP(player);

            for (const tier of [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP]) {
                const info = ViryaCalculator.calculateDaysToScenario(tier, player, rate, rate);
                const viaRate = ViryaCalculator.secondaryPathRate(player, 0);
                assert.equal(viaRate, expected, `${name}: the rate moved without the curio`);
                assert.ok(!Number.isNaN(info.daysNeeded), `${name}/${tier}: days went NaN`);
            }
        }
    });
});

describe('fruit projection horizon', () => {
    // The horizon used to be each path's own time to breakthrough, taken from
    // the focus-dependent daily XP. The unfocused path receives only its
    // path-specific pill, so its breakthrough sat years out and was credited
    // with years of weekly payouts: one real player state produced 150 fruits
    // on main path focus and 3720 on secondary, moving "days saved" by 25x.
    const build = (overrides) => {
        const calc = new OvermortalCalculator();
        calc.playerData = makePlayer(overrides);
        return calc;
    };

    test('the horizon is the last day of the current timegate', () => {
        // A 41 day timegate looks 40 days ahead: fruits are worth 1.5x while
        // the timegate runs, so the last useful day to eat them is the one
        // before it lifts.
        for (const timegateDays of [41, 30, 120, 1]) {
            assert.equal(build({ timegateDays }).fruitHorizonDays(), timegateDays - 1);
        }
    });

    test('a spent or absent timegate gives a horizon of zero, not a negative one', () => {
        for (const timegateDays of [0, -5]) {
            assert.equal(build({ timegateDays }).fruitHorizonDays(), 0);
        }
        const bare = build({});
        delete bare.playerData.timegateDays;
        assert.equal(bare.fruitHorizonDays(), 0);
    });

    test('the projected fruit count does not depend on path focus', () => {
        for (const [name, player] of entries) {
            const onMain = build({ ...player, pathFocus: PATH_MAIN, fruitsCount: 120, weeklyFruits: 15 });
            const onSecondary = build({ ...player, pathFocus: PATH_SECONDARY, fruitsCount: 120, weeklyFruits: 15 });

            const a = onMain.calculateFruitData();
            const b = onSecondary.calculateFruitData();

            assert.equal(a.projectedFruits, b.projectedFruits, `${name}: fruit count moved with path focus`);
            assert.equal(a.horizonDays, b.horizonDays, `${name}: horizon moved with path focus`);
            assert.equal(a.fruitXPTotal, b.fruitXPTotal, `${name}: fruit XP moved with path focus`);
        }
    });

    test('the fruit count is what the timegate window accrues', () => {
        const calc = build({ timegateDays: 41, fruitsCount: 120, weeklyFruits: 15, useTokens: false });
        const data = calc.calculateFruitData();

        assert.equal(data.horizonDays, 40);
        assert.equal(
            data.projectedFruits,
            FruitCalculator.projectedFruits(calc.playerData, 40),
            'the count did not match a direct projection over the same horizon'
        );
        assert.ok(data.projectedFruits >= 120, 'the stock already held must be included');
    });
});

describe('the tier walk agrees with the dashboard', () => {
    // A player added up the dashboard's two "time to next realm" figures - the
    // main path finishing its realm on main focus, then the secondary path
    // reaching the same major's Late on secondary focus - and got 63 days,
    // where the Virya table's Half-Step row read 65. The manual sum is the walk
    // priced at today's flat rate throughout, so the table should have come out
    // a little *under* it: Eminence and Perfect are crossed on the way and each
    // grants absorption. Three things put it over instead, one per test below.
    const at = (overrides) => makePlayer({
        mainPathRealm: 'Nirvana Late', mainPathProgress: 60,
        secondaryPathRealm: 'Nirvana Mid', secondaryPathProgress: 40,
        gemQuality: 'Mythic', goldPill: 5, purplePill: 10, bluePill: 30,
        abodeBonusSectLevel: 40, abodeBonusCelestialSpring: 25,
        ...overrides
    });

    const ratesFor = (player) => {
        const calc = new OvermortalCalculator();
        calc.playerData = player;
        const bonuses = calc.calculatePathAbsorptionBonuses(ViryaCalculator.detectScenario(player));
        return calc.calculatePathDailyXP(
            bonuses.mainPathAbsorptionBonus, bonuses.secondaryPathAbsorptionBonus
        );
    };

    // The Virya table's own call: both figures are the base rates.
    const daysTo = (player, tier) => {
        const r = ratesFor(player);
        return ViryaCalculator.calculateDaysToScenario(
            tier, player, r.mainPathDailyXPBase, r.secondaryPathDailyXPBase
        ).daysNeeded;
    };

    test('a tier reached on the way speeds up the rest of the walk', () => {
        // Defect: secondaryPathRate took a precomputed rate and used it as the
        // character rate, so the bonusActive argument reached nothing but the
        // Wisdom Confluence. Crossing Eminence and Perfect granted +0.2
        // absorption to no part of the walk.
        const player = at();

        const withBonus = ViryaCalculator.secondaryPathRate(player, 0.2);
        const without = ViryaCalculator.secondaryPathRate(player, 0);
        assert.ok(withBonus > without, `the absorption bonus did not move the walking rate (${withBonus} vs ${without})`);

        // And it shows up in the timing: Half-Step is reached faster than the
        // same XP walked flat out at the no-bonus rate.
        const halfStepXP = ViryaCalculator.calculateXPForHalfStep(player);
        const completionXP = ViryaCalculator.calculateXPForCompletion(player);
        const r = ratesFor(player);
        const flat = completionXP / r.mainPathDailyXPBase
            + (halfStepXP - completionXP) / r.secondaryPathDailyXPBase;

        assert.ok(
            daysTo(player, SCENARIO_HALF_STEP) < flat,
            'Half-Step was not faster than the same walk at a flat no-bonus rate'
        );
    });

    test('the secondary path is walked with benediction, not the main path elixir', () => {
        // Defect: the walk was handed mainPathDailyXPBase, which carries elixir.
        // The secondary path never gets elixir; it gets benediction. Players
        // running one and not the other had the walk mispriced in both
        // directions.
        const bare = at();
        const withBenediction = at({ benediction: 6, benedictionConsumed: 10 });
        const withElixir = at({ elixir: 6, elixirConsumed: 10 });

        assert.ok(
            daysTo(withBenediction, SCENARIO_HALF_STEP) < daysTo(bare, SCENARIO_HALF_STEP),
            'benediction did not speed the secondary path walk up'
        );

        // Elixir only shortens the main path leg, so it helps Completion and
        // Half-Step by the same number of days, not by more.
        const elixirSavesOnCompletion = daysTo(bare, SCENARIO_COMPLETION) - daysTo(withElixir, SCENARIO_COMPLETION);
        const elixirSavesOnHalfStep = daysTo(bare, SCENARIO_HALF_STEP) - daysTo(withElixir, SCENARIO_HALF_STEP);

        assert.ok(elixirSavesOnCompletion > 0, 'the fixture must have a main path leg for elixir to shorten');
        assert.ok(
            Math.abs(elixirSavesOnHalfStep - elixirSavesOnCompletion) < 1e-9,
            `elixir was credited to the secondary path legs (${elixirSavesOnHalfStep}d vs ${elixirSavesOnCompletion}d)`
        );
    });

    test('the main path leg is exactly the Completion row', () => {
        // Defect: the leg went through its own averaged-rate helper, which left
        // out elixir, ignored the bonus carried from last realm, and priced the
        // back half of the run at a tier only earned once the leg finishes. A
        // max() against the Completion figure hid the disagreement.
        for (const [name, player] of entries) {
            for (const overrides of [{}, { elixir: 4, elixirConsumed: 10 }, { hadViryaLastRealm: 'Halfstep' }]) {
                const p = makePlayer({ ...player, ...overrides });
                const completion = daysTo(p, SCENARIO_COMPLETION);
                if (!Number.isFinite(completion) || completion <= 0) continue;

                const r = ratesFor(p);
                if (r.secondaryPathDailyXPBase <= 0) continue;

                for (const tier of [SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP]) {
                    const days = daysTo(p, tier);
                    if (!Number.isFinite(days)) continue;
                    assert.ok(
                        days >= completion - 1e-9,
                        `${name} ${JSON.stringify(overrides)}: ${tier} (${days}d) landed before Completion (${completion}d)`
                    );
                }
            }
        }
    });

    test('a bonus carried from last realm shortens the walk', () => {
        // The carry was absent from the walk entirely: mainPathDailyXPBase
        // includes it, the walk's own rates did not.
        const bare = at({ mainPathRealm: 'Nirvana Early', mainPathProgress: 10, hadViryaLastRealm: 'No' });
        const carried = at({ mainPathRealm: 'Nirvana Early', mainPathProgress: 10, hadViryaLastRealm: 'Halfstep' });

        assert.equal(
            ViryaCalculator.currentBonusAt(carried, SCENARIO_NO_VIRYA, 'Early'),
            0.4,
            'Half-Step carries through the next realm Early stage'
        );
        assert.equal(ViryaCalculator.currentBonusAt(bare, SCENARIO_NO_VIRYA, 'Early'), 0);

        assert.ok(
            daysTo(carried, SCENARIO_HALF_STEP) < daysTo(bare, SCENARIO_HALF_STEP),
            'the carried bonus did not shorten the tier walk'
        );
    });

    test('the walk is unaffected by which path currently holds the focus', () => {
        // The table reads off the base rates, so toggling focus must not move a
        // single row - that is what makes adding two dashboard figures together
        // a fair comparison in the first place.
        for (const tier of [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP]) {
            assert.equal(
                daysTo(at({ pathFocus: PATH_MAIN }), tier),
                daysTo(at({ pathFocus: PATH_SECONDARY }), tier),
                `${tier} moved with path focus`
            );
        }
    });
});

describe('path-specific pills are booked once, on their own path', () => {
    // Elixir used to sit inside calculatePillXPBreakdown().total, which is the
    // character's rate. That rate is shared by both paths, so the main path was
    // credited with elixir twice - once there and once where Calculator books
    // it - and the secondary path was credited with elixir it never receives.
    // Benediction was already excluded; this is the symmetric half.
    const at = (overrides) => makePlayer({
        mainPathRealm: 'Nirvana Mid', mainPathProgress: 40,
        secondaryPathRealm: 'Perfection Late', secondaryPathProgress: 50,
        gemQuality: 'Epic', goldPill: 5, purplePill: 10, bluePill: 30,
        abodeBonusSectLevel: 40, ...overrides
    });

    const bare = at();
    const withElixir = at({ elixir: 4, elixirConsumed: 10 });
    const withBenediction = at({ benediction: 4, benedictionConsumed: 10 });

    test('neither pill moves the character rate', () => {
        const rate = (p) => XPCalculator.calculateDailyXPWithAbsorptionBonus(p, 0);

        assert.ok(Progression.elixirXP(withElixir) > 0, 'the fixture must earn elixir XP');
        assert.ok(Progression.benedictionXP(withBenediction) > 0, 'the fixture must earn benediction XP');

        assert.equal(rate(withElixir), rate(bare), 'elixir leaked into the shared character rate');
        assert.equal(rate(withBenediction), rate(bare), 'benediction leaked into the shared character rate');
    });

    test('elixir lands on the main path exactly once', () => {
        assert.equal(
            Progression.mainPathDailyXPBase(withElixir, 0),
            Progression.mainPathDailyXPBase(bare, 0) + Progression.elixirXP(withElixir),
            'the main path did not receive exactly one helping of elixir'
        );
        assert.equal(
            Progression.secondaryPathDailyXPBase(withElixir, 0),
            Progression.secondaryPathDailyXPBase(bare, 0),
            'the secondary path was credited with the main path elixir'
        );
    });

    test('benediction lands on the secondary path exactly once', () => {
        assert.equal(
            Progression.secondaryPathDailyXPBase(withBenediction, 0),
            Progression.secondaryPathDailyXPBase(bare, 0) + Progression.benedictionXP(withBenediction),
            'the secondary path did not receive exactly one helping of benediction'
        );
        assert.equal(
            Progression.mainPathDailyXPBase(withBenediction, 0),
            Progression.mainPathDailyXPBase(bare, 0),
            'the main path was credited with the secondary path benediction'
        );
    });

    test('Calculator books them the same way the engine helpers do', () => {
        for (const [name, player] of entries) {
            const calc = new OvermortalCalculator();
            calc.playerData = player;
            const bonuses = calc.calculatePathAbsorptionBonuses(ViryaCalculator.detectScenario(player));
            const rates = calc.calculatePathDailyXP(
                bonuses.mainPathAbsorptionBonus, bonuses.secondaryPathAbsorptionBonus
            );

            assert.equal(
                rates.mainPathDailyXPBase,
                Progression.mainPathDailyXPBase(player, bonuses.mainPathAbsorptionBonus),
                `${name}: the dashboard main path rate drifted from the engine helper`
            );
            assert.equal(
                rates.secondaryPathDailyXPBase,
                Progression.secondaryPathDailyXPBase(player, bonuses.secondaryPathAbsorptionBonus),
                `${name}: the dashboard secondary path rate drifted from the engine helper`
            );
        }
    });
});
