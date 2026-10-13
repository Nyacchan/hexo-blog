'use strict';
// Dependency-free contract tests: node --test tools/tests/fireflies.test.cjs
// Run the real classic script in isolated windows; never reproduce its controller.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const source = read('source/js/modules/fireflies.js');

function emitter(target = {}) {
  const events = new Map();
  const once = new Map();
  target.events = events;
  target.addEventListener = (type, listener, options = {}) => {
    if (!events.has(type)) events.set(type, new Set());
    events.get(type).add(listener);
    if (options && options.once) {
      if (!once.has(type)) once.set(type, new Set());
      once.get(type).add(listener);
    }
  };
  target.removeEventListener = (type, listener) => events.get(type)?.delete(listener);
  target.emit = (type, event = {}) => {
    for (const listener of [...(events.get(type) || [])]) {
      const payload = { type, target, ...event };
      if (once.get(type)?.has(listener)) {
        events.get(type).delete(listener);
        once.get(type).delete(listener);
      }
      if (typeof listener === 'function') listener.call(target, payload);
      else listener.handleEvent(payload);
    }
  };
  return target;
}

function setup({ saved = {}, width = 1024, hidden = false, reduced = false,
  controls = true, snow = true, storageFailure = '', legacyMedia = false, bodyMounted = true } = {}) {
  let created = 0;
  const store = new Map(Object.entries(saved).map(([key, value]) => [key, String(value)]));
  const writes = [];
  const forbiddenCalls = [];
  const forbid = name => () => {
    forbiddenCalls.push(name);
    throw new Error('Fireflies must not use ' + name);
  };
  class Element {
    constructor(tagName, nodeType = 1) {
      created++;
      emitter(this);
      this.nodeType = nodeType;
      this.tagName = tagName.toUpperCase();
      this.parentNode = null;
      this.children = [];
      this.attributes = new Map();
      this.hidden = false;
      this.checked = false;
      this.style = {
        setProperty(name, value) { this[name] = String(value); },
        getPropertyValue(name) { return this[name] || ''; },
        removeProperty(name) { delete this[name]; }
      };
      this.dataset = new Proxy({}, {
        get: (_, key) => this.getAttribute('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())) ?? undefined,
        set: (_, key, value) => {
          this.setAttribute('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase()), value);
          return true;
        }
      });
      const classes = new Set();
      Object.defineProperty(this, 'className', {
        get: () => [...classes].join(' '),
        set: value => { classes.clear(); String(value).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); }
      });
      this.classList = {
        contains: name => classes.has(name),
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        toggle: (name, force) => {
          const on = force === undefined ? !classes.has(name) : !!force;
          if (on) classes.add(name); else classes.delete(name);
          return on;
        }
      };
    }
    get parentElement() { return this.parentNode; }
    get isConnected() { return this === document.documentElement || !!this.parentNode?.isConnected; }
    get childNodes() { return this.children; }
    get childElementCount() { return this.children.length; }
    get firstChild() { return this.children[0] || null; }
    get lastChild() { return this.children.at(-1) || null; }
    set innerHTML(value) {
      assert.equal(value, '', 'harness only accepts DOM-based construction, not HTML parsing');
      this.replaceChildren();
    }
    get innerHTML() { return ''; }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === 'id') this.id = String(value);
      if (name === 'class') this.className = String(value);
      if (name === 'hidden') this.hidden = true;
    }
    getAttribute(name) {
      if (name === 'id') return this.id || null;
      if (name === 'class') return this.className || null;
      return this.attributes.get(name) ?? null;
    }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    removeAttribute(name) { this.attributes.delete(name); if (name === 'hidden') this.hidden = false; }
    appendChild(child) {
      if (child.nodeType === 11) {
        for (const node of [...child.children]) this.appendChild(node);
        return child;
      }
      child.remove();
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    removeChild(child) {
      const index = this.children.indexOf(child);
      assert.notEqual(index, -1, 'removeChild needs an attached child');
      this.children.splice(index, 1);
      child.parentNode = null;
      return child;
    }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    replaceChildren(...children) {
      for (const child of [...this.children]) this.removeChild(child);
      this.append(...children);
    }
    contains(node) { return this === node || this.children.some(child => child.contains(node)); }
    matches(selector) {
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      const match = /^([a-z][\w-]*)?(?:\.([\w-]+))?$/i.exec(selector);
      if (!match) throw new Error('Unsupported harness selector: ' + selector);
      return (!match[1] || this.tagName === match[1].toUpperCase()) &&
        (!match[2] || this.classList.contains(match[2]));
    }
    querySelectorAll(selector) {
      const result = [];
      const visit = node => {
        for (const child of node.children) {
          if (child.matches(selector)) result.push(child);
          visit(child);
        }
      };
      visit(this);
      return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    getContext() { return forbid('canvas.getContext')(); }
  }
  const document = emitter({ hidden, visibilityState: hidden ? 'hidden' : 'visible', readyState: 'complete' });
  document.documentElement = new Element('html');
  document.documentElement.clientWidth = width;
  document.head = new Element('head');
  document.body = new Element('body');
  document.documentElement.append(document.head, document.body);
  document.createElement = tag => new Element(tag);
  document.createDocumentFragment = () => new Element('fragment', 11);
  document.getElementById = id => document.documentElement.querySelector('#' + id);
  document.querySelector = selector => document.documentElement.querySelector(selector);
  document.querySelectorAll = selector => document.documentElement.querySelectorAll(selector);
  const addElement = (id, tag = 'input') => {
    const element = document.createElement(tag);
    element.id = id;
    document.body.appendChild(element);
    return element;
  };
  if (snow) addElement('snow', 'canvas').style.display = store.get('snow') || 'none';
  if (controls) {
    addElement('firefliesSet').checked = store.get('fireflies') === '1';
    addElement('snowSet').checked = store.get('snow') === 'block';
  }
  document.createElement = tag => {
    if (String(tag).toLowerCase() === 'canvas') return forbid('canvas allocation')();
    return new Element(tag);
  };
  const localStorage = {
    getItem(key) {
      if (storageFailure === 'read' || storageFailure === 'both') throw new Error('Storage read denied');
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      if (storageFailure === 'write' || storageFailure === 'both') throw new Error('Storage write denied');
      writes.push([String(key), String(value)]);
      store.set(String(key), String(value));
    },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); }
  };
  const media = new Map();
  const matchMedia = query => {
    if (!media.has(query)) {
      const mql = emitter({ media: query, matches: query.includes('prefers-reduced-motion') ? reduced : width <= 600 });
      mql.addListener = listener => {
        if (!mql.events.has('change')) mql.events.set('change', new Set());
        mql.events.get('change').add(listener);
      };
      mql.removeListener = listener => mql.events.get('change')?.delete(listener);
      if (legacyMedia) { delete mql.addEventListener; delete mql.removeEventListener; }
      media.set(query, mql);
    }
    return media.get(query);
  };
  const window = emitter({ document, innerWidth: width, matchMedia,
    requestAnimationFrame: forbid('requestAnimationFrame'),
    cancelAnimationFrame: forbid('cancelAnimationFrame'),
    setInterval: forbid('setInterval'), clearInterval: forbid('clearInterval'),
    setTimeout: forbid('setTimeout'), clearTimeout: forbid('clearTimeout') });
  if (storageFailure === 'getter') Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  else window.localStorage = localStorage;
  const globals = { window, document, console, matchMedia,
    requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame,
    setInterval: window.setInterval, clearInterval: window.clearInterval,
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout };
  if (storageFailure === 'getter') Object.defineProperty(globals, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  else globals.localStorage = localStorage;
  const body = document.body;
  if (!bodyMounted) { body.remove(); document.body = null; document.readyState = 'loading'; }
  const restoreBody = () => {
    document.body = body;
    document.documentElement.appendChild(body);
    document.readyState = 'complete';
    document.emit('DOMContentLoaded');
  };
  const context = vm.createContext(globals);
  const evaluate = () => vm.runInContext(source, context, { filename: 'fireflies.js' });
  evaluate();
  const stage = () => document.getElementById('fireflies-stage');
  const setHidden = value => {
    document.hidden = value;
    document.visibilityState = value ? 'hidden' : 'visible';
    document.emit('visibilitychange');
  };
  const setReduced = value => {
    for (const [query, mql] of media) if (query.includes('prefers-reduced-motion')) {
      mql.matches = value;
      mql.emit('change', { matches: value, media: query });
    }
  };
  const resize = value => {
    window.innerWidth = value;
    document.documentElement.clientWidth = value;
    for (const [query, mql] of media) if (!query.includes('prefers-reduced-motion')) mql.matches = value <= 600;
    window.emit('resize');
  };
  const storage = (key, value) => {
    const oldValue = key === null ? null : store.get(key) ?? null;
    if (key === null) store.clear();
    else if (value === null) store.delete(key);
    else store.set(key, String(value));
    window.emit('storage', { key, newValue: value, oldValue, storageArea: localStorage });
  };
  const listenerCounts = () => [document, window, ...media.values()].map(target =>
    [...target.events].map(([name, listeners]) => [name, listeners.size]));
  return { window, document, context, store, writes, media, stage, evaluate, addElement,
    setHidden, setReduced, resize, storage, restoreBody, listenerCounts, forbiddenCalls,
    api: window.FOMAL_FIREFLIES, created: () => created };
}

