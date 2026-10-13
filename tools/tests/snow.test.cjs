'use strict';
// Dependency-free regression suite: node --test tools/tests/snow.test.cjs
// Execute the real classic snow controller; the harness provides browser primitives,
// never an alternative implementation of particle movement or accumulation.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function emitter(target = {}) {
  const events = new Map();
  target.events = events;
  target.addEventListener = (type, fn) => {
    if (!events.has(type)) events.set(type, new Set());
    events.get(type).add(fn);
  };
  target.removeEventListener = (type, fn) => events.get(type)?.delete(fn);
  target.emit = (type, extra = {}) => {
    for (const fn of [...(events.get(type) || [])]) fn.call(target, { type, target, ...extra });
  };
  return target;
}

function harness({ snow = 'none', width = 1280, height = 720, dpr = 1, hidden = false,
  reduced = false, theme = 'light', ua = 'Desktop Chrome', raf = true, canvas = true,
  contextAvailable = true, seed = 12345, random = null, legacyMedia = false, storageDenied = false, computedDisplay = null } = {}) {
  let now = 0, next = 1, randomState = seed >>> 0;
  const queue = new Map(), cancelled = [], observers = [], sprites = [], mutations = [];
  const writes = [], forbidden = [], media = new Map();
  // Computed stylesheet visibility can change without inline mutation (resource load/transition).
  const computed = { display: computedDisplay };
  const store = new Map(snow === null ? [] : [['snow', snow]]);
  function mark(target, type = 'attributes', attributeName = 'style') {
    mutations.push({ target, type, attributeName });
  }
  function canvasContext(owner) {
    const counts = Object.create(null), paths = [];
    let current = [], draws = [], rotations = [], translations = [];
    const ctx = { counts, paths, get draws() { return draws; }, get rotations() { return rotations; }, get translations() { return translations; } };
    const count = name => { counts[name] = (counts[name] || 0) + 1; };
    for (const name of ['save', 'restore', 'scale', 'translate', 'setTransform', 'resetTransform',
      'fillRect', 'strokeRect', 'clip']) ctx[name] = (...args) => { count(name); ctx[name + 'Last'] = args; if (name === 'translate') translations.push(args); };
    ctx.clearRect = (...args) => { count('clearRect'); draws = []; rotations = []; translations = []; ctx.clearRectLast = args; };
    ctx.beginPath = () => { count('beginPath'); current = []; };
    for (const name of ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'closePath']) {
      ctx[name] = (...args) => { count(name); current.push([name, ...args]); };
    }
    for (const name of ['fill', 'stroke']) ctx[name] = () => {
      count(name);
      // Retain only the latest main-bank shape, and the few cached sprite paths.
      if (owner.offscreen) paths.push(current.slice());
      else { paths.length = 0; paths.push(current.slice()); }
    };
    ctx.drawImage = (...args) => { count('drawImage'); draws.push(args); };
    ctx.rotate = angle => { count('rotate'); rotations.push(angle); };
    ctx.createLinearGradient = () => ({ addColorStop() {} });
    ctx.createRadialGradient = () => ({ addColorStop() {} });
    return ctx;
  }
  class Element {
    constructor(tag = 'div', offscreen = false) {
      emitter(this);
      this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = [];
      this.parentNode = null; this.attributes = new Map(); this.checked = false;
      this.offscreen = offscreen; this.width = 300; this.height = 150;
      const classes = new Set();
      this.classList = { contains: x => classes.has(x), add: (...xs) => xs.forEach(x => classes.add(x)),
        remove: (...xs) => xs.forEach(x => classes.delete(x)), toggle(x, force) {
          const on = force === undefined ? !classes.has(x) : !!force;
          if (on) classes.add(x); else classes.delete(x); return on;
        } };
      const style = { setProperty(name, value) { this[name] = String(value); },
        getPropertyValue(name) { return this[name] || ''; }, removeProperty(name) { delete this[name]; } };
      this.style = new Proxy(style, { set: (obj, key, value) => {
        if (obj[key] !== value) { obj[key] = value; mark(this); } return true;
      } });
      if (this.tagName === 'CANVAS') { this.ctx = canvasContext(this); }
    }
    get isConnected() { return this === document.documentElement || !!this.parentNode?.isConnected; }
    get parentElement() { return this.parentNode; }
    get childNodes() { return this.children; }
    setAttribute(key, value) {
      value = String(value); if (this.attributes.get(key) === value) return;
      this.attributes.set(key, value); if (key === 'id') this.id = value; mark(this, 'attributes', key);
    }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    removeAttribute(key) { this.attributes.delete(key); mark(this, 'attributes', key); }
    appendChild(child) {
      if (child.parentNode) child.remove(); this.children.push(child); child.parentNode = this;
      mark(this, 'childList', null); return child;
    }
    append(...nodes) { nodes.forEach(n => this.appendChild(n)); }
    removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; mark(this, 'childList', null); return child; }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    contains(node) { return this === node || this.children.some(n => n.contains(node)); }
    querySelectorAll(selector) {
      const result = [];
      const visit = n => n.children.forEach(child => {
        if (selector[0] === '#' ? child.id === selector.slice(1) : child.tagName === selector.toUpperCase()) result.push(child);
        visit(child);
      }); visit(this); return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    getContext() { return contextAvailable ? this.ctx : null; }
    getBoundingClientRect() { return { width: window.innerWidth, height: window.innerHeight, top: 0, left: 0 }; }
  }
  const document = emitter({ hidden, visibilityState: hidden ? 'hidden' : 'visible', readyState: 'complete' });
  document.documentElement = new Element('html');
  document.documentElement.clientWidth = width; document.documentElement.clientHeight = height;
  document.documentElement.setAttribute('data-theme', theme);
  document.head = new Element('head'); document.body = new Element('body');
  document.documentElement.append(document.head, document.body);
  document.createElement = tag => {
    const node = new Element(tag, String(tag).toLowerCase() === 'canvas');
    if (node.offscreen) sprites.push(node); return node;
  };
  document.getElementById = id => document.documentElement.querySelector('#' + id);
  document.querySelector = selector => document.documentElement.querySelector(selector);
  const add = (id, tag = 'div') => { const node = new Element(tag); node.id = id; document.body.appendChild(node); return node; };
  let surface = canvas ? add('snow', 'canvas') : null;
  if (surface) surface.style.display = snow === 'block' ? 'block' : 'none';
  add('snowSet', 'input'); add('firefliesSet', 'input');
  const localStorage = {
    getItem(key) { if (storageDenied) throw new Error('Storage denied'); return store.get(key) ?? null; },
    setItem(key, value) { if (storageDenied) throw new Error('Storage denied'); store.set(key, String(value)); writes.push([key, String(value)]); },
    removeItem(key) { store.delete(key); }
  };
  function matchMedia(query) {
    if (!media.has(query)) {
      const m = emitter({ media: query, matches: query.includes('prefers-reduced-motion') ? reduced : width <= 768 });
      m.addListener = fn => emitterAdd(m, fn);
      m.removeListener = fn => m.events.get('change')?.delete(fn);
      if (legacyMedia) { delete m.addEventListener; delete m.removeEventListener; }
      media.set(query, m);
    } return media.get(query);
  }
  function emitterAdd(m, fn) { if (!m.events.has('change')) m.events.set('change', new Set()); m.events.get('change').add(fn); }
  const forbid = name => () => { forbidden.push(name); throw new Error('Snow must not poll with ' + name); };
  const window = emitter({ document, localStorage, innerWidth: width, innerHeight: height,
    devicePixelRatio: dpr, navigator: { userAgent: ua }, matchMedia, performance: { now: () => now },
    setTimeout: forbid('setTimeout'), setInterval: forbid('setInterval'), clearTimeout() {}, clearInterval() {} });
  if (raf) {
    window.requestAnimationFrame = fn => { const id = next++; queue.set(id, fn); return id; };
    window.cancelAnimationFrame = id => { if (queue.has(id)) cancelled.push(queue.get(id)); queue.delete(id); };
  }
  const getComputedStyle = node => ({ display: node.id === 'snow' && computed.display !== null ? computed.display : node.style.display || 'block', visibility: node.style.visibility || 'visible',
    opacity: node.style.opacity ?? '1' });
  window.getComputedStyle = getComputedStyle;
  class MutationObserver {
    constructor(fn) { this.fn = fn; this.targets = new Map(); observers.push(this); }
    observe(target, options) { this.targets.set(target, options); }
    disconnect() { this.targets.clear(); }
    takeRecords() { return []; }
  }
  class ClockDate extends Date { static now() { return now; } }
  const seededMath = Object.create(Math);
  seededMath.random = random || (() => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; });
  const context = vm.createContext({ window, document, navigator: window.navigator, localStorage, console,
    MutationObserver, getComputedStyle, matchMedia, Math: seededMath, Date: ClockDate,
    performance: window.performance, requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame, setTimeout: window.setTimeout, setInterval: window.setInterval });
  window.MutationObserver = MutationObserver;
  function load() { vm.runInContext(read('source/js/modules/snow.js'), context, { filename: 'snow.js' }); }
  function flush() {
    for (let round = 0; mutations.length && round < 20; round++) {
      const records = mutations.splice(0);
      for (const observer of observers) {
        const relevant = records.filter(record => [...observer.targets].some(([target, opts]) =>
          (target === record.target || (opts.subtree && target.contains(record.target))) &&
          (record.type === 'childList' ? opts.childList : opts.attributes && (!opts.attributeFilter || opts.attributeFilter.includes(record.attributeName)))));
        if (relevant.length) observer.fn(relevant, observer);
      }
    }
    assert.equal(mutations.length, 0, 'observer work settles without recursive mutation churn');
  }
  mutations.length = 0; load(); flush();
  return { context, window, document, store, writes, queue, cancelled, sprites, observers, forbidden, computed,
    add, load, flush, get canvas() { return surface; }, get api() { return window.FOMAL_SNOW; },
    state() { return this.api.inspect(); },
    frame(ms = 1000 / 60) {
      now += ms; flush(); const pending = [...queue.values()]; queue.clear();
      pending.forEach(fn => fn(now)); flush();
      assert.ok(queue.size <= 1, 'at most one snow animation loop');
    },
    advance(seconds, fps = 60) { for (let i = 0; i < seconds * fps; i++) this.frame(1000 / fps); },
    toggle(value) { store.set('snow', value ? 'block' : 'none'); if (surface) surface.style.display = value ? 'block' : 'none'; this.api.refresh(); flush(); },
    visibility(value) { document.hidden = value; document.visibilityState = value ? 'hidden' : 'visible'; document.emit('visibilitychange'); flush(); },
    theme(value) { document.documentElement.setAttribute('data-theme', value); flush(); },
    reduced(value) { for (const [query, m] of media) if (query.includes('prefers-reduced-motion')) { m.matches = value; m.emit('change', { matches: value }); } flush(); },
    resize(w, h = window.innerHeight, ratio = window.devicePixelRatio) {
      window.innerWidth = w; window.innerHeight = h; window.devicePixelRatio = ratio;
      document.documentElement.clientWidth = w; document.documentElement.clientHeight = h;
      for (const [q, m] of media) if (!q.includes('prefers-reduced-motion')) { m.matches = w <= 768; m.emit('change'); }
      window.emit('resize'); flush();
    },
    replaceCanvas() { if (surface) surface.remove(); surface = add('snow', 'canvas'); surface.style.display = store.get('snow') || 'none'; flush(); document.emit('pjax:complete'); flush(); return surface; },
    fireflies() { vm.runInContext(read('source/js/modules/fireflies.js'), context, { filename: 'fireflies.js' }); flush(); }
  };
}

