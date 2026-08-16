// When to eat fruits, and which path to feed them to.
//
// The decision this answers is not "how much XP is a fruit worth" - FruitCalculator
// already answers that - but "given that daily XP goes to exactly one path, where
// does a one-off lump of fruit XP buy the most".
//
// That framing matters. Path focus is all-or-nothing: XPCalculator computes one
// full daily total for whichever path the mainPath* fields point at, and
// ViryaScenarioComparator books zero main path XP for every day spent chasing a
// tier on the secondary path. Fruits are the only XP source that sidesteps that,
// because eating them costs no days of focus. So a fruit fed to the secondary
// path is really buying back days of main path income, and the question is how
// many.
//
// Two things move the value of a fruit:
//
//   Realm     FruitCalculator.fruitXP scales off the fed path's major realm
//             (GameConstants.fruitRealmData). The secondary path usually lags,
//             so a fruit is worth less there in raw XP - which is why the
//             comparison has to be made in days bought, not XP.
//   Timegate  A 1.5x multiplier applies while a timegate is running. The window
//             is the early part of each major realm, so a player who is not
//             currently gated cannot get it again until after they break through.
//
// Everything here works by turning a lump of fruit XP into a move along the realm
// ladder (domain/realms.js advanceBy) and handing the resulting playerData to the
// calculators that already exist. Nothing downstream needs to know fruits were
// involved.

import { FruitCalculator } from './FruitCalculator.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { ViryaScenarioComparator } from './ViryaScenarioComparator.js';
import { ViryaRules } from '../engine/ViryaRules.js';
import { Progression } from '../engine/Progression.js';
import { advanceBy, realmXP, splitRealm, xpBetween, isAtOrBeyond } from '../domain/realms.js';
import {
    PERCENTAGE_COMPLETE, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA
} from '../utilities/gameData.js';

/** The plans compared for each tier, in the order they are shown. */
const PLAN_ORDER = ['none', 'secondary-threshold', 'secondary-all', 'main-all', 'hold'];

// Only the two plans whose label is not derived from their allocation. The rest
// are named by what they actually do with the fruits - see describeAllocation.
const PLAN_LABEL = {
    'none': 'Eat nothing',
    'hold': 'Hold until after breakthrough'
};

class FruitTimingCalculator {
    /**
     * XP one fruit is worth when fed to a path.
     *
     * FruitCalculator.fruitXP reads the mainPath* fields and the timegate flag,
     * so both variables are set by re-pointing a copy rather than by teaching it
     * about paths.
     *
     * @param {'main'|'secondary'} path
     * @param {boolean} duringTimegate whether the 1.5x window is running
     */
    static fruitXPPerFruit(playerData, path, duringTimegate) {
        const state = Progression.asPathPlayerData(playerData, path);
        if (!state) return 0;

        try {
            return FruitCalculator.fruitXP({ ...state, timegate: duringTimegate ? 1 : 0 });
        } catch (error) {
            // An unknown major realm has no fruit table; treat it as worthless
            // rather than taking the whole dashboard down.
            return 0;
        }
    }

    /**
     * Hold a position inside a major realm, expressing anything past its Late
     * stage as progress above 100 rather than as a move into the next major.
     *
     * The main path cannot leave its major until the timegate expires, however
     * much XP is poured in, and the rest of the engine already represents that
     * state as overflow at Late.
     */
    static clampToMajorLate(major, position, { allowOverflow = true } = {}) {
        const lateRealm = `${major} Late`;
        if (!isAtOrBeyond(position.realm, position.progress, lateRealm, PERCENTAGE_COMPLETE)) {
            return position;
        }
        if (!allowOverflow) {
            return { realm: lateRealm, progress: PERCENTAGE_COMPLETE };
        }

        // Re-express the surplus as progress past 100% of Late.
        const surplus = xpBetween(lateRealm, 0, position.realm, position.progress);
        const size = realmXP(lateRealm);
        return {
            realm: lateRealm,
            progress: size > 0 ? (surplus / size) * PERCENTAGE_COMPLETE : PERCENTAGE_COMPLETE
        };
    }

