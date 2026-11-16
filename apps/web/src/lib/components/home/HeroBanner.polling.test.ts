import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HeroBanner from './HeroBanner.svelte';
import { heroContent, heroAnimContent } from '#lib/content/site-content.ts';
import { INITIAL_HERO_DATA, LIVE_KPIS_URL, LIVE_POLL_MS } from '#lib/live/index.ts';
import { tick } from 'svelte';
import contract from '../../../../../../contracts/kpis-v1.examples.json';

function mountHero(locale = 'en') {
	return render(HeroBanner, {
		props: {
			metroSvg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
			hero: heroContent,
			heroAnim: heroAnimContent,
			initialHeroData: INITIAL_HERO_DATA,
			bookingHref: 'https://cal.com/fixture',
		},
		context: new Map([[Symbol.for('@yesid/ui/locale'), () => locale]]),
	});
}

async function settle() {
	await vi.advanceTimersByTimeAsync(0);
	await tick();
}

function liveFetch() {
	vi.useFakeTimers();
	vi.spyOn(navigator, 'webdriver', 'get').mockReturnValue(false);
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json(contract.examples[0].body));
}

const proof = (view: ReturnType<typeof mountHero>) => view.getByTestId('hero-transit-proof');
const stateOf = (view: ReturnType<typeof mountHero>) => proof(view).getAttribute('data-state');
const figures = (view: ReturnType<typeof mountHero>) => view.getByTestId('hero-transit-figures').textContent;
const stateLine = (view: ReturnType<typeof mountHero>) => view.getByTestId('hero-transit-state');