function validState(h) {
  const state = h.state();
  for (const key of ['running', 'flakes', 'depth', 'maxDepth', 'width', 'height']) assert.ok(key in state, 'inspect exposes ' + key);
  assert.equal(typeof state.running, 'boolean');
  for (const key of ['flakes', 'depth', 'maxDepth', 'width', 'height']) assert.ok(Number.isFinite(state[key]), key + ' is a finite scalar');
  assert.ok(!Object.values(state).some(Array.isArray), 'inspection never leaks mutable simulation arrays');
  assert.ok(state.depth >= 0 && state.depth <= state.maxDepth + 1e-6, 'bank depth is bounded');
  return state;
}
function idle(h) { assert.equal(h.state().running, false); assert.equal(h.queue.size, 0); assert.deepEqual(h.forbidden, []); }
function settingsFunction(name) {
  const source = read('source/js/modules/settings.js');
  const match = source.match(new RegExp('function ' + name + '\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}'));
  assert.ok(match, 'actual settings function exists: ' + name); return match[0];
}

for (const snow of ['none', null]) test('default-off is allocation-free and never schedules RAF: ' + snow, () => {
  const h = harness({ snow });
  assert.equal(h.sprites.length, 0); idle(h);
  const before = validState(h); assert.equal(before.flakes, 0); assert.equal(before.depth, 0);
  assert.equal(before.maxDepth, 0, 'off mode has not allocated or measured a bank');
  for (let i = 0; i < 10; i++) { h.api.refresh(); h.document.emit('pjax:complete'); h.window.emit('resize'); }
  h.frame(60000); idle(h); assert.equal(h.sprites.length, 0);
});

