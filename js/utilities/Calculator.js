import { XPCalculator } 	from '../calculators/XPCalculator.js';
import { RealmCalculator }	from '../calculators/RealmCalculator.js';
import { ViryaCalculator }	from '../calculators/ViryaCalculator.js';
import { Realms, GameConstants, PATH_MAIN, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, MAX_EXTRACTOR_LEVEL, PERCENTAGE_COMPLETE, BASE_RESPIRA_ATTEMPTS } from './gameData.js';
import { CalculatorUtils } 	from './utils.js';
import { DataManager } 		from './DataManager.js';
import { FruitCalculator } 	from '../calculators/FruitCalculator.js'; 
import { Recommendations } 	from '../calculators/Recommendations.js';
import { ViryaScenarioComparator } from '../calculators/ViryaScenarioComparator.js';
import { Progression } from '../engine/Progression.js';
import { ViryaRules } from '../engine/ViryaRules.js';

class OvermortalCalculator {
    constructor() {
        this.dataManager = new DataManager();
        this.playerData = {};
        this.calculationResults = {};
        this.debugEnabled = false;
        this.initializePlayerData();
    }

    initializePlayerData() {
        this.playerData = {
            mainPathRealm: 'Incarnation Early',
            mainPathRealmMajor: 'Incarnation',
            mainPathRealmMinor: 'Early',
            mainPathProgress: 0.0,
            mainPathExp: 0.0,
            secondaryPathRealm: 'Incarnation Early',
            secondaryPathRealmMajor: 'Incarnation',
            secondaryPathRealmMinor: 'Early',
            secondaryPathProgress: 0.0,
            secondaryPathExp: 0.0,
			pathFocus: PATH_MAIN,
            timegateDays: 30,
            hadViryaLastRealm: 'No',
            totalAbode: 0.0,
            dailyXP: 0.0,
            cosmoapsisValue: 0.0,
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
            pillBonus: 0.0,
            fruitsCount: 0,
            weeklyFruits: 0,
            fruitsUsage: 'current',
            tokensCount: 0,
            weeklyTokens: 0,
            useTokens: false,
            baseAbodeAura: 130.0,
            gemBonus: 'Common',
            gemQuality: 'Common',
            respiraAttemptsTotal: 10,
            respiraExp: 0,
            
            // Abode Aura / Absorption easy mode
            abodeEasyMode: false,
            abodeAuraEasyValue: 130.0,
            absorptionEasyValue: 0.317,

            // Absorption bonuses (percentage, applied on top of the realm base
            // plus any Virya bonus)
            absorptionBonusMonsterScape: 0,

            // Abode bonuses
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
            abodeBonusMiniWorld: 0,
            abodeBonusFiveAsthenia: 0,
            abodeTemperAuraCurio: 0,

            // Wisdom Confluence: a share of the day's abode XP, paid into the
            // secondary path
            wisdomConfluenceCurio: 0,

            // Respira bonuses
            respiraAttemptsImmortalFriend: 0,
            respiraAttemptsTechnique: 0,
            respiraAttemptsCurio: 0,
            respiraBonusImmortalFriend: 0,
            respiraBonusTechnique: 0,
            respiraBonusCurio: 0,
            respiraBonusTotal: 1.0,
            respiraNirvanaDipperMansion: 0,
            
            // Pill bonuses
            pillBonusNirvanaChariotMansion: 0,
            pillBonusNirvanaGhostMansion: 0,
            pillBonusNirvanaTurtleBeakMansion: 0,
            pillBonusGlittedLotusThrone: 0,
            pillBonusGlittedLotusSeed: 0,
            pillBonusCurio: 0,
            pillBonusImmortalFriends: 0,
            pillBonusTechnique: 0,
            pillAttemptsTechnique: 0,
            pillAttemptsImmortalFriends: 0,
            
            // Extractor
            extractorRank: 'common',
            extractorXPLevel: 0,
            extractorQualityLevel: 0,
            extractorGushLevel: 0
        };
    }

