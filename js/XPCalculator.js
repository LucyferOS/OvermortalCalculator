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
        
        // FIXED: Don't mutate playerData, use local variable
        const cosmoapsisValue = playerData.cosmoapsis * (1 + (totalAbodeBonus / 100)) * effectiveAbsorption;
		console.log('cosmoapsis:', cosmoapsisValue);
        const dailyAuraXP = cosmoapsisValue * 10800;
        console.log('dailyAuraXP:', dailyAuraXP);
        return dailyAuraXP;
    }

    static calculatePillXP(playerData) {
        console.group('💊 XPCalculator.calculatePillXP');
        
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        console.log('Realm XP Values:', realmXP);
        
        // Safety check: if realmXP is undefined, return 0
        if (!realmXP) {
            console.warn(`Warning: Realm XP data not found for key "${realmXPKey}" (realm: ${playerData.mainPathRealmMajor})`);
            console.groupEnd();
            return 0;
        }
        
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
        
        const elixirXP = this.calculateElixirXPWithEfficiency(playerData, playerData.elixir || 0);
        console.log('Elixir XP (with efficiency):', elixirXP);
        
        const benedictionXP = this.calculateBenedictionXPWithEfficiency(playerData, playerData.benediction || 0);
        console.log('Benediction XP (with efficiency):', benedictionXP);
        
        const numRedPills = this.calculateRedPills(playerData);
        console.log('Red Pills Count:', numRedPills);
        
        const redPillXP = realmXP.red * (1 + GameConstants.vaseBonus[playerData.vaseStars]) * numRedPills;
        console.log('Red Pill XP:', redPillXP);
        
        const basePillXP = goldPillXP + purplePillXP + bluePillXP + elixirXP + benedictionXP + redPillXP;
        const totalPillXP = basePillXP * playerData.pillBonus * 1000;
        
        console.log('Total Pill XP:', totalPillXP);
        console.groupEnd();
        
        return totalPillXP;
    }

    static calculateRedPills(playerData) {
        const vaseRedPill = this.calculateVaseRedPill(playerData.vaseStars, playerData.vaseSkin === 'Yes');
        const mirrorRedPill = this.calculateMirrorRedPill(playerData.mirrorStars, playerData.mirrorSkin === 'Yes');
        const tokenRedPill = this.calculateTokenRedPill(playerData.tokenStars, playerData.tokenSkin === 'Yes');
        
        return vaseRedPill + mirrorRedPill + tokenRedPill;
    }

    static calculateVaseRedPill(stars, hasSkin) {
        if (stars === 'No artifact') return 0;
        const energy = GameConstants.artifactEnergyReplenishment[stars] * GameConstants.taoistYearsPerDay;
        const baseResult = (energy + 100) / 100;
        // Vase skin adds 10% base XP
        return baseResult * (hasSkin ? 1.1 : 1.0);
    }

    static calculateMirrorRedPill(stars, hasSkin) {
        if (stars === 'No artifact') return 0;
        const energy = GameConstants.artifactEnergyReplenishment[stars] * GameConstants.taoistYearsPerDay;
        const mirrorBonus = 1 - GameConstants.mirrorTokenBonus[stars];
        // Mirror skin reduces cost by 10%, so multiply denominator by 0.9 (or divide result by 0.9)
        const costMultiplier = hasSkin ? 0.9 : 1.0;
        return (energy + 100) / (200 * mirrorBonus * costMultiplier);
    }

    static calculateTokenRedPill(stars, hasSkin) {
        if (stars === 'No artifact') return 0;
        const energy = GameConstants.artifactEnergyReplenishment[stars] * GameConstants.taoistYearsPerDay;
        const tokenBonus = 1 - GameConstants.mirrorTokenBonus[stars];
        // Token skin reduces cost by 10%, so multiply denominator by 0.9 (or divide result by 0.9)
        const costMultiplier = hasSkin ? 0.9 : 1.0;
        return ((energy + 100) / (200 * tokenBonus * costMultiplier)) * 0.1225;
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

    /**
     * Calculates XP from elixers with efficiency based on total consumed count.
     * Each elixir is calculated individually to account for efficiency tier changes.
     * @param {Object} playerData - Player data object
     * @param {number} dailyElixirCount - Number of elixers consumed per day
     * @returns {number} Total XP from all daily elixers with efficiency applied
     */
    static calculateElixirXPWithEfficiency(playerData, dailyElixirCount) {
        console.group('🧪 XPCalculator.calculateElixirXPWithEfficiency');
        
        // Get base elixir XP for the player's realm
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        if (!realmXP || !realmXP.elixer) {
            console.warn(`Warning: Elixir XP data not found for realm "${realmXPKey}"`);
            console.groupEnd();
            return 0;
        }
        
        const baseElixirXP = realmXP.elixer;
        const totalConsumed = playerData.elixirConsumed || 0;
        const efficiencyLevels = GameConstants.elixerData.elixerEfficiencyLevels;
        
        console.log('Base Elixir XP:', baseElixirXP);
        console.log('Total Consumed:', totalConsumed);
        console.log('Daily Elixir Count:', dailyElixirCount);
        
        let totalElixirXP = 0;
        
        // Calculate each elixir individually
        for (let i = 1; i <= dailyElixirCount; i++) {
            const cumulativeCount = totalConsumed + i;
            
            // Find the efficiency tier for this cumulative count
            // Tiers are ordered from highest to lowest efficiency
            // Each tier's elixerFalloffCumulative represents the upper bound (inclusive) for that tier
            // Tier ranges: 1-20 (150%), 21-60 (120%), 61-140 (100%), etc.
            let efficiencyPercent = 100.0; // Default to 100% if no tier found
            
            // Find the appropriate tier by checking which cumulative threshold the count falls into
            for (let j = 0; j < efficiencyLevels.length; j++) {
                const tier = efficiencyLevels[j];
                const previousTierCumulative = j === 0 ? 0 : efficiencyLevels[j - 1].elixerFalloffCumulative;
                
                // Check if this cumulative count falls within this tier's range
                // Range is (previousTierCumulative + 1) to tier.elixerFalloffCumulative (inclusive)
                if (cumulativeCount > previousTierCumulative && cumulativeCount <= tier.elixerFalloffCumulative) {
                    efficiencyPercent = tier.efficiencyPercent;
                    break;
                }
            }
            
            // If cumulative count exceeds all tiers, use the lowest efficiency (last tier)
            const lastTier = efficiencyLevels[efficiencyLevels.length - 1];
            if (cumulativeCount > lastTier.elixerFalloffCumulative) {
                efficiencyPercent = lastTier.efficiencyPercent;
            }
            
            const elixirXP = baseElixirXP * (efficiencyPercent / 100);
            totalElixirXP += elixirXP;
            
            console.log(`Elixir ${i} (cumulative: ${cumulativeCount}): ${efficiencyPercent}% efficiency = ${elixirXP.toFixed(2)} XP`);
        }
        
        console.log('Total Elixir XP (with efficiency):', totalElixirXP);
        console.groupEnd();
        
        return totalElixirXP;
    }

    /**
     * Calculates XP from benediction pills with efficiency based on total consumed count.
     * Each benediction pill is calculated individually to account for efficiency tier changes.
     * @param {Object} playerData - Player data object
     * @param {number} dailyBenedictionCount - Number of benediction pills consumed per day
     * @returns {number} Total XP from all daily benediction pills with efficiency applied
     */
    static calculateBenedictionXPWithEfficiency(playerData, dailyBenedictionCount) {
        console.group('✨ XPCalculator.calculateBenedictionXPWithEfficiency');
        
        // Get base benediction XP for the player's realm
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        if (!realmXP || !realmXP.benediction) {
            console.warn(`Warning: Benediction XP data not found for realm "${realmXPKey}"`);
            console.groupEnd();
            return 0;
        }
        
        const baseBenedictionXP = realmXP.benediction;
        const totalConsumed = playerData.benedictionConsumed || 0;
        const efficiencyLevels = GameConstants.benedictionData.benedictionEfficiencyLevels;
        
        console.log('Base Benediction XP:', baseBenedictionXP);
        console.log('Total Consumed:', totalConsumed);
        console.log('Daily Benediction Count:', dailyBenedictionCount);
        
        let totalBenedictionXP = 0;
        
        // Calculate each benediction pill individually
        for (let i = 1; i <= dailyBenedictionCount; i++) {
            const cumulativeCount = totalConsumed + i;
            
            // Find the efficiency tier for this cumulative count
            // Tiers are ordered from highest to lowest efficiency
            // Each tier's benedictionFalloffCumulative represents the upper bound (inclusive) for that tier
            // Tier ranges: 1-25 (120%), 26-80 (100%), 81-160 (80%), etc.
            let efficiencyPercent = 100.0; // Default to 100% if no tier found
            
            // Find the appropriate tier by checking which cumulative threshold the count falls into
            for (let j = 0; j < efficiencyLevels.length; j++) {
                const tier = efficiencyLevels[j];
                const previousTierCumulative = j === 0 ? 0 : efficiencyLevels[j - 1].benedictionFalloffCumulative;
                
                // Check if this cumulative count falls within this tier's range
                // Range is (previousTierCumulative + 1) to tier.benedictionFalloffCumulative (inclusive)
                if (cumulativeCount > previousTierCumulative && cumulativeCount <= tier.benedictionFalloffCumulative) {
                    efficiencyPercent = tier.efficiencyPercent;
                    break;
                }
            }
            
            // If cumulative count exceeds all tiers, use the lowest efficiency (last tier)
            const lastTier = efficiencyLevels[efficiencyLevels.length - 1];
            if (cumulativeCount > lastTier.benedictionFalloffCumulative) {
                efficiencyPercent = lastTier.efficiencyPercent;
            }
            
            const benedictionXP = baseBenedictionXP * (efficiencyPercent / 100);
            totalBenedictionXP += benedictionXP;
            
            console.log(`Benediction ${i} (cumulative: ${cumulativeCount}): ${efficiencyPercent}% efficiency = ${benedictionXP.toFixed(2)} XP`);
        }
        
        console.log('Total Benediction XP (with efficiency):', totalBenedictionXP);
        console.groupEnd();
        
        return totalBenedictionXP;
    }
}

export { XPCalculator };