test('classic controller is idempotent, and inspection cannot change state', () => {
  const h = harness({ snow: 'block' }); const api = h.api;
  const initial = validState(h); assert.equal(initial.running, true); assert.ok(initial.flakes >= 48 && initial.flakes <= 96);
  const listeners = [...h.window.events, ...h.document.events].map(([name, set]) => [name, set.size]);
  const observerCount = h.observers.length;
  for (let i = 0; i < 20; i++) { h.load(); h.api.refresh(); h.document.emit('pjax:complete'); }
  assert.equal(h.api, api); assert.equal(h.queue.size, 1); assert.equal(h.observers.length, observerCount);
  assert.deepEqual([...h.window.events, ...h.document.events].map(([name, set]) => [name, set.size]), listeners);
  const view = h.state(); try { view.depth = 999; view.running = false; } catch (error) { assert.ok(error instanceof TypeError); }
  assert.deepEqual(h.state(), initial);
});

for (const options of [{ width: 768 }, { width: 375 }, { ua: 'Mozilla Android Mobile', width: 1440 },
  { hidden: true }, { reduced: true }, { theme: 'dark' }]) test('enabled preference defers allocation while gated: ' + JSON.stringify(options), () => {
  const h = harness({ snow: 'block', ...options }); idle(h); assert.equal(h.sprites.length, 0); assert.equal(h.state().flakes, 0);
});