    updateFromInputs() {
        const pathData = this.updatePathInputs();
        const pillData = this.updatePillInputs();
        const abodeData = this.updateAbodeInputs();
        const respiraData = this.updateRespiraInputs();
        const artifactData = this.updateArtifactInputs();
        const otherData = this.updateOtherInputs();
        
        this.playerData = {
            ...pathData,
            ...pillData,
            ...abodeData,
            ...respiraData,
            ...artifactData,
            ...otherData
        };
    }

    // This used to be one big function, now it is split into smaller ones to make it easier to read and maintain.
    updatePathInputs() {
        const getNumberValue = CalculatorUtils.getNumberValue;
        const getStringValue = CalculatorUtils.getStringValue;
        const splitRealmString = CalculatorUtils.splitRealmString;
        
        const mainPathRealm = getStringValue('main-path-realm');
        const mainPathRealmParts = splitRealmString(mainPathRealm);
        const mainPathProgress = getNumberValue('main-path-progress');
        const mainPathExp = Realms[mainPathRealm]?.xp * (mainPathProgress / PERCENTAGE_COMPLETE) || 0;
        
        const secondaryPathRealm = getStringValue('secondary-path-realm');
        const secondaryPathRealmParts = splitRealmString(secondaryPathRealm);
        const secondaryPathProgress = getNumberValue('secondary-path-progress');
        const secondaryPathExp = Realms[secondaryPathRealm]?.xp * (secondaryPathProgress / PERCENTAGE_COMPLETE) || 0;
        
        return {
            mainPathRealm,
            mainPathRealmMajor: mainPathRealmParts.major,
            mainPathRealmMinor: mainPathRealmParts.minor,
            mainPathProgress,
            mainPathExp,
            secondaryPathRealm,
            secondaryPathRealmMajor: secondaryPathRealmParts.major,
            secondaryPathRealmMinor: secondaryPathRealmParts.minor,
            secondaryPathProgress,
            secondaryPathExp,
            pathFocus: getStringValue('path-focus'),
            timegateDays: getNumberValue('timegate-days'),
            hadViryaLastRealm: getStringValue('had-Virya'),
            totalAbode: 0.0,
            dailyXP: 0.0,
            cosmoapsisValue: 0.0
        };
    }

    updatePillInputs() {
        const getNumberValue = CalculatorUtils.getNumberValue;
        
        const pillBonusCurio = getNumberValue('pill-bonus-curio');
        const pillBonusImmortalFriends = getNumberValue('pill-bonus-immortal-friends');
        const pillBonusTechnique = getNumberValue('pill-bonus-technique');
        const pillBonus = 1 + ((pillBonusCurio + pillBonusImmortalFriends + pillBonusTechnique) / PERCENTAGE_COMPLETE);
        
        return {
            pillBonusNirvanaChariotMansion: getNumberValue('pill-nirvana-chariot-mansion'),
            pillBonusNirvanaGhostMansion: getNumberValue('pill-nirvana-ghost-mansion'),
            pillBonusNirvanaTurtleBeakMansion: getNumberValue('pill-nirvana-turtle-beak-mansion'),
            pillBonusGlittedLotusThrone: getNumberValue('pill-glitted-lotus-throne'),
            pillBonusGlittedLotusSeed: getNumberValue('pill-glitted-lotus-seed'),
            pillBonusCurio,
            pillBonusImmortalFriends,
            pillBonusTechnique,
            pillBonus,
            goldPill: getNumberValue('gold-pill'),
            purplePill: getNumberValue('purple-pill'),
            bluePill: getNumberValue('blue-pill'),
            elixir: getNumberValue('elixir'),
            elixirConsumed: getNumberValue('elixir-consumed'),
            benediction: getNumberValue('benediction'),
            benedictionConsumed: getNumberValue('benediction-consumed'),
            currentRedPills: getNumberValue('current-red-pills')
        };
    }

