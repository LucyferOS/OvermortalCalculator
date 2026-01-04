import { GameConstants } from '../utilities/gameData.js';

class FruitCalculator {
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