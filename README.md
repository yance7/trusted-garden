# Trusted Garden — Reference Farm 001 / V0.8

一个「物理—数字参考农场」的交互式 3D 概念展示项目。当前仅保留 **V0.8**，包含天气与日照、人物漫游、第一 / 第三人称视角、碰撞检测和渲染增强。

> 所有运行数值均为模拟值，接入真实传感器前不代表实际运行情况。

- 仓库：[yance7/trusted-garden](https://github.com/yance7/trusted-garden)
- 线上地址：<https://trusted-garden.yance.me/>（仓库 Pages 已配置此自定义域名）
- GitHub Pages 默认地址：<https://yance7.github.io/trusted-garden/>（使用自定义域名时由 GitHub 跳转）
- 版本详情：[V0.8 说明](v0.8/README.md)
- 历史记录：[CHANGELOG.md](CHANGELOG.md)（历史文字保留，V0.6 / V0.7 文件已移除）

## 本地打开

直接用桌面 Chrome / Edge / Safari 打开：

```text
v0.8/trusted-garden-v0.8-showcase.html
```

展示页为约 12.1 MB 的自包含 HTML，不依赖外部 3D 库或在线资源，也不需要安装依赖。GLB 文件供 Blender 等 3D 软件检查，页面运行时不需要单独加载它。

基本操作：拖拽旋转、滚轮缩放、右键平移、双击聚焦；`G` 进入漫游，`W A S D` 移动，`Shift` 奔跑，`V` 切换视角，`?` 查看快捷键。建议使用支持 WebGL 2 的桌面浏览器；画面较慢时切换 Performance 模式。

## 目录

```text
Trusted Garden/
├── README.md
├── CHANGELOG.md                    历史变更记录
├── DEPLOYMENT.md                   GitHub Actions / Pages 配置
├── .github/workflows/pages.yml     自动部署工作流
├── v0.8/
│   ├── README.md
│   ├── trusted-garden-v0.8-showcase.html
│   └── trusted-garden-v0.8-model.glb
├── tools/
│   ├── README.md
│   ├── build-site.mjs              生成网站发布目录
│   ├── enhancement-v0.8/           V0.8 增强层源码与重建脚本
│   ├── render-check/               浏览器与几何诊断工具
│   └── screenshots/v0.8/           本地迭代截图，不提交 Git
└── dist/                          生成的发布目录，不提交 Git
```

## GitHub Actions 部署

首次在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

推送到 `main` 或在 Actions 页面手动运行 **Deploy V0.8 to GitHub Pages**，工作流会生成 `dist/` 并发布。无需 npm 依赖、额外密钥或单独的部署分支。

本地生成与预览相同的网站文件：

```powershell
node tools/build-site.mjs
python -m http.server 8000 --directory dist
```

打开 <http://localhost:8000/>。生成的 `dist/index.html` 与 V0.8 展示页内容相同，网站首页直接展示场景。

完整步骤与故障排查见 [DEPLOYMENT.md](DEPLOYMENT.md)。开发和重建见 [tools/README.md](tools/README.md)。
