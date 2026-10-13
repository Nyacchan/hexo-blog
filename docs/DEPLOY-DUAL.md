# 双线路部署说明（Cloudflare Pages + GitHub Pages）

同一份源码（`main` 分支）同时发布到两条线路，任一域名都能访问：

| 线路 | 域名 | 构建方 | 角色 |
|---|---|---|---|
| 主线路 | `nyacchan.qzz.io` | Cloudflare Pages（自动构建） | 日常访问 |
| 备份线路 | `nyacchan.github.io` | GitHub Actions → `gh-pages` 分支 | 兜底 |

两条线路内容完全一致，都从 `main` 分支构建。站内跳转已由
`source/js/inject/pc-local-link.js` 按 `location.origin` 本地化，
所以在 gh.io 上访问时链接不会被带回主域名。

---

## 当前进度（2026-10-14）

| 步骤 | 状态 |
|---|---|
| 源码仓库 `Nyacchan/hexo-blog` | ✅ 已建并推送 |
| GitHub Actions 工作流 | ✅ 已跑通（run #2 success） |
| `gh-pages` 分支 | ✅ 已生成 |
| `package.json` 的 `build` 脚本 | ✅ 已含 gulp 压缩 |
| GitHub Pages 开关 | ⬜ **待开启**（Settings → Pages） |
| Cloudflare Pages 项目 | ⬜ **待创建**（注意框架预设选 Hexo） |
| `nyacchan.qzz.io` DNS | ⬜ **待绑定自定义域** |

**剩下三步都需要在网页上操作**，见下面两节。

---

## 一、GitHub Pages（备份线路）

### 开启 Pages
1. 打开 <https://github.com/Nyacchan/hexo-blog/settings/pages>
2. **Source** 选 **Deploy from a branch**
3. **Branch** 选 **`gh-pages`**，目录选 **`/ (root)`** → **Save**
4. 等 1–2 分钟，访问 <https://nyacchan.github.io>

> `gh-pages` 分支已由 Actions 生成，现在可以在下拉框里选到。

### （可选）AI 对话代理
`/api/chat/completions.js` 需要 `DEEPSEEK_API_KEY` 才能工作。
仓库 → **Settings → Secrets and variables → Actions → New repository secret**，
名称 `DEEPSEEK_API_KEY`，值填你的 key。

不填也能正常构建，只是前端不启用 AI 对话。

> ⚠️ GitHub Pages 是纯静态托管，**不会执行** `/api` 下的 Serverless 函数。
> 所以 gh.io 这条线路上的 AI 对话无法工作（会走 Cloudflare / Vercel 的代理）。
> 其余功能（文章、搜索、画廊等）全部正常。

### 关于 `pages build and deployment` 报错
Actions 列表里还有一个 GitHub 内置的 `pages build and deployment` 任务，它失败是正常的：
那是 GitHub 在开启 Pages **之前**尝试用 Jekyll 构建仓库根目录导致的。
按上面第 3 步把 Source 指定成 `gh-pages` 分支后，它会被替换成正确的部署任务。

---

## 二、Cloudflare Pages（主线路）

> ⚠️ **踩坑记录（务必先读，能省半小时）**
>
> **1. 必须建 Pages 项目，不要建 Workers 项目。**
> CF 新版控制台把入口合并成了 **Workers & Pages**，默认容易点进 **Workers**。
> Workers 项目的部署命令是 `npx wrangler deploy`，它会对项目做 autoconfig 框架探测，
> 而本项目 `package.json` 里同时有 `hexo` 与 `gulp` 两个依赖，于是必然报：
>
> ```
> ✘ [ERROR] Cloudflare's tooling was unable to automatically configure your project,
>   since multiple frameworks were found: Hexo, gulp.js.
> ```
>
> 症状是**构建成功但部署失败**（日志里能看到 `Success: Build command completed`，
> 紧接着 `Failed: error occurred while running deploy command`）。
>
> 正确入口：**Workers & Pages → Create → 切到 `Pages` 标签 → Connect to Git**。
> 注意 Create 页面顶部有 `Workers` / `Pages` 两个 tab，要选 **Pages**。
>
> **2. 仓库里不要放 `wrangler.toml`。**
> 按官方说明，一旦使用 wrangler 配置文件，它就成为「配置源」，
> 仪表盘里对应字段会被锁（[文档](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)），
> 而它本身又**不支持写构建命令**，加上只会让问题更难排查。
> 构建命令一律在仪表盘填。
> （历史备份见仓库外的 `_bak-deploy-notes/wrangler.toml.bak`。）

