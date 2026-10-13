'use strict';
// Run: node --test tools/tests/navigation.test.cjs
// Real-source contracts only: no browser, computedStyle mock, build or network.
// Uses the repository's already installed css/js-yaml parsers; no new dependencies.
// These checks do NOT prove rendered geometry, contrast, animation or touch behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const css = require('css');
const yaml = require('js-yaml');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const source = read('source/css/navigation.css');
const ast = css.parse(source, { source: 'source/css/navigation.css', silent: false });
const rules = [];
function visit(nodes, guards = []) {
  for (const node of nodes) {
    if (node.type === 'comment') continue;
    if (node.type === 'rule') {
      for (const selector of node.selectors) rules.push({ selector, declarations: node.declarations.filter(d => d.type === 'declaration'), guards, line: node.position.start.line });
    } else {
      assert.ok(['supports', 'media'].includes(node.type), 'only media/supports wrappers, no imports/global side effects: ' + node.type);
      visit(node.rules, [...guards, { type: node.type, condition: node[node.type] }]);
    }
  }
}
visit(ast.stylesheet.rules);
const clean = value => value.replace(/\s*!important\s*$/i, '').trim();
const important = declaration => /!important\s*$/i.test(declaration.value);
const base = rule => rule.guards.length === 0;
const supportsFilter = rule => rule.guards.some(g => g.type === 'supports' && /backdrop-filter/.test(g.condition));
const compact = condition => condition.replace(/\s+/g, '').toLowerCase();
const filterMedia = 'screen and (min-width: 1200px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const filterSupport = '((backdrop-filter: blur(6px)) or (-webkit-backdrop-filter: blur(6px)))';
function filterWhitelist(rule) {
  assert.deepEqual(rule.guards.map(g => g.type), ['media', 'supports'], 'filter must be nested inside the media/supports whitelist: ' + rule.selector);
  assert.equal(compact(rule.guards[0].condition), compact(filterMedia), 'exact desktop fine-pointer, hover and normal-motion whitelist');
  assert.equal(compact(rule.guards[1].condition), compact(filterSupport), 'only the standard/prefixed blur(6px) feature support alternative');
}
const reduced = rule => rule.guards.some(g => g.type === 'media' && compact(g.condition) === '(prefers-reduced-motion:reduce)');
const logoSelector = '#nav > #blog_name > #site-name';
const media = width => rule => rule.guards.some(g => g.type === 'media' && new RegExp('max-width\\s*:\\s*' + width + 'px').test(g.condition));
function find(selector, guard = base) {
  const found = rules.filter(r => r.selector === selector && guard(r));
  assert.equal(found.length, 1, 'one source rule for ' + selector);
  return found[0];
}
function decl(rule, property) {
  const found = rule.declarations.filter(d => d.property === property);
  assert.equal(found.length, 1, rule.selector + ' at line ' + rule.line + ': one ' + property);
  return found[0];
}
function value(rule, property, expected, mustBeImportant = false) {
  const d = decl(rule, property);
  assert.equal(clean(d.value), expected, rule.selector + ': ' + property);
  if (mustBeImportant) assert.ok(important(d), rule.selector + ': ' + property + ' must beat existing theme/inline declaration');
}
function rgba(rule) {
  const d = decl(rule, 'background');
  assert.ok(important(d), 'surface background must beat the existing important dark background');
  const match = clean(d.value).match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0?\.\d+|1(?:\.0+)?)\s*\)$/);
  assert.ok(match, 'explicit fallback RGBA, no gradient or filter-dependent color: ' + d.value);
  return match.slice(1).map(Number);
}
const states = ['nav-fixed', 'nav-visible', 'not-top-img'];
const surfaces = states.map(state => '#page-header.' + state + ' #nav');
const controls = [
  '#nav #nav-right > #search-button > a.search',
  '#nav #nav-right > #meihua-button',
  '#nav #nav-right > #nightmode-button',
  '#nav #nav-right > #toggle-menu > a'
];

