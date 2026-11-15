import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';

const analyticsMocks = vi.hoisted(() => ({
	trackAnalyticsEvent: vi.fn(),
}));

vi.mock('#lib/analytics/client.ts', () => analyticsMocks);

import ContactPage from './ContactPage.svelte';
import type { ContactContent } from '#lib/types.ts';
import { persisted } from '@yesid/ui/state';

const contactContent: ContactContent = {
	pageTitle: { en: 'Contact fixture' },
	stationLabel: { en: 'Fixture station' },
	sendErrorMessage: { en: 'Fixture delivery failed' },
	web3formsKey: 'fixture-key',
	infoTerminal: {
		title: 'Fixture info', command: '$ info',
		location: { en: 'A city' }, responseTime: { en: 'Soon' }, languages: { en: 'EN FR ES' },
		bestFit: [{ en: 'A supplied need' }],
		sectionLabels: {
			location: { en: 'Place' }, connect: { en: 'Channels' },
			languages: { en: 'Languages' }, bestFit: { en: 'Needs' },
		},
	},
	formTerminal: {
		requiredGuidance: { en: 'guidance' },
		noScript: { en: 'no script' },
		title: 'Fixture form', command: '$ contact', commandOutput: { en: 'Ready' },
		fields: {
			name: { label: { en: 'name' }, placeholder: { en: 'Your name' } },
			email: { label: { en: 'email' }, placeholder: { en: 'Your email' } },
			message: { label: { en: 'message' }, placeholder: { en: 'Your note' } },
		},
		submitLabel: { en: 'Send' }, bookingPrompt: { en: 'Talk instead?' }, bookingButtonLabel: { en: 'Book' },
	},
	validation: {
		required: { en: '{field} is required' }, invalidEmail: { en: 'Invalid email format' }, errorSummary: { en: '{count} errors' },
	},
	success: {
		command: { en: '~ $ send' }, validating: { en: 'Checking' }, sending: { en: 'Sending' }, sent: { en: 'Delivered' },
		responseTime: { en: 'Soon' }, meanwhile: { en: 'Visit {work} and {blog}.' },
		resetLabel: { en: 'Send another' }, fieldOk: { en: 'OK' }, workLinkLabel: { en: 'work' }, blogLinkLabel: { en: 'blog' },
	},
	socials: [
		{ label: { en: 'Calendar' }, href: 'https://cal.com/fixture', icon: 'calendar' },
		{ label: { en: 'Email' }, href: 'mailto:fixture@example.com', icon: 'email' },
		{ label: { en: 'GitHub' }, href: 'https://github.com/fixture', icon: 'github' },
		{ label: { en: 'LinkedIn' }, href: 'https://linkedin.com/in/fixture', icon: 'linkedin' },
	],
};

let originalFetch: typeof fetch;
beforeEach(() => {
	originalFetch = globalThis.fetch;
	analyticsMocks.trackAnalyticsEvent.mockClear();
});
afterEach(() => { globalThis.fetch = originalFetch; vi.useRealTimers(); });

async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
	el.value = value;
	await fireEvent.input(el);
	await tick();
	await tick();
}

async function fillForm(name = 'Test User', email = 'test@example.com', message = 'Hello there') {
	for (const [label, value] of [[/^name/i, name], [/^email/i, email], [/^message/i, message]] as const) {
		await typeInto(screen.getAllByLabelText(label)[0] as HTMLInputElement | HTMLTextAreaElement, value);
	}
}

async function submitForm(submitBtn: HTMLElement) {
	const form = submitBtn.closest('form') as HTMLFormElement;
	await fireEvent.submit(form);
	await tick();
}

async function clickWithoutNavigating(link: HTMLElement) {
	const preventNavigation = (event: Event) => event.preventDefault();
	link.addEventListener('click', preventNavigation);
	try {
		await fireEvent.click(link);
	} finally {
		link.removeEventListener('click', preventNavigation);
	}
}

