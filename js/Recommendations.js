import { FruitCalculator } from './FruitCalculator.js';
import { ViryaCalculator } from './ViryaCalculator.js';
import { XPCalculator } from './XPCalculator.js';
import { timegateLength, Realms, MAX_EXTRACTOR_LEVEL, PERCENTAGE_COMPLETE } from './gameData.js';
import { ViryaScenarioComparator } from './ViryaScenarioComparator.js';
import { Logger } from './Logger.js';

class Recommendations {
    // FRUIT eat timing compare-inator
    static findMinLevelsFruitFromCurrent(playerData, targetFruitXP, maxLevel = MAX_EXTRACTOR_LEVEL) {
        Logger.group('🍎 FRUIT EXTRACTOR OPTIMIZATION', Logger.INFO);
        Logger.section('SEARCHING FOR MINIMAL EXTRACTOR LEVELS', Logger.INFO);
        
        const currentLevels = {
            xp: playerData.extractorXPLevel,
            gush: playerData.extractorGushLevel,
            quality: playerData.extractorQualityLevel
        };

        Logger.info('INPUT PARAMETERS:', {
            'Target Fruit XP': targetFruitXP.toLocaleString(),
            'Max Level': maxLevel,
            'Fruits Count': playerData.fruitsCount,
            'Current Levels': currentLevels,
            'Extractor Rank': playerData.extractorRank,
            'Main Realm': playerData.mainPathRealmMajor
        });
        
        Logger.section('CURRENT FRUIT CALCULATIONS', Logger.DEBUG);
        
        // Get current SINGLE fruit XP and TOTAL fruit XP
        const currentFruitXPSingle = FruitCalculator.fruitXP(playerData);
        const currentFruitXPTotal = currentFruitXPSingle * playerData.fruitsCount;
        
        Logger.table({
            'Metric': ['Single Fruit XP', 'Total Fruit XP', 'Target XP', 'Meets Target'],
            'Value': [
                currentFruitXPSingle.toLocaleString(),
                currentFruitXPTotal.toLocaleString(),
                targetFruitXP.toLocaleString(),
                currentFruitXPTotal >= targetFruitXP ? '✓ YES' : '✗ NO'
            ]
        });
        
        // Check if player already meets target with current total fruit XP
        if (currentFruitXPTotal >= targetFruitXP) {
            Logger.success('Player already meets target with current fruits!');
            
            // Calculate max level XP for comparison
            const maxLevelXPResult = this.calculateMaxLevelXP(playerData, maxLevel);
            const comparison = this.compareSolutions(
                currentFruitXPSingle, 
                currentFruitXPTotal, 
                maxLevelXPResult.fruitXPSingle, 
                maxLevelXPResult.fruitXPTotal
            );
            
            Logger.table({
                'Solution': ['Current Levels', 'Max Levels', 'Difference', 'Efficiency'],
                'Gush Level': [
                    currentLevels.gush, 
                    maxLevelXPResult.gushLevel, 
                    '+'.repeat(maxLevelXPResult.gushLevel - currentLevels.gush), 
                    ''
                ],
                'XP Level': [
                    currentLevels.xp, 
                    maxLevelXPResult.xpLevel, 
                    '+'.repeat(maxLevelXPResult.xpLevel - currentLevels.xp), 
                    ''
                ],
                'Quality Level': [
                    currentLevels.quality, 
                    maxLevelXPResult.qualityLevel, 
                    '+'.repeat(maxLevelXPResult.qualityLevel - currentLevels.quality), 
                    ''
                ],
                'Single Fruit XP': [
                    currentFruitXPSingle.toLocaleString(),
                    maxLevelXPResult.fruitXPSingle.toLocaleString(),
                    (maxLevelXPResult.fruitXPSingle - currentFruitXPSingle).toLocaleString(),
                    comparison.singleXPPercentOfMax
                ]
            });
            
            Logger.groupEnd();
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

        Logger.section('COARSE SEARCH SETUP', Logger.DEBUG);
        Logger.table({
            'Parameter': ['Jump Size', 'Max Jump Distance', 'Max Triple Jumps', 'Starting Levels'],
            'Value': [JUMP, maxJumpDistance, maxTripleJumps, `${currentLevels.xp}/${currentLevels.gush}/${currentLevels.quality}`]
        });
        
        Logger.section('COARSE SEARCH (Triple Jumps)', Logger.DEBUG);
        
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
            
            Logger.debug(`Jump ${jump}: Levels (${xp}, ${gush}, ${quality})`, {
                'Single XP': fruitXPSingle.toLocaleString(),
                'Total XP': fruitXPTotal.toLocaleString(),
                'Target': targetFruitXP.toLocaleString(),
                'Meets Target': meetsTarget ? '✓ YES' : '✗ NO',
                'Total Levels': totalLevels,
                'Deficit': meetsTarget ? 'N/A' : (targetFruitXP - fruitXPTotal).toLocaleString()
            });

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
                    Logger.success(`New best solution found!`, {
                        'Jump': jump,
                        'Levels': `${xp}/${gush}/${quality}`,
                        'Total Levels': totalLevels,
                        'Fruit XP': fruitXPSingle.toLocaleString(),
                        'Total XP': fruitXPTotal.toLocaleString()
                    });
                }
            }
        }

        Logger.section('COARSE SEARCH RESULTS', Logger.INFO);
        Logger.table({
            'Metric': ['Evaluations', 'Solutions Found', 'Best Solution Levels', 'Best Solution Total Levels', 'Best Jump'],
            'Value': [
                evaluations,
                foundSolutions,
                bestSolution ? `${bestSolution.xp}/${bestSolution.gush}/${bestSolution.quality}` : 'None',
                bestSolution ? bestSolution.totalLevels : 'N/A',
                bestSolution ? bestSolution.jumpNumber : 'N/A'
            ]
        });

        // FIXED: Now bestSolution is defined at the top level, so we can safely check it
        if (!bestSolution) {
            Logger.error('No solution found even at max triple jump');
            
            // Calculate max level XP for comparison
            const maxLevelXPResult = this.calculateMaxLevelXP(playerData, maxLevel);
            
            Logger.groupEnd();
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

        Logger.section('REFINEMENT PROCESS', Logger.DEBUG);
        Logger.info(`Refining around best coarse solution from jump ${bestSolution.jumpNumber}`);
        
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
        
        Logger.section('FINAL RECOMMENDATION', Logger.INFO);
        Logger.table({
            'Aspect': ['Levels (Gush/XP/Quality)', 'Total Levels', 'Single Fruit XP', 'Total Fruit XP', 'Efficiency vs Max', 'Status'],
            'Recommended': [
                `${refinedSolution.xpLevel}/${refinedSolution.gushLevel}/${refinedSolution.qualityLevel}`,
                refinedSolution.totalLevels,
                refinedSolution.fruitXPSingle.toLocaleString(),
                refinedSolution.fruitXPTotal.toLocaleString(),
                comparison.singleXPPercentOfMax,
                refinedSolution.alreadyMeetsTarget ? 'Already Meets Target' : 'Optimized'
            ],
            'Maximum': [
                `${maxLevelXPResult.xpLevel}/${maxLevelXPResult.gushLevel}/${maxLevelXPResult.qualityLevel}`,
                maxLevelXPResult.totalLevels,
                maxLevelXPResult.fruitXPSingle.toLocaleString(),
                maxLevelXPResult.fruitXPTotal.toLocaleString(),
                '100%',
                'Max Potential'
            ]
        });
        
        Logger.success('Fruit extractor optimization complete!');
        Logger.groupEnd();
        
        return {
            recommendedSolution: refinedSolution,
            maxLevelComparison: maxLevelXPResult,
            comparison: comparison
        };
    }

    static refineSolution(playerData, targetFruitXP, coarseSolution, currentLevels, jumpSize, maxLevel = MAX_EXTRACTOR_LEVEL) {
        Logger.group('🔧 SOLUTION REFINEMENT', Logger.DEBUG);
        Logger.info('Refining solution around coarse solution:', coarseSolution);
        
        const { xp: coarseXp, gush: coarseGush, quality: coarseQuality, fruitXPTotal: coarseTotalXP, jumpNumber: coarseJump } = coarseSolution;

        Logger.info('Refinement Setup:', {
            'Coarse solution at jump': coarseJump,
            'Coarse solution levels': `(${coarseXp}, ${coarseGush}, ${coarseQuality})`,
            'Coarse solution total XP': coarseTotalXP.toLocaleString(),
            'Target XP': targetFruitXP.toLocaleString(),
            'Jump size': jumpSize,
            'Current levels': currentLevels,
            'Max level': maxLevel
        });
        
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
        
        Logger.info('Refinement Complete:', {
            'Coarse Levels': `(${coarseXp}, ${coarseGush}, ${coarseQuality})`,
            'Refined Levels': `(${refinedSolution.xpLevel}, ${refinedSolution.gushLevel}, ${refinedSolution.qualityLevel})`,
            'Level Reduction': (coarseXp + coarseGush + coarseQuality) - refinedSolution.totalLevels,
            'Refined Total XP': refinedFruitXPTotal.toLocaleString(),
            'Target XP': targetFruitXP.toLocaleString()
        });
        
        Logger.groupEnd();
        return refinedSolution;
    }

    static calculateMaxLevelXP(playerData, maxLevel = MAX_EXTRACTOR_LEVEL) {
        Logger.group('🏆 CALCULATING MAX LEVEL XP', Logger.DEBUG);
        
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
        
        Logger.info('Max Level Calculations:', {
            'Max Level': maxLevel,
            'Single Fruit XP at Max': fruitXPSingle.toLocaleString(),
            'Total Fruit XP at Max': fruitXPTotal.toLocaleString(),
            'Player Fruits Count': playerData.fruitsCount,
            'Extractor Rank': playerData.extractorRank
        });
        
        const result = {
            xpLevel: maxLevel,
            gushLevel: maxLevel,
            qualityLevel: maxLevel,
            totalLevels: maxLevel * 3, // Three stats at max level
            fruitXPSingle: fruitXPSingle,
            fruitXPTotal: fruitXPTotal,
            isMaxLevel: true
        };
        
        Logger.table({
            'Max Level Stats': ['XP Level', 'Gush Level', 'Quality Level', 'Total Levels', 'Single Fruit XP', 'Total Fruit XP'],
            'Values': [
                result.xpLevel,
                result.gushLevel,
                result.qualityLevel,
                result.totalLevels,
                result.fruitXPSingle.toLocaleString(),
                result.fruitXPTotal.toLocaleString()
            ]
        });
        
        Logger.groupEnd();
        return result;
    }

    static compareSolutions(recommendedSingleXP, recommendedTotalXP, maxSingleXP, maxTotalXP) {
        Logger.group('📊 SOLUTION COMPARISON', Logger.DEBUG);
        
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
        
        Logger.info('Comparison Results:', {
            'Single XP Ratio': comparison.singleXPRatio.toFixed(3),
            'Single XP % of Max': comparison.singleXPPercentOfMax,
            'Efficiency Rating': comparison.note,
            'Single XP Difference': comparison.singleXPDifference.toLocaleString(),
            'Total XP Difference': comparison.totalXPDifference.toLocaleString()
        });
        
        Logger.groupEnd();
        return comparison;
    }


}

export { Recommendations };