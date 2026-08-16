# Overmortal Calculator — project map

Read this before searching. It tells you which files a change is likely to
touch. Only go hunting through the codebase when the answer isn't here.

## What this is

A static, no-build browser app that estimates realm breakthrough timing for the
mobile game Overmortal. The player types their character's stats into the
"Player Input" tab; the Dashboard and Analytics tabs show how long breakthroughs
will take, what the Virya tiers are worth, and when to eat fruits.

- No bundler, no framework, no npm dependencies. Native ES modules loaded
  straight from `index.html`.
- Two CDN loads at runtime: Chart.js (charts) and `marked` (release notes).
  If either is blocked the app does not start.
- State lives in `localStorage` (key `overmortal_calculator_data`), keyed by DOM
  element id. Export/import is that same blob as JSON.
- Node's built-in test runner only: `npm test`, `npm run snapshot`.

## Layout at a glance

```
index.html            all markup: nav, the 6 tab sections, every input & output element
css/style.css         layout, cards, tables, theme variables (:root colours)
css/utilities.css     utility classes (.hidden, .card-grid, …)
README.md             user-facing docs + release notes; RENDERED INTO THE APP at runtime
REFACTOR_PLAN.md      the audit that produced the current structure (mostly implemented)

js/utilities/         entry point + app orchestration + shared data  (legacy folder name)
js/dashboard/         the calculation modules                        (NOT the view)
js/engine/            Virya rules & the shared breakthrough simulation
js/domain/            pure realm-ladder maths
js/data/              the Virya tier table
js/analytics/         chart data + Chart.js rendering
js/ui/                the view layer, split by surface
tests/                node:test invariants + a characterization snapshot
```

**Two naming traps.** `js/dashboard/` holds *calculators*, `js/ui/dashboard.js`
holds the *dashboard view*. And `js/utilities/` is not a helpers folder — it is
the app layer (entry point, orchestrator, game data). The generic helpers are
just `js/utilities/utils.js`.

## Control flow

```
index.html
 └─ js/utilities/main.js          OvermortalApp — boots on DOMContentLoaded
     ├─ EventManager.js           wires every DOM listener (nav, buttons, autosave)
     ├─ Calculator.js             reads DOM → playerData → runs everything → results
     │    ├─ dashboard/XPCalculator.js           daily XP: abode aura, pills, respira, pearl
     │    ├─ dashboard/RealmCalculator.js        time to next minor/major realm
     │    ├─ dashboard/ViryaCalculator.js        tier detection, XP/days to a tier
     │    ├─ dashboard/ViryaScenarioComparator.js  tier A vs tier B over a timegate window
     │    ├─ dashboard/RealmProgressionSimulator.js  day-by-day realm walk
     │    ├─ dashboard/FruitCalculator.js        fruit XP + weekly projection
     │    ├─ dashboard/Recommendations.js        minimum extractor levels for a target
     │    └─ DataManager.js                      localStorage / export / import
     └─ UIManager.js              thin facade → js/ui/*
          └─ ui/dashboard.js → ui/viryaTable.js, ui/analyticsView.js → analytics/Analytics.js
```

One render pass: `calculateAndUpdateUI()` → `calculator.calculateAll()` →
`UIManager.updateDashboard(results, playerData)`. `ui/dashboard.js` fans out to
the Virya table and the analytics view itself, so *everything* re-renders on
every calculate.

## Where to change what

