<!--
  Contact page (page type: contact, D20), rebuilt from the owner-reviewed preview D-M4 (DEV-40).
  One page section: the rotated "Contact." is the kit's RailTitle (the page's h1, sticky on the left
  rail from 1024px, horizontal below), then two TerminalPanels with a solid yellow rule under
  their title bars: the info panel (location, weather, local time, reply time, languages, best fit,
  connect) and the form panel. Phones stack the details first. No divider before the footer.
  The form follows yesid.design's labelled-field recipe: visible labels, the required line and
  the message hint in each field's description, the error summary before the fields.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { getLocale, intl } from '#lib/utils/locale-context.ts';
	import { fillTemplate } from '#lib/utils/labels.ts';
	import { siteLabels, siteMeta } from '#lib/content/index.ts';
	import { clock, persisted } from '@yesid/ui/state';
	import type { ContactContent } from '#lib/types.ts';
	import { RailTitle, TerminalPanel } from '@yesid/ui/brand';
	import { PageSection, PageSections } from '@yesid/ui/layout';
	import { Button } from '@yesid/ui/button';
	import type { WeatherData } from '#lib/utils/weather.ts';
	import { fetchFreshWeather } from '#lib/utils/weather-refresh.ts';
	import { bookingHref, directContactChannel } from '#lib/utils/high-intent-links.ts';
	import { trackLinkActivation } from '#lib/analytics/site-events.ts';
	import { trackAnalyticsEvent } from '#lib/analytics/client.ts';
	import { connectLabelFr, formHeadingCopy, meanwhileFr, replyTimeCopy } from './contact-copy.ts';

	const locale = getLocale();

	let {
		contactPage,
		weather = null,
	}: {
		contactPage: ContactContent;
		weather?: WeatherData | null;
	} = $props();

	// $derived on the contactPage reads so they recompute if the prop changes.
	const pageTitle = $derived(resolveLocale(contactPage.pageTitle, locale));
	const sendErrorMessage = $derived(resolveLocale(contactPage.sendErrorMessage, locale));
	const workLinkLabel = $derived(resolveLocale(contactPage.success.workLinkLabel, locale));
	const blogLinkLabel = $derived(resolveLocale(contactPage.success.blogLinkLabel, locale));
	const replyTime = resolveLocale(replyTimeCopy, locale);
	const formHeading = resolveLocale(formHeadingCopy, locale);
	const connectLabel = $derived(
		resolveLocale({ ...contactPage.infoTerminal.sectionLabels.connect, fr: connectLabelFr }, locale),
	);
	const meanwhile = $derived(
		resolveLocale({ ...contactPage.success.meanwhile, fr: meanwhileFr }, locale),
	);
	const contactEmail = siteMeta.links.email;

	let freshWeather = $state<WeatherData | null>(null);
	const currentWeather = $derived(freshWeather ?? weather);

	// Hydration gate: the page is prerendered, so the static HTML paints before handleSubmit is
	// attached. A submit in that window would fall back to a native GET submit (the form values in
	// the query string). The form needs JS to send, so the button is disabled until hydration.
	let hydrated = $state(false);

	// Local time (Montreal), client-only: the page is prerendered.
	const montrealTime = intl.dateTime('en', {
		timeZone: 'America/Montreal',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZoneName: 'short',
	});
	const localTime = $derived(hydrated ? montrealTime.format(clock.now) : '');
	$effect(() => clock.subscribe());

	onMount(() => {
		hydrated = true;
		void fetchFreshWeather(locale).then((w) => {
			if (w) freshWeather = w;
		});
	});

	// --- Form state ---
	// A half-typed message survives a locale switch or a reload: the fields are tab-scoped via
	// persisted(). They are user-typed primitives, never copy.
	const name = persisted<string>('contact-name', '');
	const email = persisted<string>('contact-email', '');
	const message = persisted<string>('contact-message', '');
	const fields = [
		{ key: 'name', state: name },
		{ key: 'email', state: email },
		{ key: 'message', state: message },
	] as const;
	type FieldKey = (typeof fields)[number]['key'];

	const fieldId = (key: FieldKey) => `contact-field-${key}`;
	const requiredId = 'contact-required';
	const messageHintId = 'contact-message-hint';

	let errors = $state<Partial<Record<FieldKey, string>>>({});
	let sendFailed = $state(false);
	let sending = $state(false);
	let announcement = $state('');

	// Only the locale-free "the send succeeded" bit is stored, so a later mount (a language switch)
	// shows the result again in the current locale until "Send another message".
	const wasSuccessful = persisted<boolean>('contact-success', false);
	const showSuccess = $derived(wasSuccessful.value);

	let summaryEl = $state<HTMLElement>();
	let failureEl = $state<HTMLElement>();
	let resultEl = $state<HTMLElement>();

	const errorCount = $derived(Object.keys(errors).length);

	function fieldLabel(field: FieldKey): string {
		return resolveLocale(contactPage.formTerminal.fields[field].label, locale);
	}

	// --- Validation ---
	function validate(): boolean {
		const next: Partial<Record<FieldKey, string>> = {};
		const required = resolveLocale(contactPage.validation.required, locale);
		if (!name.value.trim()) next.name = required.replace('{field}', fieldLabel('name'));
		if (!email.value.trim()) next.email = required.replace('{field}', fieldLabel('email'));
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
			next.email = resolveLocale(contactPage.validation.invalidEmail, locale);
		if (!message.value.trim()) next.message = required.replace('{field}', fieldLabel('message'));
		errors = next;
		return Object.keys(next).length === 0;
	}

	function describedBy(key: FieldKey): string {
		return [requiredId, key === 'message' ? messageHintId : '', errors[key] ? `${fieldId(key)}-error` : '']
			.filter(Boolean)
			.join(' ');
	}

	// --- Submit (client-side: the Web3Forms free tier requires client calls) ---
	function failSend(): void {
		sending = false;
		announcement = '';
		sendFailed = true;
		trackAnalyticsEvent('contact_form_error');
		void tick().then(() => failureEl?.focus());
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (sending) return; // In flight: a second press does nothing.
		sendFailed = false;
		announcement = '';
		if (!validate()) {
			await tick();
			summaryEl?.focus();
			return;
		}

		sending = true;
		// Announced once, from the status region outside the busy form.
		announcement = resolveLocale(contactPage.success.sending, locale);
		// A stalled provider must release the form without discarding the draft.
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15_000);
		try {
			const res = await fetch('https://api.web3forms.com/submit', {
				method: 'POST',
				signal: controller.signal,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					access_key: contactPage.web3formsKey,
					subject: fillTemplate(
						resolveLocale(siteLabels.email.contactSubjectTemplate, locale) ||
							'New contact from {name} via yesid.dev',
						{ name: name.value },
					),
					from_name: name.value,
					email: email.value,
					message: message.value,
				}),
			});
			const result = await res.json();
			if (!res.ok || !result.success) return failSend();
		} catch {
			return failSend();
		} finally {
			clearTimeout(timeout);
		}

		trackAnalyticsEvent('contact_form_success');
		sending = false;
		announcement = '';
		// The draft goes so a sent message cannot come back; the result shows at once.
		name.value = '';
		email.value = '';
		message.value = '';
		wasSuccessful.value = true;
		await tick();
		resultEl?.focus();
	}

	// --- Send another message ---
	async function handleReset() {
		name.value = '';
		email.value = '';
		message.value = '';
		wasSuccessful.value = false;
		errors = {};
		sendFailed = false;
		announcement = '';
		await tick();
		document.getElementById(fieldId('name'))?.focus();
	}

	function focusField(event: MouseEvent, key: FieldKey) {
		event.preventDefault();
		document.getElementById(fieldId(key))?.focus();
	}

	/** Splits a CMS template on its {work} and {blog} slots, so the links render without HTML strings. */
	function meanwhileParts(template: string): { text: string; href?: string }[] {
		return template
			.split(/(\{work\}|\{blog\})/)
			.filter((part) => part !== '')
			.map((part) =>
				part === '{work}'
					? { text: workLinkLabel, href: localizeHref('/services', locale) }
					: part === '{blog}'
						? { text: blogLinkLabel, href: localizeHref('/blog', locale) }
						: { text: part },
			);
	}

	/** The send failure names the address; it becomes a link, one tap to write instead. */
	const failureParts = $derived.by(() => {
		const at = sendErrorMessage.indexOf(contactEmail);
		return at < 0
			? { before: sendErrorMessage, after: '', linked: false }
			: {
					before: sendErrorMessage.slice(0, at),
					after: sendErrorMessage.slice(at + contactEmail.length),
					linked: true,
				};
	});

	function handleContactChannelClick(event: MouseEvent, social: ContactContent['socials'][number]): void {
		if (social.icon === 'calendar') {
			trackLinkActivation(event, 'booking_click', { placement: 'contact' });
			return;
		}
		const channel = directContactChannel(social.href);
		if (channel) trackLinkActivation(event, 'direct_contact_click', { placement: 'contact', channel });
	}