    /**
     * A copy of playerData with the given fruits already eaten.
     *
     * The secondary path is clamped at the main path's Late stage with no
     * overflow: no Virya tier asks for more than that, so fruits poured past it
     * buy nothing this realm and must not be credited as though they did.
     */
    static applyFruits(playerData, { toMain = 0, toSecondary = 0, duringTimegate = false }) {
        const next = { ...playerData };

        if (toMain > 0) {
            const perFruit = this.fruitXPPerFruit(playerData, 'main', duringTimegate);
            const landed = this.clampToMajorLate(
                playerData.mainPathRealmMajor,
                advanceBy(playerData.mainPathRealm, playerData.mainPathProgress, perFruit * toMain)
            );
            const { major, minor } = splitRealm(landed.realm);
            next.mainPathRealm = landed.realm;
            next.mainPathRealmMajor = major;
            next.mainPathRealmMinor = minor;
            next.mainPathProgress = landed.progress;
            next.mainPathExp = realmXP(landed.realm) * (landed.progress / PERCENTAGE_COMPLETE);
        }

        if (toSecondary > 0) {
            const perFruit = this.fruitXPPerFruit(playerData, 'secondary', duringTimegate);
            const landed = this.clampToMajorLate(
                playerData.mainPathRealmMajor,
                advanceBy(playerData.secondaryPathRealm, playerData.secondaryPathProgress, perFruit * toSecondary),
                { allowOverflow: false }
            );
            const { major, minor } = splitRealm(landed.realm);
            next.secondaryPathRealm = landed.realm;
            next.secondaryPathRealmMajor = major;
            next.secondaryPathRealmMinor = minor;
            next.secondaryPathProgress = landed.progress;
            next.secondaryPathExp = realmXP(landed.realm) * (landed.progress / PERCENTAGE_COMPLETE);
        }

        return next;
    }

    /**
     * Fruits needed to cover each leg of a tier outright: the main path's walk to
     * 100% Late, and the secondary path's walk to the tier's requirement.
     *
     * Infinity means the leg cannot be bought at all, which happens when the path
     * has no priced fruit.
     */
    static fruitsToReachTier(playerData, tier, duringTimegate) {
        const completionXP = ViryaCalculator.calculateXPForCompletion(playerData);

        const requirement = ViryaRules.requirementFor(tier, playerData.mainPathRealmMajor);
        const secondaryXP = requirement
            ? xpBetween(
                playerData.secondaryPathRealm, playerData.secondaryPathProgress,
                requirement.realm, requirement.progress
            )
            : 0;

        const perMain = this.fruitXPPerFruit(playerData, 'main', duringTimegate);
        const perSecondary = this.fruitXPPerFruit(playerData, 'secondary', duringTimegate);

        const count = (xp, perFruit) => {
            if (xp <= 0) return 0;
            return perFruit > 0 ? Math.ceil(xp / perFruit) : Infinity;
        };

        return {
            main: count(completionXP, perMain),
            secondary: count(secondaryXP, perSecondary),
            completionXP,
            secondaryXP
        };
    }

    /**
     * The most fruits the secondary path can usefully take: enough to carry it to
     * 100% of the main path's Late stage, which is the highest any tier requires
     * (Half-Step). Anything past that is better spent on the main path.
     */
    static secondaryCapacity(playerData, duringTimegate) {
        const perFruit = this.fruitXPPerFruit(playerData, 'secondary', duringTimegate);
        if (perFruit <= 0) return 0;

        const xp = xpBetween(
            playerData.secondaryPathRealm, playerData.secondaryPathProgress,
            `${playerData.mainPathRealmMajor} Late`, PERCENTAGE_COMPLETE
        );
        return xp > 0 ? Math.ceil(xp / perFruit) : 0;
    }