describe('ContactPage', () => {
	it('focuses the error summary after empty submission', async () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		await submitForm(screen.getAllByTestId('contact-submit')[0]);
		await waitFor(() => expect(document.activeElement).toBe(screen.getAllByTestId('contact-error-summary')[0]));
	});

	it('renders with data-testid page-contact', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		expect(screen.getByTestId('page-contact')).toBeTruthy();
	});

	// Owner answer 3A: the "NEXT STOP: YOU" eyebrow is gone.
	it('does not render the station eyebrow', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		expect(screen.queryByText('Fixture station')).toBeNull();
	});

	it('renders info terminal', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		// Both desktop and mobile render the snippet, so 2 instances
		const terminals = screen.getAllByTestId('contact-info-terminal');
		expect(terminals.length).toBeGreaterThanOrEqual(1);
	});

	it('renders form terminal', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const terminals = screen.getAllByTestId('contact-form-terminal');
		expect(terminals.length).toBeGreaterThanOrEqual(1);
	});

	it('associates both layouts with their own labeled fields and validation errors', async () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const fields = screen.getAllByRole('textbox') as (HTMLInputElement | HTMLTextAreaElement)[];
		for (const form of screen.getAllByTestId('contact-form-terminal')) {
			expect(within(form).getAllByRole('textbox')).toHaveLength(Object.keys(contactContent.formTerminal.fields).length);
			for (const { label } of Object.values(contactContent.formTerminal.fields))
				expect(within(form).getByLabelText(`${label.en}:`)).toBeInTheDocument();
		}
		expect(new Set(fields.map((field) => field.id)).size).toBe(fields.length);
		for (const field of fields) {
			expect(field).toHaveAccessibleName(`${contactContent.formTerminal.fields[field.name as keyof typeof contactContent.formTerminal.fields].label.en}:`);
			expect(field.tagName).toBe(field.name === 'message' ? 'TEXTAREA' : 'INPUT');
			expect(field).toHaveAttribute('data-handoff-focus', `contact-${field.name}`);
		}
		await submitForm(screen.getAllByTestId('contact-submit')[0]);
		for (const field of fields) {
			expect(field).toHaveAttribute('aria-invalid', 'true');
			// Labelled-field recipe: the required line (and the message hint) stay in the description beside the error.
			const hint = field.name === 'message' ? ` ${contactContent.formTerminal.fields.message.placeholder.en}` : '';
			expect(field).toHaveAccessibleDescription(`${contactContent.formTerminal.requiredGuidance.en}${hint} ✗ ${contactContent.validation.required.en.replace('{field}', contactContent.formTerminal.fields[field.name as keyof typeof contactContent.formTerminal.fields].label.en)}`);
		}
		expect(analyticsMocks.trackAnalyticsEvent).not.toHaveBeenCalled();
	});

	it('uses CMS-localized form field labels in labels and validation errors', async () => {
		const labeledContact = {
			...contactContent,
			formTerminal: {
				...contactContent.formTerminal,
				fields: {
					name: { ...contactContent.formTerminal.fields.name, label: { en: 'full name' } },
					email: { ...contactContent.formTerminal.fields.email, label: { en: 'email address' } },
					message: { ...contactContent.formTerminal.fields.message, label: { en: 'project note' } },
				},
			},
			validation: {
				...contactContent.validation,
				required: { en: 'Missing {field}' },
			},
		} satisfies ContactContent;

		render(ContactPage, { props: { contactPage: labeledContact } });
		expect(screen.getAllByLabelText(/^full name/i).length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByLabelText(/^email address/i).length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByLabelText(/^project note/i).length).toBeGreaterThanOrEqual(1);

		const submitBtns = screen.getAllByRole('button', { name: /send/i });
		await submitForm(submitBtns[0]);

		expect(screen.getAllByText(/Missing full name/i).length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText(/Missing email address/i).length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText(/Missing project note/i).length).toBeGreaterThanOrEqual(1);
	});

	it('renders submit button', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const buttons = screen.getAllByRole('button', { name: /send/i });
		expect(buttons.length).toBeGreaterThanOrEqual(1);
	});

	it('renders social links', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		expect(screen.getAllByTestId('contact-social-email').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByTestId('contact-social-github').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByTestId('contact-social-linkedin').length).toBeGreaterThanOrEqual(1);
	});

	for (const [locale, label, item] of [
		['en', 'Fixture needs', 'A changed brief'],
		['fr', 'Besoins témoins', 'Un autre mandat'],
		['es', 'Necesidades', 'Un encargo distinto'],
	])
		it(`renders supplied best-fit labels and items in ${locale}`, () => {
			const supplied = {
				...contactContent,
				infoTerminal: {
					...contactContent.infoTerminal,
					sectionLabels: {
						...contactContent.infoTerminal.sectionLabels,
						bestFit: {
							en: 'Fixture needs',
							fr: 'Besoins témoins',
							es: 'Necesidades',
						},
					},
					bestFit: [
						{
							en: 'A changed brief',
							fr: 'Un autre mandat',
							es: 'Un encargo distinto',
						},
					],
				},
			};
			render(ContactPage, {
				props: { contactPage: supplied },
				context: new Map([[Symbol.for('@yesid/ui/locale'), () => locale]]),
			});
			for (const section of screen.getAllByTestId('contact-best-fit')) {
				expect(section).toHaveTextContent(label);
				expect(section).toHaveTextContent(item);
			}
		});
	it('hides the BEST FIT section when the CMS carries no lines', () => {
		const { bestFit: _bestFit, ...restInfo } = contactContent.infoTerminal;
		const stripped = {
			...contactContent,
			infoTerminal: restInfo,
		} satisfies ContactContent;
		render(ContactPage, { props: { contactPage: stripped } });
		expect(screen.queryByTestId('contact-best-fit')).toBeNull();
	});

	it('renders an extra CMS channel as another terminal line', () => {
		render(ContactPage, {
			props: {
				contactPage: {
					...contactContent,
					socials: [
						...contactContent.socials,
						{
							label: { en: 'Mastodon' },
							href: 'https://mastodon.social/@mgkdante',
							icon: 'mastodon',
						},
					],
				},
			},
		});
		const mastodonLinks = screen.getAllByRole('link', { name: 'Mastodon' });
		expect(mastodonLinks.length).toBeGreaterThanOrEqual(1);
		expect(mastodonLinks[0]).toHaveAttribute('href', 'https://mastodon.social/@mgkdante');
	});

	it('email social uses mailto link', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const emailLinks = screen.getAllByTestId('contact-social-email');
		expect(emailLinks[0].getAttribute('href')).toMatch(/^mailto:/);
	});

	it('shows the channel name in Connect and keeps the address as the link', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const github = screen.getAllByTestId('contact-social-github')[0];
		expect(github).toHaveTextContent('GitHub');
		expect(github).not.toHaveTextContent('github.com/fixture');
		expect(github).toHaveAttribute('href', 'https://github.com/fixture');
	});

	it('github social opens in new tab', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const ghLinks = screen.getAllByTestId('contact-social-github');
		expect(ghLinks[0].getAttribute('target')).toBe('_blank');
	});

	it('shows invalid email error for bad format', async () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		await fillForm('Test', 'not-an-email', 'Hello');

		const submitBtns = screen.getAllByRole('button', { name: /send/i });
		await submitForm(submitBtns[0]);

		expect(screen.getAllByText(/invalid.*email/i).length).toBeGreaterThanOrEqual(1);
		expect(analyticsMocks.trackAnalyticsEvent).not.toHaveBeenCalled();
	});

	it.each(['response failure', 'request rejection'])('tracks an error instead of a conversion after %s', async (failure) => {
		const prevFetch = globalThis.fetch;
		globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			if (String(input).includes('web3forms')) {
				if (failure === 'request rejection') throw new Error('offline');
				return Response.json({ success: false });
			}
			return prevFetch(input, init);
		}) as typeof globalThis.fetch;
		render(ContactPage, { props: { contactPage: contactContent } });
		await fillForm();
		await submitForm(screen.getAllByRole('button', { name: /send/i })[0]);
		await waitFor(() => expect(screen.getAllByText(/Fixture delivery failed/).length).toBeGreaterThanOrEqual(1));
		expect(analyticsMocks.trackAnalyticsEvent.mock.calls).toEqual([['contact_form_error']]);
	});

	// The Web3Forms round trip is 1-3s of network time: the form is busy, a second press does nothing,
	// the button keeps its words readable and keeps the focus (it is never disabled mid-send), and
	// "sending" is announced once, with no second "Sending" line in the panel.
	it('holds the focus on a busy, readable button while the send is in flight', async () => {
		let resolveFetch!: (v: unknown) => void;
		globalThis.fetch = vi.fn().mockReturnValue(
			new Promise((resolve) => {
				resolveFetch = resolve;
			}),
		) as typeof globalThis.fetch;

		render(ContactPage, { props: { contactPage: contactContent } });
		await fillForm();

		const submit = screen.getByTestId('contact-submit') as HTMLButtonElement;
		submit.focus();
		await submitForm(submit);

		expect(submit.disabled).toBe(false);
		expect(submit).toHaveAttribute('aria-disabled', 'true');
		expect(submit).toHaveTextContent('Sending');
		expect(document.activeElement).toBe(submit);
		expect(submit.closest('form')).toHaveAttribute('aria-busy', 'true');
		for (const field of screen.getAllByRole('textbox')) expect(field).toHaveAttribute('readonly');
		expect(screen.getByTestId('contact-status')).toHaveTextContent('Sending');
		expect(within(screen.getByTestId('contact-form-terminal')).getAllByText('Sending')).toHaveLength(1);
		expect(screen.queryByTestId('contact-sending-line')).toBeNull();

		// A second submit while in flight must not re-fire the request.
		// (The mount-time weather fetch shares the same stub: count only the Web3Forms calls.)
		const web3formsCalls = () =>
			(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter((call) =>
				String(call[0]).includes('web3forms'),
			).length;
		expect(web3formsCalls()).toBe(1);
		await submitForm(submit);
		expect(web3formsCalls()).toBe(1);
		expect(analyticsMocks.trackAnalyticsEvent).not.toHaveBeenCalled();

		resolveFetch({ ok: true, json: async () => ({ success: true }) });
		await waitFor(() => expect(screen.getByTestId('contact-success')).toBeInTheDocument());
		expect(analyticsMocks.trackAnalyticsEvent).toHaveBeenCalledTimes(1);
		expect(analyticsMocks.trackAnalyticsEvent).toHaveBeenCalledWith('contact_form_success');
	});

	it('recovers a stalled send, preserves the draft, and lets the visitor retry', async () => {
		let attempts = 0;
		globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			if (!String(input).includes('web3forms')) return Response.json(null);
			attempts++;
			if (attempts > 1) return Response.json({ success: true });
			return new Promise<Response>((_, reject) => {
				init?.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')), { once: true });
			});
		}) as typeof globalThis.fetch;

		render(ContactPage, { props: { contactPage: contactContent } });
		await fillForm('Visitor', 'visitor@example.com', 'Please keep this draft.');
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const submit = screen.getAllByTestId('contact-submit')[0] as HTMLButtonElement;
		await submitForm(submit);
		expect(submit).toHaveAttribute('aria-disabled', 'true');
		await vi.advanceTimersByTimeAsync(15_000);
		await tick();

		expect(submit).not.toHaveAttribute('aria-disabled');
		expect(screen.getAllByText('✗ Fixture delivery failed').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByLabelText(/^name/i)[0]).toHaveValue('Visitor');
		expect(screen.getAllByLabelText(/^email/i)[0]).toHaveValue('visitor@example.com');
		expect(screen.getAllByLabelText(/^message/i)[0]).toHaveValue('Please keep this draft.');
		expect(screen.queryAllByTestId('contact-success')).toHaveLength(0);
		expect(analyticsMocks.trackAnalyticsEvent.mock.calls).toEqual([['contact_form_error']]);

		await submitForm(submit);
		await vi.advanceTimersByTimeAsync(1500);
		await tick();
		expect(screen.getAllByTestId('contact-success').length).toBeGreaterThanOrEqual(1);
		expect(analyticsMocks.trackAnalyticsEvent.mock.calls).toEqual([['contact_form_error'], ['contact_form_success']]);
	});

	it.each(['contact-social-calendar', 'contact-booking-link'])('tracks only booking_click for %s', async (testId) => {
		render(ContactPage, { props: { contactPage: contactContent } });
		await clickWithoutNavigating(screen.getAllByTestId(testId)[0]);
		expect(analyticsMocks.trackAnalyticsEvent.mock.calls).toEqual([['booking_click', { placement: 'contact' }]]);
	});

	it.each([
		['email', 'mailto:contact@yesid.dev'],
		['phone', 'tel:+12025550100'],
		['whatsapp', 'https://wa.me/12025550100'],
	])('tracks one direct contact event for %s', async (icon, href) => {
		const content = {
			...contactContent,
			socials: [{ label: { en: icon }, href, icon }],
		} satisfies ContactContent;

		render(ContactPage, { props: { contactPage: content } });
		await clickWithoutNavigating(
			screen.getAllByTestId(`contact-social-${icon}`)[0],
		);

		expect(analyticsMocks.trackAnalyticsEvent).toHaveBeenCalledTimes(1);
		expect(analyticsMocks.trackAnalyticsEvent).toHaveBeenCalledWith(
			'direct_contact_click',
			{ placement: 'contact', channel: icon },
		);
	});

	it.each([
		['github', 'https://github.com/mgkdante'],
		['linkedin', 'https://www.linkedin.com/in/otaloray/'],
		['cal-link-without-calendar-icon', 'https://cal.com/yesid-dev'],
		['ordinary-https', 'https://example.com/contact'],
		['insecure-whatsapp', 'http://wa.me/12025550100'],
		['spoofed-whatsapp', 'https://wa.me.evil.example/12025550100'],
		['malformed', 'not a url'],
	])('does not track the ineligible channel %s', async (icon, href) => {
		const content = {
			...contactContent,
			socials: [{ label: { en: icon }, href, icon }],
		} satisfies ContactContent;

		render(ContactPage, { props: { contactPage: content } });
		await clickWithoutNavigating(
			screen.getAllByTestId(`contact-social-${icon}`)[0],
		);

		expect(analyticsMocks.trackAnalyticsEvent).not.toHaveBeenCalled();
	});

	it('renders supplied success links, tracks once, and clears then resets the captured draft', async () => {
		const linkedContact = {
			...contactContent,
			success: {
				...contactContent.success,
				meanwhile: { en: 'Meanwhile, check {work} and {blog}.' },
				workLinkLabel: { en: 'services' },
				blogLinkLabel: { en: 'journal' },
			},
		} satisfies ContactContent;

		render(ContactPage, { props: { contactPage: linkedContact } });
		await fillForm();

		const submitBtns = screen.getAllByRole('button', { name: /send/i });
		await submitForm(submitBtns[0]);
		await waitFor(() => expect(screen.getAllByTestId('contact-success')[0]).toHaveTextContent('journal'), { timeout: 4000 });

		const success = screen.getAllByTestId('contact-success')[0];
		expect(success.textContent).toContain('services');
		expect(success.textContent).toContain('journal');
		expect(success.textContent).not.toContain('work');
		expect(success.textContent).not.toContain('blog.');
		const links = Array.from(success.querySelectorAll('a'));
		expect(links.map((link) => link.textContent)).toEqual(['services', 'journal']);
		expect(links.map((link) => link.getAttribute('href'))).toEqual(['/services', '/blog']);
		expect(analyticsMocks.trackAnalyticsEvent.mock.calls).toEqual([['contact_form_success']]);
		for (const key of ['contact-name', 'contact-email', 'contact-message']) expect(persisted(key, 'x').value).toBe('');
		expect(persisted('contact-success', false).value).toBe(true);
		await fireEvent.click(screen.getAllByRole('button', { name: 'Send another' })[0]);
		await tick();
		expect(persisted('contact-success', true).value).toBe(false);
		for (const key of ['contact-name', 'contact-email', 'contact-message']) expect(persisted(key, 'x').value).toBe('');
		for (const field of screen.getAllByRole('textbox')) expect(field).toHaveValue('');
	});

	it('displays weather when provided', () => {
		render(ContactPage, {
			props: { contactPage: contactContent, weather: { temp: 12, condition: 'partly cloudy', icon: '02d' } }
		});
		expect(screen.getAllByText(/12°C/).length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText(/partly cloudy/i).length).toBeGreaterThanOrEqual(1);
	});

	it('renders without weather gracefully', () => {
		render(ContactPage, { props: { contactPage: contactContent, weather: null } });
		expect(screen.queryAllByText(/°C/).length).toBe(0);
		expect(screen.getByTestId('page-contact')).toBeTruthy();
	});

	// Override the null weather stub to exercise both hydration-refresh outcomes.
	it('refreshes weather from /api/weather on mount', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ temp: 99, condition: 'fresh breeze', icon: '01d' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		) as typeof globalThis.fetch;
		render(ContactPage, {
			props: { contactPage: contactContent, weather: { temp: 12, condition: 'partly cloudy', icon: '02d' } }
		});
		await waitFor(() => {
			expect(screen.getAllByText(/99°C/).length).toBeGreaterThanOrEqual(1);
		});
		expect(screen.getAllByText(/fresh breeze/i).length).toBeGreaterThanOrEqual(1);
		expect(screen.queryAllByText(/12°C/).length).toBe(0);
		// EN omits the ?lang= param so the CDN cache key stays byte-identical.
		expect(globalThis.fetch).toHaveBeenCalledWith('/api/weather');
	});

	// The client refresh must carry the active locale so OpenWeather localizes
	// `condition` (fr/es). Regression guard for the bug where /fr re-fetched
	// English weather after hydration, overwriting the correct SSR-baked value.
	it('refreshes weather with the ?lang= param inside a fr locale provider', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ temp: 99, condition: 'brise fraîche', icon: '01d' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		) as typeof globalThis.fetch;
		render(ContactPage, {
			props: { contactPage: contactContent, weather: { temp: 12, condition: 'partly cloudy', icon: '02d' } },
			context: new Map([[Symbol.for('@yesid/ui/locale'), () => 'fr']]),
		});
		await waitFor(() => {
			expect(globalThis.fetch).toHaveBeenCalledWith('/api/weather?lang=fr');
		});
	});

	it('keeps the SSR-baked weather when /api/weather fails', async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as typeof globalThis.fetch;
		render(ContactPage, {
			props: { contactPage: contactContent, weather: { temp: 12, condition: 'partly cloudy', icon: '02d' } }
		});
		// Give the rejected refresh a microtask turn to (not) apply.
		await new Promise((r) => setTimeout(r, 20));
		expect(screen.getAllByText(/12°C/).length).toBeGreaterThanOrEqual(1);
	});
});

