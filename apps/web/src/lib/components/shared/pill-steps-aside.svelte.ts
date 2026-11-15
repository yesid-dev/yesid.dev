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
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry) return;
				// In the area above the pill's line, or already scrolled past the top of the viewport.
				aside = entry.isIntersecting || entry.boundingClientRect.top < 0;
			},
			{ rootMargin: `0px 0px -${PILL_CLEARANCE_PX}px 0px` },
		);
		observer.observe(band);
		return () => observer.disconnect();
	});

	return {
		get aside() {
			return aside;
		},
	};
}
