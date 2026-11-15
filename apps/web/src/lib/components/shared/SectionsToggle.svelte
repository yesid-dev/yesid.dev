<script lang="ts">
	import { SectionsToggle as UiSectionsToggle } from '@yesid/ui/brand';
	import { localeCopy } from '#lib/locales/index.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	let {
		class: className = '',
		activeEffect = 'glow',
	}: {
		class?: string;
		/** `none` drops the glow once every section is closed (editorial pages, D21: no glow). */
		activeEffect?: 'glow' | 'none';
	} = $props();
	const locale = getLocale();
</script>

<UiSectionsToggle copy={localeCopy[locale].sections} {activeEffect} class={className} />
