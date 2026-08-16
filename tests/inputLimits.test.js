// The declared min/max on the number inputs must actually be enforced.
//
// They were not: HTML max only drives the spinner arrows and form validity, so
// a curio pill bonus capped at 7.8 happily accepted 780, fed it into the
// calculation, and exported it to the save file.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { clampToLimits, limitsOf } from '../js/ui/inputLimits.js';
import { CalculatorUtils } from '../js/utilities/utils.js';

describe('clampToLimits', () => {
    const limits = { min: 0, max: 7.8 };

    test('a value above the maximum is brought down to it', () => {
        assert.deepEqual(clampToLimits(780, limits), { value: 7.8, wasOutOfRange: true, limit: 7.8 });
    });

    test('a value below the minimum is brought up to it', () => {
        assert.deepEqual(clampToLimits(-5, limits), { value: 0, wasOutOfRange: true, limit: 0 });
    });

    test('a value inside the range is left alone', () => {
        assert.deepEqual(clampToLimits(3.2, limits), { value: 3.2, wasOutOfRange: false, limit: null });
    });

    test('the boundaries themselves are accepted', () => {
        for (const v of [0, 7.8]) {
            assert.equal(clampToLimits(v, limits).wasOutOfRange, false, `${v} should be in range`);
        }
    });

    test('a field with no declared limits is never clamped', () => {
        assert.deepEqual(clampToLimits(99999, null), { value: 99999, wasOutOfRange: false, limit: null });
    });

    test('a one-sided limit only constrains that side', () => {
        assert.equal(clampToLimits(-3, { min: 0, max: null }).value, 0);
        assert.equal(clampToLimits(1e9, { min: 0, max: null }).value, 1e9);
    });
});

describe('limitsOf', () => {
    test('reads the bounds declared on the element', () => {
        assert.deepEqual(limitsOf({ type: 'number', min: '0', max: '7.8' }), { min: 0, max: 7.8 });
    });

    test('returns null when nothing is declared', () => {
        assert.equal(limitsOf({ type: 'number', min: '', max: '' }), null);
    });

    test('ignores anything that is not a number input', () => {
        assert.equal(limitsOf({ type: 'text', min: '0', max: '10' }), null);
    });
});

describe('reading a value for calculation', () => {
    // The backstop: even if a bad value reaches the DOM, it must not reach the maths.
    test('an over-max field reads back as its maximum', () => {
        const element = { type: 'number', min: '0', max: '7.8', value: '780' };
        assert.equal(CalculatorUtils.clampToElementLimits(element, 780), 7.8);
    });

    test('an unbounded field reads back unchanged', () => {
        const element = { type: 'number', min: '', max: '', value: '9000' };
        assert.equal(CalculatorUtils.clampToElementLimits(element, 9000), 9000);
    });

    test('a select is left alone', () => {
        assert.equal(CalculatorUtils.clampToElementLimits({ type: 'select-one' }, 42), 42);
    });
});
