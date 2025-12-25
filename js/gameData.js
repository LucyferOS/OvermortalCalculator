// Game data constants
export const XPData = {
    IncarnationXP: { respira: 5.30, red: 192.00, gold: 96.00, purple: 48.00, blue: 25.60, elixer: 0, benediction: 0 },
    VoidbreakXP: { respira: 7.80, red: 288.00, gold: 144.00, purple: 72.00, blue: 38.40, elixer: 60.00, benediction: 87.00 },
    WholenessXP: { respira: 10.5, red: 492.00, gold: 246.00, purple: 123.00, blue: 65.60, elixer: 84.00, benediction: 135.00 },
    PerfectionXP: { respira: 13.5, red: 744.00, gold: 372.00, purple: 186.00, blue: 99.20, elixer: 128.00, benediction: 205.00 },
    NirvanaXP: { respira: 25.00, red: 1368.00, gold: 684.00, purple: 342.00, blue: 182.40, elixer: 180.00, benediction: 470.00 },
    CelestialXP: { respira: 37.5, red: 3096.00, gold: 1548.00, purple: 774.00, blue: 412.70, elixer: 368.00, benediction: 1220.00 },
    EternalXP: { respira: 86.33, red: 7296.00, gold: 3648.00, purple: 1824.00, blue: 972.80, elixer: 754.00, benediction: 3250.00 },
    SupremeXP: { respira: 84.38, red: 14592.00, gold: 7296.00, purple: 3648.00, blue: 1945.60, elixer: 2500.00, benediction: 7500.00 }
};

export const Realms = {
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
    'Nirvana Late': { xp: 1795072703, absorption: 2.4 },
    'Celestial Early': { xp: 2923599210, absorption: 2.6 },
    'Celestial Mid': { xp: 3856472371, absorption: 2.8 },
    'Celestial Late': { xp: 5215416675, absorption: 3.0 },
    'Eternal Early': { xp: 8427284628, absorption: 4.0 },
    'Eternal Mid': { xp: 9849448919, absorption: 4.2 },
    'Eternal Late': { xp: 12813035158, absorption: 4.4 },
    'Supreme Early': { xp: 19860203495, absorption: 5.0 },
    'Supreme Mid': { xp: 25818265842, absorption: 5.2 },
    'Supreme Late': { xp: 34854658887, absorption: 5.4 }
};

export const RealmMajorTotalXP = {
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