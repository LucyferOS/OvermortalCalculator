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

				let timeToNextMainMinor = 0, timeToNextMainMajor = 0;
				let progressPercentMajorMain = 0;
				
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

				// Update fruit scenario results
				const fruitResults = results.fruitScenarios;
				if (fruitResults) {
					this.updateFruitResults(fruitResults);
				}

				// Update recommendation
				this.updateElementHTML('recommendation-display', 
					`<span><strong>Recommendation:</strong> ${results.recommendation || 'No recommendation available.'}</span>`
				);
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