function assertLayer(h, count) {
  const stage = h.stage();
  assert.ok(stage, 'enabled effect owns a stage');
  assert.equal(h.document.querySelectorAll('#fireflies-stage').length, 1);
  assert.equal(stage.getAttribute('aria-hidden'), 'true');
  assert.equal(stage.children.length, count);
  for (const mote of stage.children) {
    assert.equal(mote.tagName, 'SPAN');
    assert.ok(mote.classList.contains('ff-mote'));
    assert.equal(mote.children.length, 1);
    assert.equal(mote.children[0].tagName, 'I');
    assert.ok(mote.children[0].classList.contains('ff-glow'));
  }
  assert.deepEqual(h.forbiddenCalls, []);
  return stage;
}
function assertPaused(stage, value) {
  assert.equal(stage.hidden, value);
  assert.equal(stage.getAttribute('data-paused'), String(value));
}

for (const value of [undefined, '0', 'true', 'on', 'block', '01', '2', '']) {
  test('default off and stored non-1 value stays off: ' + String(value), () => {
    const h = setup({ saved: value === undefined ? {} : { fireflies: value } });
    assert.equal(h.stage(), null);
    for (const name of ['setEnabled', 'refresh', 'syncControls']) assert.equal(typeof h.api[name], 'function');
    h.api.refresh();
    h.api.syncControls();
    h.document.emit('pjax:complete');
    h.window.emit('pageshow');
    assert.equal(h.stage(), null);
    assert.equal(h.document.getElementById('firefliesSet').checked, false);
    assert.deepEqual(h.forbiddenCalls, []);
  });
}

