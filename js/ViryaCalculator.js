import { GameConstants, Realms } from './gameData.js';
import { CalculatorUtils } from './utils.js';

class ViryaCalculator {
    static detectScenario(playerData) {
        console.group('🔍 ViryaCalculator.detectScenario');
        console.log('Input:', {
            mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
            secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`
        });
        
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && 
                                 playerData.mainPathProgress >= 100;
        
        console.log('Is Main Path 100%+ Late?', isMainPath100Late);
        
        if (!isMainPath100Late) {
            console.log('Result: No Virya (main path not at 100%+ Late)');
            console.groupEnd();
            return {
                scenario: null,
                absorptionBonus: 0.0,
                isActive: false
            };
        }
        
        const realmOrderMajor = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
                           'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        
        const currentMajorIndex = realmOrderMajor.indexOf(playerData.mainPathRealmMajor);
        const previousMajor = currentMajorIndex > 0 ? realmOrderMajor[currentMajorIndex - 1] : null;
        console.log('Realm Analysis:', {
            currentMajorIndex,
            currentMajor: playerData.mainPathRealmMajor,
            previousMajor
        });
        
        // Check Half-Step
        const isSecondary100Late = playerData.secondaryPathRealmMinor === 'Late' && 
                                   playerData.secondaryPathProgress >= 100;
        const isSameMajor = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor;
        
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
                isActive: true
            };
        }
        
        // Check perfect
        if (playerData.mainPathRealmMajor === 'Voidbreak') {
            console.log('perfect Check (Voidbreak special case)');
            if (playerData.secondaryPathRealmMajor === 'Voidbreak' && 
                playerData.secondaryPathRealmMinor === 'Mid') {
                console.log('Result: perfect (+0.2 absorption)');
                console.groupEnd();
                return {
                    scenario: 'perfect',
                    absorptionBonus: 0.2,
                    isActive: true
                };
            }
        } else {
            console.log('perfect Check (standard)');
            if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor && 
                playerData.secondaryPathRealmMinor === 'Early') {
                console.log('Result: perfect (+0.2 absorption)');
                console.groupEnd();
                return {
                    scenario: 'perfect',
                    absorptionBonus: 0.2,
                    isActive: true
                };
            }
        }
        
        // Check Eminence
        if (previousMajor) {
            console.log('Eminence Check');
            if (playerData.mainPathRealmMajor === 'Voidbreak') {
                if (playerData.secondaryPathRealmMajor === previousMajor && 
                    playerData.secondaryPathRealmMinor === 'Late') {
                    console.log('Result: Eminence (+0.2 absorption)');
                    console.groupEnd();
                    return {
                        scenario: 'Eminence',
                        absorptionBonus: 0.2,
                        isActive: true
                    };
                }
            } else {
                if (playerData.secondaryPathRealmMajor === previousMajor && 
                    playerData.secondaryPathRealmMinor === 'Mid') {
                    console.log('Result: Eminence (+0.2 absorption)');
                    console.groupEnd();
                    return {
                        scenario: 'Eminence',
                        absorptionBonus: 0.2,
                        isActive: true
                    };
                }
            }
        }
        
        // Completion (no bonus)
        console.log('Result: Completion (no absorption bonus)');
        console.groupEnd();
        return {
            scenario: 'Completion',
            absorptionBonus: 0.0,
            isActive: true
        };
    }

    static calculateBonusEndsAt(scenario, playerData) {
        const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
                           'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        const currentMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
        const nextMajor = currentMajorIndex < realmOrder.length - 1 ? realmOrder[currentMajorIndex + 1] : null;
        
        switch (scenario) {
            case 'Eminence':
                return 'Breakthrough';
            case 'perfect':
                return nextMajor ? `${nextMajor} Mid` : 'Max Realm Reached';
            case 'Half-Step':
                return nextMajor ? `${nextMajor} Late` : 'Max Realm Reached';
            case 'Completion':
                return 'Timegate Completion';
            default:
                return 'N/A';
        }
    }

    // NEW: Complete requirements checking method
    static checkRequirements(playerData) {
        const requirements = [];
        
        // Helper function to format realm info
        const formatRealmInfo = (realm, progress) => {
            return `${realm} (${progress.toFixed(1)}%)`;
        };
        
        // 1. Main path at 100%+ Late (Base requirement for ANY Virya)
        const mainPath = playerData.mainPathRealm;
        const mainProgress = playerData.mainPathProgress;
        const isMainLate = playerData.mainPathRealmMinor === 'Late';
        const isMain100Late = isMainLate && mainProgress >= 100;
        
        requirements.push({
            id: 'main-100-late',
            description: `Main Path at 100%+ Late Realm`,
            current: `Currently: ${formatRealmInfo(mainPath, mainProgress)}`,
            met: isMain100Late,
            required: '100%+ in Late realm',
            icon: isMain100Late ? '✅' : isMainLate ? '⏳' : '❌'
        });
        
        if (!isMain100Late) {
            // Can't check other requirements if main isn't at 100%+ Late
            return requirements;
        }
        
        const realmOrderMajor = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
                           'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
		const realmOrderMinor = ['Early', 'Mid', 'Late'];
        
        const currentMainMajor = playerData.mainPathRealmMajor;
		const currentMainMinor = playerData.mainPathRealmMinor;
		
        const currentMainIndexMajor = realmOrderMajor.indexOf(currentMainMajor);
        const previousMajor = currentMainIndex > 0 ? realmOrder[currentMainIndexMajor - 1] : null;
		const currentMainIndexMinor = realmOrderMinor.indexOf(currentMainMajor);

        
        // Detect current scenario to understand progression
        const currentScenario = this.detectScenario(playerData).scenario;
        
        // 2. Eminence Requirement (Second at previous major)
        let eminenceRequired = '';
        let eminenceCurrent = '';
        let eminenceMet = false;
        
        if (previousMajor) {
            if (currentMainMajor === 'Voidbreak') {
                eminenceRequired = `${previousMajor} Late`;
                eminenceCurrent = formatRealmInfo(
                    playerData.secondaryPathRealm, 
                    playerData.secondaryPathProgress
                );
                eminenceMet = (
					//inc late
					(playerData.secondaryPathRealmMajor === previousMajor && 
					 playerData.secondaryPathRealmMinor === 'Late') ||
					//vb early
					(playerData.secondaryPathRealmMajor === currentMajor && 
					 playerData.secondaryPathRealmMinor === 'Early')
				);
            } else {
                eminenceRequired = `${previousMajor} Mid`;
                eminenceCurrent = formatRealmInfo(
                    playerData.secondaryPathRealm, 
                    playerData.secondaryPathProgress
                );
                eminenceMet = (playerData.secondaryPathRealmMajor === previousMajor && 
                             playerData.secondaryPathRealmMinor === 'Mid')||
							 (playerData.secondaryPathRealmMajor === previousMajor && 
                             playerData.secondaryPathRealmMinor === 'Late')
							 );
            }
            
            // Eminence is automatically met if we're at perfect or Half-Step
            if (currentScenario === 'perfect' || currentScenario === 'Half-Step') {
                eminenceMet = true;
            }
            
            requirements.push({
                id: 'eminence',
                description: `Eminence: Secondary at previous major`,
                current: `Currently: ${eminenceCurrent}`,
                met: eminenceMet,
                required: `Required: ${eminenceRequired}`,
                icon: eminenceMet ? '✅' : '❌'
            });
        } else {
            // No previous major (Incarnation)
            requirements.push({
                id: 'eminence',
                description: `Eminence: Secondary at previous major`,
                current: 'No previous major (Incarnation)',
                met: true, // Automatically met for Incarnation
                required: 'N/A',
                icon: '✅'
            });
        }
        
        // 3. perfect Requirement (Second at same major, early/mid)
        let perfectRequired = '';
        let perfectCurrent = '';
        let perfectMet = false;
        
        if (currentMainMajor === 'Voidbreak') {
            perfectRequired = `${currentMainMajor} Mid`;
            perfectCurrent = formatRealmInfo(
                playerData.secondaryPathRealm, 
                playerData.secondaryPathProgress
            );
            perfectMet = (playerData.secondaryPathRealmMajor === currentMainMajor && 
                           playerData.secondaryPathRealmMinor === 'Mid') ||
						   
						   (playerData.secondaryPathRealmMajor === currentMainMajor && 
                           playerData.secondaryPathRealmMinor === 'Late' &&  
						   playerData.secondaryPathProgress < 100)
						   );
        } else {
            perfectRequired = `${currentMainMajor} Early`;
            perfectCurrent = formatRealmInfo(
                playerData.secondaryPathRealm, 
                playerData.secondaryPathProgress
            );
            perfectMet = playerData.secondaryPathRealmMajor === currentMainMajor && 
                           (playerData.secondaryPathRealmMinor != 'Late' && playerData.secondaryPathProgress < 100);
        }
        
        // perfect is automatically met if we're at Half-Step
        if (currentScenario === 'Half-Step') {
            perfectMet = true;
        }
        
        requirements.push({
            id: 'perfect',
            description: `perfect: Secondary at same major`,
            current: `Currently: ${perfectCurrent}`,
            met: perfectMet,
            required: `Required: ${perfectRequired}`,
            icon: perfectMet ? '✅' : '❌'
        });
        
        // 4. Half-Step Requirement (Both at 100%+ Late in same major)
        const halfStepRequired = `${currentMainMajor} Late (100%+)`;
        const halfStepCurrent = formatRealmInfo(
            playerData.secondaryPathRealm, 
            playerData.secondaryPathProgress
        );
        const halfStepMet = playerData.secondaryPathRealmMajor === currentMainMajor &&
                           playerData.secondaryPathRealmMinor === 'Late' &&
                           playerData.secondaryPathProgress >= 100;
        
        requirements.push({
            id: 'halfstep',
            description: `Half-Step: Both at 100%+ Late in same major`,
            current: `Currently: ${halfStepCurrent}`,
            met: halfStepMet,
            required: `Required: ${halfStepRequired}`,
            icon: halfStepMet ? '✅' : '❌'
        });
        
        // 5. Current Scenario Status
        requirements.push({
            id: 'current-scenario',
            description: `Current Virya Scenario`,
            current: currentScenario || 'None (not eligible)',
            met: currentScenario !== null,
            required: 'Detected based on requirements',
            icon: currentScenario ? '🎯' : '➖'
        });
        
        return requirements;
    }

    // NEW: Calculate progress percentages for each scenario
    static calculateScenarioProgress(playerData, scenario) {
        let progress = 0;
        let details = '';
        
        switch(scenario) {
            case 'Completion':
                if (playerData.mainPathRealmMinor === 'Late') {
                    progress = Math.min(100, playerData.mainPathProgress);
                    details = `Main Path: ${playerData.mainPathProgress.toFixed(1)}% Late`;
                }
                break;
                
            case 'Eminence':
                progress = this.calculateEminenceProgress(playerData);
                details = this.getEminenceProgressDetails(playerData);
                break;
                
            case 'perfect':
                progress = this.calculateperfectProgress(playerData);
                details = this.getperfectProgressDetails(playerData);
                break;
                
            case 'Half-Step':
                progress = this.calculateHalfStepProgress(playerData);
                details = this.getHalfStepProgressDetails(playerData);
                break;
        }
        
        return {
            progress: Math.min(100, Math.max(0, progress)),
            details
        };
    }
    
    static calculateEminenceProgress(playerData) {
        const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
                           'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        
        const currentMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
        const previousMajor = currentMajorIndex > 0 ? realmOrder[currentMajorIndex - 1] : null;
        
        if (!previousMajor) return 0;
        
        if (playerData.secondaryPathRealmMajor === previousMajor) {
            const stageValue = { 'Early': 0, 'Mid': 50, 'Late': 100 };
            const requiredStage = playerData.mainPathRealmMajor === 'Voidbreak' ? 'Late' : 'Mid';
            const currentStage = playerData.secondaryPathRealmMinor;
            
            const stageProgress = stageValue[currentStage] || 0;
            const progressInStage = (playerData.secondaryPathProgress / 100) * 50;
            
            return Math.min(100, stageProgress + progressInStage);
        }
        
        return 0;
    }
    
    static getEminenceProgressDetails(playerData) {
        const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
                           'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        
        const currentMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
        const previousMajor = currentMajorIndex > 0 ? realmOrder[currentMajorIndex - 1] : null;
        
        if (!previousMajor) return 'No previous major (Incarnation)';
        
        const requiredStage = playerData.mainPathRealmMajor === 'Voidbreak' ? 'Late' : 'Mid';
        return `Need: ${previousMajor} ${requiredStage}`;
    }
    
    static calculateperfectProgress(playerData) {
        if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor) {
            const requiredStage = playerData.mainPathRealmMajor === 'Voidbreak' ? 'Mid' : 'Early';
            const stageValue = { 'Early': 0, 'Mid': 50, 'Late': 100 };
            
            const currentStage = playerData.secondaryPathRealmMinor;
            const currentStageValue = stageValue[currentStage] || 0;
            
            if (currentStage === requiredStage || 
                (requiredStage === 'Early' && currentStage === 'Mid') ||
                (requiredStage === 'Mid' && currentStage === 'Late')) {
                // At or beyond required stage
                const stageProgress = 50; // 50% for reaching required stage
                const progressInStage = (playerData.secondaryPathProgress / 100) * 50;
                return stageProgress + progressInStage;
            } else {
                // Not yet at required stage
                return (currentStageValue / stageValue[requiredStage]) * 100;
            }
        }
        
        return 0;
    }
    
    static getperfectProgressDetails(playerData) {
        const requiredStage = playerData.mainPathRealmMajor === 'Voidbreak' ? 'Mid' : 'Early';
        return `Need: ${playerData.mainPathRealmMajor} ${requiredStage}`;
    }
    
    static calculateHalfStepProgress(playerData) {
        if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
            playerData.secondaryPathRealmMinor === 'Late' &&
            playerData.mainPathRealmMinor === 'Late') {
            
            const mainProgress = playerData.mainPathProgress;
            const secondaryProgress = playerData.secondaryPathProgress;
            
            // Both need to be at 100%+ Late
            return (mainProgress + secondaryProgress) / 2;
        }
        
        return 0;
    }
    
    static getHalfStepProgressDetails(playerData) {
        return `Both paths need 100%+ Late in ${playerData.mainPathRealmMajor}`;
    }

  // In ViryaCalculator.js, update the calculateDaysToScenario method:
static calculateDaysToScenario(targetScenario, playerData, secondaryDailyXP) {
    console.group(`📅 Calculating days to ${targetScenario}`);
    console.log('Player Data:', {
        mainPath: `${playerData.mainPathRealm} (${playerData.mainPathProgress}%)`,
        secondaryPath: `${playerData.secondaryPathRealm} (${playerData.secondaryPathProgress}%)`
    });
    console.log('Secondary Daily XP:', secondaryDailyXP);
    
    // First check if main path is eligible for any Virya
    if (!(playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100)) {
        console.log('Main path not at 100%+ Late - no Virya eligible');
        console.groupEnd();
        return Infinity;
    }
    
    // Get current scenario
    const currentScenarioInfo = this.detectScenario(playerData);
    const currentScenario = currentScenarioInfo.scenario;
    
    console.log('Current scenario:', currentScenario);
    console.log('Target scenario:', targetScenario);
    
    // Define scenario order
    const scenarioOrder = ['Completion', 'Eminence', 'perfect', 'Half-Step'];
    const currentIndex = scenarioOrder.indexOf(currentScenario);
    const targetIndex = scenarioOrder.indexOf(targetScenario);
    
    console.log('Scenario order:', scenarioOrder);
    console.log('Current index:', currentIndex, 'Target index:', targetIndex);
    
    // Check if target is already achieved or passed
    if (targetIndex < currentIndex) {
        console.log('Target scenario already passed');
        console.groupEnd();
        return 0; // Already achieved
    }
    
    if (targetIndex === currentIndex) {
        console.log('Already at target scenario');
        console.groupEnd();
        return 0; // Already at this scenario
    }
    
    // If no daily XP for secondary path
    if (secondaryDailyXP <= 0) {
        console.log('No secondary daily XP available');
        console.groupEnd();
        return Infinity;
    }
    
    // Calculate XP needed based on target scenario
    let xpNeeded = 0;
    
    try {
        switch(targetScenario) {
            case 'Eminence':
                xpNeeded = this.calculateXPForEminence(playerData);
                break;
            case 'perfect':
                // Special handling for perfect
                xpNeeded = this.calculateXPForperfect(playerData);
                
                // If coming from Eminence, check if we're already at the right realm
                if (currentScenario === 'Eminence') {
                    const requiredRealm = playerData.mainPathRealmMajor === 'Voidbreak' ? 
                        `${playerData.mainPathRealmMajor} Mid` : 
                        `${playerData.mainPathRealmMajor} Early`;
                    
                    if (playerData.secondaryPathRealm === requiredRealm) {
                        // Already at right realm, just need to reach 100%
                        const realmXP = Realms[playerData.secondaryPathRealm]?.xp || 0;
                        const currentXP = realmXP * (playerData.secondaryPathProgress / 100);
                        xpNeeded = Math.max(0, realmXP - currentXP);
                    }
                }
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

    static calculateXPForEminence(playerData) {
        const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'perfect', 
                           'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        const currentMainMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
        const previousMajor = currentMainMajorIndex > 0 ? realmOrder[currentMainMajorIndex - 1] : null;
        
        if (!previousMajor) return Infinity;
        
        let targetRealm;
        if (playerData.mainPathRealmMajor === 'Voidbreak') {
            targetRealm = `${previousMajor} Late`;
        } else {
            targetRealm = `${previousMajor} Mid`;
        }
        
        return this.calculateXPToReach(playerData.secondaryPathRealm, 
                                      playerData.secondaryPathProgress,
                                      targetRealm, 100);
    }

    static calculateXPForperfect(playerData) {
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

    static calculateXPForHalfStep(playerData) {
        const targetRealm = `${playerData.mainPathRealmMajor} Late`;
        return this.calculateXPToReach(playerData.secondaryPathRealm,
                                      playerData.secondaryPathProgress,
                                      targetRealm, 100);
    }

    static calculateXPToReach(currentRealm, currentProgress, targetRealm, targetProgress) {
        const currentRealmData = Realms[currentRealm];
        const currentXP = currentRealmData.xp * (currentProgress / 100);
        
        const targetRealmData = Realms[targetRealm];
        const targetXP = targetRealmData.xp * (targetProgress / 100);
        
        if (currentXP >= targetXP) {
            return 0;
        }
        
        return targetXP - currentXP;
    }
}

export { ViryaCalculator };