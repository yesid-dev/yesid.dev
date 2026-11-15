<script lang="ts">
	import SectionsToggle from './SectionsToggle.svelte';
	import { CollapsibleSection } from '@yesid/ui/brand';
	let { count = 2, activeEffect }: { count?: number; activeEffect?: 'glow' | 'none' } = $props();
</script>
<SectionsToggle {activeEffect} />
{#each Array.from({ length: count }) as _, index}
	<CollapsibleSection title={`Section ${index + 1}`} anchor={`section-${index}`} open={true}>
		<p>Body {index + 1}</p>
	</CollapsibleSection>
{/each}