afterEach(() => {
	cleanup();
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('HeroBanner live KPI polling boundary', () => {
	it('keeps DEMO values unchanged across two further failed polls after dropping', async () => {
		const fetchKpis = liveFetch();
		const view = mountHero();
		await settle();
		fetchKpis.mockRejectedValue(new Error('offline'));
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 2);
		const demo = figures(view);
		expect(stateOf(view)).toBe('failure');
		vi.spyOn(Math, 'random').mockReturnValue(0.9);
		for (let poll = 0; poll < 2; poll++) {
			await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
			expect(figures(view)).toBe(demo);
		}
	});

	it('keeps a never-live page on its initial DEMO values across failed polls', async () => {
		liveFetch().mockRejectedValue(new Error('offline'));
		vi.spyOn(Math, 'random').mockReturnValue(0.9);
		const view = mountHero();
		const initial = figures(view);
		await settle();
		for (let poll = 0; poll < 4; poll++) {
			await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
			expect(figures(view)).toBe(initial);
			expect(stateOf(view)).toBe('failure');
		}
	});

	it('generates another example in DEMO, even during a pending initial poll', async () => {
		liveFetch().mockImplementation(() => new Promise(() => {}));
		vi.spyOn(Math, 'random').mockReturnValue(0.9);
		const view = mountHero();
		const initial = figures(view);
		expect(stateOf(view)).toBe('demo');
		expect(view.queryByTestId('hero-refresh')).toBeNull();
		await fireEvent.click(view.getByTestId('hero-regenerate'));
		await settle();
		expect(figures(view)).not.toBe(initial);
		expect(stateOf(view)).toBe('demo');
	});

	it('holds real values and their original ageing clock once, then labels DEMO, and recovers', async () => {
		const fetchKpis = liveFetch();
		const view = mountHero();
		await settle();
		const realFigures = figures(view);
		expect(stateOf(view)).toBe('live');
		expect(stateLine(view)).toHaveTextContent('Live · updated just now');

		fetchKpis.mockResolvedValue(new Response('cold', { status: 503 }));
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
		expect(stateOf(view)).toBe('held');
		expect(figures(view)).toBe(realFigures);
		expect(stateLine(view)).toHaveTextContent('Last received 50 seconds ago. New readings are not arriving.');
		await vi.advanceTimersByTimeAsync(5_000);
		expect(stateLine(view)).toHaveTextContent('Last received 55 seconds ago.');
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS - 5_000);
		expect(stateOf(view)).toBe('failure');
		expect(stateLine(view)).toHaveTextContent(heroContent.sqlPanel.failure.en);

		fetchKpis.mockImplementation(async () => Response.json(contract.examples[0].body));
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
		expect(stateOf(view)).toBe('live');
		fetchKpis.mockRejectedValue(new Error('offline'));
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
		expect(stateOf(view)).toBe('held');
	});

	it('uses the same consecutive failure budget for manual refresh and automatic polls', async () => {
		const fetchKpis = liveFetch();
		const view = mountHero();
		await settle();
		fetchKpis.mockRejectedValue(new Error('offline'));
		await fireEvent.click(view.getByTestId('hero-refresh'));
		await settle();
		expect(stateOf(view)).toBe('held');
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
		expect(stateOf(view)).toBe('failure');

		fetchKpis.mockImplementation(async () => Response.json(contract.examples[0].body));
		await fireEvent.click(view.getByTestId('hero-refresh'));
		await settle();
		expect(stateOf(view)).toBe('live');
		fetchKpis.mockRejectedValue(new Error('offline'));
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
		expect(stateOf(view)).toBe('held');
		await fireEvent.click(view.getByTestId('hero-refresh'));
		await settle();
		expect(stateOf(view)).toBe('failure');
	});

	it('a success between failures resets the budget before DEMO', async () => {
		const fetchKpis = liveFetch();
		const view = mountHero();
		await settle();
		for (const fail of [true, false, true, true]) {
			fetchKpis.mockImplementation(async () => fail
				? new Response('cold', { status: 503 })
				: Response.json(contract.examples[0].body));
			await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
			if (!fail) expect(stateOf(view)).toBe('live');
			else if (fetchKpis.mock.calls.length < 5) expect(stateOf(view)).toBe('held');
		}
		expect(stateOf(view)).toBe('failure');
	});

	it('keeps the webdriver bypass for unrelated suites and labels the example as a demonstration', async () => {
		const fetchKpis = liveFetch();
		vi.spyOn(navigator, 'webdriver', 'get').mockReturnValue(true);
		const view = mountHero();
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 2);
		expect(fetchKpis).not.toHaveBeenCalled();
		expect(stateOf(view)).toBe('demo');
		expect(stateLine(view)).toHaveTextContent('Simulated data. This is a demonstration.');
	});

	it('shares a pending poll with manual refresh so one failed request consumes one failure', async () => {
		const fetchKpis = liveFetch();
		const view = mountHero();
		await settle();
		let finish!: (response: Response) => void;
		fetchKpis.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
		await fireEvent.click(view.getByTestId('hero-refresh'));
		expect(fetchKpis).toHaveBeenCalledTimes(2);
		finish(new Response('cold', { status: 503 }));
		await settle();
		expect(stateOf(view)).toBe('held');
	});

	it('keeps initial failures labelled DEMO when no real reading exists', async () => {
		liveFetch().mockRejectedValue(new Error('offline'));
		const view = mountHero();
		await settle();
		expect(stateOf(view)).toBe('failure');
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
		expect(stateOf(view)).toBe('failure');
		expect(stateLine(view)).not.toHaveTextContent(/seconds? ago/);
	});

	it('polls while mounted and stops polling after unmount', async () => {
		vi.useFakeTimers();
		vi.spyOn(navigator, 'webdriver', 'get').mockReturnValue(false);
		vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
		const fetchKpis = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
			new Response('null', { headers: { 'Content-Type': 'application/json' } }),
		);

		const { unmount } = render(HeroBanner, {
			metroSvg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
			hero: heroContent,
			heroAnim: heroAnimContent,
			initialHeroData: INITIAL_HERO_DATA,
			bookingHref: 'https://cal.com/fixture',
		});

		expect(fetchKpis).toHaveBeenCalledExactlyOnceWith(LIVE_KPIS_URL, { cache: 'no-store' });
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 2);
		expect(fetchKpis).toHaveBeenCalledTimes(3);

		await unmount();
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 2);
		document.dispatchEvent(new Event('visibilitychange'));
		expect(fetchKpis).toHaveBeenCalledTimes(3);
	});
});

