        // ==================== GAME DATA  ====================
        class BaseXP {
            constructor(respira, red, gold, purple, blue, elixer, benediction) {
                this.respira = respira;
                this.red = red;
                this.gold = gold;
                this.purple = purple;
                this.blue = blue;
                this.elixer = elixer;
                this.benediction = benediction;
            }
        };

        const XPData = {
            IncarnationXP: new BaseXP(5.30, 192.00, 96.00, 48.00, 25.60, 0, 0),
            VoidbreakXP: new BaseXP(7.80, 288.00, 144.00, 72.00, 38.40, 60.00, 87.00),
            WholenessXP: new BaseXP(10.5, 492.00, 246.00, 123.00, 65.60, 84.00, 135.00),
            PerfectionXP: new BaseXP(13.5, 744.00, 372.00, 186.00, 99.20, 128.00, 205.00),
            NirvanaXP: new BaseXP(25.00, 1368.00, 684.00, 342.00, 182.40, 180.00, 470.00),
            CelestialXP: new BaseXP(37.5, 3096.00, 1548.00, 774.00, 412.70, 368.00, 1220.00),
            EternalXP: new BaseXP(86.33, 7296.00, 3648.00, 1824.00, 972.80, 754.00, 3250.00),
            SupremeXP: new BaseXP(84.38, 14592.00, 7296.00, 3648.00, 1945.60, 2500.00, 7500.00)
        };

        const GameData = {
            minPerTaoistYear: 15,
            taoistYearsPerDay: 96,
            abodeBase: 130,

            gemQuality: {
                'No Aura': 0,
                'Common': .1,
                'Uncommon': .13,
                'Rare': .16,
                'Epic': .20,
                'Legendary': .24,
                'Mythic': .28
            },

            realms: {
                'Incarnation Early': { xp: 12326300, absorption: 0.317 },
                'Incarnation Mid': { xp: 26155400, absorption: 0.358 },
                'Incarnation Late': { xp: 61792200, absorption: 0.4 },
                'Voidbreak Early': { xp: 68014736, absorption: 0.5 },
                'Voidbreak Mid': { xp: 142093920, absorption: 0.65 },
                'Voidbreak Late': { xp: 307715027, absorption: 0.8 },
                'Wholeness Early': { xp: 186813569, absorption: 0.85 },
                'Wholeness Mid': { xp: 263951236, absorption: 0.9 },
                'Wholeness Late': { xp: 304450560, absorption: 0.95 },
                'Perfection Early': { xp: 469855611, absorption: 1.3 },
                'Perfection Mid': { xp: 690774727, absorption: 1.6 },
                'Perfection Late': { xp: 915460544, absorption: 1.8 },
                'Nirvana Early': { xp: 1119067845, absorption: 2.0 },
                'Nirvana Mid': { xp: 1430384212, absorption: 2.2 },
                'Nirvana late': { xp: 1795072703, absorption: 2.4 },
                'Celestial Early': { xp: 2923599210, absorption: 2.6 },
                'Celestial Mid': { xp: 3856472371, absorption: 2.8 },
                'Celestial Late': { xp: 5215416675, absorption: 3.0 },
                'Eternal Early': { xp: 8427284628, absorption: 4.0 },
                'Eternal Mid': { xp: 9849448919, absorption: 4.2 },
                'Eternal Late': { xp: 12813035158, absorption: 4.4 },
                'Supreme Early': { xp: 19860203495, absorption: 5.0 },
                'Supreme Mid': { xp: 25818265842, absorption: 5.2 },
                'Supreme Late': { xp: 34854658887, absorption: 5.4 }
            },
			
			realmMajorTotalxp: {
				'Incarnation': 100273900,
				'Voidbreak': 517823683,
				'Wholeness': 755215365,
				'Perfection': 2076090882,
				'Nirvana': 4344524760,
				'Celestial': 11995488256,
				'Eternal': 31089768705,
				'Supreme': 80533128224
			},

            viryaBonus: {
                'Eminence': 0.2,
                'Perfection': 0.2,
                'Halfstep': 0.4
            },

            artifactEnergyReplenishment: {
                'No artifact': 0,
                '0 star': 1,
                '1 star': 1.3,
                '2 stars': 1.6,
                '3 stars': 2.0,
                '4 stars': 2.4,
                '5 stars': 3.0
            },

            vaseBonus: {
                'No artifact': 0,
                '0 star': 0,
                '1 star': 0.1,
                '2 stars': 0.1,
                '3 stars': 0.2,
                '4 stars': 0.2,
                '5 stars': 0.2
            },

            mirrorTokenBonus: {
                'No artifact': 0,
                '0 star': 0,
                '1 star': 0.05,
                '2 stars': 0.05,
                '3 stars': 0.1,
                '4 stars': 0.1,
                '5 stars': 0.1
            },

            viryaRequirements: {
                'Eminence': 4,
                'Perfect': 2,
                'Half-Step': 0,
            }
        };

        // ================ CALCULATION ENGINE ================
        class OvermortalCalculator {
            constructor() {
				this.storageKey = 'overmortal_calculator_data';
                this.playerData = {};
                this.calculationResults = {};
                this.initializePlayerData();
				this.loadFromLocalStorage();
                this.updateFromInputs();
            }
			
            initializePlayerData() {
                this.playerData = {
                    mainPathRealm: 'Incarnation Early',
                    mainPathRealmMajor: 'Incarnation',
                    mainPathRealmMinor: 'Early',
                    mainPathProgress: 0.0,
                    mainPathExp: 0.0,
                    secondaryPathRealm: 'Incarnation Early',
                    secondaryPathRealmMajor: 'Incarnation',
                    secondaryPathRealmMinor: 'Early',
                    secondaryPathProgress: 0.0,
                    secondaryPathExp: 0.0,
                    pathFocus: 'Main Path',
                    timegateDays: 30,
                    vaseStars: '0 star',
                    mirrorStars: '0 star',
                    tokenStars: '0 star',
                    goldPill: 0.0,
                    purplePill: 0.0,
                    bluePill: 20.0,
                    elixir: 0.0,
                    pillBonus: 0.0,
                    fruitsCount: 0,
                    weeklyFruits: 0,
                    fruitsUsage: 'current',
                    cosmoapsis: 130.0,
                    gemBonus: 'Common',
                    respiraAttemptsTotal: 10,
                    respiraExp: 0
                };
            }

			saveToLocalStorage() {
				try {
					const formData = {};
					
					// Get all input fields
					const inputs = document.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
					inputs.forEach(input => {
						if (input.id) {
							formData[input.id] = input.value;
						}
					});
					
					// Get all select elements
					const selects = document.querySelectorAll('select');
					selects.forEach(select => {
						if (select.id) {
							formData[select.id] = select.value;
						}
					});
					
					localStorage.setItem(this.storageKey, JSON.stringify(formData));
					console.log('Data saved to localStorage');
					
					// Simple notification
					this.showSimpleNotification('Settings saved!');
				} catch (error) {
					console.error('Error saving to localStorage:', error);
					this.showSimpleNotification('Error saving settings', true);
				}
			}
			
			loadFromLocalStorage() {
				try {
					const savedData = localStorage.getItem(this.storageKey);
					if (savedData) {
						const formData = JSON.parse(savedData);
						
						// Restore all saved values
						Object.keys(formData).forEach(key => {
							const element = document.getElementById(key);
							if (element) {
								element.value = formData[key];
								
								// Trigger change event for select elements
								if (element.tagName === 'SELECT') {
									element.dispatchEvent(new Event('change'));
								}
							}
						});
						
						console.log('Data loaded from localStorage');
						this.showSimpleNotification('Settings loaded from previous session');
						return true;
					}
				} catch (error) {
					console.error('Error loading from localStorage:', error);
				}
				return false;
			}
			
			clearLocalStorage() {
				localStorage.removeItem(this.storageKey);
				console.log('LocalStorage cleared');
				this.showSimpleNotification('Saved data cleared');
			}
			
			showSimpleNotification(message, isError = false) {
				// Remove any existing notification
				const existingNotification = document.querySelector('.simple-notification');
				if (existingNotification) {
					existingNotification.remove();
				}
				
				// Create notification element
				const notification = document.createElement('div');
				notification.className = `simple-notification ${isError ? 'error' : 'success'}`;
				notification.textContent = message;
				notification.style.cssText = `
					position: fixed;
					bottom: 20px;
					right: 20px;
					padding: 12px 20px;
					border-radius: 8px;
					color: white;
					font-weight: 500;
					z-index: 1000;
					box-shadow: 0 4px 12px rgba(0,0,0,0.15);
					animation: slideIn 0.3s ease;
					background-color: ${isError ? 'var(--accent)' : 'var(--success)'};
					border-left: 4px solid ${isError ? '#A54545' : '#2E6B4F'};
				`;
				
				// Add to page
				document.body.appendChild(notification);
				
				// Remove after 3 seconds
				setTimeout(() => {
					notification.style.animation = 'slideOut 0.3s ease forwards';
					setTimeout(() => {
						if (notification.parentNode) {
							notification.remove();
						}
					}, 300);
				}, 3000);
			}
			
			exportData() {
				try {
					const data = localStorage.getItem(this.storageKey);
					if (data) {
						// Create a prettified JSON string
						const jsonData = JSON.stringify(JSON.parse(data), null, 2);
						const blob = new Blob([jsonData], { type: 'application/json' });
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = `overmortal-settings-${new Date().toISOString().split('T')[0]}.json`;
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(url);
						this.showSimpleNotification('Data exported successfully!');
					} else {
						this.showSimpleNotification('No data to export', true);
					}
				} catch (error) {
					console.error('Error exporting data:', error);
					this.showSimpleNotification('Error exporting data', true);
				}
			}
			
			importData(jsonString) {
				try {
					const importedData = JSON.parse(jsonString);
					localStorage.setItem(this.storageKey, JSON.stringify(importedData));
					this.loadFromLocalStorage();
					this.showSimpleNotification('Data imported successfully!');
					
					// Recalculate with new data
					setTimeout(() => {
						calculateAndUpdateUI();
					}, 500);
					
					return true;
				} catch (error) {
					console.error('Error importing data:', error);
					this.showSimpleNotification('Invalid file format', true);
					return false;
				}
			}
		
			updateFromInputs() {
				// Helper function for consistent value retrieval
				const getNumberValue = (elementId, defaultValue = 0) => {
					const element = document.getElementById(elementId);
					const value = parseFloat(element?.value);
					return isNaN(value) ? defaultValue : value;
				};
				
				const getIntegerValue = (elementId, defaultValue = 0) => {
					const element = document.getElementById(elementId);
					const value = parseInt(element?.value);
					return isNaN(value) ? defaultValue : value;
				};
				
				const getStringValue = (elementId) => {
					return document.getElementById(elementId)?.value || '';
				};
				
				const splitRealmString = (realmString) => {
					const spaceIndex = realmString.indexOf(' ');
					if (spaceIndex === -1) return { major: realmString, minor: '' };
					
					return {
						major: realmString.substring(0, spaceIndex),
						minor: realmString.substring(spaceIndex + 1)
					};
				};
				
				// Main Path
				const mainPathRealm = getStringValue('main-path-realm');
				const mainPathRealmParts = splitRealmString(mainPathRealm);
				const mainPathProgress = getNumberValue('main-path-progress');
				const mainPathExp = GameData.realms[mainPathRealm]?.xp * (mainPathProgress / 100) || 0;
				
				// Secondary Path
				const secondaryPathRealm = getStringValue('secondary-path-realm');
				const secondaryPathRealmParts = splitRealmString(secondaryPathRealm);
				const secondaryPathProgress = getNumberValue('secondary-path-progress');
				const secondaryPathExp = GameData.realms[secondaryPathRealm]?.xp * (secondaryPathProgress / 100) || 0;
				
				// Pill Bonuses
				const pillBonusCurio = getNumberValue('pill-bonus-curio');
				const pillBonusImmortalFriends = getNumberValue('pill-bonus-immortal-friends');
				const pillBonusTechnique = getNumberValue('pill-bonus-technique');
				const pillBonus = (pillBonusCurio + pillBonusImmortalFriends + pillBonusTechnique) / 100;
				
				const pillBonusNirvanaChariotMansion = getNumberValue('pill-nirvana-chariot-mansion');
				const pillBonusNirvanaGhostMansion = getNumberValue('pill-nirvana-ghost-mansion');
				const pillBonusNirvanaTurtleBeakMansion = getNumberValue('pill-nirvana-turtle-beak-mansion');
				
				// Abode Bonuses
				const abodeBonusCurio = getNumberValue('abode-aura-curio');
				const abodeBonusTechnique = getNumberValue('abode-aura-technique');
				const abodeBonusSectLevel = getNumberValue('abode-sect-level');
				const abodeBonusSectBarrier = getNumberValue('abode-sect-barrier');
				const abodeBonusCelestialSpring = getNumberValue('abode-celestial-spring');
				const abodeBonusEnergyArray = getNumberValue('abode-energy-array');
				const abodeBonusSwordArray = getNumberValue('abode-sword-array');
				const abodeBonusHeavenGate = getNumberValue('abode-heaven-gate');
				const abodeBonusWholenessCitta = getNumberValue('abode-wholeness-citta');
				const abodeBonusPerfectionWorldRift = getNumberValue('abode-perfection-world-rift');
				const abodeBonusNirvanaPathofAscension = getNumberValue('abode-nirvana-path-of-ascension');
				const abodeBonusNirvanaHornMansion = getNumberValue('abode-nirvana-horn-mansion');
				const abodeBonusNirvanaNeckMansion = getNumberValue('abode-nirvana-neck-mansion');
				
				// Respira Attempts
				const respiraAttemptsImmortalFriend = getIntegerValue('respira-attempt-immortal-friends');
				const respiraAttemptsTechnique = getIntegerValue('respira-attempt-technique');
				const respiraAttemptsCurio = getIntegerValue('respira-attempt-curio');
				const respiraAttemptsTotal = 10 + respiraAttemptsImmortalFriend + respiraAttemptsCurio + respiraAttemptsTechnique;
				
				// Respira Bonuses
				const respiraBonusImmortalFriend = getNumberValue('respira-bonus-immortal-friends');
				const respiraBonusTechnique = getNumberValue('respira-bonus-technique');
				const respiraBonusCurio = getNumberValue('respira-bonus-curio');
				const respiraBonusTotal = 1 + ((respiraBonusCurio + respiraBonusImmortalFriend + respiraBonusTechnique) / 100);
				
				const abodeAuraXPTotal = GameData.abodeBase * (GameData.realms[mainPathRealm]?.absorption || 0);
				
				this.playerData = {
					// Main Path
					mainPathRealm,
					mainPathRealmMajor: mainPathRealmParts.major,
					mainPathRealmMinor: mainPathRealmParts.minor,
					mainPathProgress,
					mainPathExp,
					
					// Secondary Path
					secondaryPathRealm,
					secondaryPathRealmMajor: secondaryPathRealmParts.major,
					secondaryPathRealmMinor: secondaryPathRealmParts.minor,
					secondaryPathProgress,
					secondaryPathExp,
					
					// Path Configuration
					pathFocus: getStringValue('path-focus'),
					timegateDays: getNumberValue('timegate-days'),
					
					// Abode Bonuses
					abodeBonusCurio,
					abodeBonusTechnique,
					abodeBonusSectLevel,
					abodeBonusSectBarrier,
					abodeBonusCelestialSpring,
					abodeBonusEnergyArray,
					abodeBonusSwordArray,
					abodeBonusHeavenGate,
					abodeBonusWholenessCitta,
					abodeBonusPerfectionWorldRift,
					abodeBonusNirvanaPathofAscension,
					abodeBonusNirvanaHornMansion,
					abodeBonusNirvanaNeckMansion,
					
					// Respira Attempts
					respiraAttemptsImmortalFriend,
					respiraAttemptsTechnique,
					respiraAttemptsCurio,
					respiraAttemptsTotal,
					
					// Respira Bonuses
					respiraBonusImmortalFriend,
					respiraBonusTechnique,
					respiraBonusCurio,
					respiraBonusTotal,
					
					// Pill Bonuses
					pillBonusNirvanaChariotMansion,
					pillBonusNirvanaGhostMansion,
					pillBonusNirvanaTurtleBeakMansion,
					
					// Stars
					vaseStars: getStringValue('vase-stars'),
					mirrorStars: getStringValue('mirror-stars'),
					tokenStars: getStringValue('token-stars'),
					
					// Pills and Elixirs
					goldPill: getNumberValue('gold-pill'),
					purplePill: getNumberValue('purple-pill'),
					bluePill: getNumberValue('blue-pill'),
					elixir: getNumberValue('elixir'),
					
					// Fruits
					fruitsCount: getIntegerValue('fruits-count'),
					weeklyFruits: getIntegerValue('weekly-fruits'),
					fruitsUsage: getStringValue('fruits-usage'),
					
					// Miscellaneous
					cosmoapsis: abodeAuraXPTotal,
					gemQuality: getStringValue('gem-quality'),
					pillBonus: pillBonus + 1
				};
			}
			
            calculateAll() {
                this.updateFromInputs();
                this.calculateDailyXP();
                this.calculateRealmProgression();
                return this.calculationResults;
            }

			calculateDailyXP() {
				const p = this.playerData;
				
				// Helper functions for readability
				const calculateAbodeAuraXP = () => {
					const abodeBonuses = [
						p.abodeBonusCurio, p.abodeBonusTechnique, p.abodeBonusSectLevel,
						p.abodeBonusSectBarrier, p.abodeBonusCelestialSpring, p.abodeBonusEnergyArray,
						p.abodeBonusSwordArray, p.abodeBonusHeavenGate, p.abodeBonusWholenessCitta,
						p.abodeBonusPerfectionWorldRift, p.abodeBonusNirvanaPathofAscension,
						p.abodeBonusNirvanaHornMansion, p.abodeBonusNirvanaNeckMansion
					];
					
					const totalAbodeBonus = abodeBonuses.reduce((sum, bonus) => sum + bonus, 0);
					const baseAuraXP = p.cosmoapsis * (1 + (totalAbodeBonus / 100));
					return baseAuraXP * 10800; // Convert to daily value
				};
				
				const calculateVaseRedPill = () => {
					if (p.vaseStars == 'No artifact') return 0;
					const energy = GameData.artifactEnergyReplenishment[p.vaseStars] * GameData.taoistYearsPerDay;
					return (energy + 100) / 100;
				};
				
				const calculateMirrorRedPill = () => {
					if (p.mirrorStars == 'No artifact') return 0;
					const energy = GameData.artifactEnergyReplenishment[p.mirrorStars] * GameData.taoistYearsPerDay;
					const mirrorBonus = 1 - GameData.mirrorTokenBonus[p.mirrorStars];
					return (energy + 100) / (200 * mirrorBonus);
				};
				
				const calculateTokenRedPill = () => {
					if (p.tokenStars == 'No artifact') return 0;
					const energy = GameData.artifactEnergyReplenishment[p.tokenStars] * GameData.taoistYearsPerDay;
					const tokenBonus = 1 - GameData.mirrorTokenBonus[p.tokenStars];
					return ((energy + 100) / (200 * tokenBonus)) * 0.1225;
				};
				
				const calculatePillXP = () => {
					const realmXP = XPData[p.mainPathRealmMajor + "XP"];
					
					const goldPillXP = realmXP.gold 
						* (1 + (p.pillBonusNirvanaChariotMansion / 100)) 
						* p.goldPill;
						
					const purplePillXP = realmXP.purple 
						* (1 + (p.pillBonusNirvanaTurtleBeakMansion / 100)) 
						* p.purplePill;
						
					const bluePillXP = realmXP.blue 
						* (1 + (p.pillBonusNirvanaGhostMansion / 100)) 
						* p.bluePill;
						
					const elixirXP = realmXP.elixer * p.elixir;
					
					// Calculate red pills
					const vaseRedPill = calculateVaseRedPill();
					const mirrorRedPill = calculateMirrorRedPill();
					const tokenRedPill = calculateTokenRedPill();
					const numRedPills = vaseRedPill + mirrorRedPill + tokenRedPill;
					
					const redPillXP = realmXP.red 
						* (1 + GameData.vaseBonus[p.vaseStars]) 
						* numRedPills;
					
					// Total all pill XP
					const totalPillXP = goldPillXP + purplePillXP + bluePillXP + elixirXP + redPillXP;
					return totalPillXP * p.pillBonus * 1000;
				};
				
				const calculateRespiraXP = () => {
					const probabilities = [0.55, 0.30, 0.1475, 0.0025];
					const multipliers = [1, 2, 5, 10];
					
					let expectedGushValue = 0;
					for (let i = 0; i < probabilities.length; i++) {
						expectedGushValue += probabilities[i] * multipliers[i];
					}
					
					const respiraAttemptsGush = p.respiraAttemptsTotal * expectedGushValue;
					const realmRespiraXP = XPData[p.mainPathRealmMajor + "XP"].respira;
					
					return respiraAttemptsGush * realmRespiraXP * 1000 * p.respiraBonusTotal;
				};
				
				// Main calculations
				const abodeAuraXPTotalFinal = calculateAbodeAuraXP();
				const gemBonusXPdaily = abodeAuraXPTotalFinal * GameData.gemQuality[p.gemQuality];
				const pillXPTotal = calculatePillXP();
				const respiraExp = calculateRespiraXP();
				
				// Store and return results
				this.calculationResults.pillXPTotal = pillXPTotal;
				
				const totalDailyXP = abodeAuraXPTotalFinal + gemBonusXPdaily + pillXPTotal + respiraExp;
				return totalDailyXP;
			}

			calculateRealmProgression() {
				const p = this.playerData;
				const totalDailyXP = this.calculateDailyXP();

				console.log("=== DEBUG calculateRealmProgression ===");
				console.log("Player data:", p);
				console.log("Total daily XP:", totalDailyXP);
				console.log("Main path exp:", p.mainPathExp);
				console.log("Main realm XP needed:", GameData.realms[p.mainPathRealm].xp);

				let mainPathDailyXP, secondaryPathDailyXP;
				if (p.pathFocus === 'Main Path') {
					mainPathDailyXP = totalDailyXP;
					secondaryPathDailyXP = 0;
				} else {
					secondaryPathDailyXP = totalDailyXP;
					mainPathDailyXP = 0;
				}

				console.log("Main path daily XP:", mainPathDailyXP);
				console.log("Secondary path daily XP:", secondaryPathDailyXP);

			// ================= VIRYA SCENARIO DETECTION =================
			let viryaScenario = null;
			let viryaBonus = 1.0; // Default: no bonus

			// Check if main path is at 100% in late realm
			const isMainPath100Late = p.mainPathRealmMinor === 'Late' && p.mainPathProgress === 100;

			if (isMainPath100Late) {
				console.log("Player is at 100% late in main path - checking Virya scenarios...");
				
				// Get major realm order for progression checks
				const realmOrder = [
					'Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
					'Nirvana', 'Celestial', 'Eternal', 'Supreme'
				];
				
				const currentMajorIndex = realmOrder.indexOf(p.mainPathRealmMajor);
				const previousMajor = currentMajorIndex > 0 ? realmOrder[currentMajorIndex - 1] : null;
				const nextMajor = currentMajorIndex < realmOrder.length - 1 ? realmOrder[currentMajorIndex + 1] : null;
				
				// Function to convert realm stage to numeric value for comparison
				const getRealmStageValue = (major, minor) => {
					const majorIndex = realmOrder.indexOf(major);
					const minorValue = { 'Early': 0, 'Mid': 1, 'Late': 2 }[minor] || 0;
					return majorIndex * 10 + minorValue; // Major is more significant than minor
				};
				
				const mainStageValue = getRealmStageValue(p.mainPathRealmMajor, p.mainPathRealmMinor);
				const secondaryStageValue = getRealmStageValue(p.secondaryPathRealmMajor, p.secondaryPathRealmMinor);
				
				console.log(`Main stage value: ${mainStageValue}, Secondary stage value: ${secondaryStageValue}`);
				
				// Define stage requirements for each Virya scenario
				// Using stage values allows us to do "greater than/less than" comparisons
				
				// 1. Check Virya Half-Step - Highest requirement
				// Both paths must be at 100% late in the SAME major realm
				const isSecondary100Late = p.secondaryPathRealmMinor === 'Late' && 
										   p.secondaryPathProgress === 100;
				const isSameMajor = p.secondaryPathRealmMajor === p.mainPathRealmMajor;
				
				if (isSecondary100Late && isSameMajor) {
					viryaScenario = 'Half-Step';
					viryaBonus = 1.4; // 40% bonus
					console.log("Virya Half-Step detected: Both paths at 100% late in same major realm");
				}
				// 2. Check Virya Perfection - Secondary is at same major but EARLIER stage
				else if (isSameMajor) {
					// For Voidbreak: requires Mid or better
					if (p.mainPathRealmMajor === 'Voidbreak') {
						const isVoidbreakMidOrBetter = p.secondaryPathRealmMinor === 'Mid' || 
													   p.secondaryPathRealmMinor === 'Late';
						if (isVoidbreakMidOrBetter) {
							viryaScenario = 'Perfection';
							viryaBonus = 1.2; // 20% bonus
							console.log("Virya Perfection detected: Voidbreak main with Voidbreak Mid or Late secondary");
						}
					} 
					// For other realms: requires Early or better
					else {
						const isEarlyOrBetter = p.secondaryPathRealmMinor === 'Early' || 
												p.secondaryPathRealmMinor === 'Mid' || 
												p.secondaryPathRealmMinor === 'Late';
						if (isEarlyOrBetter) {
							viryaScenario = 'Perfection';
							viryaBonus = 1.2; // 20% bonus
							console.log("Virya Perfection detected: Same major realm with Early/Mid/Late secondary");
						}
					}
				}
				// 3. Check Virya Eminence - Secondary is at PREVIOUS major
				else if (previousMajor && p.secondaryPathRealmMajor === previousMajor) {
					// For Voidbreak main: secondary must be at Late
					if (p.mainPathRealmMajor === 'Voidbreak') {
						const isPreviousLate = p.secondaryPathRealmMinor === 'Late';
						if (isPreviousLate) {
							viryaScenario = 'Eminence';
							viryaBonus = 1.2; // 20% bonus
							console.log(`Virya Eminence detected: Voidbreak main with ${previousMajor} Late secondary`);
						}
					} 
					// For other realms: secondary must be at Mid or better
					else {
						const isMidOrBetter = p.secondaryPathRealmMinor === 'Mid' || 
											  p.secondaryPathRealmMinor === 'Late';
						if (isMidOrBetter) {
							viryaScenario = 'Eminence';
							viryaBonus = 1.2; // 20% bonus
							console.log(`Virya Eminence detected: ${p.mainPathRealmMajor} main with ${previousMajor} Mid/Late secondary`);
						}
					}
				}
				
				// 4. If none of the above, it's Virya Completion
				if (!viryaScenario) {
					viryaScenario = 'Completion';
					viryaBonus = 1.0; // No bonus
					console.log("Virya Completion detected: Main path at 100% late, no secondary path requirements met");
				}
				
				// ============ BONUS DURATION LOGIC ============
				// Determine when the Virya bonus ends based on the scenario
				let bonusEndsAt = null;
				
				switch (viryaScenario) {
					case 'Eminence':
						// Eminence bonus lasts until Perfection is reached
						// That is: until secondary reaches same major realm, early stage (mid for Voidbreak)
						if (p.mainPathRealmMajor === 'Voidbreak') {
							bonusEndsAt = `${p.mainPathRealmMajor} Mid`;
						} else {
							bonusEndsAt = `${p.mainPathRealmMajor} Early`;
						}
						break;
						
					case 'Perfection':
						// Perfection bonus lasts until Half-Step is reached
						// That is: until both are at 100% late in same major realm
						bonusEndsAt = `${p.mainPathRealmMajor} Late (both at 100%)`;
						break;
						
					case 'Half-Step':
						// Half-Step bonus lasts until main path hits late realm of next major realm
						if (nextMajor) {
							bonusEndsAt = `${nextMajor} Late`;
						} else {
							bonusEndsAt = 'Max Realm Reached';
						}
						break;
						
					case 'Completion':
						// No bonus, but still track when timegate ends
						bonusEndsAt = 'Timegate Completion';
						break;
				}
				
				console.log(`Virya Scenario: ${viryaScenario}, Bonus: ${(viryaBonus * 100) - 100}%, Ends at: ${bonusEndsAt}`);
					
					// Apply Virya bonus to daily XP for main path
					// Note: In reality, Virya only affects abode aura XP, not all XP
					// For now, we'll apply it to the entire daily XP (simplified)
					if (viryaScenario !== 'Completion' && mainPathDailyXP > 0) {
						// We need to separate abode aura XP from other sources
						// First, recalculate daily XP components to apply bonus correctly
						
						// Calculate abode aura XP portion
						const abodeBonuses = [
							p.abodeBonusCurio, p.abodeBonusTechnique, p.abodeBonusSectLevel,
							p.abodeBonusSectBarrier, p.abodeBonusCelestialSpring, p.abodeBonusEnergyArray,
							p.abodeBonusSwordArray, p.abodeBonusHeavenGate, p.abodeBonusWholenessCitta,
							p.abodeBonusPerfectionWorldRift, p.abodeBonusNirvanaPathofAscension,
							p.abodeBonusNirvanaHornMansion, p.abodeBonusNirvanaNeckMansion
						];
						
						const totalAbodeBonus = abodeBonuses.reduce((sum, bonus) => sum + bonus, 0);
						const baseAuraXP = p.cosmoapsis * (1 + (totalAbodeBonus / 100));
						const abodeAuraXPTotalFinal = baseAuraXP * 10800;
						
						// Calculate gem bonus XP
						const gemBonusXPdaily = abodeAuraXPTotalFinal * GameData.gemQuality[p.gemQuality];
						
						// Total abode-related XP (aura + gem)
						const totalAbodeRelatedXP = abodeAuraXPTotalFinal + gemBonusXPdaily;
						
						// Apply Virya bonus ONLY to abode-related XP
						const viryaBonusMultiplier = viryaBonus;
						const boostedAbodeXP = totalAbodeRelatedXP * viryaBonusMultiplier;
						
						// Calculate pill XP (not affected by Virya)
						const pillXPTotal = this.calculationResults.pillXPTotal || 0;
						
						// Calculate respira XP (not affected by Virya)
						const respiraExp = (() => {
							const probabilities = [0.55, 0.30, 0.1475, 0.0025];
							const multipliers = [1, 2, 5, 10];
							
							let expectedGushValue = 0;
							for (let i = 0; i < probabilities.length; i++) {
								expectedGushValue += probabilities[i] * multipliers[i];
							}
							
							const respiraAttemptsGush = p.respiraAttemptsTotal * expectedGushValue;
							const realmRespiraXP = XPData[p.mainPathRealmMajor + "XP"].respira;
							
							return respiraAttemptsGush * realmRespiraXP * 1000 * p.respiraBonusTotal;
						})();
						
						// Recalculate total daily XP with Virya bonus applied correctly
						const totalDailyXPWithVirya = boostedAbodeXP + pillXPTotal + respiraExp;
						
						console.log(`Original daily XP: ${totalDailyXP}`);
						console.log(`Abode-related XP: ${totalAbodeRelatedXP}`);
						console.log(`Boosted abode XP (${viryaBonusMultiplier}x): ${boostedAbodeXP}`);
						console.log(`Total daily XP with Virya: ${totalDailyXPWithVirya}`);
						
						// Update main path daily XP with Virya bonus
						if (p.pathFocus === 'Main Path') {
							mainPathDailyXP = totalDailyXPWithVirya;
						} else {
							// If focusing on secondary path, main path still gets Virya bonus
							mainPathDailyXP = boostedAbodeXP + pillXPTotal + respiraExp;
						}
					}
				}
				// ================= END VIRYA DETECTION =================

				let timeToNextMainMinor = 0, timeToNextMainMajor = 0;
				let progressPercentMajorMain = 0;
				
				// Calculate main path exp - also calculate for virya if at 100% late.
				if (mainPathDailyXP > 0) {
					const mainRealmXP = GameData.realms[p.mainPathRealm].xp;
					const xpNeededForMinor = mainRealmXP - p.mainPathExp;
					timeToNextMainMinor = Math.max(0, xpNeededForMinor / mainPathDailyXP);

					console.log("XP needed for next minor:", xpNeededForMinor);
					console.log("Time to next minor (days):", timeToNextMainMinor);

					// Calculate total XP earned in this major realm so far
					let totalXpEarnedInMajorRealm = p.mainPathExp;
					
					if (p.mainPathRealmMinor === 'Mid' || p.mainPathRealmMinor === 'Late') {
						const earlyRealm = p.mainPathRealmMajor + ' Early';
						totalXpEarnedInMajorRealm += GameData.realms[earlyRealm].xp;
					}
					
					if (p.mainPathRealmMinor === 'Late') {
						const midRealm = p.mainPathRealmMajor + ' Mid';
						totalXpEarnedInMajorRealm += GameData.realms[midRealm].xp;
					}
					
					// Calculate XP needed for next major realm
					if (p.mainPathRealmMinor === 'Late') {
						timeToNextMainMajor = timeToNextMainMinor;
					} else if (p.mainPathRealmMinor === 'Mid') {
						const nextRealm = p.mainPathRealmMajor + ' Late';
						const xpNeededForMajor = mainRealmXP + GameData.realms[nextRealm].xp - totalXpEarnedInMajorRealm;
						timeToNextMainMajor = Math.max(0, xpNeededForMajor / mainPathDailyXP);
						console.log("XP needed for next major:", xpNeededForMajor);
					} else {
						const midRealm = p.mainPathRealmMajor + ' Mid';
						const lateRealm = p.mainPathRealmMajor + ' Late';
						const xpNeededForMajor = mainRealmXP +
							GameData.realms[midRealm].xp +
							GameData.realms[lateRealm].xp -
							totalXpEarnedInMajorRealm;
						timeToNextMainMajor = Math.max(0, xpNeededForMajor / mainPathDailyXP);
						console.log("XP needed for next major:", xpNeededForMajor);
					}
					
					// Calculate progress percentage for major realm
					const totalXpForMajorRealm = GameData.realmMajorTotalxp[p.mainPathRealmMajor];
					progressPercentMajorMain = (totalXpEarnedInMajorRealm / totalXpForMajorRealm) * 100;
					
					console.log("Time to next major (days):", timeToNextMainMajor);
					console.log("Total XP earned in major realm:", totalXpEarnedInMajorRealm);
					console.log("Total XP for major realm:", totalXpForMajorRealm);
					console.log("Major realm progress %:", progressPercentMajorMain);
				}

				let timeToNextSecondaryMinor = 0, timeToNextSecondaryMajor = 0;
				let progressPercentMajorSecondary = 0;
				
				if (secondaryPathDailyXP > 0) {
					const secondaryRealmXP = GameData.realms[p.secondaryPathRealm].xp;
					const xpNeededForMinor = secondaryRealmXP - p.secondaryPathExp;
					timeToNextSecondaryMinor = Math.max(0, xpNeededForMinor / secondaryPathDailyXP);

					console.log("Secondary XP needed for next minor:", xpNeededForMinor);
					console.log("Secondary time to next minor (days):", timeToNextSecondaryMinor);

					// Calculate total XP earned in this major realm so far
					let totalXpEarnedInMajorRealm = p.secondaryPathExp;
					
					if (p.secondaryPathRealmMinor === 'Mid' || p.secondaryPathRealmMinor === 'Late') {
						const earlyRealm = p.secondaryPathRealmMajor + ' Early';
						totalXpEarnedInMajorRealm += GameData.realms[earlyRealm].xp;
					}
					
					if (p.secondaryPathRealmMinor === 'Late') {
						const midRealm = p.secondaryPathRealmMajor + ' Mid';
						totalXpEarnedInMajorRealm += GameData.realms[midRealm].xp;
					}
					
					// Calculate XP needed for next major realm
					if (p.secondaryPathRealmMinor === 'Late') {
						timeToNextSecondaryMajor = timeToNextSecondaryMinor;
					} else if (p.secondaryPathRealmMinor === 'Mid') {
						const nextRealm = p.secondaryPathRealmMajor + ' Late';
						const xpNeededForMajor = secondaryRealmXP + GameData.realms[nextRealm].xp - totalXpEarnedInMajorRealm;
						timeToNextSecondaryMajor = Math.max(0, xpNeededForMajor / secondaryPathDailyXP);
					} else {
						const midRealm = p.secondaryPathRealmMajor + ' Mid';
						const lateRealm = p.secondaryPathRealmMajor + ' Late';
						const xpNeededForMajor = secondaryRealmXP +
							GameData.realms[midRealm].xp +
							GameData.realms[lateRealm].xp -
							totalXpEarnedInMajorRealm;
						timeToNextSecondaryMajor = Math.max(0, xpNeededForMajor / secondaryPathDailyXP);
					}
					
					// Calculate progress percentage for major realm
					const totalXpForMajorRealm = GameData.realmMajorTotalxp[p.secondaryPathRealmMajor];
					progressPercentMajorSecondary = (totalXpEarnedInMajorRealm / totalXpForMajorRealm) * 100;
					
					console.log("Secondary time to next major (days):", timeToNextSecondaryMajor);
					console.log("Secondary total XP earned in major realm:", totalXpEarnedInMajorRealm);
					console.log("Secondary total XP for major realm:", totalXpForMajorRealm);
					console.log("Secondary major realm progress %:", progressPercentMajorSecondary);
				}
				
				// Store Virya info in results
				this.calculationResults.virya = {
					scenario: viryaScenario,
					bonus: viryaBonus,
					isActive: isMainPath100Late
				};
				
				this.calculationResults.realmProgression = {
					mainPath: {
						timeToNextMinor: timeToNextMainMinor,
						timeToNextMajor: timeToNextMainMajor,
						progressPercentMinorMain: p.mainPathProgress,
						progressPercentMajorMain: progressPercentMajorMain
					},
					secondaryPath: {
						timeToNextMinor: timeToNextSecondaryMinor,
						timeToNextMajor: timeToNextSecondaryMajor,
						progressPercentMinorSecondary: p.secondaryPathProgress,
						progressPercentMajorSecondary: progressPercentMajorSecondary
					}
				};

				console.log("Final results:", this.calculationResults.realmProgression);
				console.log("Virya info:", this.calculationResults.virya);
				console.log("=== END DEBUG ===");
				return this.calculationResults.realmProgression;
			}

            formatTimeDays(days) {
                if (days === undefined || days === null || isNaN(days) || days <= 0) {
                    console.log("Invalid days value in formatTimeDays:", days);
                    return 'Calculating...';
                }
                if (days === Infinity) {
                    return '∞ (Never)';
                }

                const totalMinutes = days * 24 * 60;

                if (totalMinutes < 60) {
                    return `${Math.ceil(totalMinutes)}m`;
                }

                const totalHours = days * 24;

                if (totalHours < 24) {
                    const fullHours = Math.floor(totalHours);
                    const remainingMinutes = Math.ceil((totalHours - fullHours) * 60);

                    if (remainingMinutes === 0) {
                        return `${fullHours}h`;
                    } else {
                        return `${fullHours}h ${remainingMinutes}m`;
                    }
                }

                const fullDays = Math.floor(days);
                const remainingHours = Math.round((days - fullDays) * 24);

                if (remainingHours === 0) {
                    return `${fullDays}d`;
                } else {
                    return `${fullDays}d ${remainingHours}h`;
                }
            }

            formatDateFromDays(days) {
                if (!days || days <= 0) return '--';
                const date = new Date();
                date.setDate(date.getDate() + Math.ceil(days));
                return date.toLocaleDateString();
            }
        }
		
		// ============= APPLICATION INITIALIZER ==============
		class OvermortalApp {
			constructor() {
				this.calculator = null;
				this.saveTimeout = null;
				this.init();
			}

			init() {
				document.addEventListener('DOMContentLoaded', () => this.onDOMContentLoaded());
			}

			// ============== DOM READY HANDLER ===============
			onDOMContentLoaded() {
				this.setupCalculator();
				this.setupEventListeners();
				this.setupNavigation();
				this.loadSavedData();
				this.performInitialCalculation();
			}

			setupCalculator() {
				this.calculator = new OvermortalCalculator();
			}

			setupEventListeners() {
				// Calculation and reset
				document.getElementById('calculate-btn').addEventListener('click', () => 
					this.calculateAndUpdateUI()
				);
				document.getElementById('reset-btn').addEventListener('click', () => 
					this.resetToDefaults()
				);

				// Local storage management
				this.setupLocalStorageListeners();
				
				// Data import/export
				document.getElementById('export-data-btn').addEventListener('click', () => 
					this.calculator.exportData()
				);
				document.getElementById('import-data-btn').addEventListener('click', () => 
					document.getElementById('import-file-input').click()
				);
				document.getElementById('import-file-input').addEventListener('change', (event) => 
					this.handleFileImport(event)
				);
				document.getElementById('clear-storage-btn').addEventListener('click', () => 
					this.clearLocalStorage()
				);
			}

			setupLocalStorageListeners() {
				// Debounced save on input
				const debouncedSave = this.debounce(() => this.calculator.saveToLocalStorage(), 500);
				
				document.addEventListener('input', (event) => {
					if (event.target.matches('input, select, textarea')) {
						debouncedSave();
					}
				});

				// Immediate save on select change
				document.addEventListener('change', (event) => {
					if (event.target.matches('select')) {
						this.calculator.saveToLocalStorage();
					}
				});

				// Save on calculate button click
				document.getElementById('calculate-btn').addEventListener('click', () => {
					this.calculator.saveToLocalStorage();
				});
			}

			setupNavigation() {
				document.querySelectorAll('.nav-item').forEach(item => {
					item.addEventListener('click', () => this.switchSection(item));
				});
			}

			switchSection(navItem) {
				// Remove active class from all nav items and sections
				document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
				document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
				
				// Activate clicked nav item and corresponding section
				navItem.classList.add('active');
				const sectionId = navItem.getAttribute('data-section');
				document.getElementById(sectionId).classList.add('active');
			}

			loadSavedData() {
				if (this.calculator.loadFromLocalStorage()) {
					this.calculator.updateFromInputs();
					this.calculator.saveToLocalStorage(); // Initial save
				}
			}

			performInitialCalculation() {
				this.calculateAndUpdateUI();
			}

			// ================ CORE FUNCTIONS ================
			calculateAndUpdateUI() {
				const calculateBtn = document.getElementById('calculate-btn');
				const originalText = calculateBtn.innerHTML;
				
				// Show loading state
				calculateBtn.innerHTML = '<i class="fas fa-calculator"></i> Calculating...';
				calculateBtn.disabled = true;

				// Delay calculation to show loading state
				setTimeout(() => {
					try {
						const results = this.calculator.calculateAll();
						this.updateDashboard(results);
						this.updateDebugInfo();
						this.showSuccess('Calculation complete! Results updated.');
					} catch (error) {
						console.error('Calculation error:', error);
						this.showError('Error during calculation: ' + error.message);
					} finally {
						// Restore button state
						calculateBtn.innerHTML = originalText;
						calculateBtn.disabled = false;
					}
				}, 100);
			}

			updateDashboard(results) {
				const p = this.calculator.playerData;
				const realmResults = results.realmProgression;

				if (!realmResults) {
					console.warn("No realm results found!");
					return;
				}

				// Update basic path information
				this.updateElementText('main-path-realm-display', p.mainPathRealm);
				this.updateElementText('main-path-progress-display', `${p.mainPathProgress}%`);
				this.updateElementText('secondary-path-realm-display', p.secondaryPathRealm);
				this.updateElementText('secondary-path-progress-display', `${p.secondaryPathProgress}%`);
				this.updateElementText('path-focus-display', p.pathFocus);

				// Update main path results
				if (realmResults.mainPath) {
					this.updateMainPathResults(realmResults.mainPath);
				}

				// Update secondary path results
				if (realmResults.secondaryPath) {
					this.updateSecondaryPathResults(realmResults.secondaryPath);
				}
				// Update Virya Display
				    if (results.virya) {
					this.updateViryaDisplay(results.virya, results);
				}

				// Update fruit scenario results
				const fruitResults = results.fruitScenarios;
				if (fruitResults) {
					this.updateFruitResults(fruitResults);
				}

				// Update recommendation
				if (results.virya) {
					this.updateViryaDisplay(results.virya, results);
					this.updateRecommendation(p, results.virya, results);
				}
			}

			updateMainPathResults(mainPath) {
				const format = this.calculator.formatTimeDays;
				const formatDate = this.calculator.formatDateFromDays;

				// Minor realm
				this.updateElementText('main-minor-time-display', format(mainPath.timeToNextMinor));
				this.updateElementText('main-minor-date-display', `Estimated: ${formatDate(mainPath.timeToNextMinor)}`);
				this.updateProgressBar('main-minor-progress-display', mainPath.progressPercentMinorMain);

				// Major realm
				this.updateElementText('main-major-time-display', format(mainPath.timeToNextMajor));
				this.updateElementText('main-major-date-display', `Estimated: ${formatDate(mainPath.timeToNextMajor)}`);
				this.updateProgressBar('main-major-progress-display', mainPath.progressPercentMajorMain);
			}

			updateSecondaryPathResults(secondaryPath) {
				const format = this.calculator.formatTimeDays;
				const formatDate = this.calculator.formatDateFromDays;

				// Minor realm
				this.updateElementText('secondary-minor-time-display', format(secondaryPath.timeToNextMinor));
				this.updateElementText('secondary-minor-date-display', `Estimated: ${formatDate(secondaryPath.timeToNextMinor)}`);
				this.updateProgressBar('secondary-minor-progress-display', secondaryPath.progressPercentMinorSecondary);

				// Major realm
				this.updateElementText('secondary-major-time-display', format(secondaryPath.timeToNextMajor));
				this.updateElementText('secondary-major-date-display', `Estimated: ${formatDate(secondaryPath.timeToNextMajor)}`);
				this.updateProgressBar('secondary-major-progress-display', secondaryPath.progressPercentMajorSecondary);
			}

			updateFruitResults(fruitResults) {
				const format = this.calculator.formatTimeDays;

				// Main path with fruits
				if (fruitResults.mainPath?.withFruits) {
					const f = fruitResults.mainPath.withFruits;
					this.updateElementText('fruits-minor-main-display', format(f.timeToComplete));
					this.updateElementText('fruits-minor-main-percent-display', 
						f.canComplete ? 'Use Now' : `${f.percentLeft.toFixed(1)}%`
					);
				}

				// Secondary path with fruits
				if (fruitResults.secondaryPath?.withFruits) {
					const f = fruitResults.secondaryPath.withFruits;
					this.updateElementText('fruits-minor-secondary-display', format(f.timeToComplete));
					this.updateElementText('fruits-minor-secondary-percent-display', 
						f.canComplete ? 'Use Now' : `${f.percentLeft.toFixed(1)}%`
					);
				}
			}

			updateProgressBar(elementId, percent) {
				const progress = Math.min(100, percent);
				const element = document.getElementById(elementId);
				element.style.width = `${progress}%`;
				element.textContent = `${Math.round(progress)}%`;
			}

			updateElementText(elementId, text) {
				const element = document.getElementById(elementId);
				if (element) element.textContent = text;
			}

			updateElementHTML(elementId, html) {
				const element = document.getElementById(elementId);
				if (element) element.innerHTML = html;
			}
			
			updateViryaDisplay(viryaInfo, results) {
				if (!viryaInfo) {
					console.log("No Virya info available");
					return;
				}
				
				const p = this.calculator.playerData;
				const format = this.calculator.formatTimeDays;
				const formatDate = this.calculator.formatDateFromDays;
				
				// Update status bar
				this.updateElementText('current-virya-scenario', viryaInfo.scenario || 'None');
				this.updateElementText('current-virya-bonus', `+${((viryaInfo.bonus || 1) * 100 - 100).toFixed(0)}%`);
				this.updateElementText('current-virya-ends', viryaInfo.bonusEndsAt || 'N/A');
				
				// Update requirements display
				this.updateRequirementsDisplay(p, viryaInfo);
				
				// Define scenarios array here so it's available to all methods
				const scenarios = ['Completion', 'Eminence', 'Perfect', 'Half-Step'];
				
				// Update table rows - highlight current scenario
				scenarios.forEach(scenario => {
					const rowId = `virya-row-${scenario.toLowerCase().replace('-', '')}`;
					const row = document.getElementById(rowId);
					
					if (row) {
						// Remove active class from all rows
						row.classList.remove('active');
						
						// Add active class to current scenario
						if (scenario === viryaInfo.scenario) {
							row.classList.add('active');
						}
						
						// Update progress bars based on scenario
						this.updateViryaProgress(scenario, rowId, p, viryaInfo);
					}
				});
				
				// Calculate and display times for each Virya scenario
				this.calculateViryaTimes(scenarios, viryaInfo, results);
			}
			
			updateRequirementsDisplay(playerData, viryaInfo) {
				const requirementsElement = document.getElementById('virya-requirements-display');
				if (!requirementsElement) return;
				
				let html = '<div class="requirements-list">';
				html += '<strong>Requirements Status:</strong><br>';
				
				// Check each requirement
				const requirements = this.checkAllViryaRequirements(playerData);
				
				requirements.forEach(req => {
					const icon = req.met ? '✅' : '❌';
					const className = req.met ? 'requirement-met' : 'requirement-not-met';
					html += `<span class="${className}">${icon} ${req.description}</span><br>`;
				});
				
				html += '</div>';
				requirementsElement.innerHTML = html;
			}

			checkAllViryaRequirements(playerData) {
				const requirements = [];
				
				// 1. Main path at 100% Late
				const main100Late = playerData.mainPathRealmMinor === 'Late' && 
								   playerData.mainPathProgress === 100;
				requirements.push({
					description: 'Main path at 100% Late',
					met: main100Late
				});
				
				if (!main100Late) {
					// If main isn't at 100% Late, other requirements don't matter yet
					return requirements;
				}
				
				// Get realm order
				const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
								   'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
				
				const currentMainMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
				const previousMajor = currentMainMajorIndex > 0 ? realmOrder[currentMainMajorIndex - 1] : null;
				
				// 2. Eminence requirement
				let eminenceMet = false;
				if (previousMajor) {
					if (playerData.mainPathRealmMajor === 'Voidbreak') {
						eminenceMet = playerData.secondaryPathRealmMajor === previousMajor && 
									 playerData.secondaryPathRealmMinor === 'Late';
					} else {
						eminenceMet = playerData.secondaryPathRealmMajor === previousMajor && 
									 playerData.secondaryPathRealmMinor === 'Mid';
					}
				}
				requirements.push({
					description: `Eminence: Secondary at ${previousMajor || 'N/A'} ${playerData.mainPathRealmMajor === 'Voidbreak' ? 'Late' : 'Mid'}`,
					met: eminenceMet
				});
				
				// 3. Perfection requirement
				let perfectionMet = false;
				if (playerData.mainPathRealmMajor === 'Voidbreak') {
					perfectionMet = playerData.secondaryPathRealmMajor === 'Voidbreak' && 
								   playerData.secondaryPathRealmMinor === 'Mid';
				} else {
					perfectionMet = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor && 
								   playerData.secondaryPathRealmMinor === 'Early';
				}
				requirements.push({
					description: `Perfection: Secondary at ${playerData.mainPathRealmMajor} ${playerData.mainPathRealmMajor === 'Voidbreak' ? 'Mid' : 'Early'}`,
					met: perfectionMet
				});
				
				// 4. Half-Step requirement
				const halfStepMet = playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
								   playerData.secondaryPathRealmMinor === 'Late' &&
								   playerData.secondaryPathProgress === 100;
				requirements.push({
					description: 'Half-Step: Both paths at 100% Late in same major',
					met: halfStepMet
				});
				
				return requirements;
			}

			updateViryaProgress(scenario, rowId, playerData, viryaInfo) {
				// Calculate progress percentage for each scenario
				let progressPercent = 0;
				
				switch(scenario) {
					case 'Completion':
						// Completion progress is based on main path late progress
						if (playerData.mainPathRealmMinor === 'Late') {
							progressPercent = playerData.mainPathProgress;
						}
						break;
						
					case 'Eminence':
						// Eminence progress depends on secondary path vs previous major
						progressPercent = this.calculateEminenceProgress(playerData);
						break;
						
					case 'Perfect':
						// Perfection progress depends on secondary path vs same major
						progressPercent = this.calculatePerfectionProgress(playerData);
						break;
						
					case 'Half-Step':
						// Half-Step progress depends on both paths being at 100% late
						progressPercent = this.calculateHalfStepProgress(playerData);
						break;
				}
				
				// Update progress bar
				const progressBar = document.getElementById(`${rowId}-progress`);
				if (progressBar) {
					progressBar.style.width = `${Math.min(100, progressPercent)}%`;
					progressBar.textContent = `${Math.round(progressPercent)}%`;
				}
			}

			calculateEminenceProgress(playerData) {
				// Get realm order
				const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
								   'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
				
				const currentMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
				const previousMajor = currentMajorIndex > 0 ? realmOrder[currentMajorIndex - 1] : null;
				
				if (!previousMajor) return 0;
				
				if (playerData.secondaryPathRealmMajor === previousMajor) {
					// Secondary is in previous major, calculate stage progress
					const stageValue = { 'Early': 0, 'Mid': 1, 'Late': 2 };
					const requiredStage = playerData.mainPathRealmMajor === 'Voidbreak' ? 2 : 1; // Late for Voidbreak, Mid for others
					const currentStage = stageValue[playerData.secondaryPathRealmMinor] || 0;
					
					// Calculate percentage (0-100) based on stage and progress
					const stageProgress = (currentStage / requiredStage) * 70; // 70% weight for stage
					const progressInStage = (playerData.secondaryPathProgress / 100) * 30; // 30% weight for progress
					
					return stageProgress + progressInStage;
				} else if (realmOrder.indexOf(playerData.secondaryPathRealmMajor) < currentMajorIndex) {
					// Secondary is behind previous major
					return 25; // Some progress made
				}
				
				return 0;
			}

			calculatePerfectionProgress(playerData) {
				if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor) {
					// Same major realm
					const stageValue = { 'Early': 0, 'Mid': 1, 'Late': 2 };
					const requiredStage = playerData.mainPathRealmMajor === 'Voidbreak' ? 1 : 0; // Mid for Voidbreak, Early for others
					const currentStage = stageValue[playerData.secondaryPathRealmMinor] || 0;
					
					if (currentStage >= requiredStage) {
						// Already at required stage or better
						const stageProgress = 70; // 70% for reaching required stage
						const progressInStage = (playerData.secondaryPathProgress / 100) * 30; // 30% for progress in stage
						return Math.min(100, stageProgress + progressInStage);
					} else {
						// Not yet at required stage
						return (currentStage / requiredStage) * 100;
					}
				} else if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor) {
					// Different major but same? (edge case)
					return 0;
				}
				
				return 0;
			}

			calculateHalfStepProgress(playerData) {
				if (playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
					playerData.secondaryPathRealmMinor === 'Late' &&
					playerData.mainPathRealmMinor === 'Late') {
					
					// Both in same major late realm
					const mainProgress = playerData.mainPathProgress;
					const secondaryProgress = playerData.secondaryPathProgress;
					
					// Average of both progresses
					return (mainProgress + secondaryProgress) / 2;
				}
				
				return 0;
			}

			calculateViryaTimes(scenarios, viryaInfo, results) {
				const p = this.calculator.playerData;
				const dailyXP = this.calculator.calculateDailyXP();
				const format = this.calculator.formatTimeDays;
				const formatDate = this.calculator.formatDateFromDays;
				
				// Calculate XP rates for each path
				let mainDailyXP = 0;
				let secondaryDailyXP = 0;
				
				if (p.pathFocus === 'Main Path') {
					mainDailyXP = dailyXP;
					secondaryDailyXP = 0;
				} else {
					secondaryDailyXP = dailyXP;
					mainDailyXP = 0;
				}
				
				scenarios.forEach(scenario => {
					const scenarioKey = scenario.toLowerCase().replace('-', '');
					const timeId = `virya-${scenarioKey}-time`;
					const dateId = `virya-${scenarioKey}-date`;
					
					if (scenario === viryaInfo.scenario) {
						// Current scenario - show as active
						this.updateElementText(timeId, '✅ Active Now');
						this.updateElementText(dateId, '--');
					} else {
						// Calculate time to reach this scenario
						const estimatedDays = this.calculateDaysToViryaScenario(scenario, p, mainDailyXP, secondaryDailyXP);
						
						if (estimatedDays > 0) {
							this.updateElementText(timeId, format(estimatedDays));
							this.updateElementText(dateId, `Estimated: ${formatDate(estimatedDays)}`);
						} else {
							this.updateElementText(timeId, 'Cannot reach');
							this.updateElementText(dateId, '--');
						}
					}
				});
			}

			calculateDaysToViryaScenario(targetScenario, playerData, mainDailyXP, secondaryDailyXP) {
				// Get realm order
				const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
								   'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
				
				const currentMainMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
				const currentSecondaryMajorIndex = realmOrder.indexOf(playerData.secondaryPathRealmMajor);
				
				// If we need to calculate time, we need to consider XP requirements
				// This is a simplified calculation - in reality, it's more complex
				
				switch(targetScenario) {
					case 'Completion':
						// Already at 100% late? Time is 0
						if (playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress === 100) {
							return 0;
						}
						// Calculate time for main to reach 100% late
						return this.calculateTimeTo100Late(playerData.mainPathRealm, 
														  playerData.mainPathProgress, 
														  mainDailyXP);
						
					case 'Eminence':
						return this.calculateTimeToEminence(playerData, mainDailyXP, secondaryDailyXP);
						
					case 'Perfect':
						return this.calculateTimeToPerfection(playerData, mainDailyXP, secondaryDailyXP);
						
					case 'Half-Step':
						return this.calculateTimeToHalfStep(playerData, mainDailyXP, secondaryDailyXP);
						
					default:
						return 0;
				}
			}

			calculateTimeTo100Late(currentRealm, currentProgress, dailyXP) {
				if (dailyXP <= 0) return Infinity;
				
				const realmXP = GameData.realms[currentRealm].xp;
				const currentXP = realmXP * (currentProgress / 100);
				const neededXP = realmXP - currentXP;
				
				return neededXP / dailyXP;
			}

			calculateTimeToEminence(playerData, mainDailyXP, secondaryDailyXP) {
				// First, main needs to be at 100% late if not already
				let totalTime = 0;
				
				// Time for main to reach 100% late
				if (!(playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress === 100)) {
					totalTime += this.calculateTimeTo100Late(playerData.mainPathRealm, 
															playerData.mainPathProgress, 
															mainDailyXP);
				}
				
				// Then secondary needs to reach required state
				const realmOrder = ['Incarnation', 'Voidbreak', 'Wholeness', 'Perfection', 
								   'Nirvana', 'Celestial', 'Eternal', 'Supreme'];
				
				const currentMainMajorIndex = realmOrder.indexOf(playerData.mainPathRealmMajor);
				const requiredMajor = currentMainMajorIndex > 0 ? realmOrder[currentMainMajorIndex - 1] : null;
				
				if (!requiredMajor) return Infinity; // No previous major (Incarnation)
				
				// Determine required minor realm
				let requiredMinor = 'Mid'; // Default for non-Voidbreak
				if (playerData.mainPathRealmMajor === 'Voidbreak') {
					requiredMinor = 'Late';
				}
				
				// Calculate time for secondary to reach required state
				totalTime += this.calculateTimeToRealm(playerData.secondaryPathRealm,
													  playerData.secondaryPathProgress,
													  `${requiredMajor} ${requiredMinor}`,
													  secondaryDailyXP);
				
				return totalTime;
			}

			calculateTimeToPerfection(playerData, mainDailyXP, secondaryDailyXP) {
				// Similar logic to Eminence but different requirements
				let totalTime = 0;
				
				// Main to 100% late
				if (!(playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress === 100)) {
					totalTime += this.calculateTimeTo100Late(playerData.mainPathRealm, 
															playerData.mainPathProgress, 
															mainDailyXP);
				}
				
				// Secondary to same major, early (mid for Voidbreak)
				let requiredMinor = 'Early'; // Default for non-Voidbreak
				if (playerData.mainPathRealmMajor === 'Voidbreak') {
					requiredMinor = 'Mid';
				}
				
				totalTime += this.calculateTimeToRealm(playerData.secondaryPathRealm,
													  playerData.secondaryPathProgress,
													  `${playerData.mainPathRealmMajor} ${requiredMinor}`,
													  secondaryDailyXP);
				
				return totalTime;
			}

			calculateTimeToHalfStep(playerData, mainDailyXP, secondaryDailyXP) {
				// Both need to be at 100% late in same major
				let totalTime = 0;
				
				// Main to 100% late
				if (!(playerData.mainPathRealmMinor === 'Late' && playerData.mainPathProgress === 100)) {
					totalTime += this.calculateTimeTo100Late(playerData.mainPathRealm, 
															playerData.mainPathProgress, 
															mainDailyXP);
				}
				
				// Secondary to 100% late in same major
				totalTime += this.calculateTimeToRealm(playerData.secondaryPathRealm,
													  playerData.secondaryPathProgress,
													  `${playerData.mainPathRealmMajor} Late`,
													  secondaryDailyXP);
				
				return totalTime;
			}

			calculateTimeToRealm(currentRealm, currentProgress, targetRealm, dailyXP) {
				if (dailyXP <= 0) return Infinity;
				
				// Get current XP
				const currentRealmXP = GameData.realms[currentRealm].xp;
				const currentXP = currentRealmXP * (currentProgress / 100);
				
				// Get target XP
				const targetRealmXP = GameData.realms[targetRealm].xp;
				const targetXP = targetRealmXP; // Assuming 100% progress for target
				
				// If already at or beyond target
				if (currentXP >= targetXP) return 0;
				
				// Calculate XP needed
				const neededXP = targetXP - currentXP;
				
				return neededXP / dailyXP;
			}

			estimateDaysToScenario(targetScenario, currentVirya, results) {
				// Placeholder implementation
				// In reality, you'd calculate based on:
				// 1. Current XP rates
				// 2. XP needed for secondary path to reach required state
				// 3. Whether focusing on main or secondary path
				
				const scenarioOrder = ['Completion', 'Eminence', 'Perfect', 'Half-Step'];
				const currentIndex = scenarioOrder.indexOf(currentVirya.scenario);
				const targetIndex = scenarioOrder.indexOf(targetScenario);
				
				if (targetIndex <= currentIndex) {
					return 0; // Already achieved or currently active
				}
				
				// Estimate based on difference in difficulty
				const difficultyDiff = targetIndex - currentIndex;
				
				// Base estimate: 30 days per step (this is just a placeholder)
				return difficultyDiff * 30;
			}
			
			updateRecommendation(playerData, viryaInfo, results) {
				const recommendationElement = document.getElementById('recommendation-display');
				if (!recommendationElement) return;
				
				let recommendation = '';
				const timegateDays = playerData.timegateDays || 0;
				
				// Check if main path is at 100% late
				const isMain100Late = playerData.mainPathRealmMinor === 'Late' && 
									 playerData.mainPathProgress === 100;
				
				if (!isMain100Late) {
					// Not yet at 100% late
					const timeTo100Late = this.calculateTimeTo100Late(playerData.mainPathRealm, 
																	 playerData.mainPathProgress, 
																	 this.calculator.calculateDailyXP());
					
					if (timeTo100Late > timegateDays && timegateDays > 0) {
						recommendation = `⚠️ Focus on Main Path! You won't reach 100% Late (${Math.ceil(timeTo100Late)}d) before timegate ends (${timegateDays}d). Consider using fruits or increasing cultivation rate.`;
					} else if (timeTo100Late <= timegateDays && timegateDays > 0) {
						recommendation = `🎯 Good progress! You'll reach 100% Late in ~${Math.ceil(timeTo100Late)}d, before timegate ends. Keep focusing on Main Path.`;
					} else {
						recommendation = `🎯 Focus on reaching 100% Late in Main Path (${Math.ceil(timeTo100Late)}d to go).`;
					}
				} else {
					// Already at 100% late - check Virya scenarios
					switch(viryaInfo.scenario) {
						case 'Completion':
							// At Completion, recommend working toward Eminence
							const timeToEminence = this.calculateTimeToEminence(playerData, 
																			   this.calculator.calculateDailyXP(), 
																			   0);
							
							if (timeToEminence < 7) {
								recommendation = `✨ Work on Secondary Path to reach Eminence! Only ~${Math.ceil(timeToEminence)}d to get +20% bonus.`;
							} else if (timeToEminence < timegateDays) {
								recommendation = `Consider working on Secondary Path to reach Eminence (~${Math.ceil(timeToEminence)}d). The +20% bonus will help future cultivation.`;
							} else {
								recommendation = `Maintain current focus. Reaching Eminence would take ~${Math.ceil(timeToEminence)}d - focus on breakthrough preparation.`;
							}
							break;
							
						case 'Eminence':
							// At Eminence, recommend Perfection
							const timeToPerfection = this.calculateTimeToPerfection(playerData, 
																				   this.calculator.calculateDailyXP(), 
																				   0);
							
							if (timeToPerfection < timegateDays) {
								recommendation = `⚡ Upgrade to Perfection! Only ~${Math.ceil(timeToPerfection)}d to maintain +20% bonus longer.`;
							} else {
								recommendation = `Enjoy the +20% bonus from Eminence. Perfection would take ~${Math.ceil(timeToPerfection)}d.`;
							}
							break;
							
						case 'Perfection':
							// At Perfection, recommend Half-Step
							const timeToHalfStep = this.calculateTimeToHalfStep(playerData, 
																			   this.calculator.calculateDailyXP(), 
																			   0);
							
							if (timeToHalfStep < timegateDays * 2) {
								recommendation = `🏆 Aim for Half-Step! ~${Math.ceil(timeToHalfStep)}d to get +40% bonus!`;
							} else {
								recommendation = `Maintain +20% bonus from Perfection. Half-Step would take ~${Math.ceil(timeToHalfStep)}d.`;
							}
							break;
							
						case 'Half-Step':
							// At Half-Step, maximize benefit
							recommendation = `🎊 Perfect! Enjoy the +40% bonus. Consider breaking through when ready.`;
							break;
							
						default:
							recommendation = `Complete Main Path to 100% Late to unlock Virya scenarios.`;
					}
				}
				
				// Check if we should consider switching path focus
				if (playerData.pathFocus === 'Main Path' && isMain100Late) {
					recommendation += ` Consider switching to Secondary Path focus to advance Virya.`;
				}
				
				recommendationElement.innerHTML = `<span><strong>Recommendation:</strong> ${recommendation}</span>`;
			}
			
			updateDebugInfo() {
				// Game Data
				const gameDataStr = this.formatJSONForDisplay(GameData);
				document.getElementById('debug-game-data').innerHTML = gameDataStr;

				// Player Input
				const playerDataStr = this.formatJSONForDisplay(this.calculator.playerData);
				document.getElementById('debug-player-input').innerHTML = playerDataStr;

				// Calculations
				const calcStr = this.formatJSONForDisplay(this.calculator.calculationResults) || 
							   'No calculations performed yet.';
				document.getElementById('debug-calculations').innerHTML = calcStr;
			}

			formatJSONForDisplay(obj) {
				return JSON.stringify(obj, null, 2)
					.replace(/\n/g, '<br>')
					.replace(/ /g, '&nbsp;');
			}

			resetToDefaults() {
				if (!confirm('Are you sure you want to reset all inputs to default values?')) {
					return;
				}

				this.calculator.initializePlayerData();
				this.syncInputsToCalculator();
				this.calculateAndUpdateUI();
				this.showSuccess('Reset to default values complete.');
			}

			syncInputsToCalculator() {
				const p = this.calculator.playerData;
				const inputs = {
					'main-path-realm': p.mainPathRealm,
					'main-path-progress': p.mainPathProgress,
					'secondary-path-realm': p.secondaryPathRealm,
					'secondary-path-progress': p.secondaryPathProgress,
					'path-focus': p.pathFocus,
					'timegate-days': p.timegateDays,
					'vase-stars': p.vaseStars,
					'mirror-stars': p.mirrorStars,
					'token-stars': p.tokenStars,
					'gold-pill': p.goldPill,
					'purple-pill': p.purplePill,
					'blue-pill': p.bluePill,
					'elixir': p.elixir,
					'fruits-count': p.fruitsCount,
					'weekly-fruits': p.weeklyFruits,
					'fruits-usage': p.fruitsUsage
				};

				Object.entries(inputs).forEach(([id, value]) => {
					const element = document.getElementById(id);
					if (element) element.value = value;
				});
			}

			handleFileImport(event) {
				const file = event.target.files[0];
				if (!file) return;

				const reader = new FileReader();
				reader.onload = (e) => {
					this.calculator.importData(e.target.result);
					this.calculateAndUpdateUI();
				};
				reader.readAsText(file);
				
				event.target.value = ''; // Reset file input
			}

			clearLocalStorage() {
				if (!confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
					return;
				}

				this.calculator.clearLocalStorage();
				this.resetToDefaults();
			}

			showSuccess(message) {
				// You could enhance this with a proper notification system
				alert(message);
			}

			showError(message) {
				// You could enhance this with a proper error notification system
				alert(message);
			}

			debounce(func, wait) {
				return (...args) => {
					clearTimeout(this.saveTimeout);
					this.saveTimeout = setTimeout(() => func.apply(this, args), wait);
				};
			}
		}

		// =============== INITIALIZE APPLICATION ===============
		const app = new OvermortalApp();