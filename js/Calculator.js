import { XPCalculator } 	from './XPCalculator.js';
import { RealmCalculator }	from './RealmCalculator.js';
import { ViryaCalculator }	from './ViryaCalculator.js';
import { Realms, XPData } 	from './gameData.js';
import { CalculatorUtils } 	from './utils.js';
import { DataManager } 		from './DataManager.js';
import { FruitCalculator } 	from './FruitCalculator.js'; 
import { recommendations } 	from './Recommendations.js';
import { RealmProgressionSimulator } from './RealmProgressionSimulator.js';
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
			pathFocus: 'Main Path',
            timegateDays: 30,
            vaseStars: '0 star',
            mirrorStars: '0 star',
            tokenStars: '0 star',
            goldPill: 0.0,
            purplePill: 0.0,
            bluePill: 20.0,
            elixir: 0.0,
            pillBonus: 0.0,
            fruitsCount: 0,
            weeklyFruits: 0,
            fruitsUsage: 'current',
            cosmoapsis: 130.0,
            gemBonus: 'Common',
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
            
            // Respira bonuses
            respiraAttemptsImmortalFriend: 0,
            respiraAttemptsTechnique: 0,
            respiraAttemptsCurio: 0,
            respiraBonusImmortalFriend: 0,
            respiraBonusTechnique: 0,
            respiraBonusCurio: 0,
            respiraBonusTotal: 1.0,
            
            // Pill bonuses
            pillBonusNirvanaChariotMansion: 0,
            pillBonusNirvanaGhostMansion: 0,
            pillBonusNirvanaTurtleBeakMansion: 0,
            pillBonusCurio: 0,
            pillBonusImmortalFriends: 0,
            pillBonusTechnique: 0
        };
    }

    updateFromInputs() {
        const getNumberValue = CalculatorUtils.getNumberValue;
        const getIntegerValue = CalculatorUtils.getIntegerValue;
        const getStringValue = CalculatorUtils.getStringValue;
        const splitRealmString = CalculatorUtils.splitRealmString;
        
        // Main Path
        const mainPathRealm = getStringValue('main-path-realm');
        const mainPathRealmParts = splitRealmString(mainPathRealm);
        const mainPathProgress = getNumberValue('main-path-progress');
        const mainPathExp = Realms[mainPathRealm]?.xp * (mainPathProgress / 100) || 0;
        
        // Secondary Path
        const secondaryPathRealm = getStringValue('secondary-path-realm');
        const secondaryPathRealmParts = splitRealmString(secondaryPathRealm);
        const secondaryPathProgress = getNumberValue('secondary-path-progress');
        const secondaryPathExp = Realms[secondaryPathRealm]?.xp * (secondaryPathProgress / 100) || 0;
        
        // Pill Bonuses
        const pillBonusCurio = getNumberValue('pill-bonus-curio');
        const pillBonusImmortalFriends = getNumberValue('pill-bonus-immortal-friends');
        const pillBonusTechnique = getNumberValue('pill-bonus-technique');
        const pillBonus = 1 + ((pillBonusCurio + pillBonusImmortalFriends + pillBonusTechnique) / 100);
        
        // Abode Bonuses
        const abodeBonusCurio = getNumberValue('abode-aura-curio');
        const abodeBonusTechnique = getNumberValue('abode-aura-technique');
        
        // Respira Attempts
        const respiraAttemptsImmortalFriend = getIntegerValue('respira-attempt-immortal-friends');
        const respiraAttemptsTechnique = getIntegerValue('respira-attempt-technique');
        const respiraAttemptsCurio = getIntegerValue('respira-attempt-curio');
        const respiraAttemptsTotal = 10 + respiraAttemptsImmortalFriend + respiraAttemptsCurio + respiraAttemptsTechnique;
        
        // Respira Bonuses
        const respiraBonusImmortalFriend = getNumberValue('respira-bonus-immortal-friends');
        const respiraBonusTechnique = getNumberValue('respira-bonus-technique');
        const respiraBonusCurio = getNumberValue('respira-bonus-curio');
        const respiraBonusTotal = 1 + ((respiraBonusCurio + respiraBonusImmortalFriend + respiraBonusTechnique) / 100);
        
        const abodeAuraXPTotal = 130;
        
		
		
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
            mirrorStars: getStringValue('mirror-stars'),
            tokenStars: getStringValue('token-stars'),
            
            // Pills and Elixirs
            goldPill: getNumberValue('gold-pill'),
            purplePill: getNumberValue('purple-pill'),
            bluePill: getNumberValue('blue-pill'),
            elixir: getNumberValue('elixir'),
            
            // Fruits
            fruitsCount: getIntegerValue('fruits-count'),
            weeklyFruits: getIntegerValue('weekly-fruits'),
            fruitsUsage: getStringValue('fruits-usage'),
			extractorQualityLevel:getIntegerValue('extractor-quality'),
			extractorXPLevel:getIntegerValue('extractor-experience'),
			extractorGushLevel:getIntegerValue('extractor-gush'),
			extractorRank:getStringValue('extractor-rank'),
            
            // Miscellaneous
            cosmoapsis: abodeAuraXPTotal,
            gemQuality: getStringValue('gem-quality'),
			timegate: getNumberValue('timegate-days')
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
            'Eminence': 0.2,
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
    
    if (this.debugEnabled) {
        console.clear();
        console.log('=== OVERMORTAL CALCULATOR DEBUG ===');
        console.log('Player Data:', this.playerData);
    }
    
    // Calculate daily XP with Virya bonus
    const viryaInfo = ViryaCalculator.detectScenario(this.playerData);
    this.playerData.viryaScenario = viryaInfo.scenario;
    this.playerData.viryaAbsorptionBonus = viryaInfo.absorptionBonus;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Calculator.js:269',message:'viryaInfo from detectScenario',data:{scenario:viryaInfo.scenario,absorptionBonus:viryaInfo.absorptionBonus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const dailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(this.playerData, viryaInfo.absorptionBonus);
    this.playerData.dailyXP = dailyXP;
    
    // Determine absorption bonus for realm progression calculations
    // Calculate separate absorption bonuses for main and secondary paths
    let mainPathAbsorptionBonus = viryaInfo.absorptionBonus;
    let secondaryPathAbsorptionBonus = viryaInfo.absorptionBonus;
    
    // If current scenario is "No Virya", check if "had Virya last realm" bonus is still active for each path
    if (viryaInfo.scenario === 'No Virya') {
        const hadViryaLastRealm = this.playerData.hadViryaLastRealm || 'No';
        const hadViryaBonus = OvermortalCalculator.getHadViryaAbsorptionBonus(hadViryaLastRealm);
        
        // Check if bonus is active for main path based on main path's minor realm
        const isMainPathBonusActive = OvermortalCalculator.isHadViryaBonusActive(hadViryaLastRealm, this.playerData.mainPathRealmMinor);
        if (isMainPathBonusActive && hadViryaBonus > 0) {
            mainPathAbsorptionBonus = hadViryaBonus;
            console.log(`Using "had Virya last realm" bonus (${hadViryaLastRealm}) for main path: ${hadViryaBonus * 100}%`);
        } else {
            mainPathAbsorptionBonus = 0;
            console.log(`"had Virya last realm" bonus (${hadViryaLastRealm}) is not active for main path (${this.playerData.mainPathRealmMinor})`);
        }
        
        // Check if bonus is active for secondary path based on secondary path's minor realm
        const isSecondaryPathBonusActive = OvermortalCalculator.isHadViryaBonusActive(hadViryaLastRealm, this.playerData.secondaryPathRealmMinor);
        if (isSecondaryPathBonusActive && hadViryaBonus > 0) {
            secondaryPathAbsorptionBonus = hadViryaBonus;
            console.log(`Using "had Virya last realm" bonus (${hadViryaLastRealm}) for secondary path: ${hadViryaBonus * 100}%`);
        } else {
            secondaryPathAbsorptionBonus = 0;
            console.log(`"had Virya last realm" bonus (${hadViryaLastRealm}) is not active for secondary path (${this.playerData.secondaryPathRealmMinor})`);
        }
    }
    // If current scenario is Eminence/Perfect/Half-Step, use current scenario bonus (already at late 100%, so previous realm bonus doesn't apply)
    // Both paths already have the correct bonus set above
    
    const fruitXPSingle = FruitCalculator.fruitXP(this.playerData);
    const fruitXPTotal = fruitXPSingle * this.playerData['fruitsCount'];
    
    // Calculate secondary path daily XP for Virya calculations
    let secondaryDailyXP = 0;
    if (this.playerData.pathFocus === 'Secondary Path') {
        secondaryDailyXP = dailyXP;
    }
    
    // Get XP needed for different Virya scenarios
    const scenarioOrder = ['No Virya', 'Completion', 'Eminence', 'Perfect', 'Half-Step'];
    const scenarioXPNeeded = {};
    const scenarioFruitResults = {};
    
    // Get the current scenario index
    const currentIndex = scenarioOrder.indexOf(viryaInfo.scenario);
    
	const scenarioComparisons = {};
    const comparator = new ViryaScenarioComparator(this.playerData, dailyXP);
    
    // Compare Completion (baseline) with other scenarios
    const comparisonScenarios = ['Eminence', 'Perfect', 'Half-Step'];
    for (const targetScenario of comparisonScenarios) {
        try {
            const comparison = comparator.compareScenarios('Completion', targetScenario);
            scenarioComparisons[targetScenario] = comparison;
        } catch (error) {
            console.error(`Error comparing Completion vs ${targetScenario}:`, error);
        }
    }
	
	
    console.log('\n=== VIRYA SCENARIO ANALYSIS ===');
    console.log('Current scenario:', viryaInfo.scenario, '(index:', currentIndex + ')');
    
    // Calculate fruit recommendations for ALL scenarios that come AFTER the current one
    for (let i = currentIndex; i < scenarioOrder.length; i++) {
        const scenario = scenarioOrder[i];
        
        // Skip "No Virya" scenario - it doesn't need fruits to reach
        if (scenario === 'No Virya') continue;
        
        // Calculate XP needed for this scenario
        const scenarioInfo = ViryaCalculator.calculateDaysToScenario(scenario, this.playerData, secondaryDailyXP);
        scenarioXPNeeded[scenario] = scenarioInfo.xpNeeded;
        
        console.log(`\n--- ${scenario} Scenario ---`);
        console.log('XP needed:', scenarioInfo.xpNeeded);
        console.log('Days needed:', scenarioInfo.daysNeeded);
        
        // Only calculate fruit recommendations if:
        // 1. Player has fruits
        // 2. XP needed is > 0 (not already achieved)
        // 3. XP needed is finite (can actually be reached)
        if (this.playerData.fruitsCount > 0 && 
            scenarioInfo.xpNeeded > 0 && 
            isFinite(scenarioInfo.xpNeeded)) {
            
            console.log(`Calculating fruit recommendations for ${scenario}...`);
            const fruitResult = recommendations.findMinLevelsFruitFromCurrent(this.playerData, scenarioInfo.xpNeeded, 30);
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
    
    // Determine next scenario for backward compatibility
    const nextScenario = currentIndex < scenarioOrder.length - 1 ? scenarioOrder[currentIndex + 1] : null;
    
    console.log('\n=== FRUIT CALCULATIONS ===');
    console.log('Fruit XP per fruit:', fruitXPSingle);
    console.log('Total Fruit XP (', this.playerData.fruitsCount, 'fruits):', fruitXPTotal);
    
    // Calculate separate daily XP values for main and secondary paths with their respective absorption bonuses
    // For main path: use main path realm and main path absorption bonus
    const mainPathDailyXPBase = XPCalculator.calculateDailyXPWithAbsorptionBonus(this.playerData, mainPathAbsorptionBonus);
    
    // For secondary path: create temporary player data with secondary path realm to get correct absorption
    // Only calculate if secondary path realm data is available and realm XP data exists
    let secondaryPathDailyXPBase = 0;
    if (this.playerData.secondaryPathRealm && this.playerData.secondaryPathRealmMajor) {
        // Check if realm XP data exists for this realm
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
    
    // Apply pathFocus: only the focused path gets daily XP
    let mainPathDailyXP = 0;
    let secondaryPathDailyXP = 0;
    
    if (this.playerData.pathFocus === 'Main Path') {
        mainPathDailyXP = mainPathDailyXPBase;
        secondaryPathDailyXP = 0;
    } else {
        mainPathDailyXP = 0;
        secondaryPathDailyXP = secondaryPathDailyXPBase;
    }
    
    console.log(`Main path daily XP (with ${mainPathAbsorptionBonus * 100}% bonus): ${mainPathDailyXP.toLocaleString()}`);
    console.log(`Secondary path daily XP (with ${secondaryPathAbsorptionBonus * 100}% bonus): ${secondaryPathDailyXP.toLocaleString()}`);
    
    // Calculate realm progression with separate daily XP values for each path
    const realmProgression = RealmCalculator.calculateProgression(this.playerData, mainPathDailyXP, secondaryPathDailyXP);
    
    // Calculate scenario comparisons (Completion as baseline)
    
    console.log('\n=== SCENARIO COMPARISONS (Completion as baseline) ===');
    for (const targetScenario of comparisonScenarios) {
        console.log(`\n--- Comparing Completion vs ${targetScenario} ---`);
        
        try {
            const comparison = recommendations.comparedScenarioToOverflow('Completion', targetScenario, this.playerData);
            
            if (comparison) {
                scenarioComparisons[targetScenario] = comparison;
                
                console.log(`Total XP by next timegate end:`);
                console.log(`- Completion: ${comparison.scenario1.totalXP.toLocaleString()}`);
                console.log(`- ${targetScenario}: ${comparison.scenario2.totalXP.toLocaleString()}`);
                console.log(`Better scenario: ${comparison.comparison.betterScenario}`);
                console.log(`Difference: ${comparison.comparison.difference.toLocaleString()} XP (${comparison.comparison.percentage})`);
                console.log(`Total days until next timegate: ${comparison.comparison.totalDaysUntilNextTimegateEnd}`);
            } else {
                console.log(`Comparison failed for ${targetScenario}`);
            }
        } catch (error) {
            console.error(`Error comparing Completion vs ${targetScenario}:`, error);
        }
    }
    
    this.calculationResults = {
        dailyXP,
        realmProgression,
        fruitXPSingle,
        fruitXPTotal,
        virya: viryaInfo,
        scenarioXPNeeded,
        nextScenario,
        // NEW: Store fruit results for ALL scenarios
        scenarioFruitResults: scenarioFruitResults,
        // NEW: Store scenario comparisons
        scenarioComparisons: scenarioComparisons,
        // For backward compatibility, also store the next scenario's fruit result
        fruitResult: scenarioFruitResults[nextScenario] || null,
        recommendedFruits: scenarioFruitResults[nextScenario] ? scenarioFruitResults[nextScenario].recommendedSolution : null
    };
    
    if (this.debugEnabled) {
        console.log('\n=== FINAL CALCULATION RESULTS ===');
        console.log('Calculation Results:', this.calculationResults);
        console.log('=== END DEBUG ===');
    }
    
    return this.calculationResults;
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