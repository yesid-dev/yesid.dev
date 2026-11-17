<script lang="ts">
	let { text }: { text: string } = $props();

	const title = $derived(text.trimEnd());
	const lastWord = $derived(/\S+$/.exec(title)?.[0] ?? '');
	const lastLetter = $derived(/\P{M}\p{M}*$/u.exec(lastWord)?.[0] ?? lastWord);
	const start = $derived(title.slice(0, title.length - lastWord.length));
	const wordStart = $derived(lastWord.slice(0, lastWord.length - lastLetter.length));
</script>

{#if title}{start}<span class="word" data-slot="dotted-title-word"
	>{wordStart}<span class="tail">{lastLetter}<span class="dot" data-slot="title-dot">.</span></span></span
>{/if}

<style>
	/* Move the whole word and dot to the next line when they run out of room. */
	.word {
		display: inline-block;
		max-inline-size: 100%;
		overflow-wrap: anywhere;
	}

	/* Even a word wider than the whole column takes the dot with its final letter. */
	.tail {
		white-space: nowrap;
	}

	.dot {
		color: var(--primary);
	}
</style>