// Independent LF-normalized pre-implementation baselines, recorded before the CSS
// was completed, not derived from production at test time. Deliberate future theme
// edits require an explicit review of these preservation fixtures.
const originalThemeHashes = {
  'themes/fomalhaut/layout/includes/header/nav.pug': '2fc3867a67b9258877faf793084f80ed31e47c4d5ce7639ac6932698f820f759',
  'themes/fomalhaut/layout/includes/header/menu_item.pug': '97e25cf1d5a03ce70c52285506e3a651447815004ad6c46989960269730757f5',
  'themes/fomalhaut/source/css/_layout/head.styl': '1a43dba4483db527b3c20967d9289c6bb4b53b0232037cc08c40d141558ec29f',
  'themes/fomalhaut/source/css/_custom/custom.css': 'b158a558bb9614e87023f559ac554ab0bb7dbaf05441b52dccdb2b4fa124fc06',
  'themes/fomalhaut/source/js/main.js': '375868d3a5ee55a31a5e676168c105a82c9bf9235840471521d799090fe5891e'
};

test('navigation CSS parses and all rules remain scoped to navigation', () => {
  assert.ok(rules.length > 0);
  for (const rule of rules) {
    assert.match(rule.selector, /#nav(?:\b|\s|>)/, 'navigation scope: ' + rule.selector);
    if (/::(?:before|after)/.test(rule.selector)) {
      assert.ok([logoSelector + '::before', '#nav #page-name::before', logoSelector + ':focus-visible::before', '#nav #page-name:focus-visible::before'].includes(rule.selector), 'only existing label replacements are styled');
      assert.ok(!rule.declarations.some(d => d.property === 'content'), 'preserve original home glyph and top label');
      if (reduced(rule)) {
        assert.deepEqual(rule.declarations.map(d => d.property).sort(), ['animation', 'transition']);
        value(rule, 'animation', 'none', true);
        value(rule, 'transition', 'none', true);
      } else assert.ok(base(rule), 'compact replacements are base-only');
    }
    assert.doesNotMatch(rule.selector, /\b(?:html|body)\s*\{/, 'no page-global declaration');
  }
});

test('original navigation templates, handlers and fixed/collapse theme sources are unchanged', () => {
  for (const [file, expected] of Object.entries(originalThemeHashes)) {
    assert.equal(crypto.createHash('sha256').update(read(file)).digest('hex'), expected, file + ' changed from the independent pre-implementation baseline');
  }
  const template = read('themes/fomalhaut/layout/includes/header/nav.pug');
  assert.match(template, /if \(theme\.algolia_search\.enable \|\| theme\.local_search\.enable\)/);
  assert.match(template, /onclick="toggleWinbox\(\)"/);
  assert.match(template, /onclick='switchNightMode\(\)'/);
  for (const [icon, size, top] of [['sousuo', 24, 6], ['huahua', 26, 8], ['moon', 25, 7]]) {
    assert.match(template, new RegExp('height:' + size + 'px;width:' + size + 'px;fill:currentColor;position:relative;top:' + top + 'px'));
    assert.match(template, new RegExp("xlink:href='#icon-" + icon + "'"));
  }
  assert.match(template, /use#modeicon/);
  assert.match(template, /#toggle-menu\n\s+a\n\s+i\.fas\.fa-bars\.fa-fw/);
  const main = read('themes/fomalhaut/source/js/main.js');
  assert.match(main, /if \(window\.innerWidth <= 800\) hideMenuIndex = true/);
  assert.match(main, /getElementById\('toggle-menu'\)\.addEventListener\('click', \(\) => \{ sidebarFn\.open\(\) \}\)/);
  assert.match(main, /classList\.remove\('nav-fixed', 'nav-visible'\)/);
});

test('config injects one synchronous versioned stylesheet after site-inject and preserves runtime slots', () => {
  const config = yaml.load(read('_config.fomalhaut.yml'));
  const head = config.inject.head;
  assert.ok(Array.isArray(head));
  const links = head.filter(item => /href=["']\/css\/navigation\.css(?:[?"'])/.test(String(item)));
  assert.equal(links.length, 1);
  assert.match(links[0], /^<link rel="stylesheet" href="\/css\/navigation\.css\?v=20261011-nav3">$/);
  const siteIndex = head.findIndex(item => /href="\/css\/site-inject\.css\?/.test(String(item)));
  assert.ok(siteIndex >= 0 && head.indexOf(links[0]) > siteIndex);
  assert.ok(!config.inject.bottom.some(item => /\/css\/navigation\.css/.test(String(item))), 'no duplicate bottom injection');
  for (const id of ['themeColor', 'menu_shadow', 'nav-display', 'aside-show', 'aside-pos']) {
    const slots = head.filter(item => String(item) === '<style id="' + id + '"></style>');
    assert.equal(slots.length, 1, id + ' runtime slot is retained');
    assert.ok(head.indexOf(slots[0]) < siteIndex, id + ' remains before site-inject');
  }
  const headTemplate = read('themes/fomalhaut/layout/includes/head.pug');
  assert.ok(headTemplate.indexOf('href=url_for(theme.asset.main_css)') < headTemplate.indexOf('injectHtml(theme.inject.head)'), 'theme main CSS precedes site injection');
});

test('hero transparency is explicit and excludes every surfaced navigation state', () => {
  const hero = find('#page-header.full_page:not(.nav-fixed):not(.nav-visible):not(.not-top-img) #nav');
  value(hero, 'background', 'transparent', true);
  value(hero, 'box-shadow', 'none');
  value(hero, 'border-bottom', '0');
  value(hero, 'backdrop-filter', 'none');
  value(hero, '-webkit-backdrop-filter', 'none');
  for (const rule of rules.filter(r => r.selector.endsWith(' #nav') && r.declarations.some(d => d.property === 'background'))) {
    assert.ok(surfaces.includes(rule.selector) || surfaces.some(s => rule.selector === '[data-theme="dark"] ' + s) || rule === hero, 'background must target surfaced states or guarded hero: ' + rule.selector);
  }
});

test('all three surfaced states default to no filter and .96 light/dark fallback', () => {
  for (const selector of surfaces) {
    const light = find(selector), dark = find('[data-theme="dark"] ' + selector);
    const [r, g, b, alpha] = rgba(light);
    assert.ok(r >= 240 && g >= 240 && b >= 230 && r >= g && g > b, 'warm near-white fallback');
    assert.equal(alpha, 0.96, 'high-alpha fallback does not depend on blur');
    const darkChannels = rgba(dark);
    assert.ok(darkChannels.slice(0, 3).every(n => n >= 20 && n <= 60), 'dark gray rather than transparent/black fallback');
    assert.ok(Math.max(...darkChannels.slice(0, 3)) - Math.min(...darkChannels.slice(0, 3)) <= 12);
    assert.equal(darkChannels[3], 0.96);
    for (const property of ['backdrop-filter', '-webkit-backdrop-filter']) {
      value(light, property, 'none');
      // The same #nav also matches the unprefixed surfaced-state selector in dark mode.
      const darkFilter = dark.declarations.filter(d => d.property === property);
      if (darkFilter.length) value(dark, property, 'none');
    }
    value(light, 'opacity', '1'); // Remove legacy whole-nav .95 opacity; alpha belongs to background.
    decl(light, '--navigation-fg');
    decl(dark, '--navigation-fg');
  }
});

test('backdrop enhancement has the exact nested eligibility whitelist and .92 alpha in both themes', () => {
  for (const selector of surfaces) {
    for (const prefix of ['', '[data-theme="dark"] ']) {
      const fallback = find(prefix + selector), enhanced = find(prefix + selector, supportsFilter);
      assert.ok(enhanced.line > fallback.line, 'enhancement follows fallback');
      filterWhitelist(enhanced);
      const a = rgba(fallback), b = rgba(enhanced);
      assert.deepEqual(b.slice(0, 3), a.slice(0, 3), 'filter support does not change surface hue');
      assert.equal(b[3], 0.92, 'eligible surface still uses high alpha');
      assert.ok(b[3] < a[3], 'eligible surface has lower alpha than the .96 fallback');
    }
    const enhanced = find(selector, supportsFilter);
    value(enhanced, 'backdrop-filter', 'blur(6px)');
    value(enhanced, '-webkit-backdrop-filter', 'blur(6px)');
  }
});

test('every filter-enabling declaration is whitelisted; no will-change or other filter escape', () => {
  const enabled = [];
  for (const rule of rules) for (const d of rule.declarations) {
    assert.doesNotMatch(d.property, /^(?:-\w+-)?will-change$/, 'no persistent compositing hint');
    if (!/^(?:-\w+-)?(?:backdrop-)?filter$/.test(d.property) || clean(d.value) === 'none') continue;
    assert.ok(['backdrop-filter', '-webkit-backdrop-filter'].includes(d.property), 'no alternate filter/property escape');
    assert.ok(surfaces.includes(rule.selector), 'blur only on surfaced #nav; dark mode inherits it');
    filterWhitelist(rule);
    assert.equal(clean(d.value), 'blur(6px)', 'no stronger or additional filtering');
    enabled.push(rule.selector + ':' + d.property);
  }
  assert.deepEqual(enabled.sort(), surfaces.flatMap(selector => ['backdrop-filter', '-webkit-backdrop-filter'].map(property => selector + ':' + property)).sort(), 'one standard/prefixed enhancement per surfaced state, no extra enabling rules');
});

test('four original controls have nonshrinking 44px square flex-centered targets', () => {
  for (const selector of controls) {
    const rule = find(selector);
    for (const property of ['width', 'height', 'min-width', 'min-height']) value(rule, property, '44px');
    value(rule, 'display', 'flex');
    value(rule, 'align-items', 'center');
    value(rule, 'justify-content', 'center');
    value(rule, 'flex', '0 0 44px');
    value(rule, 'box-sizing', 'border-box');
    value(rule, 'padding', '0');
    value(rule, 'margin', '0');
  }
  for (const wrapper of ['#nav #nav-right > #search-button', '#nav #nav-right > #toggle-menu']) value(find(wrapper), 'padding', '0', true);
  for (const rule of rules.filter(r => r.guards.some(g => g.type === 'media'))) {
    for (const d of rule.declarations.filter(d => /^(?:min-)?(?:width|height)$/.test(d.property))) {
      assert.ok(!controls.includes(rule.selector) || clean(d.value) === '44px', 'responsive rules must not shrink touch controls');
    }
  }
});

test('desktop spacing beats legacy padding and mobile spacing tightens without changing targets', () => {
  value(find('#page-header #nav'), 'padding', '0 24px', true);
  const toolbar = find('#nav > #menus > #nav-right');
  value(toolbar, 'display', 'flex');
  value(toolbar, 'align-items', 'center');
  value(toolbar, 'gap', '8px');
  const mobileNav = find('#page-header #nav', media(800));
  const padding = clean(decl(mobileNav, 'padding').value).match(/^0 (\d+)px$/);
  assert.ok(padding && Number(padding[1]) > 0 && Number(padding[1]) < 24);
  assert.ok(important(decl(mobileNav, 'padding')));
  const mobileGap = clean(decl(find('#nav > #menus > #nav-right', media(800)), 'gap').value).match(/^(\d+)px$/);
  assert.ok(mobileGap && Number(mobileGap[1]) >= 0 && Number(mobileGap[1]) < 8);
  value(find('#nav #name-container', media(800)), 'display', 'none', true);
  const logo = find('#nav > #blog_name > #site-name');
  value(logo, 'overflow', 'visible');
  value(logo, 'text-overflow', 'ellipsis');
  value(logo, 'white-space', 'nowrap');
  value(find('#nav > #blog_name > #site-name', media(480)), 'font-size', '20px');
});

test('logo clips only at <=360px; 375px/desktop retain theme neon and hover halo', () => {
  const normal = find(logoSelector), narrow = find(logoSelector, media(360));
  value(normal, 'overflow', 'visible');
  value(normal, 'text-overflow', 'ellipsis');
  value(normal, 'white-space', 'nowrap');
  assert.deepEqual(narrow.guards, [{ type: 'media', condition: 'screen and (max-width: 360px)' }]);
  value(narrow, 'overflow', 'hidden');
  value(narrow, 'animation', 'none', true);
  value(narrow, 'text-shadow', 'none', true);
  for (const rule of rules.filter(r => /#site-name\b/.test(r.selector))) {
    for (const d of rule.declarations) {
      if (d.property === 'overflow') assert.ok(rule === normal || rule === narrow, 'no clipping at 375px or desktop');
      if (/^(?:-\w+-)?(?:animation|transition)(?:-.*)?$/.test(d.property)) {
        assert.ok(rule === narrow || reduced(rule) || /^#page-header #nav > #blog_name > #site-name:(hover|focus-visible)$/.test(rule.selector), 'only active hover/focus may pause normal-width neon');
      }
      if (d.property === 'text-shadow' && important(d)) assert.ok(rule === narrow || /^#page-header #nav > #blog_name > #site-name:(hover|focus-visible)$/.test(rule.selector), 'only narrow or active compact button suppresses neon shadow');
    }
  }
  // Preservation contract, not a rendered or computed-style claim.
  const original = css.parse(read('themes/fomalhaut/source/css/_custom/custom.css')).stylesheet.rules;
  const halo = original.find(r => r.type === 'rule' && r.selectors.includes('#site-name::before'));
  assert.ok(halo.declarations.some(d => d.property === 'transition' && clean(d.value) !== 'none'));
  assert.ok(original.some(r => r.type === 'rule' && r.selectors.includes('#site-name:hover::before')));
  assert.ok(original.some(r => r.type === 'keyframes' && /^light_\d+px$/.test(r.name)), 'original neon keyframes remain');
});

test('compact home and top hover visuals centre glyphs without changing link hit boxes', () => {
  for (const selector of [logoSelector + '::before', '#nav #page-name::before']) {
    const rule = find(selector, r => base(r) && r.declarations.some(d => d.property === 'display'));
    value(rule, 'display', 'flex');
    value(rule, 'align-items', 'center');
    value(rule, 'justify-content', 'center');
    value(rule, 'top', '50%', true);
    value(rule, 'left', '50%', true);
    value(rule, 'right', 'auto', true);
    value(rule, 'transform', 'translate(-50%, -50%)');
    value(rule, 'height', '40px');
    value(rule, 'scale', '1', true);
    value(rule, 'line-height', '1');
    value(find(selector, r => base(r) && r.declarations.some(d => d.property === 'max-width')), 'max-width', '100%');
    value(rule, 'text-shadow', 'none');
  }
  value(find(logoSelector + '::before', r => base(r) && r.declarations.some(d => d.property === 'width')), 'width', '100%');
  value(find('#nav #page-name::before', r => base(r) && r.declarations.some(d => d.property === 'width')), 'width', '144px');
  for (const selector of ['#page-header ' + logoSelector, '#page-header #nav #page-name']) {
    for (const state of ['hover', 'focus-visible']) {
      const rule = find(selector + ':' + state);
      value(rule, 'color', 'transparent', true);
      value(rule, 'text-shadow', 'none', true);
      value(rule, 'animation', 'none', true);
      assert.ok(rule.line > find(surfaces[0] + ' #page-name').line, 'active replacement wins over surfaced foreground color');
    }
  }
  for (const selector of [logoSelector + ':focus-visible::before', '#nav #page-name:focus-visible::before']) value(find(selector), 'opacity', '1');
  value(find('#nav #page-name::before', reduced), 'transition', 'none', true);
  value(find('#nav #page-name::before', reduced), 'animation', 'none', true);
  const title = find('#nav #page-name');
  value(title, 'display', 'inline-flex');
  value(title, 'height', '44px');
  value(title, 'min-height', '44px');
  value(title, 'padding', '0 16px');
  value(title, 'align-items', 'center');
  value(title, 'line-height', '1');
  value(find('#nav #name-container'), 'top', '50%', true);
  value(find('#nav #name-container'), 'transform', 'translate(-50%, -50%)', true);
  value(find('#nav #name-container:hover'), 'transform', 'translate(-50%, -50%) scale(1.03)', true);
});

test('navigation enhancement is CSS-only; existing scroll title handler is the only module binding', () => {
  const config = yaml.load(read('_config.fomalhaut.yml'));
  const scripts = [...config.inject.head, ...config.inject.bottom].map(String).filter(item => /<script\b/i.test(item));
  const related = scripts.filter(item => /src=["'][^"']*\/(?:[^/"']*(?:nav|scroll)[^/"']*)\.js(?:[?"'])/i.test(item));
  assert.deepEqual(related, [
    '<script defer src="/js/modules/nav.js?v=20261005-scroll1"></script>',
    '<script src="/js/inject/scroll-gap-fix.js?v=20261011"></script>'
  ], 'no new navigation/scroll script injection; retain the two existing modules');
  for (const script of scripts.filter(item => !/\bsrc\s*=/i.test(item))) {
    assert.doesNotMatch(script, /(?:addEventListener|\.(?:on|bind))\s*\(\s*["']scroll|\bonscroll\s*=/i, 'no injected inline scroll handler');
  }
  const nav = read('source/js/modules/nav.js');
  const bindings = [...nav.matchAll(/\.(?:on|bind)\s*\(\s*['"](scroll(?:\.[^'"]*)?)['"]/g)].map(match => match[1]);
  assert.deepEqual(bindings, ['scroll.fomalNavTitle'], 'no extra navigation scroll binding for polish');
  for (const js of [nav, read('source/js/inject/scroll-gap-fix.js')]) {
    assert.doesNotMatch(js, /addEventListener\s*\(\s*['"]scroll|\bonscroll\s*=/i);
    assert.doesNotMatch(js, /backdrop[-]?filter|will[-]?change/i, 'no JS blur/compositing control');
  }
});

test('inline SVG top offsets are overridden without replacing visual icon sizes', () => {
  const svg = find('#nav #nav-right a > svg');
  value(svg, 'top', '0', true);
  value(svg, 'display', 'block');
  value(svg, 'flex-shrink', '0');
  for (const rule of rules.filter(r => /\bsvg\b/.test(r.selector))) {
    assert.ok(!rule.declarations.some(d => ['width', 'height'].includes(d.property)), 'original inline SVG sizes remain');
  }
});

test('hover/focus follows theme color, with visible keyboard outlines and reduced motion', () => {
  for (const target of ['#nav-right a', '.menus_items > .menus_item > a']) {
    for (const state of ['hover', 'focus-visible']) value(find('#page-header #nav ' + target + ':' + state), 'color', 'var(--theme-color)', true);
  }
  const focus = find('#page-header #nav a:focus-visible');
  value(focus, 'outline', '2px solid var(--theme-color)');
  value(focus, 'outline-offset', '2px');
  for (const selector of ['#nav #nav-right a', '#nav #nav-right svg', logoSelector, logoSelector + '::before']) {
    const rule = find(selector, reduced);
    value(rule, 'transition', 'none', true);
    value(rule, 'animation', 'none', true);
  }
});

test('nav geometry, display variables and menu collapse are not overridden except reading-mode hide', () => {
  const forbiddenGeometry = /^(?:-(?:webkit|moz|ms)-)?(?:position|top|bottom|left|right|transform|translate|visibility|inset(?:-.*)?)$/;
  for (const rule of rules) {
    for (const d of rule.declarations) {
      assert.doesNotMatch(d.property, /^--nav-(?:fixed|visible)-display$/, 'runtime display variables are not redefined');
      const isNav = /#nav(?:\.[\w-]+|:[\w()-]+)*$/.test(rule.selector);
      if (isNav) {
        assert.ok(!forbiddenGeometry.test(d.property), 'nav geometry belongs to theme: ' + d.property);
        if (d.property === 'display') {
          assert.equal(rule.selector, 'body.read-mode #page-header > #nav', 'only explicit reading-mode hide may set nav display');
          value(rule, 'display', 'none', true);
        }
      }
      if (d.property === 'display' && /#toggle-menu$|\.menus_items$|\.menus_item_child$/.test(rule.selector)) assert.fail('do not replace original menu visibility: ' + rule.selector);
      if (rule.selector === '#nav > #menus') assert.ok(!forbiddenGeometry.test(d.property), '#menus must retain the original positioning anchor');
    }
  }
  value(find('body.read-mode #page-header > #nav'), 'display', 'none', true);
  const original = css.parse(read('themes/fomalhaut/source/css/_custom/custom.css')).stylesheet.rules.filter(r => r.type === 'rule');
  for (const state of ['fixed', 'visible']) {
    const rule = original.find(r => r.selectors.includes('#page-header.nav-' + state + ' #nav') && r.declarations.some(d => d.property === 'display'));
    assert.ok(rule);
    assert.equal(rule.declarations.find(d => d.property === 'display').value, 'var(--nav-' + state + '-display)');
  }
  const head = read('themes/fomalhaut/source/css/_layout/head.styl');
  assert.match(head, /&\.nav-fixed\n\s+#nav\n\s+position: fixed\n\s+top: -60px/);
  assert.match(head, /&\.nav-visible\n\s+#nav\n\s+transition: all \.5s\n\s+transform: translate3d\(0, 100%, 0\)/);
  assert.match(head, /&\.hide-menu\n\s+#toggle-menu\n\s+display: inline-block !important/);
  assert.match(head, /&:hover\n\s+\.menus_item_child\n\s+display: block/);
  for (const file of ['source/js/inject/beauty-boot.js', 'source/js/modules/settings.js']) {
    const js = read(file);
    assert.ok(js.includes('--nav-visible-display:none;--nav-fixed-display:inline-flex;'), file + ': permanent nav mode retained');
    assert.ok(js.includes('--nav-visible-display:inline-flex;--nav-fixed-display:none;'), file + ': scroll-visible mode retained');
  }
});