describe('HeroBanner Refresh', () => {
	it('says it is working, keeps the focus, then announces the new reading politely', async () => {
		const fetchKpis = liveFetch();
		const view = mountHero();
		await settle();
		let finish!: (response: Response) => void;
		fetchKpis.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
		const button = view.getByTestId('hero-refresh');
		expect(button).toHaveAccessibleName('Refresh Transit data');
		button.focus();
		await fireEvent.click(button);
		await tick();
		expect(button).toHaveAttribute('aria-disabled', 'true');
		expect(button).toHaveAccessibleName('Refreshing Transit data');
		expect(button).toHaveTextContent('Refreshing');
		expect(proof(view)).toHaveAttribute('aria-busy', 'true');
		expect(document.activeElement).toBe(button);
		// A second press while it asks sends nothing more.
		await fireEvent.click(button);
		expect(fetchKpis).toHaveBeenCalledTimes(2);

		finish(Response.json(contract.examples[0].body));
		await settle();
		await vi.advanceTimersByTimeAsync(100);
		expect(button).not.toHaveAttribute('aria-disabled');
		expect(proof(view)).toHaveAttribute('aria-busy', 'false');
		expect(document.activeElement).toBe(button);
		const region = view.getByTestId('hero-transit-announcement');
		expect(region).toHaveAttribute('aria-live', 'polite');
		expect(region).toHaveTextContent('Transit data refreshed, updated just now.');
		expect(stateLine(view)).toHaveTextContent('Live · updated just now');
	});

	it('keeps the last reading and says so when a refresh fails', async () => {
		const fetchKpis = liveFetch();
		const view = mountHero();
		await settle();
		const reading = figures(view);
		fetchKpis.mockRejectedValue(new Error('offline'));
		await vi.advanceTimersByTimeAsync(20_000);
		await fireEvent.click(view.getByTestId('hero-refresh'));
		await settle();
		await vi.advanceTimersByTimeAsync(100);
		expect(figures(view)).toBe(reading);
		const words = 'Could not refresh. Still showing the reading from 25 seconds ago. Try again.';
		expect(stateLine(view)).toHaveTextContent(words);
		expect(view.getByTestId('hero-transit-announcement')).toHaveTextContent(words);
	});

	it('says the demonstration stays when a refresh fails without live data', async () => {
		const fetchKpis = liveFetch();
		fetchKpis.mockRejectedValue(new Error('offline'));
		const view = mountHero('fr');
		await settle();
		expect(stateOf(view)).toBe('failure');
		await fireEvent.click(view.getByTestId('hero-refresh'));
		await settle();
		await vi.advanceTimersByTimeAsync(100);
		const words = 'Actualisation impossible. Les données en direct sont toujours indisponibles; la démonstration reste affichée. Réessayez.';
		expect(stateLine(view)).toHaveTextContent(words);
		expect(view.getByTestId('hero-transit-announcement')).toHaveTextContent(words);
	});

	it('clears a failed refresh once a new reading arrives', async () => {
		const fetchKpis = liveFetch();
		const view = mountHero();
		await settle();
		fetchKpis.mockRejectedValue(new Error('offline'));
		await fireEvent.click(view.getByTestId('hero-refresh'));
		await settle();
		expect(stateLine(view)).toHaveTextContent('Could not refresh.');
		fetchKpis.mockImplementation(async () => Response.json(contract.examples[0].body));
		await vi.advanceTimersByTimeAsync(LIVE_POLL_MS);
		expect(stateLine(view)).toHaveTextContent('Live · updated just now');
	});
});

it.each([
	['en', 'Live data is unavailable. Showing a demonstration.'],
	['fr', 'Les données en direct sont indisponibles. Une démonstration est affichée.'],
	['es', 'Los datos en vivo no están disponibles. Se muestra una demostración.'],
])('%s describes the displayed demonstration as a status', async (locale, message) => {
	liveFetch().mockRejectedValue(new Error('offline'));
	const view = mountHero(locale);
	await settle();
	expect(stateLine(view)).toHaveTextContent(message);
});
