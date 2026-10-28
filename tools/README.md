# V0.8 构建与验证工具

本目录保留当前版本的开发工具。V0.6 / V0.7 的交付目录、V0.7 增强层及旧版截图已移除。

## 网站发布目录

在项目根目录运行：

```powershell
node tools/build-site.mjs
```

生成 `dist/index.html`、V0.8 GLB 与 `.nojekyll`。无第三方依赖；`dist/` 不提交 Git，由 GitHub Actions 重新生成并发布。

## enhancement-v0.8/

V0.8 HTML 内已经包含基础场景和完整增强层，不再读取已删除的 V0.6 文件。

| 文件 | 作用 |
|---|---|
| `critical.css` | 加载页首屏样式 |
| `theme.css` | 增强层样式与界面 |
| `app.js` | 渲染增强、人物、漫游与交互 |
| `inject.py` | 从现有 V0.8 HTML 移除旧注入块，再写入最新增强层 |

修改源码后运行：

```powershell
python tools/enhancement-v0.8/inject.py
```

脚本会重写 `v0.8/trusted-garden-v0.8-showcase.html`，重复运行不会重复添加增强层。基础场景仍保存在该 HTML 中；不要删除此文件后尝试从增强层单独生成整个页面。

源码内部沿用的 `v7-*` 标识是 V0.8 的兼容实现，无需旧版文件。

## render-check/

可选开发工具使用 Node.js、`playwright-core` 与系统 Chrome，软件渲染时较慢。依赖目录不提交 Git；新环境先安装：

```powershell
cd tools/render-check
npm install
node v8verify.mjs ../../v0.8/trusted-garden-v0.8-showcase.html
node v8regress.mjs ../../v0.8/trusted-garden-v0.8-showcase.html
```

| 脚本 | 用途 |
|---|---|
| `v8verify.mjs` | V0.8 交互回归 |
| `v8regress.mjs` | 漫游按键、天气与第一人称回归 |
| `v8test.mjs` / `v8cam.mjs` / `v8debug.mjs` | 人物、相机与截图诊断 |
| `shot.mjs` | 打开本地 HTML、执行指定操作并截图 |
| `verify.mjs` / `perf.mjs` / `flicker.mjs` | 通用交互、性能、频闪诊断，参数传入 V0.8 HTML |
| `bench.mjs` / `gaps.py` / `seams.py` | 当前 HTML 内嵌模型的包围盒与几何诊断 |
| `diag*.mjs` | 保留的界面排查脚本 |

`v8verify.mjs` 的步骤结果和错误列表均需检查，不能只以进程退出码判断通过。诊断脚本中的 Chrome 路径需按本机安装位置调整。

## screenshots/v0.8/

保留 V0.8 的本地迭代截图作为参考；它们不代表当前提交已重新验证。截图与运行输出不提交 Git，也不发布到网站。
