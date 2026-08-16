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
import { FruitTimingCalculator } from '../js/calculators/FruitTimingCalculator.js';
import { ViryaCalculator } from '../js/calculators/ViryaCalculator.js';
import { ViryaRules } from '../js/engine/ViryaRules.js';
import { Progression } from '../js/engine/Progression.js';
import { advanceBy, absoluteXP, realmXP, xpBetween } from '../js/domain/realms.js';
import {
    SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE,
    SCENARIO_PERFECT, SCENARIO_HALF_STEP, Realms, GameConstants
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

describe('realm ladder: advanceBy', () => {
    // advanceBy is the inverse of absoluteXP, and the whole fruit timing feature
    // rests on it: a lump of fruit XP is only ever expressed as a move along the
    // ladder. If this drifts, every plan is costed against the wrong realm.
    const positions = [
        ['Nascent Early', 0], ['Incarnation Mid', 42], ['Voidbreak Late', 99],
        ['Wholeness Early', 0], ['Nirvana Late', 100], ['Celestial Mid', 12]
    ];

    for (const [realm, progress] of positions) {
        test(`${realm} @ ${progress}%: gaining nothing changes nothing`, () => {
            const landed = advanceBy(realm, progress, 0);
            assert.equal(landed.realm, realm);
            assert.ok(Math.abs(landed.progress - progress) < 1e-6);
        });

        test(`${realm} @ ${progress}%: advancing by xpBetween reaches the target`, () => {
            // Compared in absolute XP: a boundary position may be reported as
            // 100% of the realm below rather than 0% of the target, which is the
            // same point on the ladder.
            for (const target of ['Wholeness Mid', 'Nirvana Early', 'Supreme Early']) {
                const needed = xpBetween(realm, progress, target, 0);
                if (needed <= 0) continue;
                const landed = advanceBy(realm, progress, needed);
                assert.ok(
                    Math.abs(absoluteXP(landed.realm, landed.progress) - absoluteXP(target, 0)) < 1,
                    `${realm} + ${needed} should land on ${target}, landed on ${landed.realm} @ ${landed.progress}%`
                );
            }
        });

        test(`${realm} @ ${progress}%: more XP never lands further back`, () => {
            let previous = -Infinity;
            for (const xp of [0, 1e6, 1e8, 1e9, 5e9, 1e11]) {
                const landed = advanceBy(realm, progress, xp);
                const absolute = absoluteXP(landed.realm, landed.progress);
                assert.ok(absolute >= previous, `advancing by ${xp} went backwards`);
                previous = absolute;
            }
        });
    }

    test('a filled realm stays at 100% instead of becoming 0% of the next', () => {
        // Virya reads "100% Late" as a state, so normalising it into the next
        // major's Early would silently strip the player of Completion.
        for (const realm of ['Wholeness Late', 'Nirvana Late', 'Incarnation Mid']) {
            const landed = advanceBy(realm, 0, realmXP(realm));
            assert.equal(landed.realm, realm, `${realm} was normalised into ${landed.realm}`);
            assert.ok(Math.abs(landed.progress - 100) < 1e-6, `expected 100%, got ${landed.progress}`);
        }
    });

    test('advancing past the top of the ladder overflows rather than falling off', () => {
        const landed = advanceBy('Supreme Late', 50, 1e15);
        assert.equal(landed.realm, 'Supreme Late');
        assert.ok(landed.progress > 100, `expected overflow progress, got ${landed.progress}`);
    });
});

describe('fruit timing', () => {
    const gated = (p) => ({ ...p, timegate: 30, timegateDays: 30 });
    const ungated = (p) => ({ ...p, timegate: 0, timegateDays: 0 });

    test('the timegate multiplier is exactly 1.5, on both paths', () => {
        // The 1.5x window is the single biggest timing lever, and it applies to
        // whichever path is being fed.
        for (const [name, p] of entries) {
            for (const path of ['main', 'secondary']) {
                const off = FruitTimingCalculator.fruitXPPerFruit(ungated(p), path, false);
                const on = FruitTimingCalculator.fruitXPPerFruit(ungated(p), path, true);
                if (off <= 0) continue;
                assert.ok(
                    Math.abs(on / off - 1.5) < 1e-9,
                    `${name}/${path}: timegate multiplier was ${on / off}, expected 1.5`
                );
            }
        }
    });

    test('a fruit is priced against the realm of the path it is fed to', () => {
        // geared has its two paths in different majors, so the two prices must
        // differ. Reading the main path's realm for a secondary path fruit was
        // the obvious way to get this wrong.
        const p = PLAYERS.geared;
        const main = FruitTimingCalculator.fruitXPPerFruit(p, 'main', false);
        const secondary = FruitTimingCalculator.fruitXPPerFruit(p, 'secondary', false);

        assert.notEqual(p.mainPathRealmMajor, p.secondaryPathRealmMajor);
        const expectedRatio = GameConstants.fruitRealmData[p.mainPathRealmMajor]
            / GameConstants.fruitRealmData[p.secondaryPathRealmMajor];
        assert.ok(
            Math.abs(main / secondary - expectedRatio) < 1e-9,
            `expected the fruit table ratio ${expectedRatio}, got ${main / secondary}`
        );
    });

    test('fruits never carry the main path out of its major realm', () => {
        // The timegate blocks the breakthrough however much XP is poured in, so a
        // fruit lump must show up as overflow at Late, not as a new major.
        for (const [name, p] of entries) {
            const fed = FruitTimingCalculator.applyFruits(p, { toMain: 100000, duringTimegate: true });
            assert.equal(
                fed.mainPathRealmMajor, p.mainPathRealmMajor,
                `${name}: main path escaped ${p.mainPathRealmMajor} into ${fed.mainPathRealmMajor}`
            );
            assert.ok(fed.mainPathProgress >= p.mainPathProgress, `${name}: main path went backwards`);
        }
    });

    test('eating no fruits leaves both paths exactly where they were', () => {
        for (const [name, p] of entries) {
            const fed = FruitTimingCalculator.applyFruits(p, { toMain: 0, toSecondary: 0, duringTimegate: true });
            assert.equal(fed.mainPathRealm, p.mainPathRealm, `${name}: main realm moved`);
            assert.equal(fed.secondaryPathRealm, p.secondaryPathRealm, `${name}: secondary realm moved`);
            assert.equal(fed.mainPathProgress, p.mainPathProgress, `${name}: main progress moved`);
            assert.equal(fed.secondaryPathProgress, p.secondaryPathProgress, `${name}: secondary progress moved`);
        }
    });

    test('the quoted fruit count really does unlock the tier', () => {
        // This is the number the "just enough to reach Virya" plan is built on.
        // If it undershoots, the plan silently recommends missing the threshold.
        const atCompletion = entries.filter(
            ([, p]) => ViryaRules.isMainPathComplete(p.mainPathRealmMinor, p.mainPathProgress)
        );
        assert.ok(atCompletion.length > 0, 'expected fixtures sitting at 100% Late');

        for (const [name, base] of atCompletion) {
            const p = gated(base);
            for (const tier of [SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP]) {
                const needed = FruitTimingCalculator.fruitsToReachTier(p, tier, true).secondary;
                if (!Number.isFinite(needed) || needed <= 0) continue;

                const fed = FruitTimingCalculator.applyFruits(p, { toSecondary: needed, duringTimegate: true });
                const reached = ViryaRules.detectTierForPlayer(fed);
                assert.ok(
                    ViryaRules.tierRank(reached) >= ViryaRules.tierRank(tier),
                    `${name}: ${needed} fruits was meant to reach ${tier}, reached ${reached}`
                );
            }
        }
    });

    test('one fruit fewer than quoted does not reach the tier', () => {
        // Guards the other side: a count rounded generously would make the
        // threshold plan waste fruits on every tier.
        const p = gated(PLAYERS.completionWholeness);
        for (const tier of [SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP]) {
            const needed = FruitTimingCalculator.fruitsToReachTier(p, tier, true).secondary;
            if (!Number.isFinite(needed) || needed <= 1) continue;

            const fed = FruitTimingCalculator.applyFruits(p, { toSecondary: needed - 1, duringTimegate: true });
            assert.ok(
                ViryaRules.tierRank(ViryaRules.detectTierForPlayer(fed)) < ViryaRules.tierRank(tier),
                `${tier}: ${needed - 1} fruits already reached it, so ${needed} is overshooting`
            );
        }
    });

    test('no plan spends more on the secondary path than it can absorb', () => {
        // Past the main path's Late stage no tier asks for more, so fruits sent
        // there would vanish. They must fall through to the main path instead.
        for (const [name, base] of entries) {
            const p = { ...gated(base), fruitsCount: 5000 };
            const analysis = FruitTimingCalculator.analyze(p, 1e9, 1e9);

            for (const [tier, tierAnalysis] of Object.entries(analysis.tiers)) {
                for (const plan of tierAnalysis.plans ?? []) {
                    if (plan.eatenAt !== 'now' || plan.id === 'none') continue;
                    assert.ok(
                        plan.toSecondary <= tierAnalysis.secondaryCapacity,
                        `${name}/${tier}/${plan.id}: sent ${plan.toSecondary} to a path that can take ${tierAnalysis.secondaryCapacity}`
                    );
                    assert.equal(
                        plan.toMain + plan.toSecondary, analysis.fruitsAvailable,
                        `${name}/${tier}/${plan.id}: dropped fruits on the floor`
                    );
                }
            }
        }
    });

    test('analyze survives every fixture', () => {
        for (const [name, p] of entries) {
            const bonus = ViryaCalculator.detectScenario(p).absorptionBonus;
            const main = Progression.dailyXPForPath(p, 'main', bonus);
            const secondary = Progression.dailyXPForPath(p, 'secondary', bonus);

            const analysis = FruitTimingCalculator.analyze({ ...p, fruitsCount: 120 }, main, secondary);
            assert.ok(analysis.tiers, `${name}: no tiers returned`);
            for (const [tier, t] of Object.entries(analysis.tiers)) {
                assert.ok(!t.error, `${name}/${tier}: ${t.error}`);
                assert.ok(t.plans.length > 0, `${name}/${tier}: no plans`);
            }
        }
    });

    test('the recommended plan is never worse than eating nothing', () => {
        for (const [name, base] of entries) {
            const p = { ...gated(base), fruitsCount: 150 };
            const bonus = ViryaCalculator.detectScenario(p).absorptionBonus;
            const analysis = FruitTimingCalculator.analyze(
                p,
                Progression.dailyXPForPath(p, 'main', bonus),
                Progression.dailyXPForPath(p, 'secondary', bonus)
            );

            for (const [tier, t] of Object.entries(analysis.tiers)) {
                assert.ok(
                    t.gainOverBaseline >= -1e-6,
                    `${name}/${tier}: best plan ${t.bestPlanId} lost ${-t.gainOverBaseline} XP against doing nothing`
                );
            }
        }
    });

    test('more fruits never bank less XP', () => {
        // Monotonicity of the score. A plan that got worse with more resources
        // would mean the allocation logic is dropping or mis-pricing them.
        const base = gated(PLAYERS.geared);
        let previous = -Infinity;

        for (const fruitsCount of [0, 10, 40, 100, 250, 600]) {
            const p = { ...base, fruitsCount };
            const bonus = ViryaCalculator.detectScenario(p).absorptionBonus;
            const analysis = FruitTimingCalculator.analyze(
                p,
                Progression.dailyXPForPath(p, 'main', bonus),
                Progression.dailyXPForPath(p, 'secondary', bonus)
            );
            const best = analysis.tiers[SCENARIO_PERFECT];
            const banked = Math.max(...best.plans.map((plan) => plan.bankedXP));

            assert.ok(banked >= previous - 1e-6, `banked XP fell from ${previous} to ${banked} at ${fruitsCount} fruits`);
            previous = banked;
        }
    });

    test('the analysis ignores the fields the app writes back onto playerData', () => {
        // Calculator.calculateAll() stamps cosmoapsisValue and viryaScenario onto
        // playerData before anything else runs. Reading either back would make a
        // hypothetical fruit-fed state report the tier it started from.
        const p = { ...gated(PLAYERS.completionWholeness), fruitsCount: 200 };
        const bonus = ViryaCalculator.detectScenario(p).absorptionBonus;
        const main = Progression.dailyXPForPath(p, 'main', bonus);
        const secondary = Progression.dailyXPForPath(p, 'secondary', bonus);

        const clean = FruitTimingCalculator.analyze(p, main, secondary);
        const stamped = FruitTimingCalculator.analyze(
            {
                ...p,
                cosmoapsisValue: 999999,
                viryaScenario: SCENARIO_HALF_STEP,
                viryaAbsorptionBonus: 0.4,
                dailyXP: 1
            },
            main, secondary
        );

        assert.deepEqual(
            stamped.tiers[SCENARIO_PERFECT].plans.map((plan) => Math.round(plan.bankedXP)),
            clean.tiers[SCENARIO_PERFECT].plans.map((plan) => Math.round(plan.bankedXP))
        );
    });
});
