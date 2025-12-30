import { Realms, RealmMajorTotalXP, timegateLength } from './gameData.js';
import { XPCalculator } from './XPCalculator.js';
import { Logger } from './Logger.js';

class RealmProgressionSimulator {
    constructor(playerData, baseDailyXP, simulationId = 'default') {
        this.playerData = { ...playerData };
        this.baseDailyXP = baseDailyXP;
        this.simulationId = simulationId;
        this.realmOrder = ['Nascent', 'Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
        this.minorOrder = ['Early', 'Mid', 'Late'];
    }
    
    simulateDays(days, absorptionBonus = 0) {
        Logger.group(`🎮 REALM PROGRESSION SIMULATION [${this.simulationId}]`, Logger.DEBUG);
        Logger.info(`Simulating ${days.toFixed(1)} days with ${absorptionBonus * 100}% absorption bonus`);
        Logger.debug(`Starting from: ${this.playerData.mainPathRealm} (${this.playerData.mainPathProgress}%)`);
        
        Logger.section('INITIAL CONDITIONS', Logger.DEBUG);
        Logger.table({
            'Current Realm': this.playerData.mainPathRealm,
            'Progress': `${this.playerData.mainPathProgress}%`,
            'Absorption Bonus': `${absorptionBonus * 100}%`,
            'Days to Simulate': days.toFixed(1),
            'Base Daily XP': this.baseDailyXP.toLocaleString()
        }, 'Simulation Parameters');
        
        let currentRealm = this.playerData.mainPathRealm;
        let currentProgress = this.playerData.mainPathProgress;
        let currentXP = Realms[currentRealm]?.xp * (currentProgress / 100) || 0;
        let totalXP = 0;
        let daysRemaining = days;
        const realmHistory = [];
        let step = 0;
        
        Logger.section('PROGRESSION STEPS', Logger.DEBUG);
        
        while (daysRemaining > 0 && currentRealm) {
            step++;
            Logger.group(`Step ${step}: ${currentRealm}`, Logger.DEBUG);
            
            const realmInfo = Realms[currentRealm];
            if (!realmInfo) {
                Logger.error(`Unknown realm: ${currentRealm}`);
                break;
            }
            
            const xpInCurrentRealm = realmInfo.xp;
            const effectiveDailyXP = this.calculateEffectiveDailyXP(currentRealm, absorptionBonus);
            
            Logger.debug(`Realm XP total: ${xpInCurrentRealm.toLocaleString()}`);
            Logger.debug(`Current XP in realm: ${currentXP.toLocaleString()}`);
            Logger.debug(`Effective daily XP: ${effectiveDailyXP.toLocaleString()}`);
            
            const xpNeededForRealm = xpInCurrentRealm - currentXP;
            const daysForThisRealm = Math.min(daysRemaining, xpNeededForRealm / effectiveDailyXP);
            
            // Add XP gained in this period
            const xpGained = effectiveDailyXP * daysForThisRealm;
            totalXP += xpGained;
            currentXP += xpGained;
            
            Logger.info(`Progress in ${currentRealm}:`);
            Logger.table({
                'Days spent': daysForThisRealm.toFixed(2),
                'XP gained': xpGained.toLocaleString(),
                'New realm progress': `${((currentXP / xpInCurrentRealm) * 100).toFixed(2)}%`,
                'Total XP so far': totalXP.toLocaleString(),
                'Days remaining': daysRemaining.toFixed(2)
            });
            
            realmHistory.push({
                realm: currentRealm,
                days: daysForThisRealm,
                xpGained: xpGained,
                absorptionBonus: absorptionBonus,
                dailyXP: effectiveDailyXP,
                progressStart: ((currentXP - xpGained) / xpInCurrentRealm * 100).toFixed(2) + '%',
                progressEnd: ((currentXP / xpInCurrentRealm) * 100).toFixed(2) + '%'
            });
            
            daysRemaining -= daysForThisRealm;
            
            // Check if we completed this realm
            if (currentXP >= xpInCurrentRealm && daysRemaining > 0) {
                const completionStatus = currentXP >= xpInCurrentRealm ? "COMPLETED" : "PARTIAL";
                Logger.success(`✓ ${currentRealm} ${completionStatus}`, {
                    'Total XP in realm': xpInCurrentRealm.toLocaleString(),
                    'XP achieved': currentXP.toLocaleString(),
                    'Overflow XP': (currentXP - xpInCurrentRealm).toLocaleString()
                });
                
                currentXP = 0;
                const nextRealm = this.getNextRealm(currentRealm);
                
                if (!nextRealm) {
                    Logger.warn('Reached highest possible realm');
                    break;
                }
                
                Logger.info(`Transitioning to: ${nextRealm}`);
                currentRealm = nextRealm;
            } else if (daysRemaining > 0) {
                Logger.debug(`Continuing in ${currentRealm}`, {
                    'Remaining XP in realm': (xpInCurrentRealm - currentXP).toLocaleString(),
                    'Days needed': ((xpInCurrentRealm - currentXP) / effectiveDailyXP).toFixed(2)
                });
            }
            
            Logger.groupEnd();
        }
        
        Logger.section('SIMULATION RESULTS', Logger.INFO);
        Logger.table({
            'Total XP Gained': totalXP.toLocaleString(),
            'Final Realm': currentRealm,
            'Final Progress': `${((currentXP / Realms[currentRealm]?.xp || 1) * 100).toFixed(2)}%`,
            'Total Days Simulated': (days - daysRemaining).toFixed(2),
            'Days Unused': daysRemaining.toFixed(2),
            'Steps Taken': step
        });
        
        Logger.section('REALM HISTORY', Logger.DEBUG);
        if (Logger.level <= Logger.DEBUG) {
            realmHistory.forEach((entry, index) => {
                Logger.debug(`Step ${index + 1}: ${entry.realm}`, {
                    'Days': entry.days.toFixed(2),
                    'XP gained': Math.round(entry.xpGained).toLocaleString(),
                    'Daily XP': Math.round(entry.dailyXP).toLocaleString(),
                    'Progress': `${entry.progressStart} → ${entry.progressEnd}`,
                    'Absorption bonus': `${entry.absorptionBonus * 100}%`
                });
            });
        }
        
        Logger.groupEnd();
        
        return {
            totalXP,
            finalRealm: currentRealm,
            finalProgress: (currentXP / Realms[currentRealm]?.xp || 1) * 100,
            realmHistory,
            daysConsumed: days - daysRemaining,
            steps: step
        };
    }
    
    calculateEffectiveDailyXP(realm, absorptionBonus) {
        Logger.debug(`Calculating daily XP for ${realm} with ${absorptionBonus * 100}% bonus`, Logger.DEBUG);
        
        // Create temporary player data for this realm
        const tempPlayerData = { 
            ...this.playerData,
            mainPathRealm: realm
        };
        
        // Split realm to update major/minor
        const [major, minor] = realm.split(' ');
        tempPlayerData.mainPathRealmMajor = major;
        tempPlayerData.mainPathRealmMinor = minor;
        
        // Calculate daily XP with given absorption bonus
        const dailyXP = XPCalculator.calculateDailyXPWithAbsorptionBonus(tempPlayerData, absorptionBonus);
        
        Logger.debug(`Effective daily XP: ${dailyXP.toLocaleString()}`, {
            'Realm': realm,
            'Base Absorption': Realms[realm]?.absorption || 0,
            'Absorption Bonus': absorptionBonus,
            'Total Absorption': (Realms[realm]?.absorption || 0) + absorptionBonus
        });
        
        return dailyXP;
    }
    
    getNextRealm(currentRealm) {
        const [major, minor] = currentRealm.split(' ');
        const minorIndex = this.minorOrder.indexOf(minor);
        const majorIndex = this.realmOrder.indexOf(major);
        
        if (minorIndex < 2) {
            // Move to next minor in same major
            return `${major} ${this.minorOrder[minorIndex + 1]}`;
        } else if (majorIndex < this.realmOrder.length - 1) {
            // Move to next major's Early
            return `${this.realmOrder[majorIndex + 1]} Early`;
        }
        return null; // At highest realm
    }
    
    getRealmAtBreakthrough(currentTimegateDays, absorptionBonus = 0) {
        Logger.group(`🎯 CALCULATING REALM AT BREAKTHROUGH`, Logger.DEBUG);
        Logger.info(`Timegate days: ${currentTimegateDays}, Absorption bonus: ${absorptionBonus * 100}%`);
        
        const result = this.simulateDays(currentTimegateDays, absorptionBonus);
        
        Logger.info(`At breakthrough, player will be at:`, {
            'Realm': result.finalRealm,
            'Progress': `${result.finalProgress.toFixed(2)}%`,
            'Total XP gained': result.totalXP.toLocaleString()
        });
        
        Logger.groupEnd();
        return result;
    }
    
    calculateDaysToReachRealm(targetRealm, targetProgress = 100, absorptionBonus = 0) {
        Logger.group(`⏱️ CALCULATING DAYS TO REACH ${targetRealm} (${targetProgress}%)`, Logger.DEBUG);
        
        let currentRealm = this.playerData.mainPathRealm;
        let currentProgress = this.playerData.mainPathProgress;
        let currentXP = Realms[currentRealm]?.xp * (currentProgress / 100) || 0;
        let totalDays = 0;
        
        const targetRealmXP = Realms[targetRealm]?.xp * (targetProgress / 100);
        if (!targetRealmXP) {
            Logger.error(`Unknown target realm: ${targetRealm}`);
            Logger.groupEnd();
            return Infinity;
        }
        
        // Get current and target realm indices
        const currentIndex = this.getRealmIndex(currentRealm);
        const targetIndex = this.getRealmIndex(targetRealm);
        
        Logger.info(`Realm indices: Current=${currentIndex} (${currentRealm}), Target=${targetIndex} (${targetRealm})`);
        
        if (currentIndex > targetIndex) {
            Logger.success(`Already past target realm ${targetRealm}`);
            Logger.groupEnd();
            return 0;
        }
        
        if (currentRealm === targetRealm && currentProgress >= targetProgress) {
            Logger.success(`Already at or beyond target progress in ${targetRealm}`);
            Logger.groupEnd();
            return 0;
        }
        
        // Calculate XP needed
        let xpNeeded = 0;
        if (currentRealm === targetRealm) {
            xpNeeded = Math.max(0, targetRealmXP - currentXP);
            Logger.debug(`Same realm calculation:`, {
                'Current XP': currentXP.toLocaleString(),
                'Target XP': targetRealmXP.toLocaleString(),
                'XP needed': xpNeeded.toLocaleString()
            });
        } else {
            // Sum XP through all intermediate realms
            Logger.debug(`Calculating XP through multiple realms:`, {
                'From': currentRealm,
                'To': targetRealm,
                'Steps': targetIndex - currentIndex
            });
            
            for (let i = currentIndex; i <= targetIndex; i++) {
                const realm = this.getRealmFromIndex(i);
                const realmXP = Realms[realm].xp;
                
                if (i === currentIndex) {
                    // Current realm - partial
                    xpNeeded += (realmXP - currentXP);
                    Logger.debug(`Step ${i - currentIndex + 1}: ${realm} (partial)`, {
                        'Realm XP': realmXP.toLocaleString(),
                        'Current XP in realm': currentXP.toLocaleString(),
                        'XP needed from realm': (realmXP - currentXP).toLocaleString(),
                        'Cumulative XP needed': xpNeeded.toLocaleString()
                    });
                } else if (i === targetIndex) {
                    // Target realm - partial to target progress
                    xpNeeded += targetRealmXP;
                    Logger.debug(`Step ${i - currentIndex + 1}: ${realm} (target - partial)`, {
                        'Target XP in realm': targetRealmXP.toLocaleString(),
                        'Cumulative XP needed': xpNeeded.toLocaleString()
                    });
                } else {
                    // Full intermediate realm
                    xpNeeded += realmXP;
                    Logger.debug(`Step ${i - currentIndex + 1}: ${realm} (full)`, {
                        'Realm XP': realmXP.toLocaleString(),
                        'Cumulative XP needed': xpNeeded.toLocaleString()
                    });
                }
            }
        }
        
        if (xpNeeded <= 0) {
            Logger.success(`No XP needed to reach target`);
            Logger.groupEnd();
            return 0;
        }
        
        // Calculate effective daily XP (use current realm as approximation)
        const effectiveDailyXP = this.calculateEffectiveDailyXP(currentRealm, absorptionBonus);
        const daysNeeded = effectiveDailyXP > 0 ? xpNeeded / effectiveDailyXP : Infinity;
        
        Logger.info(`Final calculation:`, {
            'Total XP needed': xpNeeded.toLocaleString(),
            'Effective daily XP': effectiveDailyXP.toLocaleString(),
            'Days needed': daysNeeded === Infinity ? '∞' : daysNeeded.toFixed(2),
            'Weeks needed': daysNeeded === Infinity ? '∞' : (daysNeeded / 7).toFixed(2),
            'Months needed': daysNeeded === Infinity ? '∞' : (daysNeeded / 30).toFixed(2)
        });
        
        Logger.groupEnd();
        return daysNeeded;
    }
    
    getRealmIndex(realmName) {
        const [major, minor] = realmName.split(' ');
        const majorIndex = this.realmOrder.indexOf(major);
        const minorIndex = this.minorOrder.indexOf(minor);
        
        if (majorIndex === -1 || minorIndex === -1) {
            Logger.error(`Invalid realm name: ${realmName}`);
            return -1;
        }
        
        return majorIndex * 3 + minorIndex;
    }
    
    getRealmFromIndex(index) {
        const majorIndex = Math.floor(index / 3);
        const minorIndex = index % 3;
        if (majorIndex < this.realmOrder.length && minorIndex < this.minorOrder.length) {
            return `${this.realmOrder[majorIndex]} ${this.minorOrder[minorIndex]}`;
        }
        return null;
    }
}

export { RealmProgressionSimulator };