test('saved 1 creates one low-density layer and resolves startup snow conflict', () => {
  const h = setup({ saved: { fireflies: '1', snow: 'block' } });
  assertPaused(assertLayer(h, 14), false);
  assert.equal(h.store.get('snow'), 'none');
  assert.equal(h.document.getElementById('snow').style.display, 'none');
  assert.equal(h.document.getElementById('snowSet').checked, false);
  assert.equal(h.document.getElementById('firefliesSet').checked, true);
});

test('public enable is strict true, synchronizes controls and removes stage on disable', () => {
  const h = setup({ saved: { snow: 'block' } });
  h.api.setEnabled(true);
  assertLayer(h, 14);
  assert.equal(h.store.get('fireflies'), '1');
  assert.equal(h.store.get('snow'), 'none');
  assert.equal(h.document.getElementById('snow').style.display, 'none');
  assert.equal(h.document.getElementById('snowSet').checked, false);
  assert.equal(h.document.getElementById('firefliesSet').checked, true);
  for (const value of [false, undefined, null, 1, '1', 'true', {}, []]) {
    h.api.setEnabled(true);
    h.api.setEnabled(value);
    assert.equal(h.store.get('fireflies'), '0');
    assert.equal(h.stage(), null);
    assert.equal(h.document.getElementById('firefliesSet').checked, false);
  }
});

