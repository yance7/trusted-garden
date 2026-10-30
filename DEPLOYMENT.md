# GitHub Actions / Pages

源码合入 `main` 后，`.github/workflows/pages.yml` 使用 Node.js 22 运行：

```text
npm ci
npm test
npm run build
```

构建生成 `dist/`，通过 `actions/upload-pages-artifact` 和 `actions/deploy-pages` 发布。Pages 来源保持 **GitHub Actions**；不改自定义域名、DNS 或已有 HTTPS 设置。

本地可运行 `npm run build` 和 `npm run preview` 检查生产构建。`node tools/serve-preview.mjs` 额外提供 `/trusted-garden/` 子路径映射，供浏览器回归。

## 资源约定

- 页面、脚本、模型、WebP 预览、KTX2 高清纹理及 Meshopt / Basis 解码器全部同站点托管，无 CDN 运行依赖。
- 使用相对发布路径，同时兼容默认项目地址和自定义域名根路径。
- 4K 材质已经提交；CI 不必从素材站重新下载，也不需要图形工具。
- 各资源独立存储，避免把全部高分辨率纹理塞进一个超过 Git 单文件限制的 GLB。
- `public/assets/` 是完整资源包；部署或迁移时不可只复制模型文件而漏掉 `textures/`、`previews/`、`basis/` 或 `delivery.json`。

## 验收与回滚

本次高清改造先在独立分支本地验收。2026-10-30 用户确认后授权最终检查、合入主分支并直接发布。上线前检查图像、移动录像、交互与资源加载；上线后对同一提交再次确认 Actions 和实际网站，不能将旧提交的成功记录当作本次部署结果。

原线上 V0.8 基线提交为 `7e5a52926fce8d6759e56986610931139a32d70a`。需要回滚时使用评审后的恢复提交或重新发布已验收的产物，避免强制覆盖分支历史。
