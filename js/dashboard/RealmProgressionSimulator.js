import { Realms, RealmMajorTotalXP, timegateLength, REALM_ORDER_MAJOR, REALM_ORDER_MINOR } from '../utilities/gameData.js';
import { XPCalculator } from './XPCalculator.js';

class RealmProgressionSimulator {
    constructor(playerData, baseDailyXP, simulationId = 'default') {
        this.playerData = { ...playerData };
        this.baseDailyXP = baseDailyXP;
        this.simulationId = simulationId;
        this.realmOrder = REALM_ORDER_MAJOR;
        this.minorOrder = REALM_ORDER_MINOR;
    }
    
    simulateDays(days, absorptionBonus = 0, bonusEndCondition = null, maxRealm = null) {
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
        
        
        while (daysRemaining > 0 && currentRealm) {
            step++;
            
            // Check if bonus should end based on current realm/progress
            if (bonusEndCondition && currentAbsorptionBonus > 0) {
                const currentProgress = (currentXP / Realms[currentRealm]?.xp || 0) * 100;
                const shouldEnd = this.shouldBonusEnd(currentRealm, currentProgress, bonusEndCondition, startingMajor);
                
                if (shouldEnd) {
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
                        // Don't break - continue to simulate remaining days
                    }
                }
                
                // If we would exceed max realm, stop
                if (this.isRealmAtOrBeyond(currentRealm, maxRealm) && currentRealm !== maxRealm) {
                    break;
                }
            }
            
            const realmInfo = Realms[currentRealm];
            if (!realmInfo) {
                break;
            }
            
            const xpInCurrentRealm = realmInfo.xp;
            const effectiveDailyXP = this.calculateEffectiveDailyXP(currentRealm, currentAbsorptionBonus);
            
            
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
                    break;
                }
                
                // Check if we should stop at max realm
                const [currentMajor, currentMinor] = currentRealm.split(' ');
                const [nextMajor, nextMinor] = nextRealm.split(' ');
                
                // Check if we've reached 100% Late in the max realm
                if (maxRealm && currentRealm === maxRealm && currentMinor === 'Late') {
                    // Continue simulating remaining days - don't progress
                    // currentXP already has the overflow, just continue
                    continue;
                }
                
