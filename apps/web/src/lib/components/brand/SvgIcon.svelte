<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { BlogAnimation } from '#lib/types.ts';
	// Brief drawing and user-triggered path morphing stay active unless the caller asks for the
	// still form (`still`), such as a service drawing under reduced motion.
	import { initScrollTriggerConfig, loadDrawSVG, loadMorphSVG } from '@yesid/motion/utils/gsap';
	import { morphHover } from '#lib/motion/actions/morphHover.ts';
	import { convertSvgToMorphPaths } from '#lib/motion/utils/morphHelpers.ts';
	import { playSvgEntrance } from '#lib/motion/utils/svgEntrance.ts';
	import { cn } from '@yesid/ui/cn';

	let {
		svgContent,
		animation = 'draw-fill' as BlogAnimation,
		size = 48,
		trigger = 'load' as 'load' | 'scroll',
		hovered = false,
		still = false,
		class: className,
		...rest
	}: {
		svgContent: string;
		animation?: BlogAnimation;
		size?: number;
		trigger?: 'load' | 'scroll';
		hovered?: boolean;
		/** The still form: no entrance and no morph; the drawing stands as drawn. Default: false. */
		still?: boolean;
		class?: string;
		[key: string]: unknown;
	} = $props();

	let container: HTMLDivElement;
	let entranceDone = $state(false);
	let entrance: gsap.core.Timeline | undefined;
	// Set on destroy, so an instance replaced while its plugins load never starts its entrance.
	let disposed = false;

	onMount(async () => {
		if (!container || still) return;
		// Entrance variants use DrawSVG, and shapes convert through MorphSVG.
		await Promise.all([loadDrawSVG(), loadMorphSVG()]);
		// The component may have been destroyed or replaced while awaiting (tests mount and
		// unmount rapidly; a caller remounts it on a motion change). Re-check before animating.
		if (disposed || !container) return;
		initScrollTriggerConfig();

		const svg = container.querySelector('svg');
		if (!svg) return;

		const { paths } = convertSvgToMorphPaths(svg);
		if (paths.length === 0) return;

		entrance = playSvgEntrance(paths, {
			animation,
			scrollTrigger: trigger === 'scroll' ? { trigger: container, start: 'top 80%', once: true } : undefined,
			onComplete: () => {
				entranceDone = true;
			},
		});
	});

	onDestroy(() => {
		disposed = true;
		entrance?.kill();
	});
</script>

<div
	bind:this={container}
	data-slot="svg-icon"
	class={cn(
		'flex items-center justify-center overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] transition-border-color duration-300',
		className
	)}
	style="--svg-icon-size: {size}px; width: var(--svg-icon-size); height: var(--svg-icon-size);"
	aria-hidden="true"
	role="presentation"
	use:morphHover={{ enabled: entranceDone && !still, hovered }}
	data-still={still ? '' : undefined}
	{...rest}
>
	{@html svgContent}
</div>
