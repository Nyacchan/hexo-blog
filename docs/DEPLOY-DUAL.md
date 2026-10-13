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

## 一、Cloudflare Pages（主线路）

### 1. 创建项目
1. 打开 <https://dash.cloudflare.com/> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权 GitHub，选择仓库 **`Nyacchan/hexo-blog`**，分支选 **`main`**
3. 构建配置（仓库根已有 `wrangler.toml`，通常会自动读取；若要求手填则照下填）：

   | 项 | 值 |
   |---|---|
   | Framework preset | `None` |
   | Build command | `npx hexo clean && npx hexo generate && npx gulp` |
   | Build output directory | `public` |
   | Environment variable | `NODE_VERSION` = `20` |

4. 点 **Save and Deploy**，等第一次构建完成（约 2–4 分钟）。
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
