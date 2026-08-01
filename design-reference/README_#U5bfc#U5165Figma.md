# LCT 现代社交网络 MVP 高保真 UI

## 文件说明

- `LCT_MVP_HiFi_All_Screens_Figma_Import.svg`：所有高保真页面合集，可直接拖入 / 导入 Figma。
- `svg/`：每个页面的独立 SVG，适合逐页导入 Figma。
- `png_preview/`：逐页 PNG 预览图。
- `04_onboarding_flow_preview.png`：欢迎引导 3 步流程合并预览图，便于快速查看拆分页结果。
- `页面补充说明.md`：每张 UI 图的外部说明汇总，避免画布内出现不相关标注。
- `页面说明/`：每个页面的独立说明文件，便于逐图查看。

## Figma 打开方式

在 Figma 新建 Design 文件后，将 `LCT_MVP_HiFi_All_Screens_Figma_Import.svg` 拖入画布；如需逐页编辑，可导入 `svg/` 目录中的单页 SVG。SVG 中的文本与矢量形状可在 Figma 中继续调整。

欢迎引导页已拆分为 3 个连续页面，不再保留单独的 `04_onboarding` 单页：

- `04_01_onboarding_interests`：兴趣标签
- `04_02_onboarding_follow`：推荐关注
- `04_03_onboarding_communities`：推荐社群

本轮修正点：

- 前两页补齐 `跳过 / 完成 / 提交 / 下一步` 四个按钮
- 选中项统一改为“颜色高亮 + 对号”表现，不再出现“已选”按钮
- 推荐关注 / 推荐社群条目不再出现单独“关注 / 加入”按钮
- 重新整理 04 三页的底部动作区与内容排版

## 设计边界

原线框图 00 为交付范围总览，不是前端真实页面，未作为 UI 画布绘制。其余页面均补充伪数据，无空白占位；系统状态页作为状态组件合集处理。
