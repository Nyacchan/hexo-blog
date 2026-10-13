# 美化功能开关 Implementation Plan

**Goal:** 新增猫咪挂件、听话鼠标访客开关，并沿用已有圆角边框分区。

**Architecture:** 只修改站点 source/ 脚本与样式，不修改 themes/。独立保存 nekoOn、cursorOn（1 开 / 0 关，缺失默认开），不复用右键菜单 mouse 键。光标采用单实例启停，关闭禁用自定义指针样式、停止动画和观察器；猫咪连同绳子隐藏，停止报时和动画。首屏脚本提前恢复隐藏状态，避免刷新闪现。

**Tech Stack:** Hexo、原生 JS、jQuery、WinBox、CSS、Node test。

## 实施
1. tools/tests/cursor-effects.test.cjs：扩展现有 mock 与回归测试，先验证新 API 缺失时失败，再验证默认开、关闭停止工作、恢复及 PJAX/换色不复活。
2. source/js/modules/cursor.js：setNekoEnabled(boolean) 与 CURSOR.setEnabled(boolean)，一次绑定、复用 DOM，关闭时清理计时器/rAF/observer。
3. source/js/modules/settings.js：initItem 默认值、独立设置函数、打开面板同步、reset 恢复；氛围特效 / 互动挂件 / 布局与部件用 bf-panel 框。
4. source/js/inject/beauty-boot.js 与 source/css/site-inject.css：恢复首屏偏好，猫咪与绳子同时隐藏；开关两列网格，窄面板改单列，键盘焦点可见。
5. _config.fomalhaut.yml：更新以上资源缓存版本。

## 验证
- node --test tools/tests/*.test.cjs，预期全通过；node --check 修改的 JS。
- npm run build，确认 Hexo 生成内容。
- 使用临时本地预览 4010 的独立 Chrome Agent Window 测试立即切换、刷新持久化、恢复默认、换主题色、桌面与窄屏布局；PJAX 重建/禁用状态由回归测试覆盖。原 4001 监听进程实际为 QQ，不作为博客预览使用。
- 不提交或推送，等待用户检查。

## 已完成验证
- node --test tools/tests/*.test.cjs：156 项全部通过；原有测试保留，补充挂件/鼠标生命周期、设置持久化、首帧状态、面板重开、默认重置等回归。
- node --check：cursor.js、settings.js、beauty-boot.js 均通过；npm run build 成功，git diff --check 无错误。
- Chrome 实测：关闭猫咪后猫咪与绳子立即消失，重新开启恢复；两个开关关闭后刷新仍关闭，换主题色不复活，恢复默认重新开启。
- 深浅主题布局均验证；桌面两列，390px 手机视口单列，标签与开关不挤压。
- 本地预览原有 deploy.json 404、chrome-extension://invalid/ 网络错误与本次开关无关；无新增开关脚本异常。

## 备份与回滚
修改前文件保存到 bak/20261010-beauty-switches/before/，按原相对路径恢复后重新 npm run build 即可。