    /**
     * Main path XP banked over the shared comparison window, for a player who has
     * already eaten their fruits.
     *
     * The window is fixed by the caller from the *original* player state so that
     * every plan is scored over the same stretch of time. Fruit XP fed to the
     * main path is added on top rather than simulated: simulateDays reports the
     * XP earned during the days it walks, never the position it started from, so
     * there is no double count.
     */
    static bankedMainXP(fruitedPlayerData, tier, totalDays, mainFruitXP) {
        const bonus = ViryaCalculator.detectScenario(fruitedPlayerData).absorptionBonus;
        const mainDailyXP = Progression.dailyXPForPath(fruitedPlayerData, 'main', bonus);
        const secondaryDailyXP = Progression.dailyXPForPath(fruitedPlayerData, 'secondary', bonus);

        const comparator = new ViryaScenarioComparator(
            fruitedPlayerData, mainDailyXP, 'fruit-timing', mainDailyXP, secondaryDailyXP
        );

        const result = comparator.calculateOverflowXPForScenario(tier, totalDays);
        return (result.overflowXP || 0) + mainFruitXP;
    }

    /** A label describing where an allocation actually sends the fruits. */
    static describeAllocation({ toMain, toSecondary }) {
        if (toMain <= 0 && toSecondary <= 0) return PLAN_LABEL.none;
        if (toSecondary <= 0) return 'All to main path';
        if (toMain <= 0) return 'All to secondary path';
        return `${toSecondary} to secondary path, ${toMain} to main path`;
    }

    /** Days of main path focus a lump of XP is worth, at a given daily rate. */
    static daysBought(xp, dailyXP) {
        return dailyXP > 0 ? xp / dailyXP : 0;
    }

