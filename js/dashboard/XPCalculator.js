import { XPData, GameConstants, Realms } from '../utilities/gameData.js';
import { CalculatorUtils } from '../utilities/utils.js';

class XPCalculator {
    static calculateDailyXPWithAbsorptionBonus(playerData, absorptionBonus) {
        
        const abodeAuraXP = this.calculateAbodeAuraXP(playerData, absorptionBonus);
        
        const gemBonusXP = abodeAuraXP * GameConstants.gemQuality[playerData.gemQuality];
        
        const pillXP = this.calculatePillXP(playerData);
        
        const respiraXP = this.calculateRespiraXP(playerData);
        
        const pearlXP = this.calculatePearlXP(playerData, absorptionBonus);
        
        const total = abodeAuraXP + gemBonusXP + pillXP + respiraXP + pearlXP;
		
        return total;
    }

    static calculateTotalAbodeBonus(playerData) {
        const abodeBonuses = [
            playerData.abodeBonusCurio, playerData.abodeBonusTechnique, playerData.abodeBonusSectLevel,
            playerData.abodeBonusSectBarrier, playerData.abodeBonusCelestialSpring, playerData.abodeBonusEnergyArray,
            playerData.abodeBonusSwordArray, playerData.abodeBonusHeavenGate, playerData.abodeBonusWholenessCitta,
            playerData.abodeBonusPerfectionWorldRift, playerData.abodeBonusNirvanaPathofAscension,
            playerData.abodeBonusNirvanaHornMansion, playerData.abodeBonusNirvanaNeckMansion
        ];
        
        return abodeBonuses.reduce((sum, bonus) => sum + bonus, 0);
    }

    static calculateTotalAbode(playerData) {
        // Easy mode: skip the detailed breakdown and use the total entered directly
        if (playerData.abodeEasyMode) {
            return playerData.abodeAuraEasyValue || 0;
        }

        const totalAbodeBonus = this.calculateTotalAbodeBonus(playerData);
        // Multiply baseAbodeAura by totalAbodeBonus (as percentage) to get bonus amount
        const bonusAmount = playerData.baseAbodeAura * (totalAbodeBonus / 100);
        // Add baseAbodeAura to get total abode
        return playerData.baseAbodeAura + bonusAmount;
    }

    static calculateCosmoapsisValue(playerData, absorptionBonus) {
        const totalAbode = this.calculateTotalAbode(playerData);

        // Easy mode: skip the realm base + Virya bonus breakdown and use the total entered directly
        const effectiveAbsorption = playerData.abodeEasyMode
            ? (playerData.absorptionEasyValue || 0)
            : (Realms[playerData.mainPathRealm]?.absorption || 0) + absorptionBonus;

        // Multiply total abode by effectiveAbsorption to get cosmoapsisValue
        const cosmoapsisValue = totalAbode * effectiveAbsorption;

        return cosmoapsisValue;
    }

    static calculateAbodeAuraXP(playerData, absorptionBonus) {
        // Use stored value if available, otherwise calculate it
        const cosmoapsisValue = playerData.cosmoapsisValue !== undefined 
            ? playerData.cosmoapsisValue 
            : this.calculateCosmoapsisValue(playerData, absorptionBonus);
        
        const dailyAuraXP = cosmoapsisValue * 10800;
        return dailyAuraXP;
    }

