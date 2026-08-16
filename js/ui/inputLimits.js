// Enforcement of the min/max already declared on the number inputs.
//
// The markup carries the real limits — max="7.8" on the curio pill bonus, and
// so on — but a browser does not stop you typing past them. The max attribute
// only drives the spinner arrows and form-level validity, and this page never
// submits a form. A value of 780 in a field capped at 7.8 therefore sailed
// straight into the calculation, and out again into the exported save.
//
// So the limits are applied here instead, at three points:
//   - when a field is edited
//   - when saved or imported data is restored into the fields
//   - when a value is read for calculation, as a last line of defence
//
// Fields whose ceiling is genuinely unknown carry no max attribute and are
// left alone; nothing here invents a limit.

import { Dom } from './dom.js';

const FLAG_CLASS = 'input-out-of-range';

/** The declared bounds of an element, or null where none is declared. */
export function limitsOf(element) {
    if (!element || element.type !== 'number') return null;

    const min = element.min === '' ? null : Number(element.min);
    const max = element.max === '' ? null : Number(element.max);

    if (min === null && max === null) return null;
    return {
        min: Number.isFinite(min) ? min : null,
        max: Number.isFinite(max) ? max : null
    };
}

/**
 * Bring a number into its declared range.
 * @returns {{value: number, wasOutOfRange: boolean, limit: number|null}}
 */
export function clampToLimits(value, limits) {
    if (!limits || !Number.isFinite(value)) {
        return { value, wasOutOfRange: false, limit: null };
    }
    if (limits.max !== null && value > limits.max) {
        return { value: limits.max, wasOutOfRange: true, limit: limits.max };
    }
    if (limits.min !== null && value < limits.min) {
        return { value: limits.min, wasOutOfRange: true, limit: limits.min };
    }
    return { value, wasOutOfRange: false, limit: null };
}

/** Label text for a field, for use in messages. */
function labelFor(element) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    const text = label ? label.textContent.replace(/\s+/g, ' ').trim() : '';
    return text || element.id;
}

/**
 * Check one field and correct it if it is outside its declared range.
 * @returns {{corrected: boolean, label: string, from: number, to: number}|null}
 */
export function enforceField(element, { notify = true } = {}) {
    const limits = limitsOf(element);
    if (!limits) return null;

    const raw = parseFloat(element.value);
    if (!Number.isFinite(raw)) return null;

    const { value, wasOutOfRange } = clampToLimits(raw, limits);
    if (!wasOutOfRange) {
        element.classList.remove(FLAG_CLASS);
        return null;
    }

    element.value = String(value);
    element.classList.add(FLAG_CLASS);
    setTimeout(() => element.classList.remove(FLAG_CLASS), 4000);

    const result = { corrected: true, label: labelFor(element), from: raw, to: value };
    if (notify) {
        Dom.showNotification(`${result.label} is capped at ${value}. Changed ${raw} to ${value}.`, true);
    }
    return result;
}

/**
 * Check every number field. Used after saved or imported data is restored,
 * which is how an out-of-range value gets in without anyone typing it.
 * @returns {Array} one entry per corrected field
 */
export function enforceAll({ notify = true } = {}) {
    const corrections = [];
    document.querySelectorAll('input[type="number"]').forEach((element) => {
        const result = enforceField(element, { notify: false });
        if (result) corrections.push(result);
    });

    if (notify && corrections.length > 0) {
        const names = corrections.map((c) => c.label).join(', ');
        Dom.showNotification(
            corrections.length === 1
                ? `${names} was above its maximum and has been capped.`
                : `${corrections.length} fields were outside their limits and have been capped: ${names}`,
            true
        );
    }
    return corrections;
}

/** Wire every number field to correct itself once the edit is committed. */
export function watchAll() {
    document.querySelectorAll('input[type="number"]').forEach((element) => {
        if (!limitsOf(element)) return;
        element.addEventListener('change', () => enforceField(element));
    });
}

export const InputLimits = { limitsOf, clampToLimits, enforceField, enforceAll, watchAll };