test('responsive density includes exactly 600px and does not rebuild for same density', () => {
  const h = setup({ saved: { fireflies: '1' }, width: 601 });
  const stage = assertLayer(h, 14);
  const original = [...stage.children];
  const created = h.created();
  h.resize(900);
  h.api.refresh();
  assert.ok(original.every((mote, index) => h.stage().children[index] === mote));
  assert.equal(h.created(), created);
  h.resize(600);
  assertLayer(h, 8);
  assert.ok(original.every(mote => !mote.isConnected), 'old children are removed, not appended to');
  const mobile = [...h.stage().children];
  h.resize(320);
  assert.ok(mobile.every((mote, index) => h.stage().children[index] === mote));
  h.resize(601);
  assertLayer(h, 14);
});

test('initial hidden document defers allocation and resumes without changing preference', () => {
  const h = setup({ saved: { fireflies: '1' }, hidden: true });
  const created = h.created();
  assert.equal(h.stage(), null);
  h.api.refresh();
  h.document.emit('pjax:complete');
  assert.equal(h.created(), created);
  h.setHidden(false);
  assertPaused(assertLayer(h, 14), false);
  assert.equal(h.store.get('fireflies'), '1');
});

test('disabling during suspension does not resurrect nodes on lifecycle resume', () => {
  const h = setup({ saved: { fireflies: '1' } });
  h.setReduced(true);
  h.setHidden(true);
  h.window.emit('pagehide');
  h.api.setEnabled(false);
  const created = h.created();
  h.setReduced(false);
  h.setHidden(false);
  h.window.emit('pageshow');
  h.document.emit('pjax:complete');
  h.resize(600);
  assert.equal(h.stage(), null);
  assert.equal(h.created(), created);
  assert.equal(h.store.get('fireflies'), '0');
});

test('evaluation before body availability waits once for DOMContentLoaded', () => {
  const h = setup({ saved: { fireflies: '1', snow: 'block' }, bodyMounted: false });
  const created = h.created();
  assert.equal(h.stage(), null);
  h.evaluate();
  h.api.refresh();
  assert.equal(h.created(), created);
  assert.equal(h.document.events.get('DOMContentLoaded').size, 1);
  h.restoreBody();
  const stage = assertLayer(h, 14);
  assert.equal(h.document.events.get('DOMContentLoaded').size, 0);
  assert.equal(h.document.getElementById('snow').style.display, 'none');
  h.document.emit('DOMContentLoaded');
  assert.equal(h.stage(), stage);
});

test('initial mobile window gets eight motes', () => {
  assertLayer(setup({ saved: { fireflies: '1' }, width: 390 }), 8);
});

test('visibility and reduced-motion pause/resume existing nodes without allocation', () => {
  const h = setup({ saved: { fireflies: '1' } });
  const stage = assertLayer(h, 14);
  const children = [...stage.children];
  const created = h.created();
  h.setHidden(true);
  assertPaused(stage, true);
  h.setReduced(true);
  h.setHidden(false);
  assertPaused(stage, true);
  h.setReduced(false);
  assertPaused(stage, false);
  h.setHidden(true);
  h.api.refresh();
  assertPaused(stage, true);
  h.setHidden(false);
  assertPaused(stage, false);
  assert.equal(h.stage(), stage);
  assert.ok(children.every((mote, index) => stage.children[index] === mote));
  assert.equal(h.created(), created);
  assert.equal(h.store.get('fireflies'), '1', 'suspension is not preference disable');
});

test('initial reduced-motion defers DOM allocation until preference is released', () => {
  const h = setup({ saved: { fireflies: '1' }, reduced: true });
  const created = h.created();
  assert.equal(h.stage(), null);
  h.api.refresh();
  h.document.emit('pjax:complete');
  h.api.setEnabled(true);
  assert.equal(h.stage(), null);
  assert.equal(h.created(), created);
  assert.equal(h.document.getElementById('firefliesSet').checked, true);
  h.setReduced(false);
  assertPaused(assertLayer(h, 14), false);
});

