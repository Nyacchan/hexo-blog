'use strict';
// No browser or dependencies: node --test tools/tests/beauty-switches.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const settings = fs.readFileSync(path.join(root, 'source/js/modules/settings.js'), 'utf8');
const boot = fs.readFileSync(path.join(root, 'source/js/inject/beauty-boot.js'), 'utf8');
function section(start, end) {
  const from = settings.indexOf(start), to = settings.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, 'real settings section exists: ' + start);
  return settings.slice(from, to);
}
const defaultsSource = section('var FONT_LIST =', '// 设置字体');
const switchesSource = section('function syncInteractionControls()', '// 星空背景开关');
const resetSource = section('function reset() {', '// 量一次');
const panelSource = section('function createWinbox() {', 'function resetBg() {');

function harness(saved = {}, panel = true) {
  const store = new Map(Object.entries(saved)), writes = [], calls = [], syncs = [], nodes = new Map(), classes = new Set();
  const localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem(key, value) { store.set(key, String(value)); writes.push([key, String(value)]); }
  };
  function node() { return { checked: false, style: { setProperty() {} }, classList: { add() {}, remove() {} } }; }
  const document = {
    documentElement: { style: { setProperty() {} }, classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      contains: name => classes.has(name)
    } },
    getElementById(id) {
      if (!panel && (id === 'nekoSet' || id === 'cursorSet' || id === 'rippleSet')) return null;
      if (!nodes.has(id)) nodes.set(id, node());
      return nodes.get(id);
    },
    createElement: node,
    body: { appendChild() {} }, head: { appendChild() {} }
  };
  let panelHtml = '';
  const ctx = vm.createContext({ document, localStorage,
    window: { addEventListener() {}, FOMAL_RIPPLE: { setEnabled: value => calls.push(['ripple', value]), syncControls: () => syncs.push(true) } },
    setNekoEnabled: value => calls.push(['cat', value]), CURSOR: { setEnabled: value => calls.push(['cursor', value]) },
    setFont() {}, setCodeFont() {}, setColor() {}, themeColorMarkup() { return ""; }, syncThemeColorControls() {}, resetBg_() {}, changeLight() {}, startFps() {},
    appearanceFontMarkup() { return ""; }, appearanceBackgroundMarkup() { return ""; }, initAppearanceFonts() {}, initAppearanceBackgrounds() {},
    fomalNotify() {}, resetBgFilter() {}, resetTrans() {}, initRangeJump() {}, syncTransControls() {},
    winResize() {}, readBgFilter() {}, applyBgFilter() {}, syncBgFilterControls() {},
    setFontBorder() {}, setCodeFontBorder() {}, bgFilterMarkup: () => '', defineColor: '#000000',
    bingDayBg: '', bingHistoryBg: '', EEEDog: '', seovx: '', picsum: '', waiBizhi: '', btstu: '', unsplash: '',
    WinBox() { return { body: { set innerHTML(value) {
      panelHtml = value; panel = true; nodes.delete('nekoSet'); nodes.delete('cursorSet'); nodes.delete('rippleSet');
    } } }; }
  });
  vm.runInContext(defaultsSource + '\n' + switchesSource + '\n' + resetSource + '\n' + panelSource, ctx);
  return { ctx, store, writes, calls, syncs, document, classes, nodes,
    get panelHtml() { return panelHtml; },
    clear() { writes.length = 0; calls.length = 0; },
    boot() { vm.runInContext(boot, ctx); },
    panel(value) { panel = value; }
  };
}

