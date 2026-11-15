import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { readRunningAnimations, weatherMotionRules, unexpectedLoops, unexpectedFinite } from './_support/motion-inventory';
const scene = `<style>@keyframes policy-loop {from{height:10px}to{height:30px}} section>*{width:10px;height:10px}</style><section data-testid="closer-section"><div class="construction-extension"></div><div data-slot="closer-floodlight"></div><div class="closer-beam"></div><span data-construction-prop="fixture"><svg width="10" height="10"></svg></span></section>`;

test('infinite animations on every kept closing target are rejected', async ({ page }, info) => {
 await page.setContent(scene);
 await page.evaluate(() => {
  for (const el of document.querySelectorAll<HTMLElement | SVGElement>('.construction-extension,[data-slot="closer-floodlight"],.closer-beam,svg')) el.style.animation = 'policy-loop 10s linear infinite';
 });
 await expect.poll(async () => unexpectedLoops(await page.evaluate(readRunningAnimations, weatherMotionRules)).length).toBe(4);
 const rejected = unexpectedLoops(await page.evaluate(readRunningAnimations, weatherMotionRules));
 expect(rejected.every(a => a.loop && !a.closingTransition)).toBe(true);
 const path = info.outputPath('infinite-rejection.json');
 writeFileSync(path, JSON.stringify(rejected, null, 2));
 await info.attach('rejected-infinite', { path, contentType: 'application/json' });
});

test('unrelated transitions fail on the same targets while named scroll transitions pass', async ({ page }, info) => {
 await page.setContent(scene);
 await page.evaluate(() => {
  const nodes = [...document.querySelectorAll<HTMLElement | SVGElement>('.construction-extension,[data-slot="closer-floodlight"],.closer-beam,svg')];
  for (const el of nodes) {
   el.style.transition = 'none';
   el.style.width = '10px'; el.style.height = '10px'; el.style.translate = '0px'; el.style.scale = '1'; el.style.transform = 'translateY(0px)';
  }
  // Settle fixture initial values before enabling the transitions under test.
  document.body.getBoundingClientRect();
  for (const el of nodes) el.style.transition = 'width 10s linear,height 10s linear,translate 10s linear,scale 10s linear,transform 10s linear';
  document.body.getBoundingClientRect();
  for (const el of nodes) el.style.width = '30px';
  nodes[0].style.height = '30px'; nodes[1].style.translate = '1px'; nodes[2].style.height = '30px'; nodes[2].style.scale = '1.2'; nodes[3].style.transform = 'translateY(1px)';
 });
 await expect.poll(async () => unexpectedFinite(await page.evaluate(readRunningAnimations, weatherMotionRules)).length).toBe(4);
 const records = await page.evaluate(readRunningAnimations, weatherMotionRules);
 const rejected = unexpectedFinite(records);
 expect(rejected.every(a => a.name === 'transition:width' && !a.closingTransition && !a.loop)).toBe(true);
 expect(records.filter(a => a.closingTransition)).toHaveLength(5);
 const path = info.outputPath('transition-policy.json');
 writeFileSync(path, JSON.stringify({ rejected, allowed: records.filter(a => a.closingTransition) }, null, 2));
 await info.attach('rejected-unrelated', { path, contentType: 'application/json' });
});
const weatherScene = `<style>
@keyframes wx-place-in {from{opacity:0}to{opacity:1}}
@keyframes wx-place-out {from{opacity:1}to{opacity:0}}
@keyframes weather-fall {from{transform:translateY(0)}to{transform:translateY(10px)}}
@keyframes policy-loop {from{height:10px}to{height:20px}}
svg,.wx,.wx-sky,.wx-veil{width:20px;height:20px}.weather-card{background-color:rgb(10,10,10);color:rgb(10,10,10)}
</style><section class="weather-card" data-testid="about-weather"><div class="wx weather-scene"><svg class="wx-place wx-place-enter"></svg><svg class="wx-place wx-place-exit"></svg><div class="wx-sky"></div><div class="wx-veil"></div><div class="wx-precip"><svg></svg></div></div></section><svg data-outside class="wx-place wx-place-enter"></svg><div class="wx weather-scene"><div class="wx-precip"><svg data-outside-loop></svg></div></div>`;