    /**
     * Compare every fruit plan for one tier.
     *
     * @returns {Object} the plans, the best of them, and the numbers behind the
     *   choice. `reachable: false` means the tier cannot be had this realm at all.
     */
    static evaluateTier(playerData, tier, context) {
        const { totalDays, timegateDays, duringTimegate, fruitsNow } = context;

        const currentTier = ViryaCalculator.detectScenario(playerData).scenario;
        const alreadyHeld = ViryaRules.tierRank(currentTier) >= ViryaRules.tierRank(tier);

        const needed = this.fruitsToReachTier(playerData, tier, duringTimegate);
        const perMain = this.fruitXPPerFruit(playerData, 'main', duringTimegate);
        const perSecondary = this.fruitXPPerFruit(playerData, 'secondary', duringTimegate);

        // How many fruits the secondary path can absorb before it reaches the
        // main path's Late stage, past which no tier asks for more. Fruits beyond
        // this buy nothing, so no plan is allowed to spend them there - the
        // surplus always falls through to the main path instead.
        const secondaryCapacity = this.secondaryCapacity(playerData, duringTimegate);

        const toSecondaryFor = (want) => {
            const capped = Math.min(want, secondaryCapacity, fruitsNow);
            return Number.isFinite(capped) ? Math.max(0, capped) : 0;
        };

        // Allocations. Every plan spends the whole stock: whatever the named path
        // cannot use goes to the main path rather than being quietly dropped.
        const allocations = {
            'none': { toMain: 0, toSecondary: 0 },
            'main-all': { toMain: fruitsNow, toSecondary: 0 },
            'secondary-all': (() => {
                const toSecondary = toSecondaryFor(secondaryCapacity);
                return { toMain: fruitsNow - toSecondary, toSecondary };
            })(),
            'secondary-threshold': (() => {
                const toSecondary = toSecondaryFor(needed.secondary);
                return { toMain: fruitsNow - toSecondary, toSecondary };
            })()
        };

        const plans = [];
        const seen = new Set();
        for (const id of PLAN_ORDER) {
            if (id === 'hold') continue; // handled separately below

            const allocation = allocations[id];

            // Different plans collapse onto the same allocation all the time - a
            // tier with no secondary requirement, or a stock too small to reach
            // the threshold. Show each distinct choice once.
            const signature = `${allocation.toMain}|${allocation.toSecondary}`;
            if (seen.has(signature)) continue;
            seen.add(signature);
            const fruited = this.applyFruits(playerData, { ...allocation, duringTimegate });

            const bonus = ViryaCalculator.detectScenario(fruited).absorptionBonus;
            const info = ViryaCalculator.calculateDaysToScenario(
                tier, fruited,
                Progression.dailyXPForPath(fruited, 'main', bonus),
                Progression.dailyXPForPath(fruited, 'secondary', bonus)
            );

            const daysToTier = info?.daysNeeded ?? Infinity;
            const mainFruitXP = allocation.toMain * perMain;

            let bankedXP = 0;
            try {
                bankedXP = this.bankedMainXP(fruited, tier, totalDays, mainFruitXP);
            } catch (error) {
                bankedXP = 0;
            }

            plans.push({
                id,
                // Named for what it actually does with the fruits, not for the
                // plan it came from: plans collapse onto each other constantly,
                // and "just enough to secondary" reading against 0 secondary
                // fruits is worse than no label at all.
                label: this.describeAllocation(allocation),
                toMain: allocation.toMain,
                toSecondary: allocation.toSecondary,
                fruitsUsed: allocation.toMain + allocation.toSecondary,
                eatenAt: 'now',
                daysToTier,
                beatsTimegate: Number.isFinite(daysToTier) && daysToTier <= timegateDays,
                bankedXP,
                mainFruitXP
            });
        }

        const hold = this.evaluateHoldPlan(playerData, tier, context);
        if (hold) plans.push(hold);

        // The best plan is the one banking the most main path XP. A plan that
        // fails to land the tier before the timegate expires is not disqualified
        // outright - it may still bank more - but it is flagged so the caller can
        // say so.
        const best = plans.reduce(
            (winner, plan) => (plan.bankedXP > (winner?.bankedXP ?? -Infinity) ? plan : winner),
            null
        );

        const baseline = plans.find((plan) => plan.id === 'none');

        return {
            tier,
            alreadyHeld,
            reachable: plans.some((plan) => Number.isFinite(plan.daysToTier)),
            // Past the window the tier lands after the comparison ends, so the
            // engine banks nothing for it and the only XP shown is the fruit
            // lump itself. Worth saying out loud rather than showing a bare 0.
            reachableInWindow: plans.some(
                (plan) => Number.isFinite(plan.daysToTier) && plan.daysToTier <= totalDays
            ),
            fruitsNeeded: {
                main: needed.main,
                secondary: needed.secondary,
                total: needed.main + needed.secondary
            },
            secondaryCapacity,
            fruitsAvailable: fruitsNow,
            completionXP: needed.completionXP,
            secondaryXP: needed.secondaryXP,
            plans,
            bestPlanId: best?.id ?? 'none',
            baselineBankedXP: baseline?.bankedXP ?? 0,
            gainOverBaseline: (best?.bankedXP ?? 0) - (baseline?.bankedXP ?? 0)
        };
    }

