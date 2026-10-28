# GitHub Pages 部署

本项目使用 **GitHub Actions** 构建并发布 GitHub Pages，工作流为 [pages.yml](.github/workflows/pages.yml)。

## 首次配置

1. 将项目上传到 [yance7/trusted-garden](https://github.com/yance7/trusted-garden) 的 `main` 分支。
2. 打开仓库 **Settings → Pages**。
3. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
4. 打开 **Actions → Deploy V0.8 to GitHub Pages**。首次推送会自动运行；若 Pages 启用较晚，可选择 **Run workflow**，分支为 `main`。
5. 等待 `build`、`deploy` 均成功后访问 <https://yance7.github.io/trusted-garden/>。

如通过 API 配置 Pages，应选择 `build_type: workflow`。这是 Actions 发布，不使用分支目录发布。

## 发布内容

工作流运行 `node tools/build-site.mjs`，将当前 V0.8 交付文件复制到 `dist/`：

```text
dist/
├── index.html                        V0.8 自包含展示页
├── trusted-garden-v0.8-model.glb       模型文件
└── .nojekyll
```

上传和部署只使用 `dist/`。首页没有重定向，也不依赖 `/` 开头的外部资源路径，适用于 `/trusted-garden/` 项目子路径。

工作流仅在部署任务中请求 `pages: write` 与 `id-token: write`，使用 GitHub 提供的令牌，不需要自建 Token。

## 更新网站

1. 若修改增强层源码，先运行 `python tools/enhancement-v0.8/inject.py`，更新 V0.8 HTML。
2. 本地打开展示页，或生成 `dist/` 后通过 HTTP 预览。
3. 提交并推送到 `main`，Actions 会自动发布更新。

仅修改 `tools/enhancement-v0.8/` 不会自动重建 HTML；工作流发布已提交的 V0.8 HTML。这样本地确认的交付物与线上首页一致。

## 排查

- **Pages 未启用 / deploy 失败**：确认 Pages 的 Source 为 GitHub Actions，再重新运行工作流。
- **权限或审批等待**：检查仓库 Actions 是否允许运行，以及 `github-pages` 环境是否配置了审批规则。
- **404**：先确认 `deploy` 成功，再访问完整项目地址 `/trusted-garden/`；仓库上传成功不等于网站部署成功。
- **场景卡顿**：切换 Performance 模式；优先使用桌面浏览器并启用硬件加速。
- **本地依赖**：发布构建只使用 Node.js 标准库，无需 `npm install`；Playwright 仅用于可选的开发验证。

官方说明：[自定义 GitHub Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
