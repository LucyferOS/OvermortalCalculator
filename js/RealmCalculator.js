import { Realms, RealmMajorTotalXP, REALM_ORDER_MAJOR, REALM_ORDER_MINOR } from './gameData.js';

class RealmCalculator {
    static calculateProgression(playerData, mainPathDailyXP, secondaryPathDailyXP) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RealmCalculator.js:4',message:'calculateProgression entry',data:{mainPathDailyXP,secondaryPathDailyXP,pathFocus:playerData.pathFocus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        // Use the provided daily XP values directly
        // Note: pathFocus is no longer used here since we're passing the actual daily XP for each path
        // The caller is responsible for determining which path gets XP based on pathFocus
        
        const mainPathProgression = this.calculatePathProgression(
            playerData.mainPathRealm,
            playerData.mainPathProgress,
            playerData.mainPathExp,
            mainPathDailyXP || 0,
            playerData.mainPathRealmMajor
        );
        
        const secondaryPathProgression = this.calculatePathProgression(
            playerData.secondaryPathRealm,
            playerData.secondaryPathProgress,
            playerData.secondaryPathExp,
            secondaryPathDailyXP || 0,
            playerData.secondaryPathRealmMajor
        );
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/7b124798-9ea4-4e46-9db5-5dcc847b936b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RealmCalculator.js:25',message:'calculateProgression return',data:{mainPathTimeToNextMinor:mainPathProgression.timeToNextMinor,mainPathTimeToNextMajor:mainPathProgression.timeToNextMajor,secondaryPathTimeToNextMinor:secondaryPathProgression.timeToNextMinor,secondaryPathTimeToNextMajor:secondaryPathProgression.timeToNextMajor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        return {
            mainPath: mainPathProgression,
            secondaryPath: secondaryPathProgression
        };
    }
    static calculatePathProgression(currentRealm, currentProgress, currentExp, dailyXP, majorRealm) {
        if (dailyXP <= 0) {
            return {
                timeToNextMinor: 0,
                timeToNextMajor: 0,
                progressPercentMinor: currentProgress,
                progressPercentMajor: 0
            };
        }
        
        const realmXP = Realms[currentRealm].xp;
        const xpNeededForMinor = realmXP - currentExp;
        const timeToNextMinor = Math.max(0, xpNeededForMinor / dailyXP);
        
        // Calculate total XP earned in this major realm
        let totalXpEarnedInMajorRealm = currentExp;
        const realmMinor = currentRealm.split(' ')[1];
        
        if (realmMinor === 'Mid' || realmMinor === 'Late') {
            const earlyRealm = majorRealm + ' Early';
            totalXpEarnedInMajorRealm += Realms[earlyRealm].xp;
        }
        
        if (realmMinor === 'Late') {
            const midRealm = majorRealm + ' Mid';
            totalXpEarnedInMajorRealm += Realms[midRealm].xp;
        }
        
        // Calculate time to next major
        let timeToNextMajor = 0;
        if (realmMinor === 'Late') {
            timeToNextMajor = timeToNextMinor;
        } else if (realmMinor === 'Mid') {
            const nextRealm = majorRealm + ' Late';
            // Remaining XP in current Mid realm + full XP for Late realm
            const xpNeededForMajor = (realmXP - currentExp) + Realms[nextRealm].xp;
            timeToNextMajor = Math.max(0, xpNeededForMajor / dailyXP);
        } else {
            // Early realm: remaining XP in Early + full XP for Mid + full XP for Late
            const midRealm = majorRealm + ' Mid';
            const lateRealm = majorRealm + ' Late';
            const xpNeededForMajor = (realmXP - currentExp) +
                Realms[midRealm].xp +
                Realms[lateRealm].xp;
            timeToNextMajor = Math.max(0, xpNeededForMajor / dailyXP);
        }
        
        // Calculate major realm progress percentage
        const totalXpForMajorRealm = RealmMajorTotalXP[majorRealm];
        const progressPercentMajor = (totalXpEarnedInMajorRealm / totalXpForMajorRealm) * 100;
        
        return {
            timeToNextMinor,
            timeToNextMajor,
            progressPercentMinor: currentProgress,
            progressPercentMajor
        };
    }
	static calculateRealmIndex(realmName) {
		// Parse the realm name
		const parts = realmName.split(' ');
		
		// Handle the format: "Major Minor"
		let major, minor;
		if (parts.length === 2) {
			[major, minor] = parts;
		} else {
			// Handle potential format issues
			console.error('Invalid realm format:', realmName);
			return -1;
		}
		
		// Find the indices
		const majorIndex = REALM_ORDER_MAJOR.indexOf(major);
		const minorIndex = REALM_ORDER_MINOR.indexOf(minor);
		
		// Check if realm was found
		if (majorIndex === -1 || minorIndex === -1) {
			console.error('Realm not found:', realmName);
			return -1;
		}
		
		return majorIndex * REALM_ORDER_MINOR.length + minorIndex;
	}	
	static calculateRealmProgression(startIndex, endIndex) {
	  let total = 0;
	  
	  // Convert to single index (0-23) for easier stepping
	  let current = startIndex;
	  const target = endIndex;
	  
	  while (current <= target) {
		// Convert single index back to major/minor indices
		const majorIndex = Math.floor(current / REALM_ORDER_MINOR.length);
		const minorIndex = current % REALM_ORDER_MINOR.length;
		// Construct the realm name key
		const realmName = `${REALM_ORDER_MAJOR[majorIndex]} ${REALM_ORDER_MINOR[minorIndex]}`;
		// Use the key to fetch xp
		const XP = Realms[realmName].xp;
		total += XP;
		
		current++;
	  }
		return total;
	}
}



export { RealmCalculator };