| Request | Start here |
|---|---|
| New/changed game number (realm XP, absorption, pill XP, timegate, extractor, fruit tables) | `js/utilities/gameData.js` |
| New player input field | `index.html` (markup) → `Calculator.update*Inputs()` (read) → `main.js syncInputsToCalculator()` (reset/restore) → the calculator that consumes it |
| Daily XP formula, abode aura, pills, respira, pearl, elixir/benediction falloff | `js/dashboard/XPCalculator.js` |
| Virya tier requirements, bonus values, how far a bonus carries | `js/data/viryaRules.js` (the table) — reading logic is `js/engine/ViryaRules.js` |
| "Which tier am I / how long to reach a tier" | `js/dashboard/ViryaCalculator.js` |
| "Is tier X worth it vs just breaking through" (the comparison columns) | `js/dashboard/ViryaScenarioComparator.js` |
| The walk up to a breakthrough (shared by the two above) | `js/engine/Progression.js` |
| Realm ordering, XP between two positions, "am I past X" | `js/domain/realms.js` |
| Time to next minor/major realm | `js/dashboard/RealmCalculator.js` |
| Fruit counts, weekly income, token conversion | `js/dashboard/FruitCalculator.js` + `Calculator.calculateFruitData()` |
| Extractor level recommendations | `js/dashboard/Recommendations.js` |
| Charts, red-pill analytic | `js/analytics/Analytics.js` (maths+render), `js/ui/analyticsView.js` (wiring) |
| Dashboard cards, fruit cards, timegate card, focus highlighting | `js/ui/dashboard.js` |
| The Virya table rows/cells and its recommendation line | `js/ui/viryaTable.js` |
| Debug tab | `js/ui/debugView.js` |
| Notifications, progress bars, button spinners | `js/ui/dom.js` |
| Save/load/export/import | `js/utilities/DataManager.js` |
| Event listeners, tab navigation, path-focus clicks | `js/utilities/EventManager.js` |
| Release notes / "How to use this calculator" tab | `README.md` (loaded by `markdownLoader.js`) |
| Version number | `package.json` + the README release-notes heading |

## The data objects

**`playerData`** — one flat object built by `Calculator.updateFromInputs()` from
the DOM. Field names are camelCase versions of the element ids;
`main.js syncInputsToCalculator()` holds the complete id ↔ field mapping and is
the canonical list. Key shape:

- Paths: `mainPathRealm` / `mainPathRealmMajor` / `mainPathRealmMinor` /
  `mainPathProgress` / `mainPathExp`, and the same four with `secondaryPath*`.
  `pathFocus` is `'Main Path'` or `'Secondary Path'`.
- Derived-at-input: `pillBonus`, `respiraBonusTotal`, `respiraAttemptsTotal`.
- `Calculator.calculateAll()` also writes `cosmoapsisValue`, `dailyXP`,
  `totalAbode`, `totalAbodeBonus`, `viryaScenario`, `viryaAbsorptionBonus` back
  onto `playerData` — for the debug tab. **Nothing downstream may read those
  back**; that was the bug class REFACTOR_PLAN §2 documents and the tests in
  `tests/invariants.test.js` guard against.

**`results`** — assembled by `Calculator.assembleResults()`. Fields:
`dailyXP`, `mainPathDailyXPBase`, `secondaryPathDailyXPBase`,
`mainPathAbsorptionBonus`, `realmProgression{mainPath,secondaryPath}`,
`fruitProjection{rows,…}`, `virya{scenario,absorptionBonus,isActive,bonusEndsAt}`,
`scenarioXPNeeded`, `scenarioFruitResults`, `scenarioComparisons`,
`nextScenario`, `fruitResult`, `recommendedFruits`.

## Domain rules worth knowing before you touch the maths

- **Realm ladder.** 9 majors × 3 minors (`Early/Mid/Late`), Nascent → Supreme.
  Positions are compared by absolute XP from the bottom of the ladder, so
  progress > 100% (overflow) is meaningful and carries forward.
- **Two paths.** The main path is what the player is breaking through on; the
  secondary path only exists to unlock Virya tiers. Path focus decides which one
  gets the bulk of daily XP; elixir feeds the main path, benediction the
  secondary. The XP calculators only understand `mainPath*` fields, so
  `Progression.asPathPlayerData(playerData, 'secondary')` re-points a copy —
  **use that helper, never hand-roll the spread**.
