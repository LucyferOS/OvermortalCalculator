import { Realms, RealmMajorTotalXP, GameConstants, XPData } from './gameData.js';
import { CalculatorUtils } from './utils.js';

class DebugManager {
    static updateDebugInfo(calculator) {
        const playerData = calculator.getPlayerData();
        const results = calculator.getResults();
        
        // Game Data
        const gameDataStr = this.formatJSONForDisplay({
            XPData,
            Realms,
            RealmMajorTotalXP,
            GameConstants
        });
        document.getElementById('debug-game-data').innerHTML = gameDataStr;

        // Player Input
        const playerDataStr = this.formatJSONForDisplay(playerData);
        document.getElementById('debug-player-input').innerHTML = playerDataStr;

        // Calculations
        const calcStr = this.formatJSONForDisplay(results) || 
                       'No calculations performed yet.';
        document.getElementById('debug-calculations').innerHTML = calcStr;
    }

    static formatJSONForDisplay(obj) {
        if (!obj) return 'null';
        return JSON.stringify(obj, null, 2)
            .replace(/\n/g, '<br>')
            .replace(/ /g, '&nbsp;');
    }

    static logToConsole(message, data = null, level = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const styles = {
            info: 'color: #2A3B47; background: #F0F2F5; padding: 2px 4px; border-radius: 3px;',
            warn: 'color: #D4A55E; background: #FFF8E1; padding: 2px 4px; border-radius: 3px;',
            error: 'color: #C76B6B; background: #FFF0F0; padding: 2px 4px; border-radius: 3px;',
            success: 'color: #4A8B6E; background: #F0F9F5; padding: 2px 4px; border-radius: 3px;'
        };
        
        console.log(`%c[${timestamp}] ${message}`, styles[level] || styles.info);
        
        if (data !== null) {
            console.log('Data:', data);
        }
    }

    static logCalculationStep(stepName, data) {
        console.group(`🔍 ${stepName}`);
        console.log('Data:', data);
        console.groupEnd();
    }

    static logDailyXPCalculation(playerData, absorptionBonus, breakdown) {
        console.group('📊 Daily XP Calculation');
        console.log('Player Data:', {
            mainPathRealm: playerData.mainPathRealm,
            mainPathProgress: playerData.mainPathProgress,
            absorption: Realms[playerData.mainPathRealm]?.absorption || 0,
            viryaAbsorptionBonus: absorptionBonus,
            effectiveAbsorption: (Realms[playerData.mainPathRealm]?.absorption || 0) + absorptionBonus
        });
        
        if (breakdown) {
            console.log('Breakdown:', {
                abodeAura: breakdown.abodeAura,
                gemBonus: breakdown.gemBonus,
                pillXP: breakdown.pillXP,
                respiraXP: breakdown.respiraXP,
                total: breakdown.total
            });
        }
        console.groupEnd();
    }

    static logViryaDetection(viryaInfo) {
        console.group('🎯 Virya Detection');
        console.log('Scenario:', viryaInfo.scenario);
        console.log('Absorption Bonus:', viryaInfo.absorptionBonus);
        console.log('Is Active:', viryaInfo.isActive);
        console.log('Bonus Ends At:', viryaInfo.bonusEndsAt);
        console.groupEnd();
    }

    static logRealmProgression(progression) {
        console.group('📈 Realm Progression');
        console.log('Main Path:', progression.mainPath);
        console.log('Secondary Path:', progression.secondaryPath);
        console.groupEnd();
    }
}

export { DebugManager };