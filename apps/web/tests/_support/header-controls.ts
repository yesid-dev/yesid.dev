import { expect, type Page } from '@playwright/test';

export async function openHeaderMenu(page: Page): Promise<void> {
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	const menu = page.getByTestId('nav-menu-toggle');
	if (await menu.getAttribute('aria-expanded') !== 'true') await menu.click();
	await expect(menu).toHaveAttribute('aria-expanded', 'true');
}

/** The theme switch and the language signpost live in the navbar pill at every width. */
export function pillControls(page: Page) {
	const pill = page.getByTestId('nav-pill');
	return { theme: pill.getByTestId('theme-toggle'), language: pill.getByTestId('language-toggle') };
}

export async function headerLanguageLink(page: Page) {
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	const { language } = pillControls(page);
	await expect(language).toBeVisible();
	return language;
}
