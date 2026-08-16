# Overmortal Calculator — Refactor Plan

Status: proposal. Nothing in this plan has been implemented yet.

This document covers three goals you asked for:

1. Make the codebase easy to follow.
2. Stop duplicating the same work in different places.
3. Make the functions — Virya reachability in particular — actually correct.

The Virya problems are not primarily a "hard maths" problem. They are caused by
three specific defects that are all consequences of the structure. Fixing the
structure fixes them, which is why the plan does both together.

---

## 1. How the code works today

```
index.html
  └─ main.js  (OvermortalApp)
       ├─ EventManager        wires DOM events
       ├─ Calculator.js       reads DOM → playerData → runs everything → results
       │    ├─ XPCalculator            daily XP, pills, respira, pearl, cosmoapsis
       │    ├─ RealmCalculator         realm index maths, time-to-next-realm
       │    ├─ ViryaCalculator         scenario detection, XP/days to scenario
       │    ├─ ViryaScenarioComparator scenario A vs B over a timegate window
       │    ├─ RealmProgressionSimulator  day-by-day realm progression
       │    ├─ FruitCalculator / Recommendations
       │    └─ DataManager             localStorage
       └─ UIManager           renders everything (1,617 lines)
            └─ Analytics      charts + its own copy of the pill maths
```

Roughly 6,400 lines of JavaScript. There is no build step, no package.json and
no tests.

### The two structural habits that cause most of the pain

**A. `playerData` is used as a scratch pad.** It is not just input — calculated
values are written back onto it (`cosmoapsisValue`, `viryaScenario`,
`totalAbode`, `dailyXP`), and downstream code reads those written-back values.
Whether a function is correct now depends on *when* it is called.

**B. "Pretend the secondary path is the main path".** To calculate anything for
the secondary path, the code spreads `playerData` and overwrites the
`mainPath*` fields:

```js
const secondaryPathPlayerData = {
    ...playerData,
    mainPathRealm:      playerData.secondaryPathRealm,
    mainPathRealmMajor: playerData.secondaryPathRealmMajor,
    mainPathRealmMinor: playerData.secondaryPathRealmMinor
};
```

This appears in five places (`Calculator.js:464`, `ViryaCalculator.js:483`,
`ViryaCalculator.js:729`, `ViryaScenarioComparator.js:29`,
`ViryaScenarioComparator.js:150`) and the copies disagree with each other —
some carry `mainPathProgress` across, some don't; some clear the cached
`cosmoapsisValue`, some don't. Every disagreement is a bug.

---

## 2. Why Virya calculates wrong — three confirmed defects

These were each reproduced by calling the real modules directly.

### Defect 1 — the absorption bonus is silently ignored (critical)

`XPCalculator.calculateAbodeAuraXP` and `calculatePearlXP` both do this:

```js
const cosmoapsisValue = playerData.cosmoapsisValue !== undefined
    ? playerData.cosmoapsisValue          // ← cached value wins
    : this.calculateCosmoapsisValue(playerData, absorptionBonus);
```

`Calculator.calculateAll()` writes `playerData.cosmoapsisValue` before anything
else runs, so from then on the `absorptionBonus` argument does nothing. Abode
aura is by far the largest XP source, so the Virya bonus effectively vanishes.

Measured, same player, Voidbreak Late:

| | bonus 0.0 | bonus 0.4 | difference |
|---|---|---|---|
| Without the cache | 3,033,989 | 3,651,749 | **+617,760/day** |
| With the cache (what actually runs) | 3,033,989 | 3,033,989 | **0** |

Everything that reasons about "how much faster am I with the Virya bonus"
— `RealmProgressionSimulator.calculateEffectiveDailyXP`,
`ViryaCalculator.calculateDaysForStage`, `calculateDaysForMainPathStage`, the
whole scenario comparator — is passing a bonus that gets thrown away. This is
the single biggest reason the Virya numbers look wrong.

### Defect 2 — secondary path XP is calculated at the main path's absorption

Same root cause. The secondary-path shim in `Calculator.js:464` does not clear
`cosmoapsisValue`, so the secondary path is costed using the main path's realm
absorption.

