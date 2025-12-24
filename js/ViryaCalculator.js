import { GameConstants, Realms } from './gameData.js';
import { CalculatorUtils } from './utils.js';

class ViryaCalculator {
    static detectScenario(playerData) {
        const isMainPath100Late = playerData.mainPathRealmMinor === 'Late' && 
                                 playerData.mainPathProgress >= 100;
        
        if (!isMainPath100Late) {
            return {
                scenario: null,
                absorptionBonus: 0.0,
                isActive: false
            };
        }
        
        const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
                           'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        
        const currentMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
        const previousMajor = currentMajorIndex > 0 ? realmOrder[currentMajorIndex - 1] : null;
        
        // Check Half-Step
        const isSecondary100Late = playerData.secondaryPathRealmMinor === 'Late' && 
                                   playerData.secondaryPathProgress >= 100;
        const isSameMajor = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor;
        
        if (isSecondary100Late && isSameMajor) {
            return {
                scenario: 'Half-Step',
                absorptionBonus: 0.4,
                isActive: true
            };
        }
        
        // Check Perfection
        if (playerData.mainPathRealmMajor === 'Voidbreak') {
            if (playerData.secondaryPathRealmMajor === 'Voidbreak' && 
                playerData.secondaryPathRealmMinor === 'Mid') {
                return {
                    scenario: 'Perfection',
                    absorptionBonus: 0.2,
                    isActive: true
                };
            }
        } else {
            if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor && 
                playerData.secondaryPathRealmMinor === 'Early') {
                return {
                    scenario: 'Perfection',
                    absorptionBonus: 0.2,
                    isActive: true
                };
            }
        }
        
        // Check Eminence
        if (previousMajor) {
            if (playerData.mainPathRealmMajor === 'Voidbreak') {
                if (playerData.secondaryPathRealmMajor === previousMajor && 
                    playerData.secondaryPathRealmMinor === 'Late') {
                    return {
                        scenario: 'Eminence',
                        absorptionBonus: 0.2,
                        isActive: true
                    };
                }
            } else {
                if (playerData.secondaryPathRealmMajor === previousMajor && 
                    playerData.secondaryPathRealmMinor === 'Mid') {
                    return {
                        scenario: 'Eminence',
                        absorptionBonus: 0.2,
                        isActive: true
                    };
                }
            }
        }
        
        // Completion (no bonus)
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
            case 'Perfection':
                return nextMajor ? `${nextMajor} Mid` : 'Max Realm Reached';
            case 'Half-Step':
                return nextMajor ? `${nextMajor} Late` : 'Max Realm Reached';
            case 'Completion':
                return 'Timegate Completion';
            default:
                return 'N/A';
        }
    }

    static checkRequirements(playerData) {
        const requirements = [];
        
        // Main path at 100% Late (or more)
        const main100Late = playerData.mainPathRealmMinor === 'Late' && 
                           playerData.mainPathProgress >= 100;
        requirements.push({
            description: `Main path at ${playerData.mainPathProgress.toFixed(1)}% Late${playerData.mainPathProgress > 100 ? ' (Overflow)' : ''}`,
            met: main100Late
        });
        
        if (!main100Late) {
            return requirements;
        }
        
        // Get current Virya scenario
        const currentVirya = this.detectScenario(playerData).scenario;
        
        // Eminence requirement
        let eminenceMet = false;
        if (currentVirya === 'Perfection' || currentVirya === 'Half-Step') {
            eminenceMet = true;
        } else {
            const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
                               'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
            const currentMainMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
            const previousMajor = currentMainMajorIndex > 0 ? realmOrder[currentMainMajorIndex - 1] : null;
            
            if (previousMajor) {
                if (playerData.mainPathRealmMajor === 'Voidbreak') {
                    eminenceMet = playerData.secondaryPathRealmMajor === previousMajor && 
                                 playerData.secondaryPathRealmMinor === 'Late';
                } else {
                    eminenceMet = playerData.secondaryPathRealmMajor === previousMajor && 
                                 playerData.secondaryPathRealmMinor === 'Mid';
                }
            }
        }
        requirements.push({
            description: 'Eminence: Secondary at required previous major realm',
            met: eminenceMet
        });
        
        // Perfection requirement
        let perfectionMet = false;
        if (currentVirya === 'Half-Step') {
            perfectionMet = true;
        } else {
            if (playerData.mainPathRealmMajor === 'Voidbreak') {
                perfectionMet = playerData.secondaryPathRealmMajor === 'Voidbreak' && 
                               playerData.secondaryPathRealmMinor === 'Mid';
            } else {
                perfectionMet = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor && 
                               playerData.secondaryPathRealmMinor === 'Early';
            }
        }
        requirements.push({
            description: 'Perfection: Secondary at same major (Early/Mid)',
            met: perfectionMet
        });
        
        // Half-Step requirement
        const halfStepMet = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
                           playerData.secondaryPathRealmMinor === 'Late' &&
                           playerData.secondaryPathProgress >= 100;
        requirements.push({
            description: 'Half-Step: Both paths at 100%+ Late in same major',
            met: halfStepMet
        });
        
        return requirements;
    }

    static calculateDaysToScenario(targetScenario, playerData, dailyXP) {
        if (!(playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress >= 100)) {
            return Infinity;
        }
        
        const scenarioOrder = ['Completion', 'Eminence', 'Perfection', 'Half-Step'];
        const currentScenario = this.detectScenario(playerData).scenario;
        const currentIndex = scenarioOrder.indexOf(currentScenario);
        const targetIndex = scenarioOrder.indexOf(targetScenario);
        
        if (targetIndex <= currentIndex) {
            return 0;
        }
        
        let xpNeeded = 0;
        
        switch(targetScenario) {
            case 'Eminence':
                xpNeeded = this.calculateXPForEminence(playerData);
                break;
            case 'Perfection':
                xpNeeded = this.calculateXPForPerfection(playerData);
                break;
            case 'Half-Step':
                xpNeeded = this.calculateXPForHalfStep(playerData);
                break;
            default:
                return Infinity;
        }
        
        return dailyXP > 0 ? xpNeeded / dailyXP : Infinity;
    }

    static calculateXPForEminence(playerData) {
        const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
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

    static calculateXPForPerfection(playerData) {
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