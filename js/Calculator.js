import { XPCalculator } 	from './XPCalculator.js';
import { RealmCalculator }	from './RealmCalculator.js';
import { ViryaCalculator }	from './ViryaCalculator.js';
import { Realms, XPData, GameConstants, PATH_MAIN, PATH_SECONDARY, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, MAX_EXTRACTOR_LEVEL, PERCENTAGE_COMPLETE, BASE_RESPIRA_ATTEMPTS } from './gameData.js';
import { CalculatorUtils } 	from './utils.js';
import { DataManager } 		from './DataManager.js';
import { FruitCalculator } 	from './FruitCalculator.js'; 
import { Recommendations } 	from './Recommendations.js';
import { ViryaScenarioComparator } from './ViryaScenarioComparator.js';


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
            dailyXP: 0.0,
			pathFocus: PATH_MAIN,
            timegateDays: 30,
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
            pillBonus: 0.0,
            fruitsCount: 0,
            weeklyFruits: 0,
            fruitsUsage: 'current',
            baseAbodeAura: 130.0,
            gemBonus: 'Common',
            gemQuality: 'Common',
            respiraAttemptsTotal: 10,
            respiraExp: 0,
            
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

    /**
     * Maps "had Virya last realm" value to absorption bonus
     * @param {string} hadViryaLastRealm - Value from "had-Virya" field ("No", "Eminence", "Perfection", "Halfstep")
     * @returns {number} Absorption bonus (0, 0.2, or 0.4)
     */
    static getHadViryaAbsorptionBonus(hadViryaLastRealm) {
        const bonusMap = {
            'No': 0,
            [SCENARIO_EMINENCE]: 0.2,
            'Perfection': 0.2,
            'Halfstep': 0.4
        };
        return bonusMap[hadViryaLastRealm] || 0;
    }

    /**
     * Determines if "had Virya last realm" bonus is still active based on current minor realm
     * @param {string} hadViryaLastRealm - Value from "had-Virya" field
     * @param {string} currentMinorRealm - Current minor realm ("Early", "Mid", or "Late")
     * @returns {boolean} True if bonus is still active, false otherwise
     */
    static isHadViryaBonusActive(hadViryaLastRealm, currentMinorRealm) {
        if (!hadViryaLastRealm || hadViryaLastRealm === 'No') {
            return false;
        }

        // Bonus expiration logic:
        // - Eminence: Expires at "Next Major Early" (active only in Early)
        // - Perfection: Expires at "Next Major Mid" (active in Early and Mid)
        // - Half-Step: Expires at start of "Next Major Late" (active in Early and Mid, expires at Late)
        switch (hadViryaLastRealm) {
            case 'Eminence':
                // Expires at Next Major Early - only active in Early
                return currentMinorRealm === 'Early';
            case 'Perfection':
                // Expires at Next Major Mid - active in Early and Mid
                return currentMinorRealm === 'Early' || currentMinorRealm === 'Mid';
            case 'Halfstep':
                // Expires at start of Next Major Late - active in Early and Mid, expires at Late
                return currentMinorRealm === 'Early' || currentMinorRealm === 'Mid';
            default:
                return false;
        }
    }

    updatePathInputs() {
        const getNumberValue = CalculatorUtils.getNumberValue;
        const getStringValue = CalculatorUtils.getStringValue;
        const splitRealmString = CalculatorUtils.splitRealmString;
        
        // Main Path
        const mainPathRealm = getStringValue('main-path-realm');
        const mainPathRealmParts = splitRealmString(mainPathRealm);
        const mainPathProgress = getNumberValue('main-path-progress');
        const mainPathExp = Realms[mainPathRealm]?.xp * (mainPathProgress / PERCENTAGE_COMPLETE) || 0;
        
        // Secondary Path
        const secondaryPathRealm = getStringValue('secondary-path-realm');
        const secondaryPathRealmParts = splitRealmString(secondaryPathRealm);
        const secondaryPathProgress = getNumberValue('secondary-path-progress');
        const secondaryPathExp = Realms[secondaryPathRealm]?.xp * (secondaryPathProgress / PERCENTAGE_COMPLETE) || 0;
        
        // Pill Bonuses
        const pillBonusCurio = getNumberValue('pill-bonus-curio');
        const pillBonusImmortalFriends = getNumberValue('pill-bonus-immortal-friends');
        const pillBonusTechnique = getNumberValue('pill-bonus-technique');
        const pillBonus = 1 + ((pillBonusCurio + pillBonusImmortalFriends + pillBonusTechnique) / PERCENTAGE_COMPLETE);
        
        // Abode Bonuses
        const abodeBonusCurio = getNumberValue('abode-aura-curio');
        const abodeBonusTechnique = getNumberValue('abode-aura-technique');
        
        // Respira Attempts
        const getIntegerValue = CalculatorUtils.getIntegerValue;
        const respiraAttemptsImmortalFriend = getIntegerValue('respira-attempt-immortal-friends');
        const respiraAttemptsTechnique = getIntegerValue('respira-attempt-technique');
        const respiraAttemptsCurio = getIntegerValue('respira-attempt-curio');
        const respiraAttemptsTotal = BASE_RESPIRA_ATTEMPTS + respiraAttemptsImmortalFriend + respiraAttemptsCurio + respiraAttemptsTechnique;
        
        // Respira Bonuses
        const respiraBonusImmortalFriend = getNumberValue('respira-bonus-immortal-friends');
        const respiraBonusTechnique = getNumberValue('respira-bonus-technique');
        const respiraBonusCurio = getNumberValue('respira-bonus-curio');
        const respiraBonusTotal = 1 + ((respiraBonusCurio + respiraBonusImmortalFriend + respiraBonusTechnique) / PERCENTAGE_COMPLETE);
        
        const abodeAuraXPTotal = GameConstants.abodeBase;
        
		
		
        this.playerData = {
            // Main Path
            mainPathRealm,
            mainPathRealmMajor: mainPathRealmParts.major,
            mainPathRealmMinor: mainPathRealmParts.minor,
            mainPathProgress,
            mainPathExp,
            
            // Secondary Path
            secondaryPathRealm,
            secondaryPathRealmMajor: secondaryPathRealmParts.major,
            secondaryPathRealmMinor: secondaryPathRealmParts.minor,
            secondaryPathProgress,
            secondaryPathExp,
            
            // Path Configuration
            pathFocus: getStringValue('path-focus'),
            timegateDays: getNumberValue('timegate-days'),
            hadViryaLastRealm: getStringValue('had-Virya'),
            
            // Abode Bonuses
            abodeBonusCurio,
            abodeBonusTechnique,
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
            
            // Respira Attempts
            respiraAttemptsImmortalFriend,
            respiraAttemptsTechnique,
            respiraAttemptsCurio,
            respiraAttemptsTotal,
            
            // Respira Bonuses
            respiraBonusImmortalFriend,
            respiraBonusTechnique,
            respiraBonusCurio,
            respiraBonusTotal,
            
            // Pill Bonuses
            pillBonusNirvanaChariotMansion: getNumberValue('pill-nirvana-chariot-mansion'),
            pillBonusNirvanaGhostMansion: getNumberValue('pill-nirvana-ghost-mansion'),
            pillBonusNirvanaTurtleBeakMansion: getNumberValue('pill-nirvana-turtle-beak-mansion'),
            pillBonusCurio,
            pillBonusImmortalFriends,
            pillBonusTechnique,
            pillBonus,
            
            // Stars
            vaseStars: getStringValue('vase-stars'),
            vaseSkin: getStringValue('vase-skin'),
            mirrorStars: getStringValue('mirror-stars'),
            mirrorSkin: getStringValue('mirror-skin'),
            tokenStars: getStringValue('token-stars'),
            tokenSkin: getStringValue('token-skin'),
            
            // Pills and Elixirs
            goldPill: getNumberValue('gold-pill'),
            purplePill: getNumberValue('purple-pill'),
            bluePill: getNumberValue('blue-pill'),
            elixir: getNumberValue('elixir'),
            elixirConsumed: getNumberValue('elixir-consumed'),
            benediction: getNumberValue('benediction'),
            benedictionConsumed: getNumberValue('benediction-consumed'),
            
            // Fruits
            fruitsCount: getIntegerValue('fruits-count'),
            weeklyFruits: getIntegerValue('weekly-fruits'),
            fruitsUsage: getStringValue('fruits-usage'),
			extractorQualityLevel:getIntegerValue('extractor-quality'),
			extractorXPLevel:getIntegerValue('extractor-experience'),
			extractorGushLevel:getIntegerValue('extractor-gush'),
			extractorRank:getStringValue('extractor-rank'),
            
            // Miscellaneous
            baseAbodeAura: abodeAuraXPTotal,
            gemQuality: getStringValue('gem-quality'),
			timegate: getNumberValue('timegate-days')
        };
    }

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
            hadViryaLastRealm: getStringValue('had-Virya')
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
            benedictionConsumed: getNumberValue('benediction-consumed')
        };
    }

    updateAbodeInputs() {
        const getNumberValue = CalculatorUtils.getNumberValue;
        
        return {
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

    /**
     * Maps "had Virya last realm" value to absorption bonus
     * @param {string} hadViryaLastRealm - Value from "had-Virya" field ("No", "Eminence", "Perfection", "Halfstep")
     * @returns {number} Absorption bonus (0, 0.2, or 0.4)
     */
    static getHadViryaAbsorptionBonus(hadViryaLastRealm) {
        const bonusMap = {
            'No': 0,
            [SCENARIO_EMINENCE]: 0.2,
            'Perfection': 0.2,
            'Halfstep': 0.4
        };
        return bonusMap[hadViryaLastRealm] || 0;
    }

    /**
     * Determines if "had Virya last realm" bonus is still active based on current minor realm
     * @param {string} hadViryaLastRealm - Value from "had-Virya" field
     * @param {string} currentMinorRealm - Current minor realm ("Early", "Mid", or "Late")
     * @returns {boolean} True if bonus is still active, false otherwise
     */
    static isHadViryaBonusActive(hadViryaLastRealm, currentMinorRealm) {
        if (!hadViryaLastRealm || hadViryaLastRealm === 'No') {
            return false;
        }

        // Bonus expiration logic:
        // - Eminence: Expires at "Next Major Early" (active only in Early)
        // - Perfection: Expires at "Next Major Mid" (active in Early and Mid)
        // - Half-Step: Expires at start of "Next Major Late" (active in Early and Mid, expires at Late)
        switch (hadViryaLastRealm) {
            case 'Eminence':
                // Expires at Next Major Early - only active in Early
                return currentMinorRealm === 'Early';
            case 'Perfection':
                // Expires at Next Major Mid - active in Early and Mid
                return currentMinorRealm === 'Early' || currentMinorRealm === 'Mid';
            case 'Halfstep':
                // Expires at start of Next Major Late - active in Early and Mid, expires at Late
                return currentMinorRealm === 'Early' || currentMinorRealm === 'Mid';
            default:
                return false;
        }
    }

    calculateAll() {
        this.updateFromInputs();
        this.logDebugStart();
        
        const viryaInfo = this.calculateViryaInfo();
        const { mainPathAbsorptionBonus, secondaryPathAbsorptionBonus } = this.calculatePathAbsorptionBonuses(viryaInfo);
        const fruitData = this.calculateFruitData();
        const { mainPathDailyXPBase, secondaryPathDailyXPBase, mainPathDailyXP, secondaryPathDailyXP } = 
            this.calculatePathDailyXP(mainPathAbsorptionBonus, secondaryPathAbsorptionBonus);
        const { scenarioXPNeeded, scenarioFruitResults, nextScenario } = 
            this.calculateScenarioAnalysis(viryaInfo, mainPathDailyXPBase, this.playerData.dailyXP);
        const realmProgression = RealmCalculator.calculateProgression(this.playerData, mainPathDailyXPBase, secondaryPathDailyXPBase);
        const scenarioComparisons = this.calculateScenarioComparisons(mainPathDailyXPBase, secondaryPathDailyXPBase);
        
        this.calculationResults = this.assembleResults(
            viryaInfo, fruitData, mainPathDailyXPBase, secondaryPathDailyXPBase,
            realmProgression, scenarioXPNeeded, scenarioFruitResults, nextScenario, scenarioComparisons
        );
        
        this.logDebugEnd();
        return this.calculationResults;
    }

    logDebugStart() {
        if (this.debugEnabled) {
            console.clear();
            console.log('=== OVERMORTAL CALCULATOR DEBUG ===');
            console.log('Player Data:', this.playerData);
        }
    }

    calculateViryaInfo() {
        const viryaInfo = ViryaCalculator.detectScenario(this.playerData);
        this.playerData.viryaScenario = viryaInfo.scenario;
        this.playerData.viryaAbsorptionBonus = viryaInfo.absorptionBonus;
        // Calculate and store cosmoapsisValue for debugging
        this.playerData.cosmoapsisValue = XPCalculator.calculateCosmoapsisValue(this.playerData, viryaInfo.absorptionBonus);
        this.playerData.dailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(this.playerData, viryaInfo.absorptionBonus);
        return viryaInfo;
    }

    calculatePathAbsorptionBonuses(viryaInfo) {
        let mainPathAbsorptionBonus = viryaInfo.absorptionBonus;
        let secondaryPathAbsorptionBonus = viryaInfo.absorptionBonus;
        
        if (viryaInfo.scenario === SCENARIO_NO_VIRYA) {
            const hadViryaLastRealm = this.playerData.hadViryaLastRealm || 'No';
            const hadViryaBonus = OvermortalCalculator.getHadViryaAbsorptionBonus(hadViryaLastRealm);
            
            const isMainPathBonusActive = OvermortalCalculator.isHadViryaBonusActive(hadViryaLastRealm, this.playerData.mainPathRealmMinor);
            if (isMainPathBonusActive && hadViryaBonus > 0) {
                mainPathAbsorptionBonus = hadViryaBonus;
                console.log(`Using "had Virya last realm" bonus (${hadViryaLastRealm}) for main path: ${hadViryaBonus * 100}%`);
            } else {
                mainPathAbsorptionBonus = 0;
                console.log(`"had Virya last realm" bonus (${hadViryaLastRealm}) is not active for main path (${this.playerData.mainPathRealmMinor})`);
            }
            
            const isSecondaryPathBonusActive = OvermortalCalculator.isHadViryaBonusActive(hadViryaLastRealm, this.playerData.secondaryPathRealmMinor);
            if (isSecondaryPathBonusActive && hadViryaBonus > 0) {
                secondaryPathAbsorptionBonus = hadViryaBonus;
                console.log(`Using "had Virya last realm" bonus (${hadViryaLastRealm}) for secondary path: ${hadViryaBonus * 100}%`);
            } else {
                secondaryPathAbsorptionBonus = 0;
                console.log(`"had Virya last realm" bonus (${hadViryaLastRealm}) is not active for secondary path (${this.playerData.secondaryPathRealmMinor})`);
            }
        }
        
        return { mainPathAbsorptionBonus, secondaryPathAbsorptionBonus };
    }

    calculateFruitData() {
        const fruitXPSingle = FruitCalculator.fruitXP(this.playerData);
        const fruitXPTotal = fruitXPSingle * this.playerData['fruitsCount'];
        const maxExtractorResult = Recommendations.calculateMaxLevelXP(this.playerData, MAX_EXTRACTOR_LEVEL);
        const fruitXPTotalMax = maxExtractorResult.fruitXPTotal;
        
        console.log('\n=== FRUIT CALCULATIONS ===');
        console.log('Fruit XP per fruit:', fruitXPSingle);
        console.log('Total Fruit XP (', this.playerData.fruitsCount, 'fruits):', fruitXPTotal);
        
        return { fruitXPSingle, fruitXPTotal, fruitXPTotalMax };
    }

    calculatePathDailyXP(mainPathAbsorptionBonus, secondaryPathAbsorptionBonus) {
        const mainPathDailyXPBase = XPCalculator.calculateDailyXPWithAbsorptionBonus(this.playerData, mainPathAbsorptionBonus);
        
        let secondaryPathDailyXPBase = 0;
        if (this.playerData.secondaryPathRealm && this.playerData.secondaryPathRealmMajor) {
            const realmXPKey = this.playerData.secondaryPathRealmMajor + "XP";
            if (XPData[realmXPKey]) {
                const secondaryPathPlayerData = {
                    ...this.playerData,
                    mainPathRealm: this.playerData.secondaryPathRealm,
                    mainPathRealmMajor: this.playerData.secondaryPathRealmMajor,
                    mainPathRealmMinor: this.playerData.secondaryPathRealmMinor
                };
                secondaryPathDailyXPBase = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, secondaryPathAbsorptionBonus);
            } else {
                console.warn(`Warning: Realm XP data not found for secondary path realm "${realmXPKey}" (realm: ${this.playerData.secondaryPathRealmMajor}), skipping secondary path daily XP calculation`);
            }
        }
        
        const mainPathDailyXP = this.playerData.pathFocus === PATH_MAIN ? mainPathDailyXPBase : 0;
        const secondaryPathDailyXP = this.playerData.pathFocus === PATH_MAIN ? 0 : secondaryPathDailyXPBase;
        
        console.log(`Main path daily XP (with ${mainPathAbsorptionBonus * 100}% bonus): ${mainPathDailyXP.toLocaleString()}`);
        console.log(`Secondary path daily XP (with ${secondaryPathAbsorptionBonus * 100}% bonus): ${secondaryPathDailyXP.toLocaleString()}`);
        
        return { mainPathDailyXPBase, secondaryPathDailyXPBase, mainPathDailyXP, secondaryPathDailyXP };
    }

    calculateScenarioAnalysis(viryaInfo, mainPathDailyXPBase, dailyXP) {
        const scenarioXPNeeded = {};
        const scenarioFruitResults = {};
        const currentIndex = VIRYA_SCENARIO_ORDER.indexOf(viryaInfo.scenario);
        
        console.log('\n=== VIRYA SCENARIO ANALYSIS ===');
        console.log('Current scenario:', viryaInfo.scenario, '(index:', currentIndex + ')');
        
        for (let i = currentIndex; i < VIRYA_SCENARIO_ORDER.length; i++) {
            const scenario = VIRYA_SCENARIO_ORDER[i];
            if (scenario === SCENARIO_NO_VIRYA) continue;
            
            const dailyXPForScenario = (scenario === SCENARIO_COMPLETION) ? mainPathDailyXPBase : dailyXP;
            const scenarioInfo = ViryaCalculator.calculateDaysToScenario(scenario, this.playerData, dailyXPForScenario, dailyXPForScenario);
            scenarioXPNeeded[scenario] = scenarioInfo.xpNeeded;
            
            console.log(`\n--- ${scenario} Scenario ---`);
            console.log('XP needed:', scenarioInfo.xpNeeded);
            console.log('Days needed:', scenarioInfo.daysNeeded);
            console.log('Required path focus:', scenarioInfo.requiredPathFocus);
            
            if (this.playerData.fruitsCount > 0 && scenarioInfo.xpNeeded > 0 && isFinite(scenarioInfo.xpNeeded)) {
                console.log(`Calculating fruit recommendations for ${scenario}...`);
                const fruitResult = Recommendations.findMinLevelsFruitFromCurrent(this.playerData, scenarioInfo.xpNeeded, MAX_EXTRACTOR_LEVEL);
                scenarioFruitResults[scenario] = fruitResult;
                
                if (fruitResult && fruitResult.recommendedSolution) {
                    console.log(`✅ ${scenario} fruit solution found!`);
                    console.log('Recommended levels:', fruitResult.recommendedSolution);
                    console.log('Efficiency:', fruitResult.comparison.singleXPPercentOfMax, 'of max XP');
                } else {
                    console.log(`❌ No fruit solution found for ${scenario}`);
                }
            } else {
                console.log(`Skipping fruit recommendations for ${scenario}:`);
                if (this.playerData.fruitsCount <= 0) console.log('- No fruits available');
                if (scenarioInfo.xpNeeded <= 0) console.log('- Already achieved or no XP needed');
                if (!isFinite(scenarioInfo.xpNeeded)) console.log('- XP needed is infinite (unreachable)');
            }
        }
        
        const nextScenario = currentIndex < VIRYA_SCENARIO_ORDER.length - 1 ? VIRYA_SCENARIO_ORDER[currentIndex + 1] : null;
        return { scenarioXPNeeded, scenarioFruitResults, nextScenario };
    }

    calculateScenarioComparisons(mainPathDailyXPBase, secondaryPathDailyXPBase) {
        const scenarioComparisons = {};
        const comparisonScenarios = [SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
        const comparator = new ViryaScenarioComparator(this.playerData, this.playerData.dailyXP, 'default', mainPathDailyXPBase, secondaryPathDailyXPBase);
        
        console.log('\n=== SCENARIO COMPARISONS (Completion as baseline) ===');
        for (const targetScenario of comparisonScenarios) {
            console.log(`\n--- Comparing Completion vs ${targetScenario} ---`);
            
            try {
                const comparison = comparator.compareScenarios(SCENARIO_COMPLETION, targetScenario);
                scenarioComparisons[targetScenario] = comparison;
                
                console.log(`Total XP by next timegate end:`);
                console.log(`- Completion: ${comparison.scenario1.totalXP.toLocaleString()}`);
                console.log(`- ${targetScenario}: ${comparison.scenario2.totalXP.toLocaleString()}`);
                console.log(`Better scenario: ${comparison.comparison.betterScenario}`);
                console.log(`Difference: ${comparison.comparison.difference.toLocaleString()} XP (${comparison.comparison.percentage})`);
                console.log(`Total days until next timegate: ${comparison.comparison.totalDaysUntilNextTimegateEnd}`);
            } catch (error) {
                console.error(`Error comparing Completion vs ${targetScenario}:`, error);
            }
        }
        
        return scenarioComparisons;
    }

    assembleResults(viryaInfo, fruitData, mainPathDailyXPBase, secondaryPathDailyXPBase, realmProgression, scenarioXPNeeded, scenarioFruitResults, nextScenario, scenarioComparisons) {
        return {
            dailyXP: this.playerData.dailyXP,
            mainPathDailyXPBase,
            secondaryPathDailyXPBase,
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

    logDebugEnd() {
        if (this.debugEnabled) {
            console.log('\n=== FINAL CALCULATION RESULTS ===');
            console.log('Calculation Results:', this.calculationResults);
            console.log('=== END DEBUG ===');
        }
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