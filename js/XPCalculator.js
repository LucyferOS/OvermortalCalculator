import { XPData, GameConstants, Realms } from './gameData.js';
import { CalculatorUtils } from './utils.js';
import { Logger } from './Logger.js';

class XPCalculator {
    static calculateDailyXPWithAbsorptionBonus(playerData, absorptionBonus) {
        Logger.group('🧮 XPCalculator.calculateDailyXPWithAbsorptionBonus', Logger.DEBUG);
        Logger.debug('Input:', { absorptionBonus, mainRealm: playerData.mainPathRealm });
        
        const abodeAuraXP = this.calculateAbodeAuraXP(playerData, absorptionBonus);
        Logger.debug('Abode Aura XP:', abodeAuraXP);
        
        const gemBonusXP = abodeAuraXP * GameConstants.gemQuality[playerData.gemQuality];
		Logger.debug('Gem Quality:', GameConstants.gemQuality[playerData.gemQuality]);
        Logger.debug('Gem Bonus XP:', gemBonusXP);
        
        const pillXP = this.calculatePillXP(playerData);
        Logger.debug('Pill XP:', pillXP);
        
        const respiraXP = this.calculateRespiraXP(playerData);
        Logger.debug('Respira XP:', respiraXP);
        
        const pearlXP = this.calculatePearlXP(playerData, absorptionBonus);
        Logger.debug('Pearl XP:', pearlXP);
        
        const total = abodeAuraXP + gemBonusXP + pillXP + respiraXP + pearlXP;
        Logger.debug('Total Daily XP:', total);
        Logger.groupEnd();
		
        return total;
    }

    static calculateCosmoapsisValue(playerData, absorptionBonus) {
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
        
        const cosmoapsisValue = playerData.baseAbodeAura * (1 + (totalAbodeBonus / 100)) * effectiveAbsorption;
        return cosmoapsisValue;
    }

    static calculateAbodeAuraXP(playerData, absorptionBonus) {
        // Use stored value if available, otherwise calculate it
        const cosmoapsisValue = playerData.cosmoapsisValue !== undefined 
            ? playerData.cosmoapsisValue 
            : this.calculateCosmoapsisValue(playerData, absorptionBonus);
        Logger.debug('cosmoapsisValue:', cosmoapsisValue);
        const dailyAuraXP = cosmoapsisValue * 10800;
        Logger.debug('dailyAuraXP:', dailyAuraXP);
        return dailyAuraXP;
    }

    static calculatePillXP(playerData) {
        Logger.group('💊 XPCalculator.calculatePillXP', Logger.DEBUG);
        
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        Logger.debug('Realm XP Values:', realmXP);
        
        // Safety check: if realmXP is undefined, return 0
        if (!realmXP) {
            Logger.warn(`Warning: Realm XP data not found for key "${realmXPKey}" (realm: ${playerData.mainPathRealmMajor})`);
            Logger.groupEnd();
            return 0;
        }
        
        const goldPillXP = realmXP.gold 
            * (1 + (playerData.pillBonusNirvanaChariotMansion / 100)) 
            * playerData.goldPill;
        Logger.debug('Gold Pill XP:', goldPillXP);
        
        const purplePillXP = realmXP.purple 
            * (1 + (playerData.pillBonusNirvanaTurtleBeakMansion / 100)) 
            * playerData.purplePill;
        Logger.debug('Purple Pill XP:', purplePillXP);
        
        const bluePillXP = realmXP.blue 
            * (1 + (playerData.pillBonusNirvanaGhostMansion / 100)) 
            * playerData.bluePill;
        Logger.debug('Blue Pill XP:', bluePillXP);
        
        const elixirXP = this.calculateElixirXPWithEfficiency(playerData, playerData.elixir || 0);
        Logger.debug('Elixir XP (with efficiency):', elixirXP);
        
        const benedictionXP = this.calculateBenedictionXPWithEfficiency(playerData, playerData.benediction || 0);
        Logger.debug('Benediction XP (with efficiency):', benedictionXP);
        
        const numRedPills = this.calculateRedPills(playerData);
        Logger.debug('Red Pills Count:', numRedPills);
        
        const redPillXP = realmXP.red * (1 + GameConstants.vaseBonus[playerData.vaseStars]) * numRedPills;
        Logger.debug('Red Pill XP:', redPillXP);
        
        const basePillXP = goldPillXP + purplePillXP + bluePillXP + elixirXP + benedictionXP + redPillXP;
        const totalPillXP = basePillXP * playerData.pillBonus * 1000;
        
        Logger.debug('Total Pill XP:', totalPillXP);
        Logger.groupEnd();
        
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
        let result = baseResult * (hasSkin ? 1.1 : 1.0);
        // 5-star vase: 15% chance to not use energy (compounds), giving ~17.65% more red pills on average
        if (stars === '5 stars') {
            result *= (1 / 0.85);
        }
        return result;
    }