    updateAbodeInputs() {
        const getNumberValue = CalculatorUtils.getNumberValue;
        const getStringValue = CalculatorUtils.getStringValue;

        return {
            abodeEasyMode: getStringValue('abode-easy-mode') === 'Yes',
            abodeAuraEasyValue: getNumberValue('abode-aura-easy'),
            absorptionEasyValue: getNumberValue('absorption-easy'),
            absorptionBonusMonsterScape: getNumberValue('absorption-monsterscape'),
            abodeBonusCurio: getNumberValue('abode-aura-curio'),
            abodeBonusTechnique: getNumberValue('abode-aura-technique'),
            abodeBonusSectLevel: getNumberValue('abode-sect-level'),
            abodeBonusSectBarrier: getNumberValue('abode-sect-barrier'),
            abodeBonusCelestialSpring: getNumberValue('abode-celestial-spring'),
            abodeBonusEnergyArray: getNumberValue('abode-energy-array'),
            abodeBonusSwordArray: getNumberValue('abode-sword-array'),
            abodeBonusHeavenGate: getNumberValue('abode-heaven-gate'),
            abodeBonusWholenessCitta: getNumberValue('abode-wholeness-citta'),
            abodeBonusPerfectionWorldRift: getNumberValue('abode-perfection-world-rift'),
            abodeBonusNirvanaPathofAscension: getNumberValue('abode-nirvana-path-of-ascension'),
            abodeBonusNirvanaHornMansion: getNumberValue('abode-nirvana-horn-mansion'),
            abodeBonusNirvanaNeckMansion: getNumberValue('abode-nirvana-neck-mansion'),
            abodeBonusMiniWorld: getNumberValue('abode-mini-world'),
            abodeBonusFiveAsthenia: getNumberValue('abode-five-asthenia'),
            // Neither of these is an Abode Aura bonus, so easy mode's typed-in
            // Abode Aura total does not subsume them. Auraseep multiplies the
            // aura gem's share; Wisdom Confluence takes a cut of the Abode Aura
            // XP for the secondary path. The element id still says "temper aura"
            // because saved data is keyed by it.
            abodeTemperAuraCurio: getNumberValue('abode-temper-aura-curio'),
            wisdomConfluenceCurio: getNumberValue('wisdom-confluence-curio'),
            baseAbodeAura: GameConstants.abodeBase
        };
    }

    updateRespiraInputs() {
        const getNumberValue = CalculatorUtils.getNumberValue;
        const getIntegerValue = CalculatorUtils.getIntegerValue;
        
        const respiraAttemptsImmortalFriend = getIntegerValue('respira-attempt-immortal-friends');
        const respiraAttemptsTechnique = getIntegerValue('respira-attempt-technique');
        const respiraAttemptsCurio = getIntegerValue('respira-attempt-curio');
        const respiraAttemptsTotal = BASE_RESPIRA_ATTEMPTS + respiraAttemptsImmortalFriend + respiraAttemptsCurio + respiraAttemptsTechnique;
        
        const respiraBonusImmortalFriend = getNumberValue('respira-bonus-immortal-friends');
        const respiraBonusTechnique = getNumberValue('respira-bonus-technique');
        const respiraBonusCurio = getNumberValue('respira-bonus-curio');
        const respiraBonusTotal = 1 + ((respiraBonusCurio + respiraBonusImmortalFriend + respiraBonusTechnique) / PERCENTAGE_COMPLETE);
        
        return {
            respiraAttemptsImmortalFriend,
            respiraAttemptsTechnique,
            respiraAttemptsCurio,
            respiraAttemptsTotal,
            respiraBonusImmortalFriend,
            respiraBonusTechnique,
            respiraBonusCurio,
            respiraBonusTotal,
            // Nirvana Dipper Mansion is a Respira bonus, not an Abode Aura one, so it
            // is read here (and applied) regardless of the Abode Aura easy mode.
            respiraNirvanaDipperMansion: getNumberValue('respira-nirvana-dipper-mansion')
        };
    }