// A language switch remounts the page, so the draft and the sent state must come back.
describe('ContactPage state across remounts', () => {
	it('restores a half-typed draft into a freshly mounted form', async () => {
		const first = render(ContactPage, { props: { contactPage: contactContent } });
		const messageInputs = screen.getAllByLabelText(/^message/i) as HTMLTextAreaElement[];
		await typeInto(messageInputs[0], 'carry me across the switch');
		first.unmount();

		render(ContactPage, { props: { contactPage: contactContent } });
		await tick();

		const restored = screen.getAllByLabelText(/^message/i) as HTMLTextAreaElement[];
		expect(restored[0].value).toBe('carry me across the switch');
	});

	it('re-shows the success screen on a later mount until "send another"', async () => {
		persisted('contact-success', false).value = true;
		render(ContactPage, { props: { contactPage: contactContent } });
		await tick();

		expect(screen.getAllByTestId('contact-success')[0]).toHaveTextContent('Delivered');

		await fireEvent.click(screen.getAllByRole('button', { name: 'Send another' })[0]);
		await tick();
		expect(screen.queryAllByTestId('contact-success')).toHaveLength(0);
		expect(persisted('contact-success', true).value).toBe(false);
	});
});

// The rebuild from the reviewed preview D-M4 (DEV-40): the kit's pieces, the AI slop gone, and
// every state of the form with its focus and announcements.
describe('ContactPage rebuild (DEV-40)', () => {
	const fr = () => new Map([[Symbol.for('@yesid/ui/locale'), () => 'fr']]);
	const es = () => new Map([[Symbol.for('@yesid/ui/locale'), () => 'es']]);

	it('draws "Contact." as the kit RailTitle: the one h1, ending on the orange dot', () => {
		const { container } = render(ContactPage, { props: { contactPage: contactContent } });
		const headings = screen.getAllByRole('heading', { level: 1 });
		expect(headings).toHaveLength(1);
		expect(headings[0]).toHaveTextContent('Contact fixture.');
		expect(headings[0]).toHaveAttribute('id', 'contact-title');
		const rail = headings[0].closest('[data-slot="rail-title"]');
		expect(rail).not.toBeNull();
		expect(rail).toHaveAttribute('data-side', 'left');
		expect(headings[0].querySelector('[data-slot="rail-title-dot"]')).toHaveAttribute('aria-hidden', 'true');
		// The page's one section is named by the title; the panels sit in the rail layout's content.
		const section = container.querySelector('[data-slot="page-section"]');
		expect(section).toHaveAttribute('aria-labelledby', 'contact-title');
		const layout = container.querySelector('[data-slot="rail-title-layout"]') as HTMLElement;
		expect(layout.style.getPropertyValue('--rail-title-size')).toBe('9rem');
		expect(
			layout.querySelector('[data-slot="rail-title-content"] [data-testid="contact-form-terminal"]'),
		).not.toBeNull();
	});

	it('draws the kit dimension line under both title bars and no divider before the footer', () => {
		const { container } = render(ContactPage, { props: { contactPage: contactContent } });
		for (const id of ['contact-info-terminal', 'contact-form-terminal']) {
			const panel = screen.getByTestId(id);
			const titlebar = panel.querySelector('.terminal-titlebar') as HTMLElement;
			expect(titlebar.nextElementSibling).toHaveAttribute('data-variant', 'dimension');
			expect(panel.querySelectorAll('.terminal-rule')).toHaveLength(1);
		}
		expect(container.querySelectorAll('[data-slot="page-section"]')).toHaveLength(1);
		expect(container.querySelector('[data-slot="page-section-boundary"]')).toBeNull();
	});

	it('removes the pretend commands and the resize handle, and keeps the window titles', () => {
		const { container } = render(ContactPage, { props: { contactPage: contactContent } });
		const text = container.textContent ?? '';
		for (const slop of ['$ info', '$ contact', 'Ready', '~ $']) expect(text).not.toContain(slop);
		expect(text).not.toMatch(/(^|\s)~(\s|$)/);
		expect(
			container.querySelector('[data-slot="resizable-handle"], [data-pane-resizer], .contact-resize-handle'),
		).toBeNull();
		expect(screen.getByTestId('contact-info-terminal')).toHaveTextContent('Fixture info');
		expect(screen.getByTestId('contact-form-terminal')).toHaveTextContent('Fixture form');
	});

	it('puts the details before the form, for phones (owner answer 1A)', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const info = screen.getByTestId('contact-info-terminal');
		const form = screen.getByTestId('contact-form-terminal');
		expect(info.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(screen.getAllByTestId('contact-form-terminal')).toHaveLength(1);
	});

	for (const [locale, context, reply] of [
		['en', undefined, 'I usually reply within one business day.'],
		['fr', fr, 'Je réponds habituellement dans un délai d’un jour ouvrable.'],
		['es', es, 'Normalmente respondo en un día hábil.'],
	] as const)
		it(`states the reply time in ${locale} instead of the ~24h line`, () => {
			const { container } = render(ContactPage, {
				props: { contactPage: contactContent },
				...(context ? { context: context() } : {}),
			});
			expect(screen.getByTestId('contact-reply-time')).toHaveTextContent(reply);
			expect(container.textContent).not.toContain('Soon');
		});

	it('labels Connect "ME JOINDRE" in French', () => {
		render(ContactPage, { props: { contactPage: contactContent }, context: fr() });
		expect(screen.getByTestId('contact-connect-label')).toHaveTextContent('ME JOINDRE');
		expect(screen.getByRole('heading', { level: 2, name: 'ME JOINDRE' })).toBeInTheDocument();
	});

	it('shows the message prompt as a visible hint above the field, not as a placeholder', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const message = screen.getByRole('textbox', { name: 'message:' });
		const hint = screen.getByText('Your note');
		expect(hint.tagName).toBe('P');
		expect(hint.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(message).not.toHaveAttribute('placeholder');
		expect(message).toHaveAccessibleDescription('guidance Your note');
		expect(screen.getByRole('textbox', { name: 'name:' })).toHaveAccessibleDescription('guidance');
	});

	it('starts empty and ready after hydration', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		for (const field of screen.getAllByRole('textbox')) {
			expect(field).toHaveValue('');
			expect(field).not.toHaveAttribute('aria-invalid');
			expect(field).toBeRequired();
		}
		expect(screen.getByTestId('contact-submit')).toBeEnabled();
		expect(screen.queryByTestId('contact-error-summary')).toBeNull();
		expect(screen.queryByTestId('contact-send-error')).toBeNull();
	});

	it('puts the error summary before the fields, focuses it, and its links focus each field', async () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		await submitForm(screen.getByTestId('contact-submit'));
		const summary = await screen.findByTestId('contact-error-summary');
		await waitFor(() => expect(document.activeElement).toBe(summary));
		expect(summary).toHaveAttribute('role', 'group');
		expect(summary).toHaveAccessibleName('3 errors');
		const name = screen.getByRole('textbox', { name: 'name:' });
		expect(summary.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		const links = within(summary).getAllByRole('link');
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'#contact-field-name',
			'#contact-field-email',
			'#contact-field-message',
		]);
		for (const [index, label] of ['name:', 'email:', 'message:'].entries()) {
			await fireEvent.click(links[index]);
			expect(document.activeElement).toBe(screen.getByRole('textbox', { name: label }));
		}
		for (const field of screen.getAllByRole('textbox')) {
			expect(field).toHaveAttribute('aria-invalid', 'true');
			expect(document.getElementById(`${field.id}-error`)).toHaveTextContent(/^✗ /);
		}
	});

	it('gives a malformed address its own line, then sends once it is fixed', async () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		await fillForm('Test', 'not-an-email', 'Hello');
		await submitForm(screen.getByTestId('contact-submit'));
		const email = screen.getByRole('textbox', { name: 'email:' });
		expect(email).toHaveAttribute('aria-invalid', 'true');
		expect(document.getElementById(`${email.id}-error`)).toHaveTextContent('✗ Invalid email format');
		expect(screen.getByRole('textbox', { name: 'name:' })).not.toHaveAttribute('aria-invalid');
		expect(within(screen.getByTestId('contact-error-summary')).getAllByRole('link')).toHaveLength(1);
		globalThis.fetch = vi.fn(async () => Response.json({ success: true })) as typeof globalThis.fetch;
		await typeInto(email as HTMLInputElement, 'reader@example.com');
		await submitForm(screen.getByTestId('contact-submit'));
		await waitFor(() => expect(screen.getByTestId('contact-success')).toBeInTheDocument());
	});

	it('keeps the draft when not sent, focuses the failure, links the address and retries', async () => {
		let attempts = 0;
		globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
			if (!String(input).includes('web3forms')) return Response.json(null);
			attempts++;
			return Response.json({ success: attempts > 1 });
		}) as typeof globalThis.fetch;
		const failing = {
			...contactContent,
			sendErrorMessage: { en: 'Not sent. Try again or email contact@yesid.dev.' },
		} satisfies ContactContent;
		render(ContactPage, { props: { contactPage: failing } });
		await fillForm('Visitor', 'visitor@example.com', 'Keep me');
		await submitForm(screen.getByTestId('contact-submit'));
		const failure = await screen.findByTestId('contact-send-error');
		await waitFor(() => expect(document.activeElement).toBe(failure));
		expect(failure).toHaveTextContent('✗ Not sent. Try again or email contact@yesid.dev.');
		expect(within(failure).getByRole('link', { name: 'contact@yesid.dev' })).toHaveAttribute(
			'href',
			'mailto:contact@yesid.dev',
		);
		expect(screen.queryByTestId('contact-error-summary')).toBeNull();
		expect(screen.getByTestId('contact-status').textContent).toBe('');
		expect(screen.getByRole('textbox', { name: 'message:' })).toHaveValue('Keep me');
		const submit = screen.getByTestId('contact-submit');
		expect(submit.compareDocumentPosition(failure) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
		await submitForm(submit);
		await waitFor(() => expect(screen.getByTestId('contact-success')).toBeInTheDocument());
		expect(attempts).toBe(2);
	});

	it('shows the result at once, focuses it, offers the links and sends another', async () => {
		globalThis.fetch = vi.fn(async () => Response.json({ success: true })) as typeof globalThis.fetch;
		render(ContactPage, { props: { contactPage: contactContent } });
		await fillForm();
		await submitForm(screen.getByTestId('contact-submit'));
		const result = await screen.findByTestId('contact-sent-message');
		await waitFor(() => expect(document.activeElement).toBe(result));
		expect(result).toHaveTextContent('✓ Delivered');
		const success = screen.getByTestId('contact-success');
		expect(success).toHaveTextContent('I usually reply within one business day.');
		for (const slop of ['~ $ send', 'Checking', 'OK']) expect(success.textContent).not.toContain(slop);
		expect(within(success).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
			'/services',
			'/blog',
		]);
		// Announced by the focus move, not a second time by the status region.
		expect(screen.getByTestId('contact-status').textContent).toBe('');
		await fireEvent.click(within(success).getByRole('button', { name: 'Send another' }));
		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'name:' })),
		);
		for (const field of screen.getAllByRole('textbox')) expect(field).toHaveValue('');
	});

	it('does not move the focus when a later mount shows the earlier result', async () => {
		persisted('contact-success', false).value = true;
		render(ContactPage, { props: { contactPage: contactContent } });
		await tick();
		expect(screen.getByTestId('contact-sent-message')).toBeInTheDocument();
		expect(document.activeElement).toBe(document.body);
		await fireEvent.click(screen.getByRole('button', { name: 'Send another' }));
	});

	it('writes the French "Meanwhile" line in vous', async () => {
		persisted('contact-success', false).value = true;
		render(ContactPage, {
			props: {
				contactPage: {
					...contactContent,
					success: {
						...contactContent.success,
						meanwhile: { en: 'x', fr: 'jette un œil' },
						workLinkLabel: { en: 'work', fr: 'services' },
						blogLinkLabel: { en: 'blog', fr: 'blogue' },
					},
				},
			},
			context: fr(),
		});
		await tick();
		const success = screen.getByTestId('contact-success');
		expect(success).toHaveTextContent('En attendant, jetez un œil à mes services ou à mon blogue');
		expect(success).not.toHaveTextContent('jette');
		await fireEvent.click(within(success).getByRole('button'));
	});

	it('offers Book a call beside the message, in a new tab', () => {
		render(ContactPage, { props: { contactPage: contactContent } });
		const book = screen.getByTestId('contact-booking-link');
		expect(book).toHaveAttribute('href', 'https://cal.com/fixture');
		expect(book).toHaveAttribute('target', '_blank');
		expect(book).toHaveTextContent('Book');
		expect(book).not.toHaveTextContent('~');
		expect(book.closest('form')).toBe(screen.getByTestId('contact-submit').closest('form'));
	});
});