</script>

<div class="contact-page" data-testid="page-contact" data-register="task">
	<PageSections divider="hand-drawn">
		<PageSection class="contact-section" aria-labelledby="contact-title">
			<RailTitle clipAtHeader={false}
				heading={pageTitle}
				level={1}
				titleId="contact-title"
				side="left"
				size="clamp(3rem, 4vw, 3.5rem)"
				horizontalSize="2rem"
				style="--rail-title-rail: clamp(4.5rem, 12vw, 10.5rem)"
			>
				<div class="contact-content">
					<div class="contact-panels">
						{@render infoTerminal()}
						{@render formTerminal()}
					</div>
				</div>
			</RailTitle>
		</PageSection>
	</PageSections>

	<!-- One status region outside the busy form, so "sending" is announced once. -->
	<div role="status" aria-atomic="true" class="sr-only" data-testid="contact-status">{announcement}</div>
</div>

{#snippet infoTerminal()}
	<TerminalPanel
		title={contactPage.infoTerminal.title}
		rule="line"
		class="h-full min-w-0"
		data-testid="contact-info-terminal"
	>
		<div class="contact-term">
			<div class="contact-block">
				<h2 class="contact-label">{resolveLocale(contactPage.infoTerminal.sectionLabels.location, locale)}</h2>
				<p class="contact-value">{resolveLocale(contactPage.infoTerminal.location, locale)}</p>
				{#if currentWeather}
					<p class="contact-small contact-weather">
						{currentWeather.temp}°C · <span class="capitalize">{currentWeather.condition}</span>
					</p>
				{/if}
				{#if localTime}
					<p class="contact-small"><time>{localTime}</time></p>
				{/if}
				<p class="contact-small" data-testid="contact-reply-time">{replyTime}</p>
			</div>

			<div class="contact-block">
				<h2 class="contact-label">{resolveLocale(contactPage.infoTerminal.sectionLabels.languages, locale)}</h2>
				<p class="contact-value">{resolveLocale(contactPage.infoTerminal.languages, locale)}</p>
			</div>

			{#if contactPage.infoTerminal.bestFit?.length}
				<div class="contact-block" data-testid="contact-best-fit">
					{#if contactPage.infoTerminal.sectionLabels.bestFit}
						<h2 class="contact-label">{resolveLocale(contactPage.infoTerminal.sectionLabels.bestFit, locale)}</h2>
					{/if}
					<ul class="contact-fit">
						{#each contactPage.infoTerminal.bestFit as line}
							<li>{resolveLocale(line, locale)}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="contact-block">
				<h2 class="contact-label" data-testid="contact-connect-label">{connectLabel}</h2>
				<ul class="contact-connect">
					{#each contactPage.socials as social}
						<li>
							<a
								href={social.href}
								data-testid="contact-social-{social.icon}"
								onclick={(event) => handleContactChannelClick(event, social)}
								onauxclick={(event) => handleContactChannelClick(event, social)}
								class="contact-lift"
								{...social.icon === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' }}
							>
								<span class="contact-arrow" aria-hidden="true">→</span>
								<span class="contact-connect-label">{resolveLocale(social.label, locale)}</span>
								{#if social.icon === 'calendar'}
									<!-- The booking row keeps its address as a muted suffix. -->
									<span class="contact-connect-suffix">{social.href.replace(/^https?:\/\//, '')}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</TerminalPanel>
{/snippet}

{#snippet formTerminal()}
	<TerminalPanel
		title={contactPage.formTerminal.title}
		rule="line"
		class="h-full min-w-0"
		data-testid="contact-form-terminal"
	>
		<div class="contact-term">
			<h2 class="sr-only" id="contact-form-heading">{formHeading}</h2>
			{#if !showSuccess}
				<form
					onsubmit={handleSubmit}
					novalidate
					class="contact-form"
					aria-labelledby="contact-form-heading"
					aria-busy={sending ? 'true' : undefined}
				>
					{#if errorCount > 0}
						<!-- The summary comes before the fields, takes focus and links to each field. -->
						<div
							bind:this={summaryEl}
							tabindex="-1"
							role="group"
							aria-labelledby="contact-error-summary-heading"
							data-testid="contact-error-summary"
							class="contact-box"
						>
							<p id="contact-error-summary-heading">
								{resolveLocale(contactPage.validation.errorSummary, locale).replace('{count}', String(errorCount))}
							</p>
							<ul class="contact-summary-list">
								{#each fields as { key }}
									{#if errors[key]}
										<li>
											<a href={`#${fieldId(key)}`} onclick={(event) => focusField(event, key)}>{errors[key]}</a>
										</li>
									{/if}
								{/each}
							</ul>
						</div>
					{/if}

					<p class="contact-required" id={requiredId}>{resolveLocale(contactPage.formTerminal.requiredGuidance, locale)}</p>
					<noscript>
						<p>
							{resolveLocale(contactPage.formTerminal.noScript, locale)}
							<a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
						</p>
					</noscript>

					<div class="contact-fields">
						{#each fields as { key, state }}
							{@const id = fieldId(key)}
							{@const error = errors[key]}
							{@const attributes = {
								id,
								name: key,
								required: true,
								readonly: sending || undefined,
								autocomplete: key === 'message' ? undefined : key,
								'data-handoff-focus': `contact-${key}`,
								'aria-invalid': error ? ('true' as const) : undefined,
								'aria-describedby': describedBy(key),
								class: 'contact-input',
							}}
							<div class="contact-field">
								<label for={id}>{fieldLabel(key)}:</label>
								{#if key === 'message'}
									<!-- The prompt is a visible hint above the box, so it stays while you type. -->
									<p class="contact-hint" id={messageHintId}>
										{resolveLocale(contactPage.formTerminal.fields.message.placeholder, locale)}
									</p>
									<textarea {...attributes} bind:value={state.value} rows="6"></textarea>
								{:else}
									<input
										{...attributes}
										type={key === 'email' ? 'email' : 'text'}
										autocapitalize={key === 'email' ? 'off' : undefined}
										spellcheck={key === 'email' ? false : undefined}
										placeholder={resolveLocale(contactPage.formTerminal.fields[key].placeholder, locale)}
										bind:value={state.value}
									/>
								{/if}
								{#if error}
									<p id={`${id}-error`} class="contact-error">✗ {error}</p>
								{/if}
							</div>
						{/each}

						{#if sendFailed}
							<!-- The send failure keeps the draft, takes focus and offers the address. -->
							<div bind:this={failureEl} tabindex="-1" class="contact-box" data-testid="contact-send-error">
								<p>
									✗ {failureParts.before}{#if failureParts.linked}<a class="contact-inline-target" href={`mailto:${contactEmail}`}>{contactEmail}</a>{/if}{failureParts.after}
								</p>
							</div>
						{/if}

						<Button
							variant="conversion"
							size="cta"
							type="submit"
							disabled={!hydrated}
							aria-disabled={sending ? 'true' : undefined}
							data-testid="contact-submit"
							wrap
							class="min-h-11 motion-reduce:transition-none motion-reduce:translate-none"
						>
							{sending
								? resolveLocale(contactPage.success.sending, locale)
								: resolveLocale(contactPage.formTerminal.submitLabel, locale)}
						</Button>

						<p class="contact-book">
							<span class="contact-book-prompt">{resolveLocale(contactPage.formTerminal.bookingPrompt, locale)}</span>
							<a
								href={bookingHref(contactPage.socials)}
								target="_blank"
								rel="noopener"
								data-testid="contact-booking-link"
								class="contact-lift"
								onclick={(event) => trackLinkActivation(event, 'booking_click', { placement: 'contact' })}
								onauxclick={(event) => trackLinkActivation(event, 'booking_click', { placement: 'contact' })}
							>
								{resolveLocale(contactPage.formTerminal.bookingButtonLabel, locale)}
							</a>
						</p>
					</div>
				</form>
			{:else}
				<!-- The result, at once: no replayed process. A send moves the focus here. -->
				<div data-testid="contact-success" class="contact-sent">
					<p class="contact-sent-ok" tabindex="-1" bind:this={resultEl} data-testid="contact-sent-message">
						✓ {resolveLocale(contactPage.success.sent, locale)}
					</p>
					<p>{replyTime}</p>
					<p>
						{#each meanwhileParts(meanwhile) as part}{#if part.href}<a class="contact-inline-target" href={part.href}>{part.text}</a>{:else}{part.text}{/if}{/each}
					</p>
					<Button variant="ghost" onclick={handleReset} data-testid="contact-reset" class="mt-4 min-h-11 self-start px-4 font-mono text-caption">
						{resolveLocale(contactPage.success.resetLabel, locale)}
					</Button>
				</div>
			{/if}
		</div>
	</TerminalPanel>
{/snippet}

<style>
	.contact-page {
		padding-block: var(--space-section-y);
	}
	.contact-content {
		min-width: 0;
		padding-inline: var(--space-page-x);
	}
	/* Phones and tablets: the details first, then the form (owner answer 1A). */
	.contact-panels {
		display: flex;
		flex-direction: column;
		gap: var(--space-card-gap);
	}

	@media (--desktop-min) {
		.contact-page {
			padding-block: var(--space-card-gap);
		}
		/* Today's orange accent line along the rail, kept with the rotated title. */
		.contact-content {
			min-height: 100%;
			border-inline-start: 2px solid color-mix(in srgb, var(--primary) 35%, transparent);
		}
		/* Today's split, a third and two thirds, fixed: no resize handle. */
		.contact-panels {
			display: grid;
			grid-template-columns: minmax(0, 33fr) minmax(0, 67fr);
			gap: 10px;
			align-items: stretch;
		}
	}

	.contact-term {
		font-family: var(--font-mono);
		font-size: var(--text-body);
		line-height: 1.625;
	}

	/* ---------- The info panel ---------- */
	.contact-block + .contact-block {
		margin-top: 1rem;
	}
	.contact-label {
		margin: 0 0 0.25rem;
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		font-weight: 400;
		line-height: 1.5;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--primary);
	}
	.contact-value,
	.contact-fit li {
		color: var(--secondary-foreground);
	}
	.contact-fit {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.contact-small {
		margin-top: 0.125rem;
		font-size: var(--text-small);
		color: var(--secondary-foreground);
	}
	.contact-weather {
		color: var(--accent-text);
	}
	.contact-connect {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
	}
	.contact-connect a {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 0.5rem;
		min-height: var(--size-tap-min);
		padding: calc(0.75rem - 1px) calc(0.5rem - 1px);
		color: var(--foreground);
		text-decoration: none;
	}
	.contact-arrow {
		color: var(--primary);
	}
	.contact-connect-label {
		font-size: var(--text-small);
	}
	.contact-connect-suffix {
		font-size: var(--text-small);
		color: var(--muted-foreground);
	}

	/* The page's own links that act: on hover the edge lights up and they lift 1px, the same in
	   light and dark; no tint, no glow, no shadow (D21). Still under reduced motion. */
	.contact-lift {
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		transition:
			border-color var(--duration-fast) var(--ease-default),
			translate var(--duration-fast) var(--ease-default);
	}
	.contact-lift:hover {
		border-color: var(--border-brand-active);
		translate: 0 -1px;
	}
	.contact-lift:active {
		translate: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.contact-lift,
		.contact-lift:hover {
			transition: none;
			translate: none;
		}
	}

	/* ---------- The form ---------- */
	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.contact-required {
		font-weight: 700;
		color: var(--foreground);
	}
	.contact-fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.contact-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.contact-field label {
		font-size: var(--text-caption);
		color: var(--primary);
	}
	.contact-hint {
		font-size: var(--text-caption);
		color: var(--secondary-foreground);
	}
	/* The labelled-field recipe's boundary (--input) and 44px minimum, in the panel's mono type;
	   16px text so phones never zoom into the field. */
	.contact-field :global(.contact-input) {
		display: block;
		width: 100%;
		min-height: var(--size-tap-min);
		padding: 0.75rem 1rem;
		border: 1px solid var(--input);
		border-radius: var(--radius-sm);
		background: var(--background);
		color: var(--foreground);
		caret-color: var(--primary);
		font-family: var(--font-mono);
		font-size: 1rem;
		line-height: 1.625;
		scroll-margin-top: calc(var(--nav-clearance, 5.5rem) + 2rem);
		/* iOS keyboard: focused fields keep room above the virtual keyboard. */
		scroll-margin-bottom: 100px;
		transition: border-color var(--duration-fast) var(--ease-default);
	}
	.contact-field :global(.contact-input::placeholder) {
		color: var(--muted-foreground);
		opacity: 1;
	}
	.contact-field :global(textarea.contact-input) {
		resize: none;
	}
	.contact-field :global(.contact-input[aria-invalid='true']) {
		border-color: var(--destructive);
	}
	.contact-error {
		font-size: var(--text-caption);
		color: var(--destructive);
	}
	/* Today's red box: the error summary (before the fields) and the send failure (above the button). */
	.contact-box {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--destructive);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--destructive);
		scroll-margin-top: calc(var(--nav-clearance, 5.5rem) + 1rem);
	}
	.contact-summary-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0.25rem 0 0;
		padding: 0;
		list-style: none;
	}
	.contact-summary-list a {
		display: flex;
		align-items: center;
		min-height: var(--size-tap-min);
		padding: 0.5rem 0.25rem;
		color: var(--destructive);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.contact-box a,
	.contact-sent a {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.contact-summary-list a {
		color: var(--destructive);
	}
	/* Links inside a sentence (the not-sent address, the "Meanwhile" links) keep the 44px tap
	   minimum in both directions without leaving their line. */
	.contact-inline-target {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: var(--size-tap-min);
		min-inline-size: var(--size-tap-min);
		vertical-align: middle;
	}
	.contact-book {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
		font-size: var(--text-caption);
	}
	.contact-book-prompt {
		color: var(--secondary-foreground);
	}
	.contact-book a {
		display: inline-flex;
		align-items: center;
		min-height: var(--size-tap-min);
		padding: calc(0.125rem - 1px) calc(0.25rem - 1px);
		color: var(--primary);
		text-decoration: none;
	}

	/* ---------- Sent ---------- */
	.contact-sent {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: var(--text-small);
		color: var(--secondary-foreground);
	}
	.contact-sent-ok {
		color: var(--success);
		scroll-margin-top: calc(var(--nav-clearance, 5.5rem) + 1rem);
	}
</style>
