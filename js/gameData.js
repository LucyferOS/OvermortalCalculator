// Game data constants
export const XPData = {
    IncarnationXP: 	{ respira: 5.30,  red: 192.00, 	 gold: 96.00,   purple: 48.00,   blue: 25.60,   elixer: 0, 	     benediction: 0 },
    VoidbreakXP: 	{ respira: 7.80,  red: 288.00, 	 gold: 144.00,  purple: 72.00,   blue: 38.40,   elixer: 60.00,   benediction: 87.00 },
    WholenessXP: 	{ respira: 10.5,  red: 492.00, 	 gold: 246.00,  purple: 123.00,  blue: 65.60,   elixer: 84.00,   benediction: 135.00 },
    PerfectionXP: 	{ respira: 13.5,  red: 744.00, 	 gold: 372.00,  purple: 186.00,  blue: 99.20,   elixer: 128.00,  benediction: 205.00 },
    NirvanaXP: 		{ respira: 25.00, red: 1368.00,	 gold: 684.00,  purple: 342.00,  blue: 182.40,  elixer: 180.00,  benediction: 470.00 },
    CelestialXP: 	{ respira: 37.5,  red: 3096.00,  gold: 1548.00, purple: 774.00,  blue: 412.70,  elixer: 368.00,  benediction: 1220.00 },
    EternalXP: 		{ respira: 86.33, red: 7296.00,  gold: 3648.00, purple: 1824.00, blue: 972.80,  elixer: 754.00,  benediction: 3250.00 },
    SupremeXP: 		{ respira: 84.38, red: 14592.00, gold: 7296.00, purple: 3648.00, blue: 1945.60, elixer: 2500.00, benediction: 7500.00 }
};

export const Realms = {
    'Nascent Early': 	 { xp: 1818600, 	absorption: 0.0 },
    'Nascent Mid': 		 { xp: 3858900, 	absorption: 0.0 },
    'Nascent Late': 	 { xp: 11070200, 	absorption: 0.0 },
	'Incarnation Early': { xp: 12326300, 	absorption: 0.317 },
    'Incarnation Mid': 	 { xp: 26155400, 	absorption: 0.358 },
    'Incarnation Late':  { xp: 61792200, 	absorption: 0.4 },
    'Voidbreak Early': 	 { xp: 68014736, 	absorption: 0.5 },
    'Voidbreak Mid': 	 { xp: 142093920, 	absorption: 0.65 },
    'Voidbreak Late': 	 { xp: 307715027, 	absorption: 0.8 },
    'Wholeness Early': 	 { xp: 186813569, 	absorption: 0.85 },
    'Wholeness Mid': 	 { xp: 263951236, 	absorption: 0.9 },
    'Wholeness Late': 	 { xp: 304450560, 	absorption: 0.95 },
    'Perfection Early':  { xp: 469855611, 	absorption: 1.3 },
    'Perfection Mid': 	 { xp: 690774727, 	absorption: 1.6 },
    'Perfection Late': 	 { xp: 915460544, 	absorption: 1.8 },
    'Nirvana Early': 	 { xp: 1119067845,  absorption: 2.0 },
    'Nirvana Mid': 		 { xp: 1430384212,  absorption: 2.2 },
    'Nirvana Late': 	 { xp: 1795072703,  absorption: 2.4 },
    'Celestial Early': 	 { xp: 2923599210,  absorption: 2.6 },
    'Celestial Mid': 	 { xp: 3856472371,  absorption: 2.8 },
    'Celestial Late': 	 { xp: 5215416675,  absorption: 3.0 },
    'Eternal Early': 	 { xp: 8427284628,  absorption: 4.0 },
    'Eternal Mid': 	 	 { xp: 9849448919,  absorption: 4.2 },
    'Eternal Late': 	 { xp: 12813035158, absorption: 4.4 },
    'Supreme Early': 	 { xp: 19860203495, absorption: 5.0 },
    'Supreme Mid': 	 	 { xp: 25818265842, absorption: 5.2 },
    'Supreme Late': 	 { xp: 34854658887, absorption: 5.4 }
};

export const RealmMajorTotalXP = {
    'Nascent': 16747700,
	'Incarnation': 100273900,
    'Voidbreak': 517823683,
    'Wholeness': 755215365,
    'Perfection': 2076090882,
    'Nirvana': 4344524760,
    'Celestial': 11995488256,
    'Eternal': 31089768705,
    'Supreme': 80533128224
};

