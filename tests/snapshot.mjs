// Characterization snapshot.
//
// Dumps the output of every calculation that matters for a grid of player
// states, so that a refactor step produces a reviewable diff instead of a
// silent change in behaviour.
//
//   npm run snapshot          -> writes tests/__snapshots__/current.json
//   git diff tests/__snapshots__/
//
// Values are rounded so that floating-point noise doesn't show up as a diff.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLAYERS } from './fixtures.js';
import { OvermortalCalculator } from '../js/utilities/Calculator.js';
import { XPCalculator } from '../js/calculators/XPCalculator.js';
import { RealmCalculator } from '../js/calculators/RealmCalculator.js';
import { ViryaCalculator } from '../js/calculators/ViryaCalculator.js';
import { FruitCalculator } from '../js/calculators/FruitCalculator.js';
import { ViryaScenarioComparator } from '../js/calculators/ViryaScenarioComparator.js';
import { Progression } from '../js/engine/Progression.js';
import {
    VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION,
    SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP
} from '../js/utilities/gameData.js';

const HERE = dirname(fileURLToPath(import.meta.url));

const round = (n) => {
    if (n === null || n === undefined) return n;
    if (typeof n !== 'number') return n;
    if (!Number.isFinite(n)) return String(n);
    return Math.abs(n) >= 1 ? Math.round(n * 100) / 100 : Math.round(n * 1e6) / 1e6;
};

const TIERS = VIRYA_SCENARIO_ORDER.filter((s) => s !== SCENARIO_NO_VIRYA);

function snapshotPlayer(player) {
    const virya = ViryaCalculator.detectScenario(player);

    // Daily XP, computed the way the app computes it for each path.
    const mainDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(player, virya.absorptionBonus);
    const mainDailyXPNoBonus = XPCalculator.calculateDailyXPWithAbsorptionBonus(player, 0);
    // Through the shared helper, not a local copy of the spread: XP rates are a
    // main path property, and hand-rolling it here once hid that change entirely.
    const secondaryDailyXP = Progression.dailyXPForPath(player, 'secondary', virya.absorptionBonus);

    const xpToTier = {};
    const daysToTier = {};
    const maxNextRealm = {};
    for (const tier of TIERS) {
        const info = ViryaCalculator.calculateDaysToScenario(tier, player, mainDailyXP, secondaryDailyXP);
        xpToTier[tier] = round(info.xpNeeded);
        daysToTier[tier] = round(info.daysNeeded);
        try {
            maxNextRealm[tier] = ViryaCalculator.calculateMaxNextRealmScenario(
                tier, player, mainDailyXP, secondaryDailyXP
            );
        } catch (error) {
            maxNextRealm[tier] = `threw: ${error.message}`;
        }
    }

    const progression = RealmCalculator.calculateProgression(player, mainDailyXP, secondaryDailyXP);

    // Path daily XP as the app books it. The helper above deliberately leaves
    // out the path-specific sources - elixir and the Confluence's Daily EXP
    // share on the main path, benediction and the Confluence's Aux Cultivation
    // share on the secondary - so this is the only place they are pinned, along
    // with what path focus does to them.
    const calculator = new OvermortalCalculator();
    calculator.playerData = { ...player };
    const bonuses = calculator.calculatePathAbsorptionBonuses(virya);
    const paths = calculator.calculatePathDailyXP(
        bonuses.mainPathAbsorptionBonus, bonuses.secondaryPathAbsorptionBonus
    );

    // Scenario comparison, as the dashboard's Virya table builds it.
    const comparisons = {};
    const comparator = new ViryaScenarioComparator(player, mainDailyXP, 'snapshot', mainDailyXP, secondaryDailyXP);
    for (const tier of [SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP]) {
        try {
            const c = comparator.compareScenarios(SCENARIO_COMPLETION, tier);
            comparisons[tier] = {
                totalXP: round(c.scenario2.totalXP),
                overflowXP: round(c.scenario2.overflowXP),
                daysToReach: round(c.scenario2.daysToReach),
                better: c.comparison.betterScenario,
                percentage: c.comparison.percentage
            };
        } catch (error) {
            comparisons[tier] = `threw: ${error.message}`;
        }
    }

    // Mimic Calculator.calculateAll(): it writes cosmoapsisValue onto playerData
    // before computing anything else, and every later call reads that cached
    // value. These fields therefore capture what the running app actually
    // shows, which differs from the direct calls above.
    const asApp = { ...player };
    asApp.viryaScenario = virya.scenario;
    asApp.cosmoapsisValue = XPCalculator.calculateCosmoapsisValue(asApp, virya.absorptionBonus);
    const appMainDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(asApp, virya.absorptionBonus);
    const appMainDailyXPNoBonus = XPCalculator.calculateDailyXPWithAbsorptionBonus(asApp, 0);
    const appSecondaryDailyXP = Progression.dailyXPForPath(asApp, 'secondary', virya.absorptionBonus);

    return {
        tier: virya.scenario,
        absorptionBonus: virya.absorptionBonus,
        bonusEndsAt: virya.bonusEndsAt,
        totalAbode: round(XPCalculator.calculateTotalAbode(player)),
        cosmoapsis: round(XPCalculator.calculateCosmoapsisValue(player, virya.absorptionBonus)),
        mainDailyXP: round(mainDailyXP),
        mainDailyXPNoBonus: round(mainDailyXPNoBonus),
        secondaryDailyXP: round(secondaryDailyXP),
        pathDailyXP: {
            mainBase: round(paths.mainPathDailyXPBase),
            secondaryBase: round(paths.secondaryPathDailyXPBase),
            mainWhenFocused: round(paths.mainPathDailyXP),
            secondaryWhenFocused: round(paths.secondaryPathDailyXP),
            wisdomConfluenceAuxXP: round(paths.wisdomConfluenceAuxXP),
            wisdomConfluenceDailyXP: round(paths.wisdomConfluenceDailyXP)
        },
        respiraXP: round(XPCalculator.calculateRespiraXP(player)),
        pillXP: round(XPCalculator.calculatePillXP(player)),
        pearlXP: round(XPCalculator.calculatePearlXP(player, virya.absorptionBonus)),
        redPillsPerDay: round(XPCalculator.calculateRedPills(player)),
        fruitXP: round(FruitCalculator.fruitXP(player)),
        xpToTier,
        daysToTier,
        maxNextRealm,
        mainTimeToNextMinor: round(progression.mainPath.timeToNextMinor),
        mainTimeToNextMajor: round(progression.mainPath.timeToNextMajor),
        secondaryTimeToNextMinor: round(progression.secondaryPath.timeToNextMinor),
        secondaryTimeToNextMajor: round(progression.secondaryPath.timeToNextMajor),

        comparisons,

        asAppComputesIt: {
            mainDailyXP: round(appMainDailyXP),
            mainDailyXPNoBonus: round(appMainDailyXPNoBonus),
            secondaryDailyXP: round(appSecondaryDailyXP),
            // Should equal the tier's absorption bonus effect. Zero means the
            // bonus was discarded by the cached cosmoapsisValue.
            bonusIsHonoured: round(appMainDailyXP - appMainDailyXPNoBonus) !== 0
        }
    };
}

const snapshot = {};
for (const [name, player] of Object.entries(PLAYERS)) {
    try {
        snapshot[name] = snapshotPlayer(player);
    } catch (error) {
        snapshot[name] = { error: `${error.name}: ${error.message}` };
    }
}

const outDir = join(HERE, '__snapshots__');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'current.json'), JSON.stringify(snapshot, null, 2) + '\n');

console.log(`Wrote snapshot for ${Object.keys(snapshot).length} player states.`);