    /**
     * The plan that spends nothing now and eats after the breakthrough instead.
     *
     * Waiting is paid for in two currencies and earns in two: the fruits are worth
     * more (the next major's fruit table, and its timegate re-opens the 1.5x
     * window) and more of them have accrued, but they arrive too late to help
     * reach the tier in this realm.
     *
     * The lump is added to the banked total rather than simulated, so the second
     * order effect of starting the next realm further along is not modelled. That
     * understates the plan slightly.
     */
    static evaluateHoldPlan(playerData, tier, context) {
        const { totalDays, timegateDays } = context;

        const bonus = ViryaCalculator.detectScenario(playerData).absorptionBonus;
        const walk = Progression.simulateToBreakthrough({
            playerData,
            targetTier: tier,
            mainDailyXP: Progression.dailyXPForPath(playerData, 'main', bonus),
            secondaryDailyXP: Progression.dailyXPForPath(playerData, 'secondary', bonus)
        });

        if (!walk.ok) return null;

        // Fruits keep arriving while waiting, and the next realm's timegate is
        // running when they are finally eaten.
        const fruitsAtBreakthrough = FruitCalculator.projectedFruits(playerData, walk.breakthroughTime);
        const perFruit = this.fruitXPPerFruit(walk.breakthroughPlayerData, 'main', true);
        const mainFruitXP = fruitsAtBreakthrough * perFruit;

        let bankedXP = 0;
        try {
            bankedXP = this.bankedMainXP(playerData, tier, totalDays, mainFruitXP);
        } catch (error) {
            bankedXP = 0;
        }

        const info = ViryaCalculator.calculateDaysToScenario(
            tier, playerData,
            Progression.dailyXPForPath(playerData, 'main', bonus),
            Progression.dailyXPForPath(playerData, 'secondary', bonus)
        );
        const daysToTier = info?.daysNeeded ?? Infinity;

        return {
            id: 'hold',
            label: PLAN_LABEL.hold,
            toMain: fruitsAtBreakthrough,
            toSecondary: 0,
            fruitsUsed: fruitsAtBreakthrough,
            eatenAt: 'next-window',
            waitDays: walk.breakthroughTime,
            daysToTier,
            beatsTimegate: Number.isFinite(daysToTier) && daysToTier <= timegateDays,
            bankedXP,
            mainFruitXP,
            perFruitXP: perFruit
        };
    }

    /**
     * The whole analysis: per-fruit values, and every plan for every tier.
     *
     * @param {Object} playerData
     * @param {number} mainDailyXP   the app's main path daily XP, for days-bought
     * @param {number} secondaryDailyXP
     */
    static analyze(playerData, mainDailyXP, secondaryDailyXP) {
        const duringTimegate = (playerData.timegate || 0) > 0;
        const timegateDays = playerData.timegateDays || 0;

        const bonus = ViryaCalculator.detectScenario(playerData).absorptionBonus;
        const comparator = new ViryaScenarioComparator(
            playerData, mainDailyXP, 'fruit-timing-window', mainDailyXP, secondaryDailyXP
        );
        const totalDays = comparator.getTotalDaysUntilNextTimegateEnd();

        const fruitsNow = FruitCalculator.projectedFruits(playerData, 0);

        const perFruit = {
            mainNow: this.fruitXPPerFruit(playerData, 'main', duringTimegate),
            secondaryNow: this.fruitXPPerFruit(playerData, 'secondary', duringTimegate),
            mainGated: this.fruitXPPerFruit(playerData, 'main', true),
            mainUngated: this.fruitXPPerFruit(playerData, 'main', false),
            secondaryGated: this.fruitXPPerFruit(playerData, 'secondary', true),
            secondaryUngated: this.fruitXPPerFruit(playerData, 'secondary', false)
        };

        // The exchange rate that decides which path a fruit should go to: not XP,
        // but days of that path's own progress bought.
        const daysBought = {
            main: this.daysBought(perFruit.mainNow, mainDailyXP),
            secondary: this.daysBought(perFruit.secondaryNow, secondaryDailyXP)
        };

        const context = { totalDays, timegateDays, duringTimegate, fruitsNow };

        const tiers = {};
        for (const tier of VIRYA_SCENARIO_ORDER) {
            if (tier === SCENARIO_NO_VIRYA) continue;
            try {
                tiers[tier] = this.evaluateTier(playerData, tier, context);
            } catch (error) {
                tiers[tier] = { tier, reachable: false, plans: [], error: error.message };
            }
        }

        return {
            windowDays: totalDays,
            timegateDays,
            timegateActive: duringTimegate,
            fruitsAvailable: fruitsNow,
            currentTier: ViryaCalculator.detectScenario(playerData).scenario,
            absorptionBonus: bonus,
            perFruit,
            daysBought,
            preferredPath: daysBought.secondary > daysBought.main ? 'Secondary Path' : 'Main Path',
            tiers
        };
    }
}

export { FruitTimingCalculator, PLAN_ORDER, PLAN_LABEL };
