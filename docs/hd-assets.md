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

用户已明确不限制模型与材质体积，因此先前方案中的下载量和显存预算不作为降画质理由。性能档保留完整几何与材质，只降低输出 / 阴影和后处理。2026-10-30 加载故障修复加入 KTX2 GPU 纹理压缩与渐进材质加载；没有实现按区几何流式加载或几何 LOD。

## 网页渐进加载

完整几何保持 947,314 个三角面。入口先加载同一模型、技术员与 19 张 1024px 预览材质（合计约 5.25 MB），进入场景后逐张替换为原尺寸的 KTX2 材质。4K 仍为 4096，原有两张 ORM 仍为 2048；原始 WebP 与模型导出引用均保留。高清材质失败只暂停细节升级，界面提供重试，已成功的材质不重下。预览材质暂不可用时使用中性占位，不阻止进入场景。

KTX2 使用 Basis Universal 1.16.3、UASTC level 3、不启用 RDO、离线 mipmaps 与 Zstandard 18。UASTC 是高质量有损 GPU 编码；Zstandard 层为无损压缩，不能将整套编码称为无损。数据图按线性空间处理，法线 mipmaps 重新归一化，颜色图按 sRGB 处理。Three.js 按硬件能力转为 GPU 格式；不支持压缩纹理的设备保留兼容预览，避免自动上传整套未压缩 4K 图造成内存过载。

原 WebP 下载量约 88.13 MB；高质量 KTX2 总量约 243.35 MB，后台完整下载量更大。采用它的目的是保留原生尺寸并降低驻留显存、避免高清下载阻塞入口；首屏不再等待这套资源。GPU 支持 4x4 / 16-byte 块格式时，全部 mipmaps 数据约 391 MB，约为原 RGBA8 + mipmaps 估算值的四分之一；不包含其他场景、渲染目标和浏览器内存。

重新制作网页派生材质需便携 `basisu` 1.16.3 编码器，并设置 `BASISU` 为其路径，然后运行 `node tools/assets/delivery.mjs`。编码器只用于作者工作站，不需要安装进系统；`sharp` 固定在开发依赖。CI 使用已经提交的派生材质，不运行编码器。`public/assets/basis/` 的同源解码器来自当前锁定的 Three.js 依赖。更换源贴图后应重新生成对应 KTX2（删除该派生文件或输出到新目录），再运行材质生成命令，不能仅重建预览。

为了兼容常用模型查看器，导入时需同时保留 GLB、textures 目录；素材来源记录建议一并保留。
