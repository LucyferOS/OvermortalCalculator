import { GameConstants, FRUIT_ACCRUAL_WEEKDAY, FRUITS_PER_TOKEN } from '../utilities/gameData.js';

class FruitCalculator {
  /**
   * How many weekly payouts land within `days` from `now`.
   *
   * Income arrives on Wednesdays, so this counts Wednesdays in the window. A
   * payout landing today is not counted: the player's "current fruits" is what
   * they hold right now, which already includes anything paid out today.
   *
   * An infinite or negative horizon counts nothing, so a player who is never
   * breaking through is projected at their current stock rather than infinity.
   */
  static weeklyAccruals(days, now = new Date()) {
    if (!Number.isFinite(days) || days <= 0) return 0;

    // Days until the next payout: always 1-7, never 0.
    const daysUntilFirst = (((FRUIT_ACCRUAL_WEEKDAY - now.getDay()) % 7) + 7) % 7 || 7;
    if (days < daysUntilFirst) return 0;

    return 1 + Math.floor((days - daysUntilFirst) / 7);
  }

  /**
   * How many tokens the player will hold `days` from now. Tokens are paid out
   * on the same weekly schedule as fruits.
   */
  static projectedTokens(playerData, days, now = new Date()) {
    const accruals = this.weeklyAccruals(days, now);
    return (playerData.tokensCount || 0) + (accruals * (playerData.weeklyTokens || 0));
  }

  /**
   * How many fruits the player will have to eat `days` from now: what they hold
   * today, plus a weekly payout for every Wednesday between now and then, plus
   * whatever their tokens convert into if they mean to spend them.
   */
  static projectedFruits(playerData, days, now = new Date()) {
    const accruals = this.weeklyAccruals(days, now);
    const fruits = (playerData.fruitsCount || 0) + (accruals * (playerData.weeklyFruits || 0));

    if (!playerData.useTokens) return fruits;

    return fruits + (this.projectedTokens(playerData, days, now) * FRUITS_PER_TOKEN);
  }

  static fruitXP(playerData) {
    const extractorXPLevel = GameConstants.flatExtractorLevels.levels[playerData.extractorXPLevel].xpBonus;
    const extractorGushLevel = (GameConstants.flatExtractorLevels.levels[playerData.extractorGushLevel].gushChance + 10) / 100;
    let baseFruitXP = GameConstants.fruitRealmData[playerData.mainPathRealmMajor];
    const gushMultiplier = GameConstants.flatExtractorLevels.levels[playerData.extractorGushLevel].gushMultiplier;
    
    // Get base quality distribution from extractor level
    const qualityLevelObj = GameConstants.flatExtractorLevels.levels[playerData.extractorQualityLevel];
    const baseQualityChances = qualityLevelObj.qualityChance;
    
    // Add extractor rank bonus: 30% for the extractor's rank
    const adjustedQualityChances = this.addRankBonusToQualityChances(baseQualityChances, playerData.extractorRank);
    
    // Calculate weighted average quality modifier using adjusted chances
    let weightedQualityModifier = 0;
    for (const [quality, chance] of Object.entries(adjustedQualityChances)) {
      const modifier = GameConstants.fruitQualityModifier[quality];
      if (modifier !== undefined && chance > 0) {
        weightedQualityModifier += (chance / 100) * modifier;
      }
    }
    
    // Calculate gush probability
    let gushProbability;
    if (extractorGushLevel > 0 && extractorGushLevel < 1) {
      gushProbability = extractorGushLevel / (1 - Math.pow(1 - extractorGushLevel, 6));
    } else {
      gushProbability = .1 / (1 - Math.pow(1 - .1, 6));
    }
    
    // Calculate final fruit XP
    let finalFruitXP;
    if (playerData.timegate <= 0) {
      const modifiedFruitXP = baseFruitXP + ((baseFruitXP * extractorXPLevel)/100);
      const fruitXPWithoutGush = modifiedFruitXP * weightedQualityModifier;
      const fruitXPWithGush = fruitXPWithoutGush * (gushMultiplier / 100);
      
      finalFruitXP = (fruitXPWithoutGush * (1 - gushProbability)) + (fruitXPWithGush * gushProbability);
    } else {
      baseFruitXP = baseFruitXP * 1.5;
      const modifiedFruitXP = baseFruitXP + ((baseFruitXP * extractorXPLevel)/100);
      const fruitXPWithoutGush = modifiedFruitXP * weightedQualityModifier;
      const fruitXPWithGush = fruitXPWithoutGush * (gushMultiplier / 100);
      
      finalFruitXP = (fruitXPWithoutGush * (1 - gushProbability)) + (fruitXPWithGush * gushProbability);
    }
    
    return finalFruitXP * 1000;
  }
  
  // Helper method to add rank bonus to quality chances
  static addRankBonusToQualityChances(baseChances, extractorRank) {
    // Create a copy of base chances
    const adjusted = { ...baseChances };
    
    // Initialize the rank in adjusted if it doesn't exist
    if (!adjusted[extractorRank]) {
      adjusted[extractorRank] = 0;
    }
    
    // Add 30% for the extractor's rank
    adjusted[extractorRank] += 30;
    
    return adjusted;
  }
}

export { FruitCalculator };