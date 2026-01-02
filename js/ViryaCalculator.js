import { GameConstants, Realms, RealmMajorTotalXP, timegateLength } from './gameData.js';
import { CalculatorUtils } from './utils.js';
import { RealmCalculator } from './RealmCalculator.js';
import { RealmProgressionSimulator } from './RealmProgressionSimulator.js';
import { XPCalculator } from './XPCalculator.js';
class ViryaCalculator {
    static detectScenario(playerData) {
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100;
        const realmOrderMajor = ['Nascent','Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        const currentMajorIndex = realmOrderMajor.indexOf(playerData.mainPathRealmMajor);
        const previousMajor = currentMajorIndex > 0 ? realmOrderMajor[currentMajorIndex - 1] : null;
        const isSecondary100Late = playerData.secondaryPathRealmMinor === 'Late' && playerData.secondaryPathProgress >= 100;
        const isSameMajor = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor;

        console.group(' ViryaCalculator.detectScenario');
        console.log('Input:', {
            mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
            secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`
        });
        console.log('Is Main Path 100%+ Late?', isMainPath100Late);

        // First check: No Virya scenario (main path not at 100% Late)
        if (!isMainPath100Late) {
            console.log('Result: No Virya (main path not at 100%+ Late)');
            console.groupEnd();
            return {
                scenario: 'No Virya',
                absorptionBonus: 0.0,
                isActive: false,
                bonusEndsAt: 'N/A'
            };
        }
        
        console.log('Realm Analysis:', {
            currentMajorIndex,
            currentMajor: playerData.mainPathRealmMajor,
            previousMajor
        });

        // Check Half-Step
        console.log('Half-Step Check:', {
            isSecondary100Late,
            isSameMajor,
            secondaryRealmMinor: playerData.secondaryPathRealmMinor,
            secondaryProgress: playerData.secondaryPathProgress
        });

        if (isSecondary100Late && isSameMajor) {
            console.log('Result: Half-Step (+0.4 absorption)');
            console.groupEnd();
            return {
                scenario: 'Half-Step',
                absorptionBonus: 0.4,
                isActive: true,
                bonusEndsAt: 'Next major\'s Late'
            };
        }

        // Check Perfect
        if (playerData.mainPathRealmMajor === 'Voidbreak') {
            console.log('Perfect Check (Voidbreak special case)');
            if ((playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                    playerData.secondaryPathRealmMinor === 'Mid') ||
                   (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                    playerData.secondaryPathRealmMinor === 'Late' &&
                    playerData.secondaryPathProgress < 100)) {
                console.log('Result: Perfect (+0.2 absorption)');
                console.groupEnd();
                return {
                    scenario: 'Perfect',
                    absorptionBonus: 0.2,
                    isActive: true,
                    bonusEndsAt: 'Half-Step'
                };
            }
        } else {
            console.log('Perfect Check (standard)');
            if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                playerData.secondaryPathRealmMinor === 'Early') {
                console.log('Result: Perfect (+0.2 absorption)');
                console.groupEnd();
                return {
                    scenario: 'Perfect',
                    absorptionBonus: 0.2,
                    isActive: true,
                    bonusEndsAt: 'Half-Step'
                };
            }
        }

        // Check Eminence
        if (previousMajor) {
            console.log('Eminence Check');
            if (playerData.mainPathRealmMajor === 'Voidbreak') {
                if ((playerData.secondaryPathRealmMajor === previousMajor &&
                    playerData.secondaryPathRealmMinor === 'Late') ||
                    (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                    playerData.secondaryPathRealmMinor === 'Early')) {
                    console.log('Result: Eminence (+0.2 absorption)');
                    console.groupEnd();
                    return {
                        scenario: 'Eminence',
                        absorptionBonus: 0.2,
                        isActive: true,
                        bonusEndsAt: 'Perfect'
                    };
                }
            } else {
                if (playerData.secondaryPathRealmMajor === previousMajor &&
                    (playerData.secondaryPathRealmMinor === 'Mid' || playerData.secondaryPathRealmMinor === 'Late')) {
                    console.log('Result: Eminence (+0.2 absorption)');
                    console.groupEnd();
                    return {
                        scenario: 'Eminence',
                        absorptionBonus: 0.2,
                        isActive: true,
                        bonusEndsAt: 'Perfect'
                    };
                }
            }
        }

        // Completion (no bonus) - main path is at 100% Late
        console.log('Result: Completion (no absorption bonus)');
        console.groupEnd();
        return {
            scenario: 'Completion',
            absorptionBonus: 0.0,
            isActive: true,
            bonusEndsAt: 'Eminence'
        };
    }
    static calculateDaysToScenario(targetScenario, playerData, mainPathDailyXP, secondaryPathDailyXP) {
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100;
        const currentScenarioInfo = this.detectScenario(playerData);
        const currentScenario = currentScenarioInfo.scenario;

        console.group(` Calculating days to ${targetScenario}`);
        console.log('Player Data:', {
            mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
            secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`
        });
        console.log('Current scenario:', currentScenario);
        console.log('Target scenario:', targetScenario);

        // Define scenario order including "No Virya"
        const scenarioOrder = ['No Virya', 'Completion', 'Eminence', 'Perfect', 'Half-Step'];
        const currentIndex = scenarioOrder.indexOf(currentScenario);
        const targetIndex = scenarioOrder.indexOf(targetScenario);

        console.log('Scenario order:', scenarioOrder);
        console.log('Current index:', currentIndex, 'Target index:', targetIndex);

        // Check if target is already achieved or passed
        if (targetIndex <= currentIndex) {
            console.log('Already at or beyond target scenario');
            console.groupEnd();
            // Determine required path focus for the scenario
            let requiredPathFocus = 'Main Path';
            if (targetScenario === 'Eminence' || targetScenario === 'Perfect' || targetScenario === 'Half-Step') {
                requiredPathFocus = 'Secondary Path';
            }
            return { daysNeeded: 0, xpNeeded: 0, requiredPathFocus };
        }

        // Determine which path needs to be focused for this scenario
        let requiredPathFocus = 'Main Path';
        let dailyXPToUse = mainPathDailyXP || 0;
        
        if (targetScenario === 'Eminence' || targetScenario === 'Perfect' || targetScenario === 'Half-Step') {
            requiredPathFocus = 'Secondary Path';
            // For time calculations, use the same daily XP value (mainPathDailyXP)
            // since both parameters now receive the same value (dailyXP without temporary bonus)
            dailyXPToUse = mainPathDailyXP || 0;
        }

        console.log('Required path focus:', requiredPathFocus);
        console.log('Daily XP to use:', dailyXPToUse);

        // Special handling for "No Virya" to "Completion" transition
        if (currentScenario === 'No Virya' && targetScenario === 'Completion') {
            console.log('Calculating time from No Virya to Completion');
            // Need to calculate XP for main path to reach 100% Late
            const xpNeeded = this.calculateXPForCompletion(playerData);
            
            if (dailyXPToUse <= 0) {
                console.log('No main path daily XP available');
                console.groupEnd();
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus: 'Main Path' };
            }
            
            const daysNeeded = xpNeeded / dailyXPToUse;
            console.log('Days needed:', daysNeeded);
            console.groupEnd();
            return { daysNeeded, xpNeeded, requiredPathFocus: 'Main Path' };
        }

        // For other transitions, check if we have the required daily XP
        if (dailyXPToUse <= 0) {
            console.log(`No ${requiredPathFocus.toLowerCase()} daily XP available for this transition`);
            console.groupEnd();
            return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
        }

        // Calculate XP needed based on target scenario
        let xpNeeded = 0;

        try {
            switch(targetScenario) {
                case 'Completion':
                    xpNeeded = this.calculateXPForCompletion(playerData);
                    break;
                case 'Eminence':
                    xpNeeded = this.calculateXPForEminence(playerData);
                    break;
                case 'Perfect':
                    xpNeeded = this.calculateXPForPerfect(playerData);
                    break;
                case 'Half-Step':
                    xpNeeded = this.calculateXPForHalfStep(playerData);
                    break;
                default:
                    console.log('Unknown target scenario:', targetScenario);
                    console.groupEnd();
                    return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }

            console.log('XP needed:', xpNeeded);

            if (xpNeeded <= 0) {
                console.log('No XP needed (already there)');
                console.groupEnd();
                return { daysNeeded: 0, xpNeeded: 0, requiredPathFocus };
            }

            const daysNeeded = xpNeeded / dailyXPToUse;
            console.log('Days needed:', daysNeeded);

            // Safety checks
            if (isNaN(daysNeeded)) {
                console.log('Days needed is NaN');
                console.groupEnd();
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }

            if (!isFinite(daysNeeded)) {
                console.log('Days needed is infinite');
                console.groupEnd();
                return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
            }

            console.groupEnd();
            return { daysNeeded, xpNeeded, requiredPathFocus };

        } catch (error) {
            console.error('Error calculating days to scenario:', error);
            console.groupEnd();
            return { daysNeeded: Infinity, xpNeeded: Infinity, requiredPathFocus };
        }
    }
	static calculateXPForCompletion(playerData) {
		console.group(' Calculating XP for Completion scenario');
		
		// Check if main path is already at 100%+ Late
		const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100;
		
		if (isMainPath100Late) {
			console.log('Main path already at 100%+ Late - Completion requirement met');
			console.groupEnd();
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
		
		console.log('XP needed for Completion:', xpNeeded);
		console.groupEnd();
		return xpNeeded;
	} 
    static calculateXPForEminence(playerData) {
		const realmOrderMajor = ['Nascent','Incarnation', 'Voidbreak', 'Wholeness', 'Perfection','Nirvana', 'Celestial', 'Eternal', 'Supreme'];
		const currentMajorIndex = realmOrderMajor.indexOf(playerData.mainPathRealmMajor);
		const previousMajor = currentMajorIndex > 0 ? realmOrderMajor[currentMajorIndex - 1] : null;
		const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100;
		
		
		if (playerData.viryaScenario === 'Eminence' || playerData.viryaScenario === 'Perfect' || playerData.viryaScenario === 'Half-Step') {
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
		const realmOrderMajor = ['Nascent', 'Incarnation', 'Voidbreak', 'Wholeness', 'Perfection','Nirvana', 'Celestial', 'Eternal', 'Supreme'];
		const currentMajorIndex = realmOrderMajor.indexOf(playerData.mainPathRealmMajor);
		const previousMajor = currentMajorIndex > 0 ? realmOrderMajor[currentMajorIndex - 1] : null;


        if (playerData.viryaScenario === 'Perfect' || playerData.viryaScenario === 'Half-Step') {
			return 0;
			} else { 
				let targetRealm;
				if (playerData.mainPathRealmMajor === 'Voidbreak') {
					targetRealm = `${playerData.mainPathRealmMajor} Mid`;
				} else {
					targetRealm = `${playerData.mainPathRealmMajor} Early`;
				}
				
				if (playerData.viryaScenario === 'No Virya' || playerData.viryaScenario === 'Completion') {
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
        
		if (playerData.viryaScenario === 'No Virya' || playerData.viryaScenario === 'Completion' || playerData.viryaScenario === 'Eminence' ) {
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
		console.log(currentRealm);
        const currentXP = currentRealmData.xp * (currentProgress / 100);
        const targetRealmData = Realms[targetRealm];
		console.log(targetRealm);
		//finding our position in the arrays
		const currentRealmIndex = RealmCalculator.calculateRealmIndex(currentRealm);
        const targetRealmIndex = RealmCalculator.calculateRealmIndex(targetRealm);
		//and grabbing the xp value
		const targetXP = RealmCalculator.calculateRealmProgression(currentRealmIndex, targetRealmIndex);
        if (currentXP >= targetXP) {
            return 0;
        }
        return targetXP - currentXP;
    }
    
    static calculateMaxNextRealmScenario(targetScenario, playerData, mainPathDailyXPBase, secondaryPathDailyXPBase) {
        console.group('🔮 Calculating Max Next Realm Scenario');
        console.log('Target scenario:', targetScenario);
        console.log('Current player data:', {
            mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
            secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`,
            mainPathMajor: playerData.mainPathRealmMajor
        });
        
        const realmOrderMajor = ['Nascent', 'Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        const currentMajorIndex = realmOrderMajor.indexOf(playerData.mainPathRealmMajor);
        const nextMajor = currentMajorIndex < realmOrderMajor.length - 1 ? realmOrderMajor[currentMajorIndex + 1] : null;
        
        // Edge case: No next realm (Supreme)
        if (!nextMajor) {
            console.log('No next realm (at Supreme)');
            console.groupEnd();
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
        if (targetScenario === 'Eminence') {
            const previousMajor = currentMajorIndex > 0 ? realmOrderMajor[currentMajorIndex - 1] : null;
            if (previousMajor) {
                if (playerData.mainPathRealmMajor === 'Voidbreak') {
                    secondaryPathAtScenario = {
                        realm: `${previousMajor} Late`,
                        major: previousMajor,
                        minor: 'Late',
                        progress: 100
                    };
                } else {
                    secondaryPathAtScenario = {
                        realm: `${previousMajor} Mid`,
                        major: previousMajor,
                        minor: 'Mid',
                        progress: 100
                    };
                }
            }
        } else if (targetScenario === 'Perfect') {
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
        } else if (targetScenario === 'Half-Step') {
            secondaryPathAtScenario = {
                realm: `${playerData.mainPathRealmMajor} Late`,
                major: playerData.mainPathRealmMajor,
                minor: 'Late',
                progress: 100
            };
        }
        // For Completion, secondary path stays unchanged
        
        console.log('Secondary path when reaching target scenario:', secondaryPathAtScenario);
        
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
        
        console.log('Breakthrough state:', {
            mainPath: `${breakthroughPlayerData.mainPathRealm} (${breakthroughPlayerData.mainPathProgress}%)`,
            secondaryPath: `${breakthroughPlayerData.secondaryPathRealm} (${breakthroughPlayerData.secondaryPathProgress}%)`
        });
        
        // Get next timegate length
        const nextTimegateLength = timegateLength[nextMajor] || 0;
        if (nextTimegateLength <= 0) {
            console.warn('No timegate length for next major:', nextMajor);
            console.groupEnd();
            return '--';
        }
        
        console.log('Next timegate length:', nextTimegateLength);
        
        // Calculate if main path can reach 100% Late in next realm
        const targetRealm = `${nextMajor} Late`;
        const targetRealmXP = Realms[targetRealm]?.xp;
        
        if (!targetRealmXP) {
            console.error('Target realm not found:', targetRealm);
            console.groupEnd();
            return '--';
        }
        
        // Calculate XP needed to reach 100% Late in next realm
        const xpNeeded = this.calculateXPToReach(
            breakthroughPlayerData.mainPathRealm,
            breakthroughPlayerData.mainPathProgress,
            targetRealm,
            100
        );
        
        console.log('XP needed to reach 100% Late in next realm:', xpNeeded);
        
        // Calculate absorption bonus from target scenario (this becomes "had Virya last realm" bonus)
        // Eminence: 0.2 (expires at the start of Early, so NOT active in Early/Mid/Late)
        // Perfect: 0.2 (active in Early, expires at the start of Mid, so NOT active in Mid/Late)
        // Half-Step: 0.4 (active in Early and Mid, expires at the start of Late, so NOT active in Late)
        // Completion: 0 (no bonus)
        let hadViryaBonus = 0;
        if (targetScenario === 'Eminence') {
            hadViryaBonus = 0.2;
        } else if (targetScenario === 'Perfect') {
            hadViryaBonus = 0.2;
        } else if (targetScenario === 'Half-Step') {
            hadViryaBonus = 0.4;
        }
        
        console.log('Had Virya bonus from target scenario:', hadViryaBonus);
        
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
        if (targetScenario === 'Perfect' || targetScenario === 'Half-Step') {
            earlyBonus = hadViryaBonus;
        }
        // Eminence bonus expires at the start of Early, so no bonus for Eminence
        const earlyDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: nextMajorEarly, mainPathRealmMinor: 'Early' },
            earlyBonus
        );
        if (earlyDailyXP <= 0) {
            console.warn('No daily XP available for Early realm');
            console.groupEnd();
            return '--';
        }
        const daysForEarly = earlyXP / earlyDailyXP;
        totalDaysNeeded += daysForEarly;
        console.log(`Early realm: ${daysForEarly.toFixed(2)} days (with ${earlyBonus * 100}% bonus)`);
        
        // Mid realm: bonus is active for Half-Step only (Perfect expires at start of Mid, Eminence already expired)
        let midBonus = 0;
        if (targetScenario === 'Half-Step') {
            midBonus = hadViryaBonus;
        }
        const midDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: nextMajorMid, mainPathRealmMinor: 'Mid' },
            midBonus
        );
        if (midDailyXP <= 0) {
            console.warn('No daily XP available for Mid realm');
            console.groupEnd();
            return '--';
        }
        const daysForMid = midXP / midDailyXP;
        totalDaysNeeded += daysForMid;
        console.log(`Mid realm: ${daysForMid.toFixed(2)} days (with ${midBonus * 100}% bonus)`);
        
        // Late realm: no bonus (all scenario bonuses expire before Late - Eminence expires at start of Early, Perfect expires at start of Mid, Half-Step expires at start of Late)
        const lateDailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            { ...breakthroughPlayerData, mainPathRealm: nextMajorLate, mainPathRealmMinor: 'Late' },
            0
        );
        if (lateDailyXP <= 0) {
            console.warn('No daily XP available for Late realm');
            console.groupEnd();
            return '--';
        }
        const daysForLate = lateXP / lateDailyXP;
        totalDaysNeeded += daysForLate;
        console.log(`Late realm: ${daysForLate.toFixed(2)} days (no bonus)`);
        
        console.log('Total days needed to reach 100% Late:', totalDaysNeeded.toFixed(2));
        console.log('Days available (timegate):', nextTimegateLength);
        
        // Check if we can reach 100% Late within timegate
        if (totalDaysNeeded > nextTimegateLength) {
            console.log('Cannot reach 100% Late within timegate');
            console.groupEnd();
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
                console.log('Maximum scenario: Half-Step (both paths can reach 100% Late)');
                console.groupEnd();
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
                console.log('Maximum scenario: Perfect (secondary can reach required position)');
                console.groupEnd();
                return 'Perfect';
            }
        }
        
        // Check Eminence: secondary at previous major Mid/Late (or Early for Voidbreak special case)
        if (secondaryPathDailyXP > 0) {
            const previousMajorIndex = realmOrderMajor.indexOf(nextMajor) - 1;
            const previousMajor = previousMajorIndex >= 0 ? realmOrderMajor[previousMajorIndex] : null;
            
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
                    console.log('Maximum scenario: Eminence (secondary can reach required position)');
                    console.groupEnd();
                    return 'Eminence';
                }
            }
        }
        
        // Default to Completion (main path reaches 100% Late, but secondary path doesn't reach any bonus scenario requirements)
        console.log('Maximum scenario: Completion (only main path reaches 100% Late)');
        console.groupEnd();
        return 'Completion';
    }
}

export { ViryaCalculator };