                // Progress to next realm with overflow
                currentXP = currentOverflow; // Carry overflow to next realm
                currentRealm = nextRealm;
                continue; // Continue loop to process next realm
            }
            
            // Check if we completed this realm
            if (currentXP >= xpInCurrentRealm && daysRemaining > 0) {
                const completionStatus = currentXP >= xpInCurrentRealm ? "COMPLETED" : "PARTIAL";
                // Check if bonus should end NOW that we've completed this realm at 100%
                // This needs to happen AFTER we complete the realm but BEFORE we progress
                if (bonusEndCondition && currentAbsorptionBonus > 0) {
                    const currentProgress = (currentXP / Realms[currentRealm]?.xp || 0) * 100;
                    if (this.shouldBonusEnd(currentRealm, currentProgress, bonusEndCondition, startingMajor)) {
                        currentAbsorptionBonus = 0;
                    }
                }
                
                // Check absorption optimization before progressing
                const nextRealm = this.getNextRealm(currentRealm);
                
                if (!nextRealm) {
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
                        } else {
                        }
                        // Don't break - continue to next realm
                    } else {
                        // Stop at 100% Late (either maxRealm is null, or maxRealm is not next major's Late and not current realm)
                        break;
                    }
                }
                
                // Check if next realm would exceed max realm
                // Only stop if nextRealm is BEYOND maxRealm (not equal to it - we need to reach the max realm)
                // IMPORTANT: Allow progression TO the max realm, only stop if going BEYOND it
                if (maxRealm && nextRealm !== maxRealm && this.isRealmAtOrBeyond(nextRealm, maxRealm)) {
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
                        currentXP = overflowXP;
                    } else {
                        currentXP = 0;
                    }
                    currentRealm = nextRealm;
                }
            } else if (daysRemaining > 0) {
            }
            
        }
        
        // At the end of simulation, convert any overflow XP to next realm progress
        // This handles the case where we've overflowed beyond 100% in the current realm
        const currentRealmInfo = Realms[currentRealm];
        if (currentRealmInfo && currentXP > currentRealmInfo.xp) {
            const overflowXP = currentXP - currentRealmInfo.xp;
            const nextRealm = this.getNextRealm(currentRealm);
            
            if (nextRealm && overflowXP > 0) {
                const nextRealmInfo = Realms[nextRealm];
                if (nextRealmInfo) {
                    // Convert overflow XP to progress in next realm
                    currentXP = overflowXP;
                    currentRealm = nextRealm;
                }
            }
        }
        
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
        
        const result = this.simulateDays(currentTimegateDays, absorptionBonus);
        
        return result;
    }
    
    calculateDaysToReachRealm(targetRealm, targetProgress = 100, absorptionBonus = 0) {
        
        let currentRealm = this.playerData.mainPathRealm;
        let currentProgress = this.playerData.mainPathProgress;
        let currentXP = Realms[currentRealm]?.xp * (currentProgress / 100) || 0;
        let totalDays = 0;
        
        const targetRealmXP = Realms[targetRealm]?.xp * (targetProgress / 100);
        if (!targetRealmXP) {
            return Infinity;
        }
        
        // Get current and target realm indices
        const currentIndex = this.getRealmIndex(currentRealm);
        const targetIndex = this.getRealmIndex(targetRealm);
        
        
        if (currentIndex > targetIndex) {
            return 0;
        }
        
        if (currentRealm === targetRealm && currentProgress >= targetProgress) {
            return 0;
        }
        
        // Calculate XP needed
        let xpNeeded = 0;
        if (currentRealm === targetRealm) {
            xpNeeded = Math.max(0, targetRealmXP - currentXP);
        } else {
            // Sum XP through all intermediate realms
            for (let i = currentIndex; i <= targetIndex; i++) {
                const realm = this.getRealmFromIndex(i);
                const realmXP = Realms[realm].xp;
                
                if (i === currentIndex) {
                    // Current realm - partial
                    xpNeeded += (realmXP - currentXP);
                } else if (i === targetIndex) {
                    // Target realm - partial to target progress
                    xpNeeded += targetRealmXP;
                } else {
                    // Full intermediate realm
                    xpNeeded += realmXP;
                }
            }
        }
        
        if (xpNeeded <= 0) {
            return 0;
        }
        
        // Calculate effective daily XP (use current realm as approximation)
        const effectiveDailyXP = this.calculateEffectiveDailyXP(currentRealm, absorptionBonus);
        const daysNeeded = effectiveDailyXP > 0 ? xpNeeded / effectiveDailyXP : Infinity;
        
        return daysNeeded;
    }
    
    getRealmIndex(realmName) {
        const [major, minor] = realmName.split(' ');
        const majorIndex = this.realmOrder.indexOf(major);
        const minorIndex = this.minorOrder.indexOf(minor);
        
        if (majorIndex === -1 || minorIndex === -1) {
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
                                    return nextMajorLateRealm;
                                }
                            }
                        }
                    }
                    
                    // Cannot reach next major's Late, so current Late is our max
                    return currentRealm;
                } else {
                    // Cannot reach 100% Late
                    const finalProgress = ((currentXP + effectiveDailyXP * daysRemaining) / realmInfo.xp * 100);
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
                        return nextRealm;
                    } else {
                        // Cannot reach 100% Late
                        const finalProgress = (nextEffectiveDailyXP * daysRemaining / nextRealmXP * 100);
                        return nextRealm;
                    }
                }
                
                currentRealm = nextRealm;
            } else {
                // Cannot complete this realm
                return currentRealm;
            }
        }
        
        return currentRealm;
    }
}

export { RealmProgressionSimulator };
