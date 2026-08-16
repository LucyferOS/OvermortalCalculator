import { XPCalculator } 	from '../dashboard/XPCalculator.js';
import { RealmCalculator }	from '../dashboard/RealmCalculator.js';
import { ViryaCalculator }	from '../dashboard/ViryaCalculator.js';
import { Realms, GameConstants, PATH_MAIN, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, MAX_EXTRACTOR_LEVEL, PERCENTAGE_COMPLETE, BASE_RESPIRA_ATTEMPTS } from './gameData.js';
import { CalculatorUtils } 	from './utils.js';
import { DataManager } 		from './DataManager.js';
import { FruitCalculator } 	from '../dashboard/FruitCalculator.js'; 
import { Recommendations } 	from '../dashboard/Recommendations.js';
import { ViryaScenarioComparator } from '../dashboard/ViryaScenarioComparator.js';
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
            baseAbodeAura: 130.0,
            gemBonus: 'Common',
            gemQuality: 'Common',
            respiraAttemptsTotal: 10,
            respiraExp: 0,
            
            // Abode Aura / Absorption easy mode
            abodeEasyMode: false,
            abodeAuraEasyValue: 130.0,
            absorptionEasyValue: 0.317,

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
            abodeTemperAuraCurio: 0,
            
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
            pillBonusCurio: 0,
            pillBonusImmortalFriends: 0,
            pillBonusTechnique: 0,
            
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
            respiraBonusTotal
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
        const fruitData = this.calculateFruitData();
        const { mainPathDailyXPBase, secondaryPathDailyXPBase, mainPathDailyXP, secondaryPathDailyXP } = 
            this.calculatePathDailyXP(mainPathAbsorptionBonus, secondaryPathAbsorptionBonus);
        // Update dailyXP to use the correct main path absorption bonus (includes "had Virya last realm" bonus)
        this.playerData.dailyXP = mainPathDailyXPBase;
        const { scenarioXPNeeded, scenarioFruitResults, nextScenario } = 
            this.calculateScenarioAnalysis(viryaInfo, mainPathDailyXPBase, this.playerData.dailyXP);
        // Player Time to Cultivate uses focus-dependent values (mainPathDailyXP, secondaryPathDailyXP)
        const realmProgression = RealmCalculator.calculateProgression(this.playerData, mainPathDailyXP, secondaryPathDailyXP);
        const scenarioComparisons = this.calculateScenarioComparisons(mainPathDailyXPBase, secondaryPathDailyXPBase);
        
        this.calculationResults = this.assembleResults(
            viryaInfo, fruitData, mainPathDailyXPBase, secondaryPathDailyXPBase,
            realmProgression, scenarioXPNeeded, scenarioFruitResults, nextScenario, scenarioComparisons, mainPathAbsorptionBonus
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

    calculateFruitData() {
        const fruitXPSingle = FruitCalculator.fruitXP(this.playerData);
        const fruitXPTotal = fruitXPSingle * this.playerData['fruitsCount'];
        const maxExtractorResult = Recommendations.calculateMaxLevelXP(this.playerData, MAX_EXTRACTOR_LEVEL);
        const fruitXPTotalMax = maxExtractorResult.fruitXPTotal;
        
        return { fruitXPSingle, fruitXPTotal, fruitXPTotalMax };
    }

    /**
     * Daily XP for both paths.
     *
     * Two kinds of XP source, and the difference matters:
     *
     *   Focus XP     abode aura, gem, gold/purple/blue/red pills, respira,
     *                pearl. Arrives only for the path being cultivated.
     *   Consumables  elixirs for the main path, blessing pills for the
     *                secondary. Arrive whether or not that path is the focus,
     *                and never cross over to the other path.
     *
     * The *Base totals answer "what would this path earn if it were focused",
     * which is what the Virya table and analytics need in order to compare like
     * with like. The plain totals answer "what is this path earning right now",
     * which is what Player Time to Cultivate needs.
     */
    calculatePathDailyXP(mainPathAbsorptionBonus, secondaryPathAbsorptionBonus) {
        const player = this.playerData;
        const multiplier = XPCalculator.pillMultiplier(player);
        const secondaryState = Progression.asPathPlayerData(player, 'secondary');

        const elixirXP = XPCalculator.calculateElixirXPWithEfficiency(player, player.elixir || 0) * multiplier;
        const benedictionXP = secondaryState
            ? XPCalculator.calculateBenedictionXPWithEfficiency(secondaryState, player.benediction || 0) * multiplier
            : 0;

        const mainFocusXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            player, mainPathAbsorptionBonus, { consumable: 'none' }
        );
        const secondaryFocusXP = secondaryState
            ? XPCalculator.calculateDailyXPWithAbsorptionBonus(
                secondaryState, secondaryPathAbsorptionBonus, { consumable: 'none' })
            : 0;

        const focusIsMain = player.pathFocus === PATH_MAIN;

        return {
            mainPathDailyXPBase: mainFocusXP + elixirXP,
            secondaryPathDailyXPBase: secondaryFocusXP + benedictionXP,
            mainPathDailyXP: (focusIsMain ? mainFocusXP : 0) + elixirXP,
            secondaryPathDailyXP: (focusIsMain ? 0 : secondaryFocusXP) + benedictionXP
        };
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
            
            if (this.playerData.fruitsCount > 0 && scenarioInfo.xpNeeded > 0 && isFinite(scenarioInfo.xpNeeded)) {
                const fruitResult = Recommendations.findMinLevelsFruitFromCurrent(this.playerData, scenarioInfo.xpNeeded, MAX_EXTRACTOR_LEVEL);
                scenarioFruitResults[scenario] = fruitResult;
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

    assembleResults(viryaInfo, fruitData, mainPathDailyXPBase, secondaryPathDailyXPBase, realmProgression, scenarioXPNeeded, scenarioFruitResults, nextScenario, scenarioComparisons, mainPathAbsorptionBonus) {
        return {
            dailyXP: this.playerData.dailyXP,
            mainPathDailyXPBase,
            secondaryPathDailyXPBase,
            mainPathAbsorptionBonus,
            realmProgression,
            fruitXPSingle: fruitData.fruitXPSingle,
            fruitXPTotal: fruitData.fruitXPTotal,
            fruitXPTotalMax: fruitData.fruitXPTotalMax,
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