test('pagehide/pageshow and document visibility are independent suspension reasons', () => {
  const h = setup({ saved: { fireflies: '1' } });
  const stage = assertLayer(h, 14);
  const created = h.created();
  h.window.emit('pagehide', { persisted: true });
  assertPaused(stage, true);
  h.api.refresh();
  assertPaused(stage, true);
  h.setHidden(true);
  h.window.emit('pageshow', { persisted: true });
  assertPaused(stage, true);
  h.setHidden(false);
  assertPaused(stage, false);
  assert.equal(h.created(), created);
  assert.equal(h.stage(), stage);
});

test('PJAX restores a removed layer and repeated events never duplicate nodes/listeners', () => {
  const h = setup({ saved: { fireflies: '1' } });
  const counts = h.listenerCounts();
  const removed = assertLayer(h, 14);
  removed.remove();
  assert.equal(h.stage(), null);
  h.document.emit('pjax:complete');
  const restored = assertLayer(h, 14);
  const children = [...restored.children];
  const created = h.created();
  for (let i = 0; i < 5; i++) {
    h.document.emit('pjax:complete');
    h.api.refresh();
    h.api.syncControls();
  }
  assert.equal(h.stage(), restored);
  assert.ok(children.every((mote, index) => restored.children[index] === mote));
  assert.equal(h.created(), created);
  assert.deepEqual(h.listenerCounts(), counts);
});

test('repeated classic script evaluation is idempotent in each independent window', () => {
  const h = setup({ saved: { fireflies: '1' } });
  const stage = assertLayer(h, 14);
  const counts = h.listenerCounts();
  const created = h.created();
  h.evaluate();
  h.evaluate();
  assert.equal(h.window.FOMAL_FIREFLIES, h.api);
  assert.equal(h.stage(), stage);
  assert.equal(h.created(), created);
  assert.deepEqual(h.listenerCounts(), counts);
  for (const target of [h.window, h.document, ...h.media.values()]) {
    for (const [name, listeners] of target.events) assert.equal(listeners.size, 1, 'one listener for ' + name);
  }
  assert.ok(h.window.events.has('storage'));
  assert.ok(h.window.events.has('resize'));
  assert.ok(h.document.events.has('visibilitychange'));
  assert.ok(h.document.events.has('pjax:complete'));
  const other = setup({ width: 500, saved: { fireflies: '1' } });
  assert.notEqual(other.api, h.api);
  assertLayer(other, 8);
  other.api.setEnabled(false);
  assertLayer(h, 14);
});

test('storage events synchronize enable, disable, removal and unrelated keys', () => {
  const h = setup();
  h.storage('fireflies', '1');
  const stage = assertLayer(h, 14);
  assert.equal(h.document.getElementById('firefliesSet').checked, true);
  const created = h.created();
  h.storage('themeColor', 'custom');
  assert.equal(h.stage(), stage);
  assert.equal(h.created(), created);
  h.storage('fireflies', '0');
  assert.equal(h.stage(), null);
  assert.equal(h.document.getElementById('firefliesSet').checked, false);
});

for (const key of ['fireflies', null]) {
  test('cross-tab preference removal resets enabled state: ' + String(key), () => {
    const h = setup({ saved: { fireflies: '1' } });
    assertLayer(h, 14);
    h.storage(key, null);
    assert.equal(h.stage(), null);
    assert.equal(h.document.getElementById('firefliesSet').checked, false);
    h.api.refresh();
    assert.equal(h.stage(), null);
  });
}

test('cross-tab snow enable wins, disables fireflies and updates both controls', () => {
  const h = setup({ saved: { fireflies: '1', snow: 'none' } });
  h.storage('snow', 'block');
  assert.equal(h.stage(), null);
  assert.equal(h.store.get('fireflies'), '0');
  assert.equal(h.document.getElementById('firefliesSet').checked, false);
  assert.equal(h.document.getElementById('snowSet').checked, true);
  h.storage('snow', 'none');
  assert.equal(h.stage(), null, 'disabling snow does not implicitly reenable fireflies');
  assert.equal(h.document.getElementById('snowSet').checked, false);
  h.storage('fireflies', '1');
  assertLayer(h, 14);
  assert.equal(h.store.get('snow'), 'none');
});