    static calculateMirrorRedPill(stars, hasSkin) {
        if (stars === 'No artifact') return 0;
        const energy = GameConstants.artifactEnergyReplenishment[stars] * GameConstants.taoistYearsPerDay;
        const mirrorBonus = 1 - GameConstants.mirrorTokenBonus[stars];
        // Mirror skin reduces cost by 10%, so multiply denominator by 0.9 (or divide result by 0.9)
        const costMultiplier = hasSkin ? 0.9 : 1.0;
        let result = (energy + 100) / (200 * mirrorBonus * costMultiplier);
        // 5-star mirror: 15% chance to make a red pill twice, giving 15% more red pills on average
        if (stars === '5 stars') {
            result *= 1.15;
        }
        return result;
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
        Logger.group('🌀 XPCalculator.calculateRespiraXP', Logger.DEBUG);
        
        const probabilities = [0.55, 0.30, 0.1475, 0.0025];
        const multipliers = [1, 2, 5, 10];
        
        let expectedGushValue = 0;
        for (let i = 0; i < probabilities.length; i++) {
            expectedGushValue += probabilities[i] * multipliers[i];
        }
        Logger.debug('Expected Gush Value:', expectedGushValue);
        
        const respiraAttemptsGush = playerData.respiraAttemptsTotal * expectedGushValue;
        Logger.debug('Respira Attempts Gush:', respiraAttemptsGush);
        
        const realmRespiraXP = XPData[playerData.mainPathRealmMajor + "XP"].respira;
        Logger.debug('Realm Respira XP:', realmRespiraXP);
        
        const baseRespiraXP = respiraAttemptsGush * realmRespiraXP * 1000;
        const respiraExp = baseRespiraXP * playerData.respiraBonusTotal;
        
        Logger.debug('Total Respira XP:', respiraExp);
        Logger.groupEnd();
        
        return respiraExp;
    }

