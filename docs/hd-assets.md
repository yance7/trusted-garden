# 高清资产与来源

## 生成关系

网站、模型下载和对象清单使用同一生成流程：原版 `v0.8/trusted-garden-v0.8-model.glb` → `tools/assets/source.mjs` → 几何 / 材质增强 → `public/assets/trusted-garden-v0.8-hd.glb`。

源 GLB 为 Z-up，旧网页实际采用 X,Z,Y 映射。转换同时反转三角形绕序，并用试验田 A 的正 Z 位置作为回归检查。不能用通用 X,Z,-Y 旋转替代。

每个原始对象在 `inventory.json` 中保留 ID、名称、区域、图层、原始 / 输出面数、升级方法和包围盒。高精度模型与简化碰撞体分开。骨骼人物由 `tools/assets/character.mjs` 生成，再导出为独立的 `researcher-v0.8-hd.glb`；网页加载此文件并驱动同一骨架。

## 4K 表面资源

混凝土、木材、树皮与泥土使用 Poly Haven 实拍材质，均为 CC0-1.0。完整下载地址、源文件 SHA-256、许可与修改记录见 `public/assets/textures/sources.json`。使用了 Rough Concrete、Wood Planks Dirt、Bark Brown 02、Brown Mud 02；[许可说明](https://polyhaven.com/license)。

叶片、金属微表面和水面法线为本项目的程序生成资源；原生分辨率 4096，不以放大小图代替。粗糙度以 G 通道打包；AO 与金属乘数为中性值，具体材料由 glTF 的因子决定。叶片 / 金属的打包数据图使用 2048；基色、法线及四种实拍表面均为原生 4K。

```powershell
# 仅重新生成模型，不访问素材网络：
npm run assets

# 重新制作贴图（需要 Python + Pillow + NumPy）：
npm run author:materials
python tools/assets/water.py
npm run assets
```

原始下载缓存在 `.cache/materials/`，不提交。下载脚本使用用户指定的本地 7890 代理；原始文件在缓存中时直接复用。WebP 转换保留高质量，GLB 使用 Meshopt 压缩几何，运行时解码器来自锁定的本地 Three.js 依赖。

## 体积与性能取舍

用户已明确不限制模型与材质体积，因此先前方案中的下载量和显存预算不作为降画质理由。性能档保留完整几何与材质，只降低输出 / 阴影和后处理。当前未使用 KTX2 GPU 纹理压缩，也没有宣称已实现全场按区流式加载或多级几何 LOD；这些可在画面验收后继续优化，不影响本轮高精度源资产。

为了兼容常用模型查看器，导入时需同时保留 GLB、textures 目录；素材来源记录建议一并保留。
