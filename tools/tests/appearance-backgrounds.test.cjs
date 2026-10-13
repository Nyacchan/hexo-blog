'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const modulePath = path.join(root, 'source/js/modules/appearance-backgrounds.js');
const code = fs.readFileSync(modulePath, 'utf8');
// Independent original template, API declarations and setters copied from the pre-change snapshot.
// Provenance: bak/20261010-appearance-preview/before/source/js/modules/settings.js.
// Intentionally embedded so tests work in a clean checkout; never generated from the implementation.
const legacy = [
  "<h2>四、背景设置</h2>",
  "",
  "",
  "<h3>1. 二次元</h3>",
  "{% folding cyan, 查看二次元背景 %}",
  "<div class=\"bgbox\">",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/yuanshen1/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/yuanshen1/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/dm15/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/dm15/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/dm2/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/dm2/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/dm7/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/dm7/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/dm8/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/dm8/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/dm3/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/dm3/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/dm11/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/dm11/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/dm12/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/dm12/1920/1080)')\"></a>",
  "",
  "</div>",
  "{% endfolding %}",
  "",
  "",
  "<h3>2. 风景</h3>",
  "",
  "{% folding cyan, 查看风景背景 %}",
  "<div class=\"bgbox\">",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/fj1/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/fj1/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/fj2/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/fj2/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/fj3/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/fj3/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/fj4/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/fj4/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/fj5/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/fj5/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/fj6/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/fj6/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/fj7/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/fj7/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/fj8/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/fj8/1920/1080)')\"></a>",
  "",
  "</div>",
  "{% endfolding %}",
  "",
  "<h3>3. 萌宠</h3>",
  "",
  "{% folding cyan, 查看萌宠背景 %}",
  "<div class=\"bgbox\">",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mc1/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mc1/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mc2/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mc2/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mc3/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mc3/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mc4/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mc4/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mc5/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mc5/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mc6/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mc6/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mc7/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mc7/1920/1080)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mc8/400/225)\" class=\"imgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mc8/1920/1080)')\"></a>",
  "</div>",
  "{% endfolding %}",
  "",
  "<h3>4. 渐变色</h3>",
  "{% folding cyan, 查看渐变色背景 %}",
  "<div class=\"bgbox\">",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: linear-gradient(to right, #544a7d, #ffd452)\" onclick=\"changeBg('linear-gradient(to right, #544a7d, #ffd452)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: linear-gradient(to bottom, #7f7fd5, #86a8e7, #91eae4)\" onclick=\"changeBg('linear-gradient(to bottom, #7f7fd5, #86a8e7, #91eae4)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: linear-gradient(to left, #654ea3, #eaafc8)\" onclick=\"changeBg('linear-gradient(to left, #654ea3, #eaafc8)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: linear-gradient(to top, #feac5e, #c779d0, #4bc0c8)\" onclick=\"changeBg('linear-gradient(to top, #feac5e, #c779d0, #4bc0c8)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: linear-gradient(to top, #d3959b, #bfe6ba)\" onclick=\"changeBg('linear-gradient(to top, #d3959b, #bfe6ba)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: linear-gradient(to top, #8360c3, #2ebf91)\" onclick=\"changeBg('linear-gradient(to top, #8360c3, #2ebf91)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: linear-gradient(to top, #108dc7, #ef8e38)\" onclick=\"changeBg('linear-gradient(to top, #108dc7, #ef8e38)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: linear-gradient(to top, #355c7d, #6c5b7b, #c06c84)\" onclick=\"changeBg('linear-gradient(to top, #355c7d, #6c5b7b, #c06c84)')\"></a>",
  "</div>",
  "{% endfolding %}",
  "",
  "",
  "<h3>5. 纯色</h3>",
  "{% folding cyan, 查看纯色背景 %}",
  "<div class=\"bgbox\">",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: #ecb1b1\" onclick=\"changeBg('#ecb1b1')\"></a> ",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: #d3ebac\" onclick=\"changeBg('#d3ebac')\"></a> ",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: #ace9ce\" onclick=\"changeBg('#ace9ce')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: #c1ebea\" onclick=\"changeBg('#c1ebea')\"></a> ",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: #dee7f1\" onclick=\"changeBg('#dee7f1')\"></a> ",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: #e9e3f2\" onclick=\"changeBg('#e9e3f2')\"></a> ",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" style=\"background: #f7eff5\" onclick=\"changeBg('#f7eff5')\"></a>  ",
  "<input type=\"color\" id=\"define_colors\" href=\"javascript:;\" rel=\"noopener external nofollow\" class=\"box\" autocomplete=\"on\" value=\"${defineColor}\" oninput=\"changeBgColor()\"></input>",
  "</div>",
  "{% endfolding %}",
  "",
  "",
  "",
  "<h3>6. 适配手机</h3>",
  "{% folding cyan, 查看适配手机的背景 %}",
  "<div class=\"bgbox\">",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mb4/400/225)\" class=\"pimgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mb4/1080/1920)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mb5/400/225)\" class=\"pimgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mb5/1080/1920)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mb6/400/225)\" class=\"pimgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mb6/1080/1920)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mb7/400/225)\" class=\"pimgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mb7/1080/1920)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mb8/400/225)\" class=\"pimgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mb8/1080/1920)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mb9/400/225)\" class=\"pimgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mb9/1080/1920)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mb16/400/225)\" class=\"pimgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mb16/1080/1920)')\"></a>",
  "<a href=\"javascript:;\" rel=\"noopener external nofollow\" style=\"background-image:url(https://picsum.photos/seed/mb19/400/225)\" class=\"pimgbox\" onclick=\"changeBg('url(https://picsum.photos/seed/mb19/1080/1920)')\"></a>",
  "</div>",
  "{% endfolding %}",
  "",
  "",
  "<h3>7. 壁纸API</h3>",
  "{% folding cyan, 查看壁纸API系列背景 %}",
  "<div class=\"bgbox\">",
  "<a id=\"bingDayBox\" rel=\"noopener external nofollow\" style=\"background-image: ${bingDayBg}\" class=\"box apiBox\" onclick=\"changeBg('${bingDayBg}')\"></a>",
  "<a id=\"bingHistoryBox\" rel=\"noopener external nofollow\" style=\"background-image: ${bingHistoryBg}\" class=\"box apiBox\" onclick=\"changeBg('${bingHistoryBg}')\"></a>",
  "<a id=\"EEEDogBox\" rel=\"noopener external nofollow\" style=\"background-image: ${EEEDog}\" class=\"box apiBox\" onclick=\"changeBg('${EEEDog}')\"></a>",
  "<a id=\"seovxBox\" rel=\"noopener external nofollow\" style=\"background-image: ${seovx}\" class=\"box apiBox\" onclick=\"changeBg('${seovx}')\"></a>",
  "<a id=\"picsumBox\" rel=\"noopener external nofollow\" style=\"background-image: ${picsum}\" class=\"box apiBox\" onclick=\"changeBg('${picsum}')\"></a>",
  "<a id=\"waiBizhiBox\" rel=\"noopener external nofollow\" style=\"background-image: ${waiBizhi}\" class=\"box apiBox\" onclick=\"changeBg('${waiBizhi}')\"></a>",
  "<a id=\"btstuBox\" rel=\"noopener external nofollow\" style=\"background-image: ${btstu}\" class=\"box apiBox\" onclick=\"changeBg('${btstu}')\"></a>",
  "<a id=\"unsplashBox\" rel=\"noopener external nofollow\" style=\"background-image: ${unsplash}\" class=\"box apiBox\" onclick=\"changeBg('${unsplash}')\"></a>",
  "</div>",
  "{% endfolding %}",
  "",
  "",
  "<h3>8. 自定义背景</h3>",
  "{% folding cyan, 设置自定义背景 %}",
  "<p><center>",
  "<input type=\"text\" id=\"pic-link\" size=\"70%\" maxlength=\"1000\" placeholder=\"请输入有效的图片链接，如 https://picsum.photos/id/1015/1920/1080\">",
  "</center></p>",
  "<p><center>",
  "<button class=\"winbox_btn picbtn\" type=\"button\" onclick=\"getPicture()\" title=\"用上面填写的图片链接切换网站背景\">切换背景</button>",
  "</center></p>",
  "{% endfolding %}",
  "<h2>五、</h2>",
  "let bingDayBg = \"url(https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN)\";",
  "let bingHistoryBg = \"url(https://bing.biturl.top/?resolution=1920&format=image&index=random&mkt=zh-CN)\";",
  "let EEEDog = \"url(https://www.loliapi.com/acg/pc/)\";",
  "let seovx = \"url(https://moe.jitsu.top/api?sort=pc)\";",
  "let picsum = \"url(https://picsum.photos/1920/1080.webp)\";",
  "let waiBizhi = \"url(https://www.loliapi.com/bg/)\";",
  "let btstu = \"url(https://t.mwm.moe/mp)\";",
  "let unsplash = \"url(https://t.mwm.moe/pc)\";",
  "function resetBg_() {",
  "  var el = document.getElementById(\"defineBg\");",
  "  if (!el) return;",
  "  el.innerText = `:root{",
  "    --default-bg: url(https://picsum.photos/id/1015/1920/1080);",
  "    --darkmode-bg:url(https://picsum.photos/id/1044/1920/1080);",
  "    --mobileday-bg: url(https://picsum.photos/id/1018/1920/1080);",
  "    --mobilenight-bg: url(https://picsum.photos/id/1039/1920/1080);",
  "  }`;",
  "}",
  "function setBg(s) {",
  "  var el = document.getElementById(\"defineBg\");",
  "  if (!el) return;",
  "  el.innerText = `:root{",
  "    --default-bg: ${s};",
  "    --darkmode-bg: ${s};",
  "    --mobileday-bg: ${s};",
  "    --mobilenight-bg: ${s};",
  "  }`;",
  "}"
].join('\n');
const legacyPanel = legacy.slice(legacy.indexOf('<h2>四、背景设置</h2>'), legacy.indexOf('<h2>五、'));
const apiIds = ['bingDayBg','bingHistoryBg','EEEDog','seovx','picsum','waiBizhi','btstu','unsplash'];
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
class Element {
  constructor(tag, document) { this.tagName=tag.toUpperCase();this.document=document;this.attributes={};this.children=[];this.style={};this.hidden=false;this.disabled=false;this.value='';this._text=''; }
  setAttribute(key,value) { this.attributes[key]=String(value);if(key==='id')this.document.ids.set(String(value),this);if(key==='class')this.className=String(value);if(key==='value')this.value=String(value);if(key==='hidden')this.hidden=true;if(key==='disabled')this.disabled=true; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  removeAttribute(key) { delete this.attributes[key]; }
  set src(value) { this._src=value;this.document.imageSources.push(value); }
  get src() { return this._src || ''; }
  set textContent(value) { this._text=String(value);this.children=[]; }
  get textContent() { return this._text+this.children.map(c=>c.textContent).join(''); }
  set innerText(value) { this.textContent=value; }
  get innerText() { return this.textContent; }
  appendChild(child) { this.children.push(child);return child; }
  replaceChildren(...children) { this.children=children;this._text=''; }
  matches(selector) {
    if(selector.startsWith('.'))return (this.className || '').split(/\s+/).includes(selector.slice(1));
    const attr=selector.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
    if(attr)return this.getAttribute(attr[1])!==null && (attr[2]===undefined || this.getAttribute(attr[1])===attr[2]);
    return this.tagName===selector.toUpperCase();
  }
  querySelectorAll(selector) { const out=[];for(const c of this.children){if(c.matches(selector))out.push(c);out.push(...c.querySelectorAll(selector));}return out; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
function fakeDocument() {
  const doc={ids:new Map(),imageSources:[],lookups:0,createElement(tag){return new Element(tag,this);},getElementById(id){this.lookups++;return this.ids.get(id)||null;}};
  const defineBg=doc.createElement('style');defineBg.setAttribute('id','defineBg');
  doc.mount=function(html) {
    const root=this.createElement('div'), stack=[root];
    for(const token of html.match(/<[^>]*>|[^<]+/g)||[]) {
      if(token.startsWith('</')){stack.pop();continue;}
      if(!token.startsWith('<')){stack.at(-1)._text+=decode(token);continue;}
      const tag=token.match(/^<([\w-]+)/)[1], el=this.createElement(tag);
      const attrs=token.slice(tag.length+1,-1);
      for(const m of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g))el.setAttribute(m[1],decode(m[2]??''));
      stack.at(-1).appendChild(el);
      if(!['input','img','br','hr'].includes(tag))stack.push(el);
    }
    return root;
  };
  return doc;
}
function harness(initial={}, environment={}) {
  const document=fakeDocument(), storage=new Map(Object.entries(initial)), writes=[],images=[],timers=new Map();let clock=0,nextTimer=0;
  class FakeImage {
    constructor(){this.onload=null;this.onerror=null;this.history=[];images.push(this);}
    set src(value){this._src=value;this.history.push(value);}
    get src(){return this._src||'';}
    removeAttribute(name){if(name==='src'){this._src='';this.history.push('');}}
    load(){if(this.onload)this.onload();}
    error(){if(this.onerror)this.onerror(new Error('image error'));}
  }
  const listeners=new Map(), observers=[];
  document.documentElement=document.createElement('html');
  document.documentElement.setAttribute('data-theme',environment.theme || 'light');
  const window={innerWidth:environment.width ?? 1024,addEventListener(name,fn){listeners.set(name,fn);}};
  class FakeObserver { constructor(fn){this.fn=fn;observers.push(this);}observe(target,options){this.target=target;this.options=options;} }
  const ctx=vm.createContext({document,window,MutationObserver:FakeObserver,Image:FakeImage,URL,console,defineColor:'#F4D88A',
    localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){storage.set(k,String(v));writes.push([k,String(v)]);},removeItem:k=>storage.delete(k)},
    setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,due:clock+ms});return id;},clearTimeout:id=>timers.delete(id)});
  vm.runInContext(code,ctx,{filename:modulePath});
  // Use real setters from the independent legacy source, not reimplemented mocks.
  vm.runInContext(['resetBg_','setBg'].map(name=>legacy.match(new RegExp('function '+name+'\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'))[0]).join('\n'),ctx);
  const installApis=()=>vm.runInContext(apiIds.map(id=>legacy.match(new RegExp('^let '+id+' = .*;$','m'))[0]).join('\n'),ctx);
  const mount=()=>document.mount(ctx.appearanceBackgroundMarkup());
  const advance=ms=>{clock+=ms;for(const [id,t] of Array.from(timers)){if(t.due<=clock){timers.delete(id);t.fn();}}};
  return {ctx,document,window,listeners,observers,storage,writes,images,timers,installApis,mount,advance,bg:()=>document.ids.get('defineBg').textContent};
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('classic module does not access DOM, images, storage or lexical API values at load',()=>{
  const h=harness();assert.equal(h.document.lookups,0);assert.equal(h.images.length,0);assert.equal(h.writes.length,0);
  assert.equal(h.ctx.appearanceBackgroundApiValue('bingDayBg'),'');h.installApis();assert.match(h.ctx.appearanceBackgroundApiValue('bingDayBg'),/bing.biturl.top/);
  vm.runInContext('bingDayBg="url(https://example.com/runtime.jpg)"',h.ctx);
  assert.equal(h.ctx.appearanceBackgroundApiValue('bingDayBg'),'url(https://example.com/runtime.jpg)');
});

