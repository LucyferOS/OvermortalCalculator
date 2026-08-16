import { MarkdownLoader } from './markdownLoader.js';
import { OvermortalCalculator } from './Calculator.js';
import { EventManager } from './EventManager.js';
import { UIManager } from './UIManager.js';

class OvermortalApp {
    constructor() {
        this.calculator = new OvermortalCalculator();
        this.eventManager = new EventManager(this);
        this.originalCalculateBtnText = '';
		this.markdownLoader = new MarkdownLoader(); // Add this line

    }
    // when the app starts, we need to load the saved data and calculate the results
    init() {
        document.addEventListener('DOMContentLoaded', () => this.onDOMContentLoaded());
    }

    onDOMContentLoaded() {
        this.originalCalculateBtnText = document.getElementById('calculate-btn').innerHTML;
        this.eventManager.setupEventListeners();
        this.loadSavedData();

        // Hide debug menu item initially (debug starts as disabled)
        UIManager.updateDebugMenuVisibility(this.calculator.debugEnabled);

        // Sync Abode Aura / Absorption easy mode field visibility with any restored value
        UIManager.updateAbodeEasyModeVisibility();

        this.calculateAndUpdateUI();
		this.loadReleaseNotes();
    }

	async loadReleaseNotes() {
        setTimeout(async () => {
            await this.markdownLoader.loadFromDefaultPath();
        }, 100);
    }

    loadSavedData() {
        if (this.calculator.loadSavedData()) {
            UIManager.showNotification('Settings loaded from previous session');
        }
    }

    calculateAndUpdateUI() {
        UIManager.showLoading('calculate-btn');
        
        setTimeout(() => {
            try {
                const results = this.calculator.calculateAll();
                const playerData = this.calculator.getPlayerData();
                UIManager.updateDashboard(results, playerData);
                
                // Update debug display if debug is enabled
                if (this.calculator.debugEnabled) {
                    UIManager.updateDebugDisplay(playerData, results);
                }
                
                UIManager.showNotification('Calculation complete! Results updated.');
            } catch (error) {
                console.error('Calculation error:', error);
                UIManager.showNotification('Error during calculation: ' + error.message, true);
            } finally {
                UIManager.hideLoading('calculate-btn', this.originalCalculateBtnText);
            }
        }, 100);
    }

    resetToDefaults() {
        this.calculator.initializePlayerData();
        this.syncInputsToCalculator();
        UIManager.updateAbodeEasyModeVisibility();
        this.calculateAndUpdateUI();
        UIManager.showNotification('Reset to default values complete.');
    }

