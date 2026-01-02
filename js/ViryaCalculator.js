import { GameConstants, Realms, RealmMajorTotalXP, timegateLength, REALM_ORDER_MAJOR, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, PERCENTAGE_COMPLETE, PATH_MAIN, PATH_SECONDARY } from './gameData.js';
import { CalculatorUtils } from './utils.js';
import { RealmCalculator } from './RealmCalculator.js';
import { RealmProgressionSimulator } from './RealmProgressionSimulator.js';
import { XPCalculator } from './XPCalculator.js';
import { Logger } from './Logger.js';
class ViryaCalculator {
    static detectScenario(playerData) {
        Logger.group(' ViryaCalculator.detectScenario', Logger.DEBUG);
        Logger.debug('Input:', {
            mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
            secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`
        });

        const pathAnalysis = this.analyzePaths(playerData);
        Logger.debug('Is Main Path 100%+ Late?', pathAnalysis.isMainPath100Late);
        Logger.debug('Realm Analysis:', {
            currentMajorIndex: pathAnalysis.currentMajorIndex,
            currentMajor: playerData.mainPathRealmMajor,
            previousMajor: pathAnalysis.previousMajor
        });

        // Check scenarios in priority order
        const noViryaResult = this.checkNoVirya(pathAnalysis.isMainPath100Late);
        if (noViryaResult) {
            Logger.groupEnd();
            return noViryaResult;
        }

        const halfStepResult = this.checkHalfStep(playerData, pathAnalysis);
        if (halfStepResult) {
            Logger.groupEnd();
            return halfStepResult;
        }

        const perfectResult = this.checkPerfect(playerData);
        if (perfectResult) {
            Logger.groupEnd();
            return perfectResult;
        }

        const eminenceResult = this.checkEminence(playerData, pathAnalysis.previousMajor);
        if (eminenceResult) {
            Logger.groupEnd();
            return eminenceResult;
        }

        // Default: Completion
        Logger.debug('Result: Completion (no absorption bonus)');
        Logger.groupEnd();
        return this.createScenarioResult(SCENARIO_COMPLETION, 0.0, true, 'Eminence');
    }

    static analyzePaths(playerData) {
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= PERCENTAGE_COMPLETE;
        const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
        const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
        const isSecondary100Late = playerData.secondaryPathRealmMinor === 'Late' && playerData.secondaryPathProgress >= PERCENTAGE_COMPLETE;
        const isSameMajor = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor;

        return {
            isMainPath100Late,
            currentMajorIndex,
            previousMajor,
            isSecondary100Late,
            isSameMajor
        };
    }

    static checkNoVirya(isMainPath100Late) {
        if (!isMainPath100Late) {
            Logger.debug('Result: No Virya (main path not at 100%+ Late)');
            return this.createScenarioResult(SCENARIO_NO_VIRYA, 0.0, false, 'N/A');
        }
        return null;
    }

    static checkHalfStep(playerData, pathAnalysis) {
        Logger.debug('Half-Step Check:', {
            isSecondary100Late: pathAnalysis.isSecondary100Late,
            isSameMajor: pathAnalysis.isSameMajor,
            secondaryRealmMinor: playerData.secondaryPathRealmMinor,
            secondaryProgress: playerData.secondaryPathProgress
        });

        if (pathAnalysis.isSecondary100Late && pathAnalysis.isSameMajor) {
            Logger.debug('Result: Half-Step (+0.4 absorption)');
            return this.createScenarioResult(SCENARIO_HALF_STEP, 0.4, true, 'Next major\'s Late');
        }
        return null;
    }

    static checkPerfect(playerData) {
        if (playerData.mainPathRealmMajor === 'Voidbreak') {
            Logger.debug('Perfect Check (Voidbreak special case)');
            if ((playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                    playerData.secondaryPathRealmMinor === 'Mid') ||
                   (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                    playerData.secondaryPathRealmMinor === 'Late' &&
                    playerData.secondaryPathProgress < PERCENTAGE_COMPLETE)) {
                Logger.debug('Result: Perfect (+0.2 absorption)');
                return this.createScenarioResult(SCENARIO_PERFECT, 0.2, true, 'Half-Step');
            }
        } else {
            Logger.debug('Perfect Check (standard)');
            if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                playerData.secondaryPathRealmMinor === 'Early') {
                Logger.debug('Result: Perfect (+0.2 absorption)');
                return this.createScenarioResult(SCENARIO_PERFECT, 0.2, true, 'Half-Step');
            }
        }
        return null;
    }

    static checkEminence(playerData, previousMajor) {
        if (!previousMajor) {
            return null;
        }

        Logger.debug('Eminence Check');
        if (playerData.mainPathRealmMajor === 'Voidbreak') {
            if ((playerData.secondaryPathRealmMajor === previousMajor &&
                playerData.secondaryPathRealmMinor === 'Late') ||
                (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                playerData.secondaryPathRealmMinor === 'Early')) {
                Logger.debug('Result: Eminence (+0.2 absorption)');
                return this.createScenarioResult(SCENARIO_EMINENCE, 0.2, true, 'Perfect');
            }
        } else {
            if (playerData.secondaryPathRealmMajor === previousMajor &&
                (playerData.secondaryPathRealmMinor === 'Mid' || playerData.secondaryPathRealmMinor === 'Late')) {
                Logger.debug('Result: Eminence (+0.2 absorption)');
                return this.createScenarioResult(SCENARIO_EMINENCE, 0.2, true, 'Perfect');
            }
        }
        return null;
    }

    static createScenarioResult(scenario, absorptionBonus, isActive, bonusEndsAt) {
        return {
            scenario,
            absorptionBonus,
            isActive,
            bonusEndsAt
        };
    }
    static calculateDaysToScenario(targetScenario, playerData, mainPathDailyXP, secondaryPathDailyXP) {
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= PERCENTAGE_COMPLETE;
        const currentScenarioInfo = this.detectScenario(playerData);
        const currentScenario = currentScenarioInfo.scenario;

        Logger.group(` Calculating days to ${targetScenario}`, Logger.DEBUG);
        Logger.debug('Player Data:', {
            mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
            secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`
        });
        Logger.debug('Current scenario:', currentScenario);
        Logger.debug('Target scenario:', targetScenario);

        // Define scenario order including "No Virya"
        const currentIndex = VIRYA_SCENARIO_ORDER.indexOf(currentScenario);
        const targetIndex = VIRYA_SCENARIO_ORDER.indexOf(targetScenario);

        Logger.debug('Scenario order:', VIRYA_SCENARIO_ORDER);
        Logger.debug('Current index:', currentIndex, 'Target index:', targetIndex);

        // Check if target is already achieved or passed
        if (targetIndex <= currentIndex) {
            Logger.debug('Already at or beyond target scenario');
            Logger.groupEnd();
            // Determine required path focus for the scenario
            let requiredPathFocus = PATH_MAIN;
            if (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) {
                requiredPathFocus = PATH_SECONDARY;
            }
            return { daysNeeded: 0, xpNeeded: 0, requiredPathFocus };
        }

        // Determine which path needs to be focused for this scenario
        let requiredPathFocus = PATH_MAIN;
        let dailyXPToUse = mainPathDailyXP || 0;
        
        if (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) {
            requiredPathFocus = PATH_SECONDARY;
            // For secondary path scenarios, use secondaryPathDailyXP to match "Player Time to Cultivate" calculation
            dailyXPToUse = secondaryPathDailyXP || 0;
        }

        Logger.debug('Required path focus:', requiredPathFocus);
        Logger.debug('Daily XP to use:', dailyXPToUse);

        // Special handling for "No Virya" to "Completion" transition
        if (currentScenario === SCENARIO_NO_VIRYA && targetScenario === SCENARIO_COMPLETION) {
            Logger.debug('Calculating time from No Virya to Completion');
            // Need to calculate XP for main path to reach 100% Late
            const xpNeeded = this.calculateXPForCompletion(playerData);
            
            if (dailyXPToUse <= 0) {
                Logger.warn('No main path daily XP available');
                Logger.groupEnd();
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus: PATH_MAIN };
            }
            
            const daysNeeded = xpNeeded / dailyXPToUse;
            Logger.debug('Days needed:', daysNeeded);
            Logger.groupEnd();
            return { daysNeeded, xpNeeded, requiredPathFocus: PATH_MAIN };
        }

