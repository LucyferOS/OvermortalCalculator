import { GameConstants } from './gameData.js';

//Fruit calculation strategy: take the values from the player extractor and compare against gameData to get the average amount of xp per fruit. Example of object:

		//{ 
		//  level: 0,
		//  xpBonus: 0.00,
		//  gushMultiplier: 150.00,
		//  gushChance: 0.00,
		//  qualityChance: {
		//	common: 100.00,
		//	uncommon: 0.00,
		//	rare: 0.00,
		//	epic: 0.00,
		//	legendary: 0.00,
		//	mythic: 0.00
		//  }
		//}

export class fruitCalculator(playerdata) {
	
	const extractorRank = playerData.extractorRank;
	const extractorQualityLevel = GameConstants.flatExtractorLevels['playerData.extractorQualityLevel'].qualityChance;
	const extractorXPLevel = GameConstants.flatExtractorLevels['playerData.extractorXPLevel'].xpBonus;
	const extractorGushLevel = GameConstants.flatExtractorLevels['playerData.extractorGushLevel'].gushChance + 10; //10 is the base gush value)
	const baseFruitXP = GameConstants.fruitRealmData[playerData.mainPathRealmMajor];
	const modifiedFruitXP = baseFruitXP + (baseFruitXP * extractorXPLevel);
	const fruitQualityModifier = GameConstants.fruitQualityModifier[extractorQualityLevel];
	const gushMultiplier = GameConstants.flatExtractorLevels['playerData.extractorGushLevel'].gushMultiplier;
	//math stack exchange gave a formula for calculating probability with a percentage and pity, (1-p-(1-p)^n)/p , where p is percentage and n is pity.
	const gushProbability = (1 - extractorGushLevel - Math.pow(1 - extractorGushLevel, 6)) / extractorGushLevel;
	
	quality
	
	
	
	if (playerData.timegate <= 0){
		const fruitxpWithoutGush = modifiedFruitXP * fruitQualityModifier;
		const fruitXPWithGush = fruitxpWithoutGush * gushMultiplier;
		const finalFruitXP = (fruitXPWithoutGush * (100 - gushProbability)) + (fruitXPWithGush * gushProbability) * 1000

		return finalFruitXP;
	
	} else {
		const fruitXPWithoutGush = modifiedFruitXP * 1.5 * fruitQualityModifier;
		const fruitXPWithGush = fruitxpWithoutGush * gushMultiplier;
		const finalFruitXP = (fruitXPWithoutGush * (100 - gushProbability)) + (fruitXPWithGush * gushProbability) * 1000

		return finalFruitXP;
	}
}