    updateArtifactInputs() {
        const getStringValue = CalculatorUtils.getStringValue;
        
        return {
            vaseStars: getStringValue('vase-stars'),
            vaseSkin: getStringValue('vase-skin'),
            mirrorStars: getStringValue('mirror-stars'),
            mirrorSkin: getStringValue('mirror-skin'),
            tokenStars: getStringValue('token-stars'),
            tokenSkin: getStringValue('token-skin'),
            pearlStars: getStringValue('pearl-stars')
        };
    }

    updateOtherInputs() {
        const getIntegerValue = CalculatorUtils.getIntegerValue;
        const getStringValue = CalculatorUtils.getStringValue;
        const getNumberValue = CalculatorUtils.getNumberValue;
        
        return {
            fruitsCount: getIntegerValue('fruits-count'),
            weeklyFruits: getIntegerValue('weekly-fruits'),
            fruitsUsage: getStringValue('fruits-usage'),
            tokensCount: getIntegerValue('tokens-count'),
            weeklyTokens: getIntegerValue('weekly-tokens'),
            useTokens: CalculatorUtils.getRadioValue('use-tokens') === 'Yes',
            extractorQualityLevel: getIntegerValue('extractor-quality'),
            extractorXPLevel: getIntegerValue('extractor-experience'),
            extractorGushLevel: getIntegerValue('extractor-gush'),
            extractorRank: getStringValue('extractor-rank'),
            gemQuality: getStringValue('gem-quality'),
			timegate: getNumberValue('timegate-days')
        };
    }
    // End of old method - helper methods below

    calculateAll() {
        this.updateFromInputs();
    
        
        const viryaInfo = this.calculateViryaInfo();
        const { mainPathAbsorptionBonus, secondaryPathAbsorptionBonus } = this.calculatePathAbsorptionBonuses(viryaInfo);
        // Calculate and store cosmoapsisValue using the correct main path absorption bonus (includes "had Virya last realm" bonus)
        this.playerData.cosmoapsisValue = XPCalculator.calculateCosmoapsisValue(this.playerData, mainPathAbsorptionBonus);
        const { mainPathDailyXPBase, secondaryPathDailyXPBase, mainPathDailyXP, secondaryPathDailyXP, wisdomConfluenceXP } =
            this.calculatePathDailyXP(mainPathAbsorptionBonus, secondaryPathAbsorptionBonus);
        // Update dailyXP to use the correct main path absorption bonus (includes "had Virya last realm" bonus)
        this.playerData.dailyXP = mainPathDailyXPBase;
        const { scenarioXPNeeded, scenarioFruitResults, nextScenario } = 
            this.calculateScenarioAnalysis(viryaInfo, mainPathDailyXPBase, this.playerData.dailyXP);
        // Player Time to Cultivate uses focus-dependent values (mainPathDailyXP, secondaryPathDailyXP)
        const realmProgression = RealmCalculator.calculateProgression(this.playerData, mainPathDailyXP, secondaryPathDailyXP);
        // Independent of the progression: fruits are counted to the end of the
        // current timegate, not to any path's breakthrough.
        const fruitData = this.calculateFruitData();
        const scenarioComparisons = this.calculateScenarioComparisons(mainPathDailyXPBase, secondaryPathDailyXPBase);

        this.calculationResults = this.assembleResults(
            viryaInfo, fruitData, mainPathDailyXPBase, secondaryPathDailyXPBase,
            realmProgression, scenarioXPNeeded, scenarioFruitResults, nextScenario, scenarioComparisons,
            mainPathAbsorptionBonus, wisdomConfluenceXP
        );
        
        
        return this.calculationResults;
    }

