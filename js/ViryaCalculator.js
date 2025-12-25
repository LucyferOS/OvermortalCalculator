import { GameConstants, Realms, RealmMajorTotalXP } from './gameData.js';
import { CalculatorUtils } from './utils.js';
import { RealmCalculator } from './RealmCalculator.js';
//TODO: Fix so that calcuates time between no virya and eminence correctly, eminence and perfect correctly, etc. good enough for now.
class ViryaCalculator {
    static detectScenario(playerData) {
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100;
        const realmOrderMajor = ['Nascent','Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        const currentMajorIndex = realmOrderMajor.indexOf(playerData.mainPathRealmMajor);
        const previousMajor = currentMajorIndex > 0 ? realmOrderMajor[currentMajorIndex - 1] : null;
        const isSecondary100Late = playerData.secondaryPathRealmMinor === 'Late' && playerData.secondaryPathProgress >= 100;
        const isSameMajor = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor;

        console.group('🔍 ViryaCalculator.detectScenario');
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

    static calculateDaysToScenario(targetScenario, playerData, secondaryDailyXP) {
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100;
        const currentScenarioInfo = this.detectScenario(playerData);
        const currentScenario = currentScenarioInfo.scenario;

        console.group(`📅 Calculating days to ${targetScenario}`);
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
        if (targetIndex < currentIndex) {
            console.log('Already beyond target scenario');
            console.groupEnd();
            return 0; // Already achieved
        }

        if (targetIndex === currentIndex) {
            console.log('Already at target scenario');
            console.groupEnd();
            return 0; // Already at this scenario
        }

        // Special handling for "No Virya" to "Completion" transition
        if (currentScenario === 'No Virya' && targetScenario === 'Completion') {
            console.log('Calculating time from No Virya to Completion');
            // Need to calculate XP for main path to reach 100% Late
            const xpNeeded = this.calculateXPForCompletion(playerData);
            const mainPathDailyXP = playerData.dailyXP; // Assuming main path gets all XP
            
            if (mainPathDailyXP <= 0) {
                console.log('No main path daily XP available');
                console.groupEnd();
                return Infinity;
            }
            
            const daysNeeded = xpNeeded / mainPathDailyXP;
            console.log('Days needed:', daysNeeded);
            console.groupEnd();
            return daysNeeded;
        }

        // For other transitions, we need secondary path XP
        if (secondaryDailyXP <= 0) {
            console.log('No secondary daily XP available for this transition');
            console.groupEnd();
            return Infinity;
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
                    return Infinity;
            }

            console.log('XP needed:', xpNeeded);

            if (xpNeeded <= 0) {
                console.log('No XP needed (already there)');
                console.groupEnd();
                return 0;
            }

            const daysNeeded = xpNeeded / secondaryDailyXP;
            console.log('Days needed:', daysNeeded);

            // Safety checks
            if (isNaN(daysNeeded)) {
                console.log('Days needed is NaN');
                console.groupEnd();
                return Infinity;
            }

            if (!isFinite(daysNeeded)) {
                console.log('Days needed is infinite');
                console.groupEnd();
                return Infinity;
            }

            console.groupEnd();
            return daysNeeded;

        } catch (error) {
            console.error('Error calculating days to scenario:', error);
            console.groupEnd();
            return Infinity;
        }
    }

	static calculateXPForCompletion(playerData) {
		console.group('📊 Calculating XP for Completion scenario');
		
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
        return this.calculateXPToReach(playerData.secondaryPathRealm,
                                      playerData.secondaryPathProgress,
                                      targetRealm, 100);
			}
		}
    static calculateXPForHalfStep(playerData) {
        const targetRealm = `${playerData.mainPathRealmMajor} Late`;
        return this.calculateXPToReach(playerData.secondaryPathRealm,
                                      playerData.secondaryPathProgress,
                                      targetRealm, 100);
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
}

export { ViryaCalculator };