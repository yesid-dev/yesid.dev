/*
 * The phone contents pill steps aside at the page's closing band (D-M2), so it never covers the
 * band's buttons or a focused link (WCAG 2.4.11). DetailFrame shows its TocPill only while both pill
 * labels are supplied, so the page drops them while `aside` is true: the kit's own option, with no
 * restyling of the pill.
 */

/** The pill's band from the viewport's bottom: its 20px offset, its 44px height and 8px of air. */
export const PILL_CLEARANCE_PX = 72;

export interface PillStepsAside {
	/** True once the closing band's top has reached the pill's line, and while it stays above it. */
	readonly aside: boolean;
}

/** Call during component setup. `selector` names the closing band, the first element the pill leaves. */
export function pillStepsAside(selector: string): PillStepsAside {
	let aside = $state(false);

	$effect(() => {
		const band = document.querySelector(selector);
		if (!band) return;
		const update = () => {
			const box = band.getBoundingClientRect();
			// A hidden or not-yet-laid-out marker has no visible closing band to clear.
			aside = (box.width > 0 || box.height > 0) && box.top < window.innerHeight - PILL_CLEARANCE_PX;
		};
		const observer = new IntersectionObserver(
			update,
			{ rootMargin: `0px 0px -${PILL_CLEARANCE_PX}px 0px` },
		);
		observer.observe(band);
		// Instant keyboard or restored-position jumps can skip the observer's intersection range.
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		update();
		return () => {
			observer.disconnect();
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});

	return {
		get aside() {
			return aside;
		},
	};
}