    static calculatePillXP(playerData) {
        
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        // Safety check: if realmXP is undefined, return 0
        if (!realmXP) {
            return 0;
        }
        
        const goldPillXP = realmXP.gold 
            * (1 + (playerData.pillBonusNirvanaChariotMansion / 100)) 
            * playerData.goldPill;
        
        const purplePillXP = realmXP.purple 
            * (1 + (playerData.pillBonusNirvanaTurtleBeakMansion / 100)) 
            * playerData.purplePill;
        
        const bluePillXP = realmXP.blue 
            * (1 + (playerData.pillBonusNirvanaGhostMansion / 100)) 
            * playerData.bluePill;
        
        const elixirXP = this.calculateElixirXPWithEfficiency(playerData, playerData.elixir || 0);
        
        // Benediction pills only apply to secondary path, not main path
        // const benedictionXP = this.calculateBenedictionXPWithEfficiency(playerData, playerData.benediction || 0);
        
        const numRedPills = this.calculateRedPills(playerData);
        
        // Calculate red pill XP with separate vase bonus
        // Base XP per pill: realmXP.red
        // Vase bonus per pill (separate, additive): realmXP.red * vaseBonus
        // Then multiply by number of red pills per day
        const vaseBonusMultiplier = GameConstants.vaseBonus[playerData.vaseStars];
        const baseRedPillXPPerPill = realmXP.red;
        const vaseBonusXPPerPill = realmXP.red * vaseBonusMultiplier;
        const redPillXPPerPill = baseRedPillXPPerPill + vaseBonusXPPerPill;
        const redPillXP = redPillXPPerPill * numRedPills;
        
        const basePillXP = goldPillXP + purplePillXP + bluePillXP + elixirXP + redPillXP;
        const totalPillXP = basePillXP * playerData.pillBonus * 1000;
        
        
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
        
        const probabilities = [0.55, 0.30, 0.1475, 0.0025];
        const multipliers = [1, 2, 5, 10];
        
        let expectedGushValue = 0;
        for (let i = 0; i < probabilities.length; i++) {
            expectedGushValue += probabilities[i] * multipliers[i];
        }
        
        const respiraAttemptsGush = playerData.respiraAttemptsTotal * expectedGushValue;
        
        const realmRespiraXP = XPData[playerData.mainPathRealmMajor + "XP"].respira;
        
        const baseRespiraXP = respiraAttemptsGush * realmRespiraXP * 1000;
        const respiraExp = baseRespiraXP * playerData.respiraBonusTotal;
        
        
        return respiraExp;
    }

    static calculatePearlXP(playerData, absorptionBonus) {
        
        if (!playerData.pearlStars || playerData.pearlStars === 'No artifact') {
            return 0;
        }
        
        // Use stored value if available, otherwise calculate it
        const cosmoapsisValue = playerData.cosmoapsisValue !== undefined 
            ? playerData.cosmoapsisValue 
            : this.calculateCosmoapsisValue(playerData, absorptionBonus);
        
        // Calculate energy available per day (same logic as other artifacts)
        const energyReplenished = GameConstants.artifactEnergyReplenishment[playerData.pearlStars] * GameConstants.taoistYearsPerDay;
        
        // Energy cost per use: 90 if 5 stars, 100 otherwise
        const energyCostPerUse = playerData.pearlStars === '5 stars' ? 90 : 100;
        
        // Calculate uses per day (starting energy + replenished energy) / cost per use
        const usesPerDay = (energyReplenished + 100) / energyCostPerUse;
        
        // Calculate total energy used per day
        const energyUsedPerDay = usesPerDay * energyCostPerUse;
        
        // XP multiplier: 1200 if 1+ stars, 1000 if 0 star
        const xpMultiplier = playerData.pearlStars === '0 star' ? 1000 : 1200;
        
        // Calculate XP: (energy used / 100) * cosmoapsisValue * multiplier
        const pearlXP = (energyUsedPerDay / 100) * cosmoapsisValue * xpMultiplier;
        
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
        
        // Get base elixir XP for the player's realm
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        if (!realmXP || !realmXP.elixer) {
            return 0;
        }
        
        const baseElixirXP = realmXP.elixer;
        const totalConsumed = playerData.elixirConsumed || 0;
        const efficiencyLevels = GameConstants.elixerData.elixerEfficiencyLevels;
        
        
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
            
        }
        
        
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
        
        // Get base benediction XP for the player's realm
        const realmXPKey = playerData.mainPathRealmMajor + "XP";
        const realmXP = XPData[realmXPKey];
        
        if (!realmXP || !realmXP.benediction) {
            return 0;
        }
        
        const baseBenedictionXP = realmXP.benediction;
        const totalConsumed = playerData.benedictionConsumed || 0;
        const efficiencyLevels = GameConstants.benedictionData.benedictionEfficiencyLevels;
        
        
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
            
        }
        
        
        return totalBenedictionXP;
    }
}

export { XPCalculator };
