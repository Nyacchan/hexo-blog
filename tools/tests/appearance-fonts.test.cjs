'use strict';
// Run: node --test tools/tests/appearance-fonts.test.cjs
// Exercise the real classic module in VM; settings.js setters alone are stubbed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const modulePath = path.resolve(__dirname, '../../source/js/modules/appearance-fonts.js');
const source = fs.readFileSync(modulePath, 'utf8');
const textFonts = ['LXGWScreen', 'LXGW', 'LXGWNeoXiHei', 'SourceHanSerif', 'ZhuZiAWan', 'HYTMR', 'TTQHB', 'default'];
const codeFonts = ['Monaco_1', 'Consolas_1', 'MapleMono_1', 'Hack_1'];
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
function element(id) {
  const attributes = new Map(), properties = new Map();
  return { id, checked: false, textContent: '', innerText: '', dataset: {},
    style: { fontFamily: '', setProperty(k, v) { properties.set(k, v); }, getPropertyValue: k => properties.get(k) || '' },
    setAttribute(k, v) { attributes.set(k, String(v)); }, getAttribute: k => attributes.get(k) ?? null };
}
function harness(saved = {}, options = {}) {
  const store = new Map(Object.entries({ font: 'LXGWScreen', codeFont: 'Monaco_1', themeColor: 'purple', bg: 'user-background', ...saved }));
  const writes = [], setters = [], probes = [], timers = new Map(), nodes = new Map();
  let now = 0, timerId = 0;
  const localStorage = { getItem: k => store.get(k) ?? null,
    setItem(k, v) { writes.push([k, String(v)]); store.set(k, String(v)); } };
  if (options.nodes !== false) {
    for (const kind of ['text', 'code']) {
      for (const suffix of ['preview', 'status', 'current']) nodes.set('ap-' + kind + '-' + suffix, element('ap-' + kind + '-' + suffix));
      for (const key of kind === 'text' ? textFonts : codeFonts) {
        const id = (kind === 'text' ? 'swf_' : 'swfc_') + key;
        nodes.set(id, element(id));
      }
    }
  }
  const document = { getElementById: id => nodes.get(id) || null,
    documentElement: element('root'), body: element('body'),
    fonts: { load(font, sample) { const d = deferred(); probes.push({ font, sample, ...d }); return d.promise; } } };
  if (options.fonts === false) delete document.fonts;
  if (options.load === false) document.fonts = {};
  if (options.throwLoad) document.fonts.load = () => { throw new Error('font loader threw synchronously'); };
  const ctx = vm.createContext({ document, localStorage, console,
    FONT_LIST: textFonts.slice(), FONT_DEFAULT: 'LXGWScreen', CODE_FONT_LIST: codeFonts.slice(), CODE_FONT_DEFAULT: 'Monaco_1',
    setFont(key) { setters.push(['text', key]); localStorage.setItem('font', key); document.documentElement.style.setProperty('--font-family', key); },
    setCodeFont(key) { setters.push(['code', key]); localStorage.setItem('codeFont', key); document.documentElement.style.setProperty('--code-font', key); },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + Number(delay) }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.runInContext(source, ctx, { filename: modulePath });
  return { ctx, document, store, writes, setters, probes, timers, nodes,
    choose: (key, kind) => ctx.chooseAppearanceFont(key, kind), init: () => ctx.initAppearanceFonts(),
    reset: () => ctx.resetAppearanceFonts(), cancel: () => ctx.cancelAppearanceFonts(),
    async tick(ms) {
      const end = now + ms;
      while (true) {
        const entry = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        now = entry[1].at; timers.delete(entry[0]); entry[1].fn(); await flush();
      }
      now = end; await flush();
    }
  };
}
function preview(h, kind) { return h.nodes.get('ap-' + kind + '-preview').style.fontFamily; }
function status(h, kind) { return h.nodes.get('ap-' + kind + '-status').textContent; }
function unchanged(h, saved = { font: 'LXGWScreen', codeFont: 'Monaco_1' }) {
  assert.equal(h.store.get('font'), saved.font); assert.equal(h.store.get('codeFont'), saved.codeFont);
  assert.deepEqual(h.setters, []); assert.deepEqual(h.writes, []);
  assert.equal(h.store.get('themeColor'), 'purple'); assert.equal(h.store.get('bg'), 'user-background');
}
function selected(h, kind, key) {
  for (const font of kind === 'text' ? textFonts : codeFonts) {
    const el = h.nodes.get((kind === 'text' ? 'swf_' : 'swfc_') + font);
    assert.equal(el.getAttribute('aria-pressed'), String(font === key), el.id + ' selection');
  }
}
function blockWithId(html, tag, id) {
  // Contract IDs contain only safe alphanumeric/underscore/hyphen characters.
  return html.match(new RegExp('<' + tag + '\\b[^>]*\\bid=["\x27]' + id + '["\x27][^>]*>[\\s\\S]*?<\\/' + tag + '>', 'i'))?.[0];
}
function plainText(block) { return block.replace(/<[^>]*>/g, ' ').trim(); }

test('classic module provides all public globals without settings eval or side effects', () => {
  const h = harness();
  for (const name of ['appearanceFontMarkup', 'chooseAppearanceFont', 'resetAppearanceFonts', 'cancelAppearanceFonts', 'initAppearanceFonts']) assert.equal(typeof h.ctx[name], 'function', name);
  unchanged(h); assert.equal(h.probes.length, 0);
});

test('markup keeps eight text/four code buttons, semantic labels and previews without eagerly styling font names', () => {
  const h = harness(), html = h.ctx.appearanceFontMarkup();
  assert.equal(typeof html, 'string');
  assert.equal((html.match(/<button\b[^>]*class=["'][^"']*\bap-font-option\b/g) || []).length, 12);
  for (const [kind, fonts] of [['text', textFonts], ['code', codeFonts]]) {
    for (const key of fonts) {
      const id = (kind === 'text' ? 'swf_' : 'swfc_') + key, button = blockWithId(html, 'button', id);
      assert.ok(button, id + ' is retained as a button');
      assert.match(button, /class=["'][^"']*\bap-font-option\b/);
      const className = button.match(/class=["']([^"']*)/)[1];
      assert.ok(!className.split(/\s+/).includes('swf'), 'avoid legacy swf styles');
      assert.match(button, new RegExp('data-font-kind=["\x27]' + kind + '["\x27]'));
      assert.match(button, /aria-pressed=["'](?:true|false)["']/);
      assert.doesNotMatch(button, /font-family\s*:/i, 'button labels must not load each webfont');
      assert.ok(plainText(button).length > 0);
      assert.match(button, /<small\b[^>]*>[^<]+<\/small>/, 'purpose/default annotation');
    }
  }
  for (const label of ['霞鹜文楷', '霞鹜新晰黑', '思源宋体', '筑紫', '汉仪唐美人', '甜甜圈', '系统', 'Monaco', 'Consolas', 'Maple', 'Hack', '默认']) assert.ok(html.includes(label), label + ' name/default');
  assert.match(html, /正文|阅读/); assert.match(html, /个性/); assert.match(html, /代码/);
  const details = html.match(/<details\b[^>]*>[\s\S]*?<\/details>/g) || [];
  assert.ok(details.some(s => s.includes('个性') && ['ZhuZiAWan', 'HYTMR', 'TTQHB'].every(k => s.includes('swf_' + k))), 'decorative fonts live in disclosure');
  const text = blockWithId(html, 'p', 'ap-text-preview'), code = blockWithId(html, 'pre', 'ap-code-preview');
  assert.ok(text, 'one paragraph preview'); assert.ok(code, 'one pre preview');
  assert.match(plainText(text), /[\u4e00-\u9fff]/); assert.match(plainText(text), /[a-zA-Z]/); assert.match(plainText(text), /\d/);
  for (const token of ['0', 'O', '1', 'l', 'I', '{', '}']) assert.ok(plainText(code).includes(token), 'code preview includes ' + token);
  for (const kind of ['text', 'code']) {
    assert.equal((html.match(new RegExp('id=["\x27]ap-' + kind + '-preview["\x27]', 'g')) || []).length, 1);
    assert.match(html, new RegExp('id=["\x27]ap-' + kind + '-current["\x27]'));
    const statusTag = html.match(new RegExp('<[^>]+id=["\x27]ap-' + kind + '-status["\x27][^>]*>'))?.[0];
    assert.ok(statusTag); assert.match(statusTag, /role=["']status["']|aria-live=["']polite["']/);
  }
  unchanged(h); assert.equal(h.probes.length, 0);
});

test('init reflects saved choices/current names in shared previews without loads or writes', () => {
  const h = harness({ font: 'SourceHanSerif', codeFont: 'Hack_1' }); h.init();
  selected(h, 'text', 'SourceHanSerif'); selected(h, 'code', 'Hack_1');
  assert.ok(preview(h, 'text').includes('SourceHanSerif')); assert.ok(preview(h, 'code').includes('Hack_1'));
  assert.match(h.nodes.get('ap-text-current').textContent, /思源宋体/); assert.match(h.nodes.get('ap-code-current').textContent, /Hack/);
  unchanged(h, { font: 'SourceHanSerif', codeFont: 'Hack_1' }); assert.equal(h.probes.length, 0);
});

test('invalid keys and all invalid explicit kinds never probe or persist', async () => {
  const h = harness();
  for (const [key, kind] of [['unknown', 'text'], ['Hack_1', 'text'], ['LXGW', 'code'], ['LXGW', 'unknown'], ['LXGW', ''], ['LXGW', null], ['LXGW', false], ['LXGW', 0], ['LXGW', {}], ['default', 'code'], ['', 'text'], ['__proto__', 'text'], ['constructor', 'text'], ['LXGW";x', 'text'], [null, 'text'], [{}, 'code']]) assert.equal(await h.choose(key, kind), false, String(key) + '/' + kind);
  assert.equal(h.probes.length, 0); unchanged(h);
});

test('webfont applies only after a nonempty chosen-family load and repeat current selection avoids another request', async () => {
  const h = harness(); h.init(); const before = preview(h, 'text');
  const result = h.choose('LXGW'); assert.equal(typeof result.then, 'function'); await flush();
  assert.equal(h.probes.length, 1); assert.equal(h.probes[0].font, '16px "LXGW"');
  assert.equal(typeof h.probes[0].sample, 'string'); assert.match(h.probes[0].sample, /[\u4e00-\u9fff]/);
  unchanged(h); assert.equal(preview(h, 'text'), before);
  h.probes[0].resolve([{}]); assert.equal(await result, true);
  assert.deepEqual(h.setters, [['text', 'LXGW']]); assert.deepEqual(h.writes, [['font', 'LXGW']]);
  assert.ok(preview(h, 'text').includes('LXGW')); selected(h, 'text', 'LXGW');
  assert.equal(h.store.get('themeColor'), 'purple'); assert.equal(h.store.get('bg'), 'user-background'); assert.equal(h.timers.size, 0);
  assert.equal(await h.choose('LXGW'), true); assert.equal(h.probes.length, 1);
});

test('system default works even without Font Loading API and makes no network probes', async () => {
  for (const options of [{}, { fonts: false }, { load: false }]) {
    const h = harness({}, options); h.init(); assert.equal(await h.choose('default', 'text'), true);
    assert.equal(h.store.get('font'), 'default'); assert.deepEqual(h.setters, [['text', 'default']]);
    assert.equal(h.probes.length, 0); selected(h, 'text', 'default'); assert.match(preview(h, 'text'), /system-ui|sans-serif/);
  }
});

for (const failure of ['empty', 'reject', 'timeout', 'missing fonts', 'missing load', 'throw']) {
  test(failure + ' retains font/storage/selection/preview and gives status feedback', async () => {
    const options = failure === 'missing fonts' ? { fonts: false } : failure === 'missing load' ? { load: false } : failure === 'throw' ? { throwLoad: true } : {};
    const h = harness({}, options); h.init(); const before = preview(h, 'text');
    const result = h.choose('TTQHB', 'text'); await flush();
    if (failure === 'empty') h.probes[0].resolve([]);
    if (failure === 'reject') h.probes[0].reject(new Error('font network failure'));
    if (failure === 'timeout') { await h.tick(11999); unchanged(h); assert.equal(h.timers.size, 1); await h.tick(1); }
    assert.equal(await result, false); unchanged(h); assert.equal(preview(h, 'text'), before); selected(h, 'text', 'LXGWScreen');
    assert.ok(status(h, 'text').length > 0); assert.equal(h.nodes.get('ap-text-status').dataset.state, 'error'); assert.equal(h.timers.size, 0);
    if (failure === 'timeout') { h.probes[0].resolve([{}]); await flush(); unchanged(h); assert.equal(preview(h, 'text'), before); }
  });
}

test('latest text choice wins and superseded request settles false immediately', async () => {
  const h = harness(); h.init(); const old = h.choose('LXGW', 'text'), latest = h.choose('SourceHanSerif', 'text'); await flush();
  assert.equal(await old, false); assert.equal(h.probes.length, 2);
  h.probes[1].resolve([{}]); assert.equal(await latest, true); h.probes[0].resolve([{}]); await flush();
  assert.deepEqual(h.setters, [['text', 'SourceHanSerif']]); assert.equal(h.store.get('font'), 'SourceHanSerif');
  selected(h, 'text', 'SourceHanSerif'); assert.ok(preview(h, 'text').includes('SourceHanSerif'));
});

test('stale rejection cannot overwrite status after the latest success', async () => {
  const h = harness(); h.init(); const old = h.choose('HYTMR', 'text'), latest = h.choose('LXGWNeoXiHei', 'text'); await flush();
  h.probes[1].resolve([{}]); assert.equal(await latest, true); const current = status(h, 'text');
  h.probes[0].reject(new Error('late failure')); assert.equal(await old, false); await flush();
  assert.equal(status(h, 'text'), current); selected(h, 'text', 'LXGWNeoXiHei');
});

test('choosing already active font cancels a pending different selection', async () => {
  const h = harness(); h.init(); const old = h.choose('TTQHB', 'text'); await flush();
  assert.equal(await h.choose('LXGWScreen', 'text'), true); assert.equal(h.probes.length, 1);
  h.probes[0].resolve([{}]); assert.equal(await old, false); await flush();
  assert.equal(h.store.get('font'), 'LXGWScreen'); selected(h, 'text', 'LXGWScreen');
});

test('parallel text/code choices load independently with the code ambiguity sample', async () => {
  const h = harness(); h.init(); const text = h.choose('LXGW', 'text'), code = h.choose('MapleMono_1', 'code'); await flush();
  assert.deepEqual(h.probes.map(p => p.font), ['16px "LXGW"', '16px "MapleMono_1"']);
  for (const token of ['0', 'O', '1', 'l', 'I', '{', '}']) assert.ok(h.probes[1].sample.includes(token));
  h.probes[1].resolve([{}]); assert.equal(await code, true); assert.equal(h.store.get('font'), 'LXGWScreen');
  h.probes[0].resolve([{}]); assert.equal(await text, true);
  assert.deepEqual(h.setters, [['code', 'MapleMono_1'], ['text', 'LXGW']]);
  selected(h, 'text', 'LXGW'); selected(h, 'code', 'MapleMono_1'); assert.ok(preview(h, 'code').includes('MapleMono_1'));
});

test('local reset synchronously restores font defaults only and defeats late success/rejection', async () => {
  const h = harness({ font: 'SourceHanSerif', codeFont: 'Hack_1' }); h.init();
  const text = h.choose('LXGW', 'text'), code = h.choose('Consolas_1', 'code'); await flush(); h.reset();
  assert.deepEqual(h.setters, [['text', 'LXGWScreen'], ['code', 'Monaco_1']]);
  assert.deepEqual(h.writes, [['font', 'LXGWScreen'], ['codeFont', 'Monaco_1']]); assert.equal(h.probes.length, 2);
  assert.equal(h.store.get('themeColor'), 'purple'); assert.equal(h.store.get('bg'), 'user-background');
  selected(h, 'text', 'LXGWScreen'); selected(h, 'code', 'Monaco_1');
  assert.ok(preview(h, 'text').includes('LXGWScreen')); assert.ok(preview(h, 'code').includes('Monaco_1'));
  const after = [status(h, 'text'), status(h, 'code')];
  assert.equal(await text, false); assert.equal(await code, false);
  h.probes[0].resolve([{}]); h.probes[1].reject(new Error('late reset failure')); await h.tick(12000);
  assert.equal(h.setters.length, 2); assert.deepEqual([status(h, 'text'), status(h, 'code')], after); assert.equal(h.timers.size, 0);
});

test('global cancellation settles both pending choices false without itself resetting preferences', async () => {
  const h = harness({ font: 'SourceHanSerif', codeFont: 'Hack_1' }); h.init();
  const text = h.choose('LXGW', 'text'), code = h.choose('Consolas_1', 'code'); await flush(); h.cancel();
  assert.equal(await text, false); assert.equal(await code, false);
  h.probes[0].resolve([{}]); h.probes[1].resolve([{}]); await h.tick(12000);
  unchanged(h, { font: 'SourceHanSerif', codeFont: 'Hack_1' }); assert.equal(h.timers.size, 0);
});

test('fresh post-reset request works while pre-reset request cannot apply', async () => {
  const h = harness(); const old = h.choose('HYTMR', 'text'); await flush(); h.reset();
  const fresh = h.choose('ZhuZiAWan', 'text'); await flush(); h.probes[0].resolve([{}]); assert.equal(await old, false);
  h.probes[1].resolve([{}]); assert.equal(await fresh, true);
  assert.equal(h.store.get('font'), 'ZhuZiAWan'); selected(h, 'text', 'ZhuZiAWan');
});



test('every whitelisted noncurrent webfont probes only itself then applies via its matching setter', async () => {
  for (const [kind, fonts] of [['text', textFonts.filter(k => k !== 'default')], ['code', codeFonts]]) {
    for (const key of fonts) {
      const saved = kind === 'text' ? { font: key === 'LXGWScreen' ? 'LXGW' : 'LXGWScreen' } : { codeFont: key === 'Monaco_1' ? 'Hack_1' : 'Monaco_1' };
      const h = harness(saved); h.init(); const old = preview(h, kind), result = h.choose(key, kind); await flush();
      assert.equal(h.probes.length, 1, key); assert.equal(h.probes[0].font, '16px "' + key + '"');
      assert.equal(preview(h, kind), old); assert.deepEqual(h.setters, []); assert.deepEqual(h.writes, []);
      h.probes[0].resolve([{}]); assert.equal(await result, true, key);
      assert.deepEqual(h.setters, [[kind, key]]); assert.deepEqual(h.writes, [[kind === 'text' ? 'font' : 'codeFont', key]]);
      selected(h, kind, key); assert.ok(preview(h, kind).includes('"' + key + '"'));
    }
  }
});

test('latest code token changes do not cancel a concurrently pending text request', async () => {
  const h = harness(); h.init();
  const text = h.choose('SourceHanSerif', 'text'), oldCode = h.choose('Consolas_1', 'code'), freshCode = h.choose('Hack_1', 'code'); await flush();
  assert.equal(await oldCode, false); h.probes[1].resolve([{}]); await flush();
  assert.deepEqual(h.setters, [], 'stale code result cannot apply either kind');
  h.probes[2].resolve([{}]); assert.equal(await freshCode, true);
  h.probes[0].resolve([{}]); assert.equal(await text, true);
  assert.deepEqual(h.setters, [['code', 'Hack_1'], ['text', 'SourceHanSerif']]);
  selected(h, 'code', 'Hack_1'); selected(h, 'text', 'SourceHanSerif');
});

test('failed code load preserves its old value and permits retry while text continues independently', async () => {
  const h = harness(); h.init(); const before = preview(h, 'code');
  const text = h.choose('LXGW', 'text'), first = h.choose('Consolas_1', 'code'); await flush();
  h.probes[1].resolve([]); assert.equal(await first, false);
  assert.equal(h.store.get('codeFont'), 'Monaco_1'); assert.equal(preview(h, 'code'), before); assert.deepEqual(h.setters, []);
  const retry = h.choose('Consolas_1', 'code'); await flush(); assert.equal(h.probes.length, 3);
  h.probes[2].resolve([{}]); assert.equal(await retry, true); h.probes[0].resolve([{}]); assert.equal(await text, true);
  assert.deepEqual(h.setters, [['code', 'Consolas_1'], ['text', 'LXGW']]);
});

test('reinitializing a visible panel during a pending load does not preload or cancel that selection', async () => {
  const h = harness(); h.init(); const before = preview(h, 'text'); const pending = h.choose('LXGW', 'text'); await flush();
  h.init(); assert.equal(h.probes.length, 1); assert.equal(preview(h, 'text'), before); selected(h, 'text', 'LXGWScreen'); unchanged(h);
  h.probes[0].resolve([{}]); assert.equal(await pending, true); selected(h, 'text', 'LXGW');
});

test('missing panel DOM is safe for init, markup, failure, success, cancel and reset', async () => {
  const h = harness({}, { nodes: false }); assert.doesNotThrow(() => h.init()); assert.doesNotThrow(() => h.ctx.appearanceFontMarkup());
  const failure = h.choose('LXGW', 'text'); await flush(); h.probes[0].resolve([]); assert.equal(await failure, false); unchanged(h);
  const success = h.choose('Hack_1', 'code'); await flush(); h.probes[1].resolve([{}]); assert.equal(await success, true);
  assert.doesNotThrow(() => h.cancel()); assert.doesNotThrow(() => h.reset());
  assert.equal(h.store.get('font'), 'LXGWScreen'); assert.equal(h.store.get('codeFont'), 'Monaco_1'); assert.equal(h.probes.length, 2);
});
