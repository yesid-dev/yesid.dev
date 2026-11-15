import { test, expect } from '@playwright/test';
import { mockWeb3Forms, visibleContactTerminal } from './_support/helpers';

import { contactContent } from '../src/lib/content/contact-page';

test.describe('Contact form validation', () => {
	test.skip(({ viewport }) => viewport!.width < 1024, 'Viewport-independent.');
test('route /fr/contact form validation errors in French', async ({ page }) => {
    await page.goto('/fr/contact');

    // Wait on the deterministic landmark the networkidle was implicitly guarding:
    // the visible contact form terminal must be present before we interact with it.
    const terminal = visibleContactTerminal(page);
    await expect(terminal).toBeVisible();

    // Get visible form (scoped to the visible terminal) and submit empty
    const form = terminal.locator('form').filter({ visible: true }).first();
    const submitBtn = form.getByTestId('contact-submit');

    await submitBtn.click();

    // Verify error messages appear and are rendered in French.
    // Empty-submit yields "✗ requis, <field> ne peut pas être vide" (contact-page.ts validation.required.fr).
    const errorMsg = page.locator('text=/✗/').first();
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(contactContent.validation.required.fr!.replace('{field}', contactContent.formTerminal.fields.name.label.fr!));
  });

	test.beforeEach(async ({ page }) => {
		await page.goto('/contact');
		// Deterministic readiness signal: the visible form terminal is mounted.
		await expect(visibleContactTerminal(page)).toBeVisible();
	});

	test('contact form shows validation errors on empty submit', async ({ page }) => {
		const form = visibleContactTerminal(page);
		const submitBtn = form.getByTestId('contact-submit');

		await submitBtn.click();

		// Each required field renders its own error, scoped to the visible form.
		await expect(form.getByText('✗ ' + contactContent.validation.required.en.replace('{field}', contactContent.formTerminal.fields.name.label.en))).toBeVisible();
		await expect(form.getByText('✗ ' + contactContent.validation.required.en.replace('{field}', contactContent.formTerminal.fields.email.label.en))).toBeVisible();
		await expect(form.getByText('✗ ' + contactContent.validation.required.en.replace('{field}', contactContent.formTerminal.fields.message.label.en))).toBeVisible();

		// Three field-level required errors (name, email, message).
		const requiredErrs = form.locator('[aria-invalid="true"]');
		expect(await requiredErrs.count()).toBe(Object.keys(contactContent.formTerminal.fields).length);

		// Error summary reflects the count.
		await expect(form.getByTestId('contact-error-summary')).toContainText(contactContent.validation.errorSummary.en.replace('{count}', String(Object.keys(contactContent.formTerminal.fields).length)));
	});

	test('malformed addresses focus the accessible error summary before submission', async ({ page }) => {
		const { submittedEmails } = await mockWeb3Forms(page);
		const form = visibleContactTerminal(page);
		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i')).fill('Test User');
		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.message.label).join('|')}):$`, 'i')).fill('Test message');
		const email = form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.email.label).join('|')}):$`, 'i'));
		await email.fill('not-an-email');
		await form.getByTestId('contact-submit').click();
		expect(await email.evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true);
		await expect(form.getByTestId('contact-error-summary')).toBeFocused();
		await expect(email).toHaveAttribute('aria-invalid', 'true');
		expect(submittedEmails).toEqual([]);
	});

	test('contact form does not submit when email is invalid', async ({ page }) => {
		// Intercept the Web3Forms endpoint BEFORE the action so we can prove it is
		// never called when client-side validation rejects the email.
		const { submittedEmails } = await mockWeb3Forms(page, { success: true });

		const form = visibleContactTerminal(page);
		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i')).fill('John Doe');
		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.email.label).join('|')}):$`, 'i')).fill('john@nodomain');
		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.message.label).join('|')}):$`, 'i')).fill('Test message');

		await form.getByTestId('contact-submit').click();

		// The invalid-email error must show (handler ran, validation rejected).
		// Polling its visibility is the deterministic signal that the onsubmit
		// handler finished and rejected the email — any erroneous fetch would
		// have already fired synchronously before the error renders.
		await expect
			.poll(() => form.getByText('✗ ' + contactContent.validation.invalidEmail.en).isVisible(), {
				timeout: 2000,
			})
			.toBe(true);
		expect(submittedEmails).toEqual([]);
	});

	test('contact form shows required field error for empty name', async ({ page }) => {
		const form = visibleContactTerminal(page);

		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.email.label).join('|')}):$`, 'i')).fill('test@example.com');
		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.message.label).join('|')}):$`, 'i')).fill('Test message');

		await form.getByTestId('contact-submit').click();

		await expect(form.getByText('✗ ' + contactContent.validation.required.en.replace('{field}', contactContent.formTerminal.fields.name.label.en))).toBeVisible();
	});

	test('contact form shows required field error for empty email', async ({ page }) => {
		const form = visibleContactTerminal(page);

		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i')).fill('John Doe');
		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.message.label).join('|')}):$`, 'i')).fill('Test message');

		await form.getByTestId('contact-submit').click();

		await expect(form.getByText('✗ ' + contactContent.validation.required.en.replace('{field}', contactContent.formTerminal.fields.email.label.en))).toBeVisible();
	});

	test('contact form shows required field error for empty message', async ({ page }) => {
		const form = visibleContactTerminal(page);

		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i')).fill('John Doe');
		await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.email.label).join('|')}):$`, 'i')).fill('test@example.com');

		await form.getByTestId('contact-submit').click();

		await expect(form.getByText('✗ ' + contactContent.validation.required.en.replace('{field}', contactContent.formTerminal.fields.message.label.en))).toBeVisible();
	});

	test('contact form accepts valid email formats', async ({ page }) => {
		// Stub Web3Forms so a passing submission is deterministic. The intent: valid
		// emails must NOT be blocked by client validation — the handler should reach
		// the fetch and the success sequence should render (no ✗ errors at all).
		const { submittedEmails } = await mockWeb3Forms(page, { success: true });

		const validEmails = ['user@example.com', 'john.doe@company.co.uk', 'test+tag@domain.org'];

		for (const email of validEmails) {
			await page.goto('/contact');
			// Deterministic readiness signal instead of networkidle.
			await expect(visibleContactTerminal(page)).toBeVisible();

			const form = visibleContactTerminal(page);
			await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i')).fill('Test User');
			await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.email.label).join('|')}):$`, 'i')).fill(email);
			await form.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.message.label).join('|')}):$`, 'i')).fill('Test message');

			await form.getByTestId('contact-submit').click();

			// On success the <form> is swapped for the success terminal, so scope to
			// the visible form terminal (which persists). Valid input ⇒ success
			// animation renders, proving validation never blocked the submission.
			const terminal = visibleContactTerminal(page);
			await expect(terminal.getByTestId('contact-success')).toBeVisible();
			// No validation error survived (the form is gone entirely).
			await expect(page.getByText('✗ ' + contactContent.validation.invalidEmail.en)).toHaveCount(0);
			// A sent form stays sent for the tab until the reader resets it.
			await terminal.getByTestId('contact-reset').click();
			await expect(terminal.getByTestId('contact-success')).toHaveCount(0);
		}

		// Every valid email reached the Web3Forms call (validation never blocked it).
		expect(submittedEmails).toEqual(validEmails);
	});
});

