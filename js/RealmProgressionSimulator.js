import { Realms, RealmMajorTotalXP, timegateLength, REALM_ORDER_MAJOR, REALM_ORDER_MINOR } from './gameData.js';
import { XPCalculator } from './XPCalculator.js';
import { Logger } from './Logger.js';

class RealmProgressionSimulator {
    constructor(playerData, baseDailyXP, simulationId = 'default') {
        this.playerData = { ...playerData };
        this.baseDailyXP = baseDailyXP;
        this.simulationId = simulationId;
        this.realmOrder = REALM_ORDER_MAJOR;
        this.minorOrder = REALM_ORDER_MINOR;
    }
    
    simulateDays(days, absorptionBonus = 0, bonusEndCondition = null, maxRealm = null) {
        Logger.group(`🎮 REALM PROGRESSION SIMULATION [${this.simulationId}]`, Logger.DEBUG);
        Logger.info(`Simulating ${days.toFixed(1)} days with ${absorptionBonus * 100}% absorption bonus`);
        Logger.debug(`Starting from: ${this.playerData.mainPathRealm} (${this.playerData.mainPathProgress}%)`);
        
        Logger.section('INITIAL CONDITIONS', Logger.DEBUG);
        Logger.table({
            'Current Realm': this.playerData.mainPathRealm,
            'Progress': `${this.playerData.mainPathProgress}%`,
            'Absorption Bonus': `${absorptionBonus * 100}%`,
            'Days to Simulate': days.toFixed(1),
            'Base Daily XP': this.baseDailyXP.toLocaleString(),
            'Max Realm': maxRealm || 'None',
            'Bonus End Condition': bonusEndCondition ? bonusEndCondition.endsAt : 'None'
        }, 'Simulation Parameters');
        
        let currentRealm = this.playerData.mainPathRealm;
        let currentProgress = this.playerData.mainPathProgress;
        let currentXP = Realms[currentRealm]?.xp * (currentProgress / 100) || 0;
        let totalXP = 0;
        let daysRemaining = days;
        const realmHistory = [];
        let step = 0;
        let currentAbsorptionBonus = absorptionBonus;
        // Store the starting major for bonus end condition checks
        const startingMajor = this.playerData.mainPathRealmMajor;
        
        Logger.section('PROGRESSION STEPS', Logger.DEBUG);
        
        while (daysRemaining > 0 && currentRealm) {
            step++;
            Logger.group(`Step ${step}: ${currentRealm}`, Logger.DEBUG);
            
            // Check if bonus should end based on current realm/progress
            if (bonusEndCondition && currentAbsorptionBonus > 0) {
                const currentProgress = (currentXP / Realms[currentRealm]?.xp || 0) * 100;
                const shouldEnd = this.shouldBonusEnd(currentRealm, currentProgress, bonusEndCondition, startingMajor);
                
                if (shouldEnd) {
                    Logger.info(`Bonus ending at ${currentRealm} - condition met: ${bonusEndCondition.endsAt}`);
                    currentAbsorptionBonus = 0;
                }
            }
            
            // Check if we've reached max realm at 100% Late
            // IMPORTANT: We should NOT stop here - we should continue simulating remaining days
            // to allow bonuses to show their benefit (scenarios with bonuses reach max realm faster
            // and should have more time remaining to gain XP)
            if (maxRealm) {
                const [currentMajor, currentMinor] = currentRealm.split(' ');
                const [maxMajor, maxMinor] = maxRealm.split(' ');
                
                // If we're at the max realm and it's Late, and we're at 100%, continue simulating
                // remaining days instead of stopping (this allows bonuses to show their benefit)
                if (currentRealm === maxRealm && currentMinor === 'Late') {
                    const currentProgress = (currentXP / Realms[currentRealm]?.xp || 1) * 100;
                    if (currentProgress >= 100) {
                        // Continue simulating remaining days - don't stop here
                        // The bonus should allow us to gain more XP in the remaining time
                        Logger.info(`Reached 100% Late in max realm ${maxRealm}, continuing to simulate remaining ${daysRemaining.toFixed(1)} days to show bonus benefit`);
                        // Don't break - continue to simulate remaining days
                    }
                }
                
                // If we would exceed max realm, stop
                if (this.isRealmAtOrBeyond(currentRealm, maxRealm) && currentRealm !== maxRealm) {
                    Logger.info(`Reached maximum realm ${maxRealm}, stopping progression`);
                    break;
                }
            }
            
            const realmInfo = Realms[currentRealm];
            if (!realmInfo) {
                Logger.error(`Unknown realm: ${currentRealm}`);
                break;
            }
            
            const xpInCurrentRealm = realmInfo.xp;
            const effectiveDailyXP = this.calculateEffectiveDailyXP(currentRealm, currentAbsorptionBonus);
            
            Logger.debug(`Realm XP total: ${xpInCurrentRealm.toLocaleString()}`);
            Logger.debug(`Current XP in realm: ${currentXP.toLocaleString()}`);
            Logger.debug(`Effective daily XP: ${effectiveDailyXP.toLocaleString()}`);
            Logger.debug(`Current absorption bonus: ${currentAbsorptionBonus * 100}%`);
            
            // Check if we already have overflow XP (currentXP > xpInCurrentRealm)
            const hasOverflow = currentXP > xpInCurrentRealm;
            const overflowXP = hasOverflow ? currentXP - xpInCurrentRealm : 0;
            
            // Check if we're at 100% Late in max realm - if so, continue simulating remaining days
            // to allow bonuses to show their benefit (scenarios with bonuses reach max realm faster
            // and should have more time remaining to gain XP)
            let daysForThisRealm;
            if (maxRealm && currentRealm === maxRealm && currentXP >= xpInCurrentRealm) {
                // At 100% Late in max realm - continue simulating remaining days
                // We already have overflow, so just use remaining days
                daysForThisRealm = daysRemaining;
            } else if (hasOverflow) {
                // We have overflow but not at max realm - we should progress immediately
                // Don't spend any days here, we'll progress to next realm
                daysForThisRealm = 0;
            } else {
                // Normal case - calculate days needed to complete realm or use remaining days
                const xpNeededForRealm = xpInCurrentRealm - currentXP;
                daysForThisRealm = Math.min(daysRemaining, Math.max(0, xpNeededForRealm / effectiveDailyXP));
            }
            
            // Add XP gained in this period
            // If we have overflow and daysForThisRealm is 0, we don't gain any new XP here
            // (we'll progress to next realm and carry the overflow)
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
                absorptionBonus: currentAbsorptionBonus,
                dailyXP: effectiveDailyXP,
                progressStart: ((currentXP - xpGained) / xpInCurrentRealm * 100).toFixed(2) + '%',
                progressEnd: ((currentXP / xpInCurrentRealm) * 100).toFixed(2) + '%'
            });
            
