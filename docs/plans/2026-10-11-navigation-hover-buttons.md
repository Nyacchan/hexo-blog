# 导航悬停按钮尺寸与垂直居中

## 范围与原因

用户指出首页图标与回到顶部内容上下不居中，首页按钮过大。主题伪元素继承整块站名尺寸并固定 line-height:34px/45px，与实际文字盒高度不一致。本轮只在站点注入层覆盖，不修改 themes、跳转逻辑或其他既有改动，不提交、推送、部署。

## 方案

用户补充：首页按钮宽度应接近 Fomalhaut🥝 并完全覆盖站名，因此伪元素宽度跟随站名链接（100%），不采用小方块；高度收紧为40px，图标用 flex 居中而非固定行高。回到顶部伪元素同样居中并限制视觉宽度；标题链接采用44px行内弹性盒，标题容器上下与左右一起居中，保留原悬停缩放中心。保留主题色、光晕、键盘焦点与减少动态效果策略，窄屏省略不变。

## 备份

本轮真实起始版本：[导航样式](<E:/Blog/MainBlog/bak/20261011-navigation-hover-buttons/before/source/css/navigation.css>)、[配置](<E:/Blog/MainBlog/bak/20261011-navigation-hover-buttons/before/_config.fomalhaut.yml>)、[测试](<E:/Blog/MainBlog/bak/20261011-navigation-hover-buttons/before/tools/tests/navigation.test.cjs>)。回滚前确认没有后续修改，恢复对应备份再生成；不使用 git HEAD 覆盖早前改动。

## 验收

- 导航专项15项全部通过；原主题模板、样式、事件源文件的独立哈希保护通过。最终 Hexo generate 退出0。
- 全量408项：405通过，3项旧缓存版本断言失败（fireflies/snow/theme-color 均仍期望 site-inject.css 的 snow1，但本轮开始配置已是 search1）。用只读预加载把所选测试的配置读取指向本轮 before 备份，同样复现这3项失败，未扩大范围改动这些测试或资源。导航测试中另一个旧 scroll-gap-fix.js 无版本断言已按本轮起始配置的 v=20261011 校正，未修改该脚本。
- Chrome 8ca07e26 独立窗口实际检查：首页悬停宽度跟随完整站名、图标上下居中；回到顶部文字与整个按钮均居中，浅色/深色均无原文字透出。回到顶部和首页点击后观察到首屏菜单恢复，功能保留。320px极窄屏首页悬停覆盖省略站名，不侵入工具区。375px浅色首页悬停检查通过。截图已在会话展示；浏览器返回的临时截图路径已消失，未保存为独立交付文件。
- navigation.css 缓存版本升级为20261011-nav3；未改 themes，未提交、推送或部署。