test.describe('Contact form submission', () => {
	test.skip(({ viewport }) => viewport!.width < 1024, 'Viewport-independent.');
	test.beforeEach(async ({ page }) => {
		await page.goto('/contact');
		// Deterministic replacement for the old networkidle wait: the contact
		// info-terminal fires a one-shot fetch('/api/weather') + a DOM clock
		// interval, so "network idle" is racy/slow. Wait on the visible form
		// terminal landmark instead — every test scopes its interactions to it.
		await expect(visibleContactTerminal(page)).toBeVisible();
	});

	test('contact form shows success state after valid submit', async ({ page }) => {
		await mockWeb3Forms(page, { success: true });

		const terminal = visibleContactTerminal(page);
		await terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i')).fill('John Doe');
		await terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.email.label).join('|')}):$`, 'i')).fill('john@example.com');
		await terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.message.label).join('|')}):$`, 'i')).fill('I would like to discuss a project.');

		await terminal.getByTestId('contact-submit').click();

		// The form is replaced by the result at once (no replayed process), and the focus moves to it.
		const success = terminal.getByTestId('contact-success');
		await expect(success).toBeVisible({ timeout: 5000 });
		await expect(success.getByText(contactContent.success.sent.en, { exact: false })).toBeVisible();
		await expect(success.getByTestId('contact-sent-message')).toBeFocused();
		await expect(success).not.toContainText('~ $ send --message');

		// The input form is gone.
		await expect(terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i'))).toHaveCount(0);
	});

	test('contact form keeps the form (no success) when the API reports failure', async ({ page }) => {
		await mockWeb3Forms(page, { success: false });

		const terminal = visibleContactTerminal(page);
		await terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i')).fill('John Doe');
		await terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.email.label).join('|')}):$`, 'i')).fill('john@example.com');
		await terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.message.label).join('|')}):$`, 'i')).fill('Test message');

		await terminal.getByTestId('contact-submit').click();

		// No success state — the form stays mounted.
		await expect(terminal.getByTestId('contact-success')).toHaveCount(0);
		await expect(terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i'))).toBeVisible();

		// The form-level send error is shown (contactContent.sendErrorMessage),
		// rendered with the ✗ marker.
		const formError = terminal.getByText(contactContent.sendErrorMessage.en, { exact: false });
		await expect(formError).toBeVisible();
		await expect(formError).toContainText('✗');
	});

	test('contact form reset button clears the form and returns to input state', async ({ page }) => {
		await mockWeb3Forms(page, { success: true });

		const terminal = visibleContactTerminal(page);
		const nameInput = terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.name.label).join('|')}):$`, 'i'));
		const emailInput = terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.email.label).join('|')}):$`, 'i'));
		const messageInput = terminal.getByLabel(new RegExp(`^(?:${Object.values(contactContent.formTerminal.fields.message.label).join('|')}):$`, 'i'));

		await nameInput.fill('John Doe');
		await emailInput.fill('john@example.com');
		await messageInput.fill('Test message');
		await terminal.getByTestId('contact-submit').click();

		const success = terminal.getByTestId('contact-success');
		await expect(success).toBeVisible({ timeout: 5000 });

		// Reset control inside the success block (contactContent.success.resetLabel).
		await success.getByRole('button', { name: contactContent.success.resetLabel.en }).click();

		// Back to the input state, fields cleared.
		await expect(nameInput).toBeVisible();
		await expect(emailInput).toBeVisible();
		await expect(messageInput).toBeVisible();
		await expect(terminal.getByTestId('contact-success')).toHaveCount(0);

		expect(await nameInput.inputValue()).toBe('');
		expect(await emailInput.inputValue()).toBe('');
		expect(await messageInput.inputValue()).toBe('');
	});
});