test('cached six-armed line sprites replace large circle snowballs', () => {
  const h = harness({ snow: 'block' }); h.frame();
  assert.equal(h.sprites.length, 2, 'simple and branched six-armed sprite variants cache on first actual run');
  for (const sprite of h.sprites) {
    assert.ok(sprite.ctx.counts.lineTo >= 6, 'each cached flake has six radial line arms');
    assert.ok(sprite.ctx.counts.stroke > 0, 'flakes use thin strokes');
    assert.equal(sprite.ctx.counts.arc || 0, 0, 'no arc-based large round particle');
    assert.ok(sprite.width > 0 && sprite.width <= 128 && sprite.height > 0 && sprite.height <= 128);
  }
  assert.ok(h.sprites.some(sprite => sprite.ctx.counts.lineTo > 6), 'some variants include fine branch strokes');
  assert.ok(h.canvas.ctx.counts.drawImage > 0, 'main canvas draws cached sprites');
  assert.equal(h.canvas.ctx.counts.arc || 0, 0, 'main loop does not redraw circular snowballs');
  const strokes = h.sprites.map(s => s.ctx.counts.stroke);
  h.advance(2); h.resize(1920, 900, 1); h.toggle(false); h.toggle(true);
  assert.equal(h.sprites.length, 2); assert.deepEqual(h.sprites.map(s => s.ctx.counts.stroke), strokes, 'same-DPR resize/off/on never rebuild sprite paths');
  h.resize(1920, 900, 2); assert.equal(h.sprites.length, 4, 'DPR changes rebuild exactly two sprites');
  assert.ok(h.sprites.slice(-2).every(s => s.width === 80 && s.height === 80));
});

test('time-driven falling rotates and sways rather than jumping on long frames', () => {
  const normal = harness({ snow: 'block' }), delayed = harness({ snow: 'block' });
  normal.frame(); delayed.frame(); normal.frame(50); delayed.frame(120000);
  assert.deepEqual(delayed.canvas.ctx.draws.map(args => args.slice(1)), normal.canvas.ctx.draws.map(args => args.slice(1)), 'dt clamps to 50ms');
  assert.deepEqual(delayed.canvas.ctx.rotations, normal.canvas.ctx.rotations);
  assert.deepEqual(delayed.canvas.ctx.translations, normal.canvas.ctx.translations, 'clamp also limits movement in pixels');
  assert.equal(delayed.state().depth, normal.state().depth);
  const rotations = normal.canvas.ctx.rotations.slice(); normal.advance(1);
  assert.notDeepEqual(normal.canvas.ctx.rotations, rotations, 'falling flakes rotate over elapsed time');
  assert.ok(normal.canvas.ctx.counts.translate > 0, 'positions use the translated sprite path');
});

test('thin bank starts empty, grows only after falling, stays soft and bounded over four minutes', () => {
  const h = harness({ snow: 'block' }); assert.equal(h.state().depth, 0);
  h.frame(); const first = h.state().depth;
  h.advance(120); const halfway = validState(h);
  assert.ok(halfway.depth > first, 'landed flakes gradually accumulate');
  assert.ok(halfway.maxDepth >= 14 && halfway.maxDepth <= 30, 'bank cap stays a thin 14–30px');
  h.advance(120); const final = validState(h); assert.ok(final.depth >= halfway.depth);
  for (const shape of h.canvas.ctx.paths) for (const op of shape) {
    for (let i = 1; i + 1 < op.length; i += 2) {
      assert.ok(op[i] >= 0 && op[i] <= final.width, 'bank path stays within viewport width');
      assert.ok(op[i + 1] >= final.height - final.maxDepth - 1e-6 && op[i + 1] <= final.height, 'drawn bank is no taller than inspect cap');
    }
  }
  assert.ok(h.canvas.ctx.paths.some(p => p.some(op => /CurveTo$/.test(op[0]))), 'bank contour uses a smooth curve');
  assert.equal(h.sprites.length, 2); assert.equal(h.queue.size, 1);
});

