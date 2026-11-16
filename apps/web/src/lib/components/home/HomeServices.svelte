<script lang="ts">
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { orderServices } from '#lib/utils/station.ts';
	import { pressBounce } from '@yesid/motion/actions';
	import ServiceCard from '../services/ServiceCard.svelte';
	import type { Service, ServicesGridContent } from '#lib/types.ts';

	const locale = getLocale();
	let { servicesGrid, services, serviceSvgContents = {} }: {
		servicesGrid: ServicesGridContent;
		services: readonly Service[];
		serviceSvgContents?: Record<string, string>;
	} = $props();
	const orderedServices = $derived(orderServices(services));
	const viewAllLink = $derived(resolveLocale(servicesGrid.viewAllLink, locale));
</script>

<section data-testid="services-section" class="services-section relative">
	<ul class="services-grid grid grid-cols-1 gap-5 lg:grid-cols-2" data-ripple-exempt>
		{#each orderedServices as service (service.id)}
			<ServiceCard {service} svgContent={serviceSvgContents[service.id] ?? ''} headingLevel={3} responsive />
		{/each}
	</ul>
	<div data-testid="services-viewall" class="services-viewall">
		<a href={localizeHref('/services', locale)} use:pressBounce>{viewAllLink}</a>
	</div>
</section>

<style>
	.services-section { padding: 0 var(--space-page-x) var(--space-section-y); }
	.services-grid { margin: 0; padding: 0; }
	@media (--desktop-min) {
		.services-section { padding-inline: 0; }
	}
	.services-viewall {
		display: flex;
		justify-content: flex-end;
		margin-top: 2rem;
	}

	/* An orange text link (base.css styles class-less links), a 44px target. */
	.services-viewall :global(a) {
		display: inline-flex;
		align-items: center;
		min-height: var(--size-tap-min);
	}

</style>