Measured, main at Voidbreak Late / secondary at Incarnation Late:
**2,436,412/day reported vs 1,818,652/day correct — 34% too high.** Every
"days to Eminence / Perfect / Half-Step" figure built on secondary-path XP is
too optimistic by roughly that margin.

### Defect 3 — stale `viryaScenario` leaks into hypothetical future states

`Calculator.calculateViryaInfo()` writes `playerData.viryaScenario`, and
`ViryaCalculator.calculateXPForEminence/Perfect/HalfStep` read it as an
early-exit ("already achieved → 0 XP needed").

`calculateMaxNextRealmScenario` — the function behind the "next realm" column,
i.e. exactly the *"can I reach this Virya stage?"* feature — builds a
hypothetical breakthrough state with `{...playerData, mainPathRealm: nextMajor
Early, ...}`. That spread **carries the current `viryaScenario` forward**, so
the hypothetical future player is treated as though they already have the Virya
tier they had before breaking through.

Measured, hypothetical state at Wholeness Early with a stale `Half-Step` tag:
**XP needed for Eminence reported as 0, correct answer 755,215,365.** The column
therefore reports tiers as reachable that are not.

### Defect 4 — the tier rules contradict each other (needs your answer)

Two code paths disagree about whether the Eminence carry-over bonus is active
in the next realm's Early stage:

- `Calculator.isHadViryaBonusActive` → active in Early.
- `ViryaScenarioComparator.js:371-377` and `ViryaCalculator.js:718-721` →
  expires at the start of Early, so *not* active.