            daysRemaining -= daysForThisRealm;
            
            // If we have overflow and daysForThisRealm was 0, we need to progress immediately
            // Check current overflow after XP gain
            const currentOverflow = currentXP > xpInCurrentRealm ? currentXP - xpInCurrentRealm : 0;
            if (currentOverflow > 0 && daysForThisRealm === 0) {
                // We have overflow - progress to next realm immediately
                const nextRealm = this.getNextRealm(currentRealm);
                if (!nextRealm) {
                    Logger.warn('Reached highest possible realm');
                    break;
                }
                
                // Check if we should stop at max realm
                const [currentMajor, currentMinor] = currentRealm.split(' ');
                const [nextMajor, nextMinor] = nextRealm.split(' ');
                
                // Check if we've reached 100% Late in the max realm
                if (maxRealm && currentRealm === maxRealm && currentMinor === 'Late') {
                    // Continue simulating remaining days - don't progress
                    Logger.info(`Reached 100% Late in max realm ${maxRealm} with overflow, continuing to overflow for remaining ${daysRemaining.toFixed(1)} days (overflow will convert to next realm)`);
                    // currentXP already has the overflow, just continue
                    continue;
                }
                
                // Progress to next realm with overflow
                Logger.info(`Progressing from ${currentRealm} to ${nextRealm} with ${currentOverflow.toLocaleString()} overflow XP`);
                currentXP = currentOverflow; // Carry overflow to next realm
                currentRealm = nextRealm;
                continue; // Continue loop to process next realm
            }
            
