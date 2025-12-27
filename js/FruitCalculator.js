import { GameConstants } from './gameData.js';

class FruitCalculator {
	
  static fruitXP(playerData) {
    const extractorXPLevel = GameConstants.flatExtractorLevels.levels[playerData.extractorXPLevel].xpBonus;
    const extractorGushLevel = (GameConstants.flatExtractorLevels.levels[playerData.extractorGushLevel].gushChance + 10) / 100;
    const baseFruitXP = GameConstants.fruitRealmData[playerData.mainPathRealmMajor];
    const modifiedFruitXP = baseFruitXP + (baseFruitXP * extractorXPLevel);
    const gushMultiplier = GameConstants.flatExtractorLevels.levels[playerData.extractorGushLevel].gushMultiplier;
    
    // Get quality distribution
    const qualityLevelObj = GameConstants.flatExtractorLevels.levels[playerData.extractorQualityLevel];
    const qualityChances = qualityLevelObj.qualityChance;
    
    // Calculate weighted average quality modifier
    let weightedQualityModifier = 0;
    for (const [quality, chance] of Object.entries(qualityChances)) {
      const modifier = GameConstants.fruitQualityModifier[quality];
      if (modifier !== undefined && chance > 0) {
        weightedQualityModifier += (chance / 100) * modifier;
      }
    }
    
    console.log('weightedQualityModifier:', weightedQualityModifier);
    
    // Calculate gush probability with safety check
    let gushProbability;
    if (extractorGushLevel > 0 && extractorGushLevel < 1) {
      gushProbability = extractorGushLevel / (1 - Math.pow(1 - extractorGushLevel, 6));
    } else {
      gushProbability = .1 / (1 - Math.pow(1 - .1, 6));
    }
    
    if (playerData.timegate <= 0) {
      const fruitXPWithoutGush = modifiedFruitXP * weightedQualityModifier;
      const fruitXPWithGush = fruitXPWithoutGush * (gushMultiplier / 100);
      const finalFruitXP = (fruitXPWithoutGush * (1 - gushProbability)) + (fruitXPWithGush * gushProbability);
      
      return finalFruitXP * 1000;
    } else {
      const fruitXPWithoutGush = modifiedFruitXP * 1.5 * weightedQualityModifier;
      const fruitXPWithGush = fruitXPWithoutGush * (gushMultiplier / 100);
      const finalFruitXP = (fruitXPWithoutGush * (1 - gushProbability)) + (fruitXPWithGush * gushProbability);
      
      return finalFruitXP * 1000;
    }
  }
}

export { FruitCalculator };