import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { gsap } from '@yesid/motion/utils/gsap';
import ServiceSvgPanel from './ServiceSvgPanel.svelte';

describe('ServiceSvgPanel', () => {
	it('renders with data-testid', () => {
		render(ServiceSvgPanel, { props: { svgContent: '<svg></svg>' } });
		expect(screen.getByTestId('service-svg-panel')).toBeTruthy();
	});

	it('renders SvgIcon when svgContent is provided', () => {
		render(ServiceSvgPanel, {
			props: { svgContent: '<svg><circle r="10"/></svg>' }
		});
		expect(screen.getByTestId('service-svg-panel').querySelector('[data-slot="svg-icon"]')).toBeTruthy();
	});

	it('renders CornerMarks', () => {
		render(ServiceSvgPanel, { props: { svgContent: '<svg></svg>' } });
		expect(screen.getByTestId('service-svg-panel').querySelector('[data-slot="corner-marks"]')).toBeTruthy();
	});

	it('does not render when svgContent is empty', () => {
		render(ServiceSvgPanel, { props: { svgContent: '' } });
		expect(screen.queryByTestId('service-svg-panel')).toBeNull();
	});

	it('applies variant="banner" class for mobile layout', () => {
		render(ServiceSvgPanel, {
			props: { svgContent: '<svg></svg>', variant: 'banner' }
		});
		const el = screen.getByTestId('service-svg-panel');
		expect(el.classList.contains('svg-panel--banner')).toBe(true);
	});

	it('round 5 — the svg markup itself renders inside the icon slot', () => {
		render(ServiceSvgPanel, {
			props: { svgContent: '<svg data-fun-art><circle r="10"/></svg>' }
		});
		const slot = screen
			.getByTestId('service-svg-panel')
			.querySelector('[data-slot="svg-icon"]');
		expect(slot?.querySelector('svg[data-fun-art] circle')).toBeTruthy();
	});

	it('round 5 — the art wrapper is pointer-transparent (panel-wide hover morph)', () => {
		render(ServiceSvgPanel, { props: { svgContent: '<svg></svg>' } });
		const art = screen.getByTestId('service-svg-panel').querySelector('.svg-art');
		expect(art).toBeTruthy();
		expect(art?.classList.contains('pointer-events-none')).toBe(true);
	});

	it('round 6 — the panel is a tap-able button outside the a11y tree', () => {
		render(ServiceSvgPanel, { props: { svgContent: '<svg></svg>' } });
		const el = screen.getByTestId('service-svg-panel');
		expect(el.tagName).toBe('BUTTON');
		expect(el.getAttribute('type')).toBe('button');
		expect(el.getAttribute('aria-hidden')).toBe('true');
		expect(el.getAttribute('tabindex')).toBe('-1');
	});
});

describe('ServiceSvgPanel and the motion preference (reduced motion: the still form)', () => {
	const flush = () => new Promise((resolve) => setTimeout(resolve));
	const QUERY = '(prefers-reduced-motion: reduce)';
	let reduce = false;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();

	/** A controllable prefers-reduced-motion; other queries keep happy-dom's answer. */
	function stubMotion(initial: boolean) {
		reduce = initial;
		listeners.clear();
		const native = window.matchMedia.bind(window);
		vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
			if (query !== QUERY) return native(query);
			return {
				get matches() { return reduce; },
				media: QUERY,
				onchange: null,
				addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
				removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: () => false,
			} as unknown as MediaQueryList;
		});
	}

	function setMotion(next: boolean) {
		reduce = next;
		flushSync(() => {
			for (const listener of [...listeners]) listener({ matches: next, media: QUERY } as MediaQueryListEvent);
		});
	}

	const icon = () => screen.getByTestId('service-svg-panel').querySelector<HTMLElement>('[data-slot="svg-icon"]')!;
	const entrances = () => vi.mocked(gsap.timeline).mock.calls.length;
	const morphTweens = () => vi.mocked(gsap.to).mock.calls.filter(([, vars]) => 'morphSVG' in (vars as object)).length;
	const finishEntrance = () => {
		const vars = vi.mocked(gsap.timeline).mock.calls.at(-1)![0] as { onComplete: () => void };
		flushSync(() => vars.onComplete());
	};
	const SVG = '<svg viewBox="0 0 48 48"><path d="M0 0 L10 10" /></svg>';

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('turning reduced motion off brings back the draw-in and the hover and tap morphs', async () => {
		stubMotion(true);
		render(ServiceSvgPanel, { props: { svgContent: SVG } });
		await flush();
		expect(icon()).toHaveAttribute('data-still', '');
		expect(entrances(), 'the still form never draws in').toBe(0);

		setMotion(false);
		await flush();
		expect(icon()).not.toHaveAttribute('data-still');
		expect(entrances(), 'the remounted drawing draws in').toBe(1);
		finishEntrance();
		await fireEvent.click(screen.getByTestId('service-svg-panel'));
		await flush();
		expect(morphTweens(), 'a tap morphs again').toBeGreaterThan(0);
	});

	it('turning reduced motion on during the entrance cancels it and holds the drawing still', async () => {
		stubMotion(false);
		render(ServiceSvgPanel, { props: { svgContent: SVG } });
		await flush();
		expect(entrances()).toBe(1);
		const running = vi.mocked(gsap.timeline).mock.results[0]!.value as { kill: ReturnType<typeof vi.fn> };
		running.kill.mockClear();

		setMotion(true);
		await flush();
		expect(running.kill, 'the running entrance is cancelled').toHaveBeenCalled();
		expect(icon()).toHaveAttribute('data-still', '');
		await fireEvent.click(screen.getByTestId('service-svg-panel'));
		await flush();
		expect(entrances(), 'nothing restarts').toBe(1);
		expect(morphTweens(), 'a tap no longer morphs').toBe(0);
	});

	it('turning reduced motion on while the plugins load never starts the replaced drawing', async () => {
		stubMotion(false);
		render(ServiceSvgPanel, { props: { svgContent: SVG } });
		// The first instance is still awaiting its plugins: switch before they resolve.
		setMotion(true);
		await flush();
		await flush();
		expect(entrances(), 'the replaced instance does not start its entrance').toBe(0);
		expect(icon()).toHaveAttribute('data-still', '');
	});
});