    syncInputsToCalculator() {
        const p = this.calculator.getPlayerData();
        const inputs = {
            // Path information
            'main-path-realm': p.mainPathRealm,
            'main-path-progress': p.mainPathProgress,
            'secondary-path-realm': p.secondaryPathRealm,
            'secondary-path-progress': p.secondaryPathProgress,
            'path-focus': p.pathFocus,
            'timegate-days': p.timegateDays,
            'had-Virya': p.hadViryaLastRealm || 'No',
            
            // Creation Artifacts
            'vase-stars': p.vaseStars,
            'vase-skin': p.vaseSkin,
            'mirror-stars': p.mirrorStars,
            'mirror-skin': p.mirrorSkin,
            'token-stars': p.tokenStars,
            'token-skin': p.tokenSkin,
            'pearl-stars': p.pearlStars,
            
            // Pills and Elixirs
            'gold-pill': p.goldPill,
            'purple-pill': p.purplePill,
            'blue-pill': p.bluePill,
            'elixir': p.elixir,
            'elixir-consumed': p.elixirConsumed,
            'benediction': p.benediction,
            'benediction-consumed': p.benedictionConsumed,
            'current-red-pills': p.currentRedPills || 0,
            
            // Aura Gem
            'gem-quality': p.gemQuality || p.gemBonus || 'Common',
            
            // Abode Aura / Absorption easy mode
            'abode-easy-mode': p.abodeEasyMode ? 'Yes' : 'No',
            'abode-aura-easy': p.abodeAuraEasyValue,
            'absorption-easy': p.absorptionEasyValue,

            // Absorption bonuses
            'absorption-monsterscape': p.absorptionBonusMonsterScape || 0,

            // Abode Bonuses
            'abode-sect-level': p.abodeBonusSectLevel,
            'abode-sect-barrier': p.abodeBonusSectBarrier,
            'abode-celestial-spring': p.abodeBonusCelestialSpring,
            'abode-energy-array': p.abodeBonusEnergyArray,
            'abode-sword-array': p.abodeBonusSwordArray,
            'abode-heaven-gate': p.abodeBonusHeavenGate,
            'abode-wholeness-citta': p.abodeBonusWholenessCitta,
            'abode-perfection-world-rift': p.abodeBonusPerfectionWorldRift,
            'abode-nirvana-path-of-ascension': p.abodeBonusNirvanaPathofAscension,
            'abode-nirvana-horn-mansion': p.abodeBonusNirvanaHornMansion,
            'abode-nirvana-neck-mansion': p.abodeBonusNirvanaNeckMansion,
            'abode-mini-world': p.abodeBonusMiniWorld || 0,
            'abode-five-asthenia': p.abodeBonusFiveAsthenia || 0,
            
            // Techniques
            'pill-attempts-technique': p.pillAttemptsTechnique || 0,
            'pill-bonus-technique': p.pillBonusTechnique,
            'respira-attempt-technique': p.respiraAttemptsTechnique,
            'respira-bonus-technique': p.respiraBonusTechnique,
            'abode-aura-technique': p.abodeBonusTechnique,
            
            // Curios
            'abode-aura-curio': p.abodeBonusCurio,
            'pill-bonus-curio': p.pillBonusCurio,
            'respira-attempt-curio': p.respiraAttemptsCurio,
            'respira-bonus-curio': p.respiraBonusCurio,
            'abode-temper-aura-curio': p.abodeTemperAuraCurio || 0,
            'wisdom-confluence-curio': p.wisdomConfluenceCurio || 0,
            
            // Immortal Friends
            'pill-attempts-immortal-friends': p.pillAttemptsImmortalFriends || 0,
            'pill-bonus-immortal-friends': p.pillBonusImmortalFriends,
            'respira-attempt-immortal-friends': p.respiraAttemptsImmortalFriend,
            'respira-bonus-immortal-friends': p.respiraBonusImmortalFriend,
            
            // Nirvana Mansion bonuses
            'pill-nirvana-chariot-mansion': p.pillBonusNirvanaChariotMansion,
            'pill-nirvana-ghost-mansion': p.pillBonusNirvanaGhostMansion,
            'pill-nirvana-turtle-beak-mansion': p.pillBonusNirvanaTurtleBeakMansion,
            'respira-nirvana-dipper-mansion': p.respiraNirvanaDipperMansion || 0,

            // Immortal World Glitted Lotus bonuses
            'pill-glitted-lotus-throne': p.pillBonusGlittedLotusThrone || 0,
            'pill-glitted-lotus-seed': p.pillBonusGlittedLotusSeed || 0,
            
            // Fruits
            'fruits-count': p.fruitsCount,
            'weekly-fruits': p.weeklyFruits,
            'fruits-usage': p.fruitsUsage,
            'tokens-count': p.tokensCount || 0,
            'weekly-tokens': p.weeklyTokens || 0,
            'extractor-rank': p.extractorRank || 'common',
            'extractor-experience': p.extractorXPLevel || 0,
            'extractor-quality': p.extractorQualityLevel || 0,
            'extractor-gush': p.extractorGushLevel || 0
        };

        Object.entries(inputs).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                // For number inputs, ensure we set the value properly
                if (element.type === 'number') {
                    element.value = value !== undefined && value !== null ? value : 0;
                } else {
                    element.value = value !== undefined && value !== null ? value : '';
                }
            }
        });

        // Radios are addressed by group name rather than element id, so they
        // do not go through the loop above.
        const useTokensRadio = document.getElementById(p.useTokens ? 'use-tokens-yes' : 'use-tokens-no');
        if (useTokensRadio) {
            useTokensRadio.checked = true;
        }

        // Update path focus indicators after syncing
        UIManager.updatePathFocusIndicators(p.pathFocus);
    }

    //showing errors in the app, this was mostly used for debugging but keeping it for now.
    showNotification(message, isError = false) {
        UIManager.showNotification(message, isError);
    }

    // some extra functionality for the app to switch the path focus with the cards on the dashboard.
    switchPathFocus(path) {
        const currentPath = this.calculator.getPlayerData().pathFocus;
        if (currentPath !== path) {
            this.calculator.getPlayerData().pathFocus = path;
            const updatedPath = this.calculator.getPlayerData().pathFocus;
            // Update the DOM input so updateFromInputs() doesn't overwrite our change
            const pathFocusSelect = document.getElementById('path-focus');
            if (pathFocusSelect) {
                pathFocusSelect.value = path;
            }
            this.calculator.saveToLocalStorage();
            // Ensure UI updates with the correct path focus by calling updatePathFocusIndicators directly
            UIManager.updatePathFocusIndicators(path);
            this.calculateAndUpdateUI();
            UIManager.showNotification(`Path focus switched to ${path}`);
        }
    }
}

// Initialize the application
const app = new OvermortalApp();
app.init();