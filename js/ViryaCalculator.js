import { GameConstants, Realms, RealmMajorTotalXP, timegateLength, REALM_ORDER_MAJOR, VIRYA_SCENARIO_ORDER, SCENARIO_NO_VIRYA, SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP, PERCENTAGE_COMPLETE, PATH_MAIN, PATH_SECONDARY, XPData } from './gameData.js';
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
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:181',message:'Before scenario XP selection',data:{targetScenario,mainPathDailyXP,secondaryPathDailyXP},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        if (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) {
            requiredPathFocus = PATH_SECONDARY;
            // For secondary path scenarios in Virya table, use mainPathDailyXP to match Completion
            // This ensures Completion and Eminence show the same time when they should match
            dailyXPToUse = mainPathDailyXP || 0;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:186',message:'Secondary path scenario - using mainPathDailyXP for consistency',data:{targetScenario,dailyXPToUse,mainPathDailyXP,secondaryPathDailyXP},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
            // #endregion
        } else {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:190',message:'Main path scenario - using mainPathDailyXP',data:{targetScenario,dailyXPToUse,mainPathDailyXP},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
            // #endregion
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

        // Ensure main path is at 100% Late for all virya scenarios (Eminence, Perfect, Half-Step)
        // Completion is required first for these scenarios
        if ((targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) && !isMainPath100Late) {
            Logger.debug('Main path must reach 100% Late first for virya scenarios');
            // The calculateXPFor* functions already include Completion XP, so we can proceed
            // But we should log this requirement
        }

        // Calculate XP needed based on target scenario
        let xpNeeded = 0;

        try {
            switch(targetScenario) {
                case SCENARIO_COMPLETION:
                    xpNeeded = this.calculateXPForCompletion(playerData);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:234',message:'Completion XP needed',data:{targetScenario,xpNeeded,dailyXPToUse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
                    // #endregion
                    break;
                case SCENARIO_EMINENCE:
                    xpNeeded = this.calculateXPForEminence(playerData);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:238',message:'Eminence XP needed',data:{targetScenario,xpNeeded,dailyXPToUse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
                    // #endregion
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:258',message:'XP needed calculated',data:{targetScenario,xpNeeded,dailyXPToUse,requiredPathFocus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
            // #endregion

            if (xpNeeded <= 0) {
                Logger.debug('No XP needed (already there)');
                Logger.groupEnd();
                return { daysNeeded: 0, xpNeeded: 0, requiredPathFocus };
            }

            // For secondary path scenarios, calculate days stage-by-stage with proper virya bonuses
            // However, if the secondary path requirement is already met, we only need main path progression,
            // so use simple calculation
            let daysNeeded;
            let isSecondaryRequirementMet = false;
            if (targetScenario === SCENARIO_EMINENCE) {
                // Eminence requirement met if XP equals Completion XP
                isSecondaryRequirementMet = xpNeeded === this.calculateXPForCompletion(playerData);
            } else if (targetScenario === SCENARIO_PERFECT) {
                // Perfect requirement met if XP equals Eminence XP
                isSecondaryRequirementMet = xpNeeded === this.calculateXPForEminence(playerData);
            } else if (targetScenario === SCENARIO_HALF_STEP) {
                // Half-Step requirement met if XP equals Perfect XP
                isSecondaryRequirementMet = xpNeeded === this.calculateXPForPerfect(playerData);
            }
            
            if (requiredPathFocus === PATH_SECONDARY && (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) && !isSecondaryRequirementMet) {
                daysNeeded = this.calculateDaysToScenarioWithBonuses(targetScenario, currentScenario, playerData, xpNeeded, mainPathDailyXP, secondaryPathDailyXP);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:268',message:'Secondary scenario days calculated with bonuses',data:{targetScenario,xpNeeded,daysNeeded,mainPathDailyXP,secondaryPathDailyXP,isSecondaryRequirementMet},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'I'})}).catch(()=>{});
                // #endregion
            } else {
                daysNeeded = xpNeeded / dailyXPToUse;
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:272',message:'Simple days calculation',data:{targetScenario,xpNeeded,dailyXPToUse,daysNeeded,isSecondaryRequirementMet},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'I'})}).catch(()=>{});
                // #endregion
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
		
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:330',message:'calculateXPForEminence entry',data:{mainPathRealmMajor:playerData.mainPathRealmMajor,previousMajor,isMainPath100Late,viryaScenario:playerData.viryaScenario,secondaryPathRealm:playerData.secondaryPathRealm,secondaryPathProgress:playerData.secondaryPathProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
		// #endregion
		
		if (playerData.viryaScenario === SCENARIO_EMINENCE || playerData.viryaScenario === SCENARIO_PERFECT || playerData.viryaScenario === SCENARIO_HALF_STEP) {
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:337',message:'Already at Eminence or beyond',data:{viryaScenario:playerData.viryaScenario},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
			// #endregion
			return 0;
		} else { 
			let targetRealm;
			if (playerData.mainPathRealmMajor === 'Voidbreak') {
				targetRealm = `${previousMajor} Late`;
			} else {
				targetRealm = `${previousMajor} Mid`;
			}
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:343',message:'Eminence target realm',data:{targetRealm,previousMajor,isMainPath100Late},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
			// #endregion
			if (!isMainPath100Late) {
				const completionXP = this.calculateXPForCompletion(playerData);
				// Check if secondary path requirement is already met
				// Eminence requires secondary at previous major Mid or Late (not necessarily 100%)
				const isSecondaryPathRequirementMet = playerData.secondaryPathRealmMajor === previousMajor && 
					((playerData.mainPathRealmMajor === 'Voidbreak' && playerData.secondaryPathRealmMinor === 'Late') ||
					 (playerData.mainPathRealmMajor === 'Voidbreak' && playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor && playerData.secondaryPathRealmMinor === 'Early') ||
					 (playerData.mainPathRealmMajor !== 'Voidbreak' && (playerData.secondaryPathRealmMinor === 'Mid' || playerData.secondaryPathRealmMinor === 'Late')));
				
				let secondaryXP = 0;
				if (!isSecondaryPathRequirementMet) {
					// Only calculate secondary XP if requirement is not already met
					secondaryXP = this.calculateXPToReach(playerData.secondaryPathRealm, 
											  playerData.secondaryPathProgress,
											  targetRealm, 0);
				}
				const totalXP = completionXP + secondaryXP;
				// #region agent log
				fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViryaCalculator.js:348',message:'Eminence XP breakdown',data:{completionXP,secondaryXP,totalXP,isSecondaryPathRequirementMet,targetRealm,secondaryPathRealm:playerData.secondaryPathRealm,secondaryPathProgress:playerData.secondaryPathProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'J'})}).catch(()=>{});
				// #endregion
				return totalXP;
			} else {
			return this.calculateXPToReach(playerData.secondaryPathRealm, 
										  playerData.secondaryPathProgress,
										  targetRealm, 0);
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
				
				// Check if Perfect requirement is already met
				// Perfect requires secondary at mainPathRealmMajor Early (or Mid for Voidbreak), not necessarily 100%
				const isPerfectRequirementMet = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
					((playerData.mainPathRealmMajor === 'Voidbreak' && playerData.secondaryPathRealmMinor === 'Mid') ||
					 (playerData.mainPathRealmMajor === 'Voidbreak' && playerData.secondaryPathRealmMinor === 'Late' && playerData.secondaryPathProgress < PERCENTAGE_COMPLETE) ||
					 (playerData.mainPathRealmMajor !== 'Voidbreak' && playerData.secondaryPathRealmMinor === 'Early'));
				
				if (playerData.viryaScenario === SCENARIO_NO_VIRYA || playerData.viryaScenario === SCENARIO_COMPLETION) {
				const eminenceXP = this.calculateXPForEminence(playerData);
				let perfectXP = 0;
				if (!isPerfectRequirementMet) {
					// Only calculate secondary XP if requirement is not already met
					perfectXP = this.calculateXPToReach(playerData.secondaryPathRealm,
															playerData.secondaryPathProgress,
															targetRealm, 0);
				}
				const totalXP = eminenceXP + perfectXP;
				
				return totalXP;
				} else {
				let perfectXP = 0;
				if (!isPerfectRequirementMet) {
					// Only calculate secondary XP if requirement is not already met
					perfectXP = this.calculateXPToReach(playerData.secondaryPathRealm,
										playerData.secondaryPathProgress,
										targetRealm, 0);
				}
        
				return perfectXP;
				}
			}
		}
    static calculateXPForHalfStep(playerData) {
        const targetRealm = `${playerData.mainPathRealmMajor} Late`;
        
		// Check if Half-Step requirement is already met
		// Half-Step requires secondary at mainPathRealmMajor Late at 100%
		const isHalfStepRequirementMet = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
			playerData.secondaryPathRealmMinor === 'Late' &&
			playerData.secondaryPathProgress >= PERCENTAGE_COMPLETE;
        
		if (playerData.viryaScenario === SCENARIO_NO_VIRYA || playerData.viryaScenario === SCENARIO_COMPLETION || playerData.viryaScenario === SCENARIO_EMINENCE ) {
			const perfectXP = this.calculateXPForPerfect(playerData);
			
			let halfStepXP = 0;
			if (!isHalfStepRequirementMet) {
				// Only calculate secondary XP if requirement is not already met
				// After reaching Perfect, secondary path is at the Perfect target realm (mainPathRealmMajor Mid/Early)
				// So we need to calculate XP from that position to Half-Step target (mainPathRealmMajor Late)
				let perfectTargetRealm;
				if (playerData.mainPathRealmMajor === 'Voidbreak') {
					perfectTargetRealm = `${playerData.mainPathRealmMajor} Mid`;
				} else {
					perfectTargetRealm = `${playerData.mainPathRealmMajor} Early`;
				}
				
				halfStepXP = this.calculateXPToReach(perfectTargetRealm,
														100, // After Perfect, we're at 100% of the Perfect target realm
														targetRealm, 100);
			}
			const totalXP = perfectXP + halfStepXP;
			
			return totalXP;
		} else {
			let halfStepXP = 0;
			if (!isHalfStepRequirementMet) {
				// Only calculate secondary XP if requirement is not already met
				halfStepXP = this.calculateXPToReach(playerData.secondaryPathRealm,
											playerData.secondaryPathProgress,
										targetRealm, 100);
			}
			
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
            const xpNeeded = totalCurrentXP >= targetXP ? 0 : Math.max(0, targetXP - totalCurrentXP);
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
        
        const xpNeeded = totalCurrentXP >= targetXP ? 0 : Math.max(0, targetXP - totalCurrentXP);
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
        
        // Safety check: Validate current major is in the realm order
        if (currentMajorIndex === -1) {
            Logger.error('Current major realm not found in REALM_ORDER_MAJOR:', playerData.mainPathRealmMajor);
            Logger.groupEnd();
            return 'Invalid current realm';
        }
        
        // Safety check: Ensure we only calculate for the immediate next realm (exactly one step ahead)
        const nextMajorIndex = currentMajorIndex + 1;
        if (nextMajorIndex >= REALM_ORDER_MAJOR.length) {
            Logger.debug('No next realm (at Supreme)');
            Logger.groupEnd();
            return 'Next realm not implemented yet';
        }
        
        const nextMajor = REALM_ORDER_MAJOR[nextMajorIndex];
        
        // Safety check: Verify nextMajor is exactly one step ahead
        if (nextMajorIndex !== currentMajorIndex + 1) {
            Logger.error('Realm progression error: nextMajorIndex should be exactly currentMajorIndex + 1', {
                currentMajorIndex,
                nextMajorIndex,
                currentMajor: playerData.mainPathRealmMajor,
                nextMajor
            });
            Logger.groupEnd();
            return 'Realm progression error';
        }
        
        Logger.debug('Realm progression validation:', {
            'Current major': playerData.mainPathRealmMajor,
            'Current index': currentMajorIndex,
            'Next major': nextMajor,
            'Next index': nextMajorIndex,
            'Validated': nextMajorIndex === currentMajorIndex + 1
        });
        
        // ===== Use overflow calculation logic to determine breakthrough timing =====
        // Recalculate daily XP values based on current player state
        const currentViryaInfo = this.detectScenario(playerData);
        const currentMainPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(playerData, currentViryaInfo.absorptionBonus);
        
        // Calculate secondary path daily XP based on current player state
        let currentSecondaryPathDailyXP = 0;
        if (playerData.secondaryPathRealm && playerData.secondaryPathRealmMajor) {
            const realmXPKey = playerData.secondaryPathRealmMajor + "XP";
            if (XPData[realmXPKey]) {
                const secondaryPathPlayerData = {
                    ...playerData,
                    mainPathRealm: playerData.secondaryPathRealm,
                    mainPathRealmMajor: playerData.secondaryPathRealmMajor,
                    mainPathRealmMinor: playerData.secondaryPathRealmMinor
                };
                currentSecondaryPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, currentViryaInfo.absorptionBonus);
            }
        }
        
        const currentScenario = currentViryaInfo.scenario;
        const currentIndex = VIRYA_SCENARIO_ORDER.indexOf(currentScenario);
        const targetIndex = VIRYA_SCENARIO_ORDER.indexOf(targetScenario);
        
        // Get timegate information
        const currentTimegateDays = playerData.timegateDays || 0;
        const nextTimegateLength = timegateLength[nextMajor] || 0;
        
        if (nextTimegateLength <= 0) {
            Logger.warn('No timegate length for next major:', nextMajor);
            Logger.groupEnd();
            return '--';
        }
        
        // Calculate days to reach scenario (Phase 1 from overflow calculation)
        let daysToReach = 0;
        if (targetIndex > currentIndex) {
            const daysToReachInfo = this.calculateDaysToScenario(targetScenario, playerData, currentMainPathDailyXP, currentSecondaryPathDailyXP);
            daysToReach = daysToReachInfo?.daysNeeded || Infinity;
            
            if (daysToReach === Infinity) {
                Logger.warn('Cannot reach target scenario');
                Logger.groupEnd();
                return 'Cannot reach scenario';
            }
        } else {
            // Already at or past scenario
            daysToReach = 0;
        }
        
        // Breakthrough happens when BOTH conditions are met: scenario reached AND timegate ended
        // Breakthrough time = max(daysToReach, currentTimegateDays)
        const breakthroughTime = Math.max(daysToReach, currentTimegateDays);
        const daysAvailableInNextRealm = nextTimegateLength;
        
        Logger.debug('Breakthrough timing:', {
            'Days to reach scenario': daysToReach.toFixed(2),
            'Current timegate days remaining': currentTimegateDays.toFixed(2),
            'Breakthrough time': breakthroughTime.toFixed(2),
            'Days available in next realm': daysAvailableInNextRealm.toFixed(2)
        });
        
        // ===== Simulate Phase 2: XP after reaching scenario until breakthrough =====
        // This is needed to get the overflow conversion state (Phase 2 overflow XP converts to next realm progress)
        let phase2Result = null;
        let phase2OverflowConverted = false;
        
        // Calculate days available after reaching scenario until breakthrough
        const daysAfterScenarioUntilBreakthrough = targetIndex > currentIndex 
            ? Math.max(0, breakthroughTime - daysToReach)
            : Math.max(0, breakthroughTime);
        
        if (daysAfterScenarioUntilBreakthrough > 0) {
            // Determine Phase 2 starting state (at 100% Late in current major)
            const currentLateRealm = `${playerData.mainPathRealmMajor} Late`;
            const currentLateRealmXP = Realms[currentLateRealm]?.xp || 0;
            
            const phase2PlayerData = {
                ...playerData,
                mainPathRealm: currentLateRealm,
                mainPathRealmMajor: playerData.mainPathRealmMajor,
                mainPathRealmMinor: 'Late',
                mainPathProgress: 100,
                mainPathExp: currentLateRealmXP,
                cosmoapsisValue: undefined
            };
            
            // Calculate daily XP with target scenario bonus
            let targetScenarioBonus = 0;
            if (targetScenario === SCENARIO_EMINENCE || targetScenario === SCENARIO_PERFECT) {
                targetScenarioBonus = 0.2;
            } else if (targetScenario === SCENARIO_HALF_STEP) {
                targetScenarioBonus = 0.4;
            }
            const phase2DailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(phase2PlayerData, targetScenarioBonus);
            
            // Simulate Phase 2 (overflow XP in current realm)
            const phase2Simulator = new RealmProgressionSimulator(phase2PlayerData, phase2DailyXP, 'max-next-realm-phase2');
            phase2Result = phase2Simulator.simulateDays(
                daysAfterScenarioUntilBreakthrough,
                targetScenarioBonus,
                null, // No bonus end condition during overflow
                currentLateRealm // Max realm is current Late (just overflow)
            );
            
            // Check if Phase 2 overflow was converted to next realm
            if (phase2Result.finalRealm && phase2Result.finalRealm.startsWith(nextMajor)) {
                phase2OverflowConverted = true;
            }
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
        // Eminence and Perfect require 0% of target realm (just reaching it), Half-Step requires 100%
        if (targetScenario === SCENARIO_EMINENCE) {
            const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
            if (previousMajor) {
                if (playerData.mainPathRealmMajor === 'Voidbreak') {
                    secondaryPathAtScenario = {
                        realm: `${previousMajor} Late`,
                        major: previousMajor,
                        minor: 'Late',
                        progress: 0
                    };
                } else {
                    secondaryPathAtScenario = {
                        realm: `${previousMajor} Mid`,
                        major: previousMajor,
                        minor: 'Mid',
                        progress: 0
                    };
                }
            }
        } else if (targetScenario === SCENARIO_PERFECT) {
            if (playerData.mainPathRealmMajor === 'Voidbreak') {
                secondaryPathAtScenario = {
                    realm: `${playerData.mainPathRealmMajor} Mid`,
                    major: playerData.mainPathRealmMajor,
                    minor: 'Mid',
                    progress: 0
                };
            } else {
                secondaryPathAtScenario = {
                    realm: `${playerData.mainPathRealmMajor} Early`,
                    major: playerData.mainPathRealmMajor,
                    minor: 'Early',
                    progress: 0
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
        
        // Check if secondary path is already beyond the requirement
        const currentSecondaryRealmIndex = RealmCalculator.calculateRealmIndex(playerData.secondaryPathRealm);
        const requiredSecondaryRealmIndex = RealmCalculator.calculateRealmIndex(secondaryPathAtScenario.realm);
        const isSecondaryBeyondRequirement = currentSecondaryRealmIndex > requiredSecondaryRealmIndex || 
            (currentSecondaryRealmIndex === requiredSecondaryRealmIndex && 
             playerData.secondaryPathProgress > secondaryPathAtScenario.progress);
        
        // If secondary path is already beyond the requirement, use the current position instead
        if (isSecondaryBeyondRequirement) {
            secondaryPathAtScenario = {
                realm: playerData.secondaryPathRealm,
                major: playerData.secondaryPathRealmMajor,
                minor: playerData.secondaryPathRealmMinor,
                progress: playerData.secondaryPathProgress
            };
            Logger.debug('Secondary path already beyond requirement, using current position:', secondaryPathAtScenario);
        }
        
        Logger.debug('Secondary path when reaching target scenario:', secondaryPathAtScenario);
        
        // Simulate player state at breakthrough after reaching target scenario
        // IMPORTANT: If Phase 2 had overflow XP, the simulator converts it to next realm progress
        // We should use the converted state from Phase 2, not start at 0% Early
        let breakthroughPlayerData;
        
        if (phase2OverflowConverted && phase2Result) {
            // Phase 2 overflow was converted to next realm - use that state
            const phase2FinalRealm = phase2Result.finalRealm;
            const phase2FinalProgress = phase2Result.finalProgress;
            const [major, minor] = phase2FinalRealm.split(' ');
            const phase2FinalRealmXP = Realms[phase2FinalRealm]?.xp || 0;
            const phase2FinalExp = (phase2FinalRealmXP * phase2FinalProgress) / 100;
            
            breakthroughPlayerData = {
                ...playerData,
                mainPathRealm: phase2FinalRealm,
                mainPathRealmMajor: major,
                mainPathRealmMinor: minor,
                mainPathProgress: phase2FinalProgress,
                mainPathExp: phase2FinalExp,
                secondaryPathRealm: secondaryPathAtScenario.realm,
                secondaryPathRealmMajor: secondaryPathAtScenario.major,
                secondaryPathRealmMinor: secondaryPathAtScenario.minor,
                secondaryPathProgress: secondaryPathAtScenario.progress,
                cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
            };
            
            Logger.debug('Using Phase 2 overflow conversion for breakthrough state:', {
                'Phase 2 final realm': phase2FinalRealm,
                'Phase 2 final progress': `${phase2FinalProgress.toFixed(2)}%`,
                'Phase 2 final XP': phase2FinalExp.toLocaleString()
            });
        } else {
            // No Phase 2 overflow conversion - start at 0% Early
            breakthroughPlayerData = {
                ...playerData,
                mainPathRealm: `${nextMajor} Early`,
                mainPathRealmMajor: nextMajor,
                mainPathRealmMinor: 'Early',
                mainPathProgress: 0,
                mainPathExp: 0,
                secondaryPathRealm: secondaryPathAtScenario.realm,
                secondaryPathRealmMajor: secondaryPathAtScenario.major,
                secondaryPathRealmMinor: secondaryPathAtScenario.minor,
                secondaryPathProgress: secondaryPathAtScenario.progress,
                cosmoapsisValue: undefined // Clear stored value so it's recalculated with new bonus
            };
        }
        
        // Safety check: Verify breakthrough state is set to the immediate next realm only
        const breakthroughMajorIndex = REALM_ORDER_MAJOR.indexOf(breakthroughPlayerData.mainPathRealmMajor);
        if (breakthroughMajorIndex !== nextMajorIndex) {
            Logger.error('Breakthrough state validation error: mainPathRealmMajor should be nextMajor', {
                expectedMajor: nextMajor,
                expectedIndex: nextMajorIndex,
                actualMajor: breakthroughPlayerData.mainPathRealmMajor,
                actualIndex: breakthroughMajorIndex,
                'Phase 2 overflow converted': phase2OverflowConverted
            });
            Logger.groupEnd();
            return 'Breakthrough state validation error';
        }
        
        // Safety check: Verify breakthrough realm is in next major (can be Early, Mid, or Late if overflow converted)
        if (!breakthroughPlayerData.mainPathRealm.startsWith(nextMajor)) {
            Logger.error('Breakthrough realm validation error:', {
                expectedMajor: nextMajor,
                actualRealm: breakthroughPlayerData.mainPathRealm,
                'Phase 2 overflow converted': phase2OverflowConverted
            });
            Logger.groupEnd();
            return 'Breakthrough realm validation error';
        }
        
        Logger.debug('Breakthrough state (validated):', {
            mainPath: `${breakthroughPlayerData.mainPathRealm} (${breakthroughPlayerData.mainPathProgress}%)`,
            secondaryPath: `${breakthroughPlayerData.secondaryPathRealm} (${breakthroughPlayerData.secondaryPathProgress}%)`,
            'Realm index': breakthroughMajorIndex,
            'Expected index': nextMajorIndex
        });
        
        // ===== Check scenarios in ascending order: Completion → Eminence → Perfect → Half-Step =====
        // Calculate daily XP at breakthrough state (accounting for "had Virya last realm" bonus)
        // Calculate absorption bonus from target scenario (this becomes "had Virya last realm" bonus)
        let hadViryaBonus = 0;
        if (targetScenario === SCENARIO_EMINENCE) {
            hadViryaBonus = 0.2;
        } else if (targetScenario === SCENARIO_PERFECT) {
            hadViryaBonus = 0.2;
        } else if (targetScenario === SCENARIO_HALF_STEP) {
            hadViryaBonus = 0.4;
        }
        
        Logger.debug('Had Virya bonus from target scenario:', hadViryaBonus);
        
        // Calculate main path daily XP at breakthrough state (next major Early, 0% progress)
        // The "had Virya last realm" bonus expiration:
        // - Eminence: Expires at the start of Early (no bonus in Early/Mid/Late)
        // - Perfect: Active in Early, expires at the start of Mid (no bonus in Mid/Late)
        // - Half-Step: Active in Early and Mid, expires at the start of Late (no bonus in Late)
        // - Completion: No bonus
        let earlyBonus = 0;
        if (targetScenario === SCENARIO_PERFECT || targetScenario === SCENARIO_HALF_STEP) {
            earlyBonus = hadViryaBonus;
        }
        
        const breakthroughMainPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: `${nextMajor} Early`, mainPathRealmMinor: 'Early' },
            earlyBonus
        );
        
        // Calculate secondary path daily XP at breakthrough state
        const secondaryPathPlayerData = {
            ...breakthroughPlayerData,
            mainPathRealm: breakthroughPlayerData.secondaryPathRealm,
            mainPathRealmMajor: breakthroughPlayerData.secondaryPathRealmMajor,
            mainPathRealmMinor: breakthroughPlayerData.secondaryPathRealmMinor,
            mainPathProgress: breakthroughPlayerData.secondaryPathProgress
        };
        const breakthroughSecondaryPathDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(secondaryPathPlayerData, 0);
        
        Logger.debug('Daily XP at breakthrough:', {
            'Main path': breakthroughMainPathDailyXP.toLocaleString(),
            'Secondary path': breakthroughSecondaryPathDailyXP.toLocaleString()
        });
        
        // Check scenarios in ascending order
        const scenariosToCheck = [SCENARIO_COMPLETION, SCENARIO_EMINENCE, SCENARIO_PERFECT, SCENARIO_HALF_STEP];
        let highestReachable = null;
        
        for (const scenario of scenariosToCheck) {
            Logger.debug(`Checking if ${scenario} is reachable...`);
            
            // Safety check: Verify breakthrough player data is still at the correct realm before each calculation
            if (breakthroughPlayerData.mainPathRealmMajor !== nextMajor) {
                Logger.error('Breakthrough realm changed during scenario checking!', {
                    expected: nextMajor,
                    actual: breakthroughPlayerData.mainPathRealmMajor,
                    scenario
                });
                Logger.groupEnd();
                return 'Realm validation error during scenario check';
            }
            
            // Calculate time needed to reach this scenario from breakthrough state
            // Note: We pass a copy to prevent calculateDaysToScenario from modifying the original
            const daysNeededInfo = this.calculateDaysToScenario(
                scenario,
                { ...breakthroughPlayerData }, // Pass a copy to prevent mutation
                breakthroughMainPathDailyXP,
                breakthroughSecondaryPathDailyXP
            );
            
            const daysNeeded = daysNeededInfo?.daysNeeded || Infinity;
            
            Logger.debug(`${scenario} days needed:`, daysNeeded === Infinity ? 'Infinity' : daysNeeded.toFixed(2));
            
            // Safety check: Verify the calculation didn't modify the breakthrough state
            if (breakthroughPlayerData.mainPathRealmMajor !== nextMajor) {
                Logger.error('calculateDaysToScenario modified breakthrough realm!', {
                    expected: nextMajor,
                    actual: breakthroughPlayerData.mainPathRealmMajor,
                    scenario
                });
                Logger.groupEnd();
                return 'Realm modified during calculation';
            }
            
            if (daysNeeded !== Infinity && daysNeeded <= daysAvailableInNextRealm) {
                // Scenario is reachable
                highestReachable = scenario;
                Logger.debug(`${scenario} is reachable (${daysNeeded.toFixed(2)} days <= ${daysAvailableInNextRealm.toFixed(2)} days available)`);
            } else {
                // Cannot reach this scenario within timegate - stop checking
                Logger.debug(`${scenario} is NOT reachable (${daysNeeded === Infinity ? 'Infinity' : daysNeeded.toFixed(2)} days > ${daysAvailableInNextRealm.toFixed(2)} days available)`);
                break;
            }
        }
        
        if (highestReachable === null) {
            // Cannot reach even Completion
            Logger.warn('Cannot reach Completion in next realm');
            Logger.groupEnd();
            return 'Cannot reach Completion';
        }
        
        // Final safety check: Verify we're still at the correct realm after all calculations
        if (breakthroughPlayerData.mainPathRealmMajor !== nextMajor) {
            Logger.error('Final validation failed: breakthrough realm changed!', {
                expected: nextMajor,
                actual: breakthroughPlayerData.mainPathRealmMajor,
                highestReachable
            });
            Logger.groupEnd();
            return 'Realm validation error';
        }
        
        Logger.debug('Maximum reachable scenario (validated):', {
            scenario: highestReachable,
            realm: nextMajor,
            'Realm index': nextMajorIndex,
            'Current realm index': currentMajorIndex
        });
        
        Logger.groupEnd();
        return highestReachable;
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
                const stageXP = this.calculateXPToReach(currentRealm, currentProgress, targetRealm, 0);
                const stageDays = this.calculateDaysForStage(currentRealm, currentProgress, targetRealm, 0, currentBonus, playerData);
                totalDays += stageDays;
            }
        } else if (targetScenario === SCENARIO_PERFECT) {
            // Stage 1: Current → Eminence (no bonus)
            // Stage 2: Eminence → Perfect (0.2 bonus from Eminence)
            // Use mainPathDailyXP for Perfect scenario
            const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
            const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
            
            if (previousMajor) {
                // Stage 1: to Eminence
                const eminenceTargetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${previousMajor} Late` 
                    : `${previousMajor} Mid`;
                const eminenceXP = this.calculateXPToReach(currentRealm, currentProgress, eminenceTargetRealm, 0);
                if (eminenceXP > 0) {
                    const eminenceDays = this.calculateDaysForStage(currentRealm, currentProgress, eminenceTargetRealm, 0, currentBonus, playerData, true, mainPathDailyXP);
                    totalDays += eminenceDays;
                    currentRealm = eminenceTargetRealm;
                    currentProgress = 0;
                    currentBonus = scenarioBonuses[SCENARIO_EMINENCE];
                }
                
                // Stage 2: to Perfect
                const perfectTargetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${playerData.mainPathRealmMajor} Mid` 
                    : `${playerData.mainPathRealmMajor} Early`;
                const perfectXP = this.calculateXPToReach(currentRealm, currentProgress, perfectTargetRealm, 0);
                if (perfectXP > 0) {
                    const perfectDays = this.calculateDaysForStage(currentRealm, currentProgress, perfectTargetRealm, 0, currentBonus, playerData, true, mainPathDailyXP);
                    totalDays += perfectDays;
                }
            }
        } else if (targetScenario === SCENARIO_HALF_STEP) {
            // Stage 1: Current → Eminence (no bonus)
            // Stage 2: Eminence → Perfect (0.2 bonus from Eminence)
            // Stage 3: Perfect → Half-Step (0.2 bonus from Perfect)
            // Use mainPathDailyXP for Half-Step scenario
            const currentMajorIndex = REALM_ORDER_MAJOR.indexOf(playerData.mainPathRealmMajor);
            const previousMajor = currentMajorIndex > 0 ? REALM_ORDER_MAJOR[currentMajorIndex - 1] : null;
            
            if (previousMajor) {
                // Stage 1: to Eminence
                const eminenceTargetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${previousMajor} Late` 
                    : `${previousMajor} Mid`;
                const eminenceXP = this.calculateXPToReach(currentRealm, currentProgress, eminenceTargetRealm, 0);
                if (eminenceXP > 0) {
                    const eminenceDays = this.calculateDaysForStage(currentRealm, currentProgress, eminenceTargetRealm, 0, currentBonus, playerData, true, mainPathDailyXP);
                    totalDays += eminenceDays;
                    currentRealm = eminenceTargetRealm;
                    currentProgress = 0;
                    currentBonus = scenarioBonuses[SCENARIO_EMINENCE];
                }
                
                // Stage 2: to Perfect
                const perfectTargetRealm = playerData.mainPathRealmMajor === 'Voidbreak' 
                    ? `${playerData.mainPathRealmMajor} Mid` 
                    : `${playerData.mainPathRealmMajor} Early`;
                const perfectXP = this.calculateXPToReach(currentRealm, currentProgress, perfectTargetRealm, 0);
                if (perfectXP > 0) {
                    const perfectDays = this.calculateDaysForStage(currentRealm, currentProgress, perfectTargetRealm, 0, currentBonus, playerData, true, mainPathDailyXP);
                    totalDays += perfectDays;
                    currentRealm = perfectTargetRealm;
                    currentProgress = 0;
                    currentBonus = scenarioBonuses[SCENARIO_PERFECT];
                }
                
                // Stage 3: to Half-Step
                const halfStepTargetRealm = `${playerData.mainPathRealmMajor} Late`;
                const halfStepXP = this.calculateXPToReach(currentRealm, currentProgress, halfStepTargetRealm, 100);
                if (halfStepXP > 0) {
                    const halfStepDays = this.calculateDaysForStage(currentRealm, currentProgress, halfStepTargetRealm, 100, currentBonus, playerData, true, mainPathDailyXP);
                    totalDays += halfStepDays;
                }
            }
        }
        
        return totalDays;
    }
    
    static calculateDaysForStage(startRealm, startProgress, endRealm, endProgress, bonusActive, playerData, useMainPathDailyXP = false, mainPathDailyXP = null) {
        // Calculate days needed for a single stage (secondary path), accounting for realm progression
        // Uses average of daily XP at start and end of stage
        // For Perfect and Half-Step, use mainPathDailyXP instead of calculating from secondary path
        
        let averageDailyXP;
        if (useMainPathDailyXP && mainPathDailyXP !== null) {
            // Use mainPathDailyXP for Perfect and Half-Step scenarios
            averageDailyXP = mainPathDailyXP;
        } else {
            // Calculate daily XP from secondary path realm progression
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
                mainPathProgress: endProgress
            };
            const endDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(endPlayerData, bonusActive);
            
            // Average accounts for daily XP increasing as realm progresses
            averageDailyXP = (startDailyXP + endDailyXP) / 2;
        }
        
        if (averageDailyXP <= 0) {
            return Infinity;
        }
        
        const stageXP = this.calculateXPToReach(startRealm, startProgress, endRealm, endProgress);
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