for (const failure of ['read', 'write', 'both', 'getter']) {
  test('storage ' + failure + ' failure keeps controller usable in memory', () => {
    const h = setup({ storageFailure: failure });
    assert.equal(h.stage(), null);
    h.api.setEnabled(true);
    const stage = assertLayer(h, 14);
    h.api.refresh();
    h.api.syncControls();
    h.document.emit('pjax:complete');
    assert.equal(h.stage(), stage);
    assert.equal(h.document.getElementById('firefliesSet').checked, true);
    h.api.setEnabled(false);
    assert.equal(h.stage(), null);
    assert.equal(h.document.getElementById('firefliesSet').checked, false);
    h.api.refresh();
    assert.equal(h.stage(), null);
  });
}

test('missing snow and settings controls is safe, including late-created controls', () => {
  const h = setup({ controls: false, snow: false });
  h.api.setEnabled(true);
  assertLayer(h, 14);
  h.api.syncControls();
  h.document.emit('pjax:complete');
  const checkbox = h.addElement('firefliesSet');
  const snowCheckbox = h.addElement('snowSet');
  snowCheckbox.checked = true;
  h.api.syncControls();
  assert.equal(checkbox.checked, true);
  assert.equal(snowCheckbox.checked, false);
  h.api.setEnabled(false);
  assert.equal(checkbox.checked, false);
  assert.equal(h.stage(), null);
});

test('legacy MediaQueryList change listeners still honor reduced motion', () => {
  const h = setup({ saved: { fireflies: '1' }, legacyMedia: true });
  const stage = assertLayer(h, 14);
  h.setReduced(true);
  assertPaused(stage, true);
  h.setReduced(false);
  assertPaused(stage, false);
});

// Settings snippets come from the actual file; only unrelated globals are stubs.
function settingsFunction(name) {
  const settings = read('source/js/modules/settings.js');
  const pattern = new RegExp('function ' + name + String.raw`\([^)]*\)\s*\{[\s\S]*?\n\}`);
  const match = settings.match(pattern);
  assert.ok(match, 'settings declares ' + name);
  return match[0];
}

test('actual initItem defaults fireflies off and reset tears down its live stage', () => {
  const h = setup({ saved: { fireflies: '1' } });
  Object.assign(h.context, { FONT_DEFAULT: 'default', CODE_FONT_DEFAULT: 'default' });
  vm.runInContext(settingsFunction('initItem'), h.context);
  h.context.initItem();
  assert.equal(h.store.get('fireflies'), '0');
  // Exercise the real reset function with inert unrelated settings dependencies.
  for (const id of ['universe', 'aside-show', 'aside-pos', 'nav', 'nav-display', 'rightSide',
    'fps', 'transPercent', 'green', 'universeSet', 'fpson', 'rightSideSet', 'lightSet',
    'navSet', 'asideSet', 'asidePosSet']) h.addElement(id, 'div');
  for (const name of ['applyInteractionSettings', 'setFont', 'setCodeFont', 'setColor',
    'startFps', 'resetBg_', 'changeLight', 'resetBgFilter', 'resetTrans', 'fomalNotify']) h.context[name] = () => {};
  h.api.setEnabled(true);
  const disableCalls = [];
  const originalSetEnabled = h.api.setEnabled;
  h.api.setEnabled = on => {
    disableCalls.push({ on, saved: h.store.get('fireflies') });
    return originalSetEnabled(on);
  };
  vm.runInContext(settingsFunction('reset'), h.context);
  h.context.reset();
  assert.deepEqual(disableCalls, [{ on: false, saved: '0' }], 'reset disables the controller after writing defaults');
  assert.equal(h.store.get('fireflies'), '0');
  assert.equal(h.stage(), null);
  assert.equal(h.document.getElementById('firefliesSet').checked, false);
});