- **Virya tiers**, lowest to highest: `No Virya` → `Completion` → `Eminence` →
  `Perfect` → `Half-Step`. All require the main path at 100% of its major's
  Late. Requirements are *thresholds* on the secondary path's ladder position,
  not exact stage matches; the tier is the highest one satisfied. Voidbreak
  shifts the Eminence/Perfect requirements up one minor stage
  (`REQUIREMENT_SHIFT` in `js/data/viryaRules.js`).
- **Carry-over.** A tier held last realm keeps its absorption bonus for a few
  minor stages into the next: Eminence carries nothing, Perfect through Early,
  Half-Step through Early and Mid. Encoded as `carriesThrough` in the tier table.
- **Vocabulary mismatch.** The `had-Virya` dropdown uses `Perfection` /
  `Halfstep`; internal constants are `Perfect` / `Half-Step`. Translation happens
  once, in `HAD_VIRYA_OPTION_TO_TIER`. Saved data stores the dropdown spelling,
  so don't change the option values.
- **Easy mode** (`abodeEasyMode`) replaces the Abode Aura breakdown *and* the
  Absorption calculation with two typed-in totals. It therefore swallows the
  Virya bonus and MonsterScape too. Things that are *not* Abode Aura — the pill
  and Respira mansion bonuses, the Glitted Lotus bonuses — must still apply in
  easy mode. Tests enforce both halves of that.
- **Fruit projection** counts Wednesdays between now and each breakthrough, and
  each dashboard row gets its own horizon. It deliberately does not model the
  feedback of eating fruits shortening the horizon.

## Gotchas

- `playerData.timegate` (used by `FruitCalculator.fruitXP` to apply a 1.5×
  during-timegate bonus) and `playerData.timegateDays` (days remaining) are
  different fields, both read from the `timegate-days` input.
- `RealmProgressionSimulator.simulateDays()` is a long, branch-heavy loop with
  overflow handling and `maxRealm` stopping rules. Change it with the snapshot
  in hand, not by reading alone.
- View element ids follow patterns: Virya table cells are
  `virya-{completion|eminence|perfect|halfstep}-{time|date|focus|next-realm|xp}`;
  fruit rows are `fruits[-max]-{minor|major}-{main|secondary}-{time|date}-display`.
  The scenario key is `scenario.toLowerCase().replace('-','')`.
- `ui/viryaTable.js` and `ui/analyticsView.js` call calculators directly rather
  than reading only from `results` — the Virya "next realm" column and the
  red-pill slider recompute on demand.
- Some views write inline `style.*` for colour coding; a theme change means
  touching those too, not just the CSS.

## Testing

- `npm test` — `tests/invariants.test.js`, 150+ assertions. Each `describe`
  block maps to a defect from `REFACTOR_PLAN.md` §2: the absorption bonus must
  actually change daily XP, the secondary path must not inherit main-path state,
  results must not depend on stale written-back fields, the analytics breakdown
  must sum to the daily XP total, tier detection must be monotonic.
- `npm run snapshot` — rewrites `tests/__snapshots__/current.json` with rounded
  outputs for every fixture player. **Run it before and after any change to the
  maths and diff it**; that's the safety net for behaviour the unit tests don't
  pin.
- `tests/fixtures.js` builds DOM-free `playerData` objects. It must be kept in
  sync with `Calculator.initializePlayerData()` and `update*Inputs()` — if you
  add an input field with a derived value, add it here too.

## Conventions

- ES modules, `export { X }` at the bottom of the file.
- Calculators are classes of `static` methods; `domain/` and `engine/` also
  export named pure functions plus a namespace object.
- Domain and engine code must stay pure: no DOM, no mutation of arguments, no
  cached derived state. Only `Calculator` and the `ui/` layer touch the DOM.
- 4-space indent (a few older files use tabs — match the surrounding file).