            // Check if we completed this realm
            if (currentXP >= xpInCurrentRealm && daysRemaining > 0) {
                const completionStatus = currentXP >= xpInCurrentRealm ? "COMPLETED" : "PARTIAL";
                Logger.success(`✓ ${currentRealm} ${completionStatus}`, {
                    'Total XP in realm': xpInCurrentRealm.toLocaleString(),
                    'XP achieved': currentXP.toLocaleString(),
                    'Overflow XP': (currentXP - xpInCurrentRealm).toLocaleString()
                });
                
                // Check if bonus should end NOW that we've completed this realm at 100%
                // This needs to happen AFTER we complete the realm but BEFORE we progress
                if (bonusEndCondition && currentAbsorptionBonus > 0) {
                    const currentProgress = (currentXP / Realms[currentRealm]?.xp || 0) * 100;
                    if (this.shouldBonusEnd(currentRealm, currentProgress, bonusEndCondition, startingMajor)) {
                        Logger.info(`Bonus ending at ${currentRealm} - condition met: ${bonusEndCondition.endsAt}`);
                        currentAbsorptionBonus = 0;
                    }
                }
                
                // Check absorption optimization before progressing
                const nextRealm = this.getNextRealm(currentRealm);
                
                if (!nextRealm) {
                    Logger.warn('Reached highest possible realm');
                    break;
                }
                
                // Check if we should stop at max realm
                const [currentMajor, currentMinor] = currentRealm.split(' ');
                const [nextMajor, nextMinor] = nextRealm.split(' ');
                
                // Check if we've reached 100% Late in the max realm FIRST
                // IMPORTANT: We should NOT stop here - we should continue simulating remaining days
                // to allow bonuses to show their benefit (scenarios with bonuses reach max realm faster
                // and should have more time remaining to gain XP)
                // The overflow XP will be converted to next realm at the end of simulation
                if (maxRealm && currentRealm === maxRealm && currentMinor === 'Late' && currentXP >= xpInCurrentRealm) {
                    // Continue simulating remaining days - don't stop here and don't progress to next realm
                    // The bonus should allow us to gain more XP in the remaining time
                    // Overflow XP will accumulate and be converted to next realm at the end
                    Logger.info(`Reached 100% Late in max realm ${maxRealm}, continuing to overflow for remaining ${daysRemaining.toFixed(1)} days (overflow will convert to next realm)`);
                    // Don't break and don't progress - continue simulating in current realm
                    // Skip the rest of the realm progression logic and continue the loop
                    continue;
                }
                
                // Special case: If we're at 100% Late in current major and next realm is next major's Early, check if we should stop
                // Stop at 100% Late unless maxRealm is set and equals the next major's Late (meaning we need to reach it)
                // OR if maxRealm is the current realm's Late (soft limit - allow progression to next major)
                if (currentMinor === 'Late' && currentMajor !== nextMajor) {
                    const nextMajorLate = `${nextMajor} Late`;
                    
                    // Continue if:
                    // 1. maxRealm is explicitly set AND equals next major's Late (need to reach it)
                    // 2. maxRealm is the current realm's Late (soft limit - allow progression)
                    // Otherwise, stop at 100% Late to work on virya scenarios
                    if (maxRealm && (maxRealm === nextMajorLate || maxRealm === currentRealm)) {
                        // Continue to next major
                        if (maxRealm === nextMajorLate) {
                            Logger.info(`Continuing to ${nextMajor} to reach max realm ${maxRealm}`);
                        } else {
                            Logger.info(`Continuing to ${nextMajor} (maxRealm ${maxRealm} is soft limit, allowing progression)`);
                        }
                        // Don't break - continue to next realm
                    } else {
                        // Stop at 100% Late (either maxRealm is null, or maxRealm is not next major's Late and not current realm)
                        Logger.info(`Reached 100% Late in ${currentMajor}, stopping here to work on virya scenarios instead of progressing to ${nextMajor}`);
                        break;
                    }
                }
                
                // Check if next realm would exceed max realm
                // Only stop if nextRealm is BEYOND maxRealm (not equal to it - we need to reach the max realm)
                // IMPORTANT: Allow progression TO the max realm, only stop if going BEYOND it
                if (maxRealm && nextRealm !== maxRealm && this.isRealmAtOrBeyond(nextRealm, maxRealm)) {
                    Logger.info(`Next realm ${nextRealm} would exceed max realm ${maxRealm}, stopping`);
                    break;
                }
                
                // If we're moving to the max realm and it's Late, check if we can reach 100%
                if (maxRealm && nextRealm === maxRealm && nextMinor === 'Late') {
                    const nextRealmInfo = Realms[nextRealm];
                    const nextRealmXP = nextRealmInfo.xp;
                    const nextEffectiveDailyXP = this.calculateEffectiveDailyXP(nextRealm, currentAbsorptionBonus);
                    const daysNeededFor100Late = nextRealmXP / nextEffectiveDailyXP;
                    
                    if (daysNeededFor100Late <= daysRemaining) {
                        // Can reach 100% Late in max realm - do it and continue simulating remaining days
                        // IMPORTANT: Don't stop here - continue simulating remaining days to allow bonuses to show their benefit
                        // Carry overflow XP from current realm
                        const overflowXP = currentXP - xpInCurrentRealm;
                        const daysToUse = daysNeededFor100Late;
                        const xpGained = nextEffectiveDailyXP * daysToUse;
                        totalXP += xpGained;
                        daysRemaining -= daysToUse;
                        // Add overflow XP to the next realm (will be > 100% if overflow exists)
                        currentXP = nextRealmXP + overflowXP;
                        currentRealm = nextRealm;
                        
                        realmHistory.push({
                            realm: nextRealm,
                            days: daysToUse,
                            xpGained: xpGained,
                            absorptionBonus: currentAbsorptionBonus,
                            dailyXP: nextEffectiveDailyXP,
                            progressStart: '0%',
                            progressEnd: '100%'
                        });
                        
                        Logger.info(`Reached 100% Late in max realm ${maxRealm}, continuing to simulate remaining ${daysRemaining.toFixed(1)} days to show bonus benefit`);
                        // Don't break - continue simulating remaining days
                        // The check at line 163 will handle continuing the simulation
                    }
                }
                
                // Absorption optimization: check if staying in current realm with bonus is better
                // Only check for minor realm transitions (same major)
                const isMinorTransition = currentMajor === nextMajor;
                
                if (isMinorTransition && this.shouldStayForBetterAbsorption(currentRealm, nextRealm, currentAbsorptionBonus)) {
                    const currentEffective = this.getEffectiveAbsorption(currentRealm, currentAbsorptionBonus);
                    const nextEffective = this.getEffectiveAbsorption(nextRealm, 0);
                    
                    Logger.info(`Absorption optimization: Staying in ${currentRealm} (${currentEffective}) vs ${nextRealm} (${nextEffective})`);
                    Logger.info(`Calculating XP for ${nextRealm} using ${currentRealm} absorption bonus`);
                    
                    // Calculate XP needed for next realm using current (better) absorption
                    const nextRealmXP = Realms[nextRealm]?.xp || 0;
                    const xpNeededForNextRealm = nextRealmXP;
                    const daysNeededForNextRealm = xpNeededForNextRealm / effectiveDailyXP;
                    
                    if (daysNeededForNextRealm <= daysRemaining) {
                        // We can complete next realm with current absorption, do it
                        const daysToUse = Math.min(daysRemaining, daysNeededForNextRealm);
                        const xpGainedForNext = effectiveDailyXP * daysToUse;
                        totalXP += xpGainedForNext;
                        daysRemaining -= daysToUse;
                        
                        realmHistory.push({
                            realm: `${nextRealm} (using ${currentRealm} absorption)`,
                            days: daysToUse,
                            xpGained: xpGainedForNext,
                            absorptionBonus: currentAbsorptionBonus,
                            dailyXP: effectiveDailyXP,
                            progressStart: '0%',
                            progressEnd: `${((xpGainedForNext / nextRealmXP) * 100).toFixed(2)}%`
                        });
                        
                        if (xpGainedForNext >= nextRealmXP) {
                            // Completed next realm, move to it and check for further progression
                            // Carry overflow XP
                            const overflowXP = xpGainedForNext - nextRealmXP;
                            currentXP = overflowXP;
                            currentRealm = nextRealm;
                            // Continue loop to check if we can progress further (absorption check will happen again)
                        } else {
                            // Partial progress in next realm
                            currentXP = xpGainedForNext;
                            currentRealm = nextRealm;
                            // Continue loop - we're now in next realm with partial progress
                        }
                    } else {
                        // Not enough days to complete next realm, use remaining days in current realm
                        // But we're already at 100% of current realm, so we should progress but use remaining days
                        // Carry overflow XP from current realm
                        const overflowXP = currentXP - xpInCurrentRealm;
                        const daysToUse = daysRemaining;
                        const xpGainedForNext = effectiveDailyXP * daysToUse;
                        totalXP += xpGainedForNext;
                        // Add overflow XP from previous realm to the XP gained in next realm
                        currentXP = overflowXP + xpGainedForNext;
                        currentRealm = nextRealm;
                        daysRemaining = 0;
                        break;
                    }
                } else {
                    // Normal progression - either major transition or absorption is better in next realm
                    // Carry overflow XP to the next realm instead of resetting to 0
                    const overflowXP = currentXP - xpInCurrentRealm;
                    if (overflowXP > 0) {
                        Logger.info(`Carrying ${overflowXP.toLocaleString()} overflow XP to ${nextRealm}`);
                        currentXP = overflowXP;
                    } else {
                        currentXP = 0;
                    }
                    Logger.info(`Transitioning to: ${nextRealm}`);
                    currentRealm = nextRealm;
                }
            } else if (daysRemaining > 0) {
                Logger.debug(`Continuing in ${currentRealm}`, {
                    'Remaining XP in realm': (xpInCurrentRealm - currentXP).toLocaleString(),
                    'Days needed': ((xpInCurrentRealm - currentXP) / effectiveDailyXP).toFixed(2)
                });
            }
            