    static calculatePearlXP(playerData, absorptionBonus) {
        Logger.group('🫧 XPCalculator.calculatePearlXP', Logger.DEBUG);
        
        if (!playerData.pearlStars || playerData.pearlStars === 'No artifact') {
            Logger.debug('No pearl artifact');
            Logger.groupEnd();
            return 0;
        }
        
        // Use stored value if available, otherwise calculate it
        const cosmoapsisValue = playerData.cosmoapsisValue !== undefined 
            ? playerData.cosmoapsisValue 
            : this.calculateCosmoapsisValue(playerData, absorptionBonus);
        Logger.debug('cosmoapsisValue:', cosmoapsisValue);
        
        // Calculate energy available per day (same logic as other artifacts)
        const energyReplenished = GameConstants.artifactEnergyReplenishment[playerData.pearlStars] * GameConstants.taoistYearsPerDay;
        Logger.debug('Energy replenished per day:', energyReplenished);
        
        // Energy cost per use: 90 if 5 stars, 100 otherwise
        const energyCostPerUse = playerData.pearlStars === '5 stars' ? 90 : 100;
        Logger.debug('Energy cost per use:', energyCostPerUse);
        
        // Calculate uses per day (starting energy + replenished energy) / cost per use
        const usesPerDay = (energyReplenished + 100) / energyCostPerUse;
        Logger.debug('Uses per day:', usesPerDay);
        
        // Calculate total energy used per day
        const energyUsedPerDay = usesPerDay * energyCostPerUse;
        Logger.debug('Energy used per day:', energyUsedPerDay);
        
        // XP multiplier: 1200 if 1+ stars, 1000 if 0 star
        const xpMultiplier = playerData.pearlStars === '0 star' ? 1000 : 1200;
        Logger.debug('XP multiplier:', xpMultiplier);
        
        // Calculate XP: (energy used / 100) * cosmoapsisValue * multiplier
        const pearlXP = (energyUsedPerDay / 100) * cosmoapsisValue * xpMultiplier;
        Logger.debug('Total Pearl XP:', pearlXP);
        Logger.groupEnd();
        
        return pearlXP;
    }

    /**
     * Calculates XP from elixers with efficiency based on total consumed count.
     * Each elixir is calculated individually to account for efficiency tier changes.
     * @param {Object} playerData - Player data object
     * @param {number} dailyElixirCount - Number of elixers consumed per day
     * @returns {number} Total XP from all daily elixers with efficiency applied
     */
    static calculateElixirXPWithEfficiency(playerData, dailyElixirCount) {
        Logger.group('🧪 XPCalculator.calculateElixirXPWithEfficiency', Logger.DEBUG);
        
        // Get base elixir XP for the player's realm
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        if (!realmXP || !realmXP.elixer) {
            Logger.warn(`Warning: Elixir XP data not found for realm "${realmXPKey}"`);
            Logger.groupEnd();
            return 0;
        }
        
        const baseElixirXP = realmXP.elixer;
        const totalConsumed = playerData.elixirConsumed || 0;
        const efficiencyLevels = GameConstants.elixerData.elixerEfficiencyLevels;
        
        Logger.debug('Base Elixir XP:', baseElixirXP);
        Logger.debug('Total Consumed:', totalConsumed);
        Logger.debug('Daily Elixir Count:', dailyElixirCount);
        
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
            
            Logger.debug(`Elixir ${i} (cumulative: ${cumulativeCount}): ${efficiencyPercent}% efficiency = ${elixirXP.toFixed(2)} XP`);
        }
        
        Logger.debug('Total Elixir XP (with efficiency):', totalElixirXP);
        Logger.groupEnd();
        
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
        Logger.group('✨ XPCalculator.calculateBenedictionXPWithEfficiency', Logger.DEBUG);
        
        // Get base benediction XP for the player's realm
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        if (!realmXP || !realmXP.benediction) {
            Logger.warn(`Warning: Benediction XP data not found for realm "${realmXPKey}"`);
            Logger.groupEnd();
            return 0;
        }
        
        const baseBenedictionXP = realmXP.benediction;
        const totalConsumed = playerData.benedictionConsumed || 0;
        const efficiencyLevels = GameConstants.benedictionData.benedictionEfficiencyLevels;
        
        Logger.debug('Base Benediction XP:', baseBenedictionXP);
        Logger.debug('Total Consumed:', totalConsumed);
        Logger.debug('Daily Benediction Count:', dailyBenedictionCount);
        
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
            
            Logger.debug(`Benediction ${i} (cumulative: ${cumulativeCount}): ${efficiencyPercent}% efficiency = ${benedictionXP.toFixed(2)} XP`);
        }
        
        Logger.debug('Total Benediction XP (with efficiency):', totalBenedictionXP);
        Logger.groupEnd();
        
        return totalBenedictionXP;
    }
}

export { XPCalculator };