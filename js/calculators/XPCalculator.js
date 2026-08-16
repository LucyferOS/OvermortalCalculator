import { XPData, GameConstants, Realms } from '../utilities/gameData.js';

/**
 * Every stage specific bonus that boosts one kind of pill, grouped by pill.
 * Bonuses to the same pill are percentages of the same stat, so they sum
 * before being applied as a single multiplier - adding a new system means
 * adding its field here, not another nested multiplication.
 */
const GOLD_PILL_BONUSES = ['pillBonusNirvanaChariotMansion', 'pillBonusGlittedLotusThrone'];
const PURPLE_PILL_BONUSES = ['pillBonusNirvanaTurtleBeakMansion', 'pillBonusGlittedLotusSeed'];
const BLUE_PILL_BONUSES = ['pillBonusNirvanaGhostMansion'];

class XPCalculator {
    static calculateDailyXPWithAbsorptionBonus(playerData, absorptionBonus) {

        const abodeXP = this.calculateAbodeXPTotal(playerData, absorptionBonus);

        const pillXP = this.calculatePillXP(playerData);
        
        const respiraXP = this.calculateRespiraXP(playerData);
        
        const pearlXP = this.calculatePearlXP(playerData, absorptionBonus);

        const total = abodeXP + pillXP + respiraXP + pearlXP;

        return total;
    }

    /**
     * The aura gem's share of the day's Abode Aura XP.
     *
     * Auraseep (`abodeTemperAuraCurio`, element id `abode-temper-aura-curio`)
     * multiplies exactly this and nothing else: 50% makes the gem worth 1.5x.
     * It is a gem bonus rather than an Abode Aura one, so easy mode - which
     * replaces the Abode Aura and Absorption totals - does not swallow it.
     *
     * Shared so the daily total, the analytics breakdown and the red pill
     * analytic cannot disagree about what the gem is worth.
     */
    static calculateAuraGemXP(playerData, absorptionBonus) {
        const abodeAuraXP = this.calculateAbodeAuraXP(playerData, absorptionBonus);
        const gemShare = abodeAuraXP * (GameConstants.gemQuality[playerData.gemQuality] || 0);

        return gemShare * (1 + ((playerData.abodeTemperAuraCurio || 0) / 100));
    }

    /**
     * The XP the abode yields in a day: the Abode Aura XP plus the aura gem's
     * share of it, Auraseep included.
     *
     * The Pearl is deliberately not part of it: that is an artifact being spent,
     * not the abode ticking over.
     */
    static calculateAbodeXPTotal(playerData, absorptionBonus) {
        return this.calculateAbodeAuraXP(playerData, absorptionBonus)
            + this.calculateAuraGemXP(playerData, absorptionBonus);
    }

    /**
     * Wisdom Confluence: a percentage of the day's Abode Aura XP, paid into the
     * **secondary path** on top of everything else.
     *
     * The aura gem is excluded - the Confluence draws on the aura itself, so
     * neither the gem's quality nor Auraseep moves it.
     *
     * It is a second bucket being filled, not a faster fill rate, so it must not
     * be folded into the daily total above - both paths generate XP at the same
     * base rate, and only the path-specific sources (elixir for the main path,
     * benediction and this for the secondary) may differ. The caller adds it
     * where it books benediction.
     */
    static calculateWisdomConfluenceXP(playerData, absorptionBonus) {
        const percent = playerData.wisdomConfluenceCurio || 0;
        if (percent <= 0) return 0;

        return this.calculateAbodeAuraXP(playerData, absorptionBonus) * (percent / 100);
    }

