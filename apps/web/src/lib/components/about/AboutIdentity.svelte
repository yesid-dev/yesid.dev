<!--
  About page identity card: the headshot in its gradient ring beside the page's h1 and the
  introduction. No label above the title (no eyebrow) and no glow (D-M6). A static card: it
  never reacts to the pointer. All text from the data layer via props.
-->
<script lang="ts">
	import type { AboutIdentity } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';

	const locale = getLocale();
	import { Card } from '@yesid/ui/card';
	import { variantImage } from '#lib/utils/variant-image.ts';

	let { identity }: { identity: AboutIdentity } = $props();

	const name = $derived(resolveLocale(identity.name, locale));
	const title = $derived(resolveLocale(identity.title, locale));
	const valueProp = $derived(resolveLocale(identity.valueProp, locale));
	const headshotMedia = $derived(variantImage(identity.headshot));
</script>

<Card class="relative h-full p-3" data-testid="about-identity">
	<div class="relative flex h-full flex-col justify-center">
		<div
			class="pr-1"
			data-testid="about-identity-scroll"
		>
		<div class="flex flex-col items-center justify-center gap-4 md:flex-row md:items-center md:gap-5">
			<!-- Headshot with gradient ring -->
			<div class="relative shrink-0">
				<div
					class="size-20 overflow-hidden rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] p-0.5 md:size-24"
					data-testid="about-headshot-frame"
				>
					<div class="h-full w-full overflow-hidden rounded-full">
						<img
							src={headshotMedia.src}
							srcset={headshotMedia.srcset}
							sizes="(min-width: 768px) 96px, 80px"
							width={headshotMedia.width}
							height={headshotMedia.height}
							alt={name}
							class="block h-full w-full scale-[1.08] rounded-full object-cover object-[50%_42%]"
							style="width: 100%; height: 100%; aspect-ratio: 1 / 1; object-fit: cover; object-position: 50% 42%; scale: 1.08;"
							data-testid="about-headshot"
						/>
					</div>
				</div>
			</div>

			<!-- Text block: the identity title is /about's single h1, in sentence case and reading ink. -->
			<div class="text-center md:pt-1 md:text-left">
				<h1 class="about-title">{title}</h1>
				<!-- The short orange rule under the title, kept from today. -->
				<div class="mx-auto mt-4 h-px w-10 md:mx-0" style="background: linear-gradient(90deg, var(--primary), transparent);" aria-hidden="true"></div>
				<p class="about-intro mt-4 max-w-md text-body leading-relaxed text-[var(--secondary-foreground)]">
					{valueProp}
				</p>
			</div>
		</div>
		</div>
	</div>
</Card>

<style>
	.about-title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-heading);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.01em;
		color: var(--foreground);
		text-wrap: balance;
	}

	/* Never leave ":)" alone on the last line. */
	.about-intro {
		text-wrap: pretty;
	}
</style>