    calculateViryaInfo() {
        const viryaInfo = ViryaCalculator.detectScenario(this.playerData);
        this.playerData.viryaScenario = viryaInfo.scenario;
        this.playerData.viryaAbsorptionBonus = viryaInfo.absorptionBonus;
        // Calculate and store totalAbodeBonus and totalAbode for debugging
        this.playerData.totalAbodeBonus = XPCalculator.calculateTotalAbodeBonus(this.playerData);
        this.playerData.totalAbode = XPCalculator.calculateTotalAbode(this.playerData);
        // Note: dailyXP will be updated later in calculateAll() with the correct mainPathAbsorptionBonus
        return viryaInfo;
    }

    /**
     * The absorption bonus each path gets right now.
     *
     * While a tier is held it applies to both paths. Once the player has broken
     * through, the tier they held last realm may still be helping, but only for
     * as many minor stages as that tier carries, and each path is at its own
     * stage.
     */
    calculatePathAbsorptionBonuses(viryaInfo) {
        if (viryaInfo.scenario !== SCENARIO_NO_VIRYA) {
            return {
                mainPathAbsorptionBonus: viryaInfo.absorptionBonus,
                secondaryPathAbsorptionBonus: viryaInfo.absorptionBonus
            };
        }

        const carriedTier = ViryaRules.tierFromHadViryaOption(this.playerData.hadViryaLastRealm);

        return {
            mainPathAbsorptionBonus: ViryaRules.carriedBonusAt(carriedTier, this.playerData.mainPathRealmMinor),
            secondaryPathAbsorptionBonus: ViryaRules.carriedBonusAt(carriedTier, this.playerData.secondaryPathRealmMinor)
        };
    }

    /**
     * How far ahead fruits are counted: up to the last day of the current
     * timegate, not to any path's breakthrough.
     *
     * Fruits are worth 1.5x while a timegate is running, so the last useful
     * moment to eat them is the day before it expires - a fruit that arrives
     * after that is worth a third less. A 41 day timegate therefore looks 40
     * days ahead.
     *
     * This also has to be a single horizon shared by every row. It used to be
     * each path's own time to breakthrough, which made the count depend on path
     * focus: the unfocused path receives only its path-specific pill, so its
     * breakthrough is years away, and it was credited with years of weekly
     * payouts. The same player saw 150 fruits on main path focus and 3720 on
     * secondary, and the "days saved" headline moved by 25x with it.
     */
    fruitHorizonDays() {
        const timegateDays = this.playerData.timegateDays || 0;
        return Math.max(0, timegateDays - 1);
    }

    /**
     * Fruit XP over that horizon: what the player will hold when the timegate
     * lifts, valued at their current extractor and at a maxed one.
     *
     * The count is what they will have accrued by then, not what they hold
     * today, and it does not model the fruits being spent along the way.
     */
    calculateFruitData() {
        const fruitXPSingle = FruitCalculator.fruitXP(this.playerData);
        const fruitXPSingleMax = Recommendations.calculateMaxLevelXP(this.playerData, MAX_EXTRACTOR_LEVEL).fruitXPSingle;

        const horizonDays = this.fruitHorizonDays();
        const fruits = FruitCalculator.projectedFruits(this.playerData, horizonDays);

        return {
            fruitXPSingle,
            fruitXPSingleMax,
            fruitXPTotal: fruitXPSingle * fruits,
            fruitXPTotalMax: fruitXPSingleMax * fruits,
            projectedFruits: fruits,
            projectedTokens: this.playerData.useTokens
                ? FruitCalculator.projectedTokens(this.playerData, horizonDays)
                : 0,
            horizonDays
        };
    }