test('same seeded elapsed time gives approximately fair 30/60/120fps accumulation', () => {
  const states = [30, 60, 120].map(fps => { const h = harness({ snow: 'block' }); h.frame(); h.advance(120, fps); return h.state(); });
  const depths = states.map(s => s.depth); const low = Math.min(...depths), high = Math.max(...depths);
  assert.ok(low > 0, 'all frame rates produce landed flakes');
  assert.ok(high - low <= Math.max(0.3, high * 0.12), 'equal time, not frame count, controls bank growth: ' + depths.join(', '));
  assert.deepEqual(states.map(s => s.flakes), [states[0].flakes, states[0].flakes, states[0].flakes]);
});

for (const gate of ['hidden', 'dark', 'mobile', 'reduced', 'pagehide']) test(gate + ' pauses without losing bank and resumes exactly one loop', () => {
  const h = harness({ snow: 'block' }); h.advance(120); const before = h.state();
  const pause = () => { if (gate === 'hidden') h.visibility(true); else if (gate === 'dark') h.theme('dark');
    else if (gate === 'mobile') h.resize(600); else if (gate === 'reduced') h.reduced(true); else h.window.emit('pagehide'); };
  const resume = () => { if (gate === 'hidden') h.visibility(false); else if (gate === 'dark') h.theme('light');
    else if (gate === 'mobile') h.resize(1280); else if (gate === 'reduced') h.reduced(false); else h.window.emit('pageshow'); };
  pause(); idle(h); const paused = h.state(); assert.equal(paused.depth, before.depth); assert.equal(paused.flakes, before.flakes);
  h.frame(120000); assert.equal(h.state().depth, paused.depth);
  resume(); resume(); assert.equal(h.queue.size, 1); assert.equal(h.state().running, true);
  h.frame(); assert.ok(h.state().depth <= paused.depth + 0.3, 'resume excludes suspended wall time');
});

test('disable clears flakes/bank and invalidates already cancelled callbacks', () => {
  const h = harness({ snow: 'block' }); h.advance(120); assert.ok(h.state().depth > 0);
  h.toggle(false); idle(h); assert.equal(h.state().depth, 0); assert.equal(h.state().flakes, 0);
  const clears = h.canvas.ctx.counts.clearRect;
  h.frame(60000); assert.equal(h.canvas.ctx.counts.clearRect, clears, 'disabled mode does not draw');
  h.toggle(true); const fresh = h.state(); assert.equal(fresh.depth, 0);
  for (const callback of h.cancelled) callback(999999);
  assert.equal(h.queue.size, 1); assert.deepEqual(h.state(), fresh, 'stale callbacks cannot advance reopened state');
});

test('controller reset clears bank without changing user preference or duplicating work', () => {
  const h = harness({ snow: 'block' }); h.advance(120); const writes = h.writes.length;
  h.api.reset(); h.api.reset(); assert.equal(h.state().depth, 0); assert.equal(h.store.get('snow'), 'block');
  assert.equal(h.writes.length, writes); assert.equal(h.queue.size, 1); assert.equal(h.sprites.length, 2, 'reset reuses sprite pair');
  h.toggle(false); h.api.reset(); idle(h);
});

test('resize bounds backing-store DPR, bank cap and low particle density', () => {
  const h = harness({ snow: 'block', width: 1024, height: 600, dpr: 4 }); h.frame();
  assert.equal(h.canvas.width, 2048); assert.equal(h.canvas.height, 1200);
  const small = validState(h); h.advance(120); h.resize(3840, 2160, 3); h.frame();
  const large = validState(h); assert.equal(large.width, 3840); assert.equal(large.height, 2160);
  assert.equal(h.canvas.width, 7680); assert.equal(h.canvas.height, 4320);
  assert.ok(large.flakes >= small.flakes && large.flakes <= 96 && large.flakes >= 48);
  assert.ok(large.maxDepth >= 14 && large.maxDepth <= 30);
  h.resize(900, 480, 1); const narrow = validState(h);
  assert.equal(narrow.width, 900); assert.equal(narrow.height, 480); assert.ok(narrow.depth <= narrow.maxDepth);
  assert.equal(h.sprites.length, 4, 'only DPR 2→1 rebuilds the pair');
});

test('PJAX replacement detaches old canvas observations and never grows observers/listeners', () => {
  const h = harness({ snow: 'block' }); h.frame(); const count = h.observers.length;
  const old = h.canvas; const painted = old.ctx.counts.drawImage;
  for (let i = 0; i < 20; i++) { h.replaceCanvas(); h.frame(); }
  assert.equal(h.observers.length, count); assert.equal(h.queue.size, 1);
  assert.equal(old.ctx.counts.drawImage, painted, 'detached canvas is not painted');
  assert.ok(h.canvas.ctx.counts.drawImage > 0, 'replacement gets the running controller');
  assert.ok(h.observers.every(o => !o.targets.has(old)), 'observer disconnects old canvas target');
  assert.equal(h.sprites.length, 2);
});