test('only source-named finite weather effects pass on their exact card targets', async ({ page }, info) => {
 await page.setContent(weatherScene);
 await page.evaluate(() => {
  document.querySelector<SVGElement>('.wx-place-enter')!.style.animation = 'wx-place-in 10s linear';
  document.querySelector<SVGElement>('.wx-place-exit')!.style.animation = 'wx-place-out 10s linear';
  const card = document.querySelector<HTMLElement>('.weather-card')!, scene = card.querySelector<HTMLElement>('.wx')!;
  scene.style.opacity = '0.2';
  document.body.getBoundingClientRect();
  scene.style.transition = 'opacity 10s linear';
  card.style.transition = 'background-color 10s linear,color 10s linear';
  scene.style.opacity = '0.8'; card.style.backgroundColor = 'rgb(240,240,240)'; card.style.color = 'rgb(240,240,240)';
 });
 await expect.poll(async () => (await page.evaluate(readRunningAnimations, weatherMotionRules)).filter(a => a.weatherTransition).length).toBe(5);
 const records = await page.evaluate(readRunningAnimations, weatherMotionRules);
 expect(unexpectedFinite(records)).toEqual([]);
 expect(unexpectedLoops(records)).toEqual([]);
 expect(records.map(a => a.name).sort()).toEqual(['wx-place-in','wx-place-out','transition:opacity','transition:background-color','transition:color'].sort());
 const path = info.outputPath('weather-finite-allowlist.json');
 writeFileSync(path, JSON.stringify(records, null, 2));
 await info.attach('weather-finite-allowlist', { path, contentType: 'application/json' });
});

test('infinite weather-card decoration fails even with a finite effect name or a loop name on the wrong target', async ({ page }, info) => {
 await page.setContent(weatherScene);
 await page.evaluate(() => {
  document.querySelector<SVGElement>('.wx-place-enter')!.style.animation = 'wx-place-in 10s linear infinite';
  document.querySelector<SVGElement>('.wx-place-exit')!.style.animation = 'weather-fall 10s linear infinite';
  document.querySelector<HTMLElement>('.wx-sky')!.style.animation = 'policy-loop 10s linear infinite';
  document.querySelector<SVGElement>('.wx-precip > svg')!.style.animation = 'weather-fall 10s linear infinite';
  document.querySelector<SVGElement>('[data-outside-loop]')!.style.animation = 'weather-fall 10s linear infinite';
 });
 await expect.poll(async () => unexpectedLoops(await page.evaluate(readRunningAnimations, weatherMotionRules)).length).toBe(4);
 const records = await page.evaluate(readRunningAnimations, weatherMotionRules), rejected = unexpectedLoops(records);
 expect(rejected.every(a => a.loop && !a.weatherTransition && !a.weatherLoop)).toBe(true);
 expect(rejected.map(a => a.name).sort()).toEqual(['wx-place-in','weather-fall','weather-fall','policy-loop'].sort());
 expect(records.filter(a => a.weatherLoop)).toHaveLength(1);
 const path = info.outputPath('weather-infinite-rejection.json');
 writeFileSync(path, JSON.stringify({ rejected, allowed: records.filter(a => a.weatherLoop) }, null, 2));
 await info.attach('weather-infinite-rejection', { path, contentType: 'application/json' });
});

test('weather names outside the card and repeating or unrelated finite effects still fail', async ({ page }, info) => {
 await page.setContent(weatherScene);
 await page.evaluate(() => {
  document.querySelector<SVGElement>('.wx .wx-place-enter')!.style.animation = 'policy-loop 10s linear';
  document.querySelector<SVGElement>('.wx .wx-place-exit')!.style.animation = 'wx-place-out 10s linear 2';
  document.querySelector<SVGElement>('[data-outside]')!.style.animation = 'wx-place-in 10s linear';
  const scene = document.querySelector<HTMLElement>('.wx')!, sky = scene.querySelector<HTMLElement>('.wx-sky')!, veil = scene.querySelector<HTMLElement>('.wx-veil')!;
  sky.style.animation = 'wx-place-out 10s linear'; veil.style.opacity = '0.2';
  document.body.getBoundingClientRect();
  scene.style.transition = 'width 10s linear'; veil.style.transition = 'opacity 10s linear';
  scene.style.width = '30px'; veil.style.opacity = '0.8';
 });
 await expect.poll(async () => unexpectedFinite(await page.evaluate(readRunningAnimations, weatherMotionRules)).length).toBe(6);
 const rejected = unexpectedFinite(await page.evaluate(readRunningAnimations, weatherMotionRules));
 expect(rejected.every(a => !a.weatherTransition && !a.loop)).toBe(true);
 expect(rejected.map(a => a.name).sort()).toEqual(['policy-loop','wx-place-in','wx-place-out','wx-place-out','transition:width','transition:opacity'].sort());
 const path = info.outputPath('weather-finite-rejection.json');
 writeFileSync(path, JSON.stringify(rejected, null, 2));
 await info.attach('weather-finite-rejection', { path, contentType: 'application/json' });
});
