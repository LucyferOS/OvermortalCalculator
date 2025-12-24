import { Realms, RealmMajorTotalXP } from './gameData.js';

class RealmCalculator {
    static calculateProgression(playerData, dailyXP) {
        let mainPathDailyXP = 0;
        let secondaryPathDailyXP = 0;
        
        if (playerData.pathFocus === 'Main Path') {
            mainPathDailyXP = dailyXP;
        } else {
            secondaryPathDailyXP = dailyXP;
        }
        
        const mainPathProgression = this.calculatePathProgression(
            playerData.mainPathRealm,
            playerData.mainPathProgress,
            playerData.mainPathExp,
            mainPathDailyXP,
            playerData.mainPathRealmMajor
        );
        
        const secondaryPathProgression = this.calculatePathProgression(
            playerData.secondaryPathRealm,
            playerData.secondaryPathProgress,
            playerData.secondaryPathExp,
            secondaryPathDailyXP,
            playerData.secondaryPathRealmMajor
        );
        
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
            const xpNeededForMajor = realmXP + Realms[nextRealm].xp - totalXpEarnedInMajorRealm;
            timeToNextMajor = Math.max(0, xpNeededForMajor / dailyXP);
        } else {
            const midRealm = majorRealm + ' Mid';
            const lateRealm = majorRealm + ' Late';
            const xpNeededForMajor = realmXP +
                Realms[midRealm].xp +
                Realms[lateRealm].xp -
                totalXpEarnedInMajorRealm;
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

    static calculateTimeTo100Late(currentRealm, currentProgress, dailyXP) {
        if (dailyXP <= 0) return Infinity;
        
        const realmXP = Realms[currentRealm].xp;
        
        if (currentProgress >= 100) {
            return 0;
        }
        
        const currentXP = realmXP * (currentProgress / 100);
        const neededXP = realmXP - currentXP;
        
        return neededXP / dailyXP;
    }
}

export { RealmCalculator };