for (const options of [{ canvas: false }, { contextAvailable: false }, { raf: false }]) test('unavailable browser primitive is safe: ' + JSON.stringify(options), () => {
  const h = harness({ snow: 'block', ...options }); assert.ok(h.api); idle(h);
  assert.doesNotThrow(() => { h.api.refresh(); h.api.reset(); h.document.emit('pjax:complete'); h.window.emit('resize'); });
  idle(h);
  if (options.canvas === false) { h.replaceCanvas(); assert.equal(h.queue.size, 1, 'late canvas can start without polling'); }
});

test('legacy media changes also pause and resume reduced motion', () => {
  const h = harness({ snow: 'block', legacyMedia: true }); assert.equal(h.queue.size, 1);
  h.reduced(true); idle(h); h.reduced(false); assert.equal(h.queue.size, 1);
});

test('actual setSnow and firefly module enforce mutual exclusion and cancel the snow loop', () => {
  const h = harness(); h.fireflies();
  vm.runInContext(settingsFunction('setSnow') + '\n' + settingsFunction('setFireflies'), h.context);
  h.window.FOMAL_FIREFLIES.setEnabled(true); h.flush(); assert.ok(h.document.getElementById('fireflies-stage'));
  h.document.getElementById('snowSet').checked = true; h.context.setSnow(); h.flush();
  assert.equal(h.store.get('snow'), 'block'); assert.equal(h.store.get('fireflies'), '0');
  assert.equal(h.document.getElementById('fireflies-stage'), null); assert.equal(h.queue.size, 1);
  h.advance(120); h.document.getElementById('firefliesSet').checked = true; h.context.setFireflies(); h.flush();
  assert.equal(h.store.get('snow'), 'none'); assert.equal(h.document.getElementById('snowSet').checked, false);
  assert.ok(h.document.getElementById('fireflies-stage')); idle(h); assert.equal(h.state().depth, 0);
  h.document.getElementById('snowSet').checked = true; h.context.setSnow(); h.flush(); assert.equal(h.queue.size, 1);
  h.document.getElementById('snowSet').checked = false; h.context.setSnow(); h.flush(); idle(h);
});

test('actual global reset writes snow none before resetting the live controller', () => {
  const h = harness({ snow: 'block' }); h.advance(120);
  for (const id of ['universe', 'aside-show', 'aside-pos', 'nav', 'nav-display', 'rightSide', 'fps',
    'transPercent', 'green', 'universeSet', 'fpson', 'rightSideSet', 'lightSet', 'navSet', 'asideSet', 'asidePosSet']) h.add(id);
  Object.assign(h.context, { FONT_DEFAULT: 'default', CODE_FONT_DEFAULT: 'default' });
  for (const name of ['applyInteractionSettings', 'setFont', 'setCodeFont', 'setColor', 'startFps',
    'resetBg_', 'changeLight', 'resetBgFilter', 'resetTrans', 'fomalNotify']) h.context[name] = () => {};
  const calls = [], realReset = h.api.reset;
  h.api.reset = () => { calls.push(h.store.get('snow')); return realReset(); };
  vm.runInContext(settingsFunction('initItem') + '\n' + settingsFunction('reset'), h.context);
  h.context.reset(); h.flush(); assert.deepEqual(calls, ['none'], 'controller clears only after defaults are persisted');
  assert.equal(h.store.get('snow'), 'none'); assert.equal(h.state().depth, 0); assert.equal(h.state().flakes, 0); idle(h);
  assert.equal(h.document.getElementById('snowSet').checked, false);
});

