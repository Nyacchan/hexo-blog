# 导航发光裁切修复与磨砂性能降级

## 问题与范围

用户指出站名右边光晕突然断开，并询问导航磨砂对滚动性能的影响。上一轮 [navigation.css](<E:/Blog/MainBlog/source/css/navigation.css>) 的站名 overflow:hidden 同时裁掉主题文字阴影与首页 hover 伪元素阴影；主题霓虹 light_15px 是15px文字阴影动画。本轮修复该回归，不删除原卡通图标、霓虹开关或导航事件。

backdrop-filter 在滚动或背景动画变化时可能重复采样与合成；CSS模糊不是新增JS逐像素计算，也不等于每次都触发页面布局。成本取决于浏览器、GPU、面积与DPR；本轮不承诺提升比例，也不把FPS角标或加载Vitals当作滚动/GPU基准。

## 实现

- 普通桌面与375px站名允许光晕外溢；<=360px保留省略安全阀并停用站名霓虹，避免极窄屏裁切光晕及侵入工具。320px品牌槽约100px，此项是布局预算，实际仍需字体就绪后检查；不承诺任意未来长站名/字体都适合当前断点。
- 稳定导航默认关闭两种前缀backdrop-filter，保留.96高不透明度暖白/深灰底色。只有>=1200px、主要指针fine、hover:hover、no-preference且支持filter的桌面开启6px轻磨砂（旧12px），底色alpha .92。设备条件不是硬件性能检测；混合触摸笔记本按主要指针判断。
- 大图首屏继续无磨砂、无新增滚动监听/轮询、无will-change常驻图层。减少动态效果时停止导航站名及其hover伪元素的animation/transition。
- [配置](<E:/Blog/MainBlog/_config.fomalhaut.yml>) 导航链接改为20261011-nav2以免吃旧缓存；不改themes或其他资源顺序。

## 备份与回滚

本轮开始时真实工作区版本（不是git HEAD）保存在 [导航样式备份](<E:/Blog/MainBlog/bak/20261011-navigation-glow-perf/before/source/css/navigation.css>)、[配置备份](<E:/Blog/MainBlog/bak/20261011-navigation-glow-perf/before/_config.fomalhaut.yml>)、[测试备份](<E:/Blog/MainBlog/bak/20261011-navigation-glow-perf/before/tools/tests/navigation.test.cjs>)。

回滚本轮可在确认没有后续修改后恢复这三个备份并重新生成；只回滚CSS与配置即可撤销运行时变化。不要用git HEAD覆盖之前各轮改动。不提交、推送或部署。

## 验收

- 全量 Node 回归：407 项通过，0 项失败；git diff --check 与 Hexo generate 均退出 0。
- 指定 Chrome（8ca07e26）独立 Agent 窗口验证：桌面深浅色、品牌霓虹与首页 hover 光晕完整；375px 手机首屏和固定导航深浅色均无图标重叠。320px 极窄屏首屏及固定导航深浅色均保留省略安全阀，图标不重叠，站名无霓虹硬裁。
- 网络捕获确认 navigation.css?v=20261011-nav2 请求成功（HTTP 200），不是旧缓存版本。
- 仅完成结构性渲染成本优化和视觉验收；没有做 GPU/滚动帧时基准，不用 FPS 角标推断提升比例。
