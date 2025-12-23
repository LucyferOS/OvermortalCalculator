        // ==================== GAME DATA (Static values from 'My hidden Flat sheet') ====================
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
                'Eminence': 3,
                'Perfect': 2,
                'Half-Step': 0,
            }
        };

        // ==================== CALCULATION ENGINE ====================
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
                let mainPathRealm = document.getElementById('main-path-realm').value;
                let mainPathRealmMajor = mainPathRealm.substring(0, mainPathRealm.indexOf(' '));
                let mainPathRealmMinor = mainPathRealm.substring(mainPathRealm.indexOf(' ') + 1);
                let mainPathProgress = parseFloat(document.getElementById('main-path-progress').value) || 0;
                let secondaryPathRealm = document.getElementById('secondary-path-realm').value;
                let secondaryPathRealmMajor = secondaryPathRealm.substring(0, secondaryPathRealm.indexOf(' '));
                let secondaryPathRealmMinor = secondaryPathRealm.substring(secondaryPathRealm.indexOf(' ') + 1);
                let secondaryPathProgress = parseFloat(document.getElementById('secondary-path-progress').value) || 0;
                let mainPathExp = GameData.realms[mainPathRealm].xp * (mainPathProgress / 100);
                let secondaryPathExp = GameData.realms[secondaryPathRealm].xp * (secondaryPathProgress / 100);

                let pillBonusCurio = parseFloat(document.getElementById('pill-bonus-curio').value) || 0;
                let pillBonusImmortalFriends = parseFloat(document.getElementById('pill-bonus-immortal-friends').value) || 0;
                let pillBonusTechnique = parseFloat(document.getElementById('pill-bonus-technique').value) || 0;
                let pillBonusNirvanaChariotMansion = parseFloat(document.getElementById('pill-nirvana-chariot-mansion').value) || 0;
                let pillBonusNirvanaGhostMansion = parseFloat(document.getElementById('pill-nirvana-ghost-mansion').value) || 0;
                let pillBonusNirvanaTurtleBeakMansion = parseFloat(document.getElementById('pill-nirvana-turtle-beak-mansion').value) || 0;
                let pillBonus = (pillBonusCurio + pillBonusImmortalFriends + pillBonusTechnique) / 100;

                let abodeBonusCurio = parseFloat(document.getElementById('abode-aura-curio').value) || 0;
                let abodeBonusTechnique = parseFloat(document.getElementById('abode-aura-technique').value) || 0;
                let abodeBonusSectLevel = parseFloat(document.getElementById('abode-sect-level').value) || 0;
                let abodeBonusSectBarrier = parseFloat(document.getElementById('abode-sect-barrier').value) || 0;
                let abodeBonusCelestialSpring = parseFloat(document.getElementById('abode-celestial-spring').value) || 0;
                let abodeBonusEnergyArray = parseFloat(document.getElementById('abode-energy-array').value) || 0;
                let abodeBonusSwordArray = parseFloat(document.getElementById('abode-sword-array').value) || 0;
                let abodeBonusHeavenGate = parseFloat(document.getElementById('abode-heaven-gate').value) || 0;
                let abodeBonusWholenessCitta = parseFloat(document.getElementById('abode-wholeness-citta').value) || 0;
                let abodeBonusPerfectionWorldRift = parseFloat(document.getElementById('abode-perfection-world-rift').value) || 0;
                let abodeBonusNirvanaPathofAscension = parseFloat(document.getElementById('abode-nirvana-path-of-ascension').value) || 0;
                let abodeBonusNirvanaHornMansion = parseFloat(document.getElementById('abode-nirvana-horn-mansion').value) || 0;
                let abodeBonusNirvanaNeckMansion = parseFloat(document.getElementById('abode-nirvana-neck-mansion').value) || 0;

                let respiraAttemptsImmortalFriend = parseInt(document.getElementById('respira-attempt-immortal-friends').value) || 0;
                let respiraAttemptsTechnique = parseInt(document.getElementById('respira-attempt-technique').value) || 0;
                let respiraAttemptsCurio = parseInt(document.getElementById('respira-attempt-curio').value) || 0;
                let respiraAttemptsTotal = (10 + respiraAttemptsImmortalFriend + respiraAttemptsCurio + respiraAttemptsTechnique);

                let respiraBonusImmortalFriend = parseInt(document.getElementById('respira-bonus-immortal-friends').value) || 0;
                let respiraBonusTechnique = parseInt(document.getElementById('respira-bonus-technique').value) || 0;
                let respiraBonusCurio = parseInt(document.getElementById('respira-bonus-curio').value) || 0;
                let respiraBonusTotal = 1 + ((respiraBonusCurio + respiraBonusImmortalFriend + respiraBonusTechnique) / 100);

                let abodeAuraXPTotal = GameData.abodeBase * GameData.realms[mainPathRealm].absorption;

                this.playerData = {
                    mainPathRealm: mainPathRealm,
                    mainPathRealmMajor: mainPathRealmMajor,
                    mainPathRealmMinor: mainPathRealmMinor,
                    mainPathProgress: parseFloat(document.getElementById('main-path-progress').value),
                    mainPathExp: mainPathExp,
                    secondaryPathRealm: secondaryPathRealm,
                    secondaryPathRealmMajor: secondaryPathRealmMajor,
                    secondaryPathRealmMinor: secondaryPathRealmMinor,
                    secondaryPathProgress: parseFloat(document.getElementById('secondary-path-progress').value),
                    secondaryPathExp: secondaryPathExp,
                    pathFocus: document.getElementById('path-focus').value,
                    timegateDays: parseFloat(document.getElementById('timegate-days').value),

                    abodeBonusCurio: abodeBonusCurio,
                    abodeBonusTechnique: abodeBonusTechnique,
                    abodeBonusSectLevel: abodeBonusSectLevel,
                    abodeBonusSectBarrier: abodeBonusSectBarrier,
                    abodeBonusCelestialSpring: abodeBonusCelestialSpring,
                    abodeBonusEnergyArray: abodeBonusEnergyArray,
                    abodeBonusSwordArray: abodeBonusSwordArray,
                    abodeBonusHeavenGate: abodeBonusHeavenGate,
                    abodeBonusWholenessCitta: abodeBonusWholenessCitta,
                    abodeBonusPerfectionWorldRift: abodeBonusPerfectionWorldRift,
                    abodeBonusNirvanaPathofAscension: abodeBonusNirvanaPathofAscension,
                    abodeBonusNirvanaHornMansion: abodeBonusNirvanaHornMansion,
                    abodeBonusNirvanaNeckMansion: abodeBonusNirvanaNeckMansion,

                    respiraAttemptsImmortalFriend: respiraAttemptsImmortalFriend,
                    respiraAttemptsTechnique: respiraAttemptsTechnique,
                    respiraAttemptsCurio: respiraAttemptsCurio,
                    respiraAttemptsTotal: respiraAttemptsTotal,

                    respiraBonusImmortalFriend: respiraBonusImmortalFriend,
                    respiraBonusTechnique: respiraBonusTechnique,
                    respiraBonusCurio: respiraBonusCurio,
                    respiraBonusTotal: respiraBonusTotal,

                    pillBonusNirvanaChariotMansion: pillBonusNirvanaChariotMansion,
                    pillBonusNirvanaGhostMansion: pillBonusNirvanaGhostMansion,
                    pillBonusNirvanaTurtleBeakMansion: pillBonusNirvanaTurtleBeakMansion,

                    vaseStars: document.getElementById('vase-stars').value,
                    mirrorStars: document.getElementById('mirror-stars').value,
                    tokenStars: document.getElementById('token-stars').value,

                    goldPill: parseFloat(document.getElementById('gold-pill').value),
                    purplePill: parseFloat(document.getElementById('purple-pill').value),
                    bluePill: parseFloat(document.getElementById('blue-pill').value),
                    elixir: parseFloat(document.getElementById('elixir').value),

                    fruitsCount: parseInt(document.getElementById('fruits-count').value),
                    weeklyFruits: parseInt(document.getElementById('weekly-fruits').value),
                    fruitsUsage: document.getElementById('fruits-usage').value,

                    cosmoapsis: abodeAuraXPTotal,
                    gemQuality: document.getElementById('gem-quality').value,

                    respiraAttemptsTotal: respiraAttemptsTotal,
                    respiraBonusTotal: respiraBonusTotal,
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
                let abodeAuraXPTotalFinal = (p.cosmoapsis * (1 + ((p.abodeBonusCurio + p.abodeBonusTechnique + p.abodeBonusSectLevel + p.abodeBonusSectBarrier + p.abodeBonusCelestialSpring + p.abodeBonusEnergyArray + p.abodeBonusSwordArray +
                    p.abodeBonusHeavenGate + p.abodeBonusWholenessCitta + p.abodeBonusPerfectionWorldRift + p.abodeBonusNirvanaPathofAscension + p.abodeBonusNirvanaHornMansion + p.abodeBonusNirvanaNeckMansion) / 100)));
                abodeAuraXPTotalFinal = abodeAuraXPTotalFinal * 10800;

                let gemBonusXPdaily = abodeAuraXPTotalFinal * GameData.gemQuality[p.gemQuality];

                let vaseRedPill;
                if (p.vaseStars == 'No artifact') {
                    vaseRedPill = 0;
                } else {
                    vaseRedPill = ((GameData.artifactEnergyReplenishment[p.vaseStars] * GameData.taoistYearsPerDay) + 100) / 100;
                }

                let mirrorRedPill;
                if (p.mirrorStars == 'No artifact') {
                    mirrorRedPill = 0;
                } else {
                    mirrorRedPill = ((GameData.artifactEnergyReplenishment[p.mirrorStars] * GameData.taoistYearsPerDay) + 100) / (200 * (1 - GameData.mirrorTokenBonus[p.mirrorStars]));
                }

                let tokenRedPill;
                if (p.tokenStars == 'No artifact') {
                    tokenRedPill = 0;
                } else {
                    tokenRedPill = ((GameData.artifactEnergyReplenishment[p.tokenStars] * GameData.taoistYearsPerDay) + 100) / (200 * (1 - GameData.mirrorTokenBonus[p.tokenStars])) * .1225;
                }

                let numRedPills = vaseRedPill + mirrorRedPill + tokenRedPill;

                const goldPillXP = XPData[p.mainPathRealmMajor + "XP"].gold * (1 + (p.pillBonusNirvanaChariotMansion / 100)) * p.goldPill;
                const purplePillXP = XPData[p.mainPathRealmMajor + "XP"].purple * (1 + (p.pillBonusNirvanaTurtleBeakMansion / 100)) * p.purplePill;
                const bluePillXP = XPData[p.mainPathRealmMajor + "XP"].blue * (1 + (p.pillBonusNirvanaGhostMansion / 100)) * p.bluePill;
                const elixirXP = XPData[p.mainPathRealmMajor + "XP"].elixer * p.elixir;
                const redPillXP = XPData[p.mainPathRealmMajor + "XP"].red * (1 + GameData.vaseBonus[p.vaseStars]) * numRedPills;

                console.log(redPillXP);

                let pillXPTotal = (goldPillXP + purplePillXP + bluePillXP + elixirXP + redPillXP) * p.pillBonus * 1000;
                this.calculationResults.pillXPTotal = pillXPTotal;

                let respiraAttemptsGush = (p.respiraAttemptsTotal * .55) + (p.respiraAttemptsTotal * .30 * 2) + (p.respiraAttemptsTotal * .1475 * 5) + (p.respiraAttemptsTotal * .0025 * 10);
                let respiraExp = respiraAttemptsGush * XPData[p.mainPathRealmMajor + "XP"].respira * 1000 * p.respiraBonusTotal;

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
		
		// ==================== MAIN INITIALIZATION ====================
let calculator; // Declare calculator globally

document.addEventListener('DOMContentLoaded', () => {
    // Create calculator instance
    calculator = new OvermortalCalculator();
    
    // Add event listeners
    document.getElementById('calculate-btn').addEventListener('click', calculateAndUpdateUI);
    document.getElementById('reset-btn').addEventListener('click', resetToDefaults);
    
    // Load from localStorage and calculate
    if (calculator.loadFromLocalStorage()) {
        calculator.updateFromInputs();
    }
    calculateAndUpdateUI();
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            this.classList.add('active');
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Add local storage auto-save listeners
    calculator.saveToLocalStorage(); // Initial save
    
    document.addEventListener('input', function(event) {
        if (event.target.matches('input, select, textarea')) {
            clearTimeout(window.saveTimeout);
            window.saveTimeout = setTimeout(() => {
                calculator.saveToLocalStorage();
            }, 500);
        }
    });
    
    document.addEventListener('change', function(event) {
        if (event.target.matches('select')) {
            clearTimeout(window.saveTimeout);
            calculator.saveToLocalStorage();
        }
    });
});
// ==================== LOCAL STORAGE AUTO-SAVE ====================
// Auto-save when any input changes
document.addEventListener('input', function(event) {
    if (event.target.matches('input, select, textarea')) {
        // Debounce the save to avoid too many writes
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(() => {
            calculator.saveToLocalStorage();
        }, 500);
    }
});

// Also save on select change events
document.addEventListener('change', function(event) {
    if (event.target.matches('select')) {
        clearTimeout(window.saveTimeout);
        calculator.saveToLocalStorage();
    }
});

// Save on calculate button click
document.getElementById('calculate-btn').addEventListener('click', () => {
    calculator.saveToLocalStorage();
});

// Clear saved data button
document.getElementById('clear-storage-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
        calculator.clearLocalStorage();
        resetToDefaults();
    }
});