test('old engine is removed while stars/emoji survive, and deferred snow loads once before effects/settings', () => {
  const effects = read('source/js/modules/effects.js');
  assert.doesNotMatch(effects, /flakeCount|snowInvalidate|startSnow|snowRunning|minDist/);
  assert.match(effects, /function dark\s*\(/); assert.match(effects, /function owoBig\s*\(/);
  const config = read('_config.fomalhaut.yml');
  const scripts = [...config.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/g)];
  const index = name => scripts.findIndex(m => m[1].startsWith('/js/modules/' + name + '.js'));
  const snow = index('snow'), effectsIndex = index('effects'), settings = index('settings');
  assert.ok(snow >= 0 && snow < effectsIndex && effectsIndex < settings, 'controller exists before both consumers');
  assert.equal(scripts.filter(m => m[1].startsWith('/js/modules/snow.js')).length, 1);
  for (const i of [snow, effectsIndex]) {
    assert.match(scripts[i][0], /\bdefer\b/); assert.match(scripts[i][1], /[?&]v=20261010-snow1(?:&|$)/);
  }
  assert.match(config, /<canvas\b[^>]*id=["']snow["']/);
});

test('six radial arms are spaced evenly, with thin strokes and bounded sprite geometry', () => {
  const h = harness({ snow: 'block' });
  for (const sprite of h.sprites) {
    const strokes = sprite.ctx.paths.flat();
    const radial = strokes.filter((op, i) => op[0] === 'lineTo' && strokes[i - 1]?.[0] === 'moveTo' &&
      strokes[i - 1][1] === 0 && strokes[i - 1][2] === 0);
    assert.equal(radial.length, 6, 'exactly six arms start at the crystal center');
    const angles = radial.map(op => Math.atan2(op[2], op[1])).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i++) assert.ok(Math.abs(angles[i] - angles[i - 1] - Math.PI / 3) < 1e-9);
    assert.ok(sprite.ctx.lineWidth > 0 && sprite.ctx.lineWidth <= 2.5, 'fine crystal strokes');
    assert.equal(sprite.width, 40); assert.equal(sprite.height, 40);
  }
});

test('no bank grows merely from elapsed time until a particle actually lands', () => {
  const h = harness({ snow: 'block', random: () => 0.25 }); h.frame();
  h.advance(2); assert.equal(h.state().depth, 0, 'all fixture particles remain high in the sky');
  h.advance(20); assert.ok(h.state().depth > 0, 'only reaching the bank deposits snow');
});

test('unsaturated bank growth and actual falling positions are time-fair at different FPS', () => {
  const skies = [30, 60, 120].map(fps => {
    const h = harness({ snow: 'block', random: () => 0.25 }); h.frame(); h.advance(2, fps);
    return { position: h.canvas.ctx.translations[0], angle: h.canvas.ctx.rotations[0] };
  });
  for (const sky of skies) {
    assert.ok(Math.abs(sky.position[1] - skies[0].position[1]) < 1e-6, 'vertical px/sec is independent of FPS');
    assert.ok(Math.abs(sky.position[0] - skies[0].position[0]) < 0.4, 'sway numerical integration remains close');
    assert.ok(Math.abs(sky.angle - skies[0].angle) < 1e-6, 'rotation uses seconds, not frames');
  }
  const states = [30, 60, 120].map(fps => {
    const h = harness({ snow: 'block' }); h.frame(); h.advance(8, fps); return h.state();
  });
  assert.ok(states.every(s => s.depth > 0 && s.depth < s.maxDepth), 'compare before the cap can conceal timing defects');
  const depths = states.map(s => s.depth);
  assert.ok(Math.max(...depths) - Math.min(...depths) <= 0.5, 'early deposits remain time-fair: ' + depths.join(', '));
});

test('storage access failure safely falls back to explicit inline state without timers', () => {
  const h = harness({ snow: 'block', storageDenied: true }); assert.equal(h.queue.size, 1);
  h.canvas.style.display = 'none'; h.flush(); idle(h); assert.equal(h.state().flakes, 0);
  h.canvas.style.display = 'block'; h.flush(); assert.equal(h.queue.size, 1);
  assert.equal(h.writes.length, 0, 'controller does not overwrite settings while reading preferences');
});

test('preference and inline state must both allow snow, while CSS visibility only pauses', () => {
  const h = harness({ snow: 'block' }); h.advance(8); const depth = h.state().depth;
  h.canvas.style.visibility = 'hidden'; h.flush(); idle(h); assert.equal(h.state().depth, depth);
  h.canvas.style.visibility = 'visible'; h.flush(); assert.equal(h.queue.size, 1);
  h.canvas.style.opacity = '0'; h.flush(); idle(h); assert.equal(h.state().depth, depth);
  h.canvas.style.opacity = '1'; h.flush(); assert.equal(h.queue.size, 1);
  h.canvas.style.display = 'none'; h.flush(); idle(h); assert.equal(h.state().depth, 0);
  assert.equal(h.store.get('snow'), 'block', 'CSS observer does not alter stored preference');
  h.canvas.style.display = 'block'; h.store.set('snow', 'none'); h.api.refresh(); h.flush(); idle(h);
  assert.equal(h.state().flakes, 0, 'inline display alone cannot override an explicit saved off state');
});

test('cross-tab snow preference changes refresh without duplicate listeners or polling', () => {
  const h = harness(); h.canvas.style.display = 'block'; h.flush(); idle(h);
  h.store.set('snow', 'block'); h.window.emit('storage', { key: 'snow', newValue: 'block' }); h.flush();
  assert.equal(h.queue.size, 1);
  h.store.set('snow', 'none'); h.window.emit('storage', { key: 'snow', newValue: 'none' }); h.flush(); idle(h);
  h.store.delete('snow'); h.window.emit('storage', { key: null }); h.flush(); idle(h);
});

test('retained canvas CSS is fixed/negative-z/pointer-transparent and reduced motion has a CSS fallback', () => {
  const custom = read('themes/fomalhaut/source/css/_custom/custom.css');
  const light = custom.match(/\[data-theme=["']light["']\]\s*#snow\s*\{([^}]+)\}/);
  assert.ok(light, 'original light-mode snow canvas styling stays in the theme');
  assert.match(light[1], /position\s*:\s*fixed/); assert.match(light[1], /pointer-events\s*:\s*none/);
  assert.match(light[1], /z-index\s*:\s*-\d+/);
  assert.match(custom, /\[data-theme=["']dark["']\]\s*#snow\s*\{[^}]*display\s*:\s*none\s*!important/);
  const css = read('source/css/site-inject.css');
  const blocks = [...css.matchAll(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/g)].map(match => {
    let depth = 1, end = match.index + match[0].length; const start = end;
    for (; end < css.length && depth; end++) { if (css[end] === '{') depth++; else if (css[end] === '}') depth--; }
    assert.equal(depth, 0); return css.slice(start, end - 1);
  });
  assert.ok(blocks.some(block => /#snow\s*\{[^}]*display\s*:\s*none\s*!important/.test(block)), 'CSS independently suppresses snow under reduced-motion');
  const config = read('_config.fomalhaut.yml');
  assert.match(config, /settings\.js\?v=20261010-snow1/); assert.match(config, /site-inject\.css\?v=20261010-snow1/);
});


test('cold saved-on startup waits for computed visibility and window load recovers without polling', () => {
  const h = harness({ snow: 'block', computedDisplay: 'none' });
  assert.equal(h.canvas.style.display, 'block'); assert.equal(h.store.get('snow'), 'block');
  idle(h); assert.equal(h.sprites.length, 0); assert.equal(h.state().flakes, 0);
  h.window.emit('load'); idle(h); assert.equal(h.sprites.length, 0, 'load cannot bypass still-hidden CSS');
  h.computed.display = 'block'; h.flush(); idle(h, 'computed-only changes need an event, not a poll');
  h.window.emit('load'); h.flush(); assert.equal(h.queue.size, 1); assert.equal(h.state().running, true);
  assert.equal(h.sprites.length, 2); const observers = h.observers.length;
  const listeners = [...h.window.events, ...h.document.events].map(([name, set]) => [name, set.size]);
  for (let i = 0; i < 20; i++) h.window.emit('load');
  assert.equal(h.queue.size, 1); assert.equal(h.observers.length, observers);
  assert.deepEqual([...h.window.events, ...h.document.events].map(([name, set]) => [name, set.size]), listeners);
  h.frame(); assert.ok(h.canvas.ctx.counts.drawImage > 0); assert.deepEqual(h.forbidden, []);
});

for (const event of ['transitionend', 'animationend']) test(event + ' recovers computed-only visibility with preserved snow and one epoch-safe loop', () => {
  const h = harness({ snow: 'block' }); h.advance(8); const before = h.state();
  const positions = h.canvas.ctx.translations.slice(), rotations = h.canvas.ctx.rotations.slice();
  h.computed.display = 'none'; h.api.refresh(); idle(h); assert.equal(h.state().depth, before.depth);
  const callbacks = h.cancelled.slice(); assert.ok(callbacks.length > 0);
  h.document.emit(event, { target: h.canvas }); idle(h, 'still-hidden animation completion cannot resume');
  h.frame(120000); assert.equal(h.state().depth, before.depth);
  h.computed.display = 'block'; h.flush(); idle(h, 'computed-only state did not mutate inline style');
  for (let i = 0; i < 20; i++) h.document.emit(event, { target: h.canvas, propertyName: 'opacity' });
  assert.equal(h.queue.size, 1); assert.equal(h.state().depth, before.depth);
  const handles = [...h.queue.keys()], resumed = h.state();
  callbacks.forEach(fn => fn(999999));
  assert.deepEqual([...h.queue.keys()], handles, 'old cancelled callbacks cannot disturb the current handle');
  assert.deepEqual(h.state(), resumed); assert.equal(h.sprites.length, 2);
  h.frame(); assert.deepEqual(h.canvas.ctx.translations, positions, 'first resumed frame excludes paused wall time');
  assert.deepEqual(h.canvas.ctx.rotations, rotations); assert.equal(h.queue.size, 1); assert.deepEqual(h.forbidden, []);
  h.toggle(false); h.document.emit(event, { target: h.canvas }); idle(h);
  assert.equal(h.state().depth, 0); assert.equal(h.state().flakes, 0, 'completion events do not override saved off');
});

