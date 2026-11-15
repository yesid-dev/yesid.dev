export const shared = /^(?:led-pulse|pulse-glow|blink-light|terminal-blink|station-ping|gradient-flow)(?:-|$)/;

type WeatherMotionRules = {
 card: string;
 scene: string;
 loops: Record<string, string>;
 finite: Record<string, string>;
 transitions: Record<string, string>;
};

// Exact source selectors from weather/weather-scene.css and AboutWeather.svelte.
// Serializable data is shared by the browser animation and computed-style scans.
export const weatherMotionRules: WeatherMotionRules = {
 card: '[data-testid="about-weather"].weather-card',
 scene: '.wx.weather-scene',
 loops: {
  'weather-drift-l': 'div.wx-cloud-layer',
  'weather-drift-r': 'div.wx-cloud-layer.wx-ltr',
  'weather-gust': 'div.wx-cloud-gust.wx-gusty',
  'weather-fall': '.wx-precip > svg',
  'weather-haze': 'div.wx-fogbank',
  'weather-flash': 'div.wx-flash',
  'weather-zap': 'svg.wx-bolt'
 },
 finite: {
  'wx-place-in': 'svg.wx-place.wx-place-enter',
  'wx-place-out': 'svg.wx-place.wx-place-exit'
 },
 transitions: {
  opacity: '.wx.weather-scene',
  'background-color': '[data-testid="about-weather"].weather-card',
  color: '[data-testid="about-weather"].weather-card'
 }
};

export function readRunningAnimations(rules: WeatherMotionRules) {
 const describe = (el: Element | null) => el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.getAttribute('data-slot') ? '[data-slot=' + el.getAttribute('data-slot') + ']' : ''}.${el.getAttribute('class') ?? ''}` : 'unknown';
 return document.getAnimations().filter(a => a.playState === 'running').map(a => {
  const effect = a.effect as KeyframeEffect | null;
  const target = effect?.target as Element | null;
  const name = a instanceof CSSAnimation ? a.animationName.replace(/^svelte-[^-]+-/, '') : a instanceof CSSTransition ? `transition:${a.transitionProperty}` : 'WebAnimation';
  const property = a instanceof CSSTransition ? a.transitionProperty : '';
  const loop = effect?.getTiming().iterations === Infinity;
  const card = target?.closest(rules.card);
  const scene = target?.closest(rules.scene);
  const inScene = Boolean(card && scene?.closest(rules.card) === card);
  const loopTarget = Object.hasOwn(rules.loops, name) ? rules.loops[name] : '';
  const finiteTarget = Object.hasOwn(rules.finite, name) ? rules.finite[name] : '';
  const transitionTarget = Object.hasOwn(rules.transitions, property) ? rules.transitions[property] : '';
  const weatherLoop = Boolean(!effect?.pseudoElement && inScene && a instanceof CSSAnimation && loopTarget && target?.matches(loopTarget));
  const weatherTransition = Boolean(effect?.getTiming().iterations === 1 && !effect?.pseudoElement && card && (
   (inScene && a instanceof CSSAnimation && finiteTarget && target?.matches(finiteTarget)) ||
   (a instanceof CSSTransition && (inScene || target === card) && transitionTarget && target?.matches(transitionTarget))
  ));
  // The retained closing scene follows scroll; it can still be settling when sampled.
  const closingTransition = Boolean(target?.closest('[data-testid="closer-section"]') && (
   (property === 'height' && target.matches('.construction-extension, .closer-beam')) ||
   (property === 'translate' && target.matches('[data-slot="closer-floodlight"]')) ||
   (property === 'scale' && target.matches('.closer-beam')) ||
   (property === 'transform' && target.matches('[data-construction-prop] > svg'))
  ));
  return { name, loop, target: describe(target), closingTransition, weatherLoop, weatherTransition, weatherCard: Boolean(card), shared: Boolean(target?.closest('[data-slot="stop-label"], [data-slot="error-page"], [data-testid="footer"], [data-slot="terminal-panel"], [data-slot="metro-station"], [data-slot="separator"]')) };
 });
}

type Motion = ReturnType<typeof readRunningAnimations>[number];
export const unexpectedLoops = (records: readonly Motion[]) => records.filter(a => a.loop && !(shared.test(a.name) && a.shared) && !a.weatherLoop);
export const unexpectedFinite = (records: readonly Motion[]) => records.filter(a => !a.loop && !a.closingTransition && !a.weatherTransition && (a.weatherCard || !['draw', 'post-swing', 'board-settle', 'transition:opacity'].includes(a.name)));