test('catalog exactly preserves legacy thumbnail/full URLs, colors, gradients, and runtime APIs',()=>{
  const h=harness();h.installApis();
  const expectedImages=Array.from(legacyPanel.matchAll(/background-image:url\(([^)]+)\).*onclick="changeBg\('([^']+)'\)/g),m=>({thumb:m[1],value:m[2]}));
  const expectedColors=Array.from(legacyPanel.matchAll(/onclick="changeBg\('((?:linear-gradient|#)[^']+)'\)/g),m=>m[1]);
  assert.equal(expectedImages.length,32);assert.equal(expectedColors.length,15);
  assert.deepEqual(plain(h.ctx.AP_BACKGROUND_CATALOG.filter(x=>x.kind==='image').map(({thumb,value})=>({thumb,value}))),expectedImages);
  assert.deepEqual(plain(h.ctx.AP_BACKGROUND_CATALOG.filter(x=>x.kind!=='image').map(x=>x.value)),expectedColors);
  const expectedApiIds=Array.from(legacyPanel.matchAll(/onclick="changeBg\('\$\{(\w+)\}'\)/g),m=>m[1]);
  assert.deepEqual(plain(h.ctx.AP_BACKGROUND_APIS.map(x=>x.id)),expectedApiIds);
  for(const id of expectedApiIds)assert.equal(h.ctx.appearanceBackgroundApiValue(id),legacy.match(new RegExp('^let '+id+' = "([^"]+)";','m'))[1]);
});

test('markup has empty lazy wallpaper grids and accessible real tabs, with no API image loads',()=>{
  const h=harness(),html=h.ctx.appearanceBackgroundMarkup();
  assert.doesNotMatch(html,/<img|background-image|w=400|bing.biturl.top/);
  assert.match(html,/<details/);assert.match(html,/动态链接刷新可能返回不同图片/);
  h.mount();const panel=h.document.ids.get('ap-background-panel');
  assert.equal(panel.querySelectorAll('[data-ap-bg-main]').length,3);assert.equal(panel.querySelectorAll('[data-ap-bg-category]').length,4);
  for(const button of [...panel.querySelectorAll('[data-ap-bg-main]'),...panel.querySelectorAll('[data-ap-bg-category]')]){
    assert.equal(button.tagName,'BUTTON');assert.ok(h.document.ids.has(button.getAttribute('aria-controls')));assert.ok(['true','false'].includes(button.getAttribute('aria-pressed')));
  }
  assert.equal(h.document.imageSources.length,0);
});

test('init only populates visible initial category, then categories load on demand once',()=>{
  const h=harness();h.mount();h.ctx.initAppearanceBackgrounds();
  assert.equal(h.document.ids.get('ap-bg-category-anime').children.length,8);
  for(const name of ['landscape','pets','mobile'])assert.equal(h.document.ids.get('ap-bg-category-'+name).children.length,0);
  assert.equal(h.images.length,0);assert.equal(h.document.imageSources.filter(s=>s.includes('w=400')).length,8);
  h.ctx.showAppearanceBackgroundCategory('mobile');assert.equal(h.document.ids.get('ap-bg-category-anime').hidden,true);
  assert.equal(h.document.ids.get('ap-bg-category-mobile').hidden,false);assert.equal(h.document.ids.get('ap-bg-category-mobile').children.length,8);
  const count=h.document.imageSources.length;h.ctx.showAppearanceBackgroundCategory('mobile');assert.equal(h.document.imageSources.length,count);
  h.ctx.showAppearanceBackgroundTab('custom');assert.equal(h.document.ids.get('ap-bg-main-wallpaper').hidden,true);
});

test('latest wins even when an old captured onload fires after cancellation',async()=>{
  const h=harness({blogbg:'#aabbcc'});await h.ctx.restoreAppearanceBackground();
  const a=h.ctx.changeAppearanceBackground('https://example.com/old.jpg'),old=h.images[0],stale=old.onload;
  const b=h.ctx.changeAppearanceBackground('https://example.com/new.jpg');
  assert.equal(old.onload,null);assert.equal(old.onerror,null);assert.equal(old.src,'');assert.equal(await a,false);
  h.images[1].load();assert.equal(await b,true);stale();assert.equal(h.storage.get('blogbg'),'url("https://example.com/new.jpg")');
  assert.match(h.bg(),/new.jpg/);assert.equal(h.timers.size,0);
});

test('solid change cancels a pending image and retains metadata selection',async()=>{
  const h=harness();h.mount();h.ctx.initAppearanceBackgrounds();
  const pending=h.ctx.changeAppearanceBackground('https://example.com/old.jpg');const old=h.images[0].onload;
  assert.equal(await h.ctx.changeAppearanceBackground('#ecb1b1'),true);old();assert.equal(await pending,false);
  assert.equal(h.storage.get('blogbg'),'#ecb1b1');assert.equal(h.document.ids.get('ap-bg-current-name').textContent,'纯色 01');
  const button=h.document.ids.get('ap-background-panel').querySelector('[data-ap-bg-id="solid-1"]');
  assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelector('.ap-bg-check').hidden,false);
});

test('error and timeout retain CSS/storage, expose retry, and detach handlers/src',async()=>{
  const h=harness({blogbg:'#123456'});h.mount();await h.ctx.restoreAppearanceBackground();const before=h.bg();
  let pending=h.ctx.changeAppearanceBackground('https://example.com/fail.jpg');h.images[0].error();assert.equal(await pending,false);
  assert.equal(h.bg(),before);assert.equal(h.storage.get('blogbg'),'#123456');assert.equal(h.document.ids.get('ap-bg-status').getAttribute('data-state'),'error');assert.equal(h.document.ids.get('ap-bg-retry').hidden,false);
  pending=h.ctx.retryAppearanceBackground();h.advance(11999);assert.equal(h.ctx.apBackgroundState.status,'loading');h.advance(1);assert.equal(await pending,false);
  assert.equal(h.bg(),before);assert.equal(h.storage.get('blogbg'),'#123456');
  for(const image of h.images){assert.equal(image.onload,null);assert.equal(image.onerror,null);assert.equal(image.src,'');}assert.equal(h.timers.size,0);
  pending=h.ctx.retryAppearanceBackground();h.images.at(-1).load();assert.equal(await pending,true);assert.match(h.bg(),/fail.jpg/);assert.equal(h.document.ids.get('ap-bg-retry').hidden,true);
});

test('default restore preserves all four mode URLs without creating thumbnail Images on homepage',async()=>{
  const h=harness();assert.equal(await h.ctx.restoreAppearanceBackground(),true);
  for(const name of ['home_bg.webp','dark_mode.webp?w=1920&fmt=webp&q=86','snow.webp','mb8.webp'])assert.ok(h.bg().includes(name));
  assert.equal(h.images.length,0);assert.equal(h.document.imageSources.length,0);assert.equal(h.storage.get('blogbg'),'default');
});

test('failed legacy HTTP restore keeps preference and displays default with no selected stale wallpaper',async()=>{
  const saved='url(http://example.com/legacy.jpg)',h=harness({blogbg:saved});h.mount();h.ctx.initAppearanceBackgrounds();
  const restore=h.ctx.restoreAppearanceBackground();assert.match(h.bg(),/home_bg.webp/);assert.equal(h.document.ids.get('ap-bg-current-name').textContent,'默认背景');
  h.images[0].error();assert.equal(await restore,false);assert.equal(h.storage.get('blogbg'),saved);assert.equal(h.ctx.apBackgroundState.current,'default');
  assert.equal(h.document.ids.get('ap-background-panel').querySelectorAll('[data-ap-bg-id]').some(b=>b.getAttribute('aria-pressed')==='true'),false);
  const retry=h.ctx.retryAppearanceBackground();h.images[1].load();assert.equal(await retry,true);assert.match(h.bg(),/http:\/\/example.com/);assert.equal(h.storage.get('blogbg'),saved);
});

test('older restore callback cannot overwrite user choice or local reset',async()=>{
  for(const end of ['solid','reset']){
    const h=harness({blogbg:'https://example.com/saved.jpg'});const restore=h.ctx.restoreAppearanceBackground();const old=h.images[0],captured=old.onload;
    if(end==='reset')h.ctx.resetAppearanceBackground();else await h.ctx.changeAppearanceBackground('#abcdef');
    captured();old.error();assert.equal(await restore,false);
    assert.equal(h.storage.get('blogbg'),end==='reset'?'default':'#abcdef');assert.equal(h.ctx.apBackgroundState.current,end==='reset'?'default':'#abcdef');
  }
});

test('local reset cancels both pending probes and drafts, touching only blogbg',async()=>{
  const h=harness({blogbg:'#abc123',font:'keep-font',theme:'dark',filter:'keep-filter'});h.mount();await h.ctx.restoreAppearanceBackground();
  const change=h.ctx.changeAppearanceBackground('https://example.com/global.jpg');h.document.ids.get('pic-link').value='https://example.com/custom.jpg';const preview=h.ctx.previewCustomBackground();const handlers=h.images.map(i=>i.onload);
  h.ctx.resetAppearanceBackground();handlers.forEach(fn=>fn());assert.equal(await change,false);assert.equal(await preview,false);
  assert.equal(h.storage.get('blogbg'),'default');assert.equal(h.storage.get('font'),'keep-font');assert.equal(h.storage.get('theme'),'dark');assert.equal(h.storage.get('filter'),'keep-filter');
  assert.equal(h.ctx.apBackgroundState.draft,null);assert.equal(h.document.ids.get('pic-link').value,'');assert.equal(h.document.ids.get('ap-bg-custom-apply').disabled,true);assert.equal(h.timers.size,0);
  assert.ok(h.writes.every(([key])=>key==='blogbg'));
});

test('custom preview changes only preview, apply commits validated draft without a second probe',async()=>{
  const h=harness({blogbg:'#112233'});h.mount();await h.ctx.restoreAppearanceBackground();const before=h.bg();const field=h.document.ids.get('pic-link');field.value='https://example.com/custom.jpg?a=1&b=2';
  assert.equal(await h.ctx.applyCustomBackground(),false);const pending=h.ctx.previewCustomBackground();assert.equal(h.document.ids.get('ap-bg-custom-apply').disabled,true);
  h.images[0].load();assert.equal(await pending,true);assert.equal(h.bg(),before);assert.equal(h.storage.get('blogbg'),'#112233');assert.equal(h.document.ids.get('ap-bg-custom-apply').disabled,false);
  assert.equal(h.document.ids.get('ap-bg-custom-preview').children[0].src,field.value);
  assert.equal(await h.ctx.applyCustomBackground(),true);assert.equal(h.images.length,1);assert.ok(h.bg().includes('custom.jpg'));assert.equal(h.storage.get('blogbg'),'url("'+field.value+'")');
});

test('custom input invalidates draft, settles old probe, and rejects silent field change',async()=>{
  const h=harness({blogbg:'#112233'});h.mount();const field=h.document.ids.get('pic-link');field.value='https://example.com/a.jpg';
  let pending=h.ctx.previewCustomBackground();let stale=h.images[0].onload;field.value='https://example.com/b.jpg';h.ctx.invalidateCustomBackground();stale();assert.equal(await pending,false);assert.equal(h.ctx.apBackgroundState.draft,null);assert.equal(h.images[0].src,'');
  pending=h.ctx.previewCustomBackground();h.images[1].load();assert.equal(await pending,true);field.value='https://example.com/c.jpg';assert.equal(await h.ctx.applyCustomBackground(),false);
  assert.equal(h.storage.get('blogbg'),'#112233');assert.equal(h.document.ids.get('ap-bg-custom-apply').disabled,true);assert.equal(h.document.ids.get('ap-bg-custom-preview').children.length,0);
});

test('custom timeout and HTTP rejection never change global settings',async()=>{
  const h=harness({blogbg:'#112233'});h.mount();const field=h.document.ids.get('pic-link');field.value='http://example.com/image.jpg';assert.equal(await h.ctx.previewCustomBackground(),false);assert.equal(h.images.length,0);
  field.value='https://example.com/image.jpg';const pending=h.ctx.previewCustomBackground();h.advance(12000);assert.equal(await pending,false);assert.equal(h.ctx.apBackgroundState.customStatus,'error');assert.equal(h.ctx.apBackgroundState.draft,null);assert.equal(h.storage.get('blogbg'),'#112233');assert.equal(h.images[0].src,'');
});

test('strict URL/color/gradient validation blocks credentials, script protocols and CSS injection',async()=>{
  const h=harness({blogbg:'#112233'});
  const invalid=['javascript:alert(1)','data:image/png;base64,x','https://user:pw@example.com/a','https://user@example.com/a','https://example.com/a\\b','https://example.com/a;--x:1','https://example.com/a\nb','https://example.com/a\"','https://example.com/a)','url(https://example.com/a);color:red','linear-gradient(red,blue)','radial-gradient(red,blue)','#wat','#12345','#112233; color:red','https://example.com/<style>'];
  for(const value of invalid){assert.equal(h.ctx.appearanceBackgroundParse(value),null,value);assert.equal(await h.ctx.changeAppearanceBackground(value),false,value);}
  assert.equal(h.storage.get('blogbg'),'#112233');assert.equal(h.images.length,0);
  for(const value of ['#123','#abcd','#aabbcc','#aabbccdd'])assert.equal(h.ctx.appearanceBackgroundParse(value).kind,'solid');
  assert.equal(h.ctx.appearanceBackgroundParse('url(\"http://example.com/a.jpg\")').url,'http://example.com/a.jpg');
  assert.equal(h.ctx.appearanceBackgroundSafeUrl('http://example.com/a',true),'');
  assert.equal(h.ctx.appearanceBackgroundSafeUrl('https://example.com/a?x=1&y=2',true),'https://example.com/a?x=1&y=2');
  assert.equal(h.ctx.appearanceBackgroundEscape('<a x="&\'">'),'&lt;a x=&quot;&amp;&#39;&quot;&gt;');
  assert.doesNotMatch(code,/\.innerHTML\s*=/);
});

test('catalog image and runtime API metadata use ids and checked state, unknown IDs do nothing',async()=>{
  const h=harness();h.installApis();h.mount();h.ctx.initAppearanceBackgrounds();
  let pending=h.ctx.selectAppearanceBackground('anime-1');h.images[0].load();assert.equal(await pending,true);
  let button=h.document.ids.get('ap-bg-category-anime').children[0];assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelector('.ap-bg-check').hidden,false);assert.equal(h.document.ids.get('ap-bg-current-name').textContent,'二次元 01');
  pending=h.ctx.selectAppearanceBackgroundApi('picsum');h.images[1].load();assert.equal(await pending,true);
  button=h.document.ids.get('ap-background-panel').querySelector('[data-ap-bg-id="api-picsum"]');assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelector('.ap-bg-check').hidden,false);assert.match(h.document.ids.get('ap-bg-current-meta').textContent,/刷新可能/);
  assert.equal(await h.ctx.selectAppearanceBackground('nope'),false);assert.equal(await h.ctx.selectAppearanceBackgroundApi('nope'),false);
});

test('global cancel settles pending work; post-reset init syncs default metadata without reprobing',async()=>{
  const h=harness({blogbg:'#112233'});h.mount();await h.ctx.restoreAppearanceBackground();
  const pending=h.ctx.changeAppearanceBackground('https://example.com/image.jpg');h.ctx.cancelAppearanceBackground();assert.equal(await pending,false);
  // Parent global reset clears/replaces storage, calls resetBg_, then init.
  h.storage.set('blogbg','default');h.ctx.resetBg_();h.ctx.initAppearanceBackgrounds();
  assert.equal(h.ctx.apBackgroundState.current,'default');assert.equal(h.document.ids.get('ap-bg-current-name').textContent,'默认背景');assert.equal(h.images.length,1);assert.equal(h.timers.size,0);
});

test('default preview follows actual theme and mobile breakpoint without eager homepage requests',async()=>{
  for(const [theme,width,file] of [['light',769,'id/1015/1920/1080'],['dark',769,'id/1044/1920/1080'],['light',768,'id/1018/1920/1080'],['dark',768,'id/1039/1920/1080']]){
    const h=harness({}, {theme,width});await h.ctx.restoreAppearanceBackground();
    assert.equal(h.document.imageSources.length,0);assert.equal(h.observers.length,0);assert.equal(h.listeners.size,0);
    h.mount();h.ctx.initAppearanceBackgrounds();
    assert.equal(h.document.ids.get('ap-bg-current-preview').children[0].src,'https://picsum.photos/'+file);
    assert.equal(h.observers.length,1);assert.equal(h.listeners.size,1);
    assert.doesNotMatch(h.ctx.appearanceBackgroundMarkup(),/<h2/);
  }
});

test('mounted default preview updates on theme/resize and avoids duplicate registrations or images',async()=>{
  const h=harness();await h.ctx.restoreAppearanceBackground();h.mount();h.ctx.initAppearanceBackgrounds();
  const initial=h.document.imageSources.length;
  h.ctx.initAppearanceBackgrounds();assert.equal(h.document.imageSources.length,initial);assert.equal(h.observers.length,1);
  assert.deepEqual(plain(h.observers[0].options),{attributes:true,attributeFilter:['data-theme']});
  h.document.documentElement.setAttribute('data-theme','dark');h.observers[0].fn();
  assert.match(h.document.ids.get('ap-bg-current-preview').children[0].src,/id\/1044\//);
  const darkCount=h.document.imageSources.length;h.window.innerWidth=800;h.listeners.get('resize')();assert.equal(h.document.imageSources.length,darkCount);
  h.window.innerWidth=768;h.listeners.get('resize')();assert.match(h.document.ids.get('ap-bg-current-preview').children[0].src,/id\/1039\//);
  h.document.documentElement.setAttribute('data-theme','light');h.observers[0].fn();assert.match(h.document.ids.get('ap-bg-current-preview').children[0].src,/id\/1018\//);
  await h.ctx.changeAppearanceBackground('#123456');const solidCount=h.document.imageSources.length;h.window.innerWidth=1024;h.listeners.get('resize')();assert.equal(h.document.imageSources.length,solidCount);assert.equal(h.storage.get('blogbg'),'#123456');
});

test('silent edit during custom probe clears stale loading state without enabling apply',async()=>{
  const h=harness({blogbg:'#112233'});h.mount();const field=h.document.ids.get('pic-link');field.value='https://example.com/a.jpg';
  const pending=h.ctx.previewCustomBackground();field.value='https://example.com/b.jpg';h.images[0].load();assert.equal(await pending,false);
  assert.equal(h.ctx.apBackgroundState.customPending,null);assert.equal(h.ctx.apBackgroundState.customStatus,'idle');assert.equal(h.ctx.apBackgroundState.draft,null);assert.equal(h.document.ids.get('ap-bg-custom-apply').disabled,true);assert.equal(h.storage.get('blogbg'),'#112233');
});