One of these is wrong and I can't tell which from the code alone. See
[Open questions](#8-open-questions-for-you).

### Defect 5 — tier detection uses exact matches, so cases fall through

`ViryaCalculator.checkPerfect/checkEminence/checkHalfStep` test for an *exact*
minor stage:

```js
playerData.secondaryPathRealmMajor === playerData.mainPathRealmMajor &&
playerData.secondaryPathRealmMinor === 'Early'      // Perfect
```

Positions between the named rungs match nothing and fall through to
"Completion" with no bonus. For non-Voidbreak realms, a secondary path sitting
at *same major, Mid* — which is past the Perfect requirement — is one such gap.
Tier should be "the highest tier whose requirement is met" (a `>=` comparison
on realm index), not a set of equality tests. This is the likely source of the
"still not catching all edge cases" note in the README.

---

## 3. Duplication inventory

| What | Copies | Where |
|---|---|---|
| `getHadViryaAbsorptionBonus` + `isHadViryaBonusActive` | 2 (byte-identical) | `Calculator.js:136-174` and `Calculator.js:327-365` |
| Scenario → absorption bonus table | 8 | `gameData.js:102` (dead), `Calculator.js:139`, `Calculator.js:330`, `ViryaCalculator.js:550`, `:704`, `:822`, `ViryaScenarioComparator.js:45`, `:373` |
| `REALM_ORDER_MAJOR` array | 3 | `gameData.js:67` plus hardcoded at `ViryaScenarioComparator.js:167` and `:603` |
| Realm index maths | 2 | `RealmCalculator.calculateRealmIndex` and `RealmProgressionSimulator.getRealmIndex` |
| "Pretend secondary is main" shim | 5 | listed in §1 |
| Breakthrough phase-2/phase-3 simulation | 2 (~200 lines each, near-identical) | `ViryaCalculator.calculateMaxNextRealmScenario:471-700` and `ViryaScenarioComparator.calculateOverflowXPForScenario:130-423` |
| Diminishing-returns tier loop | 2 (identical but for field names) | `XPCalculator.calculateElixirXPWithEfficiency` and `calculateBenedictionXPWithEfficiency` |
| Pill XP maths | 3 | `XPCalculator.calculatePillXP`, `Analytics.calculatePillXPBreakdown`, `Analytics.calculateRedPillsForBreakthrough` |
| "XP needed to reach next major" | 2 | `RealmCalculator.calculatePathProgression` and `Analytics.calculateRedPillsForBreakthrough:367-383` |
| `'Voidbreak'` special-case branches | 18 in `ViryaCalculator.js`, 23 total | scattered through detection, XP and days functions |

Dead or unused: `GameConstants.viryaBonus` (defined, never read),
`ViryaScenarioComparator.calculateDaysUntilBonusEnds` (never called),
`xpLostDuringFocus` (always 0), unused `CalculatorUtils` imports in
`XPCalculator.js`, `ViryaCalculator.js`, `DataManager.js`.

### One more thing: three vocabularies for the same four tiers

| Concept | Scenario constant | `had-Virya` select | `GameConstants.viryaBonus` |
|---|---|---|---|
| tier 3 | `Perfect` | `Perfection` | `Perfection` |
| tier 4 | `Half-Step` | `Halfstep` | `Halfstep` |

`Calculator.getHadViryaAbsorptionBonus` has to key its map on *both* spellings
to work. Any new code that guesses the wrong spelling fails silently by
returning 0.

---

## 4. Target shape

Three layers, one direction of dependency: **data → domain → app → ui**.
Domain code is pure functions — no DOM, no cached derived state, no mutation of
its inputs.

```
js/
  data/
    gameData.js        realms, XP tables, timegates, extractor, consumables
    viryaRules.js      THE tier table: requirement, bonus, expiry — one place

  domain/                            (pure; unit-testable without a browser)
    realms.js          index/name/next/prev, XP between two positions
    PathState.js       {major, minor, progress} value object — replaces the shim
    xp.js              dailyXP(pathState, bonuses, absorptionBonus) — no cache
    consumables.js     one generic tier-falloff function (elixir + benediction)
    fruit.js

  engine/
    ViryaRules.js      detectTier, requirementFor, bonusFor, bonusActiveIn
    Progression.js     the single simulator (replaces the two phase-2/3 copies)
    ViryaPlanner.js    xpToTier, daysToTier, maxTierNextRealm, compareTiers
    Recommendations.js

  app/
    inputs.js          the ONLY place that reads the DOM into a PlayerInput
    Calculator.js      orchestration only
    DataManager.js

  ui/
    dashboard.js  viryaTable.js  analyticsView.js  debugView.js
    EventManager.js
```

Four decisions do most of the work:

**Kill the derived-value cache.** `dailyXP` always computes. No
`cosmoapsisValue` / `viryaScenario` / `dailyXP` written back onto player data.
This alone fixes defects 1, 2 and 3. Performance is a non-issue — this is
microseconds of arithmetic on a button press.

**`PathState` instead of the shim.** XP functions take an explicit path
position, so there is no way to lie about which path you mean and no stale
field to drag along. Removes five inconsistent copies.

**One Virya rule table, driven by data.** Each tier becomes a row: minimum
secondary-path position (expressed relative to the main path's major, with the
Voidbreak offset as a data field rather than 18 `if` branches), absorption
bonus, and the stage at which a carried bonus expires. Detection becomes
"highest tier whose requirement is satisfied", which closes the fall-through
gaps in defect 5.

**One vocabulary.** `Completion / Eminence / Perfect / Half-Step` internally.
The `had-Virya` select values get translated at the input boundary only, with
a compatibility mapping so existing saved data and exported JSON still load.

---

## 5. The plan, in order

The sequence matters: the safety net comes before the fixes, and the fixes come
before the restructuring, so accuracy improvements land early and each later
step is verifiable.

### Phase 0 — safety net

Add `node --test` unit tests (no dependencies, no build step). Write
*characterization* tests first: capture what the code produces today for a grid
of player states, so that every later change shows up as an explicit, reviewed
diff rather than a silent shift. Add a `package.json` with a `test` script only.

### Phase 1 — the three confirmed bugs

Fixable without restructuring, and worth shipping on their own:

- Remove the `cosmoapsisValue` cache read from `calculateAbodeAuraXP` and
  `calculatePearlXP`; always compute from realm + bonus.
- Stop writing `cosmoapsisValue` / `viryaScenario` back onto `playerData`;
  pass them as arguments.
- Delete the duplicated `getHadViryaAbsorptionBonus` / `isHadViryaBonusActive`
  pair in `Calculator.js`.

Expect the displayed numbers to *move* here — that is the point. The
characterization tests from Phase 0 make the movement reviewable.

### Phase 2 — shared primitives

Create `domain/realms.js`, `domain/PathState.js` and `data/viryaRules.js`.
Route every call site through them and delete: the duplicate realm-index
functions, the hardcoded realm-order arrays, the eight bonus tables, the five
secondary-path shims.

### Phase 3 — Virya rules as data

Rewrite tier detection as a threshold search over the rule table. Remove the 18
`'Voidbreak'` branches in favour of the offset field. Fix defect 5. Settle
defect 4 with your answer and encode it once.

### Phase 4 — one progression engine

Merge `RealmProgressionSimulator` and the two near-identical breakthrough
simulations into `engine/Progression.js`. Collapse `ViryaCalculator` and
`ViryaScenarioComparator` into `engine/ViryaPlanner.js`. This is the biggest
single deletion — roughly 400 duplicated lines.

### Phase 5 — UI split

Split `UIManager.js` (1,617 lines) by surface: dashboard, Virya table,
analytics, debug. Move every `document.getElementById` read into
`app/inputs.js`. Move the pill maths out of `Analytics.js` and have it consume
the domain breakdown instead of recomputing it three ways.

### Phase 6 — sweep

Delete dead code and unused imports, unify the tier vocabulary end to end,
update the README's "known issues" to match reality.

Rough size expectation: the `dashboard/` + `Analytics` code is about 3,700
lines today; I'd expect the equivalent domain + engine code to land near half
that, with the difference being duplication and dead branches.

---

## 6. How we'll know it works

- **Tier detection:** a table test over all 27 × 27 main/secondary realm
  combinations, asserting the detected tier. This is small enough to eyeball
  once and then lock in forever, and it is exactly where the current
  exact-match logic silently fails.
- **Daily XP:** assert against values from the reference sheet for a handful of
  known player configurations, including an easy-mode one.
- **Bonus behaviour:** assert that daily XP with bonus 0.4 is strictly greater
  than with bonus 0.0 — the regression test for defect 1, which no current
  test would have caught.
- **Path independence:** assert that computing the secondary path never depends
  on main-path state — the regression test for defect 2.
- **No hidden state:** assert that calling `calculateAll()` twice with the same
  inputs gives the same answer, and that domain functions don't mutate their
  arguments.

---

## 7. Risk and sequencing notes

- Phase 1 changes displayed numbers. If you'd rather your testers see one
  change rather than several, Phases 1–3 can ship together as a single
  "accuracy" release, with 4–6 as invisible cleanup afterwards.
- Saved data compatibility is preserved throughout: `DataManager` stores raw
  DOM field values keyed by element id, and none of this plan changes element
  ids. Exported JSON from the current version will still import.
- Each phase leaves the app fully working. Nothing here requires a big-bang
  rewrite.

---

## 8. Rules, as confirmed by the maintainer

**Eminence does not carry into the next realm at all.** It applies to the realm
it was earned in only. This makes the carry-over ladder regular — each tier
carries one minor stage further than the one below it:

| Tier | Bonus | Carries into next realm through |
|---|---|---|
| Completion | 0 | — |
| Eminence | 0.2 | nothing |
| Perfect | 0.2 | Early |
| Half-Step | 0.4 | Early, Mid |

**Tier requirements are thresholds, not exact stage matches.** A secondary path
at the same major's Mid is Perfect, because it is past the Perfect requirement.
The tier is the highest one whose requirement is satisfied.

| Tier | Secondary path must be at least | Voidbreak |
|---|---|---|
| Eminence | previous major Mid | previous major Late |
| Perfect | current major Early | current major Mid |
| Half-Step | current major Late at 100% | same |

Still open, and cosmetic only: whether the Voidbreak offset is genuinely
specific to Voidbreak or is really "the first major realm that has Virya". It
is encoded as a data field either way, so changing it is a one-line edit.

### One consequence worth knowing about

In easy mode the player types their absorption total straight from the game, so
the Virya bonus is not layered on top of it — it is assumed to already be
included. That is correct for the *current* state, but it means the Virya
projection table in easy mode models futures where absorption never changes,
so the scenario comparison is less meaningful there. Worth either flagging in
the UI or having easy mode capture the base absorption separately. Not changed
here, because it's a product decision rather than a bug.