test('actual setSnow enforces mutual exclusion and setFireflies uses the checkbox', () => {
  const h = setup({ saved: { fireflies: '1' } });
  vm.runInContext(settingsFunction('setSnow') + '\n' + settingsFunction('setFireflies'), h.context);
  h.document.getElementById('snowSet').checked = true;
  h.context.setSnow();
  assert.equal(h.store.get('snow'), 'block');
  assert.equal(h.document.getElementById('snow').style.display, 'block');
  assert.equal(h.store.get('fireflies'), '0');
  assert.equal(h.stage(), null);
  assert.equal(h.document.getElementById('firefliesSet').checked, false);
  h.document.getElementById('firefliesSet').checked = true;
  h.context.setFireflies();
  assertLayer(h, 14);
  assert.equal(h.store.get('snow'), 'none');
  assert.equal(h.document.getElementById('snowSet').checked, false);
  h.document.getElementById('firefliesSet').checked = false;
  h.context.setFireflies();
  assert.equal(h.stage(), null);
});

test('settings markup exposes default-off fireflies and synchronizes newly opened controls', () => {
  const settings = read('source/js/modules/settings.js');
  const checkbox = settings.match(/<input\b[^>]*id=["']firefliesSet["'][^>]*onchange=["']setFireflies\(\)["'][^>]*>/);
  assert.ok(checkbox, 'settings exposes the checkbox and its live handler');
  assert.doesNotMatch(checkbox[0], /\bchecked(?:\s|=|>)/, 'markup is not enabled by default');
  assert.match(settingsFunction('createWinbox'), /FOMAL_FIREFLIES\.syncControls\(\)/);
});

test('CSS supplies pointer-transparent, paused and reduced-motion animation safeguards', () => {
  const css = read('source/css/site-inject.css');
  assert.match(css, /#fireflies-stage[^{}]*\{[^}]*pointer-events\s*:\s*none/);
  assert.match(css, /#fireflies-stage[^{}]*\{[^}]*position\s*:\s*fixed/);
  assert.match(css, /#fireflies-stage[^{}]*\[data-paused=["']true["']\][^{}]*\{[^}]*animation-play-state\s*:\s*paused/);
  // Whitespace is not semantics: accept compact/minified media queries and
  // inspect only their balanced blocks, not unrelated CSS following them.
  const mediaBlocks = [...css.matchAll(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/g)].map(match => {
    const start = match.index + match[0].length;
    let depth = 1, end = start;
    for (; end < css.length && depth; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}') depth--;
    }
    assert.equal(depth, 0, 'reduced-motion CSS block is balanced');
    return css.slice(start, end - 1);
  });
  const reduced = mediaBlocks.filter(block => block.includes('#fireflies-stage')).join('\n');
  assert.ok(reduced, 'firefly CSS has reduced-motion fallback');
  assert.match(reduced, /#fireflies-stage[^{}]*\{[^}]*display\s*:\s*none/);
  for (const animation of ['ff-mote', 'ff-glow']) {
    assert.ok(reduced.match(/[^{}]+\{[^{}]*animation\s*:\s*none[^{}]*\}/g)?.some(rule =>
      rule.slice(0, rule.indexOf('{')).includes('.' + animation)), 'reduced motion disables ' + animation);
  }
  assert.match(css, /\.ff-mote[^{}]*\{[^}]*animation\s*:/);
  assert.match(css, /\.ff-glow[^{}]*\{[^}]*animation\s*:/);
});

test('deferred module loads before settings with refreshed JS/CSS cache versions', () => {
  const config = read('_config.fomalhaut.yml');
  const scripts = [...config.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/g)];
  const index = scripts.findIndex(match => match[1].startsWith('/js/modules/fireflies.js?'));
  assert.notEqual(index, -1);
  assert.match(scripts[index][0], /\bdefer\b/);
  assert.match(scripts[index][1], /[?&]v=[^&"']*fireflies1/);
  const settingsIndex = scripts.findIndex(match => match[1].startsWith('/js/modules/settings.js?'));
  assert.ok(index < settingsIndex, 'settings can access the controller on first execution');
  assert.match(scripts[settingsIndex][1], /[?&]v=[^&"']*snow1/);
  assert.match(config, /href=["']\/css\/site-inject\.css\?v=[^"']*snow1["']/);
  assert.equal(scripts.filter(match => match[1].startsWith('/js/modules/fireflies.js')).length, 1);
});