### 1. 创建项目（Pages，不是 Workers）
1. 打开 <https://dash.cloudflare.com/> → **Workers & Pages** → **Create**
2. **切到顶部的 `Pages` 标签**（默认可能是 Workers）→ **Connect to Git**
3. 授权 GitHub，选择仓库 **`Nyacchan/hexo-blog`**，分支选 **`main`**
4. 在 **Set up builds and deployments** 里填：

   | 配置项 | 值 |
   |---|---|
   | Framework preset | **Hexo** ← 必须显式选，别留 None/Auto |
   | Build command | `npm run build` |
   | Build output directory | `public` |
   | Root directory | （留空） |

   > `npm run build` 已在 `package.json` 里定义为 `hexo generate && gulp`，
   > 即「生成 + 压缩」，与本地构建完全一致。

5. （推荐）展开 **Environment variables**，加一项：

   | 变量名 | 值 |
   |---|---|
   | `NODE_VERSION` | `22` |

   不设也能构建，但设了能避免 Node 版本漂移带来的玄学问题。

6. 点 **Save and Deploy**，等第一次构建完成（约 3–5 分钟）。
   完成后会得到一个 `*.pages.dev` 的临时域名，先确认能打开。

### 2. 绑定自定义域
1. 项目 → **Custom domains** → **Set up a custom domain**
2. 输入 `nyacchan.qzz.io` → 继续
3. 因为 `qzz.io` 已托管在同一个 Cloudflare 账号里，CF 会**自动**加好 CNAME 记录，直接点确认即可
   （若提示手动加：类型 `CNAME`，名称 `nyacchan`，目标为你的 `<项目名>.pages.dev`，代理状态开启）
4. 等待证书签发（通常几十秒到几分钟），之后 `https://nyacchan.qzz.io` 即可访问

### 3.（可选）把 www 也指过来
重复第 2 步，再绑一个 `www.nyacchan.qzz.io`，或加一条重定向规则
（Rules → Redirect Rules）把 `www` 301 到裸域。

### 4.（可选）AI 对话代理
CF Pages 会执行仓库里 `functions/api/chat/completions.js` 这个 Pages Function，
它就是 AI 对话的同源代理。需要给它配 API Key：

项目 → **Settings → Environment variables** → 添加：

| 变量名 | 值 | 环境 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 你的 key | Production 与 Preview 都勾上 |

配好后重新部署一次即可生效。这条路线上 AI 对话是**完整可用**的
（GitHub Pages 那条线不行，见上文说明）。



---

## 二、GitHub Pages（备份线路）

仓库根已有 `.github/workflows/deploy.yml`：每次推送到 `main` 会自动构建并把
`public/` 发布到 `gh-pages` 分支。

### 1. 开启 Pages
1. 仓库 → **Settings** → **Pages**
2. **Source** 选 **Deploy from a branch**
3. **Branch** 选 **`gh-pages`**，目录选 **`/ (root)`** → Save
4. 等第一次 Actions 跑完（Actions 标签页可看进度），之后访问
   <https://nyacchan.github.io>

> 首次推送后 `gh-pages` 分支才会出现。如果 Pages 页面里选不到该分支，
> 先等 Actions 成功跑完一次再回来选。

### 2.（可选）AI 对话代理
`/api/chat/completions.js` 需要 `DEEPSEEK_API_KEY` 才能工作。
在 GitHub 上：**Settings → Secrets and variables → Actions → New repository secret**，
名称填 `DEEPSEEK_API_KEY`，值填你的 key。

不填也能正常构建，只是前端不启用 AI 对话。

> ⚠️ GitHub Pages 是纯静态托管，**不会执行** `/api` 下的 Serverless 函数。
> 所以 gh.io 这条线路上的 AI 对话无法工作（会走 Cloudflare / Vercel 的代理）。
> 其余功能（文章、搜索、画廊等）全部正常。

---

## 三、日常更新流程

```bash
# 1. 本地预览
npx hexo server            # http://localhost:4000

# 2. 写完后提交推送
git add -A
git commit -m "post: 新文章"
git push
```

推送后：
- **CF Pages** 监听到 `main` 变更 → 自动重新构建 → 更新 `nyacchan.qzz.io`
- **GitHub Actions** 同时触发 → 构建后发布到 `gh-pages` → 更新 `nyacchan.github.io`

两条线路都无需手动干预。

---

## 四、排错

| 症状 | 原因 / 处理 |
|---|---|
| `nyacchan.qzz.io` 打不开 | DNS 记录没加或证书未签发；去 CF 项目 Custom domains 看状态 |
| gh.io 显示 404 | Pages 未开启，或没选 `gh-pages` 分支 |
| Actions 构建失败 | 多半是 `npm ci` 与 lock 文件不一致；看 Actions 日志里具体报错 |
| 页面样式错乱 | 检查 `_config.yml` 的 `url` 是否为 `https://nyacchan.qzz.io/`（影响 sitemap/canonical，不影响样式） |
| CF 构建超时 | 首次装依赖较慢，可在 CF 项目 Settings 里把构建超时调大 |
