# 字体与背景预览 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 落地用户确认前两轮字体背景优化，保持素材、默认值、现有美化项；不做独立设备/夜间壁纸和字号行距。

**Architecture:** 独立 appearance-fonts.js 与 appearance-backgrounds.js 全局模块，在 settings.js 前 defer 注入。现有 setFont/setCodeFont/setBg/resetBg_ 保持同步兼容，交互新入口负责异步加载与token保护；替换面板旧模板，CSS注入覆盖主题。

**Tech Stack:** 原生JS/CSS、FontFaceSet、Image、localStorage、Hexo、NodeVM回归、Chrome Agent Window。

---

### Task 1: 备份与契约
- 已备份 _config.fomalhaut.yml、source/js/modules/settings.js、source/css/site-inject.css、tools/tests/beauty-switches.test.cjs 至 bak/20261010-appearance-preview/before/。新增两module/测试/计划，可独立移除；其他有改动的测试也须先备份。
- 不commit/push/deploy，不覆盖已有改动，不改 themes/。

### Task 2: 字体
- Create source/js/modules/appearance-fonts.js；Test tools/tests/appearance-fonts.test.cjs。
- 字体名字卡不使用各自 font-family，不预加载所有字体；阅读5项/个性3项/代码4项完整保留。正文/代码各一预览区，选中勾选+用途说明，装饰组details收起。
- chooseAppearanceFont(key,kind)只对合法key请求document.fonts.load，12秒timeout；成功再setFont/setCodeFont写存储；最新请求胜，失败不写、可重试；resetAppearanceFonts只恢复两font key，不重置颜色/背景。

### Task 3: 背景
- Create source/js/modules/appearance-backgrounds.js；Test tools/tests/appearance-backgrounds.test.cjs。
- 从现模板提取全部既有32壁纸+8渐变+7纯色及8API，名称/适配标签、可访问button、当前preview及局部恢复。图库/色彩/自定义一级，图库内4分类，API进阶收起；打开分类才生成img.src，浏览缩略图与点击全图分离。
- changeAppearanceBackground(value)Image预加载+12秒timeout+token取消旧完成，不成功不保存，失败保留旧图；restoreAppearanceBackground()恢复已有偏好并保护用户新选择免于旧restore失败回退。
- 自定义HTTPS链接先previewCustomBackground()，确认后applyCustomBackground()；输入变化/背景重置清掉待应用preview。metadata来源和当前图从现偏好恢复，动态API明确提示刷新可能变图。

### Task 4: 集成与回归
- Modify source/js/modules/settings.js：两个新markup替换字体背景片段，createWinbox完后init helpers；changeBg/getPicture/checkImgExists/resetBg wrappers以及启动恢复接新module；全局reset先取消pending，防晚回调。修panel宽度旧五按钮measure，独立字体类避免旧swf全局规则。
- Modify source/css/site-inject.css：轻边框16px圆角、主题色selected、焦点44px、深浅模式、自适应grid，桌面2列字体/缩略3列，窄窗收敛。
- Modify _config.fomalhaut.yml：两module在settings前，更新settings/CSS版本。现tests抽取createWinbox新helperstub；font/bgagent独立VM实现tests。
- node --check JS；node --test tools/tests/*.test.cjs；git diff --check；npx hexo generate；临时server+Chrome8ca07e26/noFocus验证预览/分组/选中/保存/局部恢复/自定义错链保留/窄窗深浅。结束ownedsession/server；不绕过原生picker工具限制。

## 验证结果
- 三个改动/新增 JS 的 node --check、完整 Node 回归 319/319（字体24、背景20）、git diff --check 通过。旧色板资源版本断言按新CSS/settings版本更新，额外备份theme-color.test.cjs，累计五文件备份。
- Hexo generate 成功。Chrome 8ca07e26 后台独立窗口实际字体新晰黑/代码Maple Mono加载应用并跨刷新保留；字体恢复只重置两字体，壁纸仍二次元02。
- 实测图库选中二次元01、HTTPS图链接先预览不改全站、确认应用二次元02；无效域名失败保留二次元02且应用禁用；纯色选择刷新保留，背景局部恢复默认不改变已选代码字体。
- 深色桌面与浅色375px手机截图检查：字体2列/1列、图库3列/2列，没有横向溢出；默认预览随主题与屏幕匹配四张旧默认壁纸。
- timeout/latest/reset-race通过真实函数VM的可控FontFaceSet/Image/timers验证，不宣称浏览器覆盖所有竞态；动态API仍依赖外部服务，所有素材URL保留。
- 已有模块/主题色/滤镜行为保留；没有修改themes/、commit/push/deploy。

- 最后兼容checkImgExists入口统一安全URL/12s探测，缩略图避免重复读出名称；再次全319测试与三JS语法、git diff --check通过，最终generate成功186文件。临时独立浏览器和本地预览服务器已关闭。

## 回滚
复制 before/ 备份到对应位置，再移除本轮新增module注入并hexo generate。测试与计划可独立移除。
