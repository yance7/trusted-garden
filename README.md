# Trusted Garden — V0.8 HD

在原 V0.8 农场布局与交互基础上升级的高清三维参考农场：物理材质、原生 4K 表面贴图、更精细的曲面与硬表面、叶簇树冠、曲面草叶、骨骼人物和模拟控制屏。

> 界面中的运行读数均为模拟值，不代表真实传感器、设备健康度或实际控制命令。

## 本地使用

```powershell
npm ci
npm run dev
```

按终端显示的地址打开。新版本由页面、模型与材质资源组成，使用 HTTP 预览；不能双击单个 HTML 代替预览服务。

```powershell
npm test
npm run build
npm run preview
```

`npm run build` 从已提交的材质和原版模型生成高清模型，再检查类型并构建 `dist/`，无需下载外部运行资源或安装 Blender。重新制作材质需要 Python、Pillow、NumPy；见 [资产说明](docs/hd-assets.md)。

## 操作

拖拽旋转、滚轮缩放、右键平移；`1–8` 切换视点，`T` 导览，`W` 切换天气，`G` 进入漫游，`WASD` 移动，`Shift` 奔跑，`V` 切换第一 / 第三人称。漫游中拖拽转头，双击锁定鼠标，`Esc` 退出。`S` 截图、`H` 隐藏界面拍照、`Y` 日晷、`?` 快捷键。

High detail 为完整材质与接触阴影；Performance 降低输出和阴影分辨率、关闭 SSAO，保留几何与原生材质；Photo HD 提高输出像素上限。画质仍受设备支持的分辨率与内存约束。

## 结构与交付

- `src/`：渲染、天气、界面、相机、碰撞与人物动画。
- `tools/assets/`：资产读取、模型增强、材质制作与导出工具。
- `public/assets/`：网站实际使用的模型、材质、对象清单和来源记录。
- `tests/`：资产与状态契约；`tools/verify-hd.mjs`：真实浏览器交互回归。
- `v0.8/`：原版交付与高清生成流程的源模型，不是新版网站入口。
- `dist/`：生成的网站，GitHub Actions 发布此目录。

高清静态模型为 `public/assets/trusted-garden-v0.8-hd.glb`，骨骼人物为 `researcher-v0.8-hd.glb`。复制 / 下载静态模型时必须保留同目录的 `textures/`；模型包含网格压缩，查看器需支持 Meshopt、WebP 和 glTF 物理材质。

网站仍使用 [GitHub 仓库](https://github.com/yance7/trusted-garden) 和 GitHub Actions / Pages。生产域名为 [trusted-garden.yance.me](https://trusted-garden.yance.me/)。开发分支上的改造不会自动更新线上，见 [部署说明](DEPLOYMENT.md)。

设计、实施和验证分别见 [设计方案](docs/superpowers/specs/2026-10-29-v08-visual-quality-design.md)、[实施计划](docs/superpowers/plans/2026-10-29-v08-hd.md)、[验证记录](docs/hd-verification.md)。