    static calculateTotalAbodeBonus(playerData) {
        const abodeBonuses = [
            playerData.abodeBonusCurio, playerData.abodeBonusTechnique, playerData.abodeBonusSectLevel,
            playerData.abodeBonusSectBarrier, playerData.abodeBonusCelestialSpring, playerData.abodeBonusEnergyArray,
            playerData.abodeBonusSwordArray, playerData.abodeBonusHeavenGate, playerData.abodeBonusWholenessCitta,
            playerData.abodeBonusPerfectionWorldRift, playerData.abodeBonusNirvanaPathofAscension,
            playerData.abodeBonusNirvanaHornMansion, playerData.abodeBonusNirvanaNeckMansion,
            playerData.abodeBonusMiniWorld, playerData.abodeBonusFiveAsthenia
        ];

        return abodeBonuses.reduce((sum, bonus) => sum + (bonus || 0), 0);
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

    /**
     * The detailed-mode Absorption: the realm's base rate plus the Virya bonus,
     * scaled by the MonsterScape percentage. MonsterScape multiplies the whole
     * stat, so it scales the Virya bonus along with the realm base.
     *
     * Easy mode does not call this — there the player types their effective
     * Absorption in directly, MonsterScape already included.
     */
    static calculateAbsorption(playerData, absorptionBonus) {
        const base = (Realms[playerData.mainPathRealm]?.absorption || 0) + absorptionBonus;
        return base * (1 + ((playerData.absorptionBonusMonsterScape || 0) / 100));
    }

    static calculateCosmoapsisValue(playerData, absorptionBonus) {
        const totalAbode = this.calculateTotalAbode(playerData);

        // Easy mode: skip the realm base + Virya bonus breakdown and use the total entered directly
        const effectiveAbsorption = playerData.abodeEasyMode
            ? (playerData.absorptionEasyValue || 0)
            : this.calculateAbsorption(playerData, absorptionBonus);

        // Multiply total abode by effectiveAbsorption to get cosmoapsisValue
        const cosmoapsisValue = totalAbode * effectiveAbsorption;

        return cosmoapsisValue;
    }

    static calculateAbodeAuraXP(playerData, absorptionBonus) {
        // Always derive from the realm and the bonus. Reading a cached
        // playerData.cosmoapsisValue here used to override the absorptionBonus
        // argument entirely, which silently discarded every Virya bonus.
        const cosmoapsisValue = this.calculateCosmoapsisValue(playerData, absorptionBonus);

        const dailyAuraXP = cosmoapsisValue * 10800;
        return dailyAuraXP;
    }

    /**
     * The multiplier every pill's XP passes through: the player's pill bonus,
     * times the game's flat 1000.
     */
    static pillMultiplier(playerData) {
        return (playerData.pillBonus || 1) * 1000;
    }

    /**
     * XP a single red pill is worth, including the vase's star bonus.
     * Shared so the daily XP total and the "red pills needed" analytic cannot
     * disagree about what one pill is worth.
     */
    static redPillXPPerPill(playerData) {
        const realmXP = XPData[`${playerData.mainPathRealmMajor}XP`];
        if (!realmXP) return 0;

        const vaseBonus = GameConstants.vaseBonus[playerData.vaseStars] || 0;
        return realmXP.red * (1 + vaseBonus) * this.pillMultiplier(playerData);
    }

    /**
     * The multiplier one kind of pill's XP passes through, from the stage
     * specific systems that boost it. The percentages sum, then apply once.
     */
    static pillTypeBonus(playerData, fields) {
        const total = fields.reduce((sum, field) => sum + (playerData[field] || 0), 0);
        return 1 + (total / 100);
    }

    /**
     * Daily XP from each kind of pill, already multiplied through.
     * Benediction is excluded: it applies to the secondary path only.
     */
    static calculatePillXPBreakdown(playerData) {
        const empty = { goldPills: 0, purplePills: 0, bluePills: 0, elixir: 0, benediction: 0, redPills: 0, total: 0 };

        const realmXP = XPData[`${playerData.mainPathRealmMajor}XP`];
        if (!realmXP) return empty;

        const multiplier = this.pillMultiplier(playerData);

        const breakdown = {
            goldPills: realmXP.gold
                * this.pillTypeBonus(playerData, GOLD_PILL_BONUSES)
                * playerData.goldPill * multiplier,

            purplePills: realmXP.purple
                * this.pillTypeBonus(playerData, PURPLE_PILL_BONUSES)
                * playerData.purplePill * multiplier,

            bluePills: realmXP.blue
                * this.pillTypeBonus(playerData, BLUE_PILL_BONUSES)
                * playerData.bluePill * multiplier,

            elixir: this.calculateElixirXPWithEfficiency(playerData, playerData.elixir || 0) * multiplier,

            benediction: 0,

            redPills: this.redPillXPPerPill(playerData) * this.calculateRedPills(playerData)
        };

        breakdown.total = breakdown.goldPills + breakdown.purplePills + breakdown.bluePills
            + breakdown.elixir + breakdown.benediction + breakdown.redPills;

        return breakdown;
    }

    static calculatePillXP(playerData) {
        return this.calculatePillXPBreakdown(playerData).total;
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
        
        // Nirvana Dipper Mansion boosts the Respira XP per attempt, the same way the
        // Chariot/Turtle Beak/Ghost mansions boost their pills. It is a Respira bonus,
        // not an Abode Aura one, so easy mode does not replace it.
        const realmRespiraXP = XPData[playerData.mainPathRealmMajor + "XP"].respira
            * (1 + ((playerData.respiraNirvanaDipperMansion || 0) / 100));

        const baseRespiraXP = respiraAttemptsGush * realmRespiraXP * 1000;
        const respiraExp = baseRespiraXP * playerData.respiraBonusTotal;
        
        
        return respiraExp;
    }

    static calculatePearlXP(playerData, absorptionBonus) {
        
        if (!playerData.pearlStars || playerData.pearlStars === 'No artifact') {
            return 0;
        }
        
        const cosmoapsisValue = this.calculateCosmoapsisValue(playerData, absorptionBonus);

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
