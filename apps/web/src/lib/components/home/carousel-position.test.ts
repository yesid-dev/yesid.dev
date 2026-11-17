import { describe, expect, it } from 'vitest';
import { cardsPerView } from './carousel-position.ts';

describe('home carousel geometry', () => {
	it('shows one card a view under 1024px and at most two from there', () => {
		expect(cardsPerView(3, false)).toBe(1);
		expect(cardsPerView(3, true)).toBe(2);
		expect(cardsPerView(1, true)).toBe(1);
		expect(cardsPerView(0, true)).toBe(1);
	});

});
