// End-to-end tests over the full Calculator pipeline.
//
// The other suites test the domain functions directly. That left the
// orchestration in Calculator.calculateAll() uncovered, which is exactly where
// the elixir double-count lived: every individual function was right, and the
// assembly added one of them twice.
//
// A minimal DOM stub lets updateFromInputs() read a plain object, so the real
// pipeline runs without a browser.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { XPCalculator } from '../js/dashboard/XPCalculator.js';

const FIELDS = {
    'main-path-realm': 'Nirvana Mid', 'main-path-progress': '165.1',
    'secondary-path-realm': 'Perfection Mid', 'secondary-path-progress': '40',
    'path-focus': 'Main Path', 'timegate-days': '41', 'had-Virya': 'Halfstep',
    'gold-pill': '5', 'purple-pill': '22', 'blue-pill': '0',
    'elixir': '3', 'elixir-consumed': '328',
    'benediction': '5', 'benediction-consumed': '117', 'current-red-pills': '0',
    'vase-stars': '5 stars', 'vase-skin': 'Yes',
    'mirror-stars': '1 star', 'mirror-skin': 'No',
    'token-stars': '0 star', 'token-skin': 'No', 'pearl-stars': 'No artifact',
    'gem-quality': 'Mythic',
    'abode-easy-mode': 'No', 'abode-aura-easy': '498.03', 'absorption-easy': '4.42',
    'abode-sect-level': '10.5', 'abode-celestial-spring': '3.9', 'abode-sect-barrier': '5.0',
    'abode-energy-array': '50.0', 'abode-sword-array': '30.0', 'abode-heaven-gate': '30.0',
    'abode-wholeness-citta': '23.0', 'abode-perfection-world-rift': '14.0',
    'abode-nirvana-path-of-ascension': '6.0', 'abode-nirvana-horn-mansion': '14.9',
    'abode-nirvana-neck-mansion': '0.0',
    'pill-nirvana-ghost-mansion': '5.5', 'pill-nirvana-turtle-beak-mansion': '9.1',
    'pill-nirvana-chariot-mansion': '9.6', 'respira-nirvana-dipper-mansion': '9.2',
    'pill-attempts-technique': '27', 'pill-bonus-technique': '28.0',
    'respira-attempt-technique': '9.0', 'respira-bonus-technique': '156.0',
    'abode-aura-technique': '0.0', 'abode-aura-curio': '0.0',
    'pill-bonus-curio': '780.0', 'respira-attempt-curio': '50.0',
    'respira-bonus-curio': '20.0', 'abode-temper-aura-curio': '0.0',
    'pill-attempts-immortal-friends': '1.0', 'pill-bonus-immortal-friends': '14.0',
    'respira-attempt-immortal-friends': '5.0', 'respira-bonus-immortal-friends': '26.0',
    'fruits-count': '0', 'weekly-fruits': '0', 'fruits-usage': 'current',
    'extractor-rank': 'common', 'extractor-experience': '0',
    'extractor-quality': '0', 'extractor-gush': '0'
};

let OvermortalCalculator;

function stubDom(overrides = {}) {
    const values = { ...FIELDS, ...overrides };
    globalThis.document = {
        getElementById: (id) => (id in values ? { value: values[id] } : null),
        querySelectorAll: () => [],
        querySelector: () => null
    };
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

async function runPipeline(overrides = {}) {
    stubDom(overrides);
    const calc = new OvermortalCalculator();
    const results = calc.calculateAll();
    return { results, playerData: calc.getPlayerData() };
}

before(async () => {
    stubDom();
    ({ OvermortalCalculator } = await import('../js/utilities/Calculator.js'));
});

after(() => {
    delete globalThis.document;
    delete globalThis.localStorage;
});

describe('daily XP assembly', () => {
    test('elixir is counted once, not once per assembly step', async () => {
        const { results, playerData } = await runPipeline();

        const sourcesTotal = XPCalculator.calculateDailyXPWithAbsorptionBonus(
            playerData, results.mainPathAbsorptionBonus
        );

        assert.ok(
            Math.abs(results.mainPathDailyXPBase - sourcesTotal) < 1e-6,
            `headline daily XP ${results.mainPathDailyXPBase} exceeds the sum of its sources ${sourcesTotal}`
        );
    });

    test('removing elixir lowers daily XP by exactly one elixir portion', async () => {
        const withElixir = await runPipeline();
        const withoutElixir = await runPipeline({ elixir: '0' });

        const drop = withElixir.results.mainPathDailyXPBase - withoutElixir.results.mainPathDailyXPBase;
        const oneDose = XPCalculator.calculatePillXPBreakdown(withElixir.playerData).elixir;

        assert.ok(oneDose > 0, 'fixture should have elixir XP');
        assert.ok(
            Math.abs(drop - oneDose) < 1e-6,
            `dropping elixir changed daily XP by ${drop}, expected ${oneDose}`
        );
    });
});

describe('path focus', () => {
    test('the focused path is the one that progresses', async () => {
        const mainFocus = await runPipeline({ 'path-focus': 'Main Path' });
        const secondaryFocus = await runPipeline({ 'path-focus': 'Secondary Path' });

        const mainWhenFocused = mainFocus.results.realmProgression.mainPath.timeToNextMajor;
        const mainWhenNot = secondaryFocus.results.realmProgression.mainPath.timeToNextMajor;
        assert.ok(
            mainWhenNot > mainWhenFocused,
            'the main path should take longer when it is not the focus'
        );

        const secondWhenFocused = secondaryFocus.results.realmProgression.secondaryPath;
        assert.ok(
            !secondWhenFocused.earnsNoXP && secondWhenFocused.timeToNextMajor > 0,
            'a focused secondary path on a supported realm should report a real time'
        );
    });

    test('a path with no XP table is flagged rather than silently reporting zero', async () => {
        // Nascent has entries in Realms but none in XPData, so nothing can be
        // costed there. The dashboard must not render that as a time of zero.
        const { results } = await runPipeline({
            'secondary-path-realm': 'Nascent Early',
            'secondary-path-progress': '23.5',
            'path-focus': 'Secondary Path'
        });

        assert.equal(
            results.realmProgression.secondaryPath.earnsNoXP, true,
            'a secondary path in Nascent earns nothing and must say so'
        );
    });
});

describe('determinism', () => {
    test('the same inputs give the same results twice', async () => {
        const a = await runPipeline();
        const b = await runPipeline();
        assert.equal(a.results.mainPathDailyXPBase, b.results.mainPathDailyXPBase);
        assert.equal(a.results.virya.scenario, b.results.virya.scenario);
    });
});
