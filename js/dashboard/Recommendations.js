import { FruitCalculator } from './FruitCalculator.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { XPCalculator } from './XPCalculator.js';
import { timegateLength, Realms, MAX_EXTRACTOR_LEVEL, PERCENTAGE_COMPLETE } from '../utilities/gameData.js';
import { ViryaScenarioComparator } from './ViryaScenarioComparator.js';

class Recommendations {
    // FRUIT eat timing compare-inator
    static findMinLevelsFruitFromCurrent(playerData, targetFruitXP, maxLevel = MAX_EXTRACTOR_LEVEL) {
        
        const currentLevels = {
            xp: playerData.extractorXPLevel,
            gush: playerData.extractorGushLevel,
            quality: playerData.extractorQualityLevel
        };

        // Get current SINGLE fruit XP and TOTAL fruit XP
        const currentFruitXPSingle = FruitCalculator.fruitXP(playerData);
        const currentFruitXPTotal = currentFruitXPSingle * playerData.fruitsCount;
        
        // Check if player already meets target with current total fruit XP
        if (currentFruitXPTotal >= targetFruitXP) {
            
            // Calculate max level XP for comparison
            const maxLevelXPResult = this.calculateMaxLevelXP(playerData, maxLevel);
            const comparison = this.compareSolutions(
                currentFruitXPSingle, 
                currentFruitXPTotal, 
                maxLevelXPResult.fruitXPSingle, 
                maxLevelXPResult.fruitXPTotal
            );
            
            return {
                recommendedSolution: {
                    xpLevel: currentLevels.xp,
                    gushLevel: currentLevels.gush,
                    qualityLevel: currentLevels.quality,
                    totalLevels: currentLevels.xp + currentLevels.gush + currentLevels.quality,
                    fruitXPSingle: currentFruitXPSingle,
                    fruitXPTotal: currentFruitXPTotal,
                    alreadyMeetsTarget: true
                },
                maxLevelComparison: maxLevelXPResult,
                comparison: comparison
            };
        }

        // Jump search starting from current levels
        const JUMP = 5;
        let bestSolution = null; // FIXED: Declare here at the top level
        let minTotalLevels = Infinity;
        let evaluations = 0;
        let foundSolutions = 0;

        // Calculate max number of triple jumps needed
        const maxJumpDistance = Math.max(
            maxLevel - currentLevels.xp,
            maxLevel - currentLevels.gush,
            maxLevel - currentLevels.quality
        );
        const maxTripleJumps = Math.ceil(maxJumpDistance / JUMP);

        // Coarse search with triple jumps only
        for (let jump = 0; jump <= maxTripleJumps; jump++) {
            // Calculate levels for this triple jump
            const xp = Math.min(currentLevels.xp + (jump * JUMP), maxLevel);
            const gush = Math.min(currentLevels.gush + (jump * JUMP), maxLevel);
            const quality = Math.min(currentLevels.quality + (jump * JUMP), maxLevel);
            evaluations++;

            const testData = {
                ...playerData,
                extractorXPLevel: xp,
                extractorGushLevel: gush,
                extractorQualityLevel: quality
            };

            const fruitXPSingle = FruitCalculator.fruitXP(testData);
            const fruitXPTotal = fruitXPSingle * playerData.fruitsCount;
            
            const meetsTarget = fruitXPTotal >= targetFruitXP;
            const totalLevels = xp + gush + quality;

            if (fruitXPTotal >= targetFruitXP) {
                foundSolutions++;
                
                if (totalLevels < minTotalLevels) {
                    minTotalLevels = totalLevels;
                    bestSolution = { 
                        xp, 
                        gush, 
                        quality, 
                        fruitXPSingle,
                        fruitXPTotal,
                        jumpNumber: jump,
                        totalLevels: totalLevels
                    };
                }
            }
        }

        // FIXED: Now bestSolution is defined at the top level, so we can safely check it
        if (!bestSolution) {
            
            // Calculate max level XP for comparison
            const maxLevelXPResult = this.calculateMaxLevelXP(playerData, maxLevel);
            
            return {
                recommendedSolution: null,
                maxLevelComparison: maxLevelXPResult,
                comparison: {
                    note: 'No solution found even at max levels',
                    canReachTarget: false,
                    maxLevelsGivesXP: maxLevelXPResult.fruitXPTotal,
                    targetXP: targetFruitXP,
                    difference: maxLevelXPResult.fruitXPTotal - targetFruitXP,
                    deficit: targetFruitXP - maxLevelXPResult.fruitXPTotal
                }
            };
        }

        
        // Refine around the best coarse solution
        const refinedSolution = this.refineSolution(playerData, targetFruitXP, bestSolution, currentLevels, JUMP, maxLevel);
        
        // Calculate max level XP for comparison
        const maxLevelXPResult = this.calculateMaxLevelXP(playerData, maxLevel);
        
        // Compare refined solution with max levels
        const comparison = this.compareSolutions(
            refinedSolution.fruitXPSingle, 
            refinedSolution.fruitXPTotal,
            maxLevelXPResult.fruitXPSingle, 
            maxLevelXPResult.fruitXPTotal
        );
        
        
        return {
            recommendedSolution: refinedSolution,
            maxLevelComparison: maxLevelXPResult,
            comparison: comparison
        };
    }

