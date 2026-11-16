// Station selection travels in the URL; only explicit tab clicks write it and mount restores its scroll target.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { serviceFactory } from '../../../tests/factories';

// --- mocks ---
// vi.mock factories are hoisted above the module body, so any state they close
// over must be created via vi.hoisted (also hoisted) to avoid a TDZ error. Each
// test mutates the `mocks` holder (url / gotoFn / lenis) before rendering.
const mocks = vi.hoisted(() => ({
	url: new URL('http://localhost/services'),
	gotoFn: ((..._a: unknown[]) => {}) as (...a: unknown[]) => void,
	lenis: null as { scrollTo: (...a: unknown[]) => void } | null,
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mocks.gotoFn(...args),
}));
vi.mock('$app/state', () => ({
	page: { get url() { return mocks.url; } },
}));
vi.mock('@yesid/motion/utils/lenis', () => ({
	getLenis: () => mocks.lenis,
}));

const gotoMock = vi.fn();
const scrollToMock = vi.fn();

import ServiceListingPage from './ServiceListingPage.svelte';

const services = [
	serviceFactory.build({ id: 'database-engineering', station: 1, visible: true }),
	serviceFactory.build({ id: 'data-pipeline', station: 2, visible: true }),
	serviceFactory.build({ id: 'web-development', station: 3, visible: true }),
];

const renderProps = {
	services,
	serviceSvgContents: Object.fromEntries(services.map((s) => [s.id, ''])),
};

const stations = () => screen.getAllByTestId(/^station-tab-/);

function renderPage() {
	return render(ServiceListingPage, { props: renderProps });
}

beforeEach(() => {
	gotoMock.mockClear();
	scrollToMock.mockClear();
	mocks.gotoFn = gotoMock;
	mocks.lenis = { scrollTo: scrollToMock };
	mocks.url = new URL('http://localhost/services');
});
afterEach(() => cleanup());

