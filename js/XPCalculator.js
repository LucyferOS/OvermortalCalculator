import { XPData, GameConstants, Realms } from './gameData.js';
import { CalculatorUtils } from './utils.js';

class XPCalculator {
    static calculateDailyXPWithAbsorptionBonus(playerData, absorptionBonus) {
        console.group('🧮 XPCalculator.calculateDailyXPWithAbsorptionBonus');
        console.log('Input:', { absorptionBonus, mainRealm: playerData.mainPathRealm });
        
        const abodeAuraXP = this.calculateAbodeAuraXP(playerData, absorptionBonus);
        console.log('Abode Aura XP:', abodeAuraXP);
        
        const gemBonusXP = abodeAuraXP * GameConstants.gemQuality[playerData.gemQuality];
		console.log(GameConstants.gemQuality[playerData.gemQuality]);
        console.log('Gem Bonus XP:', gemBonusXP);
        
        const pillXP = this.calculatePillXP(playerData);
        console.log('Pill XP:', pillXP);
        
        const respiraXP = this.calculateRespiraXP(playerData);
        console.log('Respira XP:', respiraXP);
        
        const total = abodeAuraXP + gemBonusXP + pillXP + respiraXP;
        console.log('Total Daily XP:', total);
        console.groupEnd();
		
        return total;
    }

    static calculateAbodeAuraXP(playerData, absorptionBonus) {
        const abodeBonuses = [
            playerData.abodeBonusCurio, playerData.abodeBonusTechnique, playerData.abodeBonusSectLevel,
            playerData.abodeBonusSectBarrier, playerData.abodeBonusCelestialSpring, playerData.abodeBonusEnergyArray,
            playerData.abodeBonusSwordArray, playerData.abodeBonusHeavenGate, playerData.abodeBonusWholenessCitta,
            playerData.abodeBonusPerfectionWorldRift, playerData.abodeBonusNirvanaPathofAscension,
            playerData.abodeBonusNirvanaHornMansion, playerData.abodeBonusNirvanaNeckMansion
        ];
        
        const totalAbodeBonus = abodeBonuses.reduce((sum, bonus) => sum + bonus, 0);
        
        const baseAbsorption = Realms[playerData.mainPathRealm]?.absorption || 0;
        const effectiveAbsorption = baseAbsorption + absorptionBonus;
        
        playerData.cosmoapsis = playerData.cosmoapsis * (1 + (totalAbodeBonus / 100)) * effectiveAbsorption;
		console.log('comsoapsis:', playerData.cosmoapsis);
        const dailyAuraXP = playerData.cosmoapsis * 10800;
        console.log('dailyAuraXP:', dailyAuraXP);
        return dailyAuraXP;
    }

    static calculatePillXP(playerData) {
        console.group('💊 XPCalculator.calculatePillXP');
        
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        console.log('Realm XP Values:', realmXP);
        
        const goldPillXP = realmXP.gold 
            * (1 + (playerData.pillBonusNirvanaChariotMansion / 100)) 
            * playerData.goldPill;
        console.log('Gold Pill XP:', goldPillXP);
        
        const purplePillXP = realmXP.purple 
            * (1 + (playerData.pillBonusNirvanaTurtleBeakMansion / 100)) 
            * playerData.purplePill;
        console.log('Purple Pill XP:', purplePillXP);
        
        const bluePillXP = realmXP.blue 
            * (1 + (playerData.pillBonusNirvanaGhostMansion / 100)) 
            * playerData.bluePill;
        console.log('Blue Pill XP:', bluePillXP);
        
        const elixirXP = realmXP.elixer * playerData.elixir;
        console.log('Elixir XP:', elixirXP);
        
        const numRedPills = this.calculateRedPills(playerData);
        console.log('Red Pills Count:', numRedPills);
        
        const redPillXP = realmXP.red * (1 + GameConstants.vaseBonus[playerData.vaseStars]) * numRedPills;
        console.log('Red Pill XP:', redPillXP);
        
        const basePillXP = goldPillXP + purplePillXP + bluePillXP + elixirXP + redPillXP;
        const totalPillXP = basePillXP * playerData.pillBonus * 1000;
        
        console.log('Total Pill XP:', totalPillXP);
        console.groupEnd();
        
        return totalPillXP;
    }

    static calculateRedPills(playerData) {
        const vaseRedPill = this.calculateVaseRedPill(playerData.vaseStars);
        const mirrorRedPill = this.calculateMirrorRedPill(playerData.mirrorStars);
        const tokenRedPill = this.calculateTokenRedPill(playerData.tokenStars);
        
        return vaseRedPill + mirrorRedPill + tokenRedPill;
    }

    static calculateVaseRedPill(stars) {
        if (stars === 'No artifact') return 0;
        const energy = GameConstants.artifactEnergyReplenishment[stars] * GameConstants.taoistYearsPerDay;
        return (energy + 100) / 100;
    }

    static calculateMirrorRedPill(stars) {
        if (stars === 'No artifact') return 0;
        const energy = GameConstants.artifactEnergyReplenishment[stars] * GameConstants.taoistYearsPerDay;
        const mirrorBonus = 1 - GameConstants.mirrorTokenBonus[stars];
        return (energy + 100) / (200 * mirrorBonus);
    }

    static calculateTokenRedPill(stars) {
        if (stars === 'No artifact') return 0;
        const energy = GameConstants.artifactEnergyReplenishment[stars] * GameConstants.taoistYearsPerDay;
        const tokenBonus = 1 - GameConstants.mirrorTokenBonus[stars];
        return ((energy + 100) / (200 * tokenBonus)) * 0.1225;
    }

    static calculateRespiraXP(playerData) {
        console.group('🌀 XPCalculator.calculateRespiraXP');
        
        const probabilities = [0.55, 0.30, 0.1475, 0.0025];
        const multipliers = [1, 2, 5, 10];
        
        let expectedGushValue = 0;
        for (let i = 0; i < probabilities.length; i++) {
            expectedGushValue += probabilities[i] * multipliers[i];
        }
        console.log('Expected Gush Value:', expectedGushValue);
        
        const respiraAttemptsGush = playerData.respiraAttemptsTotal * expectedGushValue;
        console.log('Respira Attempts Gush:', respiraAttemptsGush);
        
        const realmRespiraXP = XPData[playerData.mainPathRealmMajor + "XP"].respira;
        console.log('Realm Respira XP:', realmRespiraXP);
        
        const baseRespiraXP = respiraAttemptsGush * realmRespiraXP * 1000;
        const respiraExp = baseRespiraXP * playerData.respiraBonusTotal;
        
        console.log('Total Respira XP:', respiraExp);
        console.groupEnd();
        
        return respiraExp;
    }
}

export { XPCalculator };