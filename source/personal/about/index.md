---
title: 关于我是谁
date: 2022-08-10 16:05:11
---

<!--
  2026-10-13：整页改为单句大字「双枪会给出答案」。
  原内容（线路信息 / 技术栈 / 演示站介绍）已备份到同目录 _bak/index.md.<时间戳>.bak，
  想恢复直接覆盖回来即可。
  样式内联在本页，作用域限定在 .about-motto 内，不影响站内其它页面。
-->

<style>
.about-motto {
  --am-accent: var(--theme-color, #39c5bb);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52vh;
  padding: 6vh 1rem;
  text-align: center;
  user-select: none;
}

/* 大字主体：用 clamp 自适应，手机上不会溢出，宽屏上够大够狠 */
.about-motto .am-title {
  margin: 0;
  font-size: clamp(2.4rem, 11vw, 7.5rem);
  font-weight: 900;
  line-height: 1.16;
  letter-spacing: .06em;
  background: linear-gradient(120deg,
      var(--am-accent) 0%,
      color-mix(in srgb, var(--am-accent) 55%, #7c5cff) 50%,
      var(--am-accent) 100%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: am-flow 7s ease-in-out infinite;
  text-wrap: balance;
}

/* 底部一条细装饰线，跟着主题色走 */
.about-motto .am-rule {
  width: clamp(72px, 22vw, 220px);
  height: 3px;
  margin-top: 2.2rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg,
      transparent,
      color-mix(in srgb, var(--am-accent) 75%, transparent),
      transparent);
}

@keyframes am-flow {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}

/* 尊重系统的「减弱动态效果」设置 */
@media (prefers-reduced-motion: reduce) {
  .about-motto .am-title { animation: none; }
}

/* 大字下方的补充说明：跟大字拉开距离，弱化成次要信息 */
.about-motto .am-note {
  margin: 0;
  max-width: 42em;
  font-size: clamp(.95rem, 1.6vw, 1.15rem);
  line-height: 1.95;
  color: color-mix(in srgb, var(--font-color, #1f2937) 66%, transparent);
}
.about-motto .am-note + .am-note { margin-top: .35em; }
[data-theme="dark"] .about-motto .am-note {
  color: rgba(255, 255, 255, .62);
}
.about-motto .am-note-src {
  font-weight: 700;
  letter-spacing: .08em;
  color: color-mix(in srgb, var(--am-accent) 82%, var(--font-color, #1f2937));
}
</style>

<div class="about-motto">
  <p class="am-title">双枪会给出答案</p>
  <hr class="am-rule">

  <br><br><br>

  <p class="am-note">骗你的，我只是个爱折腾的普通的二本大学生，网站也是折腾的一部分</p>
  <p class="am-note am-note-src">本站开源</p>
</div>