describe('ServiceListingPage station (slice-34.5)', () => {
	it('updates related projects from a small visible portion without writing a passive URL', async () => {
		const original = globalThis.IntersectionObserver;
		const observers: { callback: IntersectionObserverCallback; targets: Element[] }[] = [];
		globalThis.IntersectionObserver = class {
			row: (typeof observers)[number];
			constructor(callback: IntersectionObserverCallback) {
				this.row = { callback, targets: [] };
				observers.push(this.row);
			}
			observe(element: Element) { this.row.targets.push(element); }
			disconnect() {}
		} as unknown as typeof IntersectionObserver;
		try {
			render(ServiceListingPage, { props: {
				...renderProps,
			} });
			const target = document.getElementById('service-data-pipeline')!;
			const observer = observers.find(row => row.targets.includes(target))!;
			observer.callback([{
				target, isIntersecting: true, intersectionRatio: 0.001,
				boundingClientRect: target.getBoundingClientRect(),
				intersectionRect: new DOMRect(0, 0, 100, 1), rootBounds: null, time: 0,
			}], {} as IntersectionObserver);
			await Promise.resolve();
			expect(screen.getByTestId('station-tab-data-pipeline')).toHaveAttribute('aria-current', 'true');
			expect(gotoMock).not.toHaveBeenCalled();
		} finally {
			cleanup();
			globalThis.IntersectionObserver = original;
		}
	});

	it('handles an empty supplied station set', () => {
		render(ServiceListingPage, { props: { services: [], serviceSvgContents: {} } });
		expect(screen.queryAllByTestId(/^station-tab-/)).toEqual([]);
		expect(gotoMock).not.toHaveBeenCalled();
	});

	it('renders the listing page', () => {
		renderPage();
		expect(screen.getByTestId('service-listing-page')).toBeInTheDocument();
	});

	it('writes ?station=<id> while preserving scroll and moves focus to the service title', async () => {
		renderPage();
		// StationTabs (mode="scroll") renders each station as an in-page link; click the
		// second one and assert the URL write contract.
		const tabs = stations();
		expect(tabs.length).toBe(services.length);
		tabs[1]!.focus();
		await fireEvent.click(tabs[1]!); // data-pipeline

		expect(gotoMock).toHaveBeenCalledTimes(1);
		const [url, opts] = gotoMock.mock.calls[0]!;
		expect(String(url)).toContain('station=data-pipeline');
		expect(opts).toMatchObject({ replaceState: true, reset: false });
		await vi.waitFor(() => expect(document.activeElement).toBe(document.getElementById('svc-title-data-pipeline')));
	});

	it('triggers the Lenis-aware scroll on an explicit tab click', async () => {
		// The clicked station's viewport must exist for querySelector to find it.
		renderPage();
		const tabs = stations();
		await fireEvent.click(tabs[2]!); // web-development
		// ServiceCard renders #service-<id>; the scroll targets that element.
		expect(scrollToMock).toHaveBeenCalledTimes(1);
	});

	it('does NOT write the URL from the IntersectionObserver scroll-spy', () => {
		// The IO is stubbed to a no-op in setup.dom.ts, so it never fires here — but
		// the contract is that ONLY handleTabSelect writes. A bare mount (no click)
		// must leave goto untouched even though the IO has observed the viewports.
		renderPage();
		expect(gotoMock).not.toHaveBeenCalled();
	});

	it('deep-link: a present ?station=<id> scrolls to that station on mount', async () => {
		mocks.url = new URL('http://localhost/services?station=web-development');
		renderPage();
		// onMount awaits a tick before scrolling — flush the microtask queue.
		await Promise.resolve();
		await Promise.resolve();
		expect(scrollToMock).toHaveBeenCalledTimes(1);
		// No URL write on a deep-link mount (the param is already there).
		expect(gotoMock).not.toHaveBeenCalled();
	});

	it('deep-link: an unknown ?station= id is ignored (no scroll, no crash)', async () => {
		mocks.url = new URL('http://localhost/services?station=archived-station');
		renderPage();
		await Promise.resolve();
		await Promise.resolve();
		expect(scrollToMock).not.toHaveBeenCalled();
	});

	it('falls back to scrollIntoView when Lenis is unavailable', async () => {
		mocks.lenis = null;
		renderPage();
		const tabs = stations();
		const target = document.querySelector<HTMLElement>('#service-web-development');
		expect(target, 'station viewport must render').not.toBeNull();
		const intoView = vi.fn();
		target!.scrollIntoView = intoView;
		await fireEvent.click(tabs[2]!); // web-development
		expect(intoView).toHaveBeenCalledTimes(1);
		expect(scrollToMock).not.toHaveBeenCalled();
	});
});

describe('ServiceListingPage composition (D-M5)', () => {
	it('titles the page "Services." on the left rail, as its one h1', () => {
		renderPage();
		const title = screen.getByRole('heading', { level: 1 });
		expect(title.textContent?.replace(/\s+/g, '')).toBe('Services.');
		expect(title.closest('[data-slot="rail-title"]')).toHaveAttribute('data-side', 'left');
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
	});

	it('lists four alike interactive cards in the CMS order, without counters', () => {
		renderPage();
		const items = screen.getAllByRole('listitem').filter((item) => item.id.startsWith('service-'));
		expect(items.map((item) => item.id)).toEqual(services.map((service) => `service-${service.id}`));
		for (const item of items) expect(item.querySelector('[data-slot="card"]')).toHaveAttribute('data-interactive', 'true');
		expect(document.body.textContent).not.toMatch(/Service\s*\d+\s*\/\s*\d+/i);
	});

	it('ends with the closing band, with one divider between the sections and none after the band', () => {
		renderPage();
		const sections = document.querySelectorAll('[data-slot="page-section"]');
		expect(sections).toHaveLength(2);
		const band = screen.getByTestId('services-cta');
		expect(sections[1]).toBe(band);
		expect(band).toHaveAttribute('data-register', 'expressive');
		expect(screen.getByTestId('services-cta-band-contact')).toBeInTheDocument();
		const dividers = document.querySelectorAll('[data-slot="page-section-boundary"]');
		expect(dividers).toHaveLength(1);
		expect(dividers[0].nextElementSibling).toBe(band);
		expect(band.nextElementSibling, 'nothing follows the last section before the footer').toBeNull();
	});
});