// Export data button
document.getElementById('export-data-btn').addEventListener('click', () => {
    calculator.exportData();
});

// Import data button
document.getElementById('import-data-btn').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
});

// Handle file import
document.getElementById('import-file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            calculator.importData(e.target.result);
        };
        reader.readAsText(file);
    }
    event.target.value = ''; // Reset file input
});

        function calculateAndUpdateUI() {
            const calculateBtn = document.getElementById('calculate-btn');
            const originalText = calculateBtn.innerHTML;
            calculateBtn.innerHTML = '</i> Calculating...';
            calculateBtn.disabled = true;

            setTimeout(() => {
                try {
                    const results = calculator.calculateAll();
                    updateDashboard(results);
                    updateDebugInfo();
                    alert('Calculation complete! Results updated.');
                } catch (error) {
                    console.error('Calculation error:', error);
                    alert('Error during calculation: ' + error.message);
                } finally {
                    calculateBtn.innerHTML = originalText;
                    calculateBtn.disabled = false;
                }
            }, 500);
        }

        function updateDashboard(results) {
            const p = calculator.playerData;
            const realmResults = results.realmProgression;

            console.log("=== DEBUG updateDashboard ===");
            console.log("Results received:", results);
            console.log("Realm results:", realmResults);

            if (!realmResults) {
                console.log("No realm results found!");
                return;
            }

            document.getElementById('main-path-realm-display').textContent = p.mainPathRealm;
            document.getElementById('main-path-progress-display').textContent = p.mainPathProgress + '%';
            document.getElementById('secondary-path-realm-display').textContent = p.secondaryPathRealm;
            document.getElementById('secondary-path-progress-display').textContent = p.secondaryPathProgress + '%';
            document.getElementById('path-focus-display').textContent = p.pathFocus;

            if (realmResults.mainPath) {
                const mp = realmResults.mainPath;
                console.log("Main path results:", mp);

                const minorTime = calculator.formatTimeDays(mp.timeToNextMinor);
                const majorTime = calculator.formatTimeDays(mp.timeToNextMajor);

                console.log("Formatted minor time:", minorTime);
                console.log("Formatted major time:", majorTime);

                document.getElementById('main-minor-time-display').textContent = minorTime;
                document.getElementById('main-minor-date-display').textContent = 'Estimated: ' + calculator.formatDateFromDays(mp.timeToNextMinor);

                document.getElementById('main-major-time-display').textContent = majorTime;
                document.getElementById('main-major-date-display').textContent = 'Estimated: ' + calculator.formatDateFromDays(mp.timeToNextMajor);

                document.getElementById('main-minor-progress-display').style.width = Math.min(100, mp.progressPercentMinorMain) + '%';
                document.getElementById('main-minor-progress-display').textContent = Math.round(mp.progressPercentMinorMain) + '%';

                document.getElementById('main-major-progress-display').style.width = Math.min(100, mp.progressPercentMajorMain ) + '%';
                document.getElementById('main-major-progress-display').textContent = Math.round(mp.progressPercentMajorMain ) + '%';
            }

            if (realmResults.secondaryPath) {
                const sp = realmResults.secondaryPath;
                console.log("Secondary path results:", sp);

                document.getElementById('secondary-minor-time-display').textContent = calculator.formatTimeDays(sp.timeToNextMinor);
                document.getElementById('secondary-minor-date-display').textContent = 'Estimated: ' + calculator.formatDateFromDays(sp.timeToNextMinor);
                document.getElementById('secondary-minor-progress-display').style.width = Math.min(100, sp.progressPercentMinorSecondary) + '%';
                document.getElementById('secondary-minor-progress-display').textContent = Math.round(sp.progressPercentMinorSecondary) + '%';

                document.getElementById('secondary-major-time-display').textContent = calculator.formatTimeDays(sp.timeToNextMajor);
                document.getElementById('secondary-major-date-display').textContent = 'Estimated: ' + calculator.formatDateFromDays(sp.timeToNextMajor);
                document.getElementById('secondary-major-progress-display').style.width = Math.min(100, sp.progressPercentMajorSecondary) + '%';
                document.getElementById('secondary-major-progress-display').textContent = Math.round(sp.progressPercentMajorSecondary) + '%';
            }

            console.log("=== END DEBUG updateDashboard ===");

            const fruitResults = results.fruitScenarios;
            if (fruitResults) {
                if (fruitResults.mainPath.withFruits) {
                    const f = fruitResults.mainPath.withFruits;
                    document.getElementById('fruits-minor-main-display').textContent = calculator.formatTimeDays(f.timeToComplete);
                    document.getElementById('fruits-minor-main-percent-display').textContent = f.canComplete ? 'Use Now' : f.percentLeft.toFixed(1) + '%';
                }

                if (fruitResults.secondaryPath.withFruits) {
                    const f = fruitResults.secondaryPath.withFruits;
                    document.getElementById('fruits-minor-secondary-display').textContent = calculator.formatTimeDays(f.timeToComplete);
                    document.getElementById('fruits-minor-secondary-percent-display').textContent = f.canComplete ? 'Use Now' : f.percentLeft.toFixed(1) + '%';
                }
            }

            document.getElementById('recommendation-display').innerHTML = `
                <span><strong>Recommendation:</strong> ${results.recommendation || 'No recommendation available.'}</span>
            `;
        }

        function updateDebugInfo() {
            const gameDataStr = JSON.stringify(GameData, null, 2)
                .replace(/\n/g, '<br>')
                .replace(/ /g, '&nbsp;');
            document.getElementById('debug-game-data').innerHTML = gameDataStr;

            const playerDataStr = JSON.stringify(calculator.playerData, null, 2)
                .replace(/\n/g, '<br>')
                .replace(/ /g, '&nbsp;');
            document.getElementById('debug-player-input').innerHTML = playerDataStr;

            const calcStr = JSON.stringify(calculator.calculationResults, null, 2)
                .replace(/\n/g, '<br>')
                .replace(/ /g, '&nbsp;');
            document.getElementById('debug-calculations').innerHTML = calcStr || 'No calculations performed yet.';
        }

        function resetToDefaults() {
            if (confirm('Are you sure you want to reset all inputs to default values?')) {
                calculator.initializePlayerData();

                document.getElementById('main-path-realm').value = calculator.playerData.mainPathRealm;
                document.getElementById('main-path-progress').value = calculator.playerData.mainPathProgress;
                document.getElementById('secondary-path-realm').value = calculator.playerData.secondaryPathRealm;
                document.getElementById('secondary-path-progress').value = calculator.playerData.secondaryPathProgress;
                document.getElementById('path-focus').value = calculator.playerData.pathFocus;
                document.getElementById('timegate-days').value = calculator.playerData.timegateDays;
                document.getElementById('vase-stars').value = calculator.playerData.vaseStars;
                document.getElementById('mirror-stars').value = calculator.playerData.mirrorStars;
                document.getElementById('gold-pill').value = calculator.playerData.goldPill;
                document.getElementById('purple-pill').value = calculator.playerData.purplePill;
                document.getElementById('blue-pill').value = calculator.playerData.bluePill;
                document.getElementById('elixir').value = calculator.playerData.elixir;
                document.getElementById('fruits-count').value = calculator.playerData.fruitsCount;
                document.getElementById('weekly-fruits').value = calculator.playerData.weeklyFruits;
                document.getElementById('fruits-usage').value = calculator.playerData.fruitsUsage;

                calculateAndUpdateUI();
                alert('Reset to default values complete.');
            }
        }
