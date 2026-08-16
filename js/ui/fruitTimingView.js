// The fruit timing card: what a fruit is worth on each path, and the plans
// compared for every Virya tier.
//
// The table is built here rather than declared in index.html because the number
// of rows varies: plans that land on the same allocation are collapsed by the
// calculator, so a tier may show anything from one plan to five.

import { CalculatorUtils } from '../utilities/utils.js';
import { Dom } from './dom.js';
import { SCENARIO_NO_VIRYA, VIRYA_SCENARIO_ORDER } from '../utilities/gameData.js';

const COLUMN_COUNT = 7;

class FruitTimingView {
    static updateFruitTiming(timing) {
        const body = document.getElementById('fruit-timing-body');
        if (!body) return;

        if (!timing) {
            body.innerHTML = `<tr><td colspan="${COLUMN_COUNT}">Fruit timing could not be calculated for this player state.</td></tr>`;
            Dom.updateElementText('fruit-timing-summary-text', '--');
            return;
        }

        this.renderSummary(timing);

        if (!timing.fruitsAvailable || timing.fruitsAvailable <= 0) {
            body.innerHTML = `<tr><td colspan="${COLUMN_COUNT}">No fruits to allocate. Enter a fruit count on the Player Input tab to compare plans.</td></tr>`;
            return;
        }

        const rows = [];
        for (const tier of VIRYA_SCENARIO_ORDER) {
            if (tier === SCENARIO_NO_VIRYA) continue;

            const analysis = timing.tiers?.[tier];
            if (!analysis) continue;

            rows.push(this.renderTierHeader(tier, analysis, timing));

            if (analysis.error || !analysis.plans?.length) {
                rows.push(`<tr><td colspan="${COLUMN_COUNT}" class="fruit-timing-plan">Not costable from this state.</td></tr>`);
                continue;
            }

            for (const plan of analysis.plans) {
                rows.push(this.renderPlanRow(plan, analysis));
            }
        }

        body.innerHTML = rows.join('');
    }

    /** The bar above the table: what one fruit buys, and whether the 1.5x window is open. */
    static renderSummary(timing) {
        const xp = (n) => CalculatorUtils.formatLargeNumber(n || 0);
        const days = (n) => (Number.isFinite(n) ? n.toFixed(3) : '--');

        Dom.updateElementText('fruit-timing-fruits', String(timing.fruitsAvailable ?? 0));

        // One value, not one per path: a fruit is priced off the main path's
        // realm whichever path eats it.
        Dom.updateElementText(
            'fruit-timing-main-value',
            `${xp(timing.perFruit?.now)} XP  (${days(timing.daysBought?.main)} days of cultivation)`
        );

        const gain = (timing.perFruit?.ungated > 0)
            ? timing.perFruit.gated / timing.perFruit.ungated
            : 0;
        Dom.updateElementText(
            'fruit-timing-secondary-value',
            gain > 0 ? `${xp(timing.perFruit.gated)} XP inside a timegate, ${xp(timing.perFruit.ungated)} XP outside one` : '--'
        );

        const windowBadge = document.getElementById('fruit-timing-window');
        if (windowBadge) {
            windowBadge.textContent = timing.timegateActive
                ? `Timegate running - fruits are at 1.5x for ${CalculatorUtils.formatTimeDays(timing.timegateDays)}`
                : 'Timegate closed - fruits are at 1x until you break through';
            windowBadge.style.background = timing.timegateActive ? '#2E6B4F' : '#8a6d3b';
            windowBadge.style.color = '#fff';
        }

        // There is no "better path" to report: the value is identical either way,
        // so say so rather than inviting the reader to look for a difference.
        Dom.updateElementText(
            'fruit-timing-preferred',
            'The same either way - only what the XP unlocks differs'
        );

        Dom.updateElementText(
            'fruit-timing-summary-text',
            `Plans are scored on main path XP banked over the next ${CalculatorUtils.formatTimeDays(timing.windowDays)} `
            + `(this timegate plus the next realm's).`
        );
    }

    static renderTierHeader(tier, analysis, timing) {
        const needed = analysis.fruitsNeeded?.secondary;
        let requirement;

        if (analysis.alreadyHeld) {
            requirement = 'already held';
        } else if (!Number.isFinite(needed)) {
            requirement = 'cannot be bought with fruits';
        } else if (needed <= 0) {
            requirement = 'no secondary path requirement outstanding';
        } else {
            const affordable = needed <= (timing.fruitsAvailable ?? 0);
            requirement = `${needed} fruits to the secondary path unlocks it`
                + (affordable ? '' : ` (you have ${timing.fruitsAvailable})`);
        }

        // A tier that lands after the comparison window banks nothing in the
        // engine's terms, so every figure on its rows is just the fruit XP.
        const caveat = (!analysis.alreadyHeld && analysis.reachable && !analysis.reachableInWindow)
            ? ' <em>(lands after this window &mdash; the XP shown is only the fruit itself)</em>'
            : '';

        return `<tr class="fruit-timing-tier"><td colspan="${COLUMN_COUNT}">`
            + `<strong>${this.escape(tier)}</strong> &mdash; ${this.escape(requirement)}${caveat}`
            + `</td></tr>`;
    }

    static renderPlanRow(plan, analysis) {
        const isBest = plan.id === analysis.bestPlanId;
        const gain = (plan.bankedXP || 0) - (analysis.baselineBankedXP || 0);

        const timeToTier = Number.isFinite(plan.daysToTier)
            ? (plan.daysToTier <= 0 ? 'Already there' : CalculatorUtils.formatTimeDays(plan.daysToTier))
            : 'Unreachable';

        const beats = !Number.isFinite(plan.daysToTier)
            ? '--'
            : (plan.beatsTimegate ? 'Yes' : 'No');

        const gainText = gain === 0
            ? '--'
            : `${gain > 0 ? '+' : '-'}${CalculatorUtils.formatLargeNumber(Math.abs(gain))}`;

        const label = plan.eatenAt === 'next-window'
            ? `${plan.label} (${CalculatorUtils.formatTimeDays(plan.waitDays)} away, at 1.5x)`
            : plan.label;

        return `<tr class="fruit-timing-plan${isBest ? ' fruit-timing-best' : ''}">`
            + `<td>${isBest ? '<strong>&#9656; </strong>' : ''}${this.escape(label)}</td>`
            + `<td>${plan.toMain || 0}</td>`
            + `<td>${plan.toSecondary || 0}</td>`
            + `<td>${this.escape(timeToTier)}</td>`
            + `<td style="color: ${beats === 'Yes' ? 'var(--success, #2E6B4F)' : 'inherit'}">${beats}</td>`
            + `<td>${CalculatorUtils.formatLargeNumber(plan.bankedXP || 0)}</td>`
            + `<td style="color: ${gain > 0 ? 'var(--success, #2E6B4F)' : 'inherit'}">${this.escape(gainText)}</td>`
            + `</tr>`;
    }

    /** Everything rendered here is derived from numbers, but the table is built
     *  by string concatenation, so tier and plan labels are escaped anyway. */
    static escape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

export { FruitTimingView };