export const GameConstants = {
    minPerTaoistYear: 	15,
    taoistYearsPerDay: 	96,
    abodeBase: 			130,
    
    gemQuality: {
        'No Aura': 	0,
        'Common': 	.1,
        'Uncommon': .13,
        'Rare': 	.16,
        'Epic': 	.20,
        'Legendary':.24,
        'Mythic': 	.28
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

	fruitRealmData: {
	  Incarnation:	65.00, 
	  Voidbreak: 	96.00,
	  Wholeness:  	130.00,
	  Perfection: 	240.00,
	  Nirvana:  	420.00,
	  Celestial: 	800.00,
	  Eternal: 		1810.00,
	  Supreme: 		3600.00
	},
	
	fruitQualityModifier: {
		'common':1,
		'uncommon': 1.5,
		'rare': 1.84,
		'epic': 2.28,
		'legendary': 2.72,
		'mythic': 3.3744
	},
	
	flatExtractorLevels: {
	  levels: [
		{ 
		  level: 0,
		  xpBonus: 0.00,
		  gushMultiplier: 150.00,
		  gushChance: 0.00,
		  qualityChance: {
			common:   100.00,
			uncommon: 0.00,
			rare: 	  0.00,
			epic: 	  0.00,
			legendary:0.00,
			mythic:   0.00
		  }
		},
		{ 
		  level: 1,
		  xpBonus: 2.00,
		  gushMultiplier: 154.00,
		  gushChance: 0.00,
		  qualityChance: {
			common:   95.00,
			uncommon: 5.00,
			rare: 	  0.00,
			epic: 	  0.00,
			legendary:0.00,
			mythic:   0.00
		  }
		},
		{ 
		  level: 2,
		  xpBonus: 4.00,
		  gushMultiplier: 158.00,
		  gushChance: 0.00,
		  qualityChance: {
			common: 90.00,
			uncommon: 10.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 3,
		  xpBonus: 6.00,
		  gushMultiplier: 162.00,
		  gushChance: 0.00,
		  qualityChance: {
			common: 85.00,
			uncommon: 15.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 4,
		  xpBonus: 8.00,
		  gushMultiplier: 166.00,
		  gushChance: 0.00,
		  qualityChance: {
			common: 80.00,
			uncommon: 20.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 5,
		  xpBonus: 10.00,
		  gushMultiplier: 170.00,
		  gushChance: 0.00,
		  qualityChance: {
			common: 75.00,
			uncommon: 25.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 6,
		  xpBonus: 12.00,
		  gushMultiplier: 174.00,
		  gushChance: 5.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 50.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 7,
		  xpBonus: 14.00,
		  gushMultiplier: 178.00,
		  gushChance: 5.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 55.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 8,
		  xpBonus: 16.00,
		  gushMultiplier: 182.00,
		  gushChance: 5.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 60.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 9,
		  xpBonus: 18.00,
		  gushMultiplier: 186.00,
		  gushChance: 5.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 65.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 10,
		  xpBonus: 20.00,
		  gushMultiplier: 190.00,
		  gushChance: 5.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 70.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 11,
		  xpBonus: 22.00,
		  gushMultiplier: 194.00,
		  gushChance: 10.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 40.00,
			rare: 30.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 12,
		  xpBonus: 24.00,
		  gushMultiplier: 198.00,
		  gushChance: 10.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 30.00,
			rare: 40.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 13,
		  xpBonus: 26.00,
		  gushMultiplier: 202.00,
		  gushChance: 10.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 20.00,
			rare: 50.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 14,
		  xpBonus: 28.00,
		  gushMultiplier: 206.00,
		  gushChance: 10.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 10.00,
			rare: 60.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 15,
		  xpBonus: 30.00,
		  gushMultiplier: 210.00,
		  gushChance: 10.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 70.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 16,
		  xpBonus: 32.00,
		  gushMultiplier: 214.00,
		  gushChance: 15.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 40.00,
			epic: 30.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 17,
		  xpBonus: 34.00,
		  gushMultiplier: 218.00,
		  gushChance: 15.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 30.00,
			epic: 40.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 18,
		  xpBonus: 36.00,
		  gushMultiplier: 222.00,
		  gushChance: 15.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 20.00,
			epic: 50.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 19,
		  xpBonus: 38.00,
		  gushMultiplier: 226.00,
		  gushChance: 15.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 10.00,
			epic: 60.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 20,
		  xpBonus: 40.00,
		  gushMultiplier: 230.00,
		  gushChance: 15.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 70.00,
			legendary: 0.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 21,
		  xpBonus: 42.00,
		  gushMultiplier: 234.00,
		  gushChance: 20.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 40.00,
			legendary: 30.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 22,
		  xpBonus: 44.00,
		  gushMultiplier: 238.00,
		  gushChance: 20.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 30.00,
			legendary: 40.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 23,
		  xpBonus: 46.00,
		  gushMultiplier: 242.00,
		  gushChance: 20.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 20.00,
			legendary: 50.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 24,
		  xpBonus: 48.00,
		  gushMultiplier: 246.00,
		  gushChance: 20.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 10.00,
			legendary: 60.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 25,
		  xpBonus: 50.00,
		  gushMultiplier: 250.00,
		  gushChance: 20.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 70.00,
			mythic: 0.00
		  }
		},
		{ 
		  level: 26,
		  xpBonus: 52.00,
		  gushMultiplier: 254.00,
		  gushChance: 25.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 40.00,
			mythic: 30.00
		  }
		},
		{ 
		  level: 27,
		  xpBonus: 54.00,
		  gushMultiplier: 258.00,
		  gushChance: 25.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 30.00,
			mythic: 40.00
		  }
		},
		{ 
		  level: 28,
		  xpBonus: 56.00,
		  gushMultiplier: 262.00,
		  gushChance: 25.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 20.00,
			mythic: 50.00
		  }
		},
		{ 
		  level: 29,
		  xpBonus: 58.00,
		  gushMultiplier: 266.00,
		  gushChance: 25.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 10.00,
			mythic: 60.00
		  }
		},
		{ 
		  level: 30,
		  xpBonus: 60.00,
		  gushMultiplier: 270.00,
		  gushChance: 25.00,
		  qualityChance: {
			common: 0.00,
			uncommon: 0.00,
			rare: 0.00,
			epic: 0.00,
			legendary: 0.00,
			mythic: 70.00
		  }
		}
	  ]
	},
	
	extractorQualityFlatChance: {
		'common':30,
		'uncommon':30,
		'rare':30,
		'epic':30,
		'legendary':30,
		'mythic':30
	}

};