        // For other transitions, check if we have the required daily XP
        if (dailyXPToUse <= 0) {
            Logger.warn(`No ${requiredPathFocus.toLowerCase()} daily XP available for this transition`);
            Logger.groupEnd();
            return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
        }

        // Calculate XP needed based on target scenario
        let xpNeeded = 0;

        try {
            switch(targetScenario) {
                case SCENARIO_COMPLETION:
                    xpNeeded = this.calculateXPForCompletion(playerData);
                    break;
                case SCENARIO_EMINENCE:
                    xpNeeded = this.calculateXPForEminence(playerData);
                    break;
                case SCENARIO_PERFECT:
                    xpNeeded = this.calculateXPForPerfect(playerData);
                    break;
                case SCENARIO_HALF_STEP:
                    xpNeeded = this.calculateXPForHalfStep(playerData);
                    break;
                default:
                    Logger.warn('Unknown target scenario:', targetScenario);
                    Logger.groupEnd();
                    return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }

            Logger.debug('XP needed:', xpNeeded);

            if (xpNeeded <= 0) {
                Logger.debug('No XP needed (already there)');
                Logger.groupEnd();
                return { daysNeeded: 0, xpNeeded: 0, requiredPathFocus };
            }

            // For secondary path scenarios, calculate days stage-by-stage with proper virya bonuses
            let daysNeeded;
            if (requiredPathFocus === PATH_SECONDARY && (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP)) {
                daysNeeded = this.calculateDaysToScenarioWithBonuses(targetScenario, currentScenario, playerData, xpNeeded, mainPathDailyXP, secondaryPathDailyXP);
            } else {
                daysNeeded = xpNeeded / dailyXPToUse;
            }
            
            Logger.debug('Days needed:', daysNeeded);

            // Safety checks
            if (isNaN(daysNeeded)) {
                Logger.warn('Days needed is NaN');
                Logger.groupEnd();
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }

            if (!isFinite(daysNeeded)) {
                Logger.warn('Days needed is infinite');
                Logger.groupEnd();
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }

            Logger.groupEnd();
            return { daysNeeded, xpNeeded, requiredPathFocus };

        } catch (error) {
            Logger.error('Error calculating days to scenario:', error);
            Logger.groupEnd();
            return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
        }
    }
	static calculateXPForCompletion(playerData) {
		Logger.group(' Calculating XP for Completion scenario', Logger.DEBUG);
		
		// Check if main path is already at 100%+ Late
		const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100;
		
		if (isMainPath100Late) {
			Logger.debug('Main path already at 100%+ Late - Completion requirement met');
			Logger.groupEnd();
			return 0;
		}
		
		// If not, calculate XP needed to reach 100% Late in current major realm
		let xpNeeded = 0;
		
		if (playerData.mainPathRealmMinor === 'Late') {
			// Already in Late, just need to reach 100%
			const realmXP = Realms[playerData.mainPathRealm].xp;
			const currentXP = realmXP * (playerData.mainPathProgress / 100);
			xpNeeded = realmXP - currentXP;
		} else {
			// Need to progress through current major realm to reach 100% Late
			const targetRealm = `${playerData.mainPathRealmMajor} Late`;
			xpNeeded = this.calculateXPToReach(playerData.mainPathRealm, 
											  playerData.mainPathProgress,
											  targetRealm, 100);
		}
		
		Logger.debug('XP needed for Completion:', xpNeeded);
		Logger.groupEnd();
		return xpNeeded;
	} 
    static calculateXPForEminence(playerData) {
		const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
		const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
		const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= PERCENTAGE_COMPLETE;
		
		
		if (playerData.viryaScenario === SCENARIO_EMINENCE || playerData.viryaScenario === SCENARIO_PERFECT || playerData.viryaScenario === SCENARIO_HALF_STEP) {
			return 0;
		} else { 
			let targetRealm;
			if (playerData.mainPathRealmMajor === 'Voidbreak') {
				targetRealm = `${previousMajor} Late`;
			} else {
				targetRealm = `${previousMajor} Mid`;
			}  
			if (!isMainPath100Late) {		
				return this.calculateXPForCompletion(playerData) + this.calculateXPToReach(playerData.secondaryPathRealm, 
										  playerData.secondaryPathProgress,
										  targetRealm, 100) ;
			} else {
			return this.calculateXPToReach(playerData.secondaryPathRealm, 
										  playerData.secondaryPathProgress,
										  targetRealm, 100);
			}	
		}
   }		
    static calculateXPForPerfect(playerData) {
		const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
		const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;


        if (playerData.viryaScenario === SCENARIO_PERFECT || playerData.viryaScenario === SCENARIO_HALF_STEP) {
			return 0;
			} else { 
				let targetRealm;
				if (playerData.mainPathRealmMajor === 'Voidbreak') {
					targetRealm = `${playerData.mainPathRealmMajor} Mid`;
				} else {
					targetRealm = `${playerData.mainPathRealmMajor} Early`;
				}
				
				if (playerData.viryaScenario === SCENARIO_NO_VIRYA || playerData.viryaScenario === SCENARIO_COMPLETION) {
				const eminenceXP = this.calculateXPForEminence(playerData);
				const perfectXP = this.calculateXPToReach(playerData.secondaryPathRealm,
															playerData.secondaryPathProgress,
															targetRealm, 100);
				const totalXP = eminenceXP + perfectXP;
				
				return totalXP;
				} else {
        const perfectXP = this.calculateXPToReach(playerData.secondaryPathRealm,
                                      playerData.secondaryPathProgress,
                                      targetRealm, 100);
        
        return perfectXP;
				}
			}
		}
    static calculateXPForHalfStep(playerData) {
        const targetRealm = `${playerData.mainPathRealmMajor} Late`;
        
		if (playerData.viryaScenario === SCENARIO_NO_VIRYA || playerData.viryaScenario === SCENARIO_COMPLETION || playerData.viryaScenario === SCENARIO_EMINENCE ) {
			const perfectXP = this.calculateXPForPerfect(playerData);
			
			// After reaching Perfect, secondary path is at the Perfect target realm (mainPathRealmMajor Mid/Early)
			// So we need to calculate XP from that position to Half-Step target (mainPathRealmMajor Late)
			let perfectTargetRealm;
			if (playerData.mainPathRealmMajor === 'Voidbreak') {
				perfectTargetRealm = `${playerData.mainPathRealmMajor} Mid`;
			} else {
				perfectTargetRealm = `${playerData.mainPathRealmMajor} Early`;
			}
			
			const halfStepXP = this.calculateXPToReach(perfectTargetRealm,
														100, // After Perfect, we're at 100% of the Perfect target realm
														targetRealm, 100);
			const totalXP = perfectXP + halfStepXP;
			
			return totalXP;
		} else {
			const halfStepXP = this.calculateXPToReach(playerData.secondaryPathRealm,
											playerData.secondaryPathProgress,
										targetRealm, 100);
			
			return halfStepXP;
		}
    }
    static calculateXPToReach(currentRealm, currentProgress, targetRealm, targetProgress) {
		//What is our realm, current xp, and where we are aiming for?
		const currentRealmData = Realms[currentRealm];
		Logger.debug('Current realm:', currentRealm);
        
        // Handle overflow: if progress > 100%, we have overflow XP that should carry to next realm
        const currentRealmXP = currentRealmData.xp;
        let currentXP = currentRealmXP * Math.min(100, currentProgress) / 100; // Cap at 100% for current realm
        let overflowXP = 0;
        
        if (currentProgress > 100) {
            // Calculate overflow XP
            overflowXP = currentRealmXP * (currentProgress - 100) / 100;
            Logger.debug(`Overflow detected: ${overflowXP.toLocaleString()} XP (${currentProgress.toFixed(2)}% progress)`);
        }
        
        const targetRealmData = Realms[targetRealm];
		Logger.debug('Target realm:', targetRealm);
		//finding our position in the arrays
		const currentRealmIndex = RealmCalculator.calculateRealmIndex(currentRealm);
        const targetRealmIndex = RealmCalculator.calculateRealmIndex(targetRealm);
        
        // If we're already past the target realm, no XP needed
        if (currentRealmIndex > targetRealmIndex) {
            Logger.debug('Already past target realm');
            return 0;
        }
        
        // If target is in the same realm, handle overflow
        if (currentRealm === targetRealm) {
            const targetXP = targetRealmData.xp * (targetProgress / 100);
            // If we have overflow, it counts towards the target
            const totalCurrentXP = currentXP + overflowXP;
            if (totalCurrentXP >= targetXP) {
                return 0;
            }
            return Math.max(0, targetXP - totalCurrentXP);
        }
        
		// Calculate XP needed from current position to target realm
		// calculateRealmProgression includes both start and end realms, so we need to account for:
		// 1. We're already at 100% of current realm (or have overflow)
		// 2. We need to reach targetProgress% of target realm
		
		// Calculate total XP from start of current realm to 100% of target realm
		const targetXPTo100 = RealmCalculator.calculateRealmProgression(currentRealmIndex, targetRealmIndex);
		// But we only need targetProgress% of target realm, not 100%
		const targetRealmXP = targetRealmData.xp;
		const targetXP = targetXPTo100 - targetRealmXP + (targetRealmXP * targetProgress / 100);
		
        // We're at 100% of current realm (currentXP = currentRealmXP) plus any overflow
        // The overflow counts towards reaching the target
        const totalCurrentXP = currentXP + overflowXP;
        
        if (totalCurrentXP >= targetXP) {
            return 0;
        }
        return Math.max(0, targetXP - totalCurrentXP);
    }
    
    static calculateMaxNextRealmScenario(targetScenario, playerData, mainPathDailyXPBase, secondaryPathDailyXPBase) {
        Logger.group('🔮 Calculating Max Next Realm Scenario', Logger.DEBUG);
        Logger.debug('Target scenario:', targetScenario);
        Logger.debug('Current player data:', {
            mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
            secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`,
            mainPathMajor: playerData.mainPathRealmMajor
        });
        
        const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
        const nextMajor = currentMajorIndex < REALM_ORDER_MAJOR.length - 1 ? REALM_ORDER_MAJOR[currentMajorIndex + 1] : null;
        
        // Edge case: No next realm (Supreme)
        if (!nextMajor) {
            Logger.debug('No next realm (at Supreme)');
            Logger.groupEnd();
            return 'Next realm not implemented yet';
        }
        
        // Calculate what the secondary path position would be when reaching the target scenario
        // This depends on what scenario we're reaching
        let secondaryPathAtScenario = {
            realm: playerData.secondaryPathRealm,
            major: playerData.secondaryPathRealmMajor,
            minor: playerData.secondaryPathRealmMinor,
            progress: playerData.secondaryPathProgress
        };
        
        // Determine secondary path position when reaching target scenario
        if (targetScenario === SCENARIO_EMINENCE) {
            const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
            if (previousMajor) {
                if (playerData.mainPathRealmMajor === 'Voidbreak') {
                    secondaryPathAtScenario = {
                        realm: `${previousMajor} Late`,
                        major: previousMajor,
                        minor: 'Late',
                        progress: PERCENTAGE_COMPLETE
                    };
                } else {
                    secondaryPathAtScenario = {
                        realm: `${previousMajor} Mid`,
                        major: previousMajor,
                        minor: 'Mid',
                        progress: PERCENTAGE_COMPLETE
                    };
                }
            }
        } else if (targetScenario === SCENARIO_PERFECT) {
            if (playerData.mainPathRealmMajor === 'Voidbreak') {
                secondaryPathAtScenario = {
                    realm: `${playerData.mainPathRealmMajor} Mid`,
                    major: playerData.mainPathRealmMajor,
                    minor: 'Mid',
                    progress: 100
                };
            } else {
                secondaryPathAtScenario = {
                    realm: `${playerData.mainPathRealmMajor} Early`,
                    major: playerData.mainPathRealmMajor,
                    minor: 'Early',
                    progress: 100
                };
            }
        } else if (targetScenario === SCENARIO_HALF_STEP) {
            secondaryPathAtScenario = {
                realm: `${playerData.mainPathRealmMajor} Late`,
                major: playerData.mainPathRealmMajor,
                minor: 'Late',
                progress: 100
            };
        }
        // For Completion, secondary path stays unchanged
        
        Logger.debug('Secondary path when reaching target scenario:', secondaryPathAtScenario);
        
        // Simulate player state at breakthrough after reaching target scenario
        // Main path: Next major Early (0% progress)
        // Secondary path: Position determined above
        const breakthroughPlayerData = {
            ...playerData,
            mainPathRealm: `${nextMajor} Early`,
            mainPathRealmMajor: nextMajor,
            mainPathRealmMinor: 'Early',
            mainPathProgress: 0,
            mainPathExp: 0,
            secondaryPathRealm: secondaryPathAtScenario.realm,
            secondaryPathRealmMajor: secondaryPathAtScenario.major,
            secondaryPathRealmMinor: secondaryPathAtScenario.minor,
            secondaryPathProgress: secondaryPathAtScenario.progress
        };
        
        Logger.debug('Breakthrough state:', {
            mainPath: `${breakthroughPlayerData.mainPathRealm} (${breakthroughPlayerData.mainPathProgress}%)`,
            secondaryPath: `${breakthroughPlayerData.secondaryPathRealm} (${breakthroughPlayerData.secondaryPathProgress}%)`
        });
        
        // Get next timegate length
        const nextTimegateLength = timegateLength[nextMajor] || 0;
        if (nextTimegateLength <= 0) {
            Logger.warn('No timegate length for next major:', nextMajor);
            Logger.groupEnd();
            return '--';
        }
        
        Logger.debug('Next timegate length:', nextTimegateLength);
        
        // Calculate if main path can reach 100% Late in next realm
        const targetRealm = `${nextMajor} Late`;
        const targetRealmXP = Realms[targetRealm]?.xp;
        
        if (!targetRealmXP) {
            Logger.error('Target realm not found:', targetRealm);
            Logger.groupEnd();
            return '--';
        }
        
        // Calculate XP needed to reach 100% Late in next realm
        const xpNeeded = this.calculateXPToReach(
            breakthroughPlayerData.mainPathRealm,
            breakthroughPlayerData.mainPathProgress,
            targetRealm,
            100
        );
        
        Logger.debug('XP needed to reach 100% Late in next realm:', xpNeeded);
        
        // Calculate absorption bonus from target scenario (this becomes "had Virya last realm" bonus)
        // Eminence: 0.2 (expires at the start of Early, so NOT active in Early/Mid/Late)
        // Perfect: 0.2 (active in Early, expires at the start of Mid, so NOT active in Mid/Late)
        // Half-Step: 0.4 (active in Early and Mid, expires at the start of Late, so NOT active in Late)
        // Completion: 0 (no bonus)
        let hadViryaBonus = 0;
        if (targetScenario === SCENARIO_EMINENCE) {
            hadViryaBonus = 0.2;
        } else if (targetScenario === SCENARIO_PERFECT) {
            hadViryaBonus = 0.2;
        } else if (targetScenario === SCENARIO_HALF_STEP) {
            hadViryaBonus = 0.4;
        }
        
        Logger.debug('Had Virya bonus from target scenario:', hadViryaBonus);
        
        // Calculate progression through next realm accounting for "had Virya last realm" bonus
        // The bonus expiration:
        // - Eminence: Expires at the start of Early (no bonus in Early/Mid/Late)
        // - Perfect: Active in Early, expires at the start of Mid (no bonus in Mid/Late)
        // - Half-Step: Active in Early and Mid, expires at the start of Late (no bonus in Late)
        // - Completion: No bonus
        
        // Calculate XP needed for each realm in the next major
        const nextMajorEarly = `${nextMajor} Early`;
        const nextMajorMid = `${nextMajor} Mid`;
        const nextMajorLate = `${nextMajor} Late`;
        
        const earlyXP = Realms[nextMajorEarly]?.xp || 0;
        const midXP = Realms[nextMajorMid]?.xp || 0;
        const lateXP = Realms[nextMajorLate]?.xp || 0;
        
        // Calculate days needed for each realm with appropriate bonus
        let totalDaysNeeded = 0;
        
        // Early realm: bonus is active for Perfect and Half-Step only (Eminence expires at start of Early)
        let earlyBonus = 0;
        if (targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) {
            earlyBonus = hadViryaBonus;
        }
        // Eminence bonus expires at the start of Early, so no bonus for Eminence
        const earlyDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: nextMajorEarly, mainPathRealmMinor: 'Early' },
            earlyBonus
        );
        if (earlyDailyXP <= 0) {
            Logger.warn('No daily XP available for Early realm');
            Logger.groupEnd();
            return '--';
        }
        const daysForEarly = earlyXP / earlyDailyXP;
        totalDaysNeeded += daysForEarly;
        Logger.debug(`Early realm: ${daysForEarly.toFixed(2)} days (with ${earlyBonus * 100}% bonus)`);
        
        // Mid realm: bonus is active for Half-Step only (Perfect expires at start of Mid, Eminence already expired)
        let midBonus = 0;
        if (targetScenario === SCENARIO_HALF_STEP) {
            midBonus = hadViryaBonus;
        }
        const midDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: nextMajorMid, mainPathRealmMinor: 'Mid' },
            midBonus
        );
        if (midDailyXP <= 0) {
            Logger.warn('No daily XP available for Mid realm');
            Logger.groupEnd();
            return '--';
        }
        const daysForMid = midXP / midDailyXP;
        totalDaysNeeded += daysForMid;
        Logger.debug(`Mid realm: ${daysForMid.toFixed(2)} days (with ${midBonus * 100}% bonus)`);
        
        // Late realm: no bonus (all scenario bonuses expire before Late - Eminence expires at start of Early, Perfect expires at start of Mid, Half-Step expires at start of Late)
        const lateDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: nextMajorLate, mainPathRealmMinor: 'Late' },
            0
        );
        if (lateDailyXP <= 0) {
            Logger.warn('No daily XP available for Late realm');
            Logger.groupEnd();
            return '--';
        }
        const daysForLate = lateXP / lateDailyXP;
        totalDaysNeeded += daysForLate;
        Logger.debug(`Late realm: ${daysForLate.toFixed(2)} days (no bonus)`);
        
        Logger.debug('Total days needed to reach 100% Late:', totalDaysNeeded.toFixed(2));
        Logger.debug('Days available (timegate):', nextTimegateLength);
        
        // Check if we can reach 100% Late within timegate
        if (totalDaysNeeded > nextTimegateLength) {
            Logger.debug('Cannot reach 100% Late within timegate');
            Logger.groupEnd();
            return 'Next realm completion misses timegate';
        }
        
        // We can reach 100% Late, now determine maximum scenario based on secondary path position
        // The secondary path can progress during the timegate, so we need to check what's possible
        // Check scenarios in order from highest to lowest: Half-Step, Perfect, Eminence, Completion
        
        // Calculate secondary path daily XP in next realm (no bonus, as we're checking what's possible)
        // Use the secondaryPathDailyXPBase that was passed in, but we need to account for how it changes
        // as the secondary path progresses through realms. For now, use the base value as an approximation.
        // The daily XP will increase as the secondary path progresses, so this is a conservative estimate.
        const secondaryPathPlayerData = {
            ...breakthroughPlayerData,
            mainPathRealm: breakthroughPlayerData.secondaryPathRealm,
            mainPathRealmMajor: breakthroughPlayerData.secondaryPathRealmMajor,
            mainPathRealmMinor: breakthroughPlayerData.secondaryPathRealmMinor,
            mainPathProgress: breakthroughPlayerData.secondaryPathProgress
        };
        const secondaryPathDailyXPCalculated = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, 0);
        
        // Use the provided secondaryPathDailyXPBase, but adjust it based on the secondary path's position
        // The base value is calculated at the current player state, but we're at breakthrough state
        // For a more accurate calculation, we should use the calculated value at breakthrough state
        // However, we need to account for progression. For simplicity, use the calculated value.
        const secondaryPathDailyXP = secondaryPathDailyXPCalculated;
        
        // Check Half-Step: both paths at same major Late 100%
        if (secondaryPathDailyXP > 0) {
            const halfStepTargetRealm = `${nextMajor} Late`;
            const secondaryPathXPNeeded = this.calculateXPToReach(
                breakthroughPlayerData.secondaryPathRealm,
                breakthroughPlayerData.secondaryPathProgress,
                halfStepTargetRealm,
                100
            );
            
            // Calculate daily XP at target realm (more accurate than using starting realm daily XP)
            const targetRealmPlayerData = {
                ...breakthroughPlayerData,
                mainPathRealm: halfStepTargetRealm,
                mainPathRealmMajor: nextMajor,
                mainPathRealmMinor: 'Late',
                mainPathProgress: 100
            };
            const secondaryPathDailyXPAtTarget = XPCalculator.calculateDailyXPWithAbsorptionBonus(targetRealmPlayerData, 0);
            
            // Use average of starting and target daily XP for more accurate calculation
            const averageSecondaryPathDailyXP = (secondaryPathDailyXP + secondaryPathDailyXPAtTarget) / 2;
            const secondaryPathDaysNeeded = secondaryPathXPNeeded / averageSecondaryPathDailyXP;
            
            if (secondaryPathDaysNeeded <= totalDaysNeeded) {
                // Can reach Half-Step
                Logger.debug('Maximum scenario: Half-Step (both paths can reach 100% Late)');
                Logger.groupEnd();
                return 'Half-Step';
            }
        }
        
        // Check Perfect: secondary at same major Early (or Mid for Voidbreak)
        if (secondaryPathDailyXP > 0) {
            let perfectTargetRealm;
            if (nextMajor === 'Voidbreak') {
                perfectTargetRealm = `${nextMajor} Mid`;
            } else {
                perfectTargetRealm = `${nextMajor} Early`;
            }
            const secondaryPathXPNeeded = this.calculateXPToReach(
                breakthroughPlayerData.secondaryPathRealm,
                breakthroughPlayerData.secondaryPathProgress,
                perfectTargetRealm,
                100
            );
            
            // Calculate daily XP at target realm (more accurate than using starting realm daily XP)
            // Daily XP increases as realms progress, so using target realm gives better estimate
            const targetRealmPlayerData = {
                ...breakthroughPlayerData,
                mainPathRealm: perfectTargetRealm,
                mainPathRealmMajor: nextMajor,
                mainPathRealmMinor: perfectTargetRealm.split(' ')[1],
                mainPathProgress: 100
            };
            const secondaryPathDailyXPAtTarget = XPCalculator.calculateDailyXPWithAbsorptionBonus(targetRealmPlayerData, 0);
            
            // Use average of starting and target daily XP for more accurate calculation
            const averageSecondaryPathDailyXP = (secondaryPathDailyXP + secondaryPathDailyXPAtTarget) / 2;
            const secondaryPathDaysNeeded = secondaryPathXPNeeded / averageSecondaryPathDailyXP;
            
            if (secondaryPathDaysNeeded <= totalDaysNeeded) {
                // Can reach Perfect
                Logger.debug('Maximum scenario: Perfect (secondary can reach required position)');
                Logger.groupEnd();
                return 'Perfect';
            }
        }
        
        // Check Eminence: secondary at previous major Mid/Late (or Early for Voidbreak special case)
        if (secondaryPathDailyXP > 0) {
            const previousMajorIndex = REALM_ORDER_MAJOR.indexOf(nextMajor) - 1;
            const previousMajor = previousMajorIndex >= 0 ? REALM_ORDER_MAJOR[previousMajorIndex] : null;
            
            if (previousMajor) {
                // Check all possible positions that qualify for Eminence
                let eminenceTargetRealms = [];
                if (nextMajor === 'Voidbreak') {
                    // Voidbreak special case: previous major Late OR same major Early
                    eminenceTargetRealms = [`${previousMajor} Late`, `${nextMajor} Early`];
                } else {
                    // Standard: previous major Mid OR Late
                    eminenceTargetRealms = [`${previousMajor} Mid`, `${previousMajor} Late`];
                }
                
                let canReachEminence = false;
                let minDaysNeeded = Infinity;
                
                for (const eminenceTargetRealm of eminenceTargetRealms) {
                    const secondaryPathXPNeeded = this.calculateXPToReach(
                        breakthroughPlayerData.secondaryPathRealm,
                        breakthroughPlayerData.secondaryPathProgress,
                        eminenceTargetRealm,
                        100
                    );
                    
                    // Calculate daily XP at target realm (more accurate than using starting realm daily XP)
                    const [targetMajor, targetMinor] = eminenceTargetRealm.split(' ');
                    const targetRealmPlayerData = {
                        ...breakthroughPlayerData,
                        mainPathRealm: eminenceTargetRealm,
                        mainPathRealmMajor: targetMajor,
                        mainPathRealmMinor: targetMinor,
                        mainPathProgress: 100
                    };
                    const secondaryPathDailyXPAtTarget = XPCalculator.calculateDailyXPWithAbsorptionBonus(targetRealmPlayerData, 0);
                    
                    // Use average of starting and target daily XP for more accurate calculation
                    const averageSecondaryPathDailyXP = (secondaryPathDailyXP + secondaryPathDailyXPAtTarget) / 2;
                    const secondaryPathDaysNeeded = secondaryPathXPNeeded / averageSecondaryPathDailyXP;
                    
                    if (secondaryPathDaysNeeded <= totalDaysNeeded && secondaryPathDaysNeeded < minDaysNeeded) {
                        canReachEminence = true;
                        minDaysNeeded = secondaryPathDaysNeeded;
                    }
                }
                
                if (canReachEminence) {
                    // Can reach Eminence
                    Logger.debug('Maximum scenario: Eminence (secondary can reach required position)');
                    Logger.groupEnd();
                    return 'Eminence';
                }
            }
        }
        
        // Default to Completion (main path reaches 100% Late, but secondary path doesn't reach any bonus scenario requirements)
        Logger.debug('Maximum scenario: Completion (only main path reaches 100% Late)');
        Logger.groupEnd();
        return 'Completion';
    }
    
    static calculateDaysToScenarioWithBonuses(targetScenario, currentScenario, playerData, totalXPNeeded, mainPathDailyXP, baseSecondaryPathDailyXP) {
        // Calculate days needed by breaking down progression into stages matching the XP calculation structure
        // Each stage uses the correct virya bonus that's active during that progression
        
        if (baseSecondaryPathDailyXP <= 0) {
            return Infinity;
        }
        
        // Check if main path needs to reach Completion first (required for Eminence/Perfect/Half-Step)
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= PERCENTAGE_COMPLETE;
        let totalDays = 0;
        
        // If main path is not at 100% Late, we need to add Completion time first
        // Completion requires MAIN path focus, not secondary path
        if (!isMainPath100Late && (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP)) {
            // Calculate days to reach Completion (main path focus)
            if (mainPathDailyXP > 0) {
                const completionXP = this.calculateXPForCompletion(playerData);
                if (completionXP > 0) {
                    // Calculate days accounting for main path realm progression
                    const completionDays = this.calculateDaysForMainPathStage(
                        playerData.mainPathRealm,
                        playerData.mainPathProgress,
                        `${playerData.mainPathRealmMajor} Late`,
                        100,
                        playerData
                    );
                    totalDays += completionDays;
                }
            }
        }
        
        // Scenario bonuses: bonus active when IN that scenario (used when progressing FROM that scenario)
        const scenarioBonuses = {
            [SCENARIO_EMINENCE]: 0.2,
            [SCENARIO_PERFECT]: 0.2,
            [SCENARIO_HALF_STEP]: 0.4
        };
        
        let currentRealm = playerData.secondaryPathRealm;
        let currentProgress = playerData.secondaryPathProgress;
        let currentBonus = 0; // Bonus active at current position
        
        // Break down progression based on target scenario
        if (targetScenario === SCENARIO_EMINENCE) {
            // Stage: Current → Eminence (no bonus active)
            const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
            const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
            
            if (previousMajor) {
                const targetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${previousMajor} Late` 
                    : `${previousMajor} Mid`;
                const stageXP = this.calculateXPToReach(currentRealm, currentProgress, targetRealm, 100);
                const stageDays = this.calculateDaysForStage(currentRealm, currentProgress, targetRealm, currentBonus, playerData);
                totalDays += stageDays;
            }
        } else if (targetScenario === SCENARIO_PERFECT) {
            // Stage 1: Current → Eminence (no bonus)
            // Stage 2: Eminence → Perfect (0.2 bonus from Eminence)
            const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
            const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
            
            if (previousMajor) {
                // Stage 1: to Eminence
                const eminenceTargetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${previousMajor} Late` 
                    : `${previousMajor} Mid`;
                const eminenceXP = this.calculateXPToReach(currentRealm, currentProgress, eminenceTargetRealm, 100);
                if (eminenceXP > 0) {
                    const eminenceDays = this.calculateDaysForStage(currentRealm, currentProgress, eminenceTargetRealm, currentBonus, playerData);
                    totalDays += eminenceDays;
                    currentRealm = eminenceTargetRealm;
                    currentProgress = 100;
                    currentBonus = scenarioBonuses[SCENARIO_EMINENCE];
                }
                
                // Stage 2: to Perfect
                const perfectTargetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${playerData.mainPathRealmMajor} Mid` 
                    : `${playerData.mainPathRealmMajor} Early`;
                const perfectXP = this.calculateXPToReach(currentRealm, currentProgress, perfectTargetRealm, 100);
                if (perfectXP > 0) {
                    const perfectDays = this.calculateDaysForStage(currentRealm, currentProgress, perfectTargetRealm, currentBonus, playerData);
                    totalDays += perfectDays;
                }
            }
        } else if (targetScenario === SCENARIO_HALF_STEP) {
            // Stage 1: Current → Eminence (no bonus)
            // Stage 2: Eminence → Perfect (0.2 bonus from Eminence)
            // Stage 3: Perfect → Half-Step (0.2 bonus from Perfect)
            const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
            const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
            
            if (previousMajor) {
                // Stage 1: to Eminence
                const eminenceTargetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${previousMajor} Late` 
                    : `${previousMajor} Mid`;
                const eminenceXP = this.calculateXPToReach(currentRealm, currentProgress, eminenceTargetRealm, 100);
                if (eminenceXP > 0) {
                    const eminenceDays = this.calculateDaysForStage(currentRealm, currentProgress, eminenceTargetRealm, currentBonus, playerData);
                    totalDays += eminenceDays;
                    currentRealm = eminenceTargetRealm;
                    currentProgress = 100;
                    currentBonus = scenarioBonuses[SCENARIO_EMINENCE];
                }
                
                // Stage 2: to Perfect
                const perfectTargetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${playerData.mainPathRealmMajor} Mid` 
                    : `${playerData.mainPathRealmMajor} Early`;
                const perfectXP = this.calculateXPToReach(currentRealm, currentProgress, perfectTargetRealm, 100);
                if (perfectXP > 0) {
                    const perfectDays = this.calculateDaysForStage(currentRealm, currentProgress, perfectTargetRealm, currentBonus, playerData);
                    totalDays += perfectDays;
                    currentRealm = perfectTargetRealm;
                    currentProgress = 100;
                    currentBonus = scenarioBonuses[SCENARIO_PERFECT];
                }
                
                // Stage 3: to Half-Step
                const halfStepTargetRealm = `${playerData.mainPathRealmMajor} Late`;
                const halfStepXP = this.calculateXPToReach(currentRealm, currentProgress, halfStepTargetRealm, 100);
                if (halfStepXP > 0) {
                    const halfStepDays = this.calculateDaysForStage(currentRealm, currentProgress, halfStepTargetRealm, currentBonus, playerData);
                    totalDays += halfStepDays;
                }
            }
        }
        
        return totalDays;
    }
    
    static calculateDaysForStage(startRealm, startProgress, endRealm, bonusActive, playerData) {
        // Calculate days needed for a single stage (secondary path), accounting for realm progression
        // Uses average of daily XP at start and end of stage
        
        const [startMajor, startMinor] = startRealm.split(' ');
        const startPlayerData = {
            ...playerData,
            mainPathRealm: startRealm,
            mainPathRealmMajor: startMajor,
            mainPathRealmMinor: startMinor,
            mainPathProgress: startProgress
        };
        const startDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(startPlayerData, bonusActive);
        
        const [endMajor, endMinor] = endRealm.split(' ');
        const endPlayerData = {
            ...playerData,
            mainPathRealm: endRealm,
            mainPathRealmMajor: endMajor,
            mainPathRealmMinor: endMinor,
            mainPathProgress: 100
        };
        const endDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(endPlayerData, bonusActive);
        
        // Average accounts for daily XP increasing as realm progresses
        const averageDailyXP = (startDailyXP + endDailyXP) / 2;
        
        if (averageDailyXP <= 0) {
            return Infinity;
        }
        
        const stageXP = this.calculateXPToReach(startRealm, startProgress, endRealm, 100);
        return stageXP / averageDailyXP;
    }
    
    static calculateDaysForMainPathStage(startRealm, startProgress, endRealm, endProgress, playerData) {
        // Calculate days needed for a main path stage, accounting for realm progression
        // Uses average of daily XP at start and end of stage
        
        const [startMajor, startMinor] = startRealm.split(' ');
        const startPlayerData = {
            ...playerData,
            mainPathRealm: startRealm,
            mainPathRealmMajor: startMajor,
            mainPathRealmMinor: startMinor,
            mainPathProgress: startProgress
        };
        const viryaInfo = this.detectScenario(startPlayerData);
        const startDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(startPlayerData, viryaInfo.absorptionBonus);
        
        const [endMajor, endMinor] = endRealm.split(' ');
        const endPlayerData = {
            ...playerData,
            mainPathRealm: endRealm,
            mainPathRealmMajor: endMajor,
            mainPathRealmMinor: endMinor,
            mainPathProgress: endProgress
        };
        const endViryaInfo = this.detectScenario(endPlayerData);
        const endDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(endPlayerData, endViryaInfo.absorptionBonus);
        
        // Average accounts for daily XP increasing as realm progresses
        const averageDailyXP = (startDailyXP + endDailyXP) / 2;
        
        if (averageDailyXP <= 0) {
            return Infinity;
        }
        
        const stageXP = this.calculateXPToReach(startRealm, startProgress, endRealm, endProgress);
        return stageXP / averageDailyXP;
    }
}

export { ViryaCalculator };