            Logger.groupEnd();
        }
        
        // At the end of simulation, convert any overflow XP to next realm progress
        // This handles the case where we've overflowed beyond 100% in the current realm
        const currentRealmInfo = Realms[currentRealm];
        if (currentRealmInfo && currentXP > currentRealmInfo.xp) {
            const overflowXP = currentXP - currentRealmInfo.xp;
            const nextRealm = this.getNextRealm(currentRealm);
            
            if (nextRealm && overflowXP > 0) {
                Logger.info(`Converting ${overflowXP.toLocaleString()} overflow XP from ${currentRealm} to ${nextRealm} progress`);
                const nextRealmInfo = Realms[nextRealm];
                if (nextRealmInfo) {
                    // Convert overflow XP to progress in next realm
                    currentXP = overflowXP;
                    currentRealm = nextRealm;
                    Logger.info(`Converted overflow: Now at ${nextRealm} with ${((currentXP / nextRealmInfo.xp) * 100).toFixed(2)}% progress`);
                }
            }
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
    
    shouldBonusEnd(realm, progress, endCondition, startingMajor) {
        if (!endCondition || endCondition.endsAt === 'Immediately') {
            return false;
        }
        
        // "Next Major" refers to the next major from the STARTING major, not the current major
        const startingMajorIndex = this.realmOrder.indexOf(startingMajor);
        const nextMajorFromStart = startingMajorIndex < this.realmOrder.length - 1 ? this.realmOrder[startingMajorIndex + 1] : null;
        
        if (endCondition.endsAt === 'Next Major Early') {
            if (!nextMajorFromStart) return false;
            return realm === `${nextMajorFromStart} Early` && progress >= 100;
        }
        
        if (endCondition.endsAt === 'Next Major Mid') {
            if (!nextMajorFromStart) return false;
            return realm === `${nextMajorFromStart} Mid` && progress >= 100;
        }
        
        if (endCondition.endsAt === 'Next Major Late') {
            if (!nextMajorFromStart) return false;
            return realm === `${nextMajorFromStart} Late` && progress >= 100;
        }
        
        return false;
    }
    
    getEffectiveAbsorption(realm, absorptionBonus) {
        const baseAbsorption = Realms[realm]?.absorption || 0;
        return baseAbsorption + absorptionBonus;
    }
    
    shouldStayForBetterAbsorption(currentRealm, nextRealm, currentBonus) {
        const currentEffective = this.getEffectiveAbsorption(currentRealm, currentBonus);
        const nextEffective = this.getEffectiveAbsorption(nextRealm, 0); // No bonus in next realm
        
        // Stay if current effective absorption is better than next realm's base absorption
        return currentEffective > nextEffective;
    }
    
    isRealmAtOrBeyond(realm, maxRealm) {
        if (!maxRealm) return false;
        
        const realmIndex = this.getRealmIndex(realm);
        const maxIndex = this.getRealmIndex(maxRealm);
        
        if (realmIndex === -1 || maxIndex === -1) return false;
        
        return realmIndex >= maxIndex;
    }
    
    getMaximumReachableRealm(startRealm, startProgress, daysAvailable, absorptionBonus = 0) {
        Logger.group(`🎯 CALCULATING MAXIMUM REACHABLE REALM`, Logger.DEBUG);
        Logger.info(`Starting from: ${startRealm} (${startProgress}%), Days: ${daysAvailable}, Bonus: ${absorptionBonus * 100}%`);
        
        let currentRealm = startRealm;
        let currentXP = Realms[currentRealm]?.xp * (startProgress / 100) || 0;
        let daysRemaining = daysAvailable;
        
        while (daysRemaining > 0 && currentRealm) {
            const realmInfo = Realms[currentRealm];
            if (!realmInfo) break;
            
            const [currentMajor, currentMinor] = currentRealm.split(' ');
            
            // If we're at Late, check if we can reach 100% - but first check if we can progress to next major's Late
            if (currentMinor === 'Late') {
                const effectiveDailyXP = this.calculateEffectiveDailyXP(currentRealm, absorptionBonus);
                const xpNeeded = realmInfo.xp - currentXP;
                const daysNeeded = xpNeeded / effectiveDailyXP;
                
                if (daysNeeded <= daysRemaining) {
                    // Can reach 100% Late - but check if we can progress to next major's Late
                    const nextRealm = this.getNextRealm(currentRealm);
                    if (nextRealm) {
                        const [nextMajor, nextMinor] = nextRealm.split(' ');
                        // If next realm is a different major, check if we can reach that major's Late
                        if (currentMajor !== nextMajor) {
                            // Calculate if we can reach the next major's Late
                            const nextMajorLateRealm = `${nextMajor} Late`;
                            const nextMajorLateInfo = Realms[nextMajorLateRealm];
                            if (nextMajorLateInfo) {
                                // Calculate days needed to go from current 100% Late to next major's 100% Late
                                // We need: Early + Mid + Late of next major
                                const nextMajorEarly = `${nextMajor} Early`;
                                const nextMajorMid = `${nextMajor} Mid`;
                                const xpForNextMajor = Realms[nextMajorEarly].xp + Realms[nextMajorMid].xp + nextMajorLateInfo.xp;
                                const daysRemainingAfterCurrentLate = daysRemaining - daysNeeded;
                                const nextMajorEffectiveDailyXP = this.calculateEffectiveDailyXP(nextMajorEarly, absorptionBonus);
                                const daysNeededForNextMajorLate = xpForNextMajor / nextMajorEffectiveDailyXP;
                                
                                if (daysNeededForNextMajorLate <= daysRemainingAfterCurrentLate) {
                                    // Can reach next major's Late - that's our max realm
                                    Logger.info(`Maximum reachable realm: ${nextMajorLateRealm} at 100% (stopping here for virya scenarios)`);
                                    Logger.groupEnd();
                                    return nextMajorLateRealm;
                                }
                            }
                        }
                    }
                    
                    // Cannot reach next major's Late, so current Late is our max
                    Logger.info(`Maximum reachable realm: ${currentRealm} at 100% (stopping here for virya scenarios)`);
                    Logger.groupEnd();
                    return currentRealm;
                } else {
                    // Cannot reach 100% Late
                    const finalProgress = ((currentXP + effectiveDailyXP * daysRemaining) / realmInfo.xp * 100);
                    Logger.info(`Maximum reachable realm: ${currentRealm} (${finalProgress.toFixed(2)}%)`);
                    Logger.groupEnd();
                    return currentRealm;
                }
            }
            
            // For Early and Mid, continue progression
            const effectiveDailyXP = this.calculateEffectiveDailyXP(currentRealm, absorptionBonus);
            const xpNeeded = realmInfo.xp - currentXP;
            const daysNeeded = xpNeeded / effectiveDailyXP;
            
            if (daysNeeded <= daysRemaining) {
                // Can complete this realm
                daysRemaining -= daysNeeded;
                currentXP = 0;
                const nextRealm = this.getNextRealm(currentRealm);
                
                if (!nextRealm) {
                    Logger.info(`Reached highest realm: ${currentRealm}`);
                    Logger.groupEnd();
                    return currentRealm;
                }
                
                // Check if next realm is Late - if so, calculate if we can reach 100%
                const [nextMajor, nextMinor] = nextRealm.split(' ');
                
                if (nextMinor === 'Late') {
                    const nextRealmInfo = Realms[nextRealm];
                    const nextRealmXP = nextRealmInfo.xp;
                    const nextEffectiveDailyXP = this.calculateEffectiveDailyXP(nextRealm, absorptionBonus);
                    const daysNeededFor100Late = nextRealmXP / nextEffectiveDailyXP;
                    
                    if (daysNeededFor100Late <= daysRemaining) {
                        // Can reach 100% Late - this is our maximum reachable realm
                        Logger.info(`Maximum reachable realm: ${nextRealm} at 100% (stopping here for virya scenarios)`);
                        Logger.groupEnd();
                        return nextRealm;
                    } else {
                        // Cannot reach 100% Late
                        const finalProgress = (nextEffectiveDailyXP * daysRemaining / nextRealmXP * 100);
                        Logger.info(`Maximum reachable realm: ${nextRealm} (${finalProgress.toFixed(2)}%)`);
                        Logger.groupEnd();
                        return nextRealm;
                    }
                }
                
                currentRealm = nextRealm;
            } else {
                // Cannot complete this realm
                Logger.info(`Maximum reachable realm: ${currentRealm} (${((currentXP + effectiveDailyXP * daysRemaining) / realmInfo.xp * 100).toFixed(2)}%)`);
                Logger.groupEnd();
                return currentRealm;
            }
        }
        
        Logger.info(`Maximum reachable realm: ${currentRealm}`);
        Logger.groupEnd();
        return currentRealm;
    }
}

export { RealmProgressionSimulator };