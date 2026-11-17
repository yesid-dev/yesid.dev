<script lang="ts">
	let { text }: { text: string } = $props();

	const title = $derived(text.trimEnd());
	const lastLetter = $derived(/\P{M}\p{M}*$/u.exec(title)?.[0] ?? title);
	const start = $derived(title.slice(0, title.length - lastLetter.length));
</script>

{#if title}{start}<span class="tail">{lastLetter}<span class="dot" data-slot="title-dot">.</span></span>{/if}

<style>
	/* Keep the mark with the last letter, even when a narrow column splits a word. */
	.tail {
		white-space: nowrap;
	}

	.dot {
		color: var(--primary);
	}
</style>