for (const locale of ['', '/fr', '/es'])
	test(`contact content grows with the document: ${locale || 'en'}`, { tag: '@theme' }, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 600 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto(`${locale}/contact`);
		const terminal = visibleContactTerminal(page);
		await expect(terminal.getByTestId('contact-submit')).toBeEnabled();
		const railTitle = page.locator('[data-slot="rail-title-text"]');
		await expect.poll(() => railTitle.evaluate(el => getComputedStyle(el).writingMode)).toBe('vertical-rl');
		const title = (await railTitle.boundingBox())!;
		expect(title.y).toBeGreaterThanOrEqual(0);
		expect(title.y + title.height, 'the rail title remains readable in a short viewport').toBeLessThanOrEqual(600);
		await page
			.getByTestId('contact-info-terminal')
			.filter({ visible: true })
			.locator('.terminal-body')
			.evaluate((body) => {
				const paragraph = document.createElement('p');
				paragraph.textContent =
					'Long translated information, with optional details and scheduling constraints. '.repeat(
						35,
					);
				body.append(paragraph);
			});
		for (const id of ['contact-info-terminal', 'contact-form-terminal']) {
			const body = page.getByTestId(id).filter({ visible: true }).locator('.terminal-body');
			expect(
				await body.evaluate((el) => el.scrollHeight - el.clientHeight),
				`${id} must not compress its content`,
			).toBeLessThanOrEqual(1);
		}
		for (const id of ['contact-submit', 'contact-booking-link']) {
			const control = terminal.getByTestId(id);
			await control.focus();
			await expect(control).toBeInViewport();
			const bounds = await control.boundingBox();
			expect(bounds!.y).toBeGreaterThanOrEqual(88);
			expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(600);
		}
		expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
		).toBeLessThanOrEqual(1);
	});

// The resize handle is gone (owner, DEV-40): the panels keep today's fixed split, a third and two
// thirds, and a window resize keeps the draft, the errors and an intrinsic success panel.
test(`desktop window resizing preserves drafts, errors and intrinsic success`, { tag: '@theme' }, async ({
	page,
}) => {
	await page.setViewportSize({ width: 1366, height: 600 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await mockWeb3Forms(page);
	await page.goto('/fr/contact');
	const terminal = visibleContactTerminal(page);
	const message = terminal.getByRole('textbox', { name: contactContent.formTerminal.fields.message.label.fr! + ':' });
	await expect(terminal.getByTestId('contact-submit')).toBeEnabled();
	await message.fill('Un message conservé pendant le redimensionnement. '.repeat(12));
	await terminal.getByTestId('contact-submit').click();
	await expect(terminal.locator('[aria-invalid="true"]')).toHaveCount(Object.keys(contactContent.formTerminal.fields).length - 1);
	await expect(page.locator('[data-slot="resizable-handle"], [data-pane-resizer], .contact-resize-handle')).toHaveCount(0);
	const info = page.getByTestId('contact-info-terminal').filter({ visible: true });
	const split = async () => (await info.boundingBox())!.width / ((await info.boundingBox())!.width + (await terminal.boundingBox())!.width);
	expect(await split()).toBeCloseTo(0.33, 1);
	await page.setViewportSize({ width: 1100, height: 600 });
	expect(await split()).toBeCloseTo(0.33, 1);
	await expect(message).toHaveValue(
		'Un message conservé pendant le redimensionnement. '.repeat(12),
	);
	await expect(terminal.locator('[aria-invalid="true"]')).toHaveCount(Object.keys(contactContent.formTerminal.fields).length - 1);
	await terminal.getByLabel(contactContent.formTerminal.fields.name.label.fr! + ':').fill('Fixture Reader');
	await terminal.getByLabel(contactContent.formTerminal.fields.email.label.fr! + ':').fill('fixture@example.test');
	await terminal.getByTestId('contact-submit').click();
	await expect(terminal.getByTestId('contact-success')).toBeVisible();
	expect(
		await terminal.locator('.terminal-body').evaluate((el) => el.scrollHeight - el.clientHeight),
	).toBeLessThanOrEqual(1);
});