    calculatePathDailyXP(mainPathAbsorptionBonus, secondaryPathAbsorptionBonus) {
        // Calculate focus XP (full daily XP excluding elixir/benediction)
        const mainPathFocusXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(this.playerData, mainPathAbsorptionBonus);
        
        // Calculate path-specific XP sources
        const pillBonus = this.playerData.pillBonus || 1;
        const multiplier = pillBonus * 1000;
        const elixirXP = XPCalculator.calculateElixirXPWithEfficiency(this.playerData, this.playerData.elixir || 0);
        const elixirXPWithMultiplier = elixirXP * multiplier;
        
        // Calculate base values (for analytics/Virya table) - full XP including path-specific sources
        const mainPathDailyXPBase = mainPathFocusXP + elixirXPWithMultiplier;
        
        // Calculate secondary path focus XP, benediction and Wisdom Confluence
        let secondaryPathFocusXP = 0;
        let benedictionXPWithMultiplier = 0;
        let wisdomConfluenceXP = 0;
        let secondaryPathDailyXPBase = 0;

        // Rates come from the main path's realm even when the XP lands on the
        // secondary path, so this is the same state, differing only in the
        // absorption bonus each path currently gets. The two paths' totals
        // therefore differ by exactly one thing: elixir vs benediction.
        const secondaryPathPlayerData = Progression.asPathPlayerData(this.playerData, 'secondary');
        if (secondaryPathPlayerData) {
            // Calculate focus XP for secondary path (excluding benediction)
            secondaryPathFocusXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, secondaryPathAbsorptionBonus);
            // Calculate benediction XP (path-specific for secondary)
            const benedictionXP = XPCalculator.calculateBenedictionXPWithEfficiency(secondaryPathPlayerData, this.playerData.benediction || 0);
            benedictionXPWithMultiplier = benedictionXP * multiplier;
            // Wisdom Confluence pays a share of the day's abode XP into the
            // secondary path. Like benediction it is path-specific, so it is
            // added here rather than inside the daily total - and unlike the
            // focus XP it is earned whichever path the player is focusing.
            wisdomConfluenceXP = XPCalculator.calculateWisdomConfluenceXP(secondaryPathPlayerData, secondaryPathAbsorptionBonus);
            // Calculate base value (for analytics/Virya table) - full XP including benediction
            secondaryPathDailyXPBase = secondaryPathFocusXP + benedictionXPWithMultiplier + wisdomConfluenceXP;
        }
        
        // Calculate focus-dependent values (for Player Time to Cultivate)
        let mainPathDailyXP = 0;
        let secondaryPathDailyXP = 0;
        
        
        if (this.playerData.pathFocus === PATH_MAIN) {
            // Main path focused: gets focus XP + path-specific (elixir)
            mainPathDailyXP = mainPathFocusXP + elixirXPWithMultiplier;
            // Secondary path not focused: only gets path-specific (benediction,
            // Wisdom Confluence)
            secondaryPathDailyXP = benedictionXPWithMultiplier + wisdomConfluenceXP;
        } else {
            // Main path not focused: only gets path-specific (elixir)
            mainPathDailyXP = elixirXPWithMultiplier;
            // Secondary path focused: gets focus XP + path-specific (benediction,
            // Wisdom Confluence)
            secondaryPathDailyXP = secondaryPathFocusXP + benedictionXPWithMultiplier + wisdomConfluenceXP;
        }