    static refineSolution(playerData, targetFruitXP, coarseSolution, currentLevels, jumpSize, maxLevel = MAX_EXTRACTOR_LEVEL) {
        
        const { xp: coarseXp, gush: coarseGush, quality: coarseQuality, fruitXPTotal: coarseTotalXP, jumpNumber: coarseJump } = coarseSolution;

        // Refinement: Try to reduce levels from coarse solution while still meeting target
        // Start from coarse solution and work backwards to find minimal levels
        let bestRefined = {
            xp: coarseXp,
            gush: coarseGush,
            quality: coarseQuality,
            totalLevels: coarseXp + coarseGush + coarseQuality
        };
        
        // Test if we can reduce each stat individually
        const stats = ['xp', 'gush', 'quality'];
        const coarseLevels = { xp: coarseXp, gush: coarseGush, quality: coarseQuality };
        
        for (const stat of stats) {
            // Try reducing this stat from coarse level down to current level
            const startLevel = coarseLevels[stat];
            const endLevel = Math.max(currentLevels[stat], startLevel - jumpSize);
            
            for (let level = startLevel - 1; level >= endLevel; level--) {
                const testLevels = { ...bestRefined };
                testLevels[stat] = level;
                testLevels.totalLevels = testLevels.xp + testLevels.gush + testLevels.quality;
                
                const testData = {
                    ...playerData,
                    extractorXPLevel: testLevels.xp,
                    extractorGushLevel: testLevels.gush,
                    extractorQualityLevel: testLevels.quality
                };
                
                const fruitXPSingle = FruitCalculator.fruitXP(testData);
                const fruitXPTotal = fruitXPSingle * playerData.fruitsCount;
                
                if (fruitXPTotal >= targetFruitXP && testLevels.totalLevels < bestRefined.totalLevels) {
                    bestRefined = { ...testLevels, fruitXPSingle, fruitXPTotal };
                } else if (fruitXPTotal < targetFruitXP) {
                    // Can't reduce further, break
                    break;
                }
            }
        }
        
        // Calculate final fruit XP for the refined solution
        const finalTestData = {
            ...playerData,
            extractorXPLevel: bestRefined.xp,
            extractorGushLevel: bestRefined.gush,
            extractorQualityLevel: bestRefined.quality
        };
        
        const refinedFruitXPSingle = FruitCalculator.fruitXP(finalTestData);
        const refinedFruitXPTotal = refinedFruitXPSingle * playerData.fruitsCount;
        
        const refinedSolution = {
            xpLevel: bestRefined.xp,
            gushLevel: bestRefined.gush,
            qualityLevel: bestRefined.quality,
            totalLevels: bestRefined.totalLevels,
            fruitXPSingle: refinedFruitXPSingle,
            fruitXPTotal: refinedFruitXPTotal,
            alreadyMeetsTarget: refinedFruitXPTotal >= targetFruitXP
        };
        
        return refinedSolution;
    }

    static calculateMaxLevelXP(playerData, maxLevel = MAX_EXTRACTOR_LEVEL) {
        
        // Create test data with max levels
        const maxTestData = {
            ...playerData,
            extractorXPLevel: maxLevel,
            extractorGushLevel: maxLevel,
            extractorQualityLevel: maxLevel
        };
        
        // Calculate fruit XP at max levels
        const fruitXPSingle = FruitCalculator.fruitXP(maxTestData);
        const fruitXPTotal = fruitXPSingle * playerData.fruitsCount;
        
        const result = {
            xpLevel: maxLevel,
            gushLevel: maxLevel,
            qualityLevel: maxLevel,
            totalLevels: maxLevel * 3, // Three stats at max level
            fruitXPSingle: fruitXPSingle,
            fruitXPTotal: fruitXPTotal,
            isMaxLevel: true
        };
        
        return result;
    }

    static compareSolutions(recommendedSingleXP, recommendedTotalXP, maxSingleXP, maxTotalXP) {
        
        const comparison = {
            // Basic comparison
            recommendedSingleXP: recommendedSingleXP,
            recommendedTotalXP: recommendedTotalXP,
            maxSingleXP: maxSingleXP,
            maxTotalXP: maxTotalXP,
            
            // Differences
            singleXPDifference: maxSingleXP - recommendedSingleXP,
            totalXPDifference: maxTotalXP - recommendedTotalXP,
            
            // Percentages
            singleXPRatio: maxSingleXP > 0 ? (recommendedSingleXP / maxSingleXP) : 0,
            totalXPRatio: maxTotalXP > 0 ? (recommendedTotalXP / maxTotalXP) : 0,
            
            // Efficiency metrics
            singleXPPercentOfMax: maxSingleXP > 0 ? (recommendedSingleXP / maxSingleXP * 100).toFixed(1) + '%' : '0%',
            totalXPPercentOfMax: maxTotalXP > 0 ? (recommendedTotalXP / maxTotalXP * 100).toFixed(1) + '%' : '0%',
            
            // Interpretation
            efficiency: maxSingleXP > 0 ? (recommendedSingleXP / maxSingleXP).toFixed(3) : 0,
            note: ''
        };
        
        // Add interpretation notes
        if (comparison.singleXPRatio >= 0.9) {
            comparison.note = 'Highly efficient - recommended levels give nearly max XP';
        } else if (comparison.singleXPRatio >= 0.7) {
            comparison.note = 'Good efficiency - recommended levels give most of max XP';
        } else if (comparison.singleXPRatio >= 0.5) {
            comparison.note = 'Moderate efficiency - significant gap to max XP';
        } else {
            comparison.note = 'Low efficiency - large gap to max XP, consider upgrading further';
        }
        
        return comparison;
    }


}

export { Recommendations };
