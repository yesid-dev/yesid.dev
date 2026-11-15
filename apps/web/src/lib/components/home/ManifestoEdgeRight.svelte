<script lang="ts">
 let { lat, lng, src, via, dst, node }: { lat: string; lng: string; src: string; via: string; dst: string; node: string; status?: string } = $props();
 // Existing CMS readouts contain a field prefix and an optional province suffix.
 const place = (value: string) => value.replace(/^\S+\s+/, '').split(',')[0].trim();
 const route = $derived([src, via, dst, node].map(place).join(' · '));
</script>

<div data-testid="manifesto-edge-right" class="manifesto__edge-right" aria-hidden="true" data-decorative-edge>
 <span data-testid="manifesto-edge-route" class="manifesto__coord manifesto__route">{route}</span>
 <span data-testid="manifesto-edge-full" class="manifesto__full">
  <span class="manifesto__coord">{lat}</span>
  <span class="manifesto__coord">{lng}</span>
  <span class="manifesto__separator-line"></span>
  <span class="manifesto__coord">{src}</span>
  <span class="manifesto__coord">{via}</span>
  <span class="manifesto__coord">{dst}</span>
  <span class="manifesto__separator-line"></span>
  <span class="manifesto__coord">{node}</span>
 </span>
</div>

<style>
 .manifesto__edge-right {
  position: absolute;
  top: calc(100% + 24px);
  /* Reserve the right-hand hatch/roundel column, including 16px of visual clearance. */
  right: calc(50% - 50vw + 300px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: max-content;
  max-width: calc(100vw - 16px);
  z-index: calc(var(--z-content) + 2);
 }
 .manifesto__full { display: contents; }
 .manifesto__route { display: none; }
 .manifesto__coord { font-family: var(--font-mono); font-size: 9px; line-height: 1.5; letter-spacing: 1px; color: var(--muted-foreground); text-transform: uppercase; white-space: nowrap; }
 .manifesto__separator-line { width: 24px; height: 1px; background: color-mix(in srgb, var(--primary) 20%, transparent); margin-block: 4px; }
 @media (max-height: 840px), (min-width: 641px) and (max-width: 1023px) {
  .manifesto__edge-right { display: grid; grid-template-columns: repeat(2, max-content); gap: 0 12px; }
  .manifesto__coord { line-height: 1.3; }
  .manifesto__separator-line { display: none; }
 }
 @media (min-width: 641px) and (max-width: 1023px) and (max-height: 840px) {
  .manifesto__edge-right { top: auto; right: 264px; bottom: 48px; }
 }
 @media (max-width: 640px) {
  /* The section is the containing block on phones; positioning never changes flow. */
  .manifesto__edge-right { top: auto; right: auto; bottom: 56px; left: 80px; display: flex; gap: 0; }
  .manifesto__coord { line-height: 1.3; }
  .manifesto__separator-line { display: none; }
 }
 @media (max-width: 360px) {
  .manifesto__edge-right { top: 124px; right: 8px; bottom: auto; left: auto; }
 }
 @media (max-width: 340px) {
  .manifesto__edge-right { top: 160px; right: auto; left: 0; }
 }
 @media (min-width: 360px) and (max-width: 640px) and (min-height: 880px) {
  .manifesto__edge-right { top: calc(100% + 24px); right: calc(50% - 50vw + 32px); bottom: auto; left: auto; }
 }
 @media (max-width: 360px) and (max-height: 840px) {
  /* One line fits the existing 40px gap with at least 8px above and below. */
  .manifesto__edge-right { top: -19.7px; right: 50%; bottom: auto; left: auto; transform: translateX(50%); }
  .manifesto__full { display: none; }
  .manifesto__route { display: block; }
 }
</style>