        return { mainPathDailyXPBase, secondaryPathDailyXPBase, mainPathDailyXP, secondaryPathDailyXP, wisdomConfluenceXP };
    }

    calculateScenarioAnalysis(viryaInfo, mainPathDailyXPBase, dailyXP) {
        const scenarioXPNeeded = {};
        const scenarioFruitResults = {};
        const currentIndex = VIRYA_SCENARIO_ORDER.indexOf(viryaInfo.scenario);
        
        for (let i = currentIndex; i < VIRYA_SCENARIO_ORDER.length; i++) {
            const scenario = VIRYA_SCENARIO_ORDER[i];
            if (scenario === SCENARIO_NO_VIRYA) continue;
            
            const dailyXPForScenario = (scenario === SCENARIO_COMPLETION) ? mainPathDailyXPBase : dailyXP;
            const scenarioInfo = ViryaCalculator.calculateDaysToScenario(scenario, this.playerData, dailyXPForScenario, dailyXPForScenario);
            scenarioXPNeeded[scenario] = scenarioInfo.xpNeeded;
            
            // Each scenario is reached on its own timeline, so it gets its own
            // count of accumulated fruits rather than today's stock.
            const projectedFruits = FruitCalculator.projectedFruits(this.playerData, scenarioInfo.daysNeeded);

            if (projectedFruits > 0 && scenarioInfo.xpNeeded > 0 && isFinite(scenarioInfo.xpNeeded)) {
                const projectedPlayerData = { ...this.playerData, fruitsCount: projectedFruits };
                const fruitResult = Recommendations.findMinLevelsFruitFromCurrent(projectedPlayerData, scenarioInfo.xpNeeded, MAX_EXTRACTOR_LEVEL);
                scenarioFruitResults[scenario] = { ...fruitResult, projectedFruits, horizonDays: scenarioInfo.daysNeeded };
            }
        }
        
        const nextScenario = currentIndex < VIRYA_SCENARIO_ORDER.length - 1 ? VIRYA_SCENARIO_ORDER[currentIndex + 1] : null;
        return { scenarioXPNeeded, scenarioFruitResults, nextScenario };
    }

    calculateScenarioComparisons(mainPathDailyXPBase, secondaryPathDailyXPBase) {
        const scenarioComparisons = {};
        const comparisonScenarios = [SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
        const comparator = new ViryaScenarioComparator(this.playerData, this.playerData.dailyXP, 'default', mainPathDailyXPBase, secondaryPathDailyXPBase);
        
        for (const targetScenario of comparisonScenarios) {
            try {
                const comparison = comparator.compareScenarios(SCENARIO_COMPLETION, targetScenario);
                scenarioComparisons[targetScenario] = comparison;
            } catch (error) {
                console.error(`Error comparing Completion vs ${targetScenario}:`, error);
            }
        }
        
        return scenarioComparisons;
    }

    assembleResults(viryaInfo, fruitData, mainPathDailyXPBase, secondaryPathDailyXPBase, realmProgression, scenarioXPNeeded, scenarioFruitResults, nextScenario, scenarioComparisons, mainPathAbsorptionBonus, wisdomConfluenceXP = 0) {
        return {
            dailyXP: this.playerData.dailyXP,
            mainPathDailyXPBase,
            secondaryPathDailyXPBase,
            wisdomConfluenceXP,
            mainPathAbsorptionBonus,
            realmProgression,
            fruitXPSingle: fruitData.fruitXPSingle,
            fruitXPSingleMax: fruitData.fruitXPSingleMax,
            fruitXPTotal: fruitData.fruitXPTotal,
            fruitXPTotalMax: fruitData.fruitXPTotalMax,
            fruitProjection: fruitData,
            virya: viryaInfo,
            scenarioXPNeeded,
            nextScenario,
            scenarioFruitResults,
            scenarioComparisons,
            fruitResult: scenarioFruitResults[nextScenario] || null,
            recommendedFruits: scenarioFruitResults[nextScenario] ? scenarioFruitResults[nextScenario].recommendedSolution : null
        };
    }

    loadSavedData() {
        return this.dataManager.loadFromLocalStorage();
    }

    saveToLocalStorage() {
        return this.dataManager.saveToLocalStorage();
    }

    clearLocalStorage() {
        return this.dataManager.clearLocalStorage();
    }

    exportData() {
        return this.dataManager.exportData();
    }

    importData(jsonString) {
        return this.dataManager.importData(jsonString);
    }

    getPlayerData() {
        return this.playerData;
    }

    getResults() {
        return this.calculationResults;
    }

    toggleDebug() {
        this.debugEnabled = !this.debugEnabled;
        return this.debugEnabled;
    }
}

export { OvermortalCalculator };