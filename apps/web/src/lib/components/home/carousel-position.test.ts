import { describe, expect, it } from 'vitest';
import { cardsPerView, lastStart, stepStart } from './carousel-position.ts';

describe('home carousel geometry', () => {
	it('shows one card a view under 1024px and at most two from there', () => {
		expect(cardsPerView(3, false)).toBe(1);
		expect(cardsPerView(3, true)).toBe(2);
		expect(cardsPerView(1, true)).toBe(1);
		expect(cardsPerView(0, true)).toBe(1);
	});

	it('keeps the last start index on the last whole view', () => {
		expect(lastStart(3, 1)).toBe(2);
		expect(lastStart(3, 2)).toBe(1);
		expect(lastStart(2, 2)).toBe(0);
		expect(lastStart(1, 1)).toBe(0);
		expect(lastStart(0, 1)).toBe(0);
	});

	it('wraps forward from the last view to the first', () => {
		expect(stepStart(2, 1, 3, 1, true)).toBe(0);
		expect(stepStart(1, 1, 3, 2, true)).toBe(0);
		expect(stepStart(3, 1, 4, 2, true)).toBe(0);
	});

	it('wraps backward from the first view to the last', () => {
		expect(stepStart(0, -1, 3, 1, true)).toBe(2);
		expect(stepStart(0, -1, 3, 2, true)).toBe(1);
		expect(stepStart(0, -1, 4, 2, true)).toBe(2);
	});

	it('steps one start index at a time inside the range', () => {
		expect(stepStart(0, 1, 3, 2, true)).toBe(1);
		expect(stepStart(1, -1, 3, 2, true)).toBe(0);
		expect(stepStart(1, 1, 4, 2, true)).toBe(2);
	});

	it('never moves a fitted view, so the static all-cards view stays put', () => {
		expect(stepStart(0, 1, 2, 2, false)).toBe(0);
		expect(stepStart(0, -1, 1, 1, false)).toBe(0);
		expect(stepStart(0, 1, 1, 1, true)).toBe(0);
		expect(stepStart(0, 1, 0, 1, false)).toBe(0);
	});
});
