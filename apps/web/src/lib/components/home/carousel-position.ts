/** Cards a view: one under 1024px, at most two from there. */
export function cardsPerView(total: number, wide: boolean): number {
	return Math.min(wide ? 2 : 1, Math.max(1, total));
}
