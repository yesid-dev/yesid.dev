/**
 * The home reel's logical position (DEV-43). The carousel keeps the browser's own scroll with
 * snap points and real DOM nodes only: it never renders a copy of a card, so the visible links,
 * ids and headings stay unique. The loop is a wrap of the start card: a step past either end
 * lands on the other one, both directions.
 */

/** Cards a view: one under 1024px, at most two from there (owner, 15 November 2026). */
export function cardsPerView(total: number, wide: boolean): number {
	return Math.min(wide ? 2 : 1, Math.max(1, total));
}

/** The last start index that still fills the view. */
export function lastStart(total: number, perView: number): number {
	return Math.max(0, total - Math.max(1, perView));
}

/**
 * One step from `start`, wrapping past either end. A fitted view (nothing overflowing) never
 * moves: the owner's rule keeps the all-cards view static with its controls hidden.
 */
export function stepStart(
	start: number,
	direction: -1 | 1,
	total: number,
	perView: number,
	overflowing: boolean,
): number {
	const last = lastStart(total, perView);
	if (!overflowing || last === 0) return 0;
	const target = start + direction;
	if (target > last) return 0;
	if (target < 0) return last;
	return target;
}