for (const value of [undefined, '1', 'false', '', 'undefined', 'null']) {
  test('interaction helpers default enabled unless stored exact zero: ' + value, () => {
    const h = harness(value === undefined ? {} : { nekoOn: value, cursorOn: value });
    assert.deepEqual(h.calls, [['cat', true], ['cursor', true], ['ripple', false]]);
    assert.equal(h.document.getElementById('nekoSet').checked, true);
    assert.equal(h.document.getElementById('cursorSet').checked, true);
    assert.equal(h.document.getElementById('rippleSet').checked, false);
    assert.deepEqual(h.writes, []);
  });
}
for (const saved of [{ nekoOn: '0' }, { cursorOn: '0' }, { nekoOn: '0', cursorOn: '0' }]) {
  test('applyInteractionSettings reads independent saved off values ' + JSON.stringify(saved), () => {
    const h = harness({ mouse: 'off', ...saved });
    assert.deepEqual(h.calls, [['cat', saved.nekoOn !== '0'], ['cursor', saved.cursorOn !== '0'], ['ripple', false]]);
    assert.equal(h.document.getElementById('nekoSet').checked, saved.nekoOn !== '0');
    assert.equal(h.document.getElementById('cursorSet').checked, saved.cursorOn !== '0');
    assert.deepEqual(h.writes, []);
  });
}
for (const [control, helper, key, effect, other] of [
  ['nekoSet', 'setNeko', 'nekoOn', 'cat', 'cursorOn'],
  ['cursorSet', 'setCursor', 'cursorOn', 'cursor', 'nekoOn'],
  ['rippleSet', 'setRipple', 'rippleOn', 'ripple', 'cursorOn']
]) {
  test(helper + ' persists only its own preference and applies boolean state', () => {
    const h = harness({ nekoOn: '1', cursorOn: '1', mouse: 'legacy' }); h.clear();
    const toggle = h.document.getElementById(control);
    toggle.checked = false; h.ctx[helper]();
    assert.deepEqual(h.writes, [[key, '0']]); assert.deepEqual(h.calls, [[effect, false]]);
    assert.equal(h.store.get(other), '1'); assert.equal(h.store.get('mouse'), 'legacy');
    h.clear(); toggle.checked = true; h.ctx[helper]();
    assert.deepEqual(h.writes, [[key, '1']]); assert.deepEqual(h.calls, [[effect, true]]);
    assert.equal(h.store.get(other), '1'); assert.equal(h.store.get('mouse'), 'legacy');
  });
}
test('missing panel controls make toggles safe no-ops, but preferences still apply', () => {
  const h = harness({ nekoOn: '0', cursorOn: '0', mouse: 'legacy' }, false); h.clear();
  assert.doesNotThrow(() => { h.ctx.setNeko(); h.ctx.setCursor(); h.ctx.setRipple(); h.ctx.syncInteractionControls(); });
  assert.deepEqual(h.writes, []); assert.deepEqual(h.calls, []);
  h.ctx.applyInteractionSettings(); assert.deepEqual(h.calls, [['cat', false], ['cursor', false], ['ripple', false]]);
  assert.deepEqual(h.writes, []);
});
test('panel synchronization reads latest storage without changing effects or persisting', () => {
  const h = harness({ nekoOn: '0', cursorOn: '1' }); h.clear();
  h.store.set('nekoOn', '1'); h.store.set('cursorOn', '0'); h.ctx.syncInteractionControls();
  assert.equal(h.document.getElementById('nekoSet').checked, true);
  assert.equal(h.document.getElementById('cursorSet').checked, false);
  assert.deepEqual(h.calls, []); assert.deepEqual(h.writes, []);
  h.ctx.applyInteractionSettings(); assert.deepEqual(h.calls, [['cat', true], ['cursor', false], ['ripple', false]]);
});
test('creating and reopening actual settings panel restores saved switches and handlers', () => {
  const h = harness({ nekoOn: '0', cursorOn: '1', themeColor: 'green' }, false); h.clear();
  h.ctx.createWinbox();
  assert.ok(h.panelHtml.includes('id="nekoSet" onchange="setNeko()"'));
  assert.ok(h.panelHtml.includes('id="cursorSet" onchange="setCursor()"'));
  assert.ok(h.panelHtml.includes('id="rippleHint"'));
  assert.ok(h.panelHtml.includes('id="rippleSet" aria-describedby="rippleHint" onchange="setRipple()"'));
  assert.equal(h.document.getElementById('nekoSet').checked, false);
  assert.equal(h.document.getElementById('cursorSet').checked, true);
  assert.equal(h.document.getElementById('rippleSet').checked, false);
  h.store.set('nekoOn', '1'); h.store.set('cursorOn', '0'); h.ctx.createWinbox();
  assert.equal(h.document.getElementById('nekoSet').checked, true);
  assert.equal(h.document.getElementById('cursorSet').checked, false);
  assert.deepEqual(h.calls, []); assert.deepEqual(h.writes, []);
});
test('real initItem restores both independent defaults without applying runtime effects', () => {
  const h = harness({ nekoOn: '0', cursorOn: '0' }); h.clear(); h.ctx.initItem();
  assert.equal(h.store.get('nekoOn'), '1'); assert.equal(h.store.get('cursorOn'), '1');
  assert.equal(h.store.get('rippleOn'), '0');
  assert.deepEqual(h.calls, []);
});
test('real reset restores both effects and synchronizes panel controls immediately', () => {
  const h = harness({ nekoOn: '0', cursorOn: '0', rippleOn: '1' }); h.clear(); h.ctx.reset();
  assert.equal(h.store.get('nekoOn'), '1'); assert.equal(h.store.get('cursorOn'), '1');
  assert.equal(h.store.get('rippleOn'), '0');
  assert.deepEqual(h.calls, [['cat', true], ['cursor', true], ['ripple', false]]);
  assert.equal(h.document.getElementById('nekoSet').checked, true);
  assert.equal(h.document.getElementById('cursorSet').checked, true);
  assert.equal(h.document.getElementById('rippleSet').checked, false);
  h.clear(); h.ctx.reset(); assert.deepEqual(h.calls, [['cat', true], ['cursor', true], ['ripple', false]]);
});
for (const saved of [{}, { nekoOn: '1' }, { nekoOn: 'false' }, { cursorOn: '0' }, { nekoOn: '0' }, { nekoOn: '0', cursorOn: '1' }]) {
  test('actual beauty boot off class depends only on exact stored cat zero ' + JSON.stringify(saved), () => {
    const h = harness(saved); h.clear(); h.classes.add('beauty-neko-off'); h.classes.add('unrelated'); h.boot();
    assert.equal(h.classes.has('beauty-neko-off'), saved.nekoOn === '0');
    assert.equal(h.classes.has('unrelated'), true); assert.deepEqual(h.writes, []); assert.deepEqual(h.calls, []);
  });
}
// 点击涟漪与上面两个相反：默认关，只有显式存过 '1' 才开。
for (const value of [undefined, '1', 'true', '0', '', 'on', 'undefined']) {
  test('ripple stays off unless stored value is exactly one: ' + value, () => {
    const h = harness(value === undefined ? {} : { rippleOn: value });
    assert.deepEqual(h.calls.filter(call => call[0] === 'ripple'), [['ripple', value === '1']]);
    assert.equal(h.document.getElementById('rippleSet').checked, value === '1');
    assert.deepEqual(h.writes, []);
  });
}
test('panel synchronization hands the ripple hint over to the module', () => {
  const h = harness({ rippleOn: '1' }); h.clear(); h.syncs.length = 0;
  h.ctx.syncInteractionControls();
  assert.equal(h.syncs.length, 1);
  assert.equal(h.document.getElementById('rippleSet').checked, true);
});
test('beauty boot tolerates unavailable localStorage without hiding default cat', () => {
  const h = harness(); h.clear(); h.ctx.localStorage = { getItem() { throw new Error('storage blocked'); } };
  assert.doesNotThrow(() => h.boot()); assert.equal(h.classes.has('beauty-neko-off'), false);
});
