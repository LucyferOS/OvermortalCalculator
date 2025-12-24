import { XPData, GameConstants, Realms } from './gameData.js';
import { CalculatorUtils } from './utils.js';

class XPCalculator {
    static calculateDailyXPWithAbsorptionBonus(playerData, absorptionBonus = 0) {
        const abodeAuraXP = this.calculateAbodeAuraXP(playerData, absorptionBonus);
        const gemBonusXP = abodeAuraXP * GameConstants.gemQuality[playerData.gemQuality];
        const pillXP = this.calculatePillXP(playerData);
        const respiraXP = this.calculateRespiraXP(playerData);
        
        return abodeAuraXP + gemBonusXP + pillXP + respiraXP;
    }

    static calculateAbodeAuraXP(playerData, absorptionBonus = 0) {
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
        
        const baseAuraXP = playerData.cosmoapsis * (1 + (totalAbodeBonus / 100)) * effectiveAbsorption;
        const dailyAuraXP = baseAuraXP * 10800;
        
        return dailyAuraXP;
    }

    static calculatePillXP(playerData) {
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        const goldPillXP = realmXP.gold 
            * (1 + (playerData.pillBonusNirvanaChariotMansion / 100)) 
            * playerData.goldPill;
        
        const purplePillXP = realmXP.purple 
            * (1 + (playerData.pillBonusNirvanaTurtleBeakMansion / 100)) 
            * playerData.purplePill;
        
        const bluePillXP = realmXP.blue 
            * (1 + (playerData.pillBonusNirvanaGhostMansion / 100)) 
            * playerData.bluePill;
        
        const elixirXP = realmXP.elixer * playerData.elixir;
        
        const numRedPills = this.calculateRedPills(playerData);
        const redPillXP = realmXP.red * (1 + GameConstants.vaseBonus[playerData.vaseStars]) * numRedPills;
        
        const basePillXP = goldPillXP + purplePillXP + bluePillXP + elixirXP + redPillXP;
        return basePillXP * playerData.pillBonus * 1000;
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
        const probabilities = [0.55, 0.30, 0.1475, 0.0025];
        const multipliers = [1, 2, 5, 10];
        
        let expectedGushValue = 0;
        for (let i = 0; i < probabilities.length; i++) {
            expectedGushValue += probabilities[i] * multipliers[i];
        }
        
        const respiraAttemptsGush = playerData.respiraAttemptsTotal * expectedGushValue;
        const realmRespiraXP = XPData[playerData.mainPathRealmMajor + "XP"].respira;
        
        const baseRespiraXP = respiraAttemptsGush * realmRespiraXP * 1000;
        return baseRespiraXP * playerData.respiraBonusTotal;
    }
}

export { XPCalculator };