import type { Page } from '@playwright/test';

/** Resolves a colour in the root theme, independent of component-local token overrides. */
export const tokenColor = (page: Page, value: string) => page.evaluate(value => {
	const probe = document.createElement('span');
	probe.style.color = value;
	document.body.append(probe);
	const color = getComputedStyle(probe).color;
	probe.remove();